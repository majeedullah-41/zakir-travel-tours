/**
 * Zakir Travel & Tours — API-backed database service (PHP + MySQL backend)
 * ==========================================================================
 * A drop-in replacement for `js/firebase-db.js` (same global `window.zakirDB`,
 * same method names, signatures and return shapes), backed by the PHP API in
 * `api/` instead of Firebase. No Firebase SDKs, no LocalStorage data store.
 *
 * BACKEND SWITCH — DEFAULTS TO FIREBASE (merging this file changes nothing live)
 * ----------------------------------------------------------------------------
 * This file is loaded AFTER `firebase-db.js` and BEFORE `admin-portal.js` /
 * `homepage-live.js`. On load it reads `localStorage.getItem('zakir_backend')`:
 *
 *   - value exactly `'api'`  -> this API implementation REPLACES `window.zakirDB`
 *   - anything else / no value -> this file does NOTHING; Firebase stays live
 *
 * To cut a browser over to the PHP backend for testing, run this one-liner in
 * the DevTools console (or set it from any page on the site) and reload:
 *
 *     localStorage.setItem('zakir_backend', 'api')
 *
 * To switch back: `localStorage.removeItem('zakir_backend')` and reload.
 * A proper cutover tool / server-side switch comes later; for now the flag is
 * a local, per-browser setting and the live site keeps using Firebase.
 *
 * NOTES
 * - Getters (`getLocal*`) are SYNCHRONOUS and return the last fetched state,
 *   seeded with the flyer defaults that `firebase-db.js` already exposes on
 *   `window.FLYER_DEFAULTS` until the first API load arrives.
 * - `on*Snapshot(cb)` calls `cb` immediately with the current state, then
 *   again on every change, and returns an unsubscribe function.
 * - The spotlight mirror (spotlight -> primary deal + featured package) and
 *   calculator tier auto-scaling run SERVER-side in `PUT /api/admin/config`;
 *   this file never duplicates them — it only sends the spotlight update.
 * - `saveFirebaseConfig` / `disconnectFirebaseConfig` /
 *   `hasLocalAdminPassphrase` / `setLocalAdminPassphrase` are intentionally
 *   NOT implemented: no caller uses them.
 */
(function (window) {
    "use strict";

    var BACKEND_FLAG_KEY = "zakir_backend";
    var NETWORK_ERROR_MESSAGE = "Could not reach the server. Check your connection and try again.";

    // Firestore caps a document at 1 MiB; the Firebase implementation
    // refuses a site_config past 900 KB, so the API one keeps the same
    // guard (the server enforces it too) with the same message.
    var SITE_CONFIG_MAX_BYTES = 900000;

    function _clone(value) {
        return value === undefined ? value : JSON.parse(JSON.stringify(value));
    }

    function _flyerDefaults() {
        if (window.FLYER_DEFAULTS) return window.FLYER_DEFAULTS;
        return {
            site_config: { main_settings: { spotlight: {}, calculatorRates: {}, contacts: {}, pageContent: {} } },
            special_deals: [],
            umrah_packages: [],
            visa_services: [],
            work_permits: [],
            work_permit_programmes: []
        };
    }

    function _defaultPrimaryDeal() {
        return window.DEFAULT_PRIMARY_DEAL || {};
    }

    function _defaultPageContent() {
        return window.DEFAULT_PAGE_CONTENT || {};
    }

    // Same page-content merge as firebase-db.js (used only to measure the
    // merged config for the 900 KB guard). The server is the source of
    // truth for the stored config.
    function _mergePageContent(baseContent, incomingContent) {
        var DEFAULTS = _defaultPageContent();
        var base = baseContent || DEFAULTS;
        var inc = incomingContent || {};
        var incHome = {};
        var key;
        for (key in (inc.home || {})) incHome[key] = inc.home[key];
        if (
            !incHome.branch2Address ||
            incHome.stat1Number === "100%" ||
            incHome.stat4Number === "Blue Area" ||
            incHome.stat4Number === "24/7" ||
            (incHome.aboutHeading && incHome.aboutHeading.indexOf("Islamabad") !== -1) ||
            (incHome.heroBadge && incHome.heroBadge.indexOf("Islamabad") !== -1) ||
            (incHome.branch1Title && incHome.branch1Title.indexOf("Islamabad") !== -1)
        ) {
            for (key in (DEFAULTS.home || {})) incHome[key] = DEFAULTS.home[key];
        }
        function section(name) {
            var out = {};
            var src;
            src = DEFAULTS[name] || {};
            for (key in src) out[key] = src[key];
            src = (base && base[name]) || {};
            for (key in src) out[key] = src[key];
            src = (inc && inc[name]) || {};
            for (key in src) out[key] = src[key];
            if (name === "home") {
                for (key in incHome) out[key] = incHome[key];
            }
            return out;
        }
        return {
            home: section("home"),
            umrah: section("umrah"),
            visas: section("visas"),
            calculator: section("calculator"),
            contact: section("contact"),
            workPermit: section("workPermit")
        };
    }

    // Content resources: public read URL, admin list URL, single-item URL.
    var RESOURCES = {
        special_deals: {
            adminList: "/api/admin/deals",
            publicList: "/api/deals",
            one: function (id) { return "/api/admin/deals/" + encodeURIComponent(id); },
            returnKey: "deal"
        },
        umrah_packages: {
            adminList: "/api/admin/umrah-packages",
            publicList: "/api/umrah-packages",
            one: function (id) { return "/api/admin/umrah-packages/" + encodeURIComponent(id); },
            returnKey: "package"
        },
        visa_services: {
            adminList: "/api/admin/visas",
            publicList: "/api/visas",
            one: function (id) { return "/api/admin/visas/" + encodeURIComponent(id); },
            returnKey: "visa"
        },
        work_permits: {
            adminList: "/api/admin/work-permits",
            publicList: "/api/work-permits",
            one: function (id) { return "/api/admin/work-permits/" + encodeURIComponent(id); },
            returnKey: "permit"
        },
        work_permit_programmes: {
            adminList: "/api/admin/programmes",
            publicList: "/api/programmes",
            one: function (id) { return "/api/admin/programmes/" + encodeURIComponent(id); },
            returnKey: "programme"
        }
    };

    // Collection name (as used by verifyDocSaved callers) -> re-read URL.
    function _verifyPath(collection, docId) {
        if (collection === "site_config") return "/api/config";
        if (RESOURCES[collection]) return RESOURCES[collection].one(docId);
        return null;
    }

    function ApiBackendService() {
        this.mode = "api";

        this.listeners = {
            site_config: new Set(),
            special_deals: new Set(),
            umrah_packages: new Set(),
            visa_services: new Set(),
            work_permits: new Set(),
            work_permit_programmes: new Set(),
            enquiries: new Set(),
            auth: new Set(),
            mode: new Set()
        };

        // Last fetched state. null = not loaded yet; getters fall back to
        // the flyer defaults until the first load arrives.
        this._siteConfig = null;
        this._deals = null;
        this._packages = null;
        this._visas = null;
        this._permits = null;
        this._programmes = null;
        this._enquiries = null;

        // Synchronous cached session user (null = logged out).
        this._currentUser = null;

        this._init();
    }

    // --------------------------------------------------------------------
    // INIT: public data first, then the session (failure = logged out,
    // never an error), then the admin-only lists when a session exists.
    // --------------------------------------------------------------------
    ApiBackendService.prototype._init = async function () {
        try {
            await this._loadPublic();
        } catch (err) {
            console.warn("API backend: could not load public data:", err);
        }
        try {
            var data = await this._request("GET", "/api/auth/me");
            var user = (data && data.user) || data;
            if (user && user.email) {
                this._currentUser = {
                    id: user.id,
                    uid: user.id,
                    email: user.email,
                    displayName: user.displayName || user.email,
                    role: user.role,
                    loggedInAt: user.loggedInAt || new Date().toISOString()
                };
                this._notify("auth");
                await this._loadAdmin();
            }
        } catch (_) {
            // Not logged in (or unreachable) — public visitors need nothing
            // more. This is expected, not an error.
        }
    };

    // --------------------------------------------------------------------
    // HTTP: JSON envelope {"ok":true,"data":...} / {"ok":false,"error":{...}}.
    // fetch uses credentials:'same-origin' so the PHP session cookie is sent.
    // --------------------------------------------------------------------
    ApiBackendService.prototype._request = async function (method, path, body, opts) {
        opts = opts || {};
        var res;
        try {
            res = await fetch(path, {
                method: method,
                credentials: "same-origin",
                headers: opts.form
                    ? {}
                    : body !== undefined && body !== null
                      ? { "Content-Type": "application/json" }
                      : {},
                body: opts.form ? body : body !== undefined && body !== null ? JSON.stringify(body) : undefined
            });
        } catch (_) {
            throw new Error(NETWORK_ERROR_MESSAGE);
        }
        var payload = null;
        try {
            payload = await res.json();
        } catch (_) {
            payload = null;
        }
        if (!res.ok) {
            var errBody = (payload && payload.error) || {};
            var message = errBody.message || ("Request failed (" + res.status + ").");
            var error = new Error(message);
            error.code = errBody.code || null;
            error.status = res.status;
            if (res.status === 401) this._handleUnauthorized();
            throw error;
        }
        if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) return payload.data;
        return payload;
    };

    // A 401 from any call means the session expired: drop the cached user
    // and tell auth listeners (the admin falls back to the login view).
    ApiBackendService.prototype._handleUnauthorized = function () {
        this._currentUser = null;
        this._notify("auth");
    };

    // --------------------------------------------------------------------
    // LOADING + STATE
    // --------------------------------------------------------------------
    ApiBackendService.prototype._setState = function (kind, data) {
        if (kind === "site_config") {
            if (data && typeof data === "object" && !Array.isArray(data)) this._siteConfig = data;
            return;
        }
        if (kind === "enquiries") {
            if (Array.isArray(data)) this._enquiries = data;
            return;
        }
        if (!Array.isArray(data)) return;
        if (kind === "special_deals") this._deals = data;
        else if (kind === "umrah_packages") this._packages = data;
        else if (kind === "visa_services") this._visas = data;
        else if (kind === "work_permits") this._permits = data;
        else if (kind === "work_permit_programmes") this._programmes = data;
    };

    ApiBackendService.prototype._listPath = function (kind) {
        if (kind === "site_config") return "/api/config";
        if (kind === "enquiries") return "/api/admin/enquiries";
        var res = RESOURCES[kind];
        if (!res) return null;
        return this._currentUser ? res.adminList : res.publicList;
    };

    ApiBackendService.prototype._loadPublic = async function () {
        var self = this;
        var jobs = [
            ["site_config", "/api/config"],
            ["special_deals", "/api/deals"],
            ["umrah_packages", "/api/umrah-packages"],
            ["visa_services", "/api/visas"],
            ["work_permits", "/api/work-permits"],
            ["work_permit_programmes", "/api/programmes"]
        ];
        await Promise.all(
            jobs.map(function (job) {
                return self
                    ._request("GET", job[1])
                    .then(function (data) {
                        self._setState(job[0], data);
                        self._notify(job[0]);
                    })
                    .catch(function (err) {
                        console.warn("API backend: could not load " + job[0] + ":", err);
                    });
            })
        );
    };

    // Admin lists include inactive rows (the public endpoints do not), so
    // once a session exists the admin view is driven by these instead.
    ApiBackendService.prototype._loadAdmin = async function () {
        var self = this;
        var jobs = [
            ["special_deals", "/api/admin/deals"],
            ["umrah_packages", "/api/admin/umrah-packages"],
            ["visa_services", "/api/admin/visas"],
            ["work_permits", "/api/admin/work-permits"],
            ["work_permit_programmes", "/api/admin/programmes"],
            ["enquiries", "/api/admin/enquiries"]
        ];
        await Promise.all(
            jobs.map(function (job) {
                return self
                    ._request("GET", job[1])
                    .then(function (data) {
                        self._setState(job[0], data);
                        self._notify(job[0]);
                    })
                    .catch(function (err) {
                        console.warn("API backend: could not load " + job[0] + " (admin):", err);
                    });
            })
        );
    };

    ApiBackendService.prototype._refreshKind = async function (kind) {
        var path = this._listPath(kind);
        if (!path) return;
        var data = await this._request("GET", path);
        this._setState(kind, data);
        this._notify(kind);
    };

    ApiBackendService.prototype._refreshAll = async function () {
        await this._loadPublic();
        if (this._currentUser) await this._loadAdmin();
    };

    ApiBackendService.prototype._notify = function (kind) {
        var value;
        if (kind === "auth") value = this.getCurrentUser();
        else if (kind === "mode") value = this.mode;
        else if (kind === "site_config") value = this.getLocalSiteConfig();
        else if (kind === "special_deals") value = this.getLocalSpecialDeals();
        else if (kind === "umrah_packages") value = this.getLocalUmrahPackages();
        else if (kind === "visa_services") value = this.getLocalVisaServices();
        else if (kind === "work_permits") value = this.getLocalWorkPermits();
        else if (kind === "work_permit_programmes") value = this.getLocalWorkPermitProgrammes();
        else if (kind === "enquiries") value = this.getLocalEnquiries();
        else return;
        this.listeners[kind].forEach(function (cb) {
            try {
                cb(value);
            } catch (err) {
                console.warn("API backend: snapshot listener failed:", err);
            }
        });
    };

    ApiBackendService.prototype._subscribe = function (kind, callback) {
        this.listeners[kind].add(callback);
        this._notifySingle(kind, callback);
        var self = this;
        return function () {
            self.listeners[kind].delete(callback);
        };
    };

    ApiBackendService.prototype._notifySingle = function (kind, callback) {
        var value;
        if (kind === "auth") value = this.getCurrentUser();
        else if (kind === "mode") value = this.mode;
        else if (kind === "site_config") value = this.getLocalSiteConfig();
        else if (kind === "special_deals") value = this.getLocalSpecialDeals();
        else if (kind === "umrah_packages") value = this.getLocalUmrahPackages();
        else if (kind === "visa_services") value = this.getLocalVisaServices();
        else if (kind === "work_permits") value = this.getLocalWorkPermits();
        else if (kind === "work_permit_programmes") value = this.getLocalWorkPermitProgrammes();
        else if (kind === "enquiries") value = this.getLocalEnquiries();
        else return;
        callback(value);
    };

    // --------------------------------------------------------------------
    // SNAPSHOT LISTENERS (same pattern as firebase-db.js)
    // --------------------------------------------------------------------
    ApiBackendService.prototype.onSiteConfigSnapshot = function (cb) { return this._subscribe("site_config", cb); };
    ApiBackendService.prototype.onSpecialDealsSnapshot = function (cb) { return this._subscribe("special_deals", cb); };
    ApiBackendService.prototype.onUmrahPackagesSnapshot = function (cb) { return this._subscribe("umrah_packages", cb); };
    ApiBackendService.prototype.onVisaServicesSnapshot = function (cb) { return this._subscribe("visa_services", cb); };
    ApiBackendService.prototype.onWorkPermitsSnapshot = function (cb) { return this._subscribe("work_permits", cb); };
    ApiBackendService.prototype.onWorkPermitProgrammesSnapshot = function (cb) { return this._subscribe("work_permit_programmes", cb); };
    ApiBackendService.prototype.onEnquiriesSnapshot = function (cb) { return this._subscribe("enquiries", cb); };
    ApiBackendService.prototype.onAuthSnapshot = function (cb) { return this._subscribe("auth", cb); };
    ApiBackendService.prototype.onModeSnapshot = function (cb) { return this._subscribe("mode", cb); };

    // --------------------------------------------------------------------
    // GETTERS (synchronous, last fetched state over flyer defaults)
    // --------------------------------------------------------------------
    ApiBackendService.prototype.getLocalSiteConfig = function () {
        var base = _flyerDefaults().site_config.main_settings;
        var raw = this._siteConfig;
        if (!raw) return _clone(base);
        return {
            ...base,
            ...raw,
            spotlight: {
                ...base.spotlight,
                ...(raw.spotlight || {}),
                servicesIncluded: {
                    ...base.spotlight.servicesIncluded,
                    ...((raw.spotlight && raw.spotlight.servicesIncluded) || {})
                }
            },
            calculatorRates: {
                ...base.calculatorRates,
                ...(raw.calculatorRates || {})
            },
            contacts: {
                ...base.contacts,
                ...(raw.contacts || {})
            },
            pageContent: _mergePageContent(_defaultPageContent(), raw.pageContent)
        };
    };

    ApiBackendService.prototype.getLocalSpecialDeals = function () {
        var defaults = _flyerDefaults().special_deals;
        var primary = _defaultPrimaryDeal();
        if (!this._deals) return _clone(defaults);
        return [...this._deals]
            .map(function (d) {
                return {
                    ...primary,
                    ...d,
                    servicesIncluded: {
                        ...primary.servicesIncluded,
                        ...(d.servicesIncluded || {})
                    }
                };
            })
            .sort(function (a, b) { return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0); });
    };

    ApiBackendService.prototype._sortedList = function (state, defaults) {
        if (!state) return _clone(defaults);
        return [...state]
            .map(function (item) { return { ...item }; })
            .sort(function (a, b) { return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0); });
    };

    ApiBackendService.prototype.getLocalUmrahPackages = function () {
        return this._sortedList(this._packages, _flyerDefaults().umrah_packages);
    };

    ApiBackendService.prototype.getLocalVisaServices = function () {
        return this._sortedList(this._visas, _flyerDefaults().visa_services);
    };

    ApiBackendService.prototype.getLocalWorkPermits = function () {
        return this._sortedList(this._permits, _flyerDefaults().work_permits);
    };

    ApiBackendService.prototype.getLocalWorkPermitProgrammes = function () {
        return this._sortedList(this._programmes, _flyerDefaults().work_permit_programmes);
    };

    ApiBackendService.prototype._normaliseEnquiry = function (data) {
        var d = data || {};
        var createdAt = d.createdAt;
        if (createdAt && typeof createdAt === "object" && typeof createdAt.toDate === "function") {
            try {
                createdAt = createdAt.toDate().toISOString();
            } catch (_) {
                createdAt = new Date().toISOString();
            }
        }
        if (!createdAt || typeof createdAt !== "string") createdAt = new Date().toISOString();
        return {
            id: String(d.id || ""),
            createdAt: createdAt,
            status: ["new", "contacted", "booked", "closed"].includes(d.status) ? d.status : "new",
            source: String(d.source || "website").slice(0, 50),
            service: String(d.service || "General enquiry").slice(0, 120),
            name: String(d.name || "").slice(0, 100),
            phone: String(d.phone || "").slice(0, 30),
            details: String(d.details || "").slice(0, 1000),
            whatsappNumber: String(d.whatsappNumber || "").slice(0, 20),
            whatsappSent: Boolean(d.whatsappSent),
            syncPending: Boolean(d.syncPending)
        };
    };

    ApiBackendService.prototype.getLocalEnquiries = function () {
        if (!this._enquiries) return [];
        return this._enquiries
            .map(function (e) { return this._normaliseEnquiry(e); }, this)
            .sort(function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); });
    };

    // --------------------------------------------------------------------
    // ENQUIRIES (lead capture)
    // --------------------------------------------------------------------
    ApiBackendService.prototype.saveEnquiry = async function (data) {
        var clean = function (v, max) { return String(v == null ? "" : v).trim().slice(0, max); };
        var name = clean(data && data.name, 100);
        var phone = clean(data && data.phone, 30);
        if (!name || !phone) {
            throw new Error("Enquiry needs a name and a phone number.");
        }
        var record = await this._request("POST", "/api/enquiries", {
            name: name,
            phone: phone,
            service: clean(data.service, 120) || "General enquiry",
            source: clean(data.source, 50) || "website",
            details: clean(data.details, 1000),
            whatsappNumber: clean(data.whatsappNumber, 20),
            whatsappSent: Boolean(data.whatsappSent)
        });
        var normalised = this._normaliseEnquiry(record || {});
        normalised.synced = true;
        var list = this.getLocalEnquiries();
        list.unshift(normalised);
        this._enquiries = list.slice(0, 500);
        this._notify("enquiries");
        return normalised;
    };

    ApiBackendService.prototype.updateEnquiry = async function (enquiryId, patch) {
        patch = patch || {};
        var allowedStatus = ["new", "contacted", "booked", "closed"];
        var cleanPatch = {};
        if (patch.status && allowedStatus.includes(patch.status)) cleanPatch.status = patch.status;
        if (typeof patch.whatsappSent === "boolean") cleanPatch.whatsappSent = patch.whatsappSent;
        if (typeof patch.details === "string") cleanPatch.details = patch.details.slice(0, 1000);
        if (!Object.keys(cleanPatch).length) return null;

        var updated;
        try {
            updated = await this._request(
                "PATCH",
                "/api/admin/enquiries/" + encodeURIComponent(enquiryId),
                cleanPatch
            );
        } catch (err) {
            if (err && err.status === 404) throw new Error("Enquiry not found.");
            throw err;
        }
        var enquiry = (updated && updated.enquiry) || updated || null;
        var list = this.getLocalEnquiries();
        var idx = list.findIndex(function (e) { return e.id === enquiryId; });
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...cleanPatch, ...(enquiry || {}) };
            this._enquiries = list;
            this._notify("enquiries");
        }
        return { synced: true, enquiry: enquiry || { id: enquiryId, ...cleanPatch } };
    };

    ApiBackendService.prototype.deleteEnquiry = async function (enquiryId) {
        await this._request("DELETE", "/api/admin/enquiries/" + encodeURIComponent(enquiryId));
        var list = this.getLocalEnquiries().filter(function (e) { return e.id !== enquiryId; });
        this._enquiries = list;
        this._notify("enquiries");
        return { synced: true };
    };


    // --------------------------------------------------------------------
    // SITE CONFIG (merge helper mirrors firebase-db.js; used only for the
    // local size guard — the server does the real merge, tier auto-scaling
    // and spotlight mirrors on PUT /api/admin/config).
    // --------------------------------------------------------------------
    ApiBackendService.prototype._mergeConfig = function (current, partial) {
        return {
            ...current,
            ...partial,
            spotlight: {
                ...current.spotlight,
                ...(partial.spotlight || {}),
                servicesIncluded: {
                    ...current.spotlight.servicesIncluded,
                    ...((partial.spotlight && partial.spotlight.servicesIncluded) || {})
                }
            },
            calculatorRates: {
                ...current.calculatorRates,
                ...(partial.calculatorRates || {})
            },
            contacts: {
                ...current.contacts,
                ...(partial.contacts || {})
            },
            pageContent: _mergePageContent(current.pageContent, partial.pageContent),
            updatedAt: new Date().toISOString()
        };
    };

    ApiBackendService.prototype._configByteLength = function (config) {
        try {
            return new TextEncoder().encode(JSON.stringify(config)).length;
        } catch (_) {
            return JSON.stringify(config).length;
        }
    };

    ApiBackendService.prototype.updateSiteConfig = async function (partialOrFullConfig, options) {
        // options.skipDealSync is accepted for call-shape parity with the
        // Firebase version; it is a no-op here because the spotlight
        // mirror runs server-side and cannot loop back into this file.
        void options;
        var partial = partialOrFullConfig || {};
        var current = this.getLocalSiteConfig();
        var merged = this._mergeConfig(current, partial);
        var configBytes = this._configByteLength(merged);
        if (configBytes > SITE_CONFIG_MAX_BYTES) {
            throw new Error(
                "This page data is too full (" +
                    Math.round(configBytes / 1024) +
                    " KB) to save — too many photos are stored in the database. Remove some photos or fix Storage uploads, then save again."
            );
        }
        await this._request("PUT", "/api/admin/config", partial);
        // Re-read the authoritative merged config (server-applied tier
        // scaling and spotlight mirrors included), then refresh the lists
        // the mirror may have changed.
        try {
            var serverConfig = await this._request("GET", "/api/config");
            if (serverConfig && typeof serverConfig === "object") {
                this._siteConfig = serverConfig;
                this._notify("site_config");
            }
        } catch (err) {
            console.warn("API backend: could not re-read site config after save:", err);
        }
        try { await this._refreshKind("special_deals"); } catch (_) {}
        try { await this._refreshKind("umrah_packages"); } catch (_) {}
        return { synced: true, config: this.getLocalSiteConfig() };
    };

    // Re-read a record straight from the server and check the saved values
    // are really there. Never throws: a failed read, a missing record, a
    // value mismatch or a timeout all come back as { verified: false }.
    ApiBackendService.prototype.verifyDocSaved = async function (collection, docId, expected, timeoutMs) {
        if (!collection || !docId) {
            return { verified: false, reason: "missing-doc" };
        }
        var path = _verifyPath(collection, docId);
        if (!path) {
            return { verified: false, reason: "missing-doc" };
        }
        var timeout = timeoutMs === undefined ? 8000 : timeoutMs;
        try {
            var timeoutPromise = new Promise(function (resolve) {
                setTimeout(function () { resolve(null); }, timeout);
            });
            var self = this;
            var attempt = this._request("GET", path)
                .then(function (data) { return { ok: true, data: data }; })
                .catch(function (err) { return { ok: false, error: err }; });
            var result = await Promise.race([attempt, timeoutPromise]);
            if (!result) {
                return { verified: false, reason: "timeout" };
            }
            if (!result.ok) {
                var err = result.error;
                if (err && err.status === 404) {
                    return { verified: false, reason: "not-found" };
                }
                return { verified: false, reason: (err && err.message) || "read-failed" };
            }
            var data = result.data || {};
            var fields = expected || {};
            for (var key in fields) {
                if (data[key] !== fields[key]) {
                    return { verified: false, reason: "mismatch", field: key };
                }
            }
            return { verified: true };
        } catch (err) {
            return { verified: false, reason: (err && err.message) || "read-failed" };
        }
    };

    ApiBackendService.prototype.publishQuickUpdate = async function (input) {
        var data = input || {};
        var cleanPrice = Number(data.startingPrice);
        if (!cleanPrice || cleanPrice <= 0) {
            throw new Error("Starting price must be a positive amount in PKR.");
        }
        if (!data.departureDate || !String(data.departureDate).trim()) {
            throw new Error("Departure date is required.");
        }
        if (!data.monthLabel || !String(data.monthLabel).trim()) {
            throw new Error("Package Month Label is required.");
        }
        var result = await this._request("POST", "/api/admin/quick-update", {
            startingPrice: cleanPrice,
            departureDate: String(data.departureDate).trim(),
            monthLabel: String(data.monthLabel).trim()
        });
        var config = (result && result.config) || null;
        if (!config) {
            try {
                config = await this._request("GET", "/api/config");
            } catch (_) {
                config = null;
            }
        }
        if (config && typeof config === "object") {
            this._siteConfig = config;
            this._notify("site_config");
        }
        try { await this._refreshKind("special_deals"); } catch (_) {}
        try { await this._refreshKind("umrah_packages"); } catch (_) {}
        return { synced: true, config: this.getLocalSiteConfig() };
    };

    // --------------------------------------------------------------------
    // GENERIC CONTENT CRUD (one resource kind at a time)
    // --------------------------------------------------------------------
    ApiBackendService.prototype._saveRecord = async function (kind, record) {
        var res = RESOURCES[kind];
        var saved = await this._request("POST", res.adminList, record);
        await this._refreshKind(kind).catch(function () {});
        return saved;
    };

    ApiBackendService.prototype._updateRecord = async function (kind, id, record) {
        var res = RESOURCES[kind];
        var saved = await this._request("PUT", res.one(id), record);
        await this._refreshKind(kind).catch(function () {});
        return saved;
    };

    // Clear a uniqueness flag (isPrimary / isFeatured) on the other rows
    // that still carry it. Best-effort: a failed demotion must not mask a
    // save that already succeeded.
    ApiBackendService.prototype._demoteOthers = async function (kind, keepId, flag, currentList) {
        var res = RESOURCES[kind];
        var self = this;
        var jobs = currentList
            .filter(function (item) { return item.id !== keepId && item[flag]; })
            .map(function (item) {
                var body = {};
                body[flag] = false;
                return self._request("PUT", res.one(item.id), { ...item, ...body }).catch(function (err) {
                    console.warn("API backend: could not clear " + flag + " on " + item.id + ":", err);
                });
            });
        await Promise.all(jobs);
    };

    ApiBackendService.prototype._reorderRecord = async function (kind, id, direction) {
        var res = RESOURCES[kind];
        var getter =
            kind === "special_deals" ? this.getLocalSpecialDeals() :
            kind === "umrah_packages" ? this.getLocalUmrahPackages() :
            kind === "visa_services" ? this.getLocalVisaServices() :
            kind === "work_permits" ? this.getLocalWorkPermits() :
            this.getLocalWorkPermitProgrammes();
        var idx = getter.findIndex(function (item) { return item.id === id; });
        if (idx !== -1) {
            var swapIdx = direction === "up" ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= getter.length) return;
        }
        await this._request("POST", res.one(id) + "/reorder", { direction: direction });
        await this._refreshKind(kind).catch(function () {});
        return { synced: true };
    };

    ApiBackendService.prototype._duplicateRecord = async function (kind, id) {
        var res = RESOURCES[kind];
        var record;
        try {
            record = await this._request("POST", res.one(id) + "/duplicate", null);
        } catch (err) {
            if (err && err.status === 404) return null;
            throw err;
        }
        if (!record) return null;
        await this._refreshKind(kind).catch(function () {});
        var out = { synced: true };
        out[res.returnKey] = record;
        return out;
    };

    // --------------------------------------------------------------------
    // SPECIAL FLYER DEALS (primary-deal rule kept client-side; the
    // spotlight mirror itself runs server-side via updateSiteConfig)
    // --------------------------------------------------------------------
    ApiBackendService.prototype.saveSpecialDeal = async function (dealData) {
        var list = this.getLocalSpecialDeals();
        var cleanPrice = Number(dealData.startingPrice);
        if (!cleanPrice || cleanPrice <= 0) {
            throw new Error("Special deal starting price must be greater than 0 PKR.");
        }
        var primary = _defaultPrimaryDeal();
        var existingIdx = dealData.id ? list.findIndex(function (d) { return d.id === dealData.id; }) : -1;
        var targetDeal;
        if (existingIdx !== -1) {
            targetDeal = {
                ...list[existingIdx],
                ...dealData,
                startingPrice: cleanPrice,
                servicesIncluded: {
                    ...(list[existingIdx].servicesIncluded || primary.servicesIncluded),
                    ...(dealData.servicesIncluded || {})
                },
                sortOrder: Number(dealData.sortOrder ?? list[existingIdx].sortOrder ?? existingIdx + 1) || 0
            };
        } else {
            targetDeal = {
                ...primary,
                ...dealData,
                id: dealData.id || undefined,
                startingPrice: cleanPrice,
                servicesIncluded: {
                    ...primary.servicesIncluded,
                    ...(dealData.servicesIncluded || {})
                },
                isPrimary: list.length === 0 ? true : Boolean(dealData.isPrimary),
                isActive: dealData.isActive !== undefined ? Boolean(dealData.isActive) : true,
                sortOrder: Number(dealData.sortOrder ?? list.length + 1) || 0
            };
        }

        var working = list.map(function (d) { return { ...d }; });
        if (existingIdx !== -1) working[existingIdx] = targetDeal;
        else working.push(targetDeal);
        if (targetDeal.isPrimary) {
            working.forEach(function (d) {
                if (d.id !== targetDeal.id) d.isPrimary = false;
            });
        } else if (!working.some(function (d) { return d.isPrimary; })) {
            working[0].isPrimary = true;
        }

        var saved;
        if (existingIdx !== -1) {
            saved = await this._updateRecord("special_deals", targetDeal.id, targetDeal);
        } else {
            saved = await this._saveRecord("special_deals", targetDeal);
        }
        saved = saved || targetDeal;
        await this._demoteOthers("special_deals", saved.id, "isPrimary", list);
        var primaryDeal = working.find(function (d) { return d.isPrimary; }) || working[0];
        if (primaryDeal) {
            var spotlightDeal = primaryDeal.id === saved.id ? saved : primaryDeal;
            await this.updateSiteConfig({ spotlight: { ...spotlightDeal } }, { skipDealSync: true });
        }
        return { synced: true, deal: saved };
    };

    ApiBackendService.prototype.deleteSpecialDeal = async function (dealId) {
        try { await this._refreshKind("special_deals"); } catch (_) {}
        var list = this.getLocalSpecialDeals();
        if (list.length <= 1) {
            throw new Error("At least one Special Flyer Deal must remain. You can edit or hide it instead.");
        }
        var wasPrimary = list.some(function (d) { return d.id === dealId && d.isPrimary; });
        await this._request("DELETE", RESOURCES.special_deals.one(dealId));
        var remaining = list.filter(function (d) { return d.id !== dealId; });
        if (wasPrimary && remaining.length > 0) {
            remaining[0].isPrimary = true;
            try {
                await this._request("PUT", RESOURCES.special_deals.one(remaining[0].id), remaining[0]);
                await this.updateSiteConfig({ spotlight: { ...remaining[0] } }, { skipDealSync: true });
            } catch (err) {
                console.warn("API backend: could not re-point the primary deal after delete:", err);
            }
        }
        try { await this._refreshKind("special_deals"); } catch (_) {}
        return { synced: true };
    };

    ApiBackendService.prototype.reorderSpecialDeal = function (dealId, direction) {
        return this._reorderRecord("special_deals", dealId, direction);
    };

    ApiBackendService.prototype.duplicateSpecialDeal = function (dealId) {
        return this._duplicateRecord("special_deals", dealId);
    };

    // --------------------------------------------------------------------
    // UMRAH PACKAGES
    // --------------------------------------------------------------------
    ApiBackendService.prototype.saveUmrahPackage = async function (pkgData) {
        var list = this.getLocalUmrahPackages();
        var cleanPrice = Number(pkgData.price);
        if (!cleanPrice || cleanPrice <= 0) {
            throw new Error("Package price must be greater than 0 PKR.");
        }
        var existingIdx = pkgData.id ? list.findIndex(function (p) { return p.id === pkgData.id; }) : -1;
        var targetPkg;
        if (existingIdx !== -1) {
            targetPkg = {
                ...list[existingIdx],
                ...pkgData,
                price: cleanPrice,
                sortOrder: Number(pkgData.sortOrder ?? list[existingIdx].sortOrder ?? existingIdx + 1) || 0
            };
        } else {
            targetPkg = {
                id: pkgData.id || undefined,
                title: pkgData.title || "Umrah Package",
                badgeText: pkgData.badgeText || "Special Offer",
                price: cleanPrice,
                roomType: pkgData.roomType || "Sharing (Quad)",
                departureDate: pkgData.departureDate || "Upcoming Batch",
                returnDate: pkgData.returnDate || "Flexible",
                duration: pkgData.duration || "14 Nights",
                makkahHotelDist: pkgData.makkahHotelDist || "500m from Haram",
                madinahHotelDist: pkgData.madinahHotelDist || "350m from Masjid Nabawi",
                services: Array.isArray(pkgData.services)
                    ? pkgData.services
                    : String(pkgData.services || "Return Air Ticket, Umrah Visa, Hotel Stay, Transport")
                          .split(",")
                          .map(function (s) { return s.trim(); })
                          .filter(Boolean),
                isFeatured: Boolean(pkgData.isFeatured),
                isActive: pkgData.isActive !== undefined ? Boolean(pkgData.isActive) : true,
                sortOrder: Number(pkgData.sortOrder ?? list.length + 1) || 0
            };
        }
        var saved;
        if (existingIdx !== -1) {
            saved = await this._updateRecord("umrah_packages", targetPkg.id, targetPkg);
        } else {
            saved = await this._saveRecord("umrah_packages", targetPkg);
        }
        saved = saved || targetPkg;
        if (saved.isFeatured) {
            await this._demoteOthers("umrah_packages", saved.id, "isFeatured", list);
            try { await this._refreshKind("umrah_packages"); } catch (_) {}
        }
        return { synced: true, package: saved };
    };

    ApiBackendService.prototype.deleteUmrahPackage = async function (pkgId) {
        await this._request("DELETE", RESOURCES.umrah_packages.one(pkgId));
        try { await this._refreshKind("umrah_packages"); } catch (_) {}
        return { synced: true };
    };

    ApiBackendService.prototype.reorderUmrahPackage = function (pkgId, direction) {
        return this._reorderRecord("umrah_packages", pkgId, direction);
    };

    // --------------------------------------------------------------------
    // VISA SERVICES
    // --------------------------------------------------------------------
    ApiBackendService.prototype.saveVisaService = async function (visaData) {
        var list = this.getLocalVisaServices();
        var cleanPrice = Number(visaData.pricePKR);
        if (!cleanPrice || cleanPrice <= 0) {
            throw new Error("Visa price must be greater than 0 PKR.");
        }
        var existingIdx = visaData.id ? list.findIndex(function (v) { return v.id === visaData.id; }) : -1;
        var targetVisa;
        if (existingIdx !== -1) {
            targetVisa = {
                ...list[existingIdx],
                ...visaData,
                pricePKR: cleanPrice,
                sortOrder: Number(visaData.sortOrder ?? list[existingIdx].sortOrder ?? existingIdx + 1) || 0
            };
        } else {
            targetVisa = {
                id: visaData.id || undefined,
                countryName: visaData.countryName || "Country Name",
                flagEmoji: visaData.flagEmoji || "🌍",
                flagUrl: visaData.flagUrl || "",
                visaType: visaData.visaType || "Tourist / Visit Visa",
                processingTime: visaData.processingTime || "3-5 Working Days",
                pricePKR: cleanPrice,
                requirementsSummary: visaData.requirementsSummary || "Passport Scan, Photo & CNIC Copy",
                imageUrl:
                    visaData.imageUrl ||
                    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
                isActive: visaData.isActive !== undefined ? Boolean(visaData.isActive) : true,
                sortOrder: Number(visaData.sortOrder ?? list.length + 1) || 0
            };
        }
        var saved;
        if (existingIdx !== -1) {
            saved = await this._updateRecord("visa_services", targetVisa.id, targetVisa);
        } else {
            saved = await this._saveRecord("visa_services", targetVisa);
        }
        return { synced: true, visa: saved || targetVisa };
    };

    ApiBackendService.prototype.deleteVisaService = async function (visaId) {
        await this._request("DELETE", RESOURCES.visa_services.one(visaId));
        try { await this._refreshKind("visa_services"); } catch (_) {}
        return { synced: true };
    };

    ApiBackendService.prototype.reorderVisaService = function (visaId, direction) {
        return this._reorderRecord("visa_services", visaId, direction);
    };

    // --------------------------------------------------------------------
    // WORK PERMITS
    // --------------------------------------------------------------------
    ApiBackendService.prototype.saveWorkPermit = async function (permitData) {
        if (!String((permitData && permitData.countryName) || "").trim()) {
            throw new Error("Work permit needs a country name.");
        }
        var list = this.getLocalWorkPermits();
        var ticks = Array.isArray(permitData.ticks)
            ? permitData.ticks
            : String(permitData.ticks || "")
                  .split(/\r?\n|\|/)
                  .map(function (t) { return t.trim(); })
                  .filter(Boolean);
        var existingIdx = permitData.id ? list.findIndex(function (p) { return p.id === permitData.id; }) : -1;
        var targetPermit;
        if (existingIdx !== -1) {
            targetPermit = {
                ...list[existingIdx],
                ...permitData,
                ticks: ticks,
                sortOrder: Number(permitData.sortOrder ?? list[existingIdx].sortOrder ?? existingIdx + 1) || 0
            };
        } else {
            targetPermit = {
                id: permitData.id || undefined,
                countryName: permitData.countryName || "Country Name",
                cardTitle: permitData.cardTitle || ((permitData.countryName || "Country") + " Work Permit"),
                flagClass: permitData.flagClass || "flag-eu",
                flagUrl: permitData.flagUrl || "",
                tagText: permitData.tagText || "Applications Open",
                tagStyle: permitData.tagStyle || "sky",
                timeline: permitData.timeline || "3-6 Months",
                permitType: permitData.permitType || "Work Permit",
                visaCode: permitData.visaCode || "D-Visa",
                contract: permitData.contract || "1 Year, Renewable",
                residence: permitData.residence || "Residence Permit",
                sectors: permitData.sectors || "General Labour",
                ticks: ticks,
                isFeatured: Boolean(permitData.isFeatured),
                isActive: permitData.isActive !== undefined ? Boolean(permitData.isActive) : true,
                sortOrder: Number(permitData.sortOrder ?? list.length + 1) || 0
            };
        }
        var saved;
        if (existingIdx !== -1) {
            saved = await this._updateRecord("work_permits", targetPermit.id, targetPermit);
        } else {
            saved = await this._saveRecord("work_permits", targetPermit);
        }
        return { synced: true, permit: saved || targetPermit };
    };

    ApiBackendService.prototype.deleteWorkPermit = async function (permitId) {
        await this._request("DELETE", RESOURCES.work_permits.one(permitId));
        try { await this._refreshKind("work_permits"); } catch (_) {}
        return { synced: true };
    };

    ApiBackendService.prototype.reorderWorkPermit = function (permitId, direction) {
        return this._reorderRecord("work_permits", permitId, direction);
    };

    // --------------------------------------------------------------------
    // FEATURED WORK PERMIT PROGRAMMES
    // --------------------------------------------------------------------
    ApiBackendService.prototype.saveWorkPermitProgramme = async function (programmeData) {
        if (!String((programmeData && programmeData.countryName) || "").trim()) {
            throw new Error("Featured programme needs a country name.");
        }
        var list = this.getLocalWorkPermitProgrammes();
        var existingIdx = programmeData.id ? list.findIndex(function (p) { return p.id === programmeData.id; }) : -1;
        var targetProgramme;
        if (existingIdx !== -1) {
            targetProgramme = {
                ...list[existingIdx],
                ...programmeData,
                sortOrder: Number(programmeData.sortOrder ?? list[existingIdx].sortOrder ?? existingIdx + 1) || 0
            };
        } else {
            var seed = (_flyerDefaults().work_permit_programmes || [])[0] || {};
            targetProgramme = {
                ...seed,
                ...programmeData,
                id: programmeData.id || undefined,
                // New programmes inherit the seed programme's fields —
                // including Poland's image fallbacks. Clear them unless
                // the admin supplied their own, so a new country never
                // shows Poland's fallback photos.
                leftImageFallback: programmeData.leftImageFallback || "",
                rightImageFallback: programmeData.rightImageFallback || "",
                isActive: programmeData.isActive !== undefined ? Boolean(programmeData.isActive) : true,
                sortOrder: Number(programmeData.sortOrder ?? list.length + 1) || 0
            };
        }
        var saved;
        if (existingIdx !== -1) {
            saved = await this._updateRecord("work_permit_programmes", targetProgramme.id, targetProgramme);
        } else {
            saved = await this._saveRecord("work_permit_programmes", targetProgramme);
        }
        return { synced: true, programme: saved || targetProgramme };
    };

    ApiBackendService.prototype.deleteWorkPermitProgramme = async function (programmeId) {
        try { await this._refreshKind("work_permit_programmes"); } catch (_) {}
        var list = this.getLocalWorkPermitProgrammes();
        if (list.length <= 1) {
            throw new Error("At least one Featured Work Permit Programme must remain. You can edit or hide it instead.");
        }
        await this._request("DELETE", RESOURCES.work_permit_programmes.one(programmeId));
        try { await this._refreshKind("work_permit_programmes"); } catch (_) {}
        return { synced: true };
    };

    ApiBackendService.prototype.reorderWorkPermitProgramme = function (programmeId, direction) {
        return this._reorderRecord("work_permit_programmes", programmeId, direction);
    };

    ApiBackendService.prototype.duplicateWorkPermitProgramme = function (programmeId) {
        return this._duplicateRecord("work_permit_programmes", programmeId);
    };

    // --------------------------------------------------------------------
    // UPLOADS — returns the URL string. No DataURL fallback: a failed
    // upload throws, so the admin never silently stores a photo in the DB.
    // --------------------------------------------------------------------
    ApiBackendService.prototype.uploadMediaFile = async function (file, folder) {
        if (!file) throw new Error("No file selected.");
        var form = new FormData();
        form.append("file", file);
        form.append("folder", folder || "zakir_media");
        var data = await this._request("POST", "/api/uploads", form, { form: true });
        var url = (data && data.url) || null;
        if (!url || typeof url !== "string") {
            throw new Error("Upload failed — the server did not return a file URL.");
        }
        return url;
    };

    ApiBackendService.prototype.resetToFlyerDefaults = async function () {
        var data = await this._request("POST", "/api/admin/reset-defaults", null);
        try {
            await this._refreshAll();
        } catch (_) {}
        return { synced: true, defaults: (data && data.defaults) || data || {} };
    };

    // --------------------------------------------------------------------
    // AUTH (PHP session cookie; no token in LocalStorage)
    // --------------------------------------------------------------------
    ApiBackendService.prototype.getCurrentUser = function () {
        return this._currentUser ? { ...this._currentUser } : null;
    };

    ApiBackendService.prototype.login = async function (email, password) {
        var cleanEmail = String(email || "").trim().toLowerCase();
        var cleanPass = String(password || "");
        if (!cleanPass) {
            throw new Error("Please enter your password.");
        }
        var data = await this._request("POST", "/api/auth/login", { email: cleanEmail, password: cleanPass });
        var user = (data && data.user) || data;
        if (!user || !user.email) {
            throw new Error("Email or password is incorrect.");
        }
        this._currentUser = {
            id: user.id,
            uid: user.id,
            email: user.email,
            displayName: user.displayName || user.email,
            role: user.role,
            loggedInAt: user.loggedInAt || new Date().toISOString()
        };
        this._notify("auth");
        try {
            await this._loadAdmin();
        } catch (_) {}
        return this.getCurrentUser();
    };

    ApiBackendService.prototype.logout = async function () {
        try {
            await this._request("POST", "/api/auth/logout", null);
        } catch (_) {}
        this._currentUser = null;
        this._notify("auth");
        try {
            await this._loadPublic();
        } catch (_) {}
    };

    // True when the given user (or the current user) is the owner.
    ApiBackendService.prototype.isOwner = function (user) {
        var u = user || this.getCurrentUser();
        return Boolean(u && u.role === "owner");
    };

    // True when the session user exists. The server enforces access; the
    // client check here is only UX, same as the Firebase version.
    ApiBackendService.prototype.verifyAdminAccess = async function (user) {
        try {
            var data = await this._request("GET", "/api/auth/me");
            var me = (data && data.user) || data;
            if (!me || !me.email) return false;
            if (user && user.email) {
                if (String(user.email).trim().toLowerCase() !== String(me.email).trim().toLowerCase()) {
                    return false;
                }
            }
            return true;
        } catch (_) {
            return false;
        }
    };

    // --------------------------------------------------------------------
    // ADMIN ACCESS (allowlist)
    // --------------------------------------------------------------------
    ApiBackendService.prototype.getAdminAllowlist = async function () {
        var data;
        try {
            data = await this._request("GET", "/api/admin/admins");
        } catch (err) {
            if (err && err.status === 404) return null;
            throw err;
        }
        if (!data) return null;
        var emails = Array.isArray(data.emails)
            ? [...new Set(data.emails.map(function (e) { return String(e || "").trim().toLowerCase(); }).filter(Boolean))]
            : [];
        if (!emails.length) return null;
        return { emails: emails, updatedAt: data.updatedAt || null, updatedBy: data.updatedBy || "" };
    };

    ApiBackendService.prototype.saveAdminAllowlist = async function (emails, ownerEmail) {
        var owner = String(ownerEmail || "").trim().toLowerCase();
        var clean = [
            ...new Set(
                (emails || [])
                    .map(function (e) { return String(e || "").trim().toLowerCase(); })
                    .filter(function (e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); })
            )
        ];
        if (owner && !clean.includes(owner)) clean.push(owner);
        if (!clean.length) {
            throw new Error("The admin list cannot be empty.");
        }
        var data = await this._request("PUT", "/api/admin/admins/sync", { emails: clean, ownerEmail: owner });
        return { synced: data && typeof data.synced === "boolean" ? data.synced : true };
    };

    ApiBackendService.prototype.createAdminAuthUser = async function (email, tempPassword) {
        var cleanEmail = String(email || "").trim().toLowerCase();
        var cleanPass = String(tempPassword || "");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            throw new Error("Enter a valid email address.");
        }
        if (cleanPass.length < 8) {
            throw new Error("Temporary password must be at least 8 characters.");
        }
        var data = await this._request("POST", "/api/admin/admins", { email: cleanEmail, tempPassword: cleanPass });
        return { email: (data && data.email) || cleanEmail, uid: data && data.uid };
    };

    // --------------------------------------------------------------------
    // BACKEND SWITCH (see the header comment): only when localStorage
    // 'zakir_backend' is exactly 'api' does this replace window.zakirDB.
    // Any other value — including no value at all — leaves Firebase live.
    // --------------------------------------------------------------------
    var useApi = false;
    try {
        useApi =
            typeof localStorage !== "undefined" &&
            localStorage !== null &&
            localStorage.getItem(BACKEND_FLAG_KEY) === "api";
    } catch (_) {
        useApi = false;
    }
    if (useApi) {
        window.zakirDB = new ApiBackendService();
    }
})(window);
