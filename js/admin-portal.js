/**
 * Zakir Travel & Tours - Next-Gen Animated Mobile-First Admin Portal Controller
 * Full CRUD for Special Flyer Deals (special_deals), Umrah Packages (umrah_packages),
 * Country Visas (visa_services), Calculator Rates, Media, and Contacts/WhatsApp Routing.
 * Works natively on both file:// and http/https servers!
 */
(function (window) {
    "use strict";

    function formatPKR(val) {
        const num = Number(val);
        if (isNaN(num)) return "0";
        return num.toLocaleString("en-US");
    }

    function cleanWhatsAppDigits(str) {
        return String(str || "").replace(/[^0-9]/g, "");
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    // About Us page team members (ids must match data-team-photo attributes in contact.html)
    const TEAM_MEMBERS = [
        { id: "ceo", name: "Zakir Ullah", role: "CEO", initials: "ZU" },
        { id: "inam", name: "Inam Ullah", role: "Manager", initials: "IU" },
        { id: "hafizullah", name: "Hafizullah", role: "Visa Officer", initials: "HU" },
        { id: "fida", name: "Fida Hussain", role: "Umrah Officer", initials: "FH" },
        { id: "sadiq", name: "Sadiq", role: "Visa Consultant", initials: "S" },
        { id: "faisal", name: "Faisal", role: "Visa Processing", initials: "F" },
        { id: "suliman", name: "Suliman", role: "Umrah Visa Officer", initials: "S" },
        { id: "mazhar", name: "Mazhar", role: "Accountant", initials: "M" },
        { id: "saad", name: "Saad Khan", role: "Social Media Manager", initials: "SK" },
        { id: "salim", name: "Salim", role: "Office Boy", initials: "S" }
    ];

    // Persistent Activity log (admin feedback): every toast is also written
    // here as a timestamped entry, kept in LocalStorage (newest 100).
    const ACTIVITY_LOG_KEY = "zakir_admin_activity_v1";
    const ACTIVITY_LOG_MAX_ENTRIES = 100;

    // Inject sleek animations and modern glassmorphic styles
    function ensureAdminAnimationsStyle() {
        if (document.getElementById("zakir-admin-animations-css")) return;
        const style = document.createElement("style");
        style.id = "zakir-admin-animations-css";
        style.textContent = ` 
            @keyframes zakirFadeInUp {
                from { opacity: 0; transform: translateY(14px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes zakirScaleIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes zakirFloatBadge {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-5px); }
            }
            @keyframes zakirPulseGlow {
                0%, 100% { box-shadow: 0 0 0 0 rgba(13, 138, 158, 0.45); }
                50% { box-shadow: 0 0 0 10px rgba(13, 138, 158, 0); }
            }
            @keyframes zakirShimmerBg {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            .anim-fade-up {
                animation: zakirFadeInUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .anim-scale-in {
                animation: zakirScaleIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .anim-float {
                animation: zakirFloatBadge 3.4s ease-in-out infinite;
            }
            .anim-pulse-teal {
                animation: zakirPulseGlow 2.2s infinite;
            }
            .admin-gradient-animated {
                background: linear-gradient(125deg, #05162E, #0B2D5B, #0D8A9E, #0B2D5B);
                background-size: 260% 260%;
                animation: zakirShimmerBg 10s ease infinite;
            }
            .admin-card-hover {
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
            }
            .admin-card-hover:hover {
                transform: translateY(-3px);
                box-shadow: 0 16px 35px -10px rgba(11, 45, 91, 0.14);
                border-color: rgba(212, 175, 55, 0.45);
            }
            /* ---- Website look, copied small from the public site ---- */
            /* Gentle 3D levitation, gold pulse ring, flowing gradient
               border and flowing gradient text — same keyframes and values
               as index.html, so the admin matches the website. */
            @keyframes floatSlow {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-8px); }
            }
            @keyframes goldPulse {
                0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.45); }
                70% { box-shadow: 0 0 0 12px rgba(251, 191, 36, 0); }
                100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
            }
            @keyframes borderFlow {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }
            @keyframes textGradientFlow {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            @keyframes shimmerSweep {
                0% { transform: translateX(-120%) skewX(-20deg); }
                100% { transform: translateX(220%) skewX(-20deg); }
            }
            /* Logo card: gentle float + soft gold pulse, like the site. */
            .admin-logo-glow {
                animation: floatSlow 6s ease-in-out infinite, goldPulse 2.6s infinite;
            }
            /* Flowing navy-teal-gold gradient text, like site headings. */
            .admin-gradient-text {
                background: linear-gradient(90deg, #0B2D5B, #0D8A9E, #D4AF37, #0D8A9E, #0B2D5B);
                background-size: 220% auto;
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                animation: textGradientFlow 6s ease infinite;
            }
            /* Gradient strip under the sticky header (navy-teal-gold). */
            .admin-header-accent {
                background: linear-gradient(135deg, rgba(56, 189, 248, 0.65), rgba(251, 191, 36, 0.55), rgba(13, 138, 158, 0.7), rgba(255, 255, 255, 0.25));
                background-size: 250% 250%;
                animation: borderFlow 8s ease infinite;
            }
            /* Glossy shimmer sweep across gradient buttons, like the site. */
            .admin-btn-shimmer {
                position: relative;
                overflow: hidden;
            }
            .admin-btn-shimmer::after {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 45%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
                transform: translateX(-120%) skewX(-20deg);
                animation: shimmerSweep 4.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
                pointer-events: none;
            }
            textarea {
                field-sizing: content;
                overflow-y: hidden;
                resize: vertical;
            }
            /* NOTE: text inputs deliberately do NOT use field-sizing: content.
               It makes an input's min-content width equal to its value, so a
               long value (e.g. "Happy Clients & Pilgrims Served") forces its
               2-column grid track wider than a phone screen — the whole page
               then overflows horizontally and the browser shrinks it, leaving
               a dead strip down the right side. All text inputs here are
               w-full anyway, so this rule changed nothing visually. */
            /* Let grid children shrink below their content size on narrow
               screens (same overflow cause as above: a default 20-char input
               alone is ~130px of min-content, so two of them side by side
               already overflow a 360px phone). Inputs scroll their text
               internally when squeezed, so nothing is lost. */
            #standaloneAdminRoot .grid > * { min-width: 0; }
            /* Safety net: clip any residual horizontal overflow inside the
               admin instead of letting it widen the whole page again.
               Using clip (unlike hidden) does not break the sticky header. */
            #standaloneAdminRoot { overflow-x: clip; }
        `;
        document.head.appendChild(style);
    }

    class AdminPortalManager {
        constructor(containerEl, options = {}) {
            ensureAdminAnimationsStyle();
            this.container = containerEl;
            this.isDrawer = Boolean(options.isDrawer);
            this.onCloseDrawer = options.onCloseDrawer || function () {};

            this.activeTab = "spotlight"; // "spotlight" | "crud" | "media" | "contacts"
            this.activeCrudSubtab = "packages"; // "packages" | "visas"
            this.selectedRoutingRole = "manager";

            const db = window.zakirDB;
            this.siteConfig = db.getLocalSiteConfig();
            this.specialDeals = db.getLocalSpecialDeals();
            this.packages = db.getLocalUmrahPackages();
            this.visas = db.getLocalVisaServices();
            this.workPermits = db.getLocalWorkPermits ? db.getLocalWorkPermits() : [];
            this.workPermitProgrammes = db.getLocalWorkPermitProgrammes ? db.getLocalWorkPermitProgrammes() : [];
            this.enquiries = db.getLocalEnquiries ? db.getLocalEnquiries() : [];
            this.enquiryFilter = "all";
            this.enquirySearch = "";
            this.currentUser = db.getCurrentUser();
            this._lastSeenMode = null; // last mode seen by _updateSyncBadge (for change logging)
            this._activityPanelOpen = false;

            this._detectRoutingRole(this.siteConfig);
            this._init();
        }

        _detectRoutingRole(config) {
            const c = (config && config.contacts) || {};
            const activeWA = cleanWhatsAppDigits(c.activeBookingWhatsApp);
            const secWA = cleanWhatsAppDigits(c.secondaryWhatsApp);
            const mgrWA = cleanWhatsAppDigits(c.managerWhatsApp);
            if (activeWA && secWA && activeWA === secWA && activeWA !== mgrWA) {
                this.selectedRoutingRole = "secondary";
            } else {
                this.selectedRoutingRole = "manager";
            }
        }

        _init() {
            const db = window.zakirDB;
            this.renderShell();
            this._bindGlobalEvents();

            db.onAuthSnapshot(async (user) => {
                // Server-backed modes only: only the owner or an
                // allowlisted email may use the portal. Checked on login
                // AND on session restore (page reload), before the
                // dashboard is shown. Local-realtime (offline passphrase)
                // logins are untouched — the allowlist does not apply in
                // local test mode, so this gate never runs there.
                if (user && db.mode === "api" && typeof db.verifyAdminAccess === "function") {
                    let allowed = false;
                    try {
                        allowed = await db.verifyAdminAccess(user);
                    } catch (_) {
                        allowed = false;
                    }
                    if (!allowed) {
                        this.showToast("This account doesn't have admin access. Ask the owner to add it.", "error");
                        try {
                            await db.logout();
                        } catch (_) {}
                        return;
                    }
                }
                this.currentUser = user;
                this._updateAuthView();
            });

            db.onSiteConfigSnapshot((config) => {
                this.siteConfig = config;
                this._detectRoutingRole(config);
                this._populateConfigFields();
                this._updateLivePreviewBadges();
            });

            db.onSpecialDealsSnapshot((deals) => {
                this.specialDeals = deals;
                this._renderSpecialDealsList();
                this._updateTabCounters();
            });

            db.onUmrahPackagesSnapshot((pkgs) => {
                this.packages = pkgs;
                this._renderPackagesList();
                this._updateTabCounters();
            });

            db.onVisaServicesSnapshot((visas) => {
                this.visas = visas;
                this._renderVisasList();
                this._updateTabCounters();
            });

            if (db.onWorkPermitsSnapshot) {
                db.onWorkPermitsSnapshot((permits) => {
                    this.workPermits = Array.isArray(permits) ? permits : [];
                    this._renderWorkPermitsList();
                    this._updateTabCounters();
                });
            }

            if (db.onWorkPermitProgrammesSnapshot) {
                db.onWorkPermitProgrammesSnapshot((progs) => {
                    this.workPermitProgrammes = Array.isArray(progs) ? progs : [];
                    this._renderWorkPermitProgrammesList();
                    this._updateTabCounters();
                });
            }

            if (db.onEnquiriesSnapshot) {
                db.onEnquiriesSnapshot((enquiries) => {
                    this.enquiries = Array.isArray(enquiries) ? enquiries : [];
                    this._renderEnquiriesList();
                    this._updateTabCounters();
                });
            }

            // Connection badge: reflects the current mode. onModeSnapshot
            // fires immediately with the current mode, then on every mode
            // change.
            if (db.onModeSnapshot) {
                db.onModeSnapshot((mode) => this._updateSyncBadge(mode));
            }
        }

        // Single choke point for ALL admin feedback: every toast is also
        // written to the persistent Activity log, so no message is ever
        // lost when the toast disappears. `detail` is an extra line shown
        // only in the log (e.g. file name, size, destination).
        // `options.sticky` keeps the toast on screen until the caller
        // dismisses it (used for "Uploading…" / "Saving…" messages that
        // must not vanish mid-operation); sticky toasts get a × button
        // so the user can still close one by hand.
        showToast(message, type = "success", detail = "", options = {}) {
            const text = String(message == null ? "" : message);
            // Log first, so the record survives even if the toast DOM is gone.
            this._logActivity(text, type, detail);

            const toastContainer = this.container.querySelector("#adminToastContainer");
            if (!toastContainer) return;

            const toast = document.createElement("div");
            const styleByType = {
                error: { bg: "bg-rose-600 border-rose-400", icon: "fa-circle-exclamation" },
                warning: { bg: "bg-[#B8860B] border-[#D4AF37]", icon: "fa-triangle-exclamation" },
                info: { bg: "bg-[#0B2D5B] border-[#0D8A9E]", icon: "fa-circle-info" },
                success: { bg: "bg-[#0D8A9E] border-[#15B2CB]", icon: "fa-circle-check" }
            };
            const style = styleByType[type] || styleByType.success;
            const persistent = Boolean(options && options.sticky) || type === "error" || type === "warning";

            toast.className = `${style.bg} text-white px-4 py-3.5 rounded-2xl shadow-2xl border flex items-start gap-3 text-sm font-bold transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto`;
            toast.innerHTML = `
                <i class="fa-solid ${style.icon} text-lg mt-0.5"></i>
                <span class="flex-1 leading-snug"></span>
                ${
                    persistent
                        ? `<button type="button" class="toast-close shrink-0 w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors" title="Dismiss" aria-label="Dismiss notification"><i class="fa-solid fa-xmark text-xs"></i></button>`
                        : ""
                }
            `;
            const toastLabel = toast.querySelector("span");
            if (toastLabel) toastLabel.textContent = text;
            const closeBtn = toast.querySelector(".toast-close");
            if (closeBtn) {
                closeBtn.addEventListener("click", () => this._dismissToast(toast));
            }
            toastContainer.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.remove("translate-y-2", "opacity-0");
            });

            // Success and in-progress ("info") toasts auto-dismiss after 5s,
            // unless the toast is sticky — a sticky toast stays until the
            // caller dismisses it (see _runUploadWithFeedback /
            // _runSaveWithFeedback). Errors and warnings stay on screen
            // until the user dismisses them — they are also kept in the
            // Activity log.
            if (!persistent) {
                setTimeout(() => this._dismissToast(toast), 5000);
            }
            return toast;
        }

        _dismissToast(toast) {
            if (!toast || !toast.isConnected) return;
            toast.classList.add("opacity-0", "translate-y-2");
            setTimeout(() => toast.remove(), 300);
        }

        // ----------------------------------------------------------------
        // ACTIVITY LOG — persistent, timestamped record of every admin
        // action (uploads, saves, deletes, login/logout, errors...).
        // Stored in LocalStorage (newest 100), survives page reloads.
        // ----------------------------------------------------------------
        _loadActivityLog() {
            try {
                const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
                if (!raw) return [];
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (_) {
                return [];
            }
        }

        _saveActivityLog(entries) {
            try {
                localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(entries));
            } catch (_) {
                // Never let a full/blocked LocalStorage break the admin.
            }
        }

        _logActivity(action, type = "success", detail = "") {
            const entry = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                time: new Date().toISOString(),
                action: String(action == null ? "" : action),
                detail: String(detail == null ? "" : detail),
                type: type === "error" || type === "warning" || type === "info" ? type : "success",
                // Errors/warnings start unread (red badge); success/info do not.
                read: !(type === "error" || type === "warning")
            };
            const entries = this._loadActivityLog();
            entries.unshift(entry);
            this._saveActivityLog(entries.slice(0, ACTIVITY_LOG_MAX_ENTRIES));
            this._refreshActivityBadge();
            if (this._activityPanelOpen) this._renderActivityLog();
            return entry;
        }

        _getUnreadActivityCount() {
            return this._loadActivityLog().filter((e) => !e.read).length;
        }

        _refreshActivityBadge() {
            const badge = this.container && this.container.querySelector
                ? this.container.querySelector("#activityUnreadBadge")
                : null;
            if (!badge) return;
            const count = this._getUnreadActivityCount();
            badge.textContent = count > 99 ? "99+" : String(count);
            badge.classList.toggle("hidden", count === 0);
        }

        _formatActivityTime(iso) {
            try {
                return new Date(iso).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                });
            } catch (_) {
                return String(iso || "");
            }
        }

        _formatFileSize(bytes) {
            const n = Number(bytes);
            if (!n || n <= 0) return "";
            if (n < 1024) return `${n} B`;
            if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
            return `${(n / (1024 * 1024)).toFixed(1)} MB`;
        }

        _renderActivityLog() {
            const listEl = this.container.querySelector("#adminActivityList");
            if (!listEl) return;
            const entries = this._loadActivityLog();
            if (!entries.length) {
                listEl.innerHTML = `
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                        <i class="fa-solid fa-clock-rotate-left text-2xl text-slate-300 mb-2"></i>
                        <p class="text-sm font-bold text-slate-600">No activity yet</p>
                        <p class="text-xs text-slate-400 mt-1 leading-relaxed">Everything you do in the admin — uploads, saves, deletes, logins — will appear here with its time and result.</p>
                    </div>`;
                return;
            }
            const dotByType = {
                success: "bg-emerald-500",
                info: "bg-[#0D8A9E]",
                warning: "bg-amber-500",
                error: "bg-rose-500"
            };
            const labelByType = {
                success: "Success",
                info: "Info",
                warning: "Warning",
                error: "Error"
            };
            listEl.innerHTML = entries
                .map((e) => {
                    const dot = dotByType[e.type] || dotByType.success;
                    const label = labelByType[e.type] || "Success";
                    return `
                    <div class="bg-white border ${e.type === "error" ? "border-rose-200" : e.type === "warning" ? "border-amber-200" : "border-slate-200"} rounded-2xl p-3 shadow-sm">
                        <div class="flex items-start gap-2.5">
                            <span class="w-2.5 h-2.5 rounded-full ${dot} mt-1.5 shrink-0"></span>
                            <div class="flex-1 min-w-0">
                                <p class="text-[13px] font-bold text-[#0B2D5B] leading-snug">${escapeHtml(e.action)}</p>
                                ${e.detail ? `<p class="text-xs text-slate-500 mt-0.5 leading-relaxed">${escapeHtml(e.detail)}</p>` : ""}
                                <p class="text-[11px] text-slate-400 mt-1">${escapeHtml(this._formatActivityTime(e.time))} · ${label}</p>
                            </div>
                        </div>
                    </div>`;
                })
                .join("");
        }

        _setActivityPanelOpen(open) {
            const panel = this.container.querySelector("#adminActivityPanel");
            if (!panel) return;
            this._activityPanelOpen = Boolean(open);
            panel.classList.toggle("hidden", !this._activityPanelOpen);
            if (this._activityPanelOpen) {
                // Opening the log marks every error/warning as read.
                const entries = this._loadActivityLog();
                entries.forEach((e) => {
                    e.read = true;
                });
                this._saveActivityLog(entries);
                this._refreshActivityBadge();
                this._renderActivityLog();
            }
        }

        _clearActivityLog() {
            this._saveActivityLog([]);
            this._renderActivityLog();
            this._refreshActivityBadge();
            this.showToast("Activity log cleared.");
        }

        // Honest save feedback. In local test mode there is no server:
        // db save methods return { synced: false } — that is the
        // EXPECTED result here, not a failure, so it must never read as
        // an error or as "not published". When `verify` is given, the
        // saved document is re-read from local storage and the match
        // confirms the save before anything is claimed (see below).
        // - result is null/undefined (e.g. a reorder with nothing to move)
        //   -> nothing changed, so show no toast at all.
        // `verify` is { collection, docId, expected } — the document to
        // re-read and the field values that must match. The check runs in
        // the background: the admin stays usable while it runs.
        // `savedMessage` is the plain-language success text for this
        // save (e.g. which deal was saved); it is shown on its own when
        // there is no local check to run, and kept as the Activity-log
        // detail when the check runs.
        _showSyncToast(result, savedMessage, savedType = "success", verify = null) {
            if (!result || typeof result.synced !== "boolean") return;
            if (!verify || !verify.collection || !verify.docId) {
                this.showToast(savedMessage, savedType);
                return;
            }
            const db = window.zakirDB;
            if (!db || typeof db.verifyDocSaved !== "function") {
                // Very old cached code without the check — fall back to the
                // plain message instead of breaking the save feedback.
                this.showToast(savedMessage, savedType);
                return;
            }
            // Saved in this browser — now prove the local re-read matches
            // before saying so. The checking message stays up until the
            // verdict arrives, then it is replaced by the confirmation
            // (or the warning). Every step is logged to the Activity log.
            const checkingToast = this.showToast("Saved. Checking it saved correctly…", "info", savedMessage);
            db.verifyDocSaved(verify.collection, verify.docId, verify.expected || {})
                .then((check) => {
                    this._dismissToast(checkingToast);
                    if (check && check.verified) {
                        this.showToast("Saved in this browser — local test mode ✓", "success", savedMessage);
                    } else {
                        this.showToast(
                            "Saved, but the check could not confirm it yet — please check the website.",
                            "warning",
                            savedMessage
                        );
                    }
                })
                .catch(() => {
                    this._dismissToast(checkingToast);
                    this.showToast(
                        "Saved, but the check could not confirm it yet — please check the website.",
                        "warning",
                        savedMessage
                    );
                });
        }

        // Builds the "verify this save" descriptor for _showSyncToast
        // from a saved record: which document to re-read, and which
        // field values must match. Returns null when there is nothing
        // safe to check (no record / no id), in which case _showSyncToast
        // falls back to the plain saved message.
        _verifyFor(collection, record, fields, docId) {
            const id = docId || (record && record.id);
            if (!id || !record) return null;
            const expected = {};
            (fields || []).forEach((f) => {
                expected[f] = record[f];
            });
            return { collection, docId: id, expected };
        }

        // Processing state for a save button: disable it and show
        // "Saving…" on it while the save is in flight, so a double-tap
        // can't fire the save twice. Returns a restore function — always
        // call it (e.g. in a finally block) so the button comes back on
        // success AND on failure. Safe to call with no button.
        _markButtonSaving(button) {
            if (!button) return () => {};
            const originalHtml = button.innerHTML;
            button.disabled = true;
            const labelSpan = button.querySelector("span");
            if (labelSpan) labelSpan.textContent = "Saving…";
            else button.textContent = "Saving…";
            let done = false;
            return () => {
                if (done) return;
                done = true;
                button.disabled = false;
                button.innerHTML = originalHtml;
            };
        }

        // Runs a save with a visible processing state: the button shows
        // "Saving…" and can't be double-tapped, and a "Saving… please
        // wait." message stays on screen until the save finishes.
        // `work` is the async save itself; its result is returned and
        // its errors are re-thrown to the caller's catch. The button and
        // the message are always restored, even when the save fails.
        async _runSaveWithFeedback(button, work) {
            const restoreButton = this._markButtonSaving(button);
            const savingToast = this.showToast("Saving… please wait.", "info", "", { sticky: true });
            try {
                return await work();
            } finally {
                this._dismissToast(savingToast);
                restoreButton();
            }
        }

        // Runs an image upload with a visible processing state: an
        // "Uploading…" message stays on screen until the upload finishes
        // (it is sticky — not auto-dismissed after 5s), then the result
        // toast is shown. `work` is the async upload itself; its result
        // is returned and its errors are re-thrown to the caller's catch.
        // The message is always dismissed, even when the upload fails.
        async _runUploadWithFeedback(message, detail, work) {
            const uploadingToast = this.showToast(message, "info", detail, { sticky: true });
            try {
                return await work();
            } finally {
                this._dismissToast(uploadingToast);
            }
        }

        // Connection badge: this build runs in local test mode only —
        // there is no server and no live connection to report, so the
        // badge always says so and never claims a live connection.
        // Called from the mode subscription in _init and on every login
        // view update.
        _updateSyncBadge(mode) {
            const badge = this.container.querySelector("#dbModeBadge");
            if (!badge) return;
            const db = window.zakirDB;
            const current = mode || (db ? db.mode : "local-realtime");
            // Track the mode only so a future backend could announce a
            // change; in local test mode it never changes and there is
            // nothing to announce.
            this._lastSeenMode = current;
            badge.className =
                "text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 " +
                "bg-amber-50 text-amber-800 border border-amber-300";
            badge.title = "Local test mode — changes save only in this browser and will not appear on other devices.";
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Local test mode — saves only in this browser`;
        }

        renderShell() {
            this.container.innerHTML = `
                <!-- Toast Notification Container (above the Activity panel) -->
                <div id="adminToastContainer" class="fixed inset-x-4 bottom-5 sm:inset-x-auto sm:right-5 sm:w-full sm:max-w-sm z-[97] flex flex-col gap-2 pointer-events-none"></div>

                <!-- Activity Log Slide-Over Panel -->
                <div id="adminActivityPanel" class="fixed inset-0 z-[96] hidden">
                    <div class="absolute inset-0 bg-[#0B2D5B]/40" data-action="close-activity-log"></div>
                    <aside class="absolute right-0 top-0 h-full w-full max-w-md bg-[#F8FAFC] shadow-2xl flex flex-col">
                        <div class="flex items-center justify-between gap-2 px-4 py-3 bg-white border-b border-slate-200">
                            <h2 class="font-black text-base text-[#0B2D5B] flex items-center gap-2">
                                <i class="fa-solid fa-clock-rotate-left text-[#0D8A9E]"></i>
                                Activity
                            </h2>
                            <div class="flex items-center gap-2">
                                <button type="button" data-action="clear-activity-log" class="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-xl transition-colors">Clear</button>
                                <button type="button" data-action="close-activity-log" class="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors" title="Close Activity" aria-label="Close Activity">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>
                        <div id="adminActivityList" class="flex-1 overflow-y-auto px-4 py-3 space-y-2"></div>
                        <p class="px-4 py-2.5 text-[11px] text-slate-400 bg-white border-t border-slate-200 leading-relaxed">Newest first · kept on this device (last 100 entries) · errors &amp; warnings stay here until cleared.</p>
                    </aside>
                </div>

                <!-- ============================================================== -->
                <!-- 1. AUTHENTICATION LOGIN SCREEN                                 -->
                <!-- ============================================================== -->
                <div id="adminAuthView" class="min-h-screen flex items-center justify-center p-4 admin-gradient-animated">
                    <div class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-white/30 anim-scale-in">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-lg border border-slate-200/80 admin-logo-glow">
                                    <img src="./assets/logo-mark.png" alt="Zakir Travel Logo" class="w-full h-full object-contain">
                                </div>
                                <div>
                                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-[#0D8A9E] block">Admin Portal</span>
                                    <h1 class="text-xl font-black admin-gradient-text">Zakir Travel Admin</h1>
                                </div>
                            </div>
                            ${
                                this.isDrawer
                                    ? `<button type="button" data-action="close-drawer" class="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-transform hover:rotate-90" title="Back to Website">
                                        <i class="fa-solid fa-xmark"></i>
                                       </button>`
                                    : `<a href="index.html" class="text-xs font-bold text-[#0D8A9E] hover:underline flex items-center gap-1">
                                        <i class="fa-solid fa-arrow-left"></i> Website
                                       </a>`
                            }
                        </div>

                        <div class="bg-gradient-to-r from-[#E6F6F8] to-white border border-[#0D8A9E]/30 rounded-2xl p-4 mb-5 text-xs text-[#0B2D5B]">
                            <div class="font-extrabold flex items-center gap-1.5 mb-1">
                                <i class="fa-solid fa-shield-halved text-[#D4AF37]"></i>
                                <span>Secure Admin Access</span>
                            </div>
                            <p class="text-slate-600 leading-relaxed">
                                Sign in to manage website offers, packages, visas, and enquiries.
                            </p>
                        </div>

                        <form id="adminLoginForm" class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Staff Email Address</label>
                                <input type="email" id="adminLoginEmail" required placeholder="you@zakirtravels.com" autocomplete="username" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#0D8A9E] focus:ring-2 focus:ring-[#0D8A9E]/20 transition-all">
                            </div>
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
                                <input type="password" id="adminLoginPassword" required placeholder="Enter your password" autocomplete="current-password" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#0D8A9E] focus:ring-2 focus:ring-[#0D8A9E]/20 transition-all">
                            </div>
                            <div id="adminLoginError" class="hidden text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3"></div>
                            <button type="submit" class="w-full admin-btn-shimmer bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-extrabold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-arrow-right-to-bracket"></i>
                                <span>Sign In</span>
                            </button>
                        </form>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- 2. AUTHENTICATED MOBILE-FIRST ADMIN DASHBOARD                  -->
                <!-- ============================================================== -->
                <div id="adminDashboardView" class="hidden min-h-screen pb-24">
                    
                    <!-- Sticky Top Admin Header -->
                    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md text-[#0B2D5B] shadow-card border-b border-slate-200">
                        <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div class="w-11 h-11 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-sm border border-slate-200 admin-logo-glow">
                                    <img src="./assets/logo-mark.png" alt="Zakir Travel Logo" class="w-full h-full object-contain">
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h1 class="font-black text-base sm:text-lg tracking-tight leading-none admin-gradient-text">Zakir Travel Admin</h1>
                                        <span id="dbModeBadge" class="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1" title="Local test mode — changes save only in this browser and will not appear on other devices.">
                                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Local test mode — saves only in this browser
                                        </span>
                                    </div>
                                    <p id="adminActiveUserLabel" class="text-[11px] text-slate-500 mt-0.5">Signed in as Inam Khan</p>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="flex flex-wrap items-center gap-2 sm:gap-2.5 ml-auto">
                                <!-- Save Changes Button -->
                                <button type="button" id="headerSavePushBtn" data-action="save-push-all" class="anim-pulse-teal admin-btn-shimmer bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white text-xs font-black px-3 sm:px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95">
                                    <i class="fa-solid fa-circle-check text-sm"></i>
                                    <span>Save Changes</span>
                                </button>

                                ${
                                    this.isDrawer
                                        ? `<button type="button" data-action="close-drawer" class="bg-[#E6F6F8] hover:bg-[#D7F0F4] border border-[#0D8A9E]/20 text-[#0B2D5B] text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all">
                                            <i class="fa-solid fa-eye text-[#0D8A9E]"></i>
                                            <span class="hidden sm:inline">View Page</span>
                                           </button>`
                                        : `<a href="index.html" class="bg-[#E6F6F8] hover:bg-[#D7F0F4] border border-[#0D8A9E]/20 text-[#0B2D5B] text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all">
                                            <i class="fa-solid fa-eye text-[#0D8A9E]"></i>
                                            <span class="hidden sm:inline">Website</span>
                                           </a>`
                                }

                                <button type="button" data-action="open-activity-log" class="relative bg-white hover:bg-slate-50 border border-slate-200 text-[#0B2D5B] text-xs font-bold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-all" title="Activity log — every action and error, with its time">
                                    <i class="fa-solid fa-clock-rotate-left text-[#0D8A9E]"></i>
                                    <span class="hidden sm:inline">Activity</span>
                                    <span id="activityUnreadBadge" class="hidden absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">0</span>
                                </button>

                                <button type="button" data-action="logout" class="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#0B2D5B] text-xs font-bold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-all" title="Lock / Logout">
                                    <i class="fa-solid fa-lock"></i>
                                    <span class="hidden sm:inline">Lock</span>
                                </button>
                            </div>
                        </div>
                        <div class="h-[3px] admin-header-accent"></div>
                    </header>

                    <main class="max-w-7xl mx-auto px-4 pt-6 space-y-6">

                        <!-- ========================================================== -->
                        <!-- 7 MANAGEMENT TABS NAVIGATION                               -->
                        <!-- ========================================================== -->
                        <nav class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 bg-white p-2 rounded-2xl shadow-card border border-slate-200/80">
                            <button type="button" data-tab="spotlight" class="admin-tab-btn bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] text-white font-extrabold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all ring-1 ring-[#D4AF37]/60">
                                <i class="fa-solid fa-house text-[#FDE68A]"></i>
                                <span>1. Home Page</span>
                            </button>
                            <button type="button" data-tab="umrah" class="admin-tab-btn text-slate-600 hover:bg-[#E6F6F8] font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                                <i class="fa-solid fa-kaaba text-[#0D8A9E]"></i>
                                <span>2. Umrah Page</span>
                                <span id="tabBadgeDeals" class="bg-[#FEF3C7] text-[#8A6D0B] text-[10px] font-black px-2 py-0.5 rounded-full" title="Special Flyer Deals">1</span>
                                <span id="tabBadgePkgs" class="bg-[#E6F6F8] text-[#0D8A9E] text-[10px] font-black px-2 py-0.5 rounded-full" title="Comparison Packages">4</span>
                            </button>
                            <button type="button" data-tab="visas" class="admin-tab-btn text-slate-600 hover:bg-[#E6F6F8] font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                                <i class="fa-solid fa-passport text-[#0D8A9E]"></i>
                                <span>3. Visas & Flights</span>
                                <span id="tabBadgeVisas" class="bg-[#E6F6F8] text-[#0D8A9E] text-[10px] font-black px-2 py-0.5 rounded-full">6</span>
                            </button>
                            <button type="button" data-tab="workpermit" class="admin-tab-btn text-slate-600 hover:bg-[#E6F6F8] font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                                <i class="fa-solid fa-earth-europe text-[#0D8A9E]"></i>
                                <span>4. Work Permit</span>
                                <span id="tabBadgeWorkPermits" class="bg-[#E6F6F8] text-[#0D8A9E] text-[10px] font-black px-2 py-0.5 rounded-full">6</span>
                            </button>
                            <button type="button" data-tab="contacts" class="admin-tab-btn text-slate-600 hover:bg-[#E6F6F8] font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                                <i class="fa-brands fa-whatsapp text-[#128C7E] text-base"></i>
                                <span>5. Contact & Office</span>
                            </button>
                            <button type="button" data-tab="enquiries" class="admin-tab-btn text-slate-600 hover:bg-[#E6F6F8] font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                                <i class="fa-solid fa-inbox text-[#0D8A9E]"></i>
                                <span>6. Enquiries</span>
                                <span id="tabBadgeEnquiries" class="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full" title="New enquiries">0</span>
                            </button>
                            <!-- Owner only: who may open the admin portal. Hidden for
                                 everyone else (see _updateAccessTabVisibility); on
                                 small screens it sits as a full-width row of its own
                                 so the grid stays tidy, on desktop it joins the row. -->
                            <button type="button" data-tab="access" class="admin-tab-btn hidden text-slate-600 hover:bg-[#E6F6F8] font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                                <i class="fa-solid fa-user-shield text-[#D4AF37]"></i>
                                <span>7. Admin Access</span>
                            </button>
                        </nav>

                        <!-- ========================================================== -->
                        <!-- TAB 1: HOME PAGE GENERAL AGENCY INFORMATION (index.html)   -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-spotlight" class="admin-tab-panel space-y-6 anim-fade-up">
                            <form id="homePageContentForm" class="grid lg:grid-cols-12 gap-6">
                                <!-- Left Column: Home Hero, About Our Agency & 4 Key Stats -->
                                <div class="lg:col-span-6 bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 space-y-5">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div>
                                            <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Home Page Content</span>
                                            <h3 class="text-lg font-black text-[#0B2D5B]">Home Hero, About Agency & 4 Key Stats</h3>
                                        </div>
                                        <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">Home Page</span>
                                    </div>

                                    <div class="grid sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Hero Top Badge Text</label>
                                            <input type="text" id="homeHeroBadgeInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Hero Main Heading</label>
                                            <input type="text" id="homeHeroHeadingMainInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                        </div>
                                        <div class="sm:col-span-2">
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Hero Intro Description</label>
                                            <textarea id="homeHeroDescriptionInput" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700"></textarea>
                                        </div>
                                    </div>

                                    <div class="border-t border-slate-100 pt-4 space-y-3">
                                        <h4 class="text-xs font-black uppercase text-[#0B2D5B]">About Our Agency & Mission (Home Page)</h4>
                                        <div class="grid sm:grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">About Section Badge</label>
                                                <input type="text" id="homeAboutBadgeInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                            </div>
                                            <div>
                                                <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">About Section Heading</label>
                                                <input type="text" id="homeAboutHeadingInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                            </div>
                                            <div class="sm:col-span-2">
                                                <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">About Agency Description</label>
                                                <textarea id="homeAboutDescInput" rows="3" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"></textarea>
                                            </div>
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                <span class="text-[10px] font-bold uppercase text-[#0D8A9E]">Mission Card</span>
                                                <input type="text" id="homeMissionTitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                <textarea id="homeMissionDescInput" rows="2" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600"></textarea>
                                            </div>
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                <span class="text-[10px] font-bold uppercase text-[#0D8A9E]">Regional Accessibility Card</span>
                                                <input type="text" id="homeVisionTitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                <textarea id="homeVisionDescInput" rows="2" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600"></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="border-t border-slate-100 pt-4 space-y-3">
                                        <h4 class="text-xs font-black uppercase text-[#0B2D5B]">Our 2 Official Branch Locations (Islamabad & Swat Matta)</h4>
                                        <div class="grid sm:grid-cols-2 gap-3">
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                <span class="text-[10px] font-extrabold uppercase text-[#0B2D5B]">Branch 01 (Islamabad)</span>
                                                <input type="text" id="homeBranch1TitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                <input type="text" id="homeBranch1AddrInput" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">
                                                <textarea id="homeBranch1DescInput" rows="2" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600"></textarea>
                                            </div>
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                <span class="text-[10px] font-extrabold uppercase text-[#0D8A9E]">Branch 02 (Swat Matta)</span>
                                                <input type="text" id="homeBranch2TitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                <input type="text" id="homeBranch2AddrInput" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">
                                                <textarea id="homeBranch2DescInput" rows="2" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600"></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="border-t border-slate-100 pt-4">
                                        <h4 class="text-xs font-black uppercase text-[#0B2D5B] mb-3">4 Agency Key Highlight Stats</h4>
                                        <div class="grid grid-cols-2 gap-3">
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                <span class="text-[10px] font-bold uppercase text-[#0D8A9E]">Stat Box 1</span>
                                                <input type="text" id="homeStat1NumInput" required placeholder="100K+" class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#0B2D5B]">
                                                <input type="text" id="homeStat1LblInput" required placeholder="Happy Clients & Pilgrims Served" class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600">
                                            </div>
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                <span class="text-[10px] font-bold uppercase text-[#0D8A9E]">Stat Box 2</span>
                                                <input type="text" id="homeStat2NumInput" required placeholder="24/7" class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#0B2D5B]">
                                                <input type="text" id="homeStat2LblInput" required placeholder="WhatsApp & On-Trip Support" class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600">
                                            </div>
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                <span class="text-[10px] font-bold uppercase text-[#0D8A9E]">Stat Box 3</span>
                                                <input type="text" id="homeStat3NumInput" required placeholder="50+" class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#0B2D5B]">
                                                <input type="text" id="homeStat3LblInput" required placeholder="Global Airlines & Destinations" class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600">
                                            </div>
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                <span class="text-[10px] font-bold uppercase text-[#0D8A9E]">Stat Box 4</span>
                                                <input type="text" id="homeStat4NumInput" required placeholder="Swat Matta" class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#0B2D5B]">
                                                <input type="text" id="homeStat4LblInput" required placeholder="Central Head Office (Matta Swat)" class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600">
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Right Column: 3 Why Choose Us Pillars & 4 Core Service Cards -->
                                <div class="lg:col-span-6 bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 space-y-5 flex flex-col justify-between">
                                    <div class="space-y-5">
                                        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Trust Pillars & Services Overview</span>
                                                <h3 class="text-lg font-black text-[#0B2D5B]">Why Choose Us & 4 Core Services</h3>
                                            </div>
                                            <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">Home Page</span>
                                        </div>

                                        <div>
                                            <h4 class="text-xs font-black uppercase text-[#0B2D5B] mb-3">3 "Why Choose Us" Agency Pillars</h4>
                                            <div class="grid sm:grid-cols-3 gap-3">
                                                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                    <span class="text-[10px] font-extrabold uppercase text-[#0D8A9E]">Pillar 1</span>
                                                    <input type="text" id="homeWhy1TitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                    <textarea id="homeWhy1DescInput" rows="3" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600"></textarea>
                                                </div>
                                                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                    <span class="text-[10px] font-extrabold uppercase text-[#0D8A9E]">Pillar 2</span>
                                                    <input type="text" id="homeWhy2TitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                    <textarea id="homeWhy2DescInput" rows="3" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600"></textarea>
                                                </div>
                                                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                                    <span class="text-[10px] font-extrabold uppercase text-[#0D8A9E]">Pillar 3</span>
                                                    <input type="text" id="homeWhy3TitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                    <textarea id="homeWhy3DescInput" rows="3" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600"></textarea>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="border-t border-slate-100 pt-4">
                                            <h4 class="text-xs font-black uppercase text-[#0B2D5B] mb-3">4 Core Travel Service Cards on Home Page</h4>
                                            <div class="grid sm:grid-cols-2 gap-3">
                                                <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                                    <span class="text-[10px] font-extrabold uppercase text-[#0D8A9E]">Service Card 1 (Umrah)</span>
                                                    <input type="text" id="homeSrv1TitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                    <textarea id="homeSrv1DescInput" rows="2" required class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-600"></textarea>
                                                </div>
                                                <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                                    <span class="text-[10px] font-extrabold uppercase text-[#0D8A9E]">Service Card 2 (Flights)</span>
                                                    <input type="text" id="homeSrv2TitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                    <textarea id="homeSrv2DescInput" rows="2" required class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-600"></textarea>
                                                </div>
                                                <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                                    <span class="text-[10px] font-extrabold uppercase text-[#0D8A9E]">Service Card 3 (Visas)</span>
                                                    <input type="text" id="homeSrv3TitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                    <textarea id="homeSrv3DescInput" rows="2" required class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-600"></textarea>
                                                </div>
                                                <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                                    <span class="text-[10px] font-extrabold uppercase text-[#0D8A9E]">Service Card 4 (Hotels & Transport)</span>
                                                    <input type="text" id="homeSrv4TitleInput" required class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                                    <textarea id="homeSrv4DescInput" rows="2" required class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-600"></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                        <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                        <span>Save Home Page General Info</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- ========================================================== -->
                        <!-- TAB 2: UMRAH PACKAGES PAGE (DEALS + PACKAGES + CONTENT)    -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-umrah" class="admin-tab-panel hidden space-y-6 anim-fade-up">

                            <!-- Header Bar for Special Flyer Deals CRUD -->
                            <div class="bg-white rounded-3xl p-5 sm:p-6 shadow-card border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="bg-[#FEF3C7] text-[#8A6D0B] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                                            Umrah Flyer Deals
                                        </span>
                                        <span class="text-xs font-bold text-[#0D8A9E]"><i class="fa-solid fa-circle text-[6px] mr-1"></i>Shown on the Umrah page</span>
                                    </div>
                                    <h3 class="text-xl font-black text-[#0B2D5B] mt-1">Manage Special Umrah Flyer Deals & Offers</h3>
                                    <p class="text-xs text-slate-500 mt-0.5">
                                        Add multiple flyer deals (for example January Umrah, Ramzan Special, or Rabi-ul-Awal). Each deal appears as its own dual-frame showcase card on the Umrah page.
                                    </p>
                                </div>

                                <div class="flex flex-wrap items-center gap-2.5 shrink-0">
                                    <button type="button" data-action="open-deal-modal" class="bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                        <i class="fa-solid fa-plus"></i>
                                        <span>Add New Special Deal</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Special Flyer Deals Visual CRUD Grid -->
                            <div id="crudSpecialDealsContainer" class="grid grid-cols-1 lg:grid-cols-2 gap-6"></div>

                            <!-- Comparison Umrah Packages Header & Grid -->
                            <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-card">
                                <div>
                                    <span class="text-[10px] font-black uppercase tracking-wider text-[#0D8A9E]">Umrah Page Content</span>
                                    <h3 class="text-xl font-black text-[#0B2D5B]">Comparison Umrah Packages</h3>
                                    <p class="text-xs text-slate-500">Add, edit, reorder, or hide Umrah package comparison cards displayed on the Umrah Packages page.</p>
                                </div>
                                <button type="button" data-action="open-pkg-modal" class="bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition-all">
                                    <i class="fa-solid fa-plus"></i> Add Umrah Package Card
                                </button>
                            </div>

                            <!-- Umrah Packages List -->
                            <div id="crudPackagesContainer" class="grid md:grid-cols-2 gap-4"></div>

                            <!-- Umrah Page Hero, 3 Inclusions Cards, Family Banner & Primary Deal Media Editor -->
                            <form id="umrahPageContentForm" class="grid lg:grid-cols-12 gap-6">
                                <div class="lg:col-span-7 bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 space-y-5">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div>
                                            <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Page Text & Inclusions Editor</span>
                                            <h3 class="text-lg font-black text-[#0B2D5B]">Umrah Page Banner, Inclusions & Family CTA</h3>
                                        </div>
                                        <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">Umrah Page</span>
                                    </div>

                                    <div class="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Page Hero Top Badge</label>
                                            <input type="text" id="umrahHeroBadgeInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Page Hero Main Heading</label>
                                            <input type="text" id="umrahHeroTitleInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                        </div>
                                        <div class="sm:col-span-2">
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Page Hero Subtitle</label>
                                            <textarea id="umrahHeroSubtitleInput" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                        </div>
                                    </div>

                                    <div class="grid md:grid-cols-3 gap-3 pt-1">
                                        <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                            <span class="text-[10px] font-black uppercase text-[#0D8A9E]">Inclusion 1 (Flights & Visas)</span>
                                            <input type="text" id="umrahInc1TitleInput" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                            <label class="block text-[10px] font-semibold text-slate-500">Bullets (1 per line)</label>
                                            <textarea id="umrahInc1BulletsInput" rows="4" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-slate-600"></textarea>
                                        </div>
                                        <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                            <span class="text-[10px] font-black uppercase text-[#0D8A9E]">Inclusion 2 (Hotels)</span>
                                            <input type="text" id="umrahInc2TitleInput" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                            <label class="block text-[10px] font-semibold text-slate-500">Bullets (1 per line)</label>
                                            <textarea id="umrahInc2BulletsInput" rows="4" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-slate-600"></textarea>
                                        </div>
                                        <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                            <span class="text-[10px] font-black uppercase text-[#0D8A9E]">Inclusion 3 (Transport)</span>
                                            <input type="text" id="umrahInc3TitleInput" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#0B2D5B]">
                                            <label class="block text-[10px] font-semibold text-slate-500">Bullets (1 per line)</label>
                                            <textarea id="umrahInc3BulletsInput" rows="4" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-slate-600"></textarea>
                                        </div>
                                    </div>

                                    <div class="grid sm:grid-cols-2 gap-4 pt-1">
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Family Umrah Banner Heading</label>
                                            <input type="text" id="umrahFamilyTitleInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Family Umrah Banner Description</label>
                                            <input type="text" id="umrahFamilyDescInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700">
                                        </div>
                                    </div>

                                    <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                        <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                        <span>Save Umrah Page Content</span>
                                    </button>
                                </div>

                                <!-- Right Column: Primary Deal Media & Monthly Flyer Popup Uploader -->
                                <div class="lg:col-span-5 bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 space-y-5 flex flex-col justify-between">
                                    <div class="space-y-4">
                                        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Umrah Deal Frames & Flyer</span>
                                                <h3 class="text-lg font-black text-[#0B2D5B]">Primary Deal Images & Monthly Flyer</h3>
                                            </div>
                                            <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">Phone Upload</span>
                                        </div>

                                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <!-- Madinah -->
                                            <div class="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col justify-between space-y-2">
                                                <div>
                                                    <span class="text-[10px] font-bold uppercase text-[#0D8A9E]">Madinah Frame</span>
                                                    <div class="h-28 rounded-xl overflow-hidden border border-[#0D8A9E] bg-slate-200 mt-1">
                                                        <img id="previewMadinahImg" src="" alt="Madinah" class="w-full h-full object-cover">
                                                    </div>
                                                    <input type="text" id="inputMadinahUrl" placeholder="Paste image link" class="mt-2 w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
                                                </div>
                                                <label class="w-full bg-white hover:bg-[#0B2D5B] hover:text-white text-[#0B2D5B] border border-slate-200 font-bold text-[11px] py-1.5 px-2 rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-colors">
                                                    <i class="fa-solid fa-camera"></i> Upload
                                                    <input type="file" accept="image/*" data-upload-target="inputMadinahUrl" data-preview-target="previewMadinahImg" class="hidden">
                                                </label>
                                            </div>

                                            <!-- Makkah -->
                                            <div class="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col justify-between space-y-2">
                                                <div>
                                                    <span class="text-[10px] font-bold uppercase text-[#0B2D5B]">Makkah Frame</span>
                                                    <div class="h-28 rounded-xl overflow-hidden border border-[#0B2D5B] bg-slate-200 mt-1">
                                                        <img id="previewMakkahImg" src="" alt="Makkah" class="w-full h-full object-cover">
                                                    </div>
                                                    <input type="text" id="inputMakkahUrl" placeholder="Paste image link" class="mt-2 w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
                                                </div>
                                                <label class="w-full bg-white hover:bg-[#0B2D5B] hover:text-white text-[#0B2D5B] border border-slate-200 font-bold text-[11px] py-1.5 px-2 rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-colors">
                                                    <i class="fa-solid fa-camera"></i> Upload
                                                    <input type="file" accept="image/*" data-upload-target="inputMakkahUrl" data-preview-target="previewMakkahImg" class="hidden">
                                                </label>
                                            </div>

                                            <!-- Promotional Flyer -->
                                            <div class="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col justify-between space-y-2">
                                                <div>
                                                    <span class="text-[10px] font-bold uppercase text-[#0D8A9E]">Flyer Popup</span>
                                                    <div class="h-28 rounded-xl overflow-hidden border border-dashed border-[#0D8A9E] bg-white mt-1 flex items-center justify-center">
                                                        <img id="previewFlyerImg" src="" alt="Flyer" class="w-full h-full object-cover hidden">
                                                        <div id="previewFlyerPlaceholder" class="text-center p-2 text-[10px] text-slate-400">
                                                            <i class="fa-solid fa-file-image text-lg text-[#0D8A9E] block mb-1"></i>
                                                            Digital Flyer
                                                        </div>
                                                    </div>
                                                    <input type="text" id="inputFlyerUrl" placeholder="Flyer image link (optional)" class="mt-2 w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
                                                </div>
                                                <label class="w-full bg-white hover:bg-[#0D8A9E] hover:text-white text-[#0D8A9E] border border-[#0D8A9E]/30 font-bold text-[11px] py-1.5 px-2 rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-colors">
                                                    <i class="fa-solid fa-upload"></i> Upload
                                                    <input type="file" accept="image/*" data-upload-target="inputFlyerUrl" data-preview-target="previewFlyerImg" class="hidden">
                                                </label>
                                            </div>
                                        </div>

                                        <label class="flex items-center gap-2 cursor-pointer pt-2">
                                            <input type="checkbox" id="chkShowFlyerButton" class="w-4 h-4 accent-[#0D8A9E] rounded">
                                            <span class="text-xs font-bold text-[#0B2D5B]">Show "View Latest Flyer" button on Umrah Deal Cards</span>
                                        </label>
                                    </div>

                                    <button type="submit" class="w-full bg-[#0D8A9E] hover:bg-[#096979] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                        <i class="fa-solid fa-circle-check"></i>
                                        <span>Save Umrah Media & Flyer Settings</span>
                                    </button>
                                </div>
                            </form>

                            <!-- Estimator pricing & content (moved into the Umrah page tab) -->
                            <form id="spotlightAndCalcForm" class="grid lg:grid-cols-12 gap-6">
                                
                                <!-- Left Column: Calculator Room Tier Pricing & Auto-Scale -->
                                <div class="lg:col-span-6 bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 flex flex-col justify-between space-y-5">
                                    <div class="space-y-4">
                                        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Estimator Pricing</span>
                                                <h3 class="text-lg font-black text-[#0B2D5B]">Room & Add-On Rates</h3>
                                            </div>
                                            <div class="w-10 h-10 rounded-2xl bg-[#E6F6F8] text-[#0D8A9E] flex items-center justify-center text-lg">
                                                <i class="fa-solid fa-calculator"></i>
                                            </div>
                                        </div>

                                        <!-- Auto-scale toggle -->
                                        <label class="flex items-start gap-3 bg-[#E6F6F8]/70 border border-[#0D8A9E]/30 rounded-2xl p-3.5 cursor-pointer">
                                            <input type="checkbox" id="calcAutoScaleToggle" class="w-5 h-5 accent-[#0B2D5B] mt-0.5 rounded">
                                            <div>
                                                <span class="text-xs font-extrabold text-[#0B2D5B] block">Match room rates to the main deal price</span>
                                                <span class="text-[11px] text-slate-600">When enabled, room rates adjust automatically whenever you update the main deal price.</span>
                                            </div>
                                        </label>

                                        <div class="grid grid-cols-2 gap-3">
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                                <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Sharing Room (PKR)</label>
                                                <input type="number" id="rateSharing" min="1000" step="500" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                            </div>
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                                <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Quad Room - 4 Bed (PKR)</label>
                                                <input type="number" id="rateQuad" min="1000" step="500" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                            </div>
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                                <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Triple Room - 3 Bed (PKR)</label>
                                                <input type="number" id="rateTriple" min="1000" step="500" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                            </div>
                                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                                <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Double Room - 2 Bed (PKR)</label>
                                                <input type="number" id="rateDouble" min="1000" step="500" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                            </div>
                                        </div>

                                        <div class="border-t border-slate-100 pt-3">
                                            <span class="text-[10px] font-black uppercase text-[#0D8A9E] block mb-2">Duration & Hotel Add-On Rates (PKR)</span>
                                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">10 Nights Offset</label>
                                                    <input type="number" id="rateDur10" step="500" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#0B2D5B]">
                                                </div>
                                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">21 Nights Add-on</label>
                                                    <input type="number" id="rateDur21" step="500" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#0B2D5B]">
                                                </div>
                                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">28 Nights Add-on</label>
                                                    <input type="number" id="rateDur28" step="500" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#0B2D5B]">
                                                </div>
                                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">3-Star Hotel Add-on</label>
                                                    <input type="number" id="rateHotel3Star" step="500" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#0B2D5B]">
                                                </div>
                                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 sm:col-span-2">
                                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">5-Star Near Haram Add-on</label>
                                                    <input type="number" id="rateHotel5Star" step="500" required class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#0B2D5B]">
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Hidden synced primary deal inputs for unified save -->
                                        <input type="hidden" id="spotMonthLabel">
                                        <input type="hidden" id="spotTitle">
                                        <input type="hidden" id="spotStartingPrice">
                                        <input type="hidden" id="spotPriceUnit">
                                        <input type="hidden" id="spotDepartureDate">
                                        <input type="hidden" id="spotReturnDate">
                                        <input type="hidden" id="spotDuration">
                                        <input type="checkbox" id="srvRoundTrip" class="hidden" checked>
                                        <input type="checkbox" id="srvVisa" class="hidden" checked>
                                        <input type="checkbox" id="srvHotel" class="hidden" checked>
                                        <input type="checkbox" id="srvTransport" class="hidden" checked>
                                    </div>

                                    <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                        <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                        <span>Save Rates</span>
                                    </button>
                                </div>

                                <!-- Right Column: Calculator Page Text & Included Bullets -->
                                <div class="lg:col-span-6 bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 flex flex-col justify-between space-y-5">
                                    <div class="space-y-4">
                                        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Estimator Page Content</span>
                                                <h3 class="text-lg font-black text-[#0B2D5B]">Package Estimator Banner &amp; Inclusions</h3>
                                            </div>
                                            <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">Umrah Page</span>
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Estimator Hero Badge</label>
                                            <input type="text" id="calcHeroBadgeInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Estimator Hero Heading</label>
                                            <input type="text" id="calcHeroTitleInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Estimator Hero Subtitle</label>
                                            <textarea id="calcHeroSubtitleInput" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">What's Included in Every Estimate (one per line)</label>
                                            <textarea id="calcIncludedBulletsInput" rows="4" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                        </div>
                                    </div>

                                    <button type="submit" class="w-full bg-[#0D8A9E] hover:bg-[#096979] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                        <i class="fa-solid fa-circle-check"></i>
                                        <span>Save Estimator Content</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- ========================================================== -->
                        <!-- TAB 3: VISAS & FLIGHTS PAGE (CRUD + PAGE CONTENT)          -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-visas" class="admin-tab-panel hidden space-y-6 anim-fade-up">

                            <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-card">
                                <div>
                                    <span class="text-[10px] font-black uppercase tracking-wider text-[#0D8A9E]">Visa Page Content</span>
                                    <h3 class="text-xl font-black text-[#0B2D5B]">Country Visa Cards</h3>
                                    <p class="text-xs text-slate-500">Add, edit, reorder, or hide Country Visa destinations and starting fees.</p>
                                </div>
                                <button type="button" data-action="open-visa-modal" class="bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition-all">
                                    <i class="fa-solid fa-plus"></i> Add Country Visa
                                </button>
                            </div>

                            <!-- Country Visas List -->
                            <div id="crudVisasContainer" class="grid md:grid-cols-2 gap-4"></div>

                            <!-- Visas & Flights Page Content Editor -->
                            <form id="visaPageContentForm" class="bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 space-y-5">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Visas, Flights & 3-Step Process Editor</span>
                                        <h3 class="text-lg font-black text-[#0B2D5B]">Manage Visas & Air Tickets Page Content</h3>
                                    </div>
                                    <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">Visa Page</span>
                                </div>

                                <div class="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Page Hero Top Badge</label>
                                        <input type="text" id="visaHeroBadgeInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Page Hero Main Heading</label>
                                        <input type="text" id="visaHeroTitleInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div class="sm:col-span-2">
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Page Hero Subtitle</label>
                                        <textarea id="visaHeroSubtitleInput" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                    </div>
                                </div>

                                <div class="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Flights Section Heading</label>
                                        <input type="text" id="visaFlightHeadingInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mt-3 mb-1">Flights Description</label>
                                        <textarea id="visaFlightDescInput" rows="3" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Flight Highlights (1 per line)</label>
                                        <textarea id="visaFlightBulletsInput" rows="3" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mt-3 mb-1">Partner Airlines (Comma Separated)</label>
                                        <input type="text" id="visaPartnerAirlinesInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                </div>

                                <div class="grid md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                        <span class="text-[10px] font-black uppercase text-[#0D8A9E]">Visa Step 1</span>
                                        <input type="text" id="visaStep1TitleInput" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                        <textarea id="visaStep1DescInput" rows="3" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-600"></textarea>
                                    </div>
                                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                        <span class="text-[10px] font-black uppercase text-[#0D8A9E]">Visa Step 2</span>
                                        <input type="text" id="visaStep2TitleInput" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                        <textarea id="visaStep2DescInput" rows="3" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-600"></textarea>
                                    </div>
                                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                        <span class="text-[10px] font-black uppercase text-[#0D8A9E]">Visa Step 3</span>
                                        <input type="text" id="visaStep3TitleInput" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                        <textarea id="visaStep3DescInput" rows="3" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-600"></textarea>
                                    </div>
                                </div>

                                <button type="submit" class="w-full sm:w-auto bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                    <span>Save Visas & Flights Page Content</span>
                                </button>
                            </form>
                        </div>

                        <!-- ========================================================== -->
                        <!-- TAB 4: WORK PERMIT PAGE (CRUD + PAGE CONTENT)              -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-workpermit" class="admin-tab-panel hidden space-y-6 anim-fade-up">

                            <!-- Manage Featured Work Permit Programmes & Offers Showcase -->
                            <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-card">
                                <div class="max-w-xl">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="bg-[#E6F6F8] text-[#0D8A9E] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                                            Work Permit Programmes
                                        </span>
                                        <span class="text-xs font-bold text-[#0D8A9E]"><i class="fa-solid fa-circle text-[6px] mr-1"></i>Shown on Work Permit Page Showcase</span>
                                    </div>
                                    <h3 class="text-xl font-black text-[#0B2D5B] mt-1">Manage Featured Work Permit Programmes &amp; Offers</h3>
                                    <p class="text-xs text-slate-500 mt-0.5">
                                        Add multiple featured programme showcases (for example Poland Type-A Permit, Romania Work Permit, or Hungary). Each programme appears as its own dual-city showcase card on the Work Permit page.
                                    </p>
                                </div>

                                <div class="flex flex-wrap items-center gap-2.5 shrink-0">
                                    <button type="button" data-action="open-wp-programme-modal" class="bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                        <i class="fa-solid fa-plus"></i>
                                        <span>Add Featured Programme</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Featured Work Permit Programmes Visual CRUD Grid -->
                            <div id="crudWorkPermitProgrammesContainer" class="grid grid-cols-1 lg:grid-cols-2 gap-6"></div>

                            <!-- Europe Work Permit Destinations Header & Grid -->
                            <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-card">
                                <div>
                                    <span class="text-[10px] font-black uppercase tracking-wider text-[#0D8A9E]">Work Permit Page Content</span>
                                    <h3 class="text-xl font-black text-[#0B2D5B]">Europe Work Permit Destinations</h3>
                                    <p class="text-xs text-slate-500">Add, edit, reorder, or hide work permit country cards and edit page text.</p>
                                </div>
                                <button type="button" data-action="open-workpermit-modal" class="bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition-all">
                                    <i class="fa-solid fa-plus"></i> Add Work Permit Country
                                </button>
                            </div>

                            <div id="crudWorkPermitsContainer" class="grid md:grid-cols-2 gap-4"></div>

                            <form id="workPermitPageContentForm" class="bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 space-y-5">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Work Permit Page Content</span>
                                        <h3 class="text-lg font-black text-[#0B2D5B]">Hero, Section Headings &amp; Assessment Copy</h3>
                                    </div>
                                    <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">Work Permit Page</span>
                                </div>

                                <div class="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Hero Top Badge</label>
                                        <input type="text" id="wpHeroBadgeInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Hero Main Heading</label>
                                        <input type="text" id="wpHeroTitleInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div class="sm:col-span-2">
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Hero Script Line</label>
                                        <input type="text" id="wpHeroScriptInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div class="sm:col-span-2">
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Hero Subtitle</label>
                                        <textarea id="wpHeroSubtitleInput" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                    </div>
                                </div>

                                <div class="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Featured Script Line</label>
                                        <input type="text" id="wpFeaturedScriptInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Featured Description</label>
                                        <input type="text" id="wpFeaturedDescInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Destinations Heading</label>
                                        <input type="text" id="wpDestinationsHeadingInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Destinations Description</label>
                                        <textarea id="wpDestinationsDescInput" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                    </div>
                                </div>

                                <div class="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Benefits Heading</label>
                                        <input type="text" id="wpBenefitsHeadingInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Process Heading</label>
                                        <input type="text" id="wpProcessHeadingInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Checklist Heading</label>
                                        <input type="text" id="wpChecklistHeadingInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Checklist Description</label>
                                        <textarea id="wpChecklistDescInput" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Assessment Form Heading</label>
                                        <input type="text" id="wpAssessmentHeadingInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">FAQ Heading</label>
                                        <input type="text" id="wpFaqHeadingInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                </div>

                                <button type="submit" class="w-full sm:w-auto bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                    <span>Save Work Permit Page Content</span>
                                </button>
                            </form>
                        </div>

                        <!-- ========================================================== -->
                        <!-- TAB 5: CONTACT & OFFICE PAGE (ROUTING, DETAILS & MAP)      -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-contacts" class="admin-tab-panel hidden space-y-6 anim-fade-up">
                            <form id="contactsForm" class="grid lg:grid-cols-12 gap-6">
                                
                                <!-- Left Column: Active WhatsApp Lead Routing + Staff Numbers + Contact Page Banner -->
                                <div class="lg:col-span-7 bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 space-y-5">
                                    <div class="border-b border-slate-100 pb-4">
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Booking Enquiries</span>
                                        <h3 class="text-lg font-black text-[#0B2D5B]">Active WhatsApp Booking Routing</h3>
                                        <p class="text-xs text-slate-500 mt-0.5">Choose which team member receives booking enquiries from across the website.</p>
                                    </div>

                                    <div>
                                        <label class="block text-xs font-bold uppercase text-slate-600 mb-2">Route Website Booking Inquiries To:</label>
                                        <select id="contactActiveRouting" class="w-full bg-[#E6F6F8] border-2 border-[#0D8A9E] rounded-2xl px-4 py-3.5 text-sm font-black text-[#0B2D5B] focus:outline-none">
                                            <option value="manager">Primary Contact (Inam Khan)</option>
                                            <option value="secondary">Secondary Contact (Sadiq Ullah)</option>
                                        </select>
                                    </div>

                                    <!-- Primary Contact: Inam Khan -->
                                    <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                                        <div class="text-xs font-black uppercase text-[#0B2D5B] flex items-center justify-between">
                                            <span><i class="fa-solid fa-user-tie text-[#0D8A9E] mr-1.5"></i>Primary Contact (Manager)</span>
                                            <span id="badgeRoutingManager" class="hidden bg-[#0D8A9E] text-white text-[10px] px-2.5 py-0.5 rounded-full">Active</span>
                                        </div>
                                        <div class="grid sm:grid-cols-3 gap-3">
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-1">Display Name</label>
                                                <input type="text" id="contactManagerName" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-1">Display Phone</label>
                                                <input type="text" id="contactManagerPhone" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-1">WhatsApp (923...)</label>
                                                <input type="text" id="contactManagerWA" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0D8A9E]">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Secondary Contact: Sadiq Ullah -->
                                    <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                                        <div class="text-xs font-black uppercase text-[#0B2D5B] flex items-center justify-between">
                                            <span><i class="fa-solid fa-headset text-[#0D8A9E] mr-1.5"></i>Secondary Contact (Consultant)</span>
                                            <span id="badgeRoutingSecondary" class="hidden bg-[#0D8A9E] text-white text-[10px] px-2.5 py-0.5 rounded-full">Active</span>
                                        </div>
                                        <div class="grid sm:grid-cols-3 gap-3">
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-1">Display Name</label>
                                                <input type="text" id="contactSecondaryName" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-1">Display Phone</label>
                                                <input type="text" id="contactSecondaryPhone" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-500 mb-1">WhatsApp (923...)</label>
                                                <input type="text" id="contactSecondaryWA" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0D8A9E]">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Contact Page Hero Banner Fields -->
                                    <div class="border-t border-slate-100 pt-4 space-y-3">
                                        <span class="text-[10px] font-black uppercase text-[#0D8A9E] block">About &amp; Contact Page Hero Text</span>
                                        <div class="grid sm:grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Hero Badge</label>
                                                <input type="text" id="contactHeroBadgeInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                            </div>
                                            <div>
                                                <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Hero Heading</label>
                                                <input type="text" id="contactHeroTitleInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                            </div>
                                            <div class="sm:col-span-2">
                                                <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Hero Subtitle</label>
                                                <textarea id="contactHeroSubtitleInput" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- About Us: Team Member Photos -->
                                    <div class="border-t border-slate-100 pt-4 space-y-3">
                                        <div class="flex items-center justify-between">
                                            <span class="text-[10px] font-black uppercase text-[#0D8A9E] block"><i class="fa-solid fa-users mr-1"></i>About Us - Team Member Photos</span>
                                            <span class="text-[10px] font-bold text-slate-400">Upload, adjust if needed, then click Save Changes</span>
                                        </div>
                                        <div id="teamPhotosAdminGrid" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            ${TEAM_MEMBERS.map((m) => `
                                            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col items-center text-center gap-2">
                                                <div class="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#0B2D5B] to-[#0D8A9E] flex items-center justify-center text-white font-black text-sm">
                                                    <span id="teamPhotoInitials-${m.id}">${m.initials}</span>
                                                    <img id="teamPhotoPreview-${m.id}" alt="${m.name}" class="hidden absolute inset-0 w-full h-full object-cover">
                                                </div>
                                                <div class="leading-tight">
                                                    <div class="text-xs font-black text-[#0B2D5B]">${m.name}</div>
                                                    <div class="text-[10px] font-bold text-[#0D8A9E]">${m.role}</div>
                                                </div>
                                                <input type="hidden" id="teamPhotoUrl-${m.id}" data-team-photo-key="${m.id}">
                                                <div class="flex flex-wrap items-center justify-center gap-1.5">
                                                    <label class="cursor-pointer bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                                                        <i class="fa-solid fa-upload mr-1"></i>Upload
                                                        <input type="file" accept="image/*" class="hidden" data-team-photo-upload="${m.id}">
                                                    </label>
                                                    <button type="button" data-team-photo-adjust="${m.id}" class="hidden bg-[#0D8A9E]/10 hover:bg-[#0D8A9E] text-[#0D8A9E] hover:text-white text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors" title="Adjust photo">
                                                        <i class="fa-solid fa-crop mr-1"></i>Adjust
                                                    </button>
                                                    <button type="button" data-team-photo-remove="${m.id}" class="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors" title="Remove photo">
                                                        <i class="fa-solid fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>`).join("")}
                                        </div>
                                    </div>
                                </div>

                                <!-- Right Column: Agency Branding, Office Address, Hours, Email, Map & Safety Reset -->
                                <div class="lg:col-span-5 space-y-6">
                                    <div class="bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 space-y-3.5">
                                        <h3 class="text-lg font-black text-[#0B2D5B]">Agency Details, Office Hours & Map</h3>
                                        <div>
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Agency Name</label>
                                            <input type="text" id="contactAgencyName" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B]">
                                        </div>
                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Primary Tagline</label>
                                                <input type="text" id="contactTagline1" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                            </div>
                                            <div>
                                                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Secondary Tagline</label>
                                                <input type="text" id="contactTagline2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Swat Head Office Address (Central Headquarters)</label>
                                            <textarea id="contactOfficeAddress" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#0B2D5B]"></textarea>
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Office Hours</label>
                                            <input type="text" id="contactOfficeHours" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#0B2D5B]">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Official Email(s)</label>
                                            <input type="text" id="contactOfficeEmail" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#0B2D5B]">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Google Maps Link</label>
                                            <input type="text" id="contactMapEmbedUrl" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-[11px] text-slate-600">
                                        </div>
                                        <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                            <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                            <span>Save Contact Page</span>
                                        </button>
                                    </div>

                                    <!-- Reset Website Content Card -->
                                    <div class="bg-white rounded-3xl p-6 shadow-card border border-slate-200 space-y-4">
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <span class="text-[10px] font-extrabold uppercase text-[#0D8A9E] bg-[#E6F6F8] px-2.5 py-1 rounded-full">Content Recovery</span>
                                                <h4 class="text-sm font-black text-[#0B2D5B] mt-1">Reset Website Content</h4>
                                            </div>
                                            <i class="fa-solid fa-rotate-left text-xl text-[#0D8A9E]"></i>
                                        </div>
                                        <p class="text-xs text-slate-500">
                                            Restore all offers, prices, dates, packages, visas, page text, and contact details back to the original <strong>January Flyer Defaults (PKR 232,000)</strong>.
                                        </p>
                                        <button type="button" data-action="reset-flyer-defaults" class="w-full bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm">
                                            <i class="fa-solid fa-rotate-left"></i>
                                            <span>Restore Original Content</span>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <!-- ========================================================== -->
                        <!-- TAB 6: ENQUIRIES / LEADS INBOX                             -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-enquiries" class="admin-tab-panel hidden space-y-6 anim-fade-up">
                            <div class="bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 space-y-5">
                                <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                    <div>
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Lead Capture</span>
                                        <h3 class="text-lg font-black text-[#0B2D5B]">Enquiries Inbox</h3>
                                        <p class="text-xs text-slate-500 mt-0.5">Every website form saves here first, then opens WhatsApp — so a lead is never lost if the visitor closes the chat. Newest first.</p>
                                    </div>
                                    <button type="button" data-action="enquiry-export" class="bg-[#E6F6F8] hover:bg-[#D7F0F4] border border-[#0D8A9E]/20 text-[#0B2D5B] text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all">
                                        <i class="fa-solid fa-file-csv text-[#0D8A9E]"></i>
                                        <span>Export CSV</span>
                                    </button>
                                </div>

                                <div class="flex flex-wrap items-center gap-2">
                                    <button type="button" data-action="enquiry-filter" data-filter="all" class="enquiry-filter-btn bg-[#0B2D5B] text-white text-xs font-bold px-3.5 py-2 rounded-full">All</button>
                                    <button type="button" data-action="enquiry-filter" data-filter="new" class="enquiry-filter-btn bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-full">New</button>
                                    <button type="button" data-action="enquiry-filter" data-filter="contacted" class="enquiry-filter-btn bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-full">Contacted</button>
                                    <button type="button" data-action="enquiry-filter" data-filter="booked" class="enquiry-filter-btn bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-full">Booked</button>
                                    <button type="button" data-action="enquiry-filter" data-filter="closed" class="enquiry-filter-btn bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-full">Closed</button>
                                    <input type="search" id="enquirySearchInput" placeholder="Search name, phone or service…" class="flex-1 min-w-[180px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#0D8A9E]">
                                </div>

                                <div id="enquiriesListContainer" class="space-y-3">
                                    <div class="bg-slate-50 rounded-2xl p-8 text-center text-slate-500 text-sm">No enquiries yet. New form submissions will appear here.</div>
                                </div>
                            </div>
                        </div>

                        <!-- ========================================================== -->
                        <!-- TAB 7: ADMIN ACCESS (OWNER ONLY)                           -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-access" class="admin-tab-panel hidden space-y-6 anim-fade-up">
                            <div class="bg-white rounded-3xl p-6 shadow-card border border-slate-200/80 space-y-5">
                                <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                    <div>
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Admin Access</span>
                                        <h3 class="text-lg font-black text-[#0B2D5B]">Who can open the admin portal</h3>
                                        <p class="text-xs text-slate-500 mt-0.5">Local test mode: there is only one admin here — the passphrase on this browser. Adding other admins is not available until the site has a real backend.</p>
                                    </div>
                                    <span class="bg-[#FEF3C7] text-[#8A6D0B] text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Owner only</span>
                                </div>

                                <div id="accessRulesNote" class="hidden text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3"></div>

                                <div id="accessAdminList" class="space-y-2">
                                    <div class="bg-slate-50 rounded-2xl p-6 text-center text-slate-500 text-sm">Loading the admin list…</div>
                                </div>

                                <form id="accessAddForm" class="space-y-3 border-t border-slate-100 pt-4">
                                    <div class="flex flex-wrap gap-4 text-xs font-bold text-slate-600">
                                        <label class="flex items-center gap-1.5 cursor-pointer">
                                            <input type="radio" name="accessAddMode" value="existing" checked class="accent-[#0D8A9E]">
                                            Add an existing account
                                        </label>
                                        <label class="flex items-center gap-1.5 cursor-pointer">
                                            <input type="radio" name="accessAddMode" value="create" class="accent-[#0D8A9E]">
                                            Create a new account
                                        </label>
                                    </div>
                                    <div class="grid sm:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Email address</label>
                                            <input type="email" id="accessAddEmail" required placeholder="person@example.com" autocomplete="off" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0D8A9E]">
                                        </div>
                                        <div id="accessTempPassWrap" class="hidden">
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Temporary password</label>
                                            <input type="password" id="accessAddTempPass" placeholder="At least 8 characters" autocomplete="new-password" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0D8A9E]">
                                        </div>
                                    </div>
                                    <button type="submit" class="bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg transition-all">
                                        <span id="accessAddBtnLabel">Add admin</span>
                                    </button>
                                    <p class="text-[11px] text-slate-400 leading-relaxed">Removing someone only stops them opening the admin — their sign-in account stays and is not deleted. For a new account, share the temporary password with them yourself; there is no password-change screen in the portal yet.</p>
                                </form>
                            </div>
                        </div>

                    </main>
                </div>

                <!-- ============================================================== -->
                <!-- MODAL: ADD / EDIT SPECIAL FLYER DEAL (FULL CRUD)               -->
                <!-- ============================================================== -->
                <div id="dealCrudModal" class="fixed inset-0 z-[85] hidden bg-[#05162E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto anim-scale-in">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                            <div>
                                <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#0D8A9E]">Flyer Showcase Offer</span>
                                <h3 id="dealModalTitle" class="text-xl font-black text-[#0B2D5B]">Add / Edit Special Flyer Deal</h3>
                            </div>
                            <button type="button" data-action="close-deal-modal" class="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <form id="dealCrudForm" class="space-y-4">
                            <input type="hidden" id="dealEditId">
                            <div class="grid sm:grid-cols-3 gap-3.5">
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Month / Season Script</label>
                                    <input type="text" id="dealEditMonth" required placeholder="e.g. Ramzan Special" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0D8A9E]">
                                </div>
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Main Deal Heading</label>
                                    <input type="text" id="dealEditTitle" required placeholder="e.g. UMRAH PACKAGE" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-[#0B2D5B]">
                                </div>

                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Starting Price (PKR)</label>
                                    <input type="number" id="dealEditPrice" min="1000" step="500" required placeholder="232000" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-[#0D8A9E]">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Price Unit Label</label>
                                    <input type="text" id="dealEditUnit" required placeholder="PER PERSON (SHARING)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Shield Badge Tag</label>
                                    <input type="text" id="dealEditBadgeTag" required placeholder="All-Inclusive Deal" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold">
                                </div>

                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Departure Date</label>
                                    <input type="text" id="dealEditDep" required placeholder="Jan 26, 2026" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B]">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Duration (Center)</label>
                                    <input type="text" id="dealEditDuration" required placeholder="14 Nights" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B]">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Return / Schedule (Right)</label>
                                    <input type="text" id="dealEditRet" required placeholder="Feb 09, 2026" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B]">
                                </div>
                            </div>

                            <!-- Left & Right Frame + Hotel Name Customization -->
                            <div class="grid sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <div class="space-y-2">
                                    <span class="text-[10px] font-black uppercase text-[#0D8A9E]">Left Frame &amp; Hotel (Madinah / Destination 1)</span>
                                    <input type="text" id="dealEditLeftTitle" required placeholder="Madinah Munawwarah" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                    <input type="text" id="dealEditLeftBadge" required placeholder="Ziyarat & Stay" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                    <input type="text" id="dealEditMadinahHotel" required placeholder="Madinah Hotel Name (e.g. Al Eiman Taibah / Similar)" class="w-full bg-[#F0FAFC] border border-[#0D8A9E]/40 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                    <div class="flex gap-2">
                                        <input type="text" id="dealEditMadinahUrl" required placeholder="Left Image Link" class="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                        <label class="bg-[#0D8A9E] hover:bg-[#096979] text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1 shrink-0">
                                            <i class="fa-solid fa-upload"></i>
                                            <input type="file" accept="image/*" data-deal-upload="dealEditMadinahUrl" class="hidden">
                                        </label>
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <span class="text-[10px] font-black uppercase text-[#0B2D5B]">Right Frame &amp; Hotel (Makkah / Destination 2)</span>
                                    <input type="text" id="dealEditRightTitle" required placeholder="Makkah Mukarramah" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                    <input type="text" id="dealEditRightBadge" required placeholder="Haram View Options" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                    <input type="text" id="dealEditMakkahHotel" required placeholder="Makkah Hotel Name (e.g. Emaar Al Khalil / Similar)" class="w-full bg-[#F3F6FB] border border-[#0B2D5B]/30 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                    <div class="flex gap-2">
                                        <input type="text" id="dealEditMakkahUrl" required placeholder="Right Image Link" class="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                        <label class="bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1 shrink-0">
                                            <i class="fa-solid fa-upload"></i>
                                            <input type="file" accept="image/*" data-deal-upload="dealEditMakkahUrl" class="hidden">
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- Included Services Checkboxes -->
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 mb-2">Included Services on Deal Card</label>
                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <label class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 cursor-pointer">
                                        <input type="checkbox" id="dealSrvRoundTrip" checked class="w-4 h-4 accent-[#0D8A9E]">
                                        <span class="text-xs font-bold text-[#0B2D5B]">Round Trip</span>
                                    </label>
                                    <label class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 cursor-pointer">
                                        <input type="checkbox" id="dealSrvVisa" checked class="w-4 h-4 accent-[#0D8A9E]">
                                        <span class="text-xs font-bold text-[#0B2D5B]">Umrah Visa</span>
                                    </label>
                                    <label class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 cursor-pointer">
                                        <input type="checkbox" id="dealSrvHotel" checked class="w-4 h-4 accent-[#0D8A9E]">
                                        <span class="text-xs font-bold text-[#0B2D5B]">Hotel Stay</span>
                                    </label>
                                    <label class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 cursor-pointer">
                                        <input type="checkbox" id="dealSrvTransport" checked class="w-4 h-4 accent-[#0D8A9E]">
                                        <span class="text-xs font-bold text-[#0B2D5B]">Transport</span>
                                    </label>
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center gap-6 pt-2">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="dealEditActive" checked class="w-4 h-4 accent-[#0D8A9E]">
                                    <span class="text-xs font-bold text-[#0B2D5B]">Active (Show on Website)</span>
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="dealEditPrimary" class="w-4 h-4 accent-[#D4AF37]">
                                    <span class="text-xs font-bold text-[#0B2D5B]">Set as Primary Deal (updates main price & estimator)</span>
                                </label>
                            </div>

                            <div class="flex gap-3 pt-2">
                                <button type="button" data-action="close-deal-modal" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl text-xs">
                                    Cancel
                                </button>
                                <button type="submit" class="flex-1 bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black py-3.5 px-6 rounded-xl shadow-lg text-sm flex items-center justify-center gap-2">
                                    <i class="fa-solid fa-circle-check"></i>
                                    <span>Save Special Deal</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- MODAL: ADD / EDIT UMRAH PACKAGE                                -->
                <!-- ============================================================== -->
                <div id="pkgCrudModal" class="fixed inset-0 z-[85] hidden bg-[#05162E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto anim-scale-in">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 id="pkgModalTitle" class="text-lg font-black text-[#0B2D5B]">Add / Edit Umrah Package</h3>
                            <button type="button" data-action="close-pkg-modal" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form id="pkgCrudForm" class="space-y-3.5">
                            <input type="hidden" id="pkgEditId">
                            <div class="grid sm:grid-cols-2 gap-3">
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Package Title</label>
                                    <input type="text" id="pkgEditTitle" required placeholder="e.g. Ramzan Full Month Umrah" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B]">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Badge Text</label>
                                    <input type="text" id="pkgEditBadge" required placeholder="e.g. Most Popular" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Price (PKR)</label>
                                    <input type="number" id="pkgEditPrice" min="1000" step="500" required placeholder="232000" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-[#0D8A9E]">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Room Type</label>
                                    <input type="text" id="pkgEditRoom" required placeholder="Sharing (Quad)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Duration</label>
                                    <input type="text" id="pkgEditDuration" required placeholder="14 Nights / 15 Days" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Departure Date</label>
                                    <input type="text" id="pkgEditDep" required placeholder="Jan 26, 2026" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Return Date</label>
                                    <input type="text" id="pkgEditRet" required placeholder="Feb 09, 2026" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Makkah Hotel Distance</label>
                                    <input type="text" id="pkgEditMakkahDist" required placeholder="350m Walking Distance" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Madinah Hotel Distance</label>
                                    <input type="text" id="pkgEditMadinahDist" required placeholder="250m Near Masjid Nabawi" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Services (Comma Separated)</label>
                                    <input type="text" id="pkgEditServices" required placeholder="Return Air Ticket, Umrah Visa, Hotel Stay, Transport" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                            </div>
                            <div class="flex items-center gap-6 pt-2">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="pkgEditActive" checked class="w-4 h-4 accent-[#0D8A9E]">
                                    <span class="text-xs font-bold text-[#0B2D5B]">Active (Visible on Website)</span>
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="pkgEditFeatured" class="w-4 h-4 accent-[#0B2D5B]">
                                    <span class="text-xs font-bold text-[#0B2D5B]">Featured Highlight</span>
                                </label>
                            </div>
                            <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white font-extrabold py-3.5 rounded-xl shadow-lg mt-2">
                                Save Umrah Package
                            </button>
                        </form>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- MODAL: ADD / EDIT COUNTRY VISA SERVICE                         -->
                <!-- ============================================================== -->
                <div id="visaCrudModal" class="fixed inset-0 z-[85] hidden bg-[#05162E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto anim-scale-in">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 id="visaModalTitle" class="text-lg font-black text-[#0B2D5B]">Add / Edit Country Visa</h3>
                            <button type="button" data-action="close-visa-modal" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form id="visaCrudForm" class="space-y-3.5">
                            <input type="hidden" id="visaEditId">
                            <div class="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Country Name</label>
                                    <input type="text" id="visaEditCountry" required placeholder="Saudi Arabia" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B]">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Flag Emoji / Code</label>
                                    <input type="text" id="visaEditFlag" placeholder="e.g. 🇸🇦" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Flag Image</label>
                                    <input type="hidden" id="visaEditFlagUrl">
                                    <div class="flex flex-wrap items-center gap-3">
                                        <img id="visaEditFlagPreview" alt="Flag preview" class="hidden w-11 h-8 object-cover rounded-md shadow-sm ring-1 ring-slate-200">
                                        <button type="button" data-visa-flag-upload class="px-3.5 py-2.5 bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2">
                                            <i class="fa-solid fa-cloud-arrow-up"></i> Upload Flag
                                        </button>
                                        <button type="button" data-visa-flag-remove class="px-3 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white text-xs font-bold rounded-xl transition-colors" title="Remove flag image">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                        <span class="text-[11px] text-slate-400 font-semibold">Optional — if no image is uploaded, the code/emoji above is used.</span>
                                    </div>
                                    <input type="file" accept="image/*" class="hidden" data-visa-flag-file>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Visa Type</label>
                                    <input type="text" id="visaEditType" required placeholder="Tourist / E-Visa" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Processing Time</label>
                                    <input type="text" id="visaEditTime" required placeholder="3-5 Working Days" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Starting Fee (PKR)</label>
                                    <input type="number" id="visaEditPrice" min="0" step="500" required placeholder="34500" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-[#0D8A9E]">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Image Link (Optional)</label>
                                    <input type="text" id="visaEditImage" placeholder="https://..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Requirements Summary</label>
                                    <textarea id="visaEditReqs" rows="2" required placeholder="Passport Scan, CNIC Copy, White Background Photo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm"></textarea>
                                </div>
                            </div>
                            <label class="flex items-center gap-2 pt-1 cursor-pointer">
                                <input type="checkbox" id="visaEditActive" checked class="w-4 h-4 accent-[#0D8A9E]">
                                <span class="text-xs font-bold text-[#0B2D5B]">Active (Visible on Website)</span>
                            </label>
                            <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white font-extrabold py-3.5 rounded-xl shadow-lg mt-2">
                                Save Country Visa
                            </button>
                        </form>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- MODAL: ADD / EDIT WORK PERMIT COUNTRY                         -->
                <!-- ============================================================== -->
                <div id="workPermitCrudModal" class="fixed inset-0 z-[85] hidden bg-[#05162E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto anim-scale-in">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 id="workPermitModalTitle" class="text-lg font-black text-[#0B2D5B]">Add / Edit Work Permit Country</h3>
                            <button type="button" data-action="close-workpermit-modal" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form id="workPermitCrudForm" class="space-y-3.5">
                            <input type="hidden" id="wpEditId">
                            <div class="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Country Name</label>
                                    <input type="text" id="wpEditCountry" required placeholder="Poland" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B]">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Card Title</label>
                                    <input type="text" id="wpEditTitle" placeholder="Poland Work Permit" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B]">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Flag CSS Class</label>
                                    <input type="text" id="wpEditFlag" placeholder="flag-pl" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Country Flag Image</label>
                                    <input type="hidden" id="wpEditFlagUrl">
                                    <div class="flex flex-wrap items-center gap-3">
                                        <img id="wpEditFlagPreview" alt="Flag preview" class="hidden w-11 h-8 object-cover rounded-md shadow-sm ring-1 ring-slate-200">
                                        <button type="button" data-wp-flag-upload class="px-3.5 py-2.5 bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2">
                                            <i class="fa-solid fa-cloud-arrow-up"></i> Upload Flag
                                        </button>
                                        <button type="button" data-wp-flag-remove class="px-3 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white text-xs font-bold rounded-xl transition-colors" title="Remove flag image">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                        <span class="text-[11px] text-slate-400 font-semibold">Optional — if no image is uploaded, the CSS flag above is used.</span>
                                    </div>
                                    <input type="file" accept="image/*" class="hidden" data-wp-flag-file>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Status Tag Text</label>
                                    <input type="text" id="wpEditTag" placeholder="Applications Open" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Status Tag Colour</label>
                                    <select id="wpEditTagStyle" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B]">
                                        <option value="emerald">Emerald</option>
                                        <option value="sky">Sky</option>
                                        <option value="amber">Amber</option>
                                        <option value="rose">Rose</option>
                                        <option value="indigo">Indigo</option>
                                        <option value="slate">Slate</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Processing Timeline</label>
                                    <input type="text" id="wpEditTimeline" placeholder="3-6 Months" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Permit Type</label>
                                    <input type="text" id="wpEditPermitType" placeholder="Type-A Work Permit" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Visa Code / Pill</label>
                                    <input type="text" id="wpEditVisaCode" placeholder="D-Visa" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Contract</label>
                                    <input type="text" id="wpEditContract" placeholder="1-3 Years, Renewable" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Residence</label>
                                    <input type="text" id="wpEditResidence" placeholder="Karta Pobytu (TRC)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Sectors</label>
                                    <input type="text" id="wpEditSectors" placeholder="Logistics, Factory, Construction" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                                </div>
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Checklist Ticks (one per line)</label>
                                    <textarea id="wpEditTicks" rows="3" placeholder="Schengen Access&#10;EU Labour Rights&#10;Social Security (ZUS)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm"></textarea>
                                </div>
                            </div>
                            <div class="flex items-center gap-6 pt-1">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="wpEditActive" checked class="w-4 h-4 accent-[#0D8A9E]">
                                    <span class="text-xs font-bold text-[#0B2D5B]">Active (Visible on Website)</span>
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="wpEditFeatured" class="w-4 h-4 accent-[#0B2D5B]">
                                    <span class="text-xs font-bold text-[#0B2D5B]">Featured Programme</span>
                                </label>
                            </div>
                            <p class="text-[10px] font-semibold text-slate-400">You can feature multiple programmes. Featured cards get a highlighted badge on the website.</p>
                            <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white font-extrabold py-3.5 rounded-xl shadow-lg mt-2">
                                Save Work Permit Country
                            </button>
                        </form>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- MODAL: ADD / EDIT FEATURED WORK PERMIT PROGRAMME (SHOWCASE)   -->
                <!-- ============================================================== -->
                <div id="wpProgrammeCrudModal" class="fixed inset-0 z-[85] hidden bg-[#05162E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto anim-scale-in">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                            <div>
                                <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#0D8A9E]">Showcase Programme Offer</span>
                                <h3 id="wpProgModalTitle" class="text-xl font-black text-[#0B2D5B]">Add / Edit Featured Work Permit Programme</h3>
                            </div>
                            <button type="button" data-action="close-wp-programme-modal" class="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <form id="wpProgrammeCrudForm" class="space-y-4">
                            <input type="hidden" id="wpProgEditId">

                            <!-- Section 1: Country & Ribbon Header -->
                            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                                <span class="text-xs font-black uppercase text-[#0B2D5B] block">1. Country &amp; Top Ribbon Header</span>
                                <div class="grid sm:grid-cols-4 gap-3">
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Country Name</label>
                                        <input type="text" id="wpProgEditCountry" required placeholder="Poland" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Flag Class</label>
                                        <input type="text" id="wpProgEditFlag" placeholder="flag-pl" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Status Text</label>
                                        <input type="text" id="wpProgEditStatus" placeholder="Open" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-600">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Region Text</label>
                                        <input type="text" id="wpProgEditRegion" placeholder="EU & Schengen" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                    </div>
                                </div>
                            </div>

                            <!-- Section 2: Dual City Showcase Cards & Media -->
                            <div class="grid sm:grid-cols-2 gap-4">
                                <!-- Left City Card -->
                                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-black uppercase text-[#0D8A9E]">Left City Image Card</span>
                                        <span class="text-[10px] text-slate-400 font-semibold">e.g. Warsaw</span>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">City Title</label>
                                        <input type="text" id="wpProgEditLeftTitle" required placeholder="Warsaw" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Badge Text</label>
                                        <input type="text" id="wpProgEditLeftBadge" placeholder="Capital & Business Hub" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Image URL / Path</label>
                                        <div class="flex items-center gap-1.5">
                                            <input type="text" id="wpProgEditLeftUrl" required placeholder="./assets/warsaw-poland.jpg" class="w-full min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                            <div class="relative shrink-0">
                                                <input type="file" accept="image/*" class="hidden">
                                                <button type="button" data-wp-prog-image-target="wpProgEditLeftUrl" class="px-2.5 py-2 bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white text-[11px] font-bold rounded-xl whitespace-nowrap">
                                                    <i class="fa-solid fa-cloud-arrow-up mr-1"></i>Upload
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Right City Card -->
                                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-black uppercase text-[#0B2D5B]">Right City Image Card</span>
                                        <span class="text-[10px] text-slate-400 font-semibold">e.g. Wroc\u0142aw & Krak\u00f3w</span>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">City Title</label>
                                        <input type="text" id="wpProgEditRightTitle" required placeholder="Wroc\u0142aw & Krak\u00f3w" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Badge Text</label>
                                        <input type="text" id="wpProgEditRightBadge" placeholder="Industry & Logistics" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Image URL / Path</label>
                                        <div class="flex items-center gap-1.5">
                                            <input type="text" id="wpProgEditRightUrl" required placeholder="./assets/krakow-wroclaw-poland.jpg" class="w-full min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                            <div class="relative shrink-0">
                                                <input type="file" accept="image/*" class="hidden">
                                                <button type="button" data-wp-prog-image-target="wpProgEditRightUrl" class="px-2.5 py-2 bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white text-[11px] font-bold rounded-xl whitespace-nowrap">
                                                    <i class="fa-solid fa-cloud-arrow-up mr-1"></i>Upload
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Section 3: Center Shield Floating Badge -->
                            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                                <span class="text-xs font-black uppercase text-[#0B2D5B] block">3. Center Floating Shield Badge</span>
                                <div class="grid sm:grid-cols-4 gap-3">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Top Label</label>
                                        <input type="text" id="wpProgEditShieldLabel" placeholder="Work Permit" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Country Name (Bold)</label>
                                        <input type="text" id="wpProgEditShieldCountry" required placeholder="POLAND" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-[#0B2D5B] uppercase">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Permit Subtitle</label>
                                        <input type="text" id="wpProgEditShieldSub" placeholder="Type-A Permit + D-Visa" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Badge Status Pill</label>
                                        <input type="text" id="wpProgEditShieldStatus" placeholder="Applications Open" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                    </div>
                                </div>
                            </div>

                            <!-- Section 4: Permit & Visa Box Labels -->
                            <div class="grid sm:grid-cols-2 gap-4">
                                <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                                    <label class="block text-[11px] font-black uppercase text-[#0D8A9E]">Work Permit Box Description</label>
                                    <input type="text" id="wpProgEditPermitTypeLong" required placeholder="Voivodeship Type-A Permit (Zezwolenie na prac\u0119)" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                </div>
                                <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                                    <label class="block text-[11px] font-black uppercase text-[#0B2D5B]">Entry Visa Box Description</label>
                                    <input type="text" id="wpProgEditVisaTypeLong" required placeholder="National D-Type Work Visa (Schengen Valid)" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B2D5B]">
                                </div>
                            </div>

                            <!-- Section 5: Schedule Metrics -->
                            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                                <span class="text-xs font-black uppercase text-[#0B2D5B] block">5. Schedule Strip Metrics</span>
                                <div class="grid sm:grid-cols-3 gap-3">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Processing Time &amp; Note</label>
                                        <div class="grid grid-cols-2 gap-1.5">
                                            <input type="text" id="wpProgEditProcessing" placeholder="3\u20136 Months" class="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-[#0D8A9E]">
                                            <input type="text" id="wpProgEditProcessingNote" placeholder="Approx." class="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs">
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Contract Duration &amp; Note</label>
                                        <div class="grid grid-cols-2 gap-1.5">
                                            <input type="text" id="wpProgEditContract" placeholder="1\u20133 Years" class="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-[#0D8A9E]">
                                            <input type="text" id="wpProgEditContractNote" placeholder="Renewable" class="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs">
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Residence Path &amp; Note</label>
                                        <div class="grid grid-cols-2 gap-1.5">
                                            <input type="text" id="wpProgEditResidence" placeholder="Karta Pobytu" class="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-[#0D8A9E]">
                                            <input type="text" id="wpProgEditResidenceNote" placeholder="TRC" class="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Section 6: Popular Job Categories -->
                            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                                <label class="block text-xs font-black uppercase text-[#0B2D5B]">Popular Job Categories (separate by pipe | or comma)</label>
                                <textarea id="wpProgEditJobCategories" rows="2" placeholder="Warehouse & Logistics|Construction|Factory & Production|CE Drivers|Hospitality|Agriculture" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"></textarea>
                                <p class="text-[10px] text-slate-400">Displayed as interactive badges at the bottom of the featured showcase card.</p>
                            </div>

                            <!-- Active Visibility Checkbox -->
                            <div class="flex items-center gap-6 pt-1">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="wpProgEditActive" checked class="w-4 h-4 accent-[#0D8A9E]">
                                    <span class="text-xs font-bold text-[#0B2D5B]">Active (Visible in Showcase on Website)</span>
                                </label>
                            </div>

                            <button type="submit" class="w-full bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black py-3.5 rounded-2xl shadow-lg mt-2 text-sm transition-all">
                                Save Featured Programme
                            </button>
                        </form>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- MODAL: RESET TO FLYER DEFAULTS CONFIRMATION                    -->
                <!-- ============================================================== -->
                <div id="resetConfirmModal" class="fixed inset-0 z-[90] hidden bg-[#05162E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4 anim-scale-in">
                        <div class="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
                            <i class="fa-solid fa-rotate-left"></i>
                        </div>
                        <h3 class="text-xl font-black text-[#0B2D5B]">Reset to Original January Flyer Defaults?</h3>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            This will restore the Featured Umrah Price to <strong>PKR 232,000</strong>, dates to <strong>Jan 26 \u2013 Feb 09, 2026 (14 Nights)</strong>, and reset all offers, room rates, packages, visas, and contact details.
                        </p>
                        <div class="flex gap-3 pt-2">
                            <button type="button" data-action="cancel-reset-modal" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs">
                                Cancel
                            </button>
                            <button type="button" data-action="confirm-reset-defaults" class="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg">
                                Yes, Restore Defaults
                            </button>
                        </div>
                    </div>
                </div>

            `;
            // The header now contains the Activity unread badge — restore
            // its count from the persisted log after every re-render.
            this._refreshActivityBadge();
        }

        _updateTabCounters() {
            const dealBadge = this.container.querySelector("#tabBadgeDeals");
            if (dealBadge) dealBadge.textContent = String((this.specialDeals || []).length);

            const pkgBadge = this.container.querySelector("#tabBadgePkgs");
            if (pkgBadge) {
                pkgBadge.textContent = String((this.packages || []).length);
            }

            const visaBadge = this.container.querySelector("#tabBadgeVisas");
            if (visaBadge) {
                visaBadge.textContent = String((this.visas || []).length);
            }

            const workPermitBadge = this.container.querySelector("#tabBadgeWorkPermits");
            if (workPermitBadge) {
                const totalWP = (this.workPermits || []).length + (this.workPermitProgrammes || []).length;
                workPermitBadge.textContent = String(totalWP);
            }

            const enquiriesBadge = this.container.querySelector("#tabBadgeEnquiries");
            if (enquiriesBadge) {
                const newCount = (this.enquiries || []).filter((e) => e.status === "new").length;
                enquiriesBadge.textContent = String(newCount);
                enquiriesBadge.classList.toggle("hidden", newCount === 0);
            }
        }

        _updateAuthView() {
            const authView = this.container.querySelector("#adminAuthView");
            const dashView = this.container.querySelector("#adminDashboardView");
            const userLabel = this.container.querySelector("#adminActiveUserLabel");

            if (!authView || !dashView) return;

            if (this.currentUser) {
                authView.classList.add("hidden");
                dashView.classList.remove("hidden");
                if (userLabel) {
                    userLabel.textContent = `Signed in as ${this.currentUser.displayName || this.currentUser.email}`;
                }
                // Show the real connection mode here, never a "Live" claim.
                this._updateSyncBadge();
                this._updateAccessTabVisibility();
                this._autoGrowFields(dashView);
            } else {
                authView.classList.remove("hidden");
                dashView.classList.add("hidden");
            }
        }

        _syncRoutingSelectOptions() {
            const routingSelect = this.container.querySelector("#contactActiveRouting");
            if (!routingSelect) return;

            const mgrNameInput = this.container.querySelector("#contactManagerName");
            const mgrWAInput = this.container.querySelector("#contactManagerWA");
            const secNameInput = this.container.querySelector("#contactSecondaryName");
            const secWAInput = this.container.querySelector("#contactSecondaryWA");

            const c = (this.siteConfig && this.siteConfig.contacts) || {};
            const mgrName = (mgrNameInput && mgrNameInput.value.trim()) || c.managerName || "Inam Khan (Manager)";
            const mgrWA = cleanWhatsAppDigits((mgrWAInput && mgrWAInput.value) || c.managerWhatsApp || "923490558345");
            const secName = (secNameInput && secNameInput.value.trim()) || c.secondaryName || "Sadiq Ullah";
            const secWA = cleanWhatsAppDigits((secWAInput && secWAInput.value) || c.secondaryWhatsApp || "923434159182");

            routingSelect.innerHTML = `
                <option value="manager">Primary: ${escapeHtml(mgrName)} - ${escapeHtml(mgrWA)}</option>
                <option value="secondary">Secondary: ${escapeHtml(secName)} - ${escapeHtml(secWA)}</option>
            `;
            routingSelect.value = this.selectedRoutingRole === "secondary" ? "secondary" : "manager";

            const badgeMgr = this.container.querySelector("#badgeRoutingManager");
            const badgeSec = this.container.querySelector("#badgeRoutingSecondary");
            if (badgeMgr && badgeSec) {
                badgeMgr.classList.toggle("hidden", this.selectedRoutingRole === "secondary");
                badgeSec.classList.toggle("hidden", this.selectedRoutingRole !== "secondary");
            }
        }

        _updateLivePreviewBadges() {
            this._syncRoutingSelectOptions();
        }

        _populateConfigFields() {
            const s = (this.siteConfig && this.siteConfig.spotlight) || {};
            const r = (this.siteConfig && this.siteConfig.calculatorRates) || {};
            const c = (this.siteConfig && this.siteConfig.contacts) || {};
            const srv = s.servicesIncluded || {};

            const setVal = (sel, val) => {
                const el = this.container.querySelector(sel);
                if (el && document.activeElement !== el) {
                    el.value = val !== undefined && val !== null ? val : "";
                }
            };
            const setChk = (sel, val) => {
                const el = this.container.querySelector(sel);
                if (el) el.checked = Boolean(val);
            };

            setVal("#spotMonthLabel", s.monthLabel ?? "January");
            setVal("#spotTitle", s.title ?? "UMRAH PACKAGE");
            setVal("#spotStartingPrice", s.startingPrice ?? 232000);
            setVal("#spotPriceUnit", s.priceUnit ?? "PER PERSON (SHARING)");
            setVal("#spotDepartureDate", s.departureDate ?? "Jan 26, 2026");
            setVal("#spotReturnDate", s.returnDate ?? "Feb 09, 2026");
            setVal("#spotDuration", s.duration ?? "14 Nights");

            setChk("#srvRoundTrip", srv.roundTrip !== false);
            setChk("#srvVisa", srv.visa !== false);
            setChk("#srvHotel", srv.hotel !== false);
            setChk("#srvTransport", srv.transport !== false);

            setChk("#calcAutoScaleToggle", r.autoCalculateTiers !== false);
            setVal("#rateSharing", r.sharingPrice ?? 232000);
            setVal("#rateQuad", r.quadPrice ?? 248000);
            setVal("#rateTriple", r.triplePrice ?? 268000);
            setVal("#rateDouble", r.doublePrice ?? 295000);
            setVal("#rateDur10", r.dur10NightsOffset ?? -18000);
            setVal("#rateDur21", r.dur21NightsOffset ?? 35000);
            setVal("#rateDur28", r.dur28NightsOffset ?? 65000);
            setVal("#rateHotel3Star", r.hotel3StarAddon ?? 45000);
            setVal("#rateHotel5Star", r.hotel5StarAddon ?? 115000);

            setVal("#inputMadinahUrl", s.madinahImageUrl || "");
            setVal("#inputMakkahUrl", s.makkahImageUrl || "");
            setVal("#inputFlyerUrl", s.promotionalFlyerUrl || "");
            setChk("#chkShowFlyerButton", s.showFlyerOnHomepage !== false);

            const madinahPrev = this.container.querySelector("#previewMadinahImg");
            if (madinahPrev && s.madinahImageUrl) madinahPrev.src = s.madinahImageUrl;

            const makkahPrev = this.container.querySelector("#previewMakkahImg");
            if (makkahPrev && s.makkahImageUrl) makkahPrev.src = s.makkahImageUrl;

            const flyerPrev = this.container.querySelector("#previewFlyerImg");
            const flyerPh = this.container.querySelector("#previewFlyerPlaceholder");
            if (flyerPrev && flyerPh) {
                if (s.promotionalFlyerUrl) {
                    flyerPrev.src = s.promotionalFlyerUrl;
                    flyerPrev.classList.remove("hidden");
                    flyerPh.classList.add("hidden");
                } else {
                    flyerPrev.classList.add("hidden");
                    flyerPh.classList.remove("hidden");
                }
            }

            setVal("#contactAgencyName", c.agencyName || "Zakir Travel & Tours");
            setVal("#contactTagline1", c.taglinePrimary || "Your Journey Our Priority");
            setVal("#contactTagline2", c.taglineSecondary || "Your Journey Our Responsibility");
            setVal("#contactManagerName", c.managerName || "Inam Khan (Manager)");
            setVal("#contactManagerPhone", c.managerPhone || "+92 349 0558345");
            setVal("#contactManagerWA", c.managerWhatsApp || "923490558345");
            setVal("#contactSecondaryName", c.secondaryName || "Sadiq Ullah");
            setVal("#contactSecondaryPhone", c.secondaryPhone || "+92 343 4159182");
            setVal("#contactSecondaryWA", c.secondaryWhatsApp || "923434159182");
            const rawOffice = c.officeAddress || "";
            const isInvalidOrLegacyOffice = !rawOffice || /fazal banda/i.test(rawOffice) || /potohar|blue area|islamabad/i.test(rawOffice);
            setVal("#contactOfficeAddress", isInvalidOrLegacyOffice ? "2nd Floor, Hayat Market, Matta Swat, Khyber Pakhtunkhwa, Pakistan" : rawOffice);
            setVal("#contactOfficeHours", c.officeHours || "Monday to Saturday: 9:30 AM \u2013 8:00 PM (Sunday Closed / WhatsApp Support Active)");
            setVal("#contactOfficeEmail", c.officeEmail || "info@zakirtravels.com / inam@zakirtravels.com");
            const rawMap = c.mapEmbedUrl || "";
            const isLegacyMap = !rawMap || /potohar/i.test(rawMap) || /fazal-e-haq/i.test(rawMap);
            setVal("#contactMapEmbedUrl", isLegacyMap ? "https://maps.google.com/maps?q=Hayat+Market,+Matta,+Swat,+Pakistan&t=&z=16&ie=UTF8&iwloc=&output=embed" : rawMap);

            // Populate Page-Specific Content Fields
            const pc = (this.siteConfig && this.siteConfig.pageContent) || window.DEFAULT_PAGE_CONTENT || {};
            const pHome = pc.home || {};
            const pUmrah = pc.umrah || {};
            const pVisas = pc.visas || {};
            const pCalc = pc.calculator || {};
            const pContact = pc.contact || {};
            const pWork = pc.workPermit || {};

            setVal("#homeHeroBadgeInput", pHome.heroBadge || "Swat's Trusted Travel & Umrah Partner");
            setVal("#homeHeroHeadingMainInput", pHome.heroHeadingMain || "Your Spiritual & Global Journey,");
            setVal("#homeHeroDescriptionInput", pHome.heroDescription || "");
            setVal("#homeAboutBadgeInput", pHome.aboutBadge || "About Zakir Travel & Tours");
            setVal("#homeAboutHeadingInput", pHome.aboutHeading || "Swat's Trusted Partner for Spiritual & Worldwide Travel");
            setVal("#homeAboutDescInput", pHome.aboutDescription || "");
            setVal("#homeMissionTitleInput", pHome.missionTitle || "Our Mission & Promise");
            setVal("#homeMissionDescInput", pHome.missionDesc || "");
            setVal("#homeVisionTitleInput", pHome.visionTitle || "Rooted in Swat, Connected Nationwide");
            setVal("#homeVisionDescInput", pHome.visionDesc || "");
            setVal("#homeBranch1TitleInput", pHome.branch1Title || "Swat Head Office (Matta)");
            const rawBranch1 = pHome.branch1Address || "";
            const isInvalidOrLegacyBranch1 = !rawBranch1 || /fazal banda/i.test(rawBranch1) || /potohar|blue area|islamabad/i.test(rawBranch1);
            setVal("#homeBranch1AddrInput", isInvalidOrLegacyBranch1 ? "2nd Floor, Hayat Market, Matta Swat, Khyber Pakhtunkhwa, Pakistan" : rawBranch1);
            setVal("#homeBranch1DescInput", pHome.branch1Desc || "");
            setVal("#homeBranch2TitleInput", pHome.branch2Title || "Islamabad Branch Office");
            setVal("#homeBranch2AddrInput", pHome.branch2Address || "Office No. 7, Ground Floor, Potohar Plaza, Fazal-e-Haq Road, Blue Area, Islamabad");
            setVal("#homeBranch2DescInput", pHome.branch2Desc || "");
            setVal("#homeStat1NumInput", pHome.stat1Number || "100K+");
            setVal("#homeStat1LblInput", pHome.stat1Label || "Happy Clients & Pilgrims Served");
            setVal("#homeStat2NumInput", pHome.stat2Number || "24/7");
            setVal("#homeStat2LblInput", pHome.stat2Label || "WhatsApp & On-Trip Support");
            setVal("#homeStat3NumInput", pHome.stat3Number || "50+");
            setVal("#homeStat3LblInput", pHome.stat3Label || "Global Airlines & Destinations");
            setVal("#homeStat4NumInput", pHome.stat4Number || "Swat Matta");
            setVal("#homeStat4LblInput", pHome.stat4Label || "Central Head Office (Matta Swat)");
            setVal("#homeWhy1TitleInput", pHome.why1Title || "Authorized & Transparent Pricing");
            setVal("#homeWhy1DescInput", pHome.why1Desc || "");
            setVal("#homeWhy2TitleInput", pHome.why2Title || "Dedicated Personal Consultants");
            setVal("#homeWhy2DescInput", pHome.why2Desc || "");
            setVal("#homeWhy3TitleInput", pHome.why3Title || "Fast-Track Processing");
            setVal("#homeWhy3DescInput", pHome.why3Desc || "");
            setVal("#homeSrv1TitleInput", pHome.srv1Title || "Umrah & Ziyarat Packages");
            setVal("#homeSrv1DescInput", pHome.srv1Desc || "");
            setVal("#homeSrv2TitleInput", pHome.srv2Title || "Flight Tickets");
            setVal("#homeSrv2DescInput", pHome.srv2Desc || "");
            setVal("#homeSrv3TitleInput", pHome.srv3Title || "Visa Consultancy");
            setVal("#homeSrv3DescInput", pHome.srv3Desc || "");
            setVal("#homeSrv4TitleInput", pHome.srv4Title || "Hotel & Transport");
            setVal("#homeSrv4DescInput", pHome.srv4Desc || "");

            setVal("#umrahHeroBadgeInput", pUmrah.heroBadge || "Direct Departures from Islamabad (ISB)");
            setVal("#umrahHeroTitleInput", pUmrah.heroTitle || "All-Inclusive Umrah Packages");
            setVal("#umrahHeroSubtitleInput", pUmrah.heroSubtitle || "");
            setVal("#umrahInc1TitleInput", pUmrah.inc1Title || "Flights & Visas");
            setVal("#umrahInc1BulletsInput", pUmrah.inc1Bullets || "");
            setVal("#umrahInc2TitleInput", pUmrah.inc2Title || "Haram Hotel Stays");
            setVal("#umrahInc2BulletsInput", pUmrah.inc2Bullets || "");
            setVal("#umrahInc3TitleInput", pUmrah.inc3Title || "Transport & Ziyarat");
            setVal("#umrahInc3BulletsInput", pUmrah.inc3Bullets || "");
            setVal("#umrahFamilyTitleInput", pUmrah.familyBannerTitle || "Traveling with Family, Elders, or a Private Group?");
            setVal("#umrahFamilyDescInput", pUmrah.familyBannerDesc || "");

            setVal("#visaHeroBadgeInput", pVisas.heroBadge || "Fast Processing & Embassy File Preparation");
            setVal("#visaHeroTitleInput", pVisas.heroTitle || "Worldwide Visas & Air Tickets");
            setVal("#visaHeroSubtitleInput", pVisas.heroSubtitle || "");
            setVal("#visaFlightHeadingInput", pVisas.flightHeading || "Domestic & International Air Ticket Booking");
            setVal("#visaFlightDescInput", pVisas.flightDescription || "");
            setVal("#visaFlightBulletsInput", pVisas.flightBullets || "");
            setVal("#visaPartnerAirlinesInput", pVisas.partnerAirlines || "");
            setVal("#visaStep1TitleInput", pVisas.step1Title || "Send Passports & Photos");
            setVal("#visaStep1DescInput", pVisas.step1Desc || "");
            setVal("#visaStep2TitleInput", pVisas.step2Title || "Document Verification");
            setVal("#visaStep2DescInput", pVisas.step2Desc || "");
            setVal("#visaStep3TitleInput", pVisas.step3Title || "Receive Approved Visa");
            setVal("#visaStep3DescInput", pVisas.step3Desc || "");

            setVal("#calcHeroBadgeInput", pCalc.heroBadge || "Live Real-Time Cost Estimator");
            setVal("#calcHeroTitleInput", pCalc.heroTitle || "Umrah Package Budget Calculator");
            setVal("#calcHeroSubtitleInput", pCalc.heroSubtitle || "");
            setVal("#calcIncludedBulletsInput", pCalc.includedBullets || "");

            setVal("#wpHeroBadgeInput", pWork.heroBadge || "Europe Work Permit Specialists");
            setVal("#wpHeroTitleInput", pWork.heroTitle || "Work Permit & Job Placement Abroad");
            setVal("#wpHeroScriptInput", pWork.heroScript || "Your Gateway to Europe");
            setVal("#wpHeroSubtitleInput", pWork.heroSubtitle || "");
            setVal("#wpFeaturedScriptInput", pWork.featuredScript || "Featured Destination");
            setVal("#wpFeaturedDescInput", pWork.featuredDesc || "");
            setVal("#wpDestinationsHeadingInput", pWork.destinationsHeading || "Work Permit Destinations");
            setVal("#wpDestinationsDescInput", pWork.destinationsDesc || "");
            setVal("#wpBenefitsHeadingInput", pWork.benefitsHeading || "Why Apply Through Zakir Travel & Tours");
            setVal("#wpProcessHeadingInput", pWork.processHeading || "Our Work Permit Process");
            setVal("#wpChecklistHeadingInput", pWork.checklistHeading || "Documents Required");
            setVal("#wpChecklistDescInput", pWork.checklistDesc || "");
            setVal("#wpAssessmentHeadingInput", pWork.assessmentHeading || "Start Your Work Permit Assessment");
            setVal("#wpFaqHeadingInput", pWork.faqHeading || "Work Permit FAQs");

            const legacyBadges = ["Head Office: Blue Area, Islamabad", "Swat Head Office (Matta) \u2022 Islamabad Branch Office"];
            const aboutBadge = pContact.heroBadge && !legacyBadges.includes(pContact.heroBadge) ? pContact.heroBadge : "About Us \u2022 Our People \u2022 Contact";
            const aboutTitle = pContact.heroTitle && pContact.heroTitle !== "Contact Our Travel Desk" ? pContact.heroTitle : "Meet Zakir Travel & Tours";
            const aboutSubtitle =
                pContact.heroSubtitle && !/^We are always here to assist your spiritual journey/i.test(pContact.heroSubtitle)
                    ? pContact.heroSubtitle
                    : "Led from our Swat Matta Head Office with a branch in Islamabad, our dedicated team of visa, Umrah and ticketing professionals personally handles every file \u2014 from your first inquiry until you return home safely.";
            setVal("#contactHeroBadgeInput", aboutBadge);
            setVal("#contactHeroTitleInput", aboutTitle);
            setVal("#contactHeroSubtitleInput", aboutSubtitle);

            // About Us - Team Member Photos
            const teamPhotos = (this.siteConfig && this.siteConfig.teamPhotos) || {};
            TEAM_MEMBERS.forEach((m) => this._setTeamPhotoPreview(m.id, teamPhotos[m.id] || ""));

            this._updateLivePreviewBadges();
            this._autoGrowFields();
        }

        _setTeamPhotoPreview(memberId, url) {
            const urlInput = this.container.querySelector(`#teamPhotoUrl-${memberId}`);
            const img = this.container.querySelector(`#teamPhotoPreview-${memberId}`);
            const initials = this.container.querySelector(`#teamPhotoInitials-${memberId}`);
            if (urlInput) urlInput.value = url || "";
            if (img) {
                if (url) {
                    img.src = url;
                    img.classList.remove("hidden");
                } else {
                    img.removeAttribute("src");
                    img.classList.add("hidden");
                }
            }
            if (initials) initials.classList.toggle("hidden", !!url);
            const adjustBtn = this.container.querySelector(`[data-team-photo-adjust="${memberId}"]`);
            if (adjustBtn) adjustBtn.classList.toggle("hidden", !url);
        }

        // --------------------------------------------------------------------
        // TEAM PHOTO ADJUST — circular crop editor (zoom + drag + rotate).
        // The editor shows the photo exactly as the site shows it (a circle),
        // renders the adjusted crop to a 600x600 JPEG, and feeds the result
        // back through the normal upload path (a local image stored in
        // this browser). Nothing is saved to the site until "Save Changes".
        // --------------------------------------------------------------------

        // Pure crop math: given the image size, a zoom (1..3) and a pan
        // offset in image pixels (relative to the image centre), return the
        // square source rectangle to draw. The rectangle always stays
        // inside the image. Used by the preview AND the final export, so
        // what Majeed sees in the circle is exactly what gets saved.
        _photoCropSourceRect(imgW, imgH, zoom, panX, panY) {
            const cover = Math.min(imgW, imgH);
            const size = cover / Math.max(1, zoom);
            const maxPanX = (imgW - size) / 2;
            const maxPanY = (imgH - size) / 2;
            const cx = imgW / 2 + Math.max(-maxPanX, Math.min(maxPanX, panX || 0));
            const cy = imgH / 2 + Math.max(-maxPanY, Math.min(maxPanY, panY || 0));
            return { sx: cx - size / 2, sy: cy - size / 2, sw: size, sh: size };
        }

        _ensurePhotoAdjustModal() {
            let modal = this.container.querySelector("#teamPhotoAdjustModal");
            if (modal) return modal;

            const wrap = document.createElement("div");
            wrap.innerHTML = `
                <div id="teamPhotoAdjustModal" class="fixed inset-0 z-[97] hidden bg-[#05162E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto anim-scale-in">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-black text-[#0B2D5B]">Adjust Photo</h3>
                            <button type="button" data-action="close-photo-adjust" class="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <p id="photoAdjustName" class="text-xs font-bold text-[#0D8A9E] mb-4"></p>
                        <div id="photoAdjustStage" class="relative mx-auto w-[min(260px,100%)] aspect-square rounded-full overflow-hidden bg-slate-900 ring-4 ring-[#0D8A9E]/30 select-none" style="touch-action:none">
                            <canvas id="photoAdjustCanvas" width="520" height="520" class="w-full h-full block"></canvas>
                        </div>
                        <p class="text-center text-[11px] font-bold text-slate-400 mt-3">Drag the photo to move it</p>
                        <div class="mt-4">
                            <div class="flex items-center justify-between mb-1">
                                <label for="photoAdjustZoom" class="text-xs font-bold uppercase text-slate-600">Zoom</label>
                                <span id="photoAdjustZoomLabel" class="text-xs font-black text-[#0B2D5B]">1.0&times;</span>
                            </div>
                            <input id="photoAdjustZoom" type="range" min="1" max="3" step="0.01" value="1" class="w-full h-10 accent-[#0D8A9E]">
                        </div>
                        <div class="flex gap-2 mt-4">
                            <button type="button" id="photoAdjustRotate" class="flex-1 bg-slate-100 hover:bg-slate-200 text-[#0B2D5B] text-sm font-black py-3 rounded-xl transition-colors"><i class="fa-solid fa-rotate-right mr-2"></i>Rotate</button>
                            <button type="button" id="photoAdjustCancel" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-black py-3 rounded-xl transition-colors">Cancel</button>
                            <button type="button" id="photoAdjustApply" class="flex-[2] bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white text-sm font-black py-3 rounded-xl transition-colors">Apply</button>
                        </div>
                    </div>
                </div>`;
            modal = wrap.firstElementChild;
            this.container.appendChild(modal);

            modal.querySelector("[data-action='close-photo-adjust']").addEventListener("click", () => this._closePhotoAdjust(true));
            modal.querySelector("#photoAdjustCancel").addEventListener("click", () => this._closePhotoAdjust(true));
            modal.querySelector("#photoAdjustApply").addEventListener("click", () => this._applyPhotoAdjust());
            modal.querySelector("#photoAdjustRotate").addEventListener("click", () => this._rotatePhotoAdjust());
            modal.addEventListener("click", (e) => {
                if (e.target === modal) this._closePhotoAdjust(true);
            });
            modal.querySelector("#photoAdjustZoom").addEventListener("input", (e) => {
                const st = this._photoAdjust;
                if (!st) return;
                st.zoom = parseFloat(e.target.value) || 1;
                this._syncPhotoAdjustControls();
                this._redrawPhotoAdjust();
            });

            // Drag to move: pointer events cover mouse AND touch. The photo
            // follows the finger/pointer; the crop window moves the other way.
            const stage = modal.querySelector("#photoAdjustStage");
            let drag = null;
            stage.addEventListener("pointerdown", (e) => {
                if (!this._photoAdjust) return;
                e.preventDefault();
                drag = { x: e.clientX, y: e.clientY };
                try {
                    stage.setPointerCapture(e.pointerId);
                } catch (_) {
                    // Older browsers: dragging still works without capture.
                }
            });
            stage.addEventListener("pointermove", (e) => {
                const st = this._photoAdjust;
                if (!st || !drag || !st.img) return;
                const rect = this._photoCropSourceRect(st.img.width, st.img.height, st.zoom, st.panX, st.panY);
                const displaySize = stage.clientWidth || 260;
                const scale = rect.sw / displaySize;
                st.panX -= (e.clientX - drag.x) * scale;
                st.panY -= (e.clientY - drag.y) * scale;
                drag = { x: e.clientX, y: e.clientY };
                this._redrawPhotoAdjust();
            });
            const endDrag = () => {
                drag = null;
            };
            stage.addEventListener("pointerup", endDrag);
            stage.addEventListener("pointercancel", endDrag);

            return modal;
        }

        _syncPhotoAdjustControls() {
            const st = this._photoAdjust;
            const modal = this.container.querySelector("#teamPhotoAdjustModal");
            if (!st || !modal) return;
            const slider = modal.querySelector("#photoAdjustZoom");
            const label = modal.querySelector("#photoAdjustZoomLabel");
            if (slider) slider.value = String(st.zoom);
            if (label) label.textContent = `${st.zoom.toFixed(1)}×`;
        }

        _redrawPhotoAdjust() {
            const st = this._photoAdjust;
            if (!st || !st.img) return;
            const canvas = this.container.querySelector("#photoAdjustCanvas");
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            const rect = this._photoCropSourceRect(st.img.width, st.img.height, st.zoom, st.panX, st.panY);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(st.img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, canvas.width, canvas.height);
        }

        _rotatePhotoAdjust() {
            const st = this._photoAdjust;
            if (!st || !st.img) return;
            // Rotate the working image onto a fresh canvas (90° clockwise)
            // and keep using it as the source — the crop math is unchanged.
            const src = st.img;
            const tmp = document.createElement("canvas");
            tmp.width = src.height;
            tmp.height = src.width;
            const ctx = tmp.getContext("2d");
            ctx.translate(tmp.width / 2, tmp.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(src, -src.width / 2, -src.height / 2);
            st.img = tmp;
            st.zoom = 1;
            st.panX = 0;
            st.panY = 0;
            this._syncPhotoAdjustControls();
            this._redrawPhotoAdjust();
        }

        _openPhotoAdjust(memberId, memberName, src, fileName) {
            const modal = this._ensurePhotoAdjustModal();
            const img = new Image();
            // crossOrigin so an already-saved remote photo can be drawn
            // to a canvas and exported. Local uploads (blob:/data: URLs)
            // are unaffected. If the photo cannot be loaded this way, the
            // error handler below tells Majeed to upload it again.
            img.crossOrigin = "anonymous";
            img.onload = () => {
                this._photoAdjust = {
                    memberId,
                    memberName,
                    fileName: fileName || `${memberId}-photo.jpg`,
                    img,
                    zoom: 1,
                    panX: 0,
                    panY: 0,
                    src
                };
                const nameEl = modal.querySelector("#photoAdjustName");
                if (nameEl) nameEl.textContent = memberName;
                this._syncPhotoAdjustControls();
                this._redrawPhotoAdjust();
                modal.classList.remove("hidden");
            };
            img.onerror = () => {
                if (typeof src === "string" && src.startsWith("blob:")) {
                    try {
                        URL.revokeObjectURL(src);
                    } catch (_) {
                        // Ignore — the URL is already gone.
                    }
                }
                this.showToast("Could not open this photo for editing. Try uploading it again.", "error", `Team photo · ${memberName}`);
            };
            img.src = src;
        }

        _closePhotoAdjust(cancelled) {
            const modal = this.container.querySelector("#teamPhotoAdjustModal");
            if (modal) modal.classList.add("hidden");
            const st = this._photoAdjust;
            if (st && typeof st.src === "string" && st.src.startsWith("blob:")) {
                try {
                    URL.revokeObjectURL(st.src);
                } catch (_) {
                    // Ignore — the URL is already gone.
                }
            }
            this._photoAdjust = null;
            if (cancelled) {
                this.showToast("Adjustment cancelled — photo unchanged.", "info", "Team photo");
            }
        }

        async _applyPhotoAdjust() {
            const st = this._photoAdjust;
            if (!st || !st.img) return;
            const rect = this._photoCropSourceRect(st.img.width, st.img.height, st.zoom, st.panX, st.panY);
            const out = document.createElement("canvas");
            out.width = 600;
            out.height = 600;
            const ctx = out.getContext("2d");
            ctx.drawImage(st.img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, 600, 600);
            let blob;
            try {
                blob = await new Promise((resolve, reject) => {
                    out.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image."))), "image/jpeg", 0.85);
                });
            } catch (err) {
                // Happens if the canvas is tainted (e.g. a saved remote
                // photo loaded without CORS permission) — re-uploading the
                // original file fixes it.
                this.showToast("Could not save the adjusted photo. Try uploading the photo again.", "error", `Team photo · ${st.memberName}`);
                return;
            }
            const baseName = String(st.fileName || `${st.memberId}-photo.jpg`).replace(/\.[^.]+$/, "");
            let file;
            try {
                file = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
            } catch (_) {
                // Very old browsers without the File constructor: a Blob
                // with a name still works with uploadMediaFile.
                blob.name = `${baseName}.jpg`;
                file = blob;
            }
            const memberId = st.memberId;
            const memberName = st.memberName;
            this._closePhotoAdjust(false);
            await this._uploadAdjustedTeamPhoto(memberId, memberName, file);
        }

        // The normal team-photo upload path, unchanged apart from the
        // "adjusted" wording: local-image upload, preview staging, and
        // the reminder to click Save Changes.
        async _uploadAdjustedTeamPhoto(memberId, memberName, file) {
            const db = window.zakirDB;
            const sizeText = this._formatFileSize(file.size);
            const fileDesc = sizeText ? `${file.name} (${sizeText})` : file.name;
            try {
                const url = await this._runUploadWithFeedback(
                    `Uploading team photo ${fileDesc}…`,
                    `Team photo · ${memberName} · Saved in this browser as a local image`,
                    () => db.uploadMediaFile(file, "zakir_team")
                );
                this._setTeamPhotoPreview(memberId, url);
                if (url.startsWith("data:")) {
                    this.showToast("Photo adjusted — saved in this browser as a local image. Click Save Changes to keep it.", "success", `Team photo · ${memberName} · ${fileDesc} · saved in this browser as a local image (stored with the site data on save)`);
                } else {
                    this.showToast(`Photo adjusted ✓ ${fileDesc} — click Save Changes.`, "success", `Team photo · ${memberName} · Saved in this browser as a local image`);
                }
            } catch (err) {
                this.showToast(`Upload failed: ${err.message || "Unknown error"}`, "error", `Team photo · ${memberName} · ${fileDesc}`);
            }
        }

        // --------------------------------------------------------------------
        // RENDER SPECIAL FLYER DEALS (VISUAL CRUD CARDS)
        // --------------------------------------------------------------------

        _renderSpecialDealsList() {
            const wrap = this.container.querySelector("#crudSpecialDealsContainer");
            if (!wrap) return;

            if (!this.specialDeals || !this.specialDeals.length) {
                wrap.innerHTML = `<div class="col-span-full bg-white rounded-3xl p-8 text-center text-slate-500">No Special Deals found. Click "Add New Special Deal" to create one.</div>`;
                return;
            }

            wrap.innerHTML = this.specialDeals
                .map((deal, idx) => {
                    const srv = deal.servicesIncluded || {};
                    return `
                    <div class="admin-card-hover bg-white rounded-3xl border-2 ${
                        deal.isPrimary
                            ? "border-[#0D8A9E] shadow-xl"
                            : deal.isActive
                            ? "border-slate-200 shadow-md"
                            : "border-slate-200 opacity-60 bg-slate-50"
                    } overflow-hidden flex flex-col justify-between">
                        
                        <div>
                            <!-- Dual Image Mini Banner with Floating Price Shield -->
                            <div class="relative grid grid-cols-2 gap-1 bg-gradient-to-br from-[#05162E] via-[#0B2D5B] to-[#0D8A9E] h-40 overflow-hidden">
                                <div class="relative h-full overflow-hidden">
                                    <img src="${escapeHtml(deal.madinahImageUrl)}" onerror="this.style.display='none'" class="w-full h-full object-cover opacity-90">
                                    <div class="absolute inset-0 bg-gradient-to-t from-[#05162E]/90 via-transparent to-transparent"></div>
                                    <span class="absolute bottom-2 left-2.5 text-[10px] font-bold text-white">${escapeHtml(deal.leftFrameTitle || "Madinah")}</span>
                                </div>
                                <div class="relative h-full overflow-hidden">
                                    <img src="${escapeHtml(deal.makkahImageUrl)}" onerror="this.style.display='none'" class="w-full h-full object-cover opacity-90">
                                    <div class="absolute inset-0 bg-gradient-to-t from-[#05162E]/90 via-transparent to-transparent"></div>
                                    <span class="absolute bottom-2 right-2.5 text-[10px] font-bold text-white">${escapeHtml(deal.rightFrameTitle || "Makkah")}</span>
                                </div>

                                <!-- Top Left Status Badges -->
                                <div class="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                                    <span class="bg-[#05162E]/90 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                                        Deal #${idx + 1}
                                    </span>
                                    ${
                                        deal.isPrimary
                                            ? `<span class="bg-[#D4AF37] text-[#05162E] text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                                                <i class="fa-solid fa-star"></i> Primary Flyer
                                               </span>`
                                            : ""
                                    }
                                    ${
                                        !deal.isActive
                                            ? `<span class="bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">Hidden</span>`
                                            : `<span class="bg-[#0D8A9E] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">Shown</span>`
                                    }
                                </div>

                                <!-- Center Price Shield -->
                                <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                    <div class="bg-gradient-to-b from-[#0B2D5B] via-[#0D8A9E] to-[#0B2D5B] text-white px-4 py-2 rounded-2xl border-2 border-white shadow-2xl text-center">
                                        <span class="text-[8px] font-bold uppercase tracking-widest text-[#BFEFF6] block">STARTING FROM</span>
                                        <div class="text-lg font-black leading-tight">PKR ${formatPKR(deal.startingPrice)}</div>
                                        <span class="text-[8px] font-bold uppercase text-teal-100 block">${escapeHtml(deal.priceUnit || "PER PERSON")}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Deal Info Body -->
                            <div class="p-5 space-y-3">
                                <div class="flex items-start justify-between gap-2">
                                    <div>
                                        <span class="text-xs font-extrabold text-[#0D8A9E] block">${escapeHtml(deal.monthLabel)}</span>
                                        <h4 class="text-lg font-black text-[#0B2D5B] uppercase tracking-tight">${escapeHtml(deal.title)}</h4>
                                    </div>
                                    <span class="bg-[#E6F6F8] text-[#0D8A9E] text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                                        ${escapeHtml(deal.badgeTag || "All-Inclusive")}
                                    </span>
                                </div>

                                <!-- Schedule Strip Preview -->
                                <div class="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center text-xs">
                                    <div>
                                        <span class="text-[10px] text-slate-400 font-bold uppercase block">Departure</span>
                                        <strong class="text-[#0B2D5B] font-extrabold">${escapeHtml(deal.departureDate)}</strong>
                                    </div>
                                    <div class="border-x border-slate-200">
                                        <span class="text-[10px] text-slate-400 font-bold uppercase block">Return</span>
                                        <strong class="text-[#0B2D5B] font-extrabold">${escapeHtml(deal.returnDate)}</strong>
                                    </div>
                                    <div>
                                        <span class="text-[10px] text-slate-400 font-bold uppercase block">Duration</span>
                                        <strong class="text-[#0D8A9E] font-extrabold">${escapeHtml(deal.duration)}</strong>
                                    </div>
                                </div>

                                <!-- Services Included Pills -->
                                <div class="flex flex-wrap gap-1.5 pt-1">
                                    <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg ${srv.roundTrip !== false ? "bg-[#E6F6F8] text-[#0D8A9E] border border-[#0D8A9E]/20" : "bg-slate-100 text-slate-400 line-through"}">
                                        <i class="fa-solid fa-plane mr-1"></i>Round Trip
                                    </span>
                                    <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg ${srv.visa !== false ? "bg-[#E6F6F8] text-[#0D8A9E] border border-[#0D8A9E]/20" : "bg-slate-100 text-slate-400 line-through"}">
                                        <i class="fa-solid fa-passport mr-1"></i>Umrah Visa
                                    </span>
                                    <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg ${srv.hotel !== false ? "bg-[#E6F6F8] text-[#0D8A9E] border border-[#0D8A9E]/20" : "bg-slate-100 text-slate-400 line-through"}">
                                        <i class="fa-solid fa-hotel mr-1"></i>Hotel Stay
                                    </span>
                                    <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg ${srv.transport !== false ? "bg-[#E6F6F8] text-[#0D8A9E] border border-[#0D8A9E]/20" : "bg-slate-100 text-slate-400 line-through"}">
                                        <i class="fa-solid fa-bus mr-1"></i>Transport
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- CRUD Action Bar -->
                        <div class="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5">
                                <button type="button" data-action="move-deal" data-id="${escapeHtml(deal.id)}" data-dir="up" ${idx === 0 ? "disabled" : ""} class="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs" title="Move Up">
                                    <i class="fa-solid fa-arrow-up"></i>
                                </button>
                                <button type="button" data-action="move-deal" data-id="${escapeHtml(deal.id)}" data-dir="down" ${idx === this.specialDeals.length - 1 ? "disabled" : ""} class="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs" title="Move Down">
                                    <i class="fa-solid fa-arrow-down"></i>
                                </button>
                                <button type="button" data-action="toggle-deal-active" data-id="${escapeHtml(deal.id)}" class="px-3 py-1.5 rounded-xl text-xs font-bold border ${deal.isActive ? "bg-[#E6F6F8] text-[#0D8A9E] border-[#0D8A9E]/20 hover:bg-[#D7F0F4]" : "bg-slate-200 text-slate-700 border-slate-300"}">
                                    ${deal.isActive ? "Visible" : "Hidden"}
                                </button>
                                ${
                                    !deal.isPrimary
                                        ? `<button type="button" data-action="set-primary-deal" data-id="${escapeHtml(deal.id)}" class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#8A6D0B] border border-[#D4AF37]/30" title="Set as Primary Deal">
                                            <i class="fa-regular fa-star mr-1"></i>Set Primary
                                           </button>`
                                        : ""
                                }
                            </div>

                            <div class="flex items-center gap-1.5">
                                <button type="button" data-action="duplicate-deal" data-id="${escapeHtml(deal.id)}" class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold" title="Duplicate Deal">
                                    <i class="fa-regular fa-copy mr-1"></i>Clone
                                </button>
                                <button type="button" data-action="edit-deal" data-id="${escapeHtml(deal.id)}" class="px-3.5 py-1.5 rounded-xl bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white text-xs font-bold transition-colors shadow-sm">
                                    <i class="fa-solid fa-pen mr-1"></i>Edit Deal
                                </button>
                                <button type="button" data-action="delete-deal" data-id="${escapeHtml(deal.id)}" class="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center text-xs transition-colors" title="Delete Deal">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                })
                .join("");
        }

        async saveAllPortalChanges(triggerButton) {
            const db = window.zakirDB;

            const startingPrice = Number(this.container.querySelector("#spotStartingPrice").value);
            const sharingPrice = Number(this.container.querySelector("#rateSharing").value);
            const quadPrice = Number(this.container.querySelector("#rateQuad").value);
            const triplePrice = Number(this.container.querySelector("#rateTriple").value);
            const doublePrice = Number(this.container.querySelector("#rateDouble").value);

            if ([startingPrice, sharingPrice, quadPrice, triplePrice, doublePrice].some((p) => !p || p <= 0)) {
                this.showToast("All package and room prices must be greater than 0 PKR.", "error");
                return false;
            }

            const managerPhone = this.container.querySelector("#contactManagerPhone").value.trim();
            const managerWhatsApp = cleanWhatsAppDigits(this.container.querySelector("#contactManagerWA").value);
            const secondaryPhone = this.container.querySelector("#contactSecondaryPhone").value.trim();
            const secondaryWhatsApp = cleanWhatsAppDigits(
                this.container.querySelector("#contactSecondaryWA").value
            );

            if (!managerPhone || !managerWhatsApp || !secondaryPhone || !secondaryWhatsApp) {
                this.showToast("Phone and WhatsApp numbers cannot be empty!", "error");
                return false;
            }

            const routingRole = this.container.querySelector("#contactActiveRouting").value;
            this.selectedRoutingRole = routingRole === "secondary" ? "secondary" : "manager";
            const activeBookingWhatsApp =
                this.selectedRoutingRole === "secondary" ? secondaryWhatsApp : managerWhatsApp;

            const madinahImageUrl = this.container.querySelector("#inputMadinahUrl").value.trim();
            const makkahImageUrl = this.container.querySelector("#inputMakkahUrl").value.trim();
            const promotionalFlyerUrl = this.container.querySelector("#inputFlyerUrl").value.trim();
            const showFlyerOnHomepage = this.container.querySelector("#chkShowFlyerButton").checked;

            const getVal = (sel, fallback = "") => {
                const el = this.container.querySelector(sel);
                return el ? el.value.trim() : fallback;
            };

            const teamPhotoInputs = this.container.querySelectorAll("input[data-team-photo-key]");
            const teamPhotos = { ...((this.siteConfig && this.siteConfig.teamPhotos) || {}) };
            teamPhotoInputs.forEach((inp) => {
                teamPhotos[inp.getAttribute("data-team-photo-key")] = inp.value.trim();
            });

            let result;
            try {
                result = await this._runSaveWithFeedback(triggerButton, () => db.updateSiteConfig({
                    teamPhotos,
                    spotlight: {
                        monthLabel: getVal("#spotMonthLabel", "January"),
                        title: getVal("#spotTitle", "UMRAH PACKAGE") || "UMRAH PACKAGE",
                        startingPrice,
                        priceUnit: getVal("#spotPriceUnit", "PER PERSON (SHARING)") || "PER PERSON (SHARING)",
                        departureDate: getVal("#spotDepartureDate", "Jan 26, 2026"),
                        returnDate: getVal("#spotReturnDate", "Feb 09, 2026") || "Feb 09, 2026",
                        duration: getVal("#spotDuration", "14 Nights") || "14 Nights",
                        madinahImageUrl: madinahImageUrl || this.siteConfig.spotlight.madinahImageUrl,
                        makkahImageUrl: makkahImageUrl || this.siteConfig.spotlight.makkahImageUrl,
                        promotionalFlyerUrl,
                        showFlyerOnHomepage,
                        servicesIncluded: {
                            roundTrip: this.container.querySelector("#srvRoundTrip").checked,
                            visa: this.container.querySelector("#srvVisa").checked,
                            hotel: this.container.querySelector("#srvHotel").checked,
                            transport: this.container.querySelector("#srvTransport").checked
                        }
                    },
                    calculatorRates: {
                        autoCalculateTiers: this.container.querySelector("#calcAutoScaleToggle").checked,
                        sharingPrice,
                        quadPrice,
                        triplePrice,
                        doublePrice,
                        dur10NightsOffset: Number(getVal("#rateDur10", "-18000")),
                        dur21NightsOffset: Number(getVal("#rateDur21", "35000")),
                        dur28NightsOffset: Number(getVal("#rateDur28", "65000")),
                        hotel3StarAddon: Number(getVal("#rateHotel3Star", "45000")),
                        hotel5StarAddon: Number(getVal("#rateHotel5Star", "115000"))
                    },
                    contacts: {
                        agencyName: getVal("#contactAgencyName", "Zakir Travel & Tours"),
                        taglinePrimary: getVal("#contactTagline1", "Your Journey Our Priority"),
                        taglineSecondary: getVal("#contactTagline2", "Your Journey Our Responsibility"),
                        managerName: getVal("#contactManagerName", "Inam Khan (Manager)"),
                        managerPhone,
                        managerWhatsApp,
                        secondaryName: getVal("#contactSecondaryName", "Sadiq Ullah"),
                        secondaryPhone,
                        secondaryWhatsApp,
                        activeBookingWhatsApp,
                        officeAddress: getVal("#contactOfficeAddress", ""),
                        officeHours: getVal("#contactOfficeHours", "Monday to Saturday: 9:30 AM \u2013 8:00 PM (Sunday Closed / WhatsApp Support Active)"),
                        officeEmail: getVal("#contactOfficeEmail", "info@zakirtravels.com / inam@zakirtravels.com"),
                        mapEmbedUrl: getVal("#contactMapEmbedUrl", "")
                    },
                    pageContent: {
                        home: {
                            heroBadge: getVal("#homeHeroBadgeInput"),
                            heroHeadingMain: getVal("#homeHeroHeadingMainInput"),
                            heroDescription: getVal("#homeHeroDescriptionInput"),
                            aboutBadge: getVal("#homeAboutBadgeInput"),
                            aboutHeading: getVal("#homeAboutHeadingInput"),
                            aboutDescription: getVal("#homeAboutDescInput"),
                            missionTitle: getVal("#homeMissionTitleInput"),
                            missionDesc: getVal("#homeMissionDescInput"),
                            visionTitle: getVal("#homeVisionTitleInput"),
                            visionDesc: getVal("#homeVisionDescInput"),
                            branch1Title: getVal("#homeBranch1TitleInput"),
                            branch1Address: getVal("#homeBranch1AddrInput"),
                            branch1Desc: getVal("#homeBranch1DescInput"),
                            branch2Title: getVal("#homeBranch2TitleInput"),
                            branch2Address: getVal("#homeBranch2AddrInput"),
                            branch2Desc: getVal("#homeBranch2DescInput"),
                            stat1Number: getVal("#homeStat1NumInput"),
                            stat1Label: getVal("#homeStat1LblInput"),
                            stat2Number: getVal("#homeStat2NumInput"),
                            stat2Label: getVal("#homeStat2LblInput"),
                            stat3Number: getVal("#homeStat3NumInput"),
                            stat3Label: getVal("#homeStat3LblInput"),
                            stat4Number: getVal("#homeStat4NumInput"),
                            stat4Label: getVal("#homeStat4LblInput"),
                            why1Title: getVal("#homeWhy1TitleInput"),
                            why1Desc: getVal("#homeWhy1DescInput"),
                            why2Title: getVal("#homeWhy2TitleInput"),
                            why2Desc: getVal("#homeWhy2DescInput"),
                            why3Title: getVal("#homeWhy3TitleInput"),
                            why3Desc: getVal("#homeWhy3DescInput"),
                            srv1Title: getVal("#homeSrv1TitleInput"),
                            srv1Desc: getVal("#homeSrv1DescInput"),
                            srv2Title: getVal("#homeSrv2TitleInput"),
                            srv2Desc: getVal("#homeSrv2DescInput"),
                            srv3Title: getVal("#homeSrv3TitleInput"),
                            srv3Desc: getVal("#homeSrv3DescInput"),
                            srv4Title: getVal("#homeSrv4TitleInput"),
                            srv4Desc: getVal("#homeSrv4DescInput")
                        },
                        umrah: {
                            heroBadge: getVal("#umrahHeroBadgeInput"),
                            heroTitle: getVal("#umrahHeroTitleInput"),
                            heroSubtitle: getVal("#umrahHeroSubtitleInput"),
                            inc1Title: getVal("#umrahInc1TitleInput"),
                            inc1Bullets: getVal("#umrahInc1BulletsInput"),
                            inc2Title: getVal("#umrahInc2TitleInput"),
                            inc2Bullets: getVal("#umrahInc2BulletsInput"),
                            inc3Title: getVal("#umrahInc3TitleInput"),
                            inc3Bullets: getVal("#umrahInc3BulletsInput"),
                            familyBannerTitle: getVal("#umrahFamilyTitleInput"),
                            familyBannerDesc: getVal("#umrahFamilyDescInput")
                        },
                        visas: {
                            heroBadge: getVal("#visaHeroBadgeInput"),
                            heroTitle: getVal("#visaHeroTitleInput"),
                            heroSubtitle: getVal("#visaHeroSubtitleInput"),
                            flightHeading: getVal("#visaFlightHeadingInput"),
                            flightDescription: getVal("#visaFlightDescInput"),
                            flightBullets: getVal("#visaFlightBulletsInput"),
                            partnerAirlines: getVal("#visaPartnerAirlinesInput"),
                            step1Title: getVal("#visaStep1TitleInput"),
                            step1Desc: getVal("#visaStep1DescInput"),
                            step2Title: getVal("#visaStep2TitleInput"),
                            step2Desc: getVal("#visaStep2DescInput"),
                            step3Title: getVal("#visaStep3TitleInput"),
                            step3Desc: getVal("#visaStep3DescInput")
                        },
                        calculator: {
                            heroBadge: getVal("#calcHeroBadgeInput"),
                            heroTitle: getVal("#calcHeroTitleInput"),
                            heroSubtitle: getVal("#calcHeroSubtitleInput"),
                            includedBullets: getVal("#calcIncludedBulletsInput")
                        },
                        workPermit: {
                            heroBadge: getVal("#wpHeroBadgeInput"),
                            heroTitle: getVal("#wpHeroTitleInput"),
                            heroScript: getVal("#wpHeroScriptInput"),
                            heroSubtitle: getVal("#wpHeroSubtitleInput"),
                            featuredScript: getVal("#wpFeaturedScriptInput"),
                            featuredDesc: getVal("#wpFeaturedDescInput"),
                            destinationsHeading: getVal("#wpDestinationsHeadingInput"),
                            destinationsDesc: getVal("#wpDestinationsDescInput"),
                            benefitsHeading: getVal("#wpBenefitsHeadingInput"),
                            processHeading: getVal("#wpProcessHeadingInput"),
                            checklistHeading: getVal("#wpChecklistHeadingInput"),
                            checklistDesc: getVal("#wpChecklistDescInput"),
                            assessmentHeading: getVal("#wpAssessmentHeadingInput"),
                            faqHeading: getVal("#wpFaqHeadingInput")
                        },
                        contact: {
                            heroBadge: getVal("#contactHeroBadgeInput"),
                            heroTitle: getVal("#contactHeroTitleInput"),
                            heroSubtitle: getVal("#contactHeroSubtitleInput")
                        }
                    }
                }));
            } catch (err) {
                this.showToast(err.message || "Could not save. Please try again.", "error");
                return false;
            }

            this._showSyncToast(
                result,
                "All changes saved in this browser.",
                "success",
                this._verifyFor("site_config", result && result.config, ["updatedAt"], "main_settings")
            );
            return true;
        }

        _getFilteredEnquiries() {
            const q = String(this.enquirySearch || "").trim().toLowerCase();
            return (this.enquiries || []).filter((e) => {
                if (this.enquiryFilter && this.enquiryFilter !== "all" && e.status !== this.enquiryFilter) return false;
                if (!q) return true;
                return [e.name, e.phone, e.service, e.source, e.details]
                    .join(" ")
                    .toLowerCase()
                    .includes(q);
            });
        }

        _renderEnquiriesList() {
            const wrap = this.container.querySelector("#enquiriesListContainer");
            if (!wrap) return;

            const list = this._getFilteredEnquiries();
            const newCount = (this.enquiries || []).filter((e) => e.status === "new").length;
            if (!list.length) {
                wrap.innerHTML =
                    (this.enquiries || []).length === 0
                        ? `<div class="bg-slate-50 rounded-2xl p-8 text-center text-slate-500 text-sm">No enquiries yet. New form submissions will appear here.</div>`
                        : `<div class="bg-slate-50 rounded-2xl p-8 text-center text-slate-500 text-sm">No enquiries match this filter. (${newCount} new in total.)</div>`;
                return;
            }

            const statusBadge = {
                new: "bg-rose-100 text-rose-700",
                contacted: "bg-amber-100 text-amber-800",
                booked: "bg-emerald-100 text-emerald-700",
                closed: "bg-slate-100 text-slate-600"
            };

            wrap.innerHTML = list
                .map((e) => {
                    const waDigits = cleanWhatsAppDigits(e.phone);
                    const when = e.createdAt ? new Date(e.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
                    const waLink = waDigits
                        ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Assalam-o-Alaikum ${e.name}! This is Zakir Travel & Tours — following up on your ${e.service} enquiry.`)}`
                        : "";
                    return `
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <div class="flex flex-wrap items-center gap-2">
                                <h4 class="text-sm font-black text-[#0B2D5B]">${escapeHtml(e.name || "Unknown")}</h4>
                                <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${statusBadge[e.status] || statusBadge.new}">${escapeHtml(e.status || "new")}</span>
                                ${e.syncPending ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Not synced yet</span>` : ""}
                            </div>
                            <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(e.service)} · ${escapeHtml(e.source)} · ${escapeHtml(when)}</p>
                        </div>
                        <button type="button" data-action="enquiry-delete" data-id="${escapeHtml(e.id)}" class="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center text-xs transition-colors" title="Delete enquiry">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    <p class="text-xs text-slate-600 leading-relaxed bg-white border border-slate-200 rounded-xl px-3 py-2.5">${escapeHtml(e.details || "No details.")}</p>
                    <div class="flex flex-wrap items-center gap-2">
                        <a href="tel:${escapeHtml(e.phone)}" class="bg-white border border-slate-200 text-[#0B2D5B] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5">
                            <i class="fa-solid fa-phone text-[#0D8A9E]"></i>${escapeHtml(e.phone)}
                        </a>
                        ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener noreferrer" class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"><i class="fa-brands fa-whatsapp"></i>Reply on WhatsApp</a>` : ""}
                        <select data-enquiry-status="${escapeHtml(e.id)}" class="ml-auto bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                            ${["new", "contacted", "booked", "closed"].map((s) => `<option value="${s}" ${e.status === s ? "selected" : ""}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join("")}
                        </select>
                    </div>
                </div>`;
                })
                .join("");
        }

        _exportEnquiriesCsv() {
            const list = this._getFilteredEnquiries();
            if (!list.length) {
                this.showToast("No enquiries to export for this filter.", "warning");
                return;
            }
            // Prefix fields starting with =, +, -, @, tab or CR with a
            // single quote, so Excel/Sheets cannot execute them as
            // formulas when the CSV is opened (formula injection).
            const esc = (v) => {
                const text = String(v == null ? "" : v);
                const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
                return `"${safe.replace(/"/g, '""')}"`;
            };
            const rows = [["Date", "Name", "Phone", "Service", "Source", "Status", "Details"]].concat(
                list.map((e) => [e.createdAt, e.name, e.phone, e.service, e.source, e.status, e.details].map(esc))
            );
            const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `zakir-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            this.showToast(`${list.length} enquiries exported as CSV.`);
        }

        _renderPackagesList() {
            const wrap = this.container.querySelector("#crudPackagesContainer");
            if (!wrap) return;

            if (!this.packages.length) {
                wrap.innerHTML = `<div class="col-span-full bg-white rounded-2xl p-8 text-center text-slate-500 text-sm">No Umrah packages found. Click "Add Package Card" to create one.</div>`;
                return;
            }

            wrap.innerHTML = this.packages
                .map(
                    (pkg, idx) => `
                <div class="admin-card-hover bg-white rounded-3xl p-5 border ${pkg.isActive ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"} shadow-card flex flex-col justify-between gap-4">
                    <div class="space-y-2">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5">
                                <span class="bg-[#0B2D5B] text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">#${idx + 1}</span>
                                <span class="bg-[#E6F6F8] text-[#0D8A9E] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">${escapeHtml(pkg.badgeText || "Package")}</span>
                                ${pkg.isFeatured ? `<span class="bg-[#FEF3C7] text-[#8A6D0B] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-star mr-1"></i>Featured</span>` : ""}
                            </div>
                            <span class="text-lg font-black text-[#0D8A9E]">PKR ${formatPKR(pkg.price)}</span>
                        </div>
                        <h4 class="text-base font-black text-[#0B2D5B]">${escapeHtml(pkg.title)}</h4>
                        <div class="text-xs text-slate-500 grid grid-cols-2 gap-1.5 bg-slate-50 p-3 rounded-2xl">
                            <span><i class="fa-solid fa-bed text-[#0D8A9E] mr-1"></i>${escapeHtml(pkg.roomType)}</span>
                            <span><i class="fa-regular fa-clock text-[#0D8A9E] mr-1"></i>${escapeHtml(pkg.duration)}</span>
                            <span><i class="fa-solid fa-plane-departure text-[#0D8A9E] mr-1"></i>${escapeHtml(pkg.departureDate)}</span>
                            <span><i class="fa-solid fa-kaaba text-[#0D8A9E] mr-1"></i>${escapeHtml(pkg.makkahHotelDist)}</span>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                        <div class="flex items-center gap-1">
                            <button type="button" data-action="move-pkg" data-id="${escapeHtml(pkg.id)}" data-dir="up" ${idx === 0 ? "disabled" : ""} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-arrow-up"></i>
                            </button>
                            <button type="button" data-action="move-pkg" data-id="${escapeHtml(pkg.id)}" data-dir="down" ${idx === this.packages.length - 1 ? "disabled" : ""} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-arrow-down"></i>
                            </button>
                            <button type="button" data-action="toggle-pkg-active" data-id="${escapeHtml(pkg.id)}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${pkg.isActive ? "bg-[#E6F6F8] text-[#0D8A9E]" : "bg-slate-200 text-slate-700"}">
                                ${pkg.isActive ? "Active" : "Hidden"}
                            </button>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button type="button" data-action="edit-pkg" data-id="${escapeHtml(pkg.id)}" class="px-3.5 py-1.5 rounded-lg bg-[#0B2D5B] text-white hover:bg-[#0D8A9E] text-xs font-bold transition-colors">
                                <i class="fa-solid fa-pen mr-1"></i>Edit
                            </button>
                            <button type="button" data-action="delete-pkg" data-id="${escapeHtml(pkg.id)}" class="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center text-xs transition-colors">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `
                )
                .join("");
        }

        _renderVisasList() {
            const wrap = this.container.querySelector("#crudVisasContainer");
            if (!wrap) return;

            if (!this.visas.length) {
                wrap.innerHTML = `<div class="col-span-full bg-white rounded-2xl p-8 text-center text-slate-500 text-sm">No Visa services found. Click "Add Country Visa" to create one.</div>`;
                return;
            }

            wrap.innerHTML = this.visas
                .map(
                    (v, idx) => `
                <div class="admin-card-hover bg-white rounded-3xl p-5 border ${v.isActive ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"} shadow-card flex flex-col justify-between gap-4">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-start gap-3.5">
                            <div class="w-12 h-12 rounded-2xl bg-[#E6F6F8] text-2xl flex items-center justify-center shrink-0 overflow-hidden">
                                ${v.flagUrl ? `<img src="${escapeHtml(v.flagUrl)}" alt="" class="w-full h-full object-cover rounded-2xl">` : (v.flagEmoji ? escapeHtml(v.flagEmoji) : '<i class="fa-solid fa-globe text-[#0D8A9E]"></i>')}
                            </div>
                            <div>
                                <h4 class="text-base font-black text-[#0B2D5B]">${escapeHtml(v.countryName)}</h4>
                                <span class="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">${escapeHtml(v.visaType)}</span>
                                <p class="text-[11px] text-slate-500 mt-2">${escapeHtml(v.requirementsSummary)}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0">
                            <span class="text-sm font-black text-[#0D8A9E] block">PKR ${formatPKR(v.pricePKR)}</span>
                            <span class="text-[10px] text-slate-400 font-semibold">${escapeHtml(v.processingTime)}</span>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                        <div class="flex items-center gap-1">
                            <button type="button" data-action="move-visa" data-id="${escapeHtml(v.id)}" data-dir="up" ${idx === 0 ? "disabled" : ""} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-arrow-up"></i>
                            </button>
                            <button type="button" data-action="move-visa" data-id="${escapeHtml(v.id)}" data-dir="down" ${idx === this.visas.length - 1 ? "disabled" : ""} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-arrow-down"></i>
                            </button>
                            <button type="button" data-action="toggle-visa-active" data-id="${escapeHtml(v.id)}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${v.isActive ? "bg-[#E6F6F8] text-[#0D8A9E]" : "bg-slate-200 text-slate-700"}">
                                ${v.isActive ? "Active" : "Hidden"}
                            </button>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button type="button" data-action="edit-visa" data-id="${escapeHtml(v.id)}" class="px-3.5 py-1.5 rounded-lg bg-[#0B2D5B] text-white hover:bg-[#0D8A9E] text-xs font-bold transition-colors">
                                <i class="fa-solid fa-pen mr-1"></i>Edit
                            </button>
                            <button type="button" data-action="delete-visa" data-id="${escapeHtml(v.id)}" class="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center text-xs transition-colors">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `
                )
                .join("");
        }

        _renderWorkPermitsList() {
            const wrap = this.container.querySelector("#crudWorkPermitsContainer");
            if (!wrap) return;

            if (!this.workPermits || !this.workPermits.length) {
                wrap.innerHTML = `<div class="col-span-full bg-white rounded-2xl p-8 text-center text-slate-500 text-sm">No work permit destinations found. Click "Add Work Permit Country" to create one.</div>`;
                return;
            }

            const tagColors = {
                emerald: "bg-emerald-100 text-emerald-700",
                sky: "bg-sky-100 text-sky-700",
                amber: "bg-amber-100 text-amber-700",
                rose: "bg-rose-100 text-rose-700",
                indigo: "bg-indigo-100 text-indigo-700",
                slate: "bg-slate-100 text-slate-700"
            };

            wrap.innerHTML = this.workPermits
                .map((p, idx) => {
                    const tagCls = tagColors[String(p.tagStyle || "sky").toLowerCase()] || tagColors.sky;
                    const flagClass =
                        String(p.flagClass || "flag-eu")
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "") || "flag-eu";
                    const flagHtml = p.flagUrl
                        ? `<img src="${escapeHtml(p.flagUrl)}" alt="" class="w-[22px] h-[15px] object-cover rounded-[3px] mr-2 shrink-0">`
                        : `<span class="flag ${flagClass} mr-2"></span>`;
                    return `
                <div class="admin-card-hover bg-white rounded-3xl p-5 border ${p.isActive ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"} shadow-card flex flex-col justify-between gap-4">
                    <div class="space-y-2">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5">
                                <span class="bg-[#0B2D5B] text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">#${idx + 1}</span>
                                <span class="${tagCls} text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">${escapeHtml(p.tagText || "Applications Open")}</span>
                                ${p.isFeatured ? `<span class="bg-[#FEF3C7] text-[#8A6D0B] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-star mr-1"></i>Featured</span>` : ""}
                            </div>
                            <span class="text-xs font-bold text-slate-500"><i class="fa-regular fa-clock text-[#0D8A9E] mr-1"></i>${escapeHtml(p.timeline || "3-6 Months")}</span>
                        </div>
                        <h4 class="text-base font-black text-[#0B2D5B]">${flagHtml}${escapeHtml(p.cardTitle || p.countryName)}</h4>
                        <div class="text-xs text-slate-500 grid grid-cols-2 gap-1.5 bg-slate-50 p-3 rounded-2xl">
                            <span><i class="fa-solid fa-file-contract text-[#0D8A9E] mr-1"></i>${escapeHtml(p.permitType || "Work Permit")}</span>
                            <span><i class="fa-solid fa-passport text-[#0D8A9E] mr-1"></i>${escapeHtml(p.visaCode || "D-Visa")}</span>
                            <span class="col-span-2"><i class="fa-solid fa-briefcase text-[#0D8A9E] mr-1"></i>${escapeHtml(p.sectors || "General Labour")}</span>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                        <div class="flex items-center gap-1">
                            <button type="button" data-action="move-workpermit" data-id="${escapeHtml(p.id)}" data-dir="up" ${idx === 0 ? "disabled" : ""} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-arrow-up"></i>
                            </button>
                            <button type="button" data-action="move-workpermit" data-id="${escapeHtml(p.id)}" data-dir="down" ${idx === this.workPermits.length - 1 ? "disabled" : ""} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-arrow-down"></i>
                            </button>
                            <button type="button" data-action="toggle-workpermit-active" data-id="${escapeHtml(p.id)}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${p.isActive ? "bg-[#E6F6F8] text-[#0D8A9E]" : "bg-slate-200 text-slate-700"}">
                                ${p.isActive ? "Active" : "Hidden"}
                            </button>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button type="button" data-action="edit-workpermit" data-id="${escapeHtml(p.id)}" class="px-3.5 py-1.5 rounded-lg bg-[#0B2D5B] text-white hover:bg-[#0D8A9E] text-xs font-bold transition-colors">
                                <i class="fa-solid fa-pen mr-1"></i>Edit
                            </button>
                            <button type="button" data-action="delete-workpermit" data-id="${escapeHtml(p.id)}" class="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center text-xs transition-colors">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
                })
                .join("");
        }

        _renderWorkPermitProgrammesList() {
            const wrap = this.container.querySelector("#crudWorkPermitProgrammesContainer");
            if (!wrap) return;

            if (!this.workPermitProgrammes || !this.workPermitProgrammes.length) {
                wrap.innerHTML = `<div class="col-span-full bg-white rounded-3xl p-8 text-center text-slate-500">No Featured Work Permit Programmes found. Click "Add Featured Programme" to create one.</div>`;
                return;
            }

            wrap.innerHTML = this.workPermitProgrammes
                .map((prog, idx) => {
                    const flagClass = String(prog.flagClass || "flag-pl").toLowerCase().replace(/[^a-z0-9-]/g, "") || "flag-pl";
                    const categories = String(prog.jobCategories || "")
                        .split(/[|,]/)
                        .map((c) => c.trim())
                        .filter(Boolean);

                    return `
                    <div class="admin-card-hover bg-white rounded-3xl border-2 ${
                        prog.isActive
                            ? "border-[#0D8A9E] shadow-xl"
                            : "border-slate-200 opacity-60 bg-slate-50"
                    } overflow-hidden flex flex-col justify-between">
                        
                        <div>
                            <!-- Dual Image Mini Banner with Floating Centre Shield Badge -->
                            <div class="relative grid grid-cols-2 gap-1 bg-gradient-to-br from-[#05162E] via-[#0B2D5B] to-[#0D8A9E] h-44 overflow-hidden">
                                <div class="relative h-full overflow-hidden">
                                    <img src="${escapeHtml(prog.leftImageUrl)}" onerror="this.src='https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=900&q=80'" class="w-full h-full object-cover opacity-90">
                                    <div class="absolute inset-0 bg-gradient-to-t from-[#05162E]/90 via-transparent to-transparent"></div>
                                    <div class="absolute bottom-2 left-2.5">
                                        <span class="bg-[#0D8A9E] text-[8px] font-bold text-white px-1.5 py-0.5 rounded shadow">${escapeHtml(prog.leftImageBadge || "City Hub")}</span>
                                        <div class="text-[11px] font-bold text-white leading-tight mt-0.5">${escapeHtml(prog.leftCityTitle || "Warsaw")}</div>
                                    </div>
                                </div>
                                <div class="relative h-full overflow-hidden">
                                    <img src="${escapeHtml(prog.rightImageUrl)}" onerror="this.src='https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=900&q=80'" class="w-full h-full object-cover opacity-90">
                                    <div class="absolute inset-0 bg-gradient-to-t from-[#05162E]/90 via-transparent to-transparent"></div>
                                    <div class="absolute bottom-2 right-2.5 text-right">
                                        <span class="bg-[#0B2D5B] text-[8px] font-bold text-white px-1.5 py-0.5 rounded shadow">${escapeHtml(prog.rightImageBadge || "Logistics")}</span>
                                        <div class="text-[11px] font-bold text-white leading-tight mt-0.5">${escapeHtml(prog.rightCityTitle || "Wroc\u0142aw & Krak\u00f3w")}</div>
                                    </div>
                                </div>

                                <!-- Top Left Status Badges -->
                                <div class="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                                    <span class="bg-[#05162E]/90 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                                        Showcase #${idx + 1}
                                    </span>
                                    <span class="bg-[#D4AF37] text-[#05162E] text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                                        <i class="fa-solid fa-crown text-xs"></i> Featured
                                    </span>
                                    ${
                                        !prog.isActive
                                            ? `<span class="bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">Hidden</span>`
                                            : `<span class="bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">Shown</span>`
                                    }
                                </div>

                                <!-- Center Shield Badge -->
                                <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                    <div class="bg-gradient-to-b from-[#0B2D5B] via-[#0E4C7A] to-[#0D8A9E] text-white px-3.5 py-1.5 rounded-2xl border-2 border-white shadow-2xl text-center w-36 sm:w-40">
                                        <span class="text-[7.5px] font-bold uppercase tracking-widest text-sky-200 block">${escapeHtml(prog.shieldLabel || "WORK PERMIT")}</span>
                                        <div class="text-sm font-black leading-tight text-white uppercase">${escapeHtml(prog.shieldCountry || prog.countryName || "POLAND")}</div>
                                        <span class="text-[7.5px] font-semibold text-teal-200 block truncate">${escapeHtml(prog.shieldSub || "Type-A Permit + D-Visa")}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Programme Info Body -->
                            <div class="p-5 space-y-3">
                                <div class="flex items-start justify-between gap-2">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <span class="flag ${flagClass} flag-lg"></span>
                                            <h4 class="text-lg font-black text-[#0B2D5B] uppercase tracking-tight">Work Permit ${escapeHtml(prog.countryName)}</h4>
                                        </div>
                                        <span class="text-xs font-extrabold text-[#0D8A9E] block mt-0.5">${escapeHtml(prog.regionText || "EU & Schengen")}</span>
                                    </div>
                                    <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                                        \u25CF Status: ${escapeHtml(prog.statusText || "Open")}
                                    </span>
                                </div>

                                <!-- Permit & Visa Boxes Preview -->
                                <div class="grid grid-cols-2 gap-2 text-xs">
                                    <div class="bg-[#F0FAFC] border border-[#0D8A9E]/30 rounded-xl p-2.5">
                                        <span class="text-[9px] font-black uppercase tracking-wider text-[#0D8A9E] block">Work Permit</span>
                                        <strong class="text-[#0B2D5B] font-bold text-[11px] block leading-tight mt-0.5 truncate">${escapeHtml(prog.permitTypeLong || "Voivodeship Type-A Permit")}</strong>
                                    </div>
                                    <div class="bg-[#F3F6FB] border border-[#0B2D5B]/20 rounded-xl p-2.5">
                                        <span class="text-[9px] font-black uppercase tracking-wider text-[#0B2D5B] block">Entry Visa</span>
                                        <strong class="text-[#0B2D5B] font-bold text-[11px] block leading-tight mt-0.5 truncate">${escapeHtml(prog.visaTypeLong || "National D-Type Work Visa")}</strong>
                                    </div>
                                </div>

                                <!-- Schedule Strip Preview -->
                                <div class="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 text-center text-xs">
                                    <div>
                                        <span class="text-[9px] text-slate-400 font-bold uppercase block">Processing</span>
                                        <strong class="text-[#0D8A9E] font-black text-xs">${escapeHtml(prog.processing || "3-6 Mos")}</strong>
                                        <span class="text-[8px] text-slate-400 block">${escapeHtml(prog.processingNote || "Approx.")}</span>
                                    </div>
                                    <div class="border-x border-slate-200">
                                        <span class="text-[9px] text-slate-400 font-bold uppercase block">Contract</span>
                                        <strong class="text-[#0D8A9E] font-black text-xs">${escapeHtml(prog.contract || "1-3 Yrs")}</strong>
                                        <span class="text-[8px] text-slate-400 block">${escapeHtml(prog.contractNote || "Renewable")}</span>
                                    </div>
                                    <div>
                                        <span class="text-[9px] text-slate-400 font-bold uppercase block">Residence</span>
                                        <strong class="text-[#0D8A9E] font-black text-xs">${escapeHtml(prog.residence || "TRC")}</strong>
                                        <span class="text-[8px] text-slate-400 block">${escapeHtml(prog.residenceNote || "TRC")}</span>
                                    </div>
                                </div>

                                <!-- Job Categories Preview -->
                                ${
                                    categories.length
                                        ? `<div class="flex flex-wrap gap-1 pt-1">
                                            ${categories.slice(0, 5).map(cat => `<span class="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">${escapeHtml(cat)}</span>`).join("")}
                                            ${categories.length > 5 ? `<span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-[#E6F6F8] text-[#0D8A9E]">+${categories.length - 5} more</span>` : ""}
                                           </div>`
                                        : ""
                                }
                            </div>
                        </div>

                        <!-- CRUD Action Bar -->
                        <div class="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5">
                                <button type="button" data-action="move-wp-programme" data-id="${escapeHtml(prog.id)}" data-dir="up" ${idx === 0 ? "disabled" : ""} class="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs" title="Move Up">
                                    <i class="fa-solid fa-arrow-up"></i>
                                </button>
                                <button type="button" data-action="move-wp-programme" data-id="${escapeHtml(prog.id)}" data-dir="down" ${idx === this.workPermitProgrammes.length - 1 ? "disabled" : ""} class="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs" title="Move Down">
                                    <i class="fa-solid fa-arrow-down"></i>
                                </button>
                                <button type="button" data-action="toggle-wp-programme-active" data-id="${escapeHtml(prog.id)}" class="px-3 py-1.5 rounded-xl text-xs font-bold border ${prog.isActive ? "bg-[#E6F6F8] text-[#0D8A9E] border-[#0D8A9E]/20 hover:bg-[#D7F0F4]" : "bg-slate-200 text-slate-700 border-slate-300"}">
                                    ${prog.isActive ? "Visible" : "Hidden"}
                                </button>
                            </div>

                            <div class="flex items-center gap-1.5">
                                <button type="button" data-action="duplicate-wp-programme" data-id="${escapeHtml(prog.id)}" class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold" title="Duplicate Programme">
                                    <i class="fa-regular fa-copy mr-1"></i>Clone
                                </button>
                                <button type="button" data-action="edit-wp-programme" data-id="${escapeHtml(prog.id)}" class="px-3.5 py-1.5 rounded-xl bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white text-xs font-bold transition-colors shadow-sm">
                                    <i class="fa-solid fa-pen mr-1"></i>Edit Programme
                                </button>
                                <button type="button" data-action="delete-wp-programme" data-id="${escapeHtml(prog.id)}" class="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center text-xs transition-colors" title="Delete Programme">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                })
                .join("");
        }

        _autoGrowFields(root) {
            const scope = root || this.container;
            if (!scope || !scope.querySelectorAll) return;
            scope.querySelectorAll("textarea").forEach((el) => {
                if (!el.offsetParent) return;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
            });
        }

        _switchTab(tabName) {
            // Admin Access is owner-only: never open its panel for anyone
            // else, even if the tab button is somehow reached.
            if (tabName === "access" && !this._isOwnerUser()) {
                this.showToast("Only the owner can manage admin access.", "error");
                return;
            }
            this.activeTab = tabName;
            this.container.querySelectorAll(".admin-tab-btn").forEach((btn) => {
                const isMatch = btn.getAttribute("data-tab") === tabName;
                btn.className = isMatch
                    ? `admin-tab-btn bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] text-white font-extrabold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all ring-1 ring-[#D4AF37]/60`
                    : `admin-tab-btn text-slate-600 hover:bg-[#E6F6F8] font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all`;
            });
            // The class rewrite above wipes the access button's hidden +
            // span classes, so re-apply them here.
            this._updateAccessTabVisibility();

            ["spotlight", "umrah", "visas", "workpermit", "contacts", "enquiries", "access"].forEach((t) => {
                const panel = this.container.querySelector(`#admin-panel-${t}`);
                if (panel) {
                    panel.classList.toggle("hidden", t !== tabName);
                }
            });

            if (tabName === "access") {
                this._loadAdminAccessList();
            }

            this._autoGrowFields(this.container.querySelector(`#admin-panel-${tabName}`));
        }

        _switchCrudSubtab(subtab) {
            if (subtab === "packages") {
                this._switchTab("umrah");
            } else if (subtab === "visas") {
                this._switchTab("visas");
            }
        }

        // ----------------------------------------------------------------
        // ADMIN ACCESS (owner only): who may open the admin portal.
        // ----------------------------------------------------------------

        // True when the signed-in user is the owner. In local test mode
        // there is no owner account, so this is false — access management
        // does not apply locally.
        _isOwnerUser() {
            const db = window.zakirDB;
            return Boolean(db && typeof db.isOwner === "function" && db.isOwner(this.currentUser));
        }

        // Shows the "7. Admin Access" tab button only for the owner.
        // On small screens it sits as a full-width row of its own so the
        // grid stays tidy; on desktop it joins the row. Called from
        // _updateAuthView and _switchTab (whose class rewrite wipes it).
        _updateAccessTabVisibility() {
            const btn = this.container.querySelector('[data-tab="access"]');
            if (!btn) return;
            btn.classList.toggle("hidden", !this._isOwnerUser());
            btn.classList.add("col-span-2", "sm:col-span-3", "lg:col-span-1");
        }

        // Loads the allowlist and renders it. On the owner's first visit
        // the document is created automatically, seeded with the owner's
        // own email, so the list always exists from then on.
        async _loadAdminAccessList() {
            const db = window.zakirDB;
            const listEl = this.container.querySelector("#accessAdminList");
            const noteEl = this.container.querySelector("#accessRulesNote");
            const formEl = this.container.querySelector("#accessAddForm");
            if (noteEl) noteEl.classList.add("hidden");
            if (!db || db.mode !== "api" || typeof db.getAdminAllowlist !== "function") {
                if (formEl) formEl.classList.add("hidden");
                if (listEl) {
                    listEl.innerHTML = `<div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-800 text-sm font-bold">Admin access is not available in local test mode. This browser uses a single admin passphrase — other admins can only be added once the site has a real backend.</div>`;
                }
                return;
            }
            if (formEl) formEl.classList.remove("hidden");
            try {
                let list = await db.getAdminAllowlist();
                if (!list) {
                    const ownerEmail = String((this.currentUser && this.currentUser.email) || "").trim().toLowerCase();
                    await db.saveAdminAllowlist(ownerEmail ? [ownerEmail] : [], ownerEmail);
                    list = await db.getAdminAllowlist();
                }
                this._renderAdminAccessList(list ? list.emails : []);
            } catch (err) {
                // The admin list could not be read. Say so plainly
                // instead of failing silently.
                const loadMsg = "Could not load the admin list — try reopening this tab.";
                const toastMsg = "Could not load the admin list. Try again.";
                if (noteEl) {
                    noteEl.textContent = loadMsg;
                    noteEl.classList.remove("hidden");
                }
                this.showToast(toastMsg, "error");
                if (listEl) {
                    listEl.innerHTML = `<div class="bg-slate-50 rounded-2xl p-6 text-center text-slate-500 text-sm">The admin list could not be loaded.</div>`;
                }
            }
        }

        _renderAdminAccessList(emails) {
            const listEl = this.container.querySelector("#accessAdminList");
            if (!listEl) return;
            const ownerEmail = String((this.currentUser && this.currentUser.email) || "").trim().toLowerCase();
            const list = [...new Set((emails || []).map((e) => String(e || "").trim().toLowerCase()).filter(Boolean))];
            this._accessEmails = list;
            if (!list.length) {
                listEl.innerHTML = `<div class="bg-slate-50 rounded-2xl p-6 text-center text-slate-500 text-sm">No admins yet — only the owner can open the admin portal.</div>`;
                return;
            }
            listEl.innerHTML = list
                .map((email) => {
                    const isOwner = email === ownerEmail;
                    return `
                <div class="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="w-9 h-9 rounded-xl ${
                            isOwner
                                ? "bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] text-white"
                                : "bg-[#E6F6F8] text-[#0D8A9E]"
                        } flex items-center justify-center shrink-0">
                            <i class="fa-solid ${isOwner ? "fa-crown" : "fa-user"}"></i>
                        </span>
                        <div class="min-w-0">
                            <div class="text-sm font-bold text-[#0B2D5B] truncate">${escapeHtml(email)}</div>
                            <div class="text-[11px] text-slate-500">${
                                isOwner ? "Owner — can add and remove admins" : "Admin — can manage the website"
                            }</div>
                        </div>
                    </div>
                    ${
                        isOwner
                            ? `<span class="text-[10px] font-black uppercase bg-[#FEF3C7] text-[#8A6D0B] px-2.5 py-1 rounded-full shrink-0">Owner</span>`
                            : `<button type="button" data-action="access-remove" data-email="${escapeHtml(email)}" class="text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl transition-all shrink-0">Remove</button>`
                    }
                </div>`;
                })
                .join("");
        }

        // Shows/hides the temporary-password field for the "Create a new
        // account" mode, and updates the submit button label.
        _updateAccessAddMode() {
            const form = this.container.querySelector("#accessAddForm");
            if (!form) return;
            const mode = (form.querySelector('input[name="accessAddMode"]:checked') || {}).value || "existing";
            const passWrap = this.container.querySelector("#accessTempPassWrap");
            const passInput = this.container.querySelector("#accessAddTempPass");
            const label = this.container.querySelector("#accessAddBtnLabel");
            if (passWrap) passWrap.classList.toggle("hidden", mode !== "create");
            if (passInput) passInput.required = mode === "create";
            if (label) label.textContent = mode === "create" ? "Create account & add admin" : "Add admin";
        }

        // Adds an admin: either an existing account (email only) or a
        // brand-new account (email + temporary password, created so the
        // owner's session is untouched).
        // Either way the email lands on the allowlist, confirmed with the
        // usual save feedback. The temporary password is never logged.
        async _handleAccessAdd(submitBtn) {
            const db = window.zakirDB;
            const form = this.container.querySelector("#accessAddForm");
            if (!form || !db) return;
            const mode = (form.querySelector('input[name="accessAddMode"]:checked') || {}).value || "existing";
            const email = String(this.container.querySelector("#accessAddEmail").value || "").trim().toLowerCase();
            const tempPass = String(this.container.querySelector("#accessAddTempPass").value || "");
            const ownerEmail = String((this.currentUser && this.currentUser.email) || "").trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                this.showToast("Enter a valid email address.", "error");
                return;
            }
            if (mode === "create" && tempPass.length < 8) {
                this.showToast("Temporary password must be at least 8 characters.", "error");
                return;
            }
            const existing = this._accessEmails || [];
            if (existing.includes(email)) {
                this.showToast(`${email} is already an admin.`, "warning");
                return;
            }
            try {
                const result = await this._runSaveWithFeedback(submitBtn, async () => {
                    if (mode === "create") {
                        if (typeof db.createAdminAuthUser !== "function") {
                            throw new Error("Account creation needs the latest admin code — reload the admin page and try again.");
                        }
                        // Auth account first; if the allowlist save below
                        // fails, the account exists without access and can
                        // be added again with "Add an existing account".
                        const created = await db.createAdminAuthUser(email, tempPass);
                        return db.saveAdminAllowlist([...existing, created.email], ownerEmail);
                    }
                    return db.saveAdminAllowlist([...existing, email], ownerEmail);
                });
                // NOTE: no verify descriptor here — verifyDocSaved compares
                // fields with strict equality, which can never match an
                // emails array. _showSyncToast without verify still
                // confirms the save went through (or warns it didn't).
                this._showSyncToast(
                    result,
                    mode === "create"
                        ? `Account created for ${email} — share the temporary password with them, then they can sign in.`
                        : `${email} can now open the admin portal.`
                );
                const list = await db.getAdminAllowlist();
                this._accessEmails = list ? list.emails : [...existing, email];
                this._renderAdminAccessList(this._accessEmails);
                form.reset();
                this._updateAccessAddMode();
            } catch (err) {
                let msg = err && err.message ? err.message : "Could not add this admin.";
                if (err && err.code === "auth/email-already-in-use") {
                    msg = "An account with this email already exists — use 'Add an existing account' instead.";
                } else if (err && err.code === "auth/invalid-email") {
                    msg = "That email address doesn't look right.";
                } else if (err && (err.code === "permission-denied" || /permission/i.test(msg))) {
                    msg = "Could not save the admin list — try again.";
                }
                this.showToast(msg, "error");
            }
        }

        // Removes an admin from the allowlist. Two taps: the first arms
        // the button ("Tap again to remove"), the second confirms, so a
        // stray tap can't revoke someone. Removing only revokes portal
        // access — the sign-in account is NOT deleted. The owner
        // row has no remove button at all, and this guards it anyway.
        async _handleAccessRemove(email, button) {
            const db = window.zakirDB;
            const cleanEmail = String(email || "").trim().toLowerCase();
            if (!cleanEmail || !db) return;
            const ownerEmail = String((this.currentUser && this.currentUser.email) || "").trim().toLowerCase();
            if (cleanEmail === ownerEmail) {
                this.showToast("The owner cannot be removed.", "error");
                return;
            }
            if (this._accessRemoveArmed !== cleanEmail) {
                this._accessRemoveArmed = cleanEmail;
                if (button) {
                    button.textContent = "Tap again to remove";
                    button.classList.add("bg-rose-600", "text-white");
                }
                clearTimeout(this._accessRemoveTimer);
                this._accessRemoveTimer = setTimeout(() => {
                    this._accessRemoveArmed = null;
                    this._renderAdminAccessList(this._accessEmails || []);
                }, 5000);
                return;
            }
            clearTimeout(this._accessRemoveTimer);
            this._accessRemoveArmed = null;
            const remaining = (this._accessEmails || []).filter((e) => e !== cleanEmail);
            try {
                const result = await this._runSaveWithFeedback(button, () =>
                    db.saveAdminAllowlist(remaining, ownerEmail)
                );
                this._showSyncToast(result, `Removed ${cleanEmail} — they can no longer open the admin.`);
                this._accessEmails = remaining;
                this._renderAdminAccessList(remaining);
            } catch (err) {
                let msg = err && err.message ? err.message : "Could not remove this admin.";
                if (err && (err.code === "permission-denied" || /permission/i.test(msg))) {
                    msg = "Could not save the admin list — try again.";
                }
                this.showToast(msg, "error");
                this._renderAdminAccessList(this._accessEmails || []);
            }
        }

        // Two-tap delete confirmation, mirroring _handleAccessRemove: the
        // first tap arms the button ("Sure?"), the second tap (within 5s)
        // deletes. A stray tap can never delete content. Returns true
        // when the delete should run, false when this tap only armed it.
        _armDeleteConfirm(actionEl, key) {
            if (this._deleteArmedKey === key) {
                // Second tap: restore the button, then run the delete.
                this._disarmDeleteConfirm();
                return true;
            }
            this._disarmDeleteConfirm();
            this._deleteArmedKey = key;
            this._deleteArmedButton = actionEl;
            if (actionEl) {
                actionEl.dataset.deleteOrigHtml = actionEl.innerHTML;
                actionEl.dataset.deleteOrigClass = actionEl.className;
                actionEl.innerHTML = '<span class="text-[10px] font-black px-1">Sure?</span>';
                actionEl.style.width = "auto";
                actionEl.style.minWidth = "64px";
                actionEl.classList.remove("bg-rose-50", "text-rose-600");
                actionEl.classList.add("bg-rose-600", "text-white");
            }
            this._deleteArmedTimer = setTimeout(() => this._disarmDeleteConfirm(), 5000);
            return false;
        }

        _disarmDeleteConfirm() {
            clearTimeout(this._deleteArmedTimer);
            const btn = this._deleteArmedButton;
            if (btn && btn.isConnected && btn.dataset.deleteOrigHtml !== undefined) {
                btn.innerHTML = btn.dataset.deleteOrigHtml;
                btn.className = btn.dataset.deleteOrigClass;
                btn.style.width = "";
                btn.style.minWidth = "";
                delete btn.dataset.deleteOrigHtml;
                delete btn.dataset.deleteOrigClass;
            }
            this._deleteArmedKey = null;
            this._deleteArmedButton = null;
        }

        _bindGlobalEvents() {
            const db = window.zakirDB;

            // Surface browser-storage quota warnings from the database
            // layer (photos stored as DataURLs can fill LocalStorage) as
            // a toast.
            window.addEventListener("zakir-storage-quota", (e) => {
                const message =
                    (e && e.detail && e.detail.message) ||
                    "Browser storage is full — the local copy was not saved on this device.";
                this.showToast(message, "warning");
            });

            this.container.addEventListener("input", (e) => {
                const target = e.target;
                if (target && target.id === "enquirySearchInput") {
                    this.enquirySearch = target.value || "";
                    this._renderEnquiriesList();
                    return;
                }
                if (target && target.tagName === "TEXTAREA") {
                    target.style.height = "auto";
                    target.style.height = `${target.scrollHeight}px`;
                }
            });

            // Enquiry status changes (inbox list)
            this.container.addEventListener("change", async (e) => {
                const statusEl = e.target && e.target.closest ? e.target.closest("[data-enquiry-status]") : null;
                if (!statusEl) return;
                try {
                    const result = await db.updateEnquiry(statusEl.getAttribute("data-enquiry-status"), {
                        status: statusEl.value
                    });
                    this._showSyncToast(result, "Enquiry status updated.");
                } catch (err) {
                    this.showToast(err.message || "Could not update enquiry.", "error");
                }
            });

            const loginForm = this.container.querySelector("#adminLoginForm");
            if (loginForm) {
                loginForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const email = this.container.querySelector("#adminLoginEmail").value;
                    const pass = this.container.querySelector("#adminLoginPassword").value;
                    const errEl = this.container.querySelector("#adminLoginError");
                    try {
                        errEl.classList.add("hidden");
                        await db.login(email, pass);
                        this.showToast("Welcome back! Admin Portal unlocked.");
                    } catch (err) {
                        errEl.textContent = err.message;
                        errEl.classList.remove("hidden");
                        this.showToast(err.message || "Sign-in failed. Check your email and password.", "error");
                    }
                });
            }

            // Admin Access (owner only): add an existing account or create
            // a new one, and switch the temporary-password field on/off.
            const accessForm = this.container.querySelector("#accessAddForm");
            if (accessForm) {
                accessForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const submitBtn = e.submitter || accessForm.querySelector("button[type='submit']");
                    await this._handleAccessAdd(submitBtn);
                });
                accessForm.querySelectorAll('input[name="accessAddMode"]').forEach((radio) => {
                    radio.addEventListener("change", () => this._updateAccessAddMode());
                });
            }

            // Keep Calculator Tiers in sync with the primary deal price
            const spotPriceInput = this.container.querySelector("#spotStartingPrice");
            const autoScaleChk = this.container.querySelector("#calcAutoScaleToggle");

            const syncScaledInputs = (baseVal) => {
                if (autoScaleChk && autoScaleChk.checked) {
                    const scaled = window.calculateScaledTiers(baseVal);
                    this.container.querySelector("#rateSharing").value = scaled.sharingPrice;
                    this.container.querySelector("#rateQuad").value = scaled.quadPrice;
                    this.container.querySelector("#rateTriple").value = scaled.triplePrice;
                    this.container.querySelector("#rateDouble").value = scaled.doublePrice;
                }
            };

            if (autoScaleChk && spotPriceInput) {
                autoScaleChk.addEventListener("change", () => syncScaledInputs(spotPriceInput.value));
            }

            // Live sync the Routing Dropdown options whenever Manager/Secondary Name or WhatsApp is edited
            const routingSelect = this.container.querySelector("#contactActiveRouting");
            if (routingSelect) {
                routingSelect.addEventListener("change", () => {
                    this.selectedRoutingRole = routingSelect.value === "secondary" ? "secondary" : "manager";
                    this._syncRoutingSelectOptions();
                });
            }
            ["#contactManagerName", "#contactManagerWA", "#contactSecondaryName", "#contactSecondaryWA"].forEach(
                (sel) => {
                    const el = this.container.querySelector(sel);
                    if (el) {
                        el.addEventListener("input", () => this._syncRoutingSelectOptions());
                    }
                }
            );

            // Calculator & Media Form Submit
            const spotForm = this.container.querySelector("#spotlightAndCalcForm");
            if (spotForm) {
                spotForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    await this.saveAllPortalChanges(e.submitter);
                });
            }

            // Home, Umrah, Visa & Work Permit Page Content Forms Submit
            ["#homePageContentForm", "#umrahPageContentForm", "#visaPageContentForm", "#workPermitPageContentForm"].forEach((formSel) => {
                const formEl = this.container.querySelector(formSel);
                if (formEl) {
                    formEl.addEventListener("submit", async (e) => {
                        e.preventDefault();
                        await this.saveAllPortalChanges(e.submitter);
                    });
                }
            });

            // Media File Uploads (Tab 3)
            this.container.querySelectorAll("input[type='file'][data-upload-target]").forEach((fileInput) => {
                fileInput.addEventListener("change", async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const targetInputId = fileInput.getAttribute("data-upload-target");
                    const previewImgId = fileInput.getAttribute("data-preview-target");
                    const sizeText = this._formatFileSize(file.size);
                    const fileDesc = sizeText ? `${file.name} (${sizeText})` : file.name;

                    try {
                        const url = await this._runUploadWithFeedback(
                            `Uploading image ${fileDesc}…`,
                            "Saved in this browser as a local image",
                            () => db.uploadMediaFile(file)
                        );
                        const urlInput = this.container.querySelector(`#${targetInputId}`);
                        if (urlInput) urlInput.value = url;
                        const prevImg = this.container.querySelector(`#${previewImgId}`);
                        if (prevImg) {
                            prevImg.src = url;
                            prevImg.classList.remove("hidden");
                        }
                        if (previewImgId === "previewFlyerImg") {
                            const ph = this.container.querySelector("#previewFlyerPlaceholder");
                            if (ph) ph.classList.add("hidden");
                        }
                        if (url.startsWith("data:")) {
                            this.showToast("Image saved in this browser as a local image ✓ — click Save Changes to keep it.", "success", `Upload: ${fileDesc} · saved in this browser as a local image (stored with the site data on save)`);
                        } else {
                            this.showToast(`Image saved in this browser ✓ ${fileDesc} — click Save Changes.`, "success", "Saved in this browser as a local image");
                        }
                    } catch (err) {
                        this.showToast(`Upload failed: ${err.message || "Unknown error"}`, "error", `Upload: ${fileDesc}`);
                    }
                });
            });

            // About Us - Team Member Photo Uploads (opens the adjust editor;
            // the photo is only uploaded when Majeed taps Apply in the editor)
            this.container.querySelectorAll("input[type='file'][data-team-photo-upload]").forEach((fileInput) => {
                fileInput.addEventListener("change", (e) => {
                    const file = e.target.files && e.target.files[0];
                    fileInput.value = "";
                    if (!file) return;
                    const memberId = fileInput.getAttribute("data-team-photo-upload");
                    const member = TEAM_MEMBERS.find((m) => m.id === memberId);
                    const memberName = member ? member.name : memberId;
                    if (!file.type || !file.type.startsWith("image/")) {
                        this.showToast("Please pick an image file.", "error", `Team photo · ${memberName}`);
                        return;
                    }
                    this._openPhotoAdjust(memberId, memberName, URL.createObjectURL(file), file.name);
                });
            });
            this.container.querySelectorAll("[data-team-photo-adjust]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const memberId = btn.getAttribute("data-team-photo-adjust");
                    const member = TEAM_MEMBERS.find((m) => m.id === memberId);
                    const memberName = member ? member.name : memberId;
                    const urlInput = this.container.querySelector(`#teamPhotoUrl-${memberId}`);
                    const currentUrl = urlInput ? urlInput.value.trim() : "";
                    if (!currentUrl) {
                        this.showToast("Upload a photo first, then you can adjust it.", "warning", `Team photo · ${memberName}`);
                        return;
                    }
                    this._openPhotoAdjust(memberId, memberName, currentUrl, `${memberId}-photo.jpg`);
                });
            });
            this.container.querySelectorAll("[data-team-photo-remove]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    this._setTeamPhotoPreview(btn.getAttribute("data-team-photo-remove"), "");
                    this.showToast("Photo removed. Click Save Changes.", "warning");
                });
            });

            // Special Deal Modal Image File Uploads
            this.container.querySelectorAll("input[type='file'][data-deal-upload]").forEach((fileInput) => {
                fileInput.addEventListener("change", async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const targetId = fileInput.getAttribute("data-deal-upload");
                    const sizeText = this._formatFileSize(file.size);
                    const fileDesc = sizeText ? `${file.name} (${sizeText})` : file.name;
                    try {
                        const url = await this._runUploadWithFeedback(
                            `Optimizing deal image ${fileDesc}…`,
                            "Saved in this browser as a local image",
                            () => db.uploadMediaFile(file)
                        );
                        const inputEl = this.container.querySelector(`#${targetId}`);
                        if (inputEl) inputEl.value = url;
                        if (url.startsWith("data:")) {
                            this.showToast("Deal image saved in this browser as a local image ✓ — save the deal to keep it.", "success", `Deal image · ${fileDesc} · saved in this browser as a local image (stored with the site data on save)`);
                        } else {
                            this.showToast(`Deal image saved in this browser ✓ ${fileDesc} — save the deal to keep it.`, "success", "Saved in this browser as a local image");
                        }
                    } catch (err) {
                        this.showToast(`Upload failed: ${err.message || "Unknown error"}`, "error", `Deal image · ${fileDesc}`);
                    }
                });
            });

            // Special Flyer Deal Modal Form Submit
            const dealForm = this.container.querySelector("#dealCrudForm");
            if (dealForm) {
                dealForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const startingPrice = Number(this.container.querySelector("#dealEditPrice").value);
                    if (!startingPrice || startingPrice <= 0) {
                        this.showToast("Deal starting price must be greater than 0 PKR!", "error");
                        return;
                    }

                    const submitBtn = e.submitter || dealForm.querySelector("button[type='submit']");
                    try {
                        const result = await this._runSaveWithFeedback(submitBtn, () => db.saveSpecialDeal({
                            id: this.container.querySelector("#dealEditId").value || undefined,
                            monthLabel: this.container.querySelector("#dealEditMonth").value.trim(),
                            title: this.container.querySelector("#dealEditTitle").value.trim(),
                            startingPrice,
                            priceUnit: this.container.querySelector("#dealEditUnit").value.trim(),
                            badgeTag: this.container.querySelector("#dealEditBadgeTag").value.trim(),
                            departureDate: this.container.querySelector("#dealEditDep").value.trim(),
                            returnDate: this.container.querySelector("#dealEditRet").value.trim(),
                            duration: this.container.querySelector("#dealEditDuration").value.trim(),
                            leftFrameTitle: this.container.querySelector("#dealEditLeftTitle").value.trim(),
                            leftFrameBadge: this.container.querySelector("#dealEditLeftBadge").value.trim(),
                            madinahHotel: this.container.querySelector("#dealEditMadinahHotel").value.trim(),
                            madinahImageUrl: this.container.querySelector("#dealEditMadinahUrl").value.trim(),
                            rightFrameTitle: this.container.querySelector("#dealEditRightTitle").value.trim(),
                            rightFrameBadge: this.container.querySelector("#dealEditRightBadge").value.trim(),
                            makkahHotel: this.container.querySelector("#dealEditMakkahHotel").value.trim(),
                            makkahImageUrl: this.container.querySelector("#dealEditMakkahUrl").value.trim(),
                            servicesIncluded: {
                                roundTrip: this.container.querySelector("#dealSrvRoundTrip").checked,
                                visa: this.container.querySelector("#dealSrvVisa").checked,
                                hotel: this.container.querySelector("#dealSrvHotel").checked,
                                transport: this.container.querySelector("#dealSrvTransport").checked
                            },
                            isActive: this.container.querySelector("#dealEditActive").checked,
                            isPrimary: this.container.querySelector("#dealEditPrimary").checked
                        }));

                        this.container.querySelector("#dealCrudModal").classList.add("hidden");
                        this._showSyncToast(
                            result,
                            "Special Flyer Deal saved in this browser.",
                            "success",
                            this._verifyFor("special_deals", result && result.deal, ["startingPrice", "monthLabel"])
                        );
                    } catch (err) {
                        this.showToast(err.message || "Could not save the deal.", "error");
                    }
                });
            }

            // Tab 4 Contacts Form Submit
            const contactsForm = this.container.querySelector("#contactsForm");
            if (contactsForm) {
                contactsForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    await this.saveAllPortalChanges(e.submitter);
                });
            }

            // Package Modal Submit
            const pkgForm = this.container.querySelector("#pkgCrudForm");
            if (pkgForm) {
                pkgForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const price = Number(this.container.querySelector("#pkgEditPrice").value);
                    if (!price || price <= 0) {
                        this.showToast("Package price must be positive!", "error");
                        return;
                    }

                    const submitBtn = e.submitter || pkgForm.querySelector("button[type='submit']");
                    try {
                        const result = await this._runSaveWithFeedback(submitBtn, () => db.saveUmrahPackage({
                            id: this.container.querySelector("#pkgEditId").value || undefined,
                            title: this.container.querySelector("#pkgEditTitle").value.trim(),
                            badgeText: this.container.querySelector("#pkgEditBadge").value.trim(),
                            price,
                            roomType: this.container.querySelector("#pkgEditRoom").value.trim(),
                            duration: this.container.querySelector("#pkgEditDuration").value.trim(),
                            departureDate: this.container.querySelector("#pkgEditDep").value.trim(),
                            returnDate: this.container.querySelector("#pkgEditRet").value.trim(),
                            makkahHotelDist: this.container.querySelector("#pkgEditMakkahDist").value.trim(),
                            madinahHotelDist: this.container.querySelector("#pkgEditMadinahDist").value.trim(),
                            services: this.container
                                .querySelector("#pkgEditServices")
                                .value.split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            isActive: this.container.querySelector("#pkgEditActive").checked,
                            isFeatured: this.container.querySelector("#pkgEditFeatured").checked
                        }));

                        this.container.querySelector("#pkgCrudModal").classList.add("hidden");
                        this._showSyncToast(
                            result,
                            "Umrah Package saved in this browser.",
                            "success",
                            this._verifyFor("umrah_packages", result && result.package, ["price", "title"])
                        );
                    } catch (err) {
                        this.showToast(err.message || "Could not save the package.", "error");
                    }
                });
            }

            // Visa Modal Submit
            const visaForm = this.container.querySelector("#visaCrudForm");
            if (visaForm) {
                visaForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const pricePKR = Number(this.container.querySelector("#visaEditPrice").value);
                    if (isNaN(pricePKR) || pricePKR < 0) {
                        this.showToast("Visa price cannot be negative!", "error");
                        return;
                    }

                    const submitBtn = e.submitter || visaForm.querySelector("button[type='submit']");
                    try {
                        const result = await this._runSaveWithFeedback(submitBtn, () => db.saveVisaService({
                            id: this.container.querySelector("#visaEditId").value || undefined,
                            countryName: this.container.querySelector("#visaEditCountry").value.trim(),
                            flagEmoji: this.container.querySelector("#visaEditFlag").value.trim(),
                            flagUrl: this.container.querySelector("#visaEditFlagUrl").value.trim(),
                            visaType: this.container.querySelector("#visaEditType").value.trim(),
                            processingTime: this.container.querySelector("#visaEditTime").value.trim(),
                            pricePKR,
                            imageUrl: this.container.querySelector("#visaEditImage").value.trim(),
                            requirementsSummary: this.container.querySelector("#visaEditReqs").value.trim(),
                            isActive: this.container.querySelector("#visaEditActive").checked
                        }));

                        this.container.querySelector("#visaCrudModal").classList.add("hidden");
                        this._showSyncToast(
                            result,
                            "Country Visa saved in this browser.",
                            "success",
                            this._verifyFor("visa_services", result && result.visa, ["pricePKR", "countryName", "flagUrl"])
                        );
                    } catch (err) {
                        this.showToast(err.message || "Could not save the visa.", "error");
                    }
                });
            }

            // Work Permit Modal Submit
            const workPermitForm = this.container.querySelector("#workPermitCrudForm");
            if (workPermitForm) {
                workPermitForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const countryName = this.container.querySelector("#wpEditCountry").value.trim();
                    if (!countryName) {
                        this.showToast("Country name is required!", "error");
                        return;
                    }

                    const ticksRaw = this.container.querySelector("#wpEditTicks").value;
                    const ticks = ticksRaw
                        .split(/\r?\n|\|/)
                        .map((t) => t.trim())
                        .filter(Boolean);

                    const submitBtn = e.submitter || workPermitForm.querySelector("button[type='submit']");
                    try {
                        const result = await this._runSaveWithFeedback(submitBtn, () => db.saveWorkPermit({
                            id: this.container.querySelector("#wpEditId").value || undefined,
                            countryName,
                            cardTitle: this.container.querySelector("#wpEditTitle").value.trim(),
                            flagClass: this.container.querySelector("#wpEditFlag").value.trim(),
                            flagUrl: this.container.querySelector("#wpEditFlagUrl").value.trim(),
                            tagText: this.container.querySelector("#wpEditTag").value.trim(),
                            tagStyle: this.container.querySelector("#wpEditTagStyle").value,
                            timeline: this.container.querySelector("#wpEditTimeline").value.trim(),
                            permitType: this.container.querySelector("#wpEditPermitType").value.trim(),
                            visaCode: this.container.querySelector("#wpEditVisaCode").value.trim(),
                            contract: this.container.querySelector("#wpEditContract").value.trim(),
                            residence: this.container.querySelector("#wpEditResidence").value.trim(),
                            sectors: this.container.querySelector("#wpEditSectors").value.trim(),
                            ticks,
                            isActive: this.container.querySelector("#wpEditActive").checked,
                            isFeatured: this.container.querySelector("#wpEditFeatured").checked
                        }));

                        this.container.querySelector("#workPermitCrudModal").classList.add("hidden");
                        this._showSyncToast(
                            result,
                            "Work Permit Country saved in this browser.",
                            "success",
                            this._verifyFor("work_permits", result && result.permit, ["countryName", "cardTitle", "flagUrl"])
                        );
                    } catch (err) {
                        this.showToast(err.message || "Could not save the work permit.", "error");
                    }
                });
            }

            // Work Permit Country Flag Upload (stored as flagUrl; the CSS flag
            // class stays as the fallback when no image is uploaded).
            const wpFlagUploadBtn = this.container.querySelector("[data-wp-flag-upload]");
            const wpFlagFileInput = this.container.querySelector("[data-wp-flag-file]");
            if (wpFlagUploadBtn && wpFlagFileInput) {
                wpFlagUploadBtn.addEventListener("click", () => wpFlagFileInput.click());

                wpFlagFileInput.addEventListener("change", async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const countryName = this.container.querySelector("#wpEditCountry").value.trim() || "country";
                    const sizeText = this._formatFileSize(file.size);
                    const fileDesc = sizeText ? `${file.name} (${sizeText})` : file.name;
                    try {
                        const url = await this._runUploadWithFeedback(
                            `Uploading flag ${fileDesc}…`,
                            `Country flag · ${countryName} · Saved in this browser as a local image`,
                            () => db.uploadMediaFile(file, "zakir_work_permits")
                        );
                        this.container.querySelector("#wpEditFlagUrl").value = url;
                        this._setWpFlagPreview(url);
                        if (url.startsWith("data:")) {
                            this.showToast("Flag saved in this browser as a local image ✓ — save the country to keep it.", "success", `Country flag · ${countryName} · ${fileDesc} · saved in this browser as a local image (stored with the site data on save)`);
                        } else {
                            this.showToast(`Flag saved in this browser ✓ ${fileDesc} — save the country to keep it.`, "success", `Country flag · ${countryName} · Saved in this browser as a local image`);
                        }
                    } catch (err) {
                        this.showToast(`Flag upload failed: ${err.message || "Unknown error"}`, "error", `Country flag · ${countryName} · ${fileDesc}`);
                    } finally {
                        wpFlagFileInput.value = "";
                    }
                });
            }

            const wpFlagRemoveBtn = this.container.querySelector("[data-wp-flag-remove]");
            if (wpFlagRemoveBtn) {
                wpFlagRemoveBtn.addEventListener("click", () => {
                    this.container.querySelector("#wpEditFlagUrl").value = "";
                    this._setWpFlagPreview("");
                    this.showToast("Flag image removed — the CSS flag will be used instead.", "info", "Country flag removed");
                });
            }

            // Visa Flag Upload (stored as flagUrl; the code/emoji stays as
            // the fallback when no image is uploaded). Same pattern as the
            // work-permit country flag, but saved as a local image.
            const visaFlagUploadBtn = this.container.querySelector("[data-visa-flag-upload]");
            const visaFlagFileInput = this.container.querySelector("[data-visa-flag-file]");
            if (visaFlagUploadBtn && visaFlagFileInput) {
                visaFlagUploadBtn.addEventListener("click", () => visaFlagFileInput.click());

                visaFlagFileInput.addEventListener("change", async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const countryName = this.container.querySelector("#visaEditCountry").value.trim() || "country";
                    const sizeText = this._formatFileSize(file.size);
                    const fileDesc = sizeText ? `${file.name} (${sizeText})` : file.name;
                    try {
                        const url = await this._runUploadWithFeedback(
                            `Uploading flag ${fileDesc}…`,
                            `Visa flag · ${countryName} · Saved in this browser as a local image`,
                            () => db.uploadMediaFile(file, "zakir_media")
                        );
                        this.container.querySelector("#visaEditFlagUrl").value = url;
                        this._setVisaFlagPreview(url);
                        if (url.startsWith("data:")) {
                            this.showToast("Flag saved in this browser as a local image ✓ — save the visa to keep it.", "success", `Visa flag · ${countryName} · ${fileDesc} · saved in this browser as a local image (stored with the site data on save)`);
                        } else {
                            this.showToast(`Flag saved in this browser ✓ ${fileDesc} — save the visa to keep it.`, "success", `Visa flag · ${countryName} · Saved in this browser as a local image`);
                        }
                    } catch (err) {
                        this.showToast(`Flag upload failed: ${err.message || "Unknown error"}`, "error", `Visa flag · ${countryName} · ${fileDesc}`);
                    } finally {
                        visaFlagFileInput.value = "";
                    }
                });
            }

            const visaFlagRemoveBtn = this.container.querySelector("[data-visa-flag-remove]");
            if (visaFlagRemoveBtn) {
                visaFlagRemoveBtn.addEventListener("click", () => {
                    this.container.querySelector("#visaEditFlagUrl").value = "";
                    this._setVisaFlagPreview("");
                    this.showToast("Flag image removed — the code/emoji will be used instead.", "info", "Visa flag removed");
                });
            }

            // Featured Work Permit Programme Image Uploads
            this.container.querySelectorAll("[data-wp-prog-image-target]").forEach((btn) => {
                const targetId = btn.getAttribute("data-wp-prog-image-target");
                const fileInput = btn.parentElement.querySelector("input[type='file']");
                if (!fileInput) return;

                btn.addEventListener("click", () => fileInput.click());

                fileInput.addEventListener("change", async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const sizeText = this._formatFileSize(file.size);
                    const fileDesc = sizeText ? `${file.name} (${sizeText})` : file.name;
                    try {
                        const url = await this._runUploadWithFeedback(
                            `Optimizing programme image ${fileDesc}…`,
                            "Saved in this browser as a local image",
                            () => db.uploadMediaFile(file, "zakir_work_permits")
                        );
                        const inputEl = this.container.querySelector(`#${targetId}`);
                        if (inputEl) inputEl.value = url;
                        if (url.startsWith("data:")) {
                            this.showToast("Programme image saved in this browser as a local image ✓ — save the programme to keep it.", "success", `Programme image · ${fileDesc} · saved in this browser as a local image (stored with the site data on save)`);
                        } else {
                            this.showToast(`Programme image saved in this browser ✓ ${fileDesc} — save the programme to keep it.`, "success", "Saved in this browser as a local image");
                        }
                    } catch (err) {
                        this.showToast(`Upload failed: ${err.message || "Unknown error"}`, "error", `Programme image · ${fileDesc}`);
                    }
                });
            });

            // Featured Work Permit Programme Modal Submit
            const wpProgForm = this.container.querySelector("#wpProgrammeCrudForm");
            if (wpProgForm) {
                wpProgForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const countryName = this.container.querySelector("#wpProgEditCountry").value.trim();
                    if (!countryName) {
                        this.showToast("Country name is required.", "error");
                        return;
                    }

                    const programmeData = {
                        id: this.container.querySelector("#wpProgEditId").value.trim() || undefined,
                        countryName,
                        flagClass: this.container.querySelector("#wpProgEditFlag").value.trim() || "flag-pl",
                        statusText: this.container.querySelector("#wpProgEditStatus").value.trim() || "Open",
                        regionText: this.container.querySelector("#wpProgEditRegion").value.trim() || "EU & Schengen",
                        leftCityTitle: this.container.querySelector("#wpProgEditLeftTitle").value.trim() || "Warsaw",
                        leftImageBadge: this.container.querySelector("#wpProgEditLeftBadge").value.trim() || "Capital & Business Hub",
                        leftImageUrl: this.container.querySelector("#wpProgEditLeftUrl").value.trim() || "./assets/warsaw-poland.jpg",
                        rightCityTitle: this.container.querySelector("#wpProgEditRightTitle").value.trim() || "Wroc\u0142aw & Krak\u00f3w",
                        rightImageBadge: this.container.querySelector("#wpProgEditRightBadge").value.trim() || "Industry & Logistics",
                        rightImageUrl: this.container.querySelector("#wpProgEditRightUrl").value.trim() || "./assets/krakow-wroclaw-poland.jpg",
                        shieldLabel: this.container.querySelector("#wpProgEditShieldLabel").value.trim() || "Work Permit",
                        shieldCountry: this.container.querySelector("#wpProgEditShieldCountry").value.trim() || countryName.toUpperCase(),
                        shieldSub: this.container.querySelector("#wpProgEditShieldSub").value.trim() || "Type-A Permit + D-Visa",
                        shieldStatus: this.container.querySelector("#wpProgEditShieldStatus").value.trim() || "Applications Open",
                        permitTypeLong: this.container.querySelector("#wpProgEditPermitTypeLong").value.trim() || "Voivodeship Type-A Permit (Zezwolenie na prac\u0119)",
                        visaTypeLong: this.container.querySelector("#wpProgEditVisaTypeLong").value.trim() || "National D-Type Work Visa (Schengen Valid)",
                        processing: this.container.querySelector("#wpProgEditProcessing").value.trim() || "3\u20136 Months",
                        processingNote: this.container.querySelector("#wpProgEditProcessingNote").value.trim() || "Approx.",
                        contract: this.container.querySelector("#wpProgEditContract").value.trim() || "1\u20133 Years",
                        contractNote: this.container.querySelector("#wpProgEditContractNote").value.trim() || "Renewable",
                        residence: this.container.querySelector("#wpProgEditResidence").value.trim() || "Karta Pobytu",
                        residenceNote: this.container.querySelector("#wpProgEditResidenceNote").value.trim() || "TRC",
                        jobCategories: this.container.querySelector("#wpProgEditJobCategories").value.trim(),
                        applyCountry: countryName,
                        isActive: this.container.querySelector("#wpProgEditActive").checked
                    };

                    const submitBtn = e.submitter || wpProgForm.querySelector("button[type='submit']");
                    try {
                        const result = await this._runSaveWithFeedback(submitBtn, () => db.saveWorkPermitProgramme(programmeData));
                        this.container.querySelector("#wpProgrammeCrudModal").classList.add("hidden");
                        this._showSyncToast(
                            result,
                            "Featured Work Permit Programme saved in this browser.",
                            "success",
                            this._verifyFor("work_permit_programmes", result && result.programme, ["countryName"])
                        );
                    } catch (err) {
                        this.showToast(err.message || "Could not save the programme.", "error");
                    }
                });
            }

            // Delegated Click Actions
            this.container.addEventListener("click", async (e) => {
                const tabBtn = e.target.closest("[data-tab]");
                if (tabBtn) {
                    this._switchTab(tabBtn.getAttribute("data-tab"));
                    return;
                }

                const subtabBtn = e.target.closest("[data-crud-subtab]");
                if (subtabBtn) {
                    this._switchCrudSubtab(subtabBtn.getAttribute("data-crud-subtab"));
                    return;
                }

                const actionEl = e.target.closest("[data-action]");
                if (!actionEl) return;
                const action = actionEl.getAttribute("data-action");

                if (action === "save-push-all") {
                    await this.saveAllPortalChanges(actionEl);
                } else if (action === "logout") {
                    await db.logout();
                    this.showToast("Admin session locked.", "warning");
                } else if (action === "access-remove") {
                    await this._handleAccessRemove(actionEl.getAttribute("data-email"), actionEl);
                } else if (action === "open-activity-log") {
                    this._setActivityPanelOpen(true);
                } else if (action === "close-activity-log") {
                    this._setActivityPanelOpen(false);
                } else if (action === "clear-activity-log") {
                    this._clearActivityLog();
                } else if (action === "close-drawer") {
                    await this.saveAllPortalChanges(actionEl);
                    this.onCloseDrawer();
                } else if (action === "open-deal-modal") {
                    this._openDealModal(null);
                } else if (action === "close-deal-modal") {
                    this.container.querySelector("#dealCrudModal").classList.add("hidden");
                } else if (action === "edit-deal") {
                    const deal = this.specialDeals.find((d) => d.id === actionEl.getAttribute("data-id"));
                    if (deal) this._openDealModal(deal);
                } else if (action === "duplicate-deal") {
                    try {
                        const result = await db.duplicateSpecialDeal(actionEl.getAttribute("data-id"));
                        this._showSyncToast(result, "Special Flyer Deal cloned & saved in this browser.");
                    } catch (err) {
                        this.showToast(err.message || "Could not clone the deal.", "error");
                    }
                } else if (action === "set-primary-deal") {
                    const deal = this.specialDeals.find((d) => d.id === actionEl.getAttribute("data-id"));
                    if (deal) {
                        try {
                            const result = await db.saveSpecialDeal({ ...deal, isPrimary: true, isActive: true });
                            this._showSyncToast(result, `"${deal.monthLabel}" set as Primary Deal!`);
                        } catch (err) {
                            this.showToast(err.message || "Could not set the primary deal.", "error");
                        }
                    }
                } else if (action === "toggle-deal-active") {
                    const deal = this.specialDeals.find((d) => d.id === actionEl.getAttribute("data-id"));
                    if (deal) {
                        try {
                            const result = await db.saveSpecialDeal({ ...deal, isActive: !deal.isActive });
                            this._showSyncToast(
                                result,
                                `Special Deal ${!deal.isActive ? "shown on the website" : "hidden from the website"}.`
                            );
                        } catch (err) {
                            this.showToast(err.message || "Could not update the deal.", "error");
                        }
                    }
                } else if (action === "move-deal") {
                    try {
                        const result = await db.reorderSpecialDeal(
                            actionEl.getAttribute("data-id"),
                            actionEl.getAttribute("data-dir")
                        );
                        this._showSyncToast(result, "Deal order updated.");
                    } catch (err) {
                        this.showToast(err.message || "Could not reorder deals.", "error");
                    }
                } else if (action === "delete-deal") {
                    if (!this._armDeleteConfirm(actionEl, "delete-deal:" + actionEl.getAttribute("data-id"))) return;
                    try {
                        const result = await db.deleteSpecialDeal(actionEl.getAttribute("data-id"));
                        this._showSyncToast(result, "Special Flyer Deal deleted.", "warning");
                    } catch (err) {
                        this.showToast(err.message, "error");
                    }
                } else if (action === "open-pkg-modal") {
                    this._openPkgModal(null);
                } else if (action === "close-pkg-modal") {
                    this.container.querySelector("#pkgCrudModal").classList.add("hidden");
                } else if (action === "edit-pkg") {
                    const pkg = this.packages.find((p) => p.id === actionEl.getAttribute("data-id"));
                    if (pkg) this._openPkgModal(pkg);
                } else if (action === "delete-pkg") {
                    if (!this._armDeleteConfirm(actionEl, "delete-pkg:" + actionEl.getAttribute("data-id"))) return;
                    try {
                        const result = await db.deleteUmrahPackage(actionEl.getAttribute("data-id"));
                        this._showSyncToast(result, "Package deleted.", "warning");
                    } catch (err) {
                        this.showToast(err.message || "Could not delete the package.", "error");
                    }
                } else if (action === "toggle-pkg-active") {
                    const pkg = this.packages.find((p) => p.id === actionEl.getAttribute("data-id"));
                    if (pkg) {
                        try {
                            const result = await db.saveUmrahPackage({ ...pkg, isActive: !pkg.isActive });
                            this._showSyncToast(result, `Package ${!pkg.isActive ? "shown on the website" : "hidden from the website"}.`);
                        } catch (err) {
                            this.showToast(err.message || "Could not update the package.", "error");
                        }
                    }
                } else if (action === "move-pkg") {
                    try {
                        const result = await db.reorderUmrahPackage(
                            actionEl.getAttribute("data-id"),
                            actionEl.getAttribute("data-dir")
                        );
                        this._showSyncToast(result, "Package order updated.");
                    } catch (err) {
                        this.showToast(err.message || "Could not reorder packages.", "error");
                    }
                } else if (action === "open-visa-modal") {
                    this._openVisaModal(null);
                } else if (action === "close-visa-modal") {
                    this.container.querySelector("#visaCrudModal").classList.add("hidden");
                } else if (action === "edit-visa") {
                    const visa = this.visas.find((v) => v.id === actionEl.getAttribute("data-id"));
                    if (visa) this._openVisaModal(visa);
                } else if (action === "delete-visa") {
                    if (!this._armDeleteConfirm(actionEl, "delete-visa:" + actionEl.getAttribute("data-id"))) return;
                    try {
                        const result = await db.deleteVisaService(actionEl.getAttribute("data-id"));
                        this._showSyncToast(result, "Visa destination deleted.", "warning");
                    } catch (err) {
                        this.showToast(err.message || "Could not delete the visa.", "error");
                    }
                } else if (action === "toggle-visa-active") {
                    const visa = this.visas.find((v) => v.id === actionEl.getAttribute("data-id"));
                    if (visa) {
                        try {
                            const result = await db.saveVisaService({ ...visa, isActive: !visa.isActive });
                            this._showSyncToast(result, `Visa card ${!visa.isActive ? "shown on the website" : "hidden from the website"}.`);
                        } catch (err) {
                            this.showToast(err.message || "Could not update the visa.", "error");
                        }
                    }
                } else if (action === "move-visa") {
                    try {
                        const result = await db.reorderVisaService(
                            actionEl.getAttribute("data-id"),
                            actionEl.getAttribute("data-dir")
                        );
                        this._showSyncToast(result, "Visa order updated.");
                    } catch (err) {
                        this.showToast(err.message || "Could not reorder visas.", "error");
                    }
                } else if (action === "open-workpermit-modal") {
                    this._openWorkPermitModal(null);
                } else if (action === "close-workpermit-modal") {
                    this.container.querySelector("#workPermitCrudModal").classList.add("hidden");
                } else if (action === "edit-workpermit") {
                    const permit = this.workPermits.find((p) => p.id === actionEl.getAttribute("data-id"));
                    if (permit) this._openWorkPermitModal(permit);
                } else if (action === "delete-workpermit") {
                    if (!this._armDeleteConfirm(actionEl, "delete-workpermit:" + actionEl.getAttribute("data-id"))) return;
                    try {
                        const result = await db.deleteWorkPermit(actionEl.getAttribute("data-id"));
                        this._showSyncToast(result, "Work permit destination deleted.", "warning");
                    } catch (err) {
                        this.showToast(err.message || "Could not delete the work permit.", "error");
                    }
                } else if (action === "toggle-workpermit-active") {
                    const permit = this.workPermits.find((p) => p.id === actionEl.getAttribute("data-id"));
                    if (permit) {
                        try {
                            const result = await db.saveWorkPermit({ ...permit, isActive: !permit.isActive });
                            this._showSyncToast(
                                result,
                                `Work permit card ${!permit.isActive ? "shown on the website" : "hidden from the website"}.`
                            );
                        } catch (err) {
                            this.showToast(err.message || "Could not update the work permit.", "error");
                        }
                    }
                } else if (action === "move-workpermit") {
                    try {
                        const result = await db.reorderWorkPermit(
                            actionEl.getAttribute("data-id"),
                            actionEl.getAttribute("data-dir")
                        );
                        this._showSyncToast(result, "Work permit order updated.");
                    } catch (err) {
                        this.showToast(err.message || "Could not reorder work permits.", "error");
                    }
                } else if (action === "open-wp-programme-modal") {
                    this._openWorkPermitProgrammeModal(null);
                } else if (action === "close-wp-programme-modal") {
                    this.container.querySelector("#wpProgrammeCrudModal").classList.add("hidden");
                } else if (action === "edit-wp-programme") {
                    const prog = this.workPermitProgrammes.find((p) => p.id === actionEl.getAttribute("data-id"));
                    if (prog) this._openWorkPermitProgrammeModal(prog);
                } else if (action === "duplicate-wp-programme") {
                    try {
                        const result = await db.duplicateWorkPermitProgramme(actionEl.getAttribute("data-id"));
                        this._showSyncToast(result, "Featured Programme cloned & saved in this browser.");
                    } catch (err) {
                        this.showToast(err.message || "Could not clone the programme.", "error");
                    }
                } else if (action === "toggle-wp-programme-active") {
                    const prog = this.workPermitProgrammes.find((p) => p.id === actionEl.getAttribute("data-id"));
                    if (prog) {
                        try {
                            const result = await db.saveWorkPermitProgramme({ ...prog, isActive: !prog.isActive });
                            this._showSyncToast(
                                result,
                                `Featured Programme ${!prog.isActive ? "shown on the website" : "hidden from the website"}.`
                            );
                        } catch (err) {
                            this.showToast(err.message || "Could not update the programme.", "error");
                        }
                    }
                } else if (action === "move-wp-programme") {
                    try {
                        const result = await db.reorderWorkPermitProgramme(
                            actionEl.getAttribute("data-id"),
                            actionEl.getAttribute("data-dir")
                        );
                        this._showSyncToast(result, "Programme order updated.");
                    } catch (err) {
                        this.showToast(err.message || "Could not reorder programmes.", "error");
                    }
                } else if (action === "delete-wp-programme") {
                    if (!this._armDeleteConfirm(actionEl, "delete-wp-programme:" + actionEl.getAttribute("data-id"))) return;
                    try {
                        const result = await db.deleteWorkPermitProgramme(actionEl.getAttribute("data-id"));
                        this._showSyncToast(result, "Featured Programme deleted.", "warning");
                    } catch (err) {
                        this.showToast(err.message, "error");
                    }
                } else if (action === "enquiry-filter") {
                    this.enquiryFilter = actionEl.getAttribute("data-filter") || "all";
                    this.container.querySelectorAll(".enquiry-filter-btn").forEach((btn) => {
                        const isActive = btn.getAttribute("data-filter") === this.enquiryFilter;
                        btn.className = isActive
                            ? "enquiry-filter-btn bg-[#0B2D5B] text-white text-xs font-bold px-3.5 py-2 rounded-full"
                            : "enquiry-filter-btn bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-full";
                    });
                    this._renderEnquiriesList();
                } else if (action === "enquiry-export") {
                    this._exportEnquiriesCsv();
                } else if (action === "enquiry-delete") {
                    try {
                        const result = await db.deleteEnquiry(actionEl.getAttribute("data-id"));
                        this._showSyncToast(result, "Enquiry deleted.", "warning");
                    } catch (err) {
                        this.showToast(err.message || "Could not delete the enquiry.", "error");
                    }
                } else if (action === "reset-flyer-defaults") {
                    this.container.querySelector("#resetConfirmModal").classList.remove("hidden");
                } else if (action === "cancel-reset-modal") {
                    this.container.querySelector("#resetConfirmModal").classList.add("hidden");
                } else if (action === "confirm-reset-defaults") {
                    try {
                        const result = await db.resetToFlyerDefaults();
                        this.container.querySelector("#resetConfirmModal").classList.add("hidden");
                        this._showSyncToast(result, "Restored Original January Flyer Defaults (PKR 232,000)!");
                    } catch (err) {
                        this.showToast(err.message || "Could not restore defaults.", "error");
                    }
                }
            });
        }

        _openDealModal(deal) {
            this.container.querySelector("#dealModalTitle").textContent = deal
                ? "Edit Special Flyer Deal"
                : "Create New Special Flyer Deal";
            this.container.querySelector("#dealEditId").value = (deal && deal.id) || "";
            this.container.querySelector("#dealEditMonth").value =
                (deal && deal.monthLabel) || "February & Shaban Special";
            this.container.querySelector("#dealEditTitle").value = (deal && deal.title) || "UMRAH PACKAGE";
            this.container.querySelector("#dealEditPrice").value = (deal && deal.startingPrice) || 245000;
            this.container.querySelector("#dealEditUnit").value =
                (deal && deal.priceUnit) || "PER PERSON (SHARING)";
            this.container.querySelector("#dealEditBadgeTag").value =
                (deal && deal.badgeTag) || "All-Inclusive Deal";
            this.container.querySelector("#dealEditDep").value = (deal && deal.departureDate) || "Feb 15, 2026";
            this.container.querySelector("#dealEditRet").value = (deal && deal.returnDate) || "Mar 01, 2026";
            this.container.querySelector("#dealEditDuration").value = (deal && deal.duration) || "14 Nights";

            this.container.querySelector("#dealEditLeftTitle").value =
                (deal && deal.leftFrameTitle) || "Madinah Munawwarah";
            this.container.querySelector("#dealEditLeftBadge").value =
                (deal && deal.leftFrameBadge) || "Ziyarat & Stay";
            this.container.querySelector("#dealEditMadinahHotel").value =
                (deal && deal.madinahHotel) || "Al Eiman Taibah / Similar (Near Markazia)";
            this.container.querySelector("#dealEditMadinahUrl").value =
                (deal && deal.madinahImageUrl) ||
                "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80";

            this.container.querySelector("#dealEditRightTitle").value =
                (deal && deal.rightFrameTitle) || "Makkah Mukarramah";
            this.container.querySelector("#dealEditRightBadge").value =
                (deal && deal.rightFrameBadge) || "Haram View Options";
            this.container.querySelector("#dealEditMakkahHotel").value =
                (deal && deal.makkahHotel) || "Emaar Al Khalil / Similar (Shuttle / Walk)";
            this.container.querySelector("#dealEditMakkahUrl").value =
                (deal && deal.makkahImageUrl) ||
                "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80";

            const srv = (deal && deal.servicesIncluded) || {};
            this.container.querySelector("#dealSrvRoundTrip").checked = srv.roundTrip !== false;
            this.container.querySelector("#dealSrvVisa").checked = srv.visa !== false;
            this.container.querySelector("#dealSrvHotel").checked = srv.hotel !== false;
            this.container.querySelector("#dealSrvTransport").checked = srv.transport !== false;

            this.container.querySelector("#dealEditActive").checked = deal ? Boolean(deal.isActive) : true;
            this.container.querySelector("#dealEditPrimary").checked = deal ? Boolean(deal.isPrimary) : false;

            const dealModal = this.container.querySelector("#dealCrudModal");
            dealModal.classList.remove("hidden");
            this._autoGrowFields(dealModal);
        }

        _openPkgModal(pkg) {
            this._switchCrudSubtab("packages");
            this.container.querySelector("#pkgModalTitle").textContent = pkg
                ? "Edit Umrah Package"
                : "Add New Umrah Package";
            this.container.querySelector("#pkgEditId").value = (pkg && pkg.id) || "";
            this.container.querySelector("#pkgEditTitle").value = (pkg && pkg.title) || "";
            this.container.querySelector("#pkgEditBadge").value = (pkg && pkg.badgeText) || "Special Offer";
            this.container.querySelector("#pkgEditPrice").value = (pkg && pkg.price) || 232000;
            this.container.querySelector("#pkgEditRoom").value = (pkg && pkg.roomType) || "Sharing (Quad)";
            this.container.querySelector("#pkgEditDuration").value = (pkg && pkg.duration) || "14 Nights / 15 Days";
            this.container.querySelector("#pkgEditDep").value = (pkg && pkg.departureDate) || "Jan 26, 2026";
            this.container.querySelector("#pkgEditRet").value = (pkg && pkg.returnDate) || "Feb 09, 2026";
            this.container.querySelector("#pkgEditMakkahDist").value =
                (pkg && pkg.makkahHotelDist) || "450m Walking Distance";
            this.container.querySelector("#pkgEditMadinahDist").value =
                (pkg && pkg.madinahHotelDist) || "300m Near Haram";
            this.container.querySelector("#pkgEditServices").value =
                pkg && Array.isArray(pkg.services)
                    ? pkg.services.join(", ")
                    : "Return Air Ticket, Umrah E-Visa, Hotel Stay, Luxury Transport";
            this.container.querySelector("#pkgEditActive").checked = pkg ? Boolean(pkg.isActive) : true;
            this.container.querySelector("#pkgEditFeatured").checked = pkg ? Boolean(pkg.isFeatured) : false;

            const pkgModal = this.container.querySelector("#pkgCrudModal");
            pkgModal.classList.remove("hidden");
            this._autoGrowFields(pkgModal);
        }

        _openVisaModal(visa) {
            this._switchCrudSubtab("visas");
            this.container.querySelector("#visaModalTitle").textContent = visa
                ? "Edit Country Visa"
                : "Add New Country Visa";
            this.container.querySelector("#visaEditId").value = (visa && visa.id) || "";
            this.container.querySelector("#visaEditCountry").value = (visa && visa.countryName) || "";
            this.container.querySelector("#visaEditFlag").value = (visa && visa.flagEmoji) || "";
            this.container.querySelector("#visaEditFlagUrl").value = (visa && visa.flagUrl) || "";
            this._setVisaFlagPreview((visa && visa.flagUrl) || "");
            this.container.querySelector("#visaEditType").value = (visa && visa.visaType) || "Tourist E-Visa";
            this.container.querySelector("#visaEditTime").value = (visa && visa.processingTime) || "3-5 Working Days";
            this.container.querySelector("#visaEditPrice").value =
                visa && visa.pricePKR !== undefined ? visa.pricePKR : 25000;
            this.container.querySelector("#visaEditImage").value = (visa && visa.imageUrl) || "";
            this.container.querySelector("#visaEditReqs").value =
                (visa && visa.requirementsSummary) || "Passport Scan, CNIC Copy, White Background Photo";
            this.container.querySelector("#visaEditActive").checked = visa ? Boolean(visa.isActive) : true;

            const visaModal = this.container.querySelector("#visaCrudModal");
            visaModal.classList.remove("hidden");
            this._autoGrowFields(visaModal);
        }

        // Shows the uploaded flag image in the country editor (or hides the
        // preview when there is no flag image — the CSS flag is used then).
        _setWpFlagPreview(url) {
            const img = this.container.querySelector("#wpEditFlagPreview");
            if (!img) return;
            if (url) {
                img.src = url;
                img.classList.remove("hidden");
            } else {
                img.removeAttribute("src");
                img.classList.add("hidden");
            }
        }

        // Shows the uploaded flag image in the visa editor (or hides the
        // preview when there is no flag image — the code/emoji is used then).
        _setVisaFlagPreview(url) {
            const img = this.container.querySelector("#visaEditFlagPreview");
            if (!img) return;
            if (url) {
                img.src = url;
                img.classList.remove("hidden");
            } else {
                img.removeAttribute("src");
                img.classList.add("hidden");
            }
        }

        _openWorkPermitModal(permit) {
            this.container.querySelector("#workPermitModalTitle").textContent = permit
                ? "Edit Work Permit Country"
                : "Add New Work Permit Country";
            this.container.querySelector("#wpEditId").value = (permit && permit.id) || "";
            this.container.querySelector("#wpEditCountry").value = (permit && permit.countryName) || "";
            this.container.querySelector("#wpEditTitle").value = (permit && permit.cardTitle) || "";
            this.container.querySelector("#wpEditFlag").value = (permit && permit.flagClass) || "flag-eu";
            this.container.querySelector("#wpEditFlagUrl").value = (permit && permit.flagUrl) || "";
            this._setWpFlagPreview((permit && permit.flagUrl) || "");
            this.container.querySelector("#wpEditTag").value = (permit && permit.tagText) || "Applications Open";
            this.container.querySelector("#wpEditTagStyle").value = (permit && permit.tagStyle) || "emerald";
            this.container.querySelector("#wpEditTimeline").value = (permit && permit.timeline) || "3-6 Months";
            this.container.querySelector("#wpEditPermitType").value =
                (permit && permit.permitType) || "Type-A Work Permit";
            this.container.querySelector("#wpEditVisaCode").value = (permit && permit.visaCode) || "D-Visa";
            this.container.querySelector("#wpEditContract").value =
                (permit && permit.contract) || "1-3 Years, Renewable";
            this.container.querySelector("#wpEditResidence").value =
                (permit && permit.residence) || "Residence Permit (TRC)";
            this.container.querySelector("#wpEditSectors").value =
                (permit && permit.sectors) || "Logistics, Factory, Construction";
            const ticks = permit && Array.isArray(permit.ticks) ? permit.ticks : [];
            this.container.querySelector("#wpEditTicks").value = ticks.length
                ? ticks.join("\n")
                : "Schengen Access\nEU Labour Rights\nSocial Security";
            this.container.querySelector("#wpEditActive").checked = permit ? Boolean(permit.isActive) : true;
            this.container.querySelector("#wpEditFeatured").checked = permit ? Boolean(permit.isFeatured) : false;

            const wpModal = this.container.querySelector("#workPermitCrudModal");
            wpModal.classList.remove("hidden");
            this._autoGrowFields(wpModal);
        }

        _openWorkPermitProgrammeModal(prog) {
            this.container.querySelector("#wpProgModalTitle").textContent = prog
                ? "Edit Featured Work Permit Programme"
                : "Add Featured Work Permit Programme";
            this.container.querySelector("#wpProgEditId").value = (prog && prog.id) || "";
            this.container.querySelector("#wpProgEditCountry").value = (prog && prog.countryName) || "Poland";
            this.container.querySelector("#wpProgEditFlag").value = (prog && prog.flagClass) || "flag-pl";
            this.container.querySelector("#wpProgEditStatus").value = (prog && prog.statusText) || "Open";
            this.container.querySelector("#wpProgEditRegion").value = (prog && prog.regionText) || "EU & Schengen";

            this.container.querySelector("#wpProgEditLeftTitle").value = (prog && prog.leftCityTitle) || "Warsaw";
            this.container.querySelector("#wpProgEditLeftBadge").value = (prog && prog.leftImageBadge) || "Capital & Business Hub";
            this.container.querySelector("#wpProgEditLeftUrl").value = (prog && prog.leftImageUrl) || "./assets/warsaw-poland.jpg";

            this.container.querySelector("#wpProgEditRightTitle").value = (prog && prog.rightCityTitle) || "Wroc\u0142aw & Krak\u00f3w";
            this.container.querySelector("#wpProgEditRightBadge").value = (prog && prog.rightImageBadge) || "Industry & Logistics";
            this.container.querySelector("#wpProgEditRightUrl").value = (prog && prog.rightImageUrl) || "./assets/krakow-wroclaw-poland.jpg";

            this.container.querySelector("#wpProgEditShieldLabel").value = (prog && prog.shieldLabel) || "Work Permit";
            this.container.querySelector("#wpProgEditShieldCountry").value = (prog && prog.shieldCountry) || "POLAND";
            this.container.querySelector("#wpProgEditShieldSub").value = (prog && prog.shieldSub) || "Type-A Permit + D-Visa";
            this.container.querySelector("#wpProgEditShieldStatus").value = (prog && prog.shieldStatus) || "Applications Open";

            this.container.querySelector("#wpProgEditPermitTypeLong").value = (prog && prog.permitTypeLong) || "Voivodeship Type-A Permit (Zezwolenie na prac\u0119)";
            this.container.querySelector("#wpProgEditVisaTypeLong").value = (prog && prog.visaTypeLong) || "National D-Type Work Visa (Schengen Valid)";

            this.container.querySelector("#wpProgEditProcessing").value = (prog && prog.processing) || "3\u20136 Months";
            this.container.querySelector("#wpProgEditProcessingNote").value = (prog && prog.processingNote) || "Approx.";
            this.container.querySelector("#wpProgEditContract").value = (prog && prog.contract) || "1\u20133 Years";
            this.container.querySelector("#wpProgEditContractNote").value = (prog && prog.contractNote) || "Renewable";
            this.container.querySelector("#wpProgEditResidence").value = (prog && prog.residence) || "Karta Pobytu";
            this.container.querySelector("#wpProgEditResidenceNote").value = (prog && prog.residenceNote) || "TRC";

            this.container.querySelector("#wpProgEditJobCategories").value = (prog && prog.jobCategories) || "Warehouse & Logistics|Construction|Factory & Production|CE Drivers|Hospitality|Agriculture";
            this.container.querySelector("#wpProgEditActive").checked = prog ? Boolean(prog.isActive) : true;

            const modal = this.container.querySelector("#wpProgrammeCrudModal");
            modal.classList.remove("hidden");
            this._autoGrowFields(modal);
        }
    }

    window.formatPKR = formatPKR;
    window.cleanWhatsAppDigits = cleanWhatsAppDigits;
    window.AdminPortalManager = AdminPortalManager;
})(window);
