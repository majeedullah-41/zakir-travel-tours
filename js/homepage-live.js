/**
 * Zakir Travel & Tours - Real-Time Homepage Binding & Interactive Widgets
 * Supports Multi-Deal Special Flyer Showcases (CRUD), Umrah Packages, Visas,
 * Live Cost Calculator, and Instant Contact/WhatsApp Routing.
 * Works natively on both file:// (direct browser open) and http/https servers!
 */
(function (window) {
    "use strict";

    const zakirDB = window.zakirDB;
    const formatPKR = window.formatPKR;
    const cleanWhatsAppDigits = window.cleanWhatsAppDigits;
    const AdminPortalManager = window.AdminPortalManager;

    let liveSiteConfig = zakirDB.getLocalSiteConfig();
    let liveSpecialDeals = zakirDB.getLocalSpecialDeals ? zakirDB.getLocalSpecialDeals() : [];
    let livePackages = zakirDB.getLocalUmrahPackages();
    let liveVisas = zakirDB.getLocalVisaServices();
    let liveWorkPermits = zakirDB.getLocalWorkPermits ? zakirDB.getLocalWorkPermits() : [];
    let liveWorkPermitProgrammes = zakirDB.getLocalWorkPermitProgrammes
        ? zakirDB.getLocalWorkPermitProgrammes()
        : [];
    let liveWorkPermitFaqs = zakirDB.getLocalWorkPermitFaqs ? zakirDB.getLocalWorkPermitFaqs() : [];
    let selectedSpecialDealFilter = "ALL"; // "ALL" or specific deal.id
    let selectedWorkPermitProgrammeFilter = "ALL"; // "ALL" or specific programme.id
    let adminDrawerInstance = null;

    function escapeHtmlAttr(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    /**
     * Resolves the active WhatsApp number, ensuring that if the admin updated
     * managerWhatsApp / secondaryWhatsApp, the active routing number is always valid.
     */
    function getResolvedActiveWhatsApp(config) {
        const c = (config && config.contacts) || {};
        const mgrWA = cleanWhatsAppDigits(c.managerWhatsApp || "923490558345");
        const secWA = cleanWhatsAppDigits(c.secondaryWhatsApp || "923434159182");
        const rawActive = cleanWhatsAppDigits(c.activeBookingWhatsApp);

        if (rawActive && (rawActive === mgrWA || rawActive === secWA)) {
            return rawActive;
        }
        return mgrWA || secWA || "923490558345";
    }

    // Lead capture: save the enquiry first, then open WhatsApp. The save
    // must never block WhatsApp — if it fails we still open the chat and
    // tell the visitor their message was still sent via WhatsApp.
    function showPublicToast(message) {
        let toast = document.getElementById("zakirPublicToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "zakirPublicToast";
            toast.className =
                "fixed bottom-5 left-1/2 -translate-x-1/2 z-[90] max-w-[92vw] bg-[#0B2D5B] text-white text-sm font-bold px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5";
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.display = "flex";
        clearTimeout(showPublicToast._timer);
        showPublicToast._timer = setTimeout(() => {
            toast.style.display = "none";
        }, 4500);
    }

    async function saveEnquiryThenOpenWhatsApp(enquiry, whatsappUrl) {
        let saved = null;
        try {
            if (zakirDB && typeof zakirDB.saveEnquiry === "function") {
                saved = await zakirDB.saveEnquiry({ ...enquiry, whatsappSent: true });
            }
        } catch (err) {
            saved = null;
        }
        showPublicToast(
            saved
                ? "Thanks — your enquiry is saved. Opening WhatsApp…"
                : "Opening WhatsApp — your message is ready to send there."
        );
        window.open(whatsappUrl, "_blank");
        return saved;
    }

    // ============================================================================
    // 1. REAL-TIME SNAPSHOT BINDINGS
    // ============================================================================

    function initHomepageBindings() {
        zakirDB.onSiteConfigSnapshot((config) => {
            liveSiteConfig = config;
            renderSiteConfigToDOM(config);
            renderSpecialDealsShowcase(liveSpecialDeals);
            renderUmrahPackagesGrid(livePackages);
            renderVisaServicesGrid(liveVisas);
            renderWorkPermitsGrid(liveWorkPermits);
            renderCountryPills(liveWorkPermits);
            renderFeaturedWorkPermitsShowcase(liveWorkPermitProgrammes);
            renderWorkPermitFaqs(liveWorkPermitFaqs);
            populateHeroUmrahDropdown(livePackages, liveSpecialDeals, config);
            updateCalculator();
        });

        if (zakirDB.onSpecialDealsSnapshot) {
            zakirDB.onSpecialDealsSnapshot((deals) => {
                liveSpecialDeals = Array.isArray(deals) ? deals : [];
                renderSpecialDealsShowcase(liveSpecialDeals);
                populateHeroUmrahDropdown(livePackages, liveSpecialDeals, liveSiteConfig);
            });
        }

        zakirDB.onUmrahPackagesSnapshot((packages) => {
            livePackages = packages;
            renderUmrahPackagesGrid(packages);
            populateHeroUmrahDropdown(packages, liveSpecialDeals, liveSiteConfig);
        });

        zakirDB.onVisaServicesSnapshot((visas) => {
            liveVisas = visas;
            renderVisaServicesGrid(visas);
            populateHeroVisaDropdown(visas);
        });

        if (zakirDB.onWorkPermitsSnapshot) {
            zakirDB.onWorkPermitsSnapshot((permits) => {
                liveWorkPermits = Array.isArray(permits) ? permits : [];
                renderWorkPermitsGrid(liveWorkPermits);
                renderCountryPills(liveWorkPermits);
                rebuildWorkPermitAssessmentSelects();
            });
        }

        if (zakirDB.onWorkPermitProgrammesSnapshot) {
            zakirDB.onWorkPermitProgrammesSnapshot((programmes) => {
                liveWorkPermitProgrammes = Array.isArray(programmes) ? programmes : [];
                renderFeaturedWorkPermitsShowcase(liveWorkPermitProgrammes);
            });
        }

        if (zakirDB.onWorkPermitFaqsSnapshot) {
            zakirDB.onWorkPermitFaqsSnapshot((faqs) => {
                liveWorkPermitFaqs = Array.isArray(faqs) ? faqs : [];
                renderWorkPermitFaqs(liveWorkPermitFaqs);
            });
        }

        // Re-sync when tab gains focus (helpful for file:// cross-tab edits)
        window.addEventListener("focus", () => {
            liveSiteConfig = zakirDB.getLocalSiteConfig();
            liveSpecialDeals = zakirDB.getLocalSpecialDeals ? zakirDB.getLocalSpecialDeals() : [];
            livePackages = zakirDB.getLocalUmrahPackages();
            liveVisas = zakirDB.getLocalVisaServices();
            liveWorkPermits = zakirDB.getLocalWorkPermits ? zakirDB.getLocalWorkPermits() : [];
            liveWorkPermitProgrammes = zakirDB.getLocalWorkPermitProgrammes
                ? zakirDB.getLocalWorkPermitProgrammes()
                : [];
            liveWorkPermitFaqs = zakirDB.getLocalWorkPermitFaqs
                ? zakirDB.getLocalWorkPermitFaqs()
                : [];
            renderSiteConfigToDOM(liveSiteConfig);
            renderSpecialDealsShowcase(liveSpecialDeals);
            renderUmrahPackagesGrid(livePackages);
            renderVisaServicesGrid(liveVisas);
            renderWorkPermitsGrid(liveWorkPermits);
            renderCountryPills(liveWorkPermits);
            renderFeaturedWorkPermitsShowcase(liveWorkPermitProgrammes);
            renderWorkPermitFaqs(liveWorkPermitFaqs);
            populateHeroUmrahDropdown(livePackages, liveSpecialDeals, liveSiteConfig);
            updateCalculator();
        });

        checkAdminHashRoute();
        window.addEventListener("hashchange", checkAdminHashRoute);

        document.addEventListener("click", (e) => {
            const target = e.target instanceof Element ? e.target : null;
            if (!target) return;
            const filterBtn = target.closest("[data-deal-filter]");
            if (filterBtn) {
                window.filterSpecialDealsShowcase(filterBtn.getAttribute("data-deal-filter"));
                return;
            }
            const wpProgFilterBtn = target.closest("[data-wp-prog-filter]");
            if (wpProgFilterBtn) {
                window.filterWorkPermitProgrammesShowcase(
                    wpProgFilterBtn.getAttribute("data-wp-prog-filter")
                );
                return;
            }
            const flyerBtn = target.closest("[data-open-flyer]");
            if (flyerBtn) {
                window.openPromotionalFlyerModal(flyerBtn.getAttribute("data-open-flyer"));
                return;
            }
            const bookBtn = target.closest("[data-book-service]");
            if (bookBtn) {
                window.openBookingModal(bookBtn.getAttribute("data-book-service"));
                return;
            }
            const wpApplyBtn = target.closest("[data-wp-apply]");
            if (wpApplyBtn && typeof window.selectWorkPermitCountry === "function") {
                window.selectWorkPermitCountry(wpApplyBtn.getAttribute("data-wp-apply"));
                return;
            }
            const posterBtn = target.closest("[data-programme-poster]");
            if (posterBtn) {
                window.openProgrammePosterModal(posterBtn.getAttribute("data-programme-poster"));
                return;
            }
        });

        // Image fallbacks ride on data-fallback attributes, never inline
        // onerror handlers: an admin-entered URL containing a quote could
        // break out of an inline handler's JS string (stored XSS). Error
        // events do not bubble, so this listens in the capture phase and
        // swaps in the fallback once per image.
        document.addEventListener(
            "error",
            (e) => {
                const img = e.target instanceof Element ? e.target.closest("img[data-fallback]") : null;
                if (!img) return;
                const fallback = img.getAttribute("data-fallback");
                if (!fallback || img.getAttribute("src") === fallback || img.dataset.fallbackApplied) return;
                img.dataset.fallbackApplied = "1";
                img.src = fallback;
            },
            true
        );
    }

    // ============================================================================
    // 2. RENDER SITE CONFIG (HEADER, HERO, CALCULATOR TIERS, CONTACTS & ROUTING)
    // ============================================================================

    function renderSiteConfigToDOM(config) {
        if (!config) return;
        const s = config.spotlight || {};
        const r = config.calculatorRates || {};
        const c = config.contacts || {};

        const managerWA = cleanWhatsAppDigits(c.managerWhatsApp || "923490558345");
        const secondaryWA = cleanWhatsAppDigits(c.secondaryWhatsApp || "923434159182");
        const activeWA = getResolvedActiveWhatsApp(config);

        const managerTel = String(c.managerPhone || "+92 349 0558345").replace(/\s+/g, "");
        const secondaryTel = String(c.secondaryPhone || "+92 343 4159182").replace(/\s+/g, "");

        const cleanManagerDisplayName = (c.managerName || "Inam Khan").replace(/\s*\(Manager\)/i, "").trim();
        const cleanSecondaryDisplayName = (c.secondaryName || "Sadiq Ullah").trim();

        const activeAgentName =
            activeWA === secondaryWA && secondaryWA !== managerWA
                ? cleanSecondaryDisplayName
                : cleanManagerDisplayName;

        const agencyName = c.agencyName || "Zakir Travel & Tours";
        const taglinePrimary = c.taglinePrimary || "Your Journey Our Priority";
        const taglineSecondary = c.taglineSecondary || "Your Journey Our Responsibility";
        const rawOffice = (c && c.officeAddress) || "";
        const isInvalidOrLegacyOffice = !rawOffice || /fazal banda/i.test(rawOffice) || /potohar|blue area|islamabad/i.test(rawOffice);
        const officeAddress = isInvalidOrLegacyOffice
            ? "2nd Floor, Hayat Market, Matta Swat, Khyber Pakhtunkhwa, Pakistan"
            : rawOffice;

        document.title = `${agencyName} | ${taglinePrimary}`;

        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        // --- SEO: per-page title + description (A-03) ---
        // The phone inside the description is composed from the manager's
        // stored phone, never typed into the stored description string.
        // The stored seoDescription ends either with "…WhatsApp" (phone
        // follows directly) or with a full stop (a "WhatsApp …" clause
        // is appended), so the rendered text matches the old hardcoded
        // meta descriptions exactly.
        const setMetaContent = (selector, value) => {
            const el = document.querySelector(selector);
            if (el && value) el.setAttribute("content", value);
        };
        const composeSeoDescription = (desc) => {
            const d = String(desc || "").trim();
            if (!d) return "";
            const phone = c.managerPhone || "+92 349 0558345";
            return /whatsapp\s*$/i.test(d) ? `${d} ${phone}.` : `${d} WhatsApp ${phone}.`;
        };
        const pageFile = (window.location.pathname || "").split("/").pop() || "index.html";
        const seoPageKey =
            pageFile === "umrah-packages.html"
                ? "umrah"
                : pageFile === "visa-services.html"
                  ? "visas"
                  : pageFile === "work-permit.html"
                    ? "workPermit"
                    : pageFile === "contact.html"
                      ? "contact"
                      : pageFile === "404.html"
                        ? "notFound"
                        : "home";
        const pContentForSeo = config.pageContent || {};
        const seoPage = pContentForSeo[seoPageKey] || {};
        if (seoPageKey === "notFound") {
            document.title = `Page Not Found (404) | ${agencyName}`;
            const notFoundDesc = composeSeoDescription(
                "This page could not be found on " +
                    agencyName +
                    ". Visit our homepage for Umrah packages, visa services and Europe work permits, or reach us on WhatsApp"
            );
            setMetaContent('meta[name="description"]', notFoundDesc);
            setMetaContent('meta[property="og:description"]', notFoundDesc);
            setMetaContent('meta[name="twitter:description"]', notFoundDesc);
        } else if (seoPage.seoTitle || seoPage.seoDescription) {
            if (seoPage.seoTitle) document.title = seoPage.seoTitle;
            const seoDesc = composeSeoDescription(seoPage.seoDescription);
            setMetaContent('meta[name="description"]', seoDesc);
            setMetaContent('meta[property="og:description"]', seoDesc);
            setMetaContent('meta[name="twitter:description"]', seoDesc);
            setMetaContent('meta[property="og:title"]', document.title);
            setMetaContent('meta[name="twitter:title"]', document.title);
        }

        const generalWAMsg = encodeURIComponent(
            `Assalam-o-Alaikum ${agencyName}! I would like to inquire about your travel & Umrah services.`
        );
        // --- Floating WhatsApp button (A-04) + 404 WhatsApp link (A-06) ---
        // The number follows the admin's resolved active WhatsApp; each
        // page's own pre-written message text is kept, not replaced.
        const rewriteWhatsAppHref = (el) => {
            if (!el) return;
            const existing = el.getAttribute("href") || "";
            const match = existing.match(/[?&]text=([^&]*)/);
            const text = match ? match[1] : generalWAMsg;
            el.href = `https://wa.me/${activeWA}?text=${text}`;
        };
        rewriteWhatsAppHref(document.getElementById("floatingWhatsAppBtn"));
        rewriteWhatsAppHref(document.getElementById("notFoundWhatsAppBtn"));

        // --- Top Contact Bar (header AND footer copies) ---
        setText("topBarOfficeAddress", officeAddress);
        setText("topBarManagerName", cleanManagerDisplayName);
        setText("topBarManagerPhone", c.managerPhone || "+92 349 0558345");
        setText("topBarSecondaryName", cleanSecondaryDisplayName);
        setText("topBarSecondaryPhone", c.secondaryPhone || "+92 343 4159182");
        setText("footerTopBarOfficeAddress", officeAddress);
        setText("footerTopBarManagerName", cleanManagerDisplayName);
        setText("footerTopBarManagerPhone", c.managerPhone || "+92 349 0558345");
        setText("footerTopBarSecondaryName", cleanSecondaryDisplayName);
        setText("footerTopBarSecondaryPhone", c.secondaryPhone || "+92 343 4159182");

        const topManagerLink = document.getElementById("topBarManagerLink");
        if (topManagerLink) topManagerLink.href = `tel:${managerTel}`;

        const topSecondaryLink = document.getElementById("topBarSecondaryLink");
        if (topSecondaryLink) topSecondaryLink.href = `tel:${secondaryTel}`;

        const footerTopManagerLink = document.getElementById("footerTopBarManagerLink");
        if (footerTopManagerLink) footerTopManagerLink.href = `tel:${managerTel}`;

        const footerTopSecondaryLink = document.getElementById("footerTopBarSecondaryLink");
        if (footerTopSecondaryLink) footerTopSecondaryLink.href = `tel:${secondaryTel}`;

        // --- Header Logo & Tagline ---
        const agencyParts = agencyName.trim().split(/\s+/);
        const logoMain = agencyParts[0] || "ZAKIR";
        const logoSub = agencyParts.length > 1 ? agencyParts.slice(1).join(" ") : "Travel & Tours";
        setText("headerAgencyNameMain", logoMain.toUpperCase());
        setText("headerAgencyNameSub", logoSub);
        setText("headerTaglinePrimary", taglinePrimary.toUpperCase());

        // --- Navbar & Mobile Menu WhatsApp Links ---
        const navWALink = document.getElementById("navWhatsAppBtn");
        if (navWALink) navWALink.href = `https://wa.me/${activeWA}?text=${generalWAMsg}`;

        const mobileWALink = document.getElementById("mobileWhatsAppBtn");
        if (mobileWALink) {
            mobileWALink.href = `https://wa.me/${activeWA}?text=${generalWAMsg}`;
            setText("mobileWhatsAppBtnText", `Chat with ${activeAgentName}`);
        }

        // --- Hero Section & Services Agency Name ---
        setText("heroTaglineSecondary", `${taglineSecondary}.`);
        setText("servicesAgencyName", agencyName);

        const pContent = config.pageContent || {};
        const rawHome = pContent.home || {};
        const isLegacyHome =
            rawHome.stat1Number === "100%" ||
            rawHome.stat4Number === "Blue Area" ||
            (rawHome.aboutHeading && rawHome.aboutHeading.includes("Islamabad")) ||
            (rawHome.heroBadge && rawHome.heroBadge.includes("Islamabad")) ||
            (rawHome.branch1Title && rawHome.branch1Title.includes("Islamabad"));
        const pHome = isLegacyHome
            ? (window.DEFAULT_PAGE_CONTENT && window.DEFAULT_PAGE_CONTENT.home) || {}
            : rawHome;
        const pUmrah = pContent.umrah || {};
        const pVisas = pContent.visas || {};
        const pCalc = pContent.calculator || {};
        const pContact = pContent.contact || {};
        const pWorkPermit = pContent.workPermit || {};

        // --- Page-Specific Content: HOME PAGE ---
        const renderCheckBullets = (listId, rawLines) => {
            const listEl = document.getElementById(listId);
            if (!listEl || !rawLines) return;
            const lines = String(rawLines)
                .split(/\r?\n|\|/)
                .map((l) => l.trim())
                .filter(Boolean);
            if (!lines.length) return;
            listEl.innerHTML = lines
                .map(
                    (line) =>
                        `<li class="flex items-start gap-2"><i class="fa-solid fa-circle-check text-teal mt-1"></i> <span>${escapeHtmlAttr(line)}</span></li>`
                )
                .join("");
        };

        if (pHome.heroBadge) setText("homeHeroBadge", pHome.heroBadge);
        if (pHome.heroHeadingMain) setText("homeHeroHeadingMain", pHome.heroHeadingMain);
        if (pHome.heroDescription) setText("homeHeroDescription", pHome.heroDescription);
        if (pHome.aboutBadge) setText("homeAboutBadge", pHome.aboutBadge);
        if (pHome.aboutHeading) setText("homeAboutHeading", pHome.aboutHeading);
        if (pHome.aboutDescription) setText("homeAboutDescription", pHome.aboutDescription);
        if (pHome.missionTitle) setText("homeMissionTitle", pHome.missionTitle);
        if (pHome.missionDesc) setText("homeMissionDesc", pHome.missionDesc);
        if (pHome.visionTitle) setText("homeVisionTitle", pHome.visionTitle);
        if (pHome.visionDesc) setText("homeVisionDesc", pHome.visionDesc);
        if (pHome.branch1Title) {
            setText("heroBranch1Title", pHome.branch1Title);
            setText("homeBranch1CardTitle", pHome.branch1Title);
        }
        const rawBranch1 = pHome.branch1Address || "";
        const branch1Address = (!rawBranch1 || /fazal banda/i.test(rawBranch1) || /potohar|blue area|islamabad/i.test(rawBranch1))
            ? "2nd Floor, Hayat Market, Matta Swat, Khyber Pakhtunkhwa, Pakistan"
            : rawBranch1;
        setText("heroBranch1Address", branch1Address);
        setText("homeBranch1CardAddress", branch1Address);
        if (pHome.branch1Desc) setText("homeBranch1CardDesc", pHome.branch1Desc);
        if (pHome.branch2Title) {
            setText("heroBranch2Title", pHome.branch2Title);
            setText("homeBranch2CardTitle", pHome.branch2Title);
        }
        if (pHome.branch2Address) {
            setText("heroBranch2Address", pHome.branch2Address);
            setText("homeBranch2CardAddress", pHome.branch2Address);
        }
        if (pHome.branch2Desc) setText("homeBranch2CardDesc", pHome.branch2Desc);
        if (pHome.stat1Number) setText("homeStat1Number", pHome.stat1Number);
        if (pHome.stat1Label) setText("homeStat1Label", pHome.stat1Label);
        if (pHome.stat2Number) setText("homeStat2Number", pHome.stat2Number);
        if (pHome.stat2Label) setText("homeStat2Label", pHome.stat2Label);
        if (pHome.stat3Number) setText("homeStat3Number", pHome.stat3Number);
        if (pHome.stat3Label) setText("homeStat3Label", pHome.stat3Label);
        if (pHome.stat4Number) setText("homeStat4Number", pHome.stat4Number);
        if (pHome.stat4Label) setText("homeStat4Label", pHome.stat4Label);
        if (pHome.why1Title) setText("homeWhy1Title", pHome.why1Title);
        if (pHome.why1Desc) setText("homeWhy1Desc", pHome.why1Desc);
        if (pHome.why2Title) setText("homeWhy2Title", pHome.why2Title);
        if (pHome.why2Desc) setText("homeWhy2Desc", pHome.why2Desc);
        if (pHome.why3Title) setText("homeWhy3Title", pHome.why3Title);
        if (pHome.why3Desc) setText("homeWhy3Desc", pHome.why3Desc);
        if (pHome.srv1Title) setText("homeSrv1Title", pHome.srv1Title);
        if (pHome.srv1Desc) setText("homeSrv1Desc", pHome.srv1Desc);
        if (pHome.srv2Title) setText("homeSrv2Title", pHome.srv2Title);
        if (pHome.srv2Desc) setText("homeSrv2Desc", pHome.srv2Desc);
        if (pHome.srv3Title) setText("homeSrv3Title", pHome.srv3Title);
        if (pHome.srv3Desc) setText("homeSrv3Desc", pHome.srv3Desc);
        if (pHome.srv4Title) setText("homeSrv4Title", pHome.srv4Title);
        if (pHome.srv4Desc) setText("homeSrv4Desc", pHome.srv4Desc);

        // --- Footer (A-01/A-02) + floating chat label (A-04) ---
        if (pHome.footerDescription) setText("footerDescription", pHome.footerDescription);
        if (pHome.branch2Address) setText("footerBranch2Address", pHome.branch2Address);
        if (pHome.floatingChatLabel) setText("floatingWhatsAppLabel", pHome.floatingChatLabel);

        // --- Hero trust strip (B-01) — different cells from stat1–4 ---
        if (pHome.heroStat1Number) setText("homeHeroStat1Number", pHome.heroStat1Number);
        if (pHome.heroStat1Label) setText("homeHeroStat1Label", pHome.heroStat1Label);
        if (pHome.heroStat2Number) setText("homeHeroStat2Number", pHome.heroStat2Number);
        if (pHome.heroStat2Label) setText("homeHeroStat2Label", pHome.heroStat2Label);
        if (pHome.heroStat3Number) setText("homeHeroStat3Number", pHome.heroStat3Number);
        if (pHome.heroStat3Label) setText("homeHeroStat3Label", pHome.heroStat3Label);
        if (pHome.heroStat4Number) setText("homeHeroStat4Number", pHome.heroStat4Number);
        if (pHome.heroStat4Label) setText("homeHeroStat4Label", pHome.heroStat4Label);

        // --- Client Trust medallion (B-02) + hero card header (B-03) ---
        if (pHome.trustBadgeText) setText("homeTrustBadgeText", pHome.trustBadgeText);
        if (pHome.heroCardEyebrow) setText("homeHeroCardEyebrow", pHome.heroCardEyebrow);
        if (pHome.heroCardTitle) setText("homeHeroCardTitle", pHome.heroCardTitle);
        if (pHome.heroCardHoursBadge) setText("homeHeroCardHoursBadge", pHome.heroCardHoursBadge);

        // --- About highlight badges (B-04) ---
        if (pHome.aboutBadge1) setText("homeAboutBadge1", pHome.aboutBadge1);
        if (pHome.aboutBadge2) setText("homeAboutBadge2", pHome.aboutBadge2);
        if (pHome.aboutBadge3) setText("homeAboutBadge3", pHome.aboutBadge3);

        // --- Executive Management Desk (B-05): names composed from contacts ---
        setText(
            "homeManagementNames",
            `${c.managerName || "Inam Khan (Manager)"} & ${cleanSecondaryDisplayName}`
        );
        if (pHome.managementNote) setText("homeManagementNote", pHome.managementNote);

        // --- Mission checklist + badge (B-06) ---
        renderCheckBullets("homeMissionPointsList", pHome.missionPoints);
        if (pHome.missionBadge) setText("homeMissionBadge", pHome.missionBadge);

        // --- Vision branch pills + address bar (B-07): bound to the
        // existing branch titles/address (admin-editable in Tab 1) ---
        if (pHome.branch1Title) setText("homeVisionBranch1Name", pHome.branch1Title);
        if (pHome.branch2Title) setText("homeVisionBranch2Name", pHome.branch2Title);
        setText("homeVisionBranch1AddressLine", `Head Office: ${branch1Address}`);

        // --- Branch opening hours (B-08): per-branch, officeHours untouched ---
        if (c.branch1Hours) setText("homeBranch1Hours", c.branch1Hours);
        if (c.branch2Hours) setText("homeBranch2Hours", c.branch2Hours);

        // --- Services section heading + intro (B-09) ---
        // The intro is bound as whole text (the inline agency-name span
        // it used to carry is replaced by the live agency name, so a
        // rename still flows through).
        if (pHome.servicesHeading) setText("homeServicesHeading", pHome.servicesHeading);
        if (pHome.servicesIntro) {
            setText("homeServicesIntro", String(pHome.servicesIntro).replace(/Zakir Travel & Tours/g, agencyName));
        }

        // --- Service card badges + bullets (B-10) ---
        if (pHome.srv1Badge) setText("homeSrv1Badge", pHome.srv1Badge);
        if (pHome.srv2Badge) setText("homeSrv2Badge", pHome.srv2Badge);
        if (pHome.srv3Badge) setText("homeSrv3Badge", pHome.srv3Badge);
        if (pHome.srv4Badge) setText("homeSrv4Badge", pHome.srv4Badge);
        renderCheckBullets("homeSrv1Bullets", pHome.srv1Bullets);
        renderCheckBullets("homeSrv2Bullets", pHome.srv2Bullets);
        renderCheckBullets("homeSrv3Bullets", pHome.srv3Bullets);
        renderCheckBullets("homeSrv4Bullets", pHome.srv4Bullets);

        // --- Branches section heading + intro (B-11) ---
        if (pHome.branchesHeading) setText("homeBranchesHeading", pHome.branchesHeading);
        if (pHome.branchesIntro) setText("homeBranchesIntro", pHome.branchesIntro);

        // --- How it works: heading, intro + 4 steps (B-12) ---
        if (pHome.processHeading) setText("homeProcessHeading", pHome.processHeading);
        if (pHome.processIntro) setText("homeProcessIntro", pHome.processIntro);
        if (pHome.process1Title) setText("homeProcess1Title", pHome.process1Title);
        if (pHome.process1Desc) setText("homeProcess1Desc", pHome.process1Desc);
        if (pHome.process2Title) setText("homeProcess2Title", pHome.process2Title);
        if (pHome.process2Desc) setText("homeProcess2Desc", pHome.process2Desc);
        if (pHome.process3Title) setText("homeProcess3Title", pHome.process3Title);
        if (pHome.process3Desc) setText("homeProcess3Desc", pHome.process3Desc);
        if (pHome.process4Title) setText("homeProcess4Title", pHome.process4Title);
        if (pHome.process4Desc) setText("homeProcess4Desc", pHome.process4Desc);

        // --- Page-Specific Content: UMRAH PACKAGES PAGE ---
        if (pUmrah.heroBadge) setText("umrahHeroBadge", pUmrah.heroBadge);
        if (pUmrah.heroTitle) setText("umrahHeroTitle", pUmrah.heroTitle);
        if (pUmrah.heroScript) setText("umrahHeroScript", pUmrah.heroScript);
        if (pUmrah.heroSubtitle) setText("umrahHeroSubtitle", pUmrah.heroSubtitle);
        // --- Umrah hero trust strip (C-02) ---
        if (pUmrah.trustStat1Number) setText("umrahTrustStat1Number", pUmrah.trustStat1Number);
        if (pUmrah.trustStat1Label) setText("umrahTrustStat1Label", pUmrah.trustStat1Label);
        if (pUmrah.trustStat2Number) setText("umrahTrustStat2Number", pUmrah.trustStat2Number);
        if (pUmrah.trustStat2Label) setText("umrahTrustStat2Label", pUmrah.trustStat2Label);
        if (pUmrah.trustStat3Number) setText("umrahTrustStat3Number", pUmrah.trustStat3Number);
        if (pUmrah.trustStat3Label) setText("umrahTrustStat3Label", pUmrah.trustStat3Label);
        if (pUmrah.trustStat4Number) setText("umrahTrustStat4Number", pUmrah.trustStat4Number);
        if (pUmrah.trustStat4Label) setText("umrahTrustStat4Label", pUmrah.trustStat4Label);
        // --- Compare heading + desk note (C-03) ---
        if (pUmrah.compareHeading) setText("umrahCompareHeading", pUmrah.compareHeading);
        if (pUmrah.compareNote) setText("umrahCompareNote", pUmrah.compareNote);
        // --- Inclusions heading + intro (C-04) ---
        if (pUmrah.includedHeading) setText("umrahIncludedHeading", pUmrah.includedHeading);
        if (pUmrah.includedIntro) setText("umrahIncludedIntro", pUmrah.includedIntro);
        if (pUmrah.inc1Title) setText("umrahInc1Title", pUmrah.inc1Title);
        if (pUmrah.inc2Title) setText("umrahInc2Title", pUmrah.inc2Title);
        if (pUmrah.inc3Title) setText("umrahInc3Title", pUmrah.inc3Title);
        if (pUmrah.familyBannerTitle) setText("umrahFamilyBannerTitle", pUmrah.familyBannerTitle);
        if (pUmrah.familyBannerDesc) setText("umrahFamilyBannerDesc", pUmrah.familyBannerDesc);

        renderCheckBullets("umrahInc1List", pUmrah.inc1Bullets);
        renderCheckBullets("umrahInc2List", pUmrah.inc2Bullets);
        renderCheckBullets("umrahInc3List", pUmrah.inc3Bullets);

        // --- Page-Specific Content: VISAS & FLIGHTS PAGE ---
        if (pVisas.heroBadge) setText("visaHeroBadge", pVisas.heroBadge);
        if (pVisas.heroTitle) setText("visaHeroTitle", pVisas.heroTitle);
        if (pVisas.heroScript) setText("visaHeroScript", pVisas.heroScript);
        if (pVisas.heroSubtitle) setText("visaHeroSubtitle", pVisas.heroSubtitle);
        if (pVisas.trustStat1Number) setText("visaTrustStat1Number", pVisas.trustStat1Number);
        if (pVisas.trustStat1Label) setText("visaTrustStat1Label", pVisas.trustStat1Label);
        if (pVisas.trustStat2Number) setText("visaTrustStat2Number", pVisas.trustStat2Number);
        if (pVisas.trustStat2Label) setText("visaTrustStat2Label", pVisas.trustStat2Label);
        if (pVisas.trustStat3Number) setText("visaTrustStat3Number", pVisas.trustStat3Number);
        if (pVisas.trustStat3Label) setText("visaTrustStat3Label", pVisas.trustStat3Label);
        if (pVisas.trustStat4Number) setText("visaTrustStat4Number", pVisas.trustStat4Number);
        if (pVisas.trustStat4Label) setText("visaTrustStat4Label", pVisas.trustStat4Label);
        if (pVisas.destinationsHeading) setText("visaDestinationsHeading", pVisas.destinationsHeading);
        if (pVisas.destinationsNote) setText("visaDestinationsNote", pVisas.destinationsNote);
        if (pVisas.flightEyebrow) setText("visaFlightEyebrow", pVisas.flightEyebrow);
        if (pVisas.flightHeading) setText("visaFlightHeading", pVisas.flightHeading);
        if (pVisas.flightDescription) setText("visaFlightDescription", pVisas.flightDescription);
        const flightFromEl = document.getElementById("flightFrom");
        if (flightFromEl && pVisas.defaultDepartureCity) flightFromEl.value = pVisas.defaultDepartureCity;
        if (pVisas.step1Title) setText("visaStep1Title", pVisas.step1Title);
        if (pVisas.step1Desc) setText("visaStep1Desc", pVisas.step1Desc);
        if (pVisas.step2Title) setText("visaStep2Title", pVisas.step2Title);
        if (pVisas.step2Desc) setText("visaStep2Desc", pVisas.step2Desc);
        if (pVisas.step3Title) setText("visaStep3Title", pVisas.step3Title);
        if (pVisas.step3Desc) setText("visaStep3Desc", pVisas.step3Desc);

        const flightBulletsEl = document.getElementById("visaFlightBulletsList");
        if (flightBulletsEl && pVisas.flightBullets) {
            const fLines = String(pVisas.flightBullets)
                .split(/\r?\n|\|/)
                .map((l) => l.trim())
                .filter(Boolean);
            if (fLines.length) {
                flightBulletsEl.innerHTML = fLines
                    .map(
                        (line) => `
                        <div class="flex items-center gap-3 text-xs sm:text-sm text-slate-700 font-semibold">
                            <div class="w-8 h-8 rounded-lg bg-teal-accent text-teal flex items-center justify-center shrink-0">
                                <i class="fa-solid fa-check"></i>
                            </div>
                            <span>${escapeHtmlAttr(line)}</span>
                        </div>`
                    )
                    .join("");
            }
        }

        const partnerAirlinesEl = document.getElementById("visaPartnerAirlinesList");
        if (partnerAirlinesEl && pVisas.partnerAirlines) {
            const airlines = String(pVisas.partnerAirlines)
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean);
            if (airlines.length) {
                const renderCards = (list, isAriaHidden) => list
                    .map(
                        (airline) =>
                            `<div class="airline-box inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-teal hover:-translate-y-1.5 transition-all duration-300 text-slate-800 hover:text-navy group shrink-0 cursor-pointer"${isAriaHidden ? ' aria-hidden="true"' : ''}>
                                <span class="w-7 h-7 rounded-xl bg-teal-accent text-teal group-hover:bg-teal group-hover:text-white flex items-center justify-center transition-all duration-300">
                                    <i class="fa-solid fa-plane-departure text-xs group-hover:rotate-12 transition-transform"></i>
                                </span>
                                <span class="font-extrabold text-xs sm:text-sm tracking-tight whitespace-nowrap">${escapeHtmlAttr(airline)}</span>
                            </div>`
                    )
                    .join("");
                partnerAirlinesEl.innerHTML = renderCards(airlines, false) + renderCards(airlines, true);
            }
        }

        // --- Page-Specific Content: CALCULATOR PAGE ---
        if (pCalc.heroBadge) setText("calcHeroBadge", pCalc.heroBadge);
        if (pCalc.heroTitle) setText("calcHeroTitle", pCalc.heroTitle);
        if (pCalc.heroSubtitle) setText("calcHeroSubtitle", pCalc.heroSubtitle);
        if (pCalc.ratesNote) setText("calcRatesNote", pCalc.ratesNote);

        const calcBulletsEl = document.getElementById("calcIncludedBulletsList");
        if (calcBulletsEl && pCalc.includedBullets) {
            const cLines = String(pCalc.includedBullets)
                .split(/\r?\n|\|/)
                .map((l) => l.trim())
                .filter(Boolean);
            if (cLines.length) {
                calcBulletsEl.innerHTML = cLines.map((line) => `<p>• ${escapeHtmlAttr(line)}</p>`).join("");
            }
        }

        // --- Page-Specific Content: WORK PERMIT PAGE ---
        if (pWorkPermit.topBarTagline) setText("workPermitTopBarTagline", pWorkPermit.topBarTagline);
        if (pWorkPermit.heroBadge) setText("workPermitHeroBadge", pWorkPermit.heroBadge);
        if (pWorkPermit.heroTitle) setText("workPermitHeroTitle", pWorkPermit.heroTitle);
        if (pWorkPermit.heroScript) setText("workPermitHeroScript", pWorkPermit.heroScript);
        if (pWorkPermit.heroSubtitle) setText("workPermitHeroSubtitle", pWorkPermit.heroSubtitle);
        if (pWorkPermit.featuredScript) setText("workPermitFeaturedScript", pWorkPermit.featuredScript);
        if (pWorkPermit.featuredDesc) setText("workPermitFeaturedDesc", pWorkPermit.featuredDesc);
        if (pWorkPermit.destinationsHeading) setText("workPermitDestinationsHeading", pWorkPermit.destinationsHeading);
        if (pWorkPermit.destinationsDesc) setText("workPermitDestinationsDesc", pWorkPermit.destinationsDesc);
        if (pWorkPermit.benefitsHeading) setText("workPermitBenefitsHeading", pWorkPermit.benefitsHeading);
        if (pWorkPermit.processHeading) setText("workPermitProcessHeading", pWorkPermit.processHeading);
        if (pWorkPermit.checklistHeading) setText("workPermitChecklistHeading", pWorkPermit.checklistHeading);
        if (pWorkPermit.checklistDesc) setText("workPermitChecklistDesc", pWorkPermit.checklistDesc);
        if (pWorkPermit.assessmentHeading) setText("workPermitAssessmentHeading", pWorkPermit.assessmentHeading);
        if (pWorkPermit.faqHeading) setText("workPermitFaqHeading", pWorkPermit.faqHeading);
        if (pWorkPermit.trustStat1Number) setText("workPermitTrustStat1Number", pWorkPermit.trustStat1Number);
        if (pWorkPermit.trustStat1Label) setText("workPermitTrustStat1Label", pWorkPermit.trustStat1Label);
        if (pWorkPermit.trustStat2Number) setText("workPermitTrustStat2Number", pWorkPermit.trustStat2Number);
        if (pWorkPermit.trustStat2Label) setText("workPermitTrustStat2Label", pWorkPermit.trustStat2Label);
        if (pWorkPermit.trustStat3Number) setText("workPermitTrustStat3Number", pWorkPermit.trustStat3Number);
        if (pWorkPermit.trustStat3Label) setText("workPermitTrustStat3Label", pWorkPermit.trustStat3Label);
        if (pWorkPermit.trustStat4Number) setText("workPermitTrustStat4Number", pWorkPermit.trustStat4Number);
        if (pWorkPermit.trustStat4Label) setText("workPermitTrustStat4Label", pWorkPermit.trustStat4Label);
        // "More Destinations" heading: built from the editable country
        // list ("Looking for Malta, Lithuania, Serbia or another
        // country?") so the list and the heading can never drift apart;
        // the stored title is the fallback when the list is empty.
        const moreDestCountries = String(pWorkPermit.moreDestinationsCountries || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (moreDestCountries.length) {
            setText("workPermitMoreDestinationsTitle", `Looking for ${moreDestCountries.join(", ")} or another country?`);
        } else if (pWorkPermit.moreDestinationsTitle) {
            setText("workPermitMoreDestinationsTitle", pWorkPermit.moreDestinationsTitle);
        }
        if (pWorkPermit.moreDestinationsDesc) setText("workPermitMoreDestinationsDesc", pWorkPermit.moreDestinationsDesc);
        if (pWorkPermit.benefit1Title) setText("workPermitBenefit1Title", pWorkPermit.benefit1Title);
        if (pWorkPermit.benefit1Desc) setText("workPermitBenefit1Desc", pWorkPermit.benefit1Desc);
        if (pWorkPermit.benefit2Title) setText("workPermitBenefit2Title", pWorkPermit.benefit2Title);
        if (pWorkPermit.benefit2Desc) setText("workPermitBenefit2Desc", pWorkPermit.benefit2Desc);
        if (pWorkPermit.benefit3Title) setText("workPermitBenefit3Title", pWorkPermit.benefit3Title);
        if (pWorkPermit.benefit3Desc) setText("workPermitBenefit3Desc", pWorkPermit.benefit3Desc);
        if (pWorkPermit.benefit4Title) setText("workPermitBenefit4Title", pWorkPermit.benefit4Title);
        if (pWorkPermit.benefit4Desc) setText("workPermitBenefit4Desc", pWorkPermit.benefit4Desc);
        if (pWorkPermit.processIntro) setText("workPermitProcessIntro", pWorkPermit.processIntro);
        if (pWorkPermit.process1Title) setText("workPermitProcess1Title", pWorkPermit.process1Title);
        if (pWorkPermit.process1Desc) setText("workPermitProcess1Desc", pWorkPermit.process1Desc);
        if (pWorkPermit.process2Title) setText("workPermitProcess2Title", pWorkPermit.process2Title);
        if (pWorkPermit.process2Desc) setText("workPermitProcess2Desc", pWorkPermit.process2Desc);
        if (pWorkPermit.process3Title) setText("workPermitProcess3Title", pWorkPermit.process3Title);
        if (pWorkPermit.process3Desc) setText("workPermitProcess3Desc", pWorkPermit.process3Desc);
        if (pWorkPermit.process4Title) setText("workPermitProcess4Title", pWorkPermit.process4Title);
        if (pWorkPermit.process4Desc) setText("workPermitProcess4Desc", pWorkPermit.process4Desc);
        if (pWorkPermit.assessmentNote) setText("workPermitAssessmentNote", pWorkPermit.assessmentNote);
        renderWorkPermitChecklist(pWorkPermit.checklistItems);
        rebuildWorkPermitAssessmentSelects();

        const heroRoomSelect = document.getElementById("umrahRoom");
        if (heroRoomSelect) {
            const currentVal = heroRoomSelect.value;
            heroRoomSelect.innerHTML = `
                <option value="Sharing (PKR ${formatPKR(r.sharingPrice || s.startingPrice || 232000)})">Sharing (PKR ${formatPKR(r.sharingPrice || s.startingPrice || 232000)})</option>
                <option value="Quad Room (PKR ${formatPKR(r.quadPrice || 248000)})">Quad Room (PKR ${formatPKR(r.quadPrice || 248000)})</option>
                <option value="Triple Room (PKR ${formatPKR(r.triplePrice || 268000)})">Triple Room (PKR ${formatPKR(r.triplePrice || 268000)})</option>
                <option value="Double / Couple Room (PKR ${formatPKR(r.doublePrice || 295000)})">Double Room (PKR ${formatPKR(r.doublePrice || 295000)})</option>
            `;
            if (currentVal && [...heroRoomSelect.options].some((o) => o.value === currentVal)) {
                heroRoomSelect.value = currentVal;
            }
        }

        // --- Calculator Section ---
        const sharingVal = Number(r.sharingPrice || s.startingPrice || 232000);
        const quadVal = Number(r.quadPrice || 248000);
        const tripleVal = Number(r.triplePrice || 268000);
        const doubleVal = Number(r.doublePrice || 295000);

        setText("calcIntroBasePrice", `PKR ${formatPKR(sharingVal)}`);
        setText("calcCardSharingPrice", `PKR ${formatPKR(sharingVal)} / Person`);
        setText("calcCardQuadPrice", `PKR ${formatPKR(quadVal)} / Person`);
        setText("calcCardTriplePrice", `PKR ${formatPKR(tripleVal)} / Person`);
        setText("calcCardDoublePrice", `PKR ${formatPKR(doubleVal)} / Person`);

        const calcDurationSelect = document.getElementById("calcDuration");
        if (calcDurationSelect) {
            const prevDurIdx = calcDurationSelect.selectedIndex >= 0 ? calcDurationSelect.selectedIndex : 0;
            const dur10 = Number(r.dur10NightsOffset !== undefined ? r.dur10NightsOffset : -18000);
            const dur21 = Number(r.dur21NightsOffset !== undefined ? r.dur21NightsOffset : 35000);
            const dur28 = Number(r.dur28NightsOffset !== undefined ? r.dur28NightsOffset : 65000);
            calcDurationSelect.innerHTML = `
                <option value="0">14 Nights (Standard Flyer Deal)</option>
                <option value="${dur10}">10 Nights (${dur10 >= 0 ? "+" : ""}PKR ${formatPKR(dur10)})</option>
                <option value="${dur21}">21 Nights (+PKR ${formatPKR(dur21)})</option>
                <option value="${dur28}">28 Nights - Full Month (+PKR ${formatPKR(dur28)})</option>
            `;
            calcDurationSelect.selectedIndex = Math.min(prevDurIdx, calcDurationSelect.options.length - 1);
        }

        const calcRoomSelect = document.getElementById("calcRoom");
        if (calcRoomSelect) {
            const prevIndex = calcRoomSelect.selectedIndex >= 0 ? calcRoomSelect.selectedIndex : 0;
            calcRoomSelect.innerHTML = `
                <option value="${sharingVal}">Sharing Room (PKR ${formatPKR(sharingVal)}/person)</option>
                <option value="${quadVal}">Quad Room - 4 Bed (PKR ${formatPKR(quadVal)}/person)</option>
                <option value="${tripleVal}">Triple Room - 3 Bed (PKR ${formatPKR(tripleVal)}/person)</option>
                <option value="${doubleVal}">Double Room - 2 Bed (PKR ${formatPKR(doubleVal)}/person)</option>
            `;
            calcRoomSelect.selectedIndex = Math.min(prevIndex, calcRoomSelect.options.length - 1);
        }

        const calcHotelSelect = document.getElementById("calcHotel");
        if (calcHotelSelect) {
            const prevHotelIdx = calcHotelSelect.selectedIndex >= 0 ? calcHotelSelect.selectedIndex : 0;
            const h3Addon = Number(r.hotel3StarAddon !== undefined ? r.hotel3StarAddon : 45000);
            const h5Addon = Number(r.hotel5StarAddon !== undefined ? r.hotel5StarAddon : 115000);
            calcHotelSelect.innerHTML = `
                <option value="0">Standard Economy (Shuttle / 600m)</option>
                <option value="${h3Addon}">3-Star Plus (+PKR ${formatPKR(h3Addon)}/person)</option>
                <option value="${h5Addon}">5-Star Near Haram (+PKR ${formatPKR(h5Addon)}/person)</option>
            `;
            calcHotelSelect.selectedIndex = Math.min(prevHotelIdx, calcHotelSelect.options.length - 1);
        }

        // --- About Us & Contact Page Hero (skip legacy contact-only defaults) ---
        const legacyContactBadges = ["Head Office: Blue Area, Islamabad", "Swat Head Office (Matta) • Islamabad Branch Office"];
        const legacyContactTitles = ["Contact Our Travel Desk"];
        const isLegacyContactSubtitle = /^We are always here to assist your spiritual journey/i.test(pContact.heroSubtitle || "");
        if (pContact.heroBadge && !legacyContactBadges.includes(pContact.heroBadge)) setText("contactHeroBadge", pContact.heroBadge);
        if (pContact.heroTitle && !legacyContactTitles.includes(pContact.heroTitle)) setText("contactHeroTitle", pContact.heroTitle);
        if (pContact.heroSubtitle && !isLegacyContactSubtitle) setText("contactHeroSubtitle", pContact.heroSubtitle);
        if (pContact.heroScript) setText("contactHeroScript", pContact.heroScript);
        if (pContact.trustStat1Number) setText("contactTrustStat1Number", pContact.trustStat1Number);
        if (pContact.trustStat1Label) setText("contactTrustStat1Label", pContact.trustStat1Label);
        if (pContact.trustStat2Number) setText("contactTrustStat2Number", pContact.trustStat2Number);
        if (pContact.trustStat2Label) setText("contactTrustStat2Label", pContact.trustStat2Label);
        if (pContact.trustStat3Number) setText("contactTrustStat3Number", pContact.trustStat3Number);
        if (pContact.trustStat3Label) setText("contactTrustStat3Label", pContact.trustStat3Label);
        if (pContact.trustStat4Number) setText("contactTrustStat4Number", pContact.trustStat4Number);
        if (pContact.trustStat4Label) setText("contactTrustStat4Label", pContact.trustStat4Label);
        if (pContact.leadershipHeading) setText("contactLeadershipHeading", pContact.leadershipHeading);
        if (pContact.leadershipIntro) setText("contactLeadershipIntro", pContact.leadershipIntro);
        if (pContact.expertsHeading) setText("contactExpertsHeading", pContact.expertsHeading);
        if (pContact.expertsIntro) setText("contactExpertsIntro", pContact.expertsIntro);
        if (pContact.teamHeading) setText("contactTeamHeading", pContact.teamHeading);
        if (pContact.teamIntro) setText("contactTeamIntro", pContact.teamIntro);
        if (pContact.contactHeading) setText("contactHeading", pContact.contactHeading);
        if (pContact.contactIntro) setText("contactIntro", pContact.contactIntro);
        rebuildContactServiceOptions(pContact.serviceOptions);

        // --- About Us: Team Member Names & Roles (edited in Admin, keyed by member id) ---
        // textContent only — admin-entered text is never injected as HTML.
        // An element keeps its hardcoded text when no edited value exists,
        // so the page can never render a blank name or role.
        const teamMembers = config.teamMembers || {};
        document.querySelectorAll("[data-team-name]").forEach((el) => {
            const saved = teamMembers[el.getAttribute("data-team-name")] || {};
            const name = String(saved.name || "").trim();
            if (name) el.textContent = name;
        });
        document.querySelectorAll("[data-team-role]").forEach((el) => {
            const saved = teamMembers[el.getAttribute("data-team-role")] || {};
            const role = String(saved.role || "").trim();
            if (role) el.textContent = role;
        });

        // --- About Us: CEO quote (G-04, from the teamMembers.ceo record) ---
        const ceoRecord = teamMembers.ceo || {};
        if (String(ceoRecord.quote || "").trim()) {
            setText("ceoQuote", String(ceoRecord.quote).trim());
        }

        // --- About Us: CEO tag pills (G-05, pipe-separated list) ---
        const ceoTagsEl = document.getElementById("ceoTagsList");
        if (ceoTagsEl && pContact.ceoTags) {
            const tags = String(pContact.ceoTags)
                .split(/\r?\n|\|/)
                .map((t) => t.trim())
                .filter(Boolean);
            if (tags.length) {
                const tagIcons = [
                    "fa-building-flag text-amber-300",
                    "fa-kaaba text-teal-light",
                    "fa-earth-asia text-sky-300"
                ];
                ceoTagsEl.innerHTML = tags
                    .map(
                        (tag, i) =>
                            `<span class="bg-white/10 border border-white/15 px-3.5 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid ${tagIcons[i % tagIcons.length]}"></i>${escapeHtmlAttr(tag)}</span>`
                    )
                    .join("");
            }
        }

        // --- About Us: Team Member Photos (uploaded by Admin, keyed by member id) ---
        const teamPhotos = config.teamPhotos || {};
        document.querySelectorAll("[data-team-photo]").forEach((slot) => {
            const key = slot.getAttribute("data-team-photo");
            const url = teamPhotos[key];
            const img = slot.querySelector(".team-photo-img");
            const placeholder = slot.querySelector(".team-photo-placeholder");
            if (!img) return;
            // Alt text follows the effective name/role (edited in Admin,
            // else the page's own hardcoded text) — never blank.
            const nameEl = document.querySelector(`[data-team-name="${key}"]`);
            const roleEl = document.querySelector(`[data-team-role="${key}"]`);
            const altName = nameEl ? nameEl.textContent.trim() : "";
            const altRole = roleEl ? roleEl.textContent.trim() : "";
            if (altName) img.alt = altRole ? `${altName} - ${altRole}` : altName;
            if (url) {
                if (img.getAttribute("src") !== url) img.src = url;
                img.classList.remove("hidden");
                if (placeholder) placeholder.classList.add("hidden");
            } else {
                img.removeAttribute("src");
                img.classList.add("hidden");
                if (placeholder) placeholder.classList.remove("hidden");
            }
        });

        // --- Contact & Islamabad Office Section ---
        setText("contactSectionAgencyName", agencyName);
        setText("contactSectionTagline", `"${taglineSecondary}"`);
        setText("contactSectionAddress", officeAddress);
        if (pHome.branch2Address) setText("contactBranch2Address", pHome.branch2Address);
        if (c.branch1Hours) setText("contactBranch1Hours", c.branch1Hours);
        if (c.branch2Hours) setText("contactBranch2Hours", c.branch2Hours);
        if (pHome.branch1Note) setText("contactBranch1Note", pHome.branch1Note);
        if (pHome.branch2Note) setText("contactBranch2Note", pHome.branch2Note);
        if (c.supportNote) setText("contactSupportNote", c.supportNote);
        if (c.officeHours) setText("contactSectionHours", c.officeHours);
        if (c.officeEmail) setText("contactSectionEmail", c.officeEmail);
        // Map section headings (G-09): composed from the branch titles /
        // addresses, like switchMapBranch does — but only until the
        // visitor switches branch, so a switch is never undone by a
        // later config re-render.
        const mapIframeForHeadings = document.getElementById("contactMapIframe");
        if (mapIframeForHeadings && !mapIframeForHeadings.getAttribute("data-switched")) {
            if (pHome.branch1Title) setText("mapHeadingTitle", `${pHome.branch1Title} Location`);
            if (branch1Address) setText("mapHeadingSubtitle", branch1Address);
        }

        const mapIframe = document.getElementById("contactMapIframe");
        if (mapIframe && !mapIframe.getAttribute("data-switched")) {
            const rawMapUrl = c.mapEmbedUrl || "";
            const isLegacyIslamabadMap = !rawMapUrl || /potohar/i.test(rawMapUrl) || /fazal-e-haq/i.test(rawMapUrl);
            // The map URL comes from admin-entered site config and is
            // assigned straight to the iframe src — only allow Google
            // Maps embeds over https, so a bad or malicious URL can never
            // frame another site. Anything else falls back to the Swat map.
            let isAllowedMapUrl = false;
            try {
                const mapUrl = new URL(rawMapUrl);
                isAllowedMapUrl =
                    mapUrl.protocol === "https:" &&
                    /(^|\.)google\.com$/.test(mapUrl.hostname) &&
                    mapUrl.pathname.startsWith("/maps");
            } catch (_) {
                isAllowedMapUrl = false;
            }
            const activeMapUrl =
                isLegacyIslamabadMap || !isAllowedMapUrl
                    ? "https://maps.google.com/maps?q=Hayat+Market,+Matta,+Swat,+Pakistan&t=&z=16&ie=UTF8&iwloc=&output=embed"
                    : rawMapUrl;
            if (mapIframe.src !== activeMapUrl) {
                mapIframe.src = activeMapUrl;
            }
        }

        setText("contactCardManagerName", c.managerName || "Inam Khan");
        setText("contactCardManagerPhone", c.managerPhone || "+92 349 0558345");
        const mPhoneLink1 = document.getElementById("contactCardManagerTel1");
        const mPhoneLink2 = document.getElementById("contactCardManagerTel2");
        const mWALink = document.getElementById("contactCardManagerWA");
        if (mPhoneLink1) mPhoneLink1.href = `tel:${managerTel}`;
        if (mPhoneLink2) {
            mPhoneLink2.href = `tel:${managerTel}`;
            mPhoneLink2.title = `Call ${cleanManagerDisplayName}`;
        }
        if (mWALink) {
            const mMsg = encodeURIComponent(
                `Assalam-o-Alaikum ${cleanManagerDisplayName} Sahib, I need details regarding ${agencyName}.`
            );
            mWALink.href = `https://wa.me/${managerWA}?text=${mMsg}`;
            mWALink.title = `WhatsApp ${cleanManagerDisplayName}`;
        }

        setText("contactCardSecondaryName", cleanSecondaryDisplayName);
        setText("contactCardSecondaryPhone", c.secondaryPhone || "+92 343 4159182");
        const sPhoneLink1 = document.getElementById("contactCardSecondaryTel1");
        const sPhoneLink2 = document.getElementById("contactCardSecondaryTel2");
        const sWALink = document.getElementById("contactCardSecondaryWA");
        if (sPhoneLink1) sPhoneLink1.href = `tel:${secondaryTel}`;
        if (sPhoneLink2) {
            sPhoneLink2.href = `tel:${secondaryTel}`;
            sPhoneLink2.title = `Call ${cleanSecondaryDisplayName}`;
        }
        if (sWALink) {
            const sMsg = encodeURIComponent(
                `Assalam-o-Alaikum ${cleanSecondaryDisplayName} Sahib, I need details regarding ${agencyName}.`
            );
            sWALink.href = `https://wa.me/${secondaryWA}?text=${sMsg}`;
            sWALink.title = `WhatsApp ${cleanSecondaryDisplayName}`;
        }

        // --- Footer & Modal Consultant Dropdown ---
        setText("footerAgencyName", agencyName);
        setText("footerTaglinePrimary", taglinePrimary);
        setText("footerCopyrightAgency", agencyName);

        // --- 404 page footer line (A-06): composed from stored addresses
        // and the manager's phone, never re-typed ---
        const notFoundInfo = document.getElementById("notFoundFooterInfo");
        if (notFoundInfo) {
            notFoundInfo.textContent =
                `${agencyName} — Head Office: ${branch1Address} · Branch: ` +
                `${pHome.branch2Address || "Office No. 7, Ground Floor, Potohar Plaza, Fazal-e-Haq Road, Blue Area, Islamabad"} · WhatsApp: ` +
                `${c.managerPhone || "+92 349 0558345"}`;
        }

        const modalAgentSelect = document.getElementById("modalAgentPhone");
        if (modalAgentSelect) {
            modalAgentSelect.innerHTML = `
                <option value="${escapeHtmlAttr(managerWA)}">${escapeHtmlAttr(c.managerName || "Inam Khan (Manager)")} - ${escapeHtmlAttr(c.managerPhone || "+92 349 0558345")}</option>
                <option value="${escapeHtmlAttr(secondaryWA)}">${escapeHtmlAttr(c.secondaryName || "Sadiq Ullah")} - ${escapeHtmlAttr(c.secondaryPhone || "+92 343 4159182")}</option>
            `;
            modalAgentSelect.value = activeWA;
        }

        updateFlyerModalContent(config);
    }

    // ============================================================================
    // 2B. DYNAMIC MULTI-DEAL SPECIAL FLYER SHOWCASE RENDERER (CRUD)
    // ============================================================================

    function getActiveSpecialDeals(deals) {
        const list = Array.isArray(deals) ? deals.filter((d) => d && d.isActive !== false) : [];
        if (list.length > 0) return list;

        // Fallback to site_config.spotlight if all deals were deleted or none exist
        const s = (liveSiteConfig && liveSiteConfig.spotlight) || {};
        return [
            {
                id: "deal_fallback_spotlight",
                monthLabel: s.monthLabel || "January",
                title: s.title || "UMRAH PACKAGE",
                subtitle: "Complete spiritual peace of mind with our all-inclusive Umrah deal from Islamabad to Haramain.",
                startingPrice: Number(s.startingPrice || 232000),
                priceUnit: s.priceUnit || "PER PERSON (SHARING)",
                badgeTag: "All-Inclusive Deal",
                departureDate: s.departureDate || "Jan 26, 2026",
                returnDate: s.returnDate || "Feb 09, 2026",
                duration: s.duration || "14 Nights",
                madinahImageUrl:
                    s.madinahImageUrl ||
                    "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80",
                makkahImageUrl:
                    s.makkahImageUrl ||
                    "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80",
                leftFrameBadge: "Ziyarat & Stay",
                leftFrameTitle: "Madinah Munawwarah",
                madinahHotel: s.madinahHotel || "Al Eiman Taibah / Similar (Near Markazia)",
                rightFrameBadge: "Haram View Options",
                rightFrameTitle: "Makkah Mukarramah",
                makkahHotel: s.makkahHotel || "Emaar Al Khalil / Similar (Shuttle / Walk)",
                promotionalFlyerUrl: s.promotionalFlyerUrl || "",
                showFlyerButton: s.showFlyerOnHomepage !== false,
                servicesIncluded: s.servicesIncluded || {
                    roundTrip: true,
                    visa: true,
                    hotel: true,
                    transport: true
                },
                isPrimary: true,
                isActive: true
            }
        ];
    }

    window.filterSpecialDealsShowcase = function (dealId) {
        selectedSpecialDealFilter = dealId || "ALL";
        renderSpecialDealsShowcase(liveSpecialDeals);
    };

    function renderSpecialDealsShowcase(deals) {
        const container = document.getElementById("specialDealsShowcaseContainer");
        const filterBar = document.getElementById("specialDealsFilterBar");

        const activeDeals = getActiveSpecialDeals(deals);
        const primaryDeal = activeDeals.find((d) => d.isPrimary) || activeDeals[0];

        // Also update the top section header to reflect the primary deal or multi-deal count
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        if (primaryDeal) {
            setText(
                "spotlightMonthLabel",
                activeDeals.length > 1
                    ? `${primaryDeal.monthLabel || "January"} & Special Seasonal Offers`
                    : `${primaryDeal.monthLabel || "January"} & Upcoming`
            );
            const titleWords = String(primaryDeal.title || "UMRAH PACKAGE").trim().split(/\s+/);
            setText("spotlightTitlePrimary", titleWords[0] || "UMRAH");
            setText("spotlightTitleSecondary", titleWords.slice(1).join(" ") || "PACKAGE");
            setText("spotlightDurationCopy", primaryDeal.duration || "14 Nights");
        }

        if (!container) return;

        // If selected filter no longer exists, reset to ALL
        if (
            selectedSpecialDealFilter !== "ALL" &&
            !activeDeals.some((d) => d.id === selectedSpecialDealFilter)
        ) {
            selectedSpecialDealFilter = "ALL";
        }

        // Render interactive Deal Switcher Pills if there are multiple active deals
        if (filterBar) {
            if (activeDeals.length > 1) {
                filterBar.classList.remove("hidden");
                filterBar.innerHTML = `
                    <div class="inline-flex flex-wrap items-center justify-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-md border border-teal/20">
                            <button type="button" data-deal-filter="ALL" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
                            selectedSpecialDealFilter === "ALL"
                                ? "bg-gradient-to-r from-navy to-teal text-white shadow-md scale-[1.02]"
                                : "text-slate-600 hover:text-navy hover:bg-slate-100"
                        }">
                            <i class="fa-solid fa-layer-group"></i>
                            <span>All Special Offers (${activeDeals.length})</span>
                        </button>
                        ${activeDeals
                            .map(
                                (deal) => `
                            <button type="button" data-deal-filter="${escapeHtmlAttr(deal.id)}" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
                                    selectedSpecialDealFilter === deal.id
                                        ? "bg-gradient-to-r from-navy to-teal text-white shadow-md scale-[1.02]"
                                        : "text-slate-600 hover:text-navy hover:bg-slate-100"
                                }">
                                <i class="fa-solid ${deal.isPrimary ? "fa-crown text-amber-400" : "fa-star text-teal"}"></i>
                                <span>${escapeHtmlAttr(deal.monthLabel)}: PKR ${formatPKR(deal.startingPrice)}</span>
                            </button>
                        `
                            )
                            .join("")}
                    </div>
                `;
            } else {
                filterBar.classList.add("hidden");
                filterBar.innerHTML = "";
            }
        }

        const dealsToShow =
            selectedSpecialDealFilter === "ALL"
                ? activeDeals
                : activeDeals.filter((d) => d.id === selectedSpecialDealFilter);

        const activeWA = getResolvedActiveWhatsApp(liveSiteConfig);
        const agencyName =
            (liveSiteConfig && liveSiteConfig.contacts && liveSiteConfig.contacts.agencyName) ||
            "Zakir Travel & Tours";

        container.innerHTML = dealsToShow
            .map((deal, idx) => {
                const srv = deal.servicesIncluded || {};
                const titleWords = String(deal.title || "UMRAH PACKAGE").trim().split(/\s+/);
                const firstWord = titleWords[0] || "UMRAH";
                const restWords = titleWords.slice(1).join(" ") || "PACKAGE";

                const madinahHotelName = deal.madinahHotel || "Al Eiman Taibah / Similar (Near Markazia)";
                const makkahHotelName = deal.makkahHotel || "Emaar Al Khalil / Similar (Shuttle / Walk)";

                const bookingLabel = `${deal.monthLabel || "Special"} ${deal.title || "Umrah Package"} (${deal.duration || "14 Nights"} - PKR ${formatPKR(deal.startingPrice || 232000)})`;
                const waText = encodeURIComponent(
                    `Assalam-o-Alaikum ${agencyName}!\n\nI am interested in your Special Offer:\n*${deal.monthLabel || "Special"} ${deal.title || "UMRAH PACKAGE"}*\n- Starting Price: PKR ${formatPKR(deal.startingPrice || 232000)} (${deal.priceUnit || "PER PERSON SHARING"})\n- Duration: ${deal.duration || "14 Nights"}\n- Departure: ${deal.departureDate || "Flexible"}\n- Return: ${deal.returnDate || "Scheduled"}\n- Madinah Hotel: ${madinahHotelName}\n- Makkah Hotel: ${makkahHotelName}\n\nPlease share seat availability and booking details.`
                );

                const srvClass = (isInc) =>
                    isInc !== false
                        ? "bg-slate-50 hover:bg-teal-accent/60 border border-slate-200 hover:border-teal/40 hover:-translate-y-1 shadow-sm"
                        : "bg-slate-50 border border-slate-200 opacity-40 grayscale line-through";

                return `
                <div class="special-deal-showcase-card bg-white rounded-2xl sm:rounded-3xl shadow-flyer border-2 ${
                    deal.isPrimary ? "border-teal/35" : "border-navy/15"
                } overflow-hidden transition-all duration-500 hover:shadow-2xl" style="animation: zakirDealCardEntrance 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.12}s both;">
                    
                    <!-- Deal Top Ribbon Header (Compact on phone, spacious on desktop) -->
                    <div class="bg-gradient-to-r from-slate-50 via-teal-accent/40 to-slate-50 px-3.5 sm:px-8 lg:px-10 py-3 sm:py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span class="inline-flex items-center gap-1 text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow-sm ${
                                deal.isPrimary
                                    ? "bg-gradient-to-r from-navy to-teal text-white"
                                    : "bg-navy/10 text-navy"
                            }">
                                <i class="fa-solid ${deal.isPrimary ? "fa-crown text-amber-300" : "fa-bolt text-teal"}"></i>
                                ${escapeHtmlAttr(deal.badgeTag || (deal.isPrimary ? "Primary Spotlight Deal" : "Limited Time Offer"))}
                            </span>
                            <span class="font-script text-xl sm:text-3xl text-teal">${escapeHtmlAttr(deal.monthLabel || "January")}</span>
                            <h3 class="text-base sm:text-2xl font-black tracking-tight uppercase">
                                <span class="text-navy">${escapeHtmlAttr(firstWord)}</span>
                                <span class="text-teal">${escapeHtmlAttr(restWords)}</span>
                            </h3>
                        </div>
                        <div class="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
                            <span class="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-navy shadow-sm">
                                <i class="fa-regular fa-calendar-check text-teal"></i>
                                Dep: <strong class="text-teal">${escapeHtmlAttr(deal.departureDate || "Jan 26, 2026")}</strong>
                            </span>
                            <span class="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-navy shadow-sm">
                                <i class="fa-regular fa-clock text-teal"></i>
                                <strong>${escapeHtmlAttr(deal.duration || "14 Nights")}</strong>
                            </span>
                        </div>
                    </div>

                    <div class="p-3 sm:p-8 lg:p-10">
                        <!-- Dual Framed Images (Side-by-Side on BOTH Phone & Laptop) with Center Overlapping Price Shield -->
                        <div class="relative grid grid-cols-2 gap-2 sm:gap-6 lg:gap-10 items-center">
                            
                            <!-- Left Frame: Masjid an-Nabawi (Madinah) -->
                            <div class="group relative rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 border-teal shadow-md sm:shadow-lg h-36 sm:h-64 lg:h-72">
                                <img src="${escapeHtmlAttr(
                                    deal.madinahImageUrl ||
                                        "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80"
                                )}" 
                                     onerror="this.src='https://placehold.co/800x600/0B2D5B/FFFFFF?text=Masjid+an-Nabawi+Madinah'"
                                     alt="${escapeHtmlAttr(deal.leftFrameTitle || "Madinah Munawwarah")}" 
                                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out">
                                <div class="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/25 to-transparent"></div>
                                <div class="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 text-white max-w-[78%] sm:max-w-[70%]">
                                    <span class="bg-teal text-[8px] sm:text-xs font-bold uppercase px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded shadow inline-block">${escapeHtmlAttr(
                                        deal.leftFrameBadge || "Ziyarat & Stay"
                                    )}</span>
                                    <h4 class="text-xs sm:text-xl font-bold mt-0.5 sm:mt-1.5 drop-shadow leading-tight">${escapeHtmlAttr(
                                        deal.leftFrameTitle || "Madinah Munawwarah"
                                    )}</h4>
                                </div>
                            </div>

                            <!-- Center Overlapping Price Badge (Centered on Both Mobile & Laptop) -->
                            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex justify-center pointer-events-auto">
                                <div class="flyer-badge floating-price-shield text-white p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-white text-center w-36 sm:w-64 lg:w-72 transform hover:scale-105 transition-transform duration-300">
                                    <div class="border border-teal-light/60 sm:border-2 rounded-xl sm:rounded-2xl py-2 px-1.5 sm:py-4 sm:px-4 bg-navy/45 backdrop-blur-sm">
                                        <span class="text-[7.5px] sm:text-[11px] font-bold uppercase tracking-widest text-sky-200 block leading-none">STARTING FROM</span>
                                        <div class="text-lg sm:text-3xl lg:text-4xl font-black tracking-tight my-0.5 sm:my-1 text-white drop-shadow leading-tight">
                                            ${formatPKR(deal.startingPrice || 232000)}
                                        </div>
                                        <span class="text-[7.5px] sm:text-xs font-semibold uppercase tracking-wider text-teal-accent block leading-tight">PKR ${escapeHtmlAttr(
                                            deal.priceUnit || "PER PERSON (SHARING)"
                                        )}</span>
                                        <div class="mt-1 sm:mt-2 inline-flex items-center gap-1 text-[7.5px] sm:text-[11px] bg-white/15 px-2 sm:px-2.5 py-0.5 rounded-full">
                                            <i class="fa-solid fa-mosque text-amber-300"></i> ${escapeHtmlAttr(
                                                deal.badgeTag || "All-Inclusive Deal"
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Frame: Holy Kaaba (Makkah) -->
                            <div class="group relative rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 border-navy shadow-md sm:shadow-lg h-36 sm:h-64 lg:h-72">
                                <img src="${escapeHtmlAttr(
                                    deal.makkahImageUrl ||
                                        "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80"
                                )}" 
                                     onerror="this.src='https://placehold.co/800x600/0D8A9E/FFFFFF?text=Makkah+Mukarramah'"
                                     alt="${escapeHtmlAttr(deal.rightFrameTitle || "Makkah Mukarramah")}" 
                                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out">
                                <div class="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/25 to-transparent"></div>
                                <div class="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 text-right text-white max-w-[78%] sm:max-w-[70%] ml-auto">
                                    <span class="bg-navy text-[8px] sm:text-xs font-bold uppercase px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded shadow inline-block">${escapeHtmlAttr(
                                        deal.rightFrameBadge || "Haram View Options"
                                    )}</span>
                                    <h4 class="text-xs sm:text-xl font-bold mt-0.5 sm:mt-1.5 drop-shadow leading-tight">${escapeHtmlAttr(
                                        deal.rightFrameTitle || "Makkah Mukarramah"
                                    )}</h4>
                                </div>
                            </div>

                        </div>

                        <!-- Dedicated Hotel Name Boxes for Both Locations (Madinah & Makkah) -->
                        <div class="mt-2.5 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-6 lg:gap-10 items-stretch">
                            <!-- Left Hotel Box: Madinah Hotel -->
                            <div class="bg-gradient-to-r from-[#F0FAFC] via-white to-[#F0FAFC] border-2 border-teal/40 hover:border-teal rounded-xl sm:rounded-2xl p-2 sm:p-3.5 shadow-sm flex items-start sm:items-center gap-2 sm:gap-3.5 transition-all h-full">
                                <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-teal text-white flex items-center justify-center shrink-0 shadow-sm text-xs sm:text-lg mt-0.5 sm:mt-0">
                                    <i class="fa-solid fa-hotel"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-1 text-[8.5px] sm:text-[11px] font-black uppercase tracking-wider text-teal">
                                        <i class="fa-solid fa-mosque text-[8px] sm:text-[10px] shrink-0"></i>
                                        <span>Madinah Hotel</span>
                                    </div>
                                    <div class="text-[10.5px] sm:text-sm lg:text-base font-extrabold text-navy leading-snug break-words mt-0.5">
                                        ${escapeHtmlAttr(madinahHotelName)}
                                    </div>
                                </div>
                            </div>

                            <!-- Right Hotel Box: Makkah Hotel -->
                            <div class="bg-gradient-to-r from-[#F3F6FB] via-white to-[#F3F6FB] border-2 border-navy/30 hover:border-navy rounded-xl sm:rounded-2xl p-2 sm:p-3.5 shadow-sm flex items-start sm:items-center gap-2 sm:gap-3.5 transition-all h-full">
                                <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-navy text-white flex items-center justify-center shrink-0 shadow-sm text-xs sm:text-lg mt-0.5 sm:mt-0">
                                    <i class="fa-solid fa-kaaba text-amber-300"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-1 text-[8.5px] sm:text-[11px] font-black uppercase tracking-wider text-navy">
                                        <i class="fa-solid fa-hotel text-[8px] sm:text-[10px] text-teal shrink-0"></i>
                                        <span>Makkah Hotel</span>
                                    </div>
                                    <div class="text-[10.5px] sm:text-sm lg:text-base font-extrabold text-navy leading-snug break-words mt-0.5">
                                        ${escapeHtmlAttr(makkahHotelName)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Schedule Strip (Left: Departures | Center: Duration | Right: Return / Schedule) -->
                        <div class="mt-3 sm:mt-6 border-2 border-teal rounded-xl sm:rounded-2xl bg-slate-50 p-2.5 sm:p-5 grid grid-cols-3 gap-1 sm:gap-4 divide-x divide-teal/30">
                            <!-- 1. Left: Departures -->
                            <div class="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-3.5 px-1 sm:px-2">
                                <div class="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-navy/10 text-navy flex items-center justify-center text-xs sm:text-2xl shrink-0">
                                    <i class="fa-solid fa-plane-departure"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="text-[8.5px] sm:text-xs font-bold uppercase tracking-wider text-navy leading-tight">Departures</div>
                                    <div class="text-[11px] sm:text-lg lg:text-xl font-extrabold text-teal leading-tight mt-0.5">
                                        <span>${escapeHtmlAttr(deal.departureDate || "Jan 26, 2026")}</span>
                                        <span class="text-[8px] sm:text-xs font-normal text-slate-500 block lg:inline">(Weekly Batches)</span>
                                    </div>
                                </div>
                            </div>

                            <!-- 2. Center: Duration -->
                            <div class="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-3.5 px-1 sm:px-2">
                                <div class="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-teal/15 text-teal flex items-center justify-center text-xs sm:text-2xl shrink-0">
                                    <i class="fa-regular fa-clock"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="text-[8.5px] sm:text-xs font-bold uppercase tracking-wider text-navy leading-tight">Duration</div>
                                    <div class="text-[11px] sm:text-lg lg:text-xl font-extrabold text-teal leading-tight mt-0.5">${escapeHtmlAttr(
                                        deal.duration || "14 Nights"
                                    )}</div>
                                </div>
                            </div>

                            <!-- 3. Right: Return / Schedule -->
                            <div class="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-3.5 px-1 sm:px-2">
                                <div class="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-navy/10 text-navy flex items-center justify-center text-xs sm:text-2xl shrink-0">
                                    <i class="fa-solid fa-plane-arrival"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="text-[8.5px] sm:text-xs font-bold uppercase tracking-wider text-navy leading-tight">Return / Schedule</div>
                                    <div class="text-[11px] sm:text-lg lg:text-xl font-extrabold text-teal leading-tight mt-0.5">${escapeHtmlAttr(
                                        deal.returnDate || "Feb 09, 2026"
                                    )}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Services Included Banner (4-Column Compact Row on Mobile & Desktop) -->
                        <div class="mt-3.5 sm:mt-7 text-center">
                            <div class="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-navy via-teal to-navy text-white font-extrabold uppercase tracking-wider px-5 sm:px-8 py-1.5 sm:py-2.5 rounded-full shadow-md text-[10px] sm:text-sm">
                                <span class="text-[9px] sm:text-xs">◆</span>
                                <span>SERVICES INCLUDED</span>
                                <span class="text-[9px] sm:text-xs">◆</span>
                            </div>

                            <div class="grid grid-cols-4 gap-1.5 sm:gap-5 mt-3 sm:mt-6 max-w-4xl mx-auto">
                                <div class="${srvClass(srv.roundTrip)} rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-sm sm:text-2xl mb-1.5 sm:mb-3 transition-all">
                                        <i class="fa-solid fa-earth-americas"></i>
                                    </div>
                                    <h4 class="font-extrabold text-navy text-[10px] sm:text-base leading-tight">Round Trip</h4>
                                    <p class="text-[8px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">Return Air Ticket</p>
                                </div>

                                <div class="${srvClass(srv.visa)} rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-sm sm:text-2xl mb-1.5 sm:mb-3 transition-all">
                                        <i class="fa-solid fa-id-card-clip"></i>
                                    </div>
                                    <h4 class="font-extrabold text-navy text-[10px] sm:text-base leading-tight">Umrah Visa</h4>
                                    <p class="text-[8px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">E-Visa & Insurance</p>
                                </div>

                                <div class="${srvClass(srv.hotel)} rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-sm sm:text-2xl mb-1.5 sm:mb-3 transition-all">
                                        <i class="fa-solid fa-hotel"></i>
                                    </div>
                                    <h4 class="font-extrabold text-navy text-[10px] sm:text-base leading-tight">Hotel Stay</h4>
                                    <p class="text-[8px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">Makkah & Madinah</p>
                                </div>

                                <div class="${srvClass(srv.transport)} rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-sm sm:text-2xl mb-1.5 sm:mb-3 transition-all">
                                        <i class="fa-solid fa-bus-simple"></i>
                                    </div>
                                    <h4 class="font-extrabold text-navy text-[10px] sm:text-base leading-tight">Transport</h4>
                                    <p class="text-[8px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">Luxury AC Transport</p>
                                </div>
                            </div>

                            <!-- Action Buttons (Compact side-by-side row on Mobile & Laptop) -->
                            <div class="mt-4 sm:mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                                <button type="button" data-book-service="${escapeHtmlAttr(bookingLabel)}" class="bg-navy hover:bg-navy-light text-white font-bold px-3.5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base">
                                    <i class="fa-solid fa-calendar-check text-teal-light"></i>
                                    <span>Reserve Your Seat Now</span>
                                </button>
                                <a href="https://wa.me/${activeWA}?text=${waText}" target="_blank" rel="noopener noreferrer" class="bg-teal hover:bg-teal-dark text-white font-bold px-3.5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base">
                                    <i class="fa-brands fa-whatsapp text-sm sm:text-xl"></i>
                                    <span>Book via WhatsApp</span>
                                </a>
                                ${
                                    deal.showFlyerButton !== false
                                        ? `<button type="button" data-open-flyer="${escapeHtmlAttr(deal.id)}" class="bg-slate-100 hover:bg-teal-accent text-navy font-bold px-3.5 sm:px-6 py-2.5 sm:py-3.5 rounded-xl border border-teal/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base">
                                            <i class="fa-solid fa-file-image text-teal"></i>
                                            <span>View Latest Flyer</span>
                                           </button>`
                                        : ""
                                }
                            </div>
                        </div>

                    </div>
                </div>
                `;
            })
            .join("");
    }

    // ============================================================================
    // 3. RENDER UMRAH PACKAGES COLLECTION GRID & HERO DROPDOWN
    // ============================================================================

    function populateHeroUmrahDropdown(packages, specialDeals, config) {
        const select = document.getElementById("umrahPackageType");
        if (!select) return;

        const activeDeals = getActiveSpecialDeals(specialDeals);
        const activePkgs = (packages || []).filter((p) => p.isActive !== false);

        const optionsHtml = [];

        // Include all active Special Flyer Deals first
        activeDeals.forEach((d) => {
            const label = `${d.monthLabel || "Special"} ${d.title || "Umrah Deal"} (${d.duration || "14 Nights"} - PKR ${formatPKR(d.startingPrice || 232000)})`;
            optionsHtml.push(
                `<option value="${escapeHtmlAttr(label)}">★ ${escapeHtmlAttr(d.monthLabel || "Special")} ${escapeHtmlAttr(d.title || "Umrah")} (${escapeHtmlAttr(d.duration || "14 Nights")} - PKR ${formatPKR(d.startingPrice || 232000)})</option>`
            );
        });

        // Include Comparison Umrah Packages
        activePkgs.forEach((p) => {
            if (!p.isFeatured) {
                const val = `${p.title} (${p.duration} - PKR ${formatPKR(p.price)})`;
                optionsHtml.push(
                    `<option value="${escapeHtmlAttr(val)}">${escapeHtmlAttr(p.title)} (PKR ${formatPKR(p.price)})</option>`
                );
            }
        });

        optionsHtml.push(`<option value="Customized Family Umrah Package">Customized Family Umrah Package</option>`);
        select.innerHTML = optionsHtml.join("");
    }

    function renderUmrahPackagesGrid(packages) {
        const grid = document.getElementById("umrahPackagesGrid");
        if (!grid) return;

        const activePkgs = (packages || []).filter((p) => p.isActive !== false);
        if (!activePkgs.length) {
            grid.innerHTML = `<div class="col-span-full bg-white rounded-2xl p-8 text-center text-slate-500">Contact us on WhatsApp for custom Umrah group & family packages.</div>`;
            return;
        }

        const activeWA = getResolvedActiveWhatsApp(liveSiteConfig);
        const agencyName =
            (liveSiteConfig && liveSiteConfig.contacts && liveSiteConfig.contacts.agencyName) ||
            "Zakir Travel & Tours";

        grid.innerHTML = activePkgs
            .map((pkg) => {
                const servicesList = Array.isArray(pkg.services) ? pkg.services : [];
                const waText = encodeURIComponent(
                    `Assalam-o-Alaikum ${agencyName}!\n\nI would like to book / inquire about:\n*Package:* ${pkg.title}\n*Rate:* PKR ${formatPKR(pkg.price)} (${pkg.roomType})\n*Duration:* ${pkg.duration}\n*Departure:* ${pkg.departureDate}\n\nPlease share availability and seat confirmation.`
                );

                return `
                <div class="bg-white rounded-3xl p-5 sm:p-6 border-2 ${pkg.isFeatured ? "border-teal shadow-flyer pt-8 sm:pt-8" : "border-slate-200/90 shadow-md pt-6"} hover:border-teal hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden h-full">
                    ${
                        pkg.isFeatured
                            ? `<div class="absolute top-0 right-0 bg-gradient-to-r from-navy to-teal text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl shadow-sm">
                                <i class="fa-solid fa-star text-amber-300 mr-1"></i>Featured Deal
                               </div>`
                            : ""
                    }
                    <div class="flex-1 flex flex-col">
                        <!-- Top Meta Row: Badge & Duration (Never wraps awkwardly) -->
                        <div class="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                            <span class="bg-teal-accent text-teal text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap">
                                ${escapeHtmlAttr(pkg.badgeText || "Umrah Deal")}
                            </span>
                            <span class="text-[11px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
                                <i class="fa-regular fa-clock text-teal"></i>
                                <span>${escapeHtmlAttr(pkg.duration)}</span>
                            </span>
                        </div>

                        <!-- Package Title -->
                        <h3 class="text-lg sm:text-[19px] font-black text-navy leading-snug mb-3 min-h-[2.75rem] flex items-center break-words">
                            ${escapeHtmlAttr(pkg.title)}
                        </h3>

                        <!-- Structured Price & Room Tier Box (Self-adjusting, never splits PKR and amount) -->
                        <div class="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 mb-4">
                            <div class="flex items-center justify-between gap-2 mb-1">
                                <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Starting From</span>
                                <span class="text-[10px] font-bold text-teal bg-teal-accent/70 px-2 py-0.5 rounded-md whitespace-nowrap">Per Person</span>
                            </div>
                            <div class="text-2xl font-black text-teal tracking-tight leading-none my-1 whitespace-nowrap">
                                PKR ${formatPKR(pkg.price)}
                            </div>
                            <div class="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                                <span class="text-[10.5px] font-bold uppercase tracking-wide text-slate-400 shrink-0">Room Type</span>
                                <span class="text-[11px] font-extrabold text-navy bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-right leading-tight break-words">
                                    ${escapeHtmlAttr(pkg.roomType)}
                                </span>
                            </div>
                        </div>

                        <!-- Schedule & Self-Adjusting Hotel Boxes -->
                        <div class="space-y-2 text-xs text-slate-600 mb-4">
                            <!-- Departure & Return Rows -->
                            <div class="bg-slate-50/70 border border-slate-200/70 rounded-xl p-2.5 space-y-1.5">
                                <div class="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-200/60">
                                    <span class="font-bold text-slate-500 whitespace-nowrap shrink-0 flex items-center gap-1.5">
                                        <i class="fa-solid fa-plane-departure text-teal w-3.5 text-center"></i>
                                        <span>Departure</span>
                                    </span>
                                    <span class="font-extrabold text-navy text-right leading-snug break-words">${escapeHtmlAttr(pkg.departureDate)}</span>
                                </div>
                                <div class="flex items-start justify-between gap-2 pt-0.5">
                                    <span class="font-bold text-slate-500 whitespace-nowrap shrink-0 flex items-center gap-1.5">
                                        <i class="fa-solid fa-plane-arrival text-teal w-3.5 text-center"></i>
                                        <span>Return</span>
                                    </span>
                                    <span class="font-extrabold text-navy text-right leading-snug break-words">${escapeHtmlAttr(pkg.returnDate)}</span>
                                </div>
                            </div>

                            <!-- Makkah Hotel Box (Auto-adjusts height cleanly when text is long) -->
                            <div class="bg-[#F4F7FB] border border-navy/15 rounded-xl p-2.5">
                                <div class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-navy/75 mb-0.5">
                                    <i class="fa-solid fa-kaaba text-teal text-[11px] shrink-0"></i>
                                    <span>Makkah Hotel</span>
                                </div>
                                <div class="text-xs font-extrabold text-navy leading-snug break-words pl-5">
                                    ${escapeHtmlAttr(pkg.makkahHotelDist)}
                                </div>
                            </div>

                            <!-- Madinah Hotel Box (Auto-adjusts height cleanly when text is long) -->
                            <div class="bg-[#F0FAFC] border border-teal/25 rounded-xl p-2.5">
                                <div class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-teal mb-0.5">
                                    <i class="fa-solid fa-mosque text-teal text-[11px] shrink-0"></i>
                                    <span>Madinah Hotel</span>
                                </div>
                                <div class="text-xs font-extrabold text-navy leading-snug break-words pl-5">
                                    ${escapeHtmlAttr(pkg.madinahHotelDist)}
                                </div>
                            </div>
                        </div>

                        <!-- Included Services (Uniform Full-Width Self-Adjusting Rows) -->
                        <div class="space-y-1.5 mb-5 mt-auto">
                            ${servicesList
                                .map(
                                    (srv) =>
                                        `<div class="bg-slate-50 border border-slate-200/75 text-slate-700 text-[11.5px] font-bold px-3 py-1.5 rounded-xl flex items-start gap-2 leading-snug break-words">
                                            <i class="fa-solid fa-circle-check text-teal text-xs mt-0.5 shrink-0"></i>
                                            <span class="flex-1">${escapeHtmlAttr(srv)}</span>
                                         </div>`
                                )
                                .join("")}
                        </div>
                    </div>

                    <!-- Action Buttons (Single-line clean buttons) -->
                    <div class="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                        <button type="button" data-book-service="${escapeHtmlAttr(`${pkg.title} (PKR ${formatPKR(pkg.price)})`)}" class="bg-navy hover:bg-navy-light text-white font-extrabold text-[11.5px] py-3 px-2.5 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <i class="fa-solid fa-paper-plane text-teal-light text-[11px]"></i>
                            <span>Quick Book</span>
                        </button>
                        <a href="https://wa.me/${activeWA}?text=${waText}" target="_blank" rel="noopener noreferrer" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11.5px] py-3 px-2.5 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <i class="fa-brands fa-whatsapp text-sm"></i>
                            <span>WhatsApp</span>
                        </a>
                    </div>
                </div>
            `;
            })
            .join("");
    }

    // ============================================================================
    // 4. RENDER VISA SERVICES COLLECTION GRID & HERO DROPDOWN
    // ============================================================================

    function populateHeroVisaDropdown(visas) {
        const select = document.getElementById("visaCountry");
        if (!select) return;

        const activeVisas = (visas || []).filter((v) => v.isActive !== false);
        if (!activeVisas.length) return;

        select.innerHTML = activeVisas
            .map(
                (v) =>
                    `<option value="${escapeHtmlAttr(`${v.countryName} (${v.visaType} - PKR ${formatPKR(v.pricePKR)})`)}">${escapeHtmlAttr(v.flagEmoji || "🌍")} ${escapeHtmlAttr(v.countryName)} — ${escapeHtmlAttr(v.visaType)} (PKR ${formatPKR(v.pricePKR)})</option>`
            )
            .join("");
    }

    function renderVisaServicesGrid(visas) {
        const grid = document.getElementById("visaServicesGrid");
        if (!grid) return;

        const activeVisas = (visas || []).filter((v) => v.isActive !== false);
        if (!activeVisas.length) {
            grid.innerHTML = `<div class="col-span-full bg-white rounded-2xl p-8 text-center text-slate-500">Contact us for worldwide visa consultancy and air ticket bookings.</div>`;
            return;
        }

        const activeWA = getResolvedActiveWhatsApp(liveSiteConfig);
        const agencyName =
            (liveSiteConfig && liveSiteConfig.contacts && liveSiteConfig.contacts.agencyName) ||
            "Zakir Travel & Tours";

        grid.innerHTML = activeVisas
            .map((v) => {
                const waMsg = encodeURIComponent(
                    `Assalam-o-Alaikum ${agencyName}!\n\nI would like to inquire about *${v.countryName} (${v.visaType})*:\n- Starting Fee: PKR ${formatPKR(v.pricePKR)}\n- Processing Time: ${v.processingTime}\n\nPlease guide me on the visa application process.`
                );

                return `
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-teal transition-all duration-300 flex flex-col justify-between gap-4">
                    <div>
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-3.5">
                                <div class="w-12 h-12 rounded-2xl bg-teal-accent text-2xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                                    ${v.flagUrl ? `<img src="${escapeHtmlAttr(v.flagUrl)}" alt="" class="w-full h-full object-cover rounded-2xl">` : escapeHtmlAttr(v.flagEmoji || "🌍")}
                                </div>
                                <div>
                                    <h4 class="font-extrabold text-navy text-base">${escapeHtmlAttr(v.countryName)}</h4>
                                    <span class="inline-block bg-slate-100 text-teal font-bold text-[11px] px-2.5 py-0.5 rounded-md mt-0.5">${escapeHtmlAttr(v.visaType)}</span>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="text-[10px] font-bold uppercase text-slate-400 block">From</span>
                                <span class="text-base font-black text-navy">PKR ${formatPKR(v.pricePKR)}</span>
                            </div>
                        </div>

                        <div class="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                            <div class="flex items-center justify-between">
                                <span class="text-slate-400 font-semibold"><i class="fa-regular fa-clock text-teal mr-1"></i>Processing:</span>
                                <span class="font-bold text-navy">${escapeHtmlAttr(v.processingTime)}</span>
                            </div>
                            <p class="text-[11px] text-slate-500 leading-relaxed pt-1">
                                <strong class="text-slate-700">Docs:</strong> ${escapeHtmlAttr(v.requirementsSummary)}
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 pt-2">
                        <button type="button" data-book-service="${escapeHtmlAttr(`${v.countryName} - ${v.visaType} (PKR ${formatPKR(v.pricePKR)})`)}" class="flex-1 text-navy hover:bg-navy hover:text-white font-bold text-xs py-2.5 px-3 rounded-xl bg-slate-100 transition-colors">
                            Apply / Inquire
                        </button>
                        <a href="https://wa.me/${activeWA}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl transition-colors flex items-center gap-1.5" title="Inquire on WhatsApp">
                            <i class="fa-brands fa-whatsapp text-sm"></i>
                            <span>WhatsApp</span>
                        </a>
                    </div>
                </div>
            `;
            })
            .join("");
    }

    // ============================================================================
    // 4B-1. RENDER FEATURED WORK PERMIT PROGRAMMES SHOWCASE
    // ============================================================================

    window.filterWorkPermitProgrammesShowcase = function (programmeId) {
        selectedWorkPermitProgrammeFilter = programmeId || "ALL";
        renderFeaturedWorkPermitsShowcase(liveWorkPermitProgrammes);
    };

    function renderFeaturedWorkPermitsShowcase(programmes) {
        const container = document.getElementById("featuredWorkPermitsContainer");
        const filterBar = document.getElementById("featuredWorkPermitsFilterBar");
        if (!container) return;

        const allProgs = Array.isArray(programmes) && programmes.length
            ? programmes
            : (zakirDB.getLocalWorkPermitProgrammes ? zakirDB.getLocalWorkPermitProgrammes() : []);
        const activeProgs = allProgs.filter((p) => p && p.isActive !== false);

        // Programmes carry no flag upload of their own — resolve an uploaded
        // flag from the matching admin-provided country (same collection the
        // pills and destination cards read). Falls back to the programme's
        // own CSS flag class when no uploaded flag exists for the country.
        const flagUrlByCountry = {};
        (liveWorkPermits || []).forEach((perm) => {
            if (perm && perm.countryName && perm.flagUrl) {
                flagUrlByCountry[String(perm.countryName).toLowerCase()] = perm.flagUrl;
            }
        });
        const programmeFlagUrl = (prog) =>
            (prog && prog.flagUrl) ||
            flagUrlByCountry[String((prog && prog.countryName) || "").toLowerCase()] ||
            "";

        if (!activeProgs.length) {
            container.innerHTML = `<div class="bg-white rounded-3xl p-10 text-center text-slate-500 shadow-md">
                <i class="fa-solid fa-briefcase text-4xl text-teal mb-3 block"></i>
                <h3 class="text-xl font-bold text-navy">No Active Featured Programmes</h3>
                <p class="text-sm text-slate-500 mt-1">Please check our European Destinations below or contact our Swat desk on WhatsApp.</p>
            </div>`;
            if (filterBar) filterBar.classList.add("hidden");
            return;
        }

        if (
            selectedWorkPermitProgrammeFilter !== "ALL" &&
            !activeProgs.some((p) => p.id === selectedWorkPermitProgrammeFilter)
        ) {
            selectedWorkPermitProgrammeFilter = "ALL";
        }

        if (filterBar) {
            if (activeProgs.length > 1) {
                filterBar.classList.remove("hidden");
                filterBar.innerHTML = `
                    <div class="inline-flex flex-wrap items-center justify-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-md border border-teal/20">
                        <button type="button" data-wp-prog-filter="ALL" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
                            selectedWorkPermitProgrammeFilter === "ALL"
                                ? "bg-gradient-to-r from-navy to-teal text-white shadow-md scale-[1.02]"
                                : "text-slate-600 hover:text-navy hover:bg-slate-100"
                        }">
                            <i class="fa-solid fa-layer-group"></i>
                            <span>All Featured (${activeProgs.length})</span>
                        </button>
                        ${activeProgs
                            .map(
                                (p) => `
                            <button type="button" data-wp-prog-filter="${escapeHtmlAttr(p.id)}" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
                                    selectedWorkPermitProgrammeFilter === p.id
                                        ? "bg-gradient-to-r from-navy to-teal text-white shadow-md scale-[1.02]"
                                        : "text-slate-600 hover:text-navy hover:bg-slate-100"
                                }">
                                ${flagHtmlFor({ flagUrl: programmeFlagUrl(p), flagClass: p.flagClass || "flag-eu" }, "")}
                                <span>${escapeHtmlAttr(p.countryName)}</span>
                            </button>
                        `
                            )
                            .join("")}
                    </div>
                `;
            } else {
                filterBar.classList.add("hidden");
                filterBar.innerHTML = "";
            }
        }

        const progsToShow =
            selectedWorkPermitProgrammeFilter === "ALL"
                ? activeProgs
                : activeProgs.filter((p) => p.id === selectedWorkPermitProgrammeFilter);

        const activeWA = getResolvedActiveWhatsApp(liveSiteConfig);
        const agencyName =
            (liveSiteConfig && liveSiteConfig.contacts && liveSiteConfig.contacts.agencyName) ||
            "Zakir Travel & Tours";

        // Programme services (F-04): one shared admin-editable list
        // ("Title|detail" lines), the same for every programme.
        const programmeServices = parseTitleDetailList(
            (liveSiteConfig &&
                liveSiteConfig.pageContent &&
                liveSiteConfig.pageContent.workPermit &&
                liveSiteConfig.pageContent.workPermit.programmeServices) ||
                ""
        );
        const programmeServiceIcons = [
            "fa-headset",
            "fa-clipboard-check",
            "fa-file-lines",
            "fa-layer-group"
        ];

        container.innerHTML = progsToShow
            .map((prog, idx) => {
                const country = String(prog.countryName || "Poland");
                const categories = String(prog.jobCategories || "")
                    .split(/[|,]/)
                    .map((c) => c.trim())
                    .filter(Boolean);

                const leftFallback = prog.leftImageFallback || "https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=900&q=80";
                const rightFallback = prog.rightImageFallback || "https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=900&q=80";

                const waText = encodeURIComponent(
                    `Assalam-o-Alaikum ${agencyName}!\n\nI am interested in your Featured Work Permit Programme:\n*Work Permit ${country} (${prog.shieldSub || "Type-A Permit + D-Visa"})*\n- Permit Type: ${prog.permitTypeLong || "Work Permit"}\n- Visa: ${prog.visaTypeLong || "National D-Visa"}\n- Processing: ${prog.processing || "3-6 Months"}\n- Contract: ${prog.contract || "1-3 Years"}\n- Residence: ${prog.residence || "TRC"}\n\nPlease assess my profile and guide me on the next steps.`
                );

                return `
                <div class="bg-white rounded-2xl sm:rounded-3xl shadow-flyer border-2 border-teal/35 overflow-hidden transition-all duration-500 hover:shadow-2xl">
                    <!-- Ribbon Header -->
                    <div class="bg-gradient-to-r from-slate-50 via-teal-accent/40 to-slate-50 px-3.5 sm:px-8 lg:px-10 py-3 sm:py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span class="inline-flex items-center gap-1 text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow-sm bg-gradient-to-r from-navy to-teal text-white">
                                <i class="fa-solid fa-crown text-amber-300"></i> Featured Programme
                            </span>
                            ${flagHtmlFor({ flagUrl: programmeFlagUrl(prog), flagClass: prog.flagClass || "flag-eu" }, "flag-lg")}
                            <h3 class="text-base sm:text-2xl font-black tracking-tight uppercase">
                                <span class="text-navy">Work Permit</span>
                                <span class="text-teal">${escapeHtmlAttr(country)}</span>
                            </h3>
                        </div>
                        <div class="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
                            <span class="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-navy shadow-sm">
                                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Status: <strong class="text-emerald-600">${escapeHtmlAttr(prog.statusText || "Open")}</strong>
                            </span>
                            <span class="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-navy shadow-sm">
                                <i class="fa-solid fa-earth-europe text-teal"></i>
                                <strong>${escapeHtmlAttr(prog.regionText || "EU & Schengen")}</strong>
                            </span>
                        </div>
                    </div>

                    <div class="p-3 sm:p-8 lg:p-10">
                        <!-- Dual Framed Images with Center Shield -->
                        <div class="relative grid grid-cols-2 gap-2 sm:gap-6 lg:gap-10 items-center">
                            <div class="group relative rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 border-teal shadow-md sm:shadow-lg h-36 sm:h-64 lg:h-72">
                                <img src="${escapeHtmlAttr(prog.leftImageUrl || "./assets/warsaw-poland.jpg")}"
                                     data-fallback="${escapeHtmlAttr(leftFallback)}"
                                     alt="${escapeHtmlAttr(prog.leftCityTitle || country)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out">
                                <div class="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/25 to-transparent"></div>
                                <div class="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 text-white max-w-[78%] sm:max-w-[70%]">
                                    <span class="bg-teal text-[8px] sm:text-xs font-bold uppercase px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded shadow inline-block">${escapeHtmlAttr(prog.leftImageBadge || "City Hub")}</span>
                                    <h4 class="text-xs sm:text-xl font-bold mt-0.5 sm:mt-1.5 drop-shadow leading-tight">${escapeHtmlAttr(prog.leftCityTitle || "Warsaw")}</h4>
                                </div>
                            </div>

                            <div class="absolute z-20 flex justify-center pointer-events-none" style="left: 50%; top: 50%; transform: translate(-50%, -50%); -webkit-transform: translate(-50%, -50%);">
                                <div class="floating-price-shield pointer-events-auto bg-gradient-to-br from-navy via-[#0E4C7A] to-teal text-white p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-white text-center w-36 sm:w-64 lg:w-72">
                                    <div class="border border-teal-light/60 sm:border-2 rounded-xl sm:rounded-2xl py-2 px-1.5 sm:py-4 sm:px-4 bg-navy/45 backdrop-blur-sm">
                                        <span class="text-[7.5px] sm:text-[11px] font-bold uppercase tracking-widest text-sky-200 block leading-none">${escapeHtmlAttr(prog.shieldLabel || "Work Permit")}</span>
                                        <div class="text-lg sm:text-3xl lg:text-4xl font-black tracking-tight my-0.5 sm:my-1 text-white drop-shadow leading-tight uppercase">${escapeHtmlAttr(prog.shieldCountry || country)}</div>
                                        <span class="text-[7.5px] sm:text-xs font-semibold uppercase tracking-wider text-teal-accent block leading-tight">${escapeHtmlAttr(prog.shieldSub || "Type-A Permit + D-Visa")}</span>
                                        <div class="mt-1 sm:mt-2 inline-flex items-center gap-1 text-[7.5px] sm:text-[11px] bg-white/15 px-2 sm:px-2.5 py-0.5 rounded-full">
                                            <i class="fa-solid fa-circle-check text-emerald-300"></i> ${escapeHtmlAttr(prog.shieldStatus || "Applications Open")}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="group relative rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 border-navy shadow-md sm:shadow-lg h-36 sm:h-64 lg:h-72">
                                <img src="${escapeHtmlAttr(prog.rightImageUrl || "./assets/krakow-wroclaw-poland.jpg")}"
                                     data-fallback="${escapeHtmlAttr(rightFallback)}"
                                     alt="${escapeHtmlAttr(prog.rightCityTitle || country)}"
                                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out">
                                <div class="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/25 to-transparent"></div>
                                <div class="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 text-right text-white max-w-[78%] sm:max-w-[70%] ml-auto">
                                    <span class="bg-navy text-[8px] sm:text-xs font-bold uppercase px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded shadow inline-block">${escapeHtmlAttr(prog.rightImageBadge || "Logistics Hub")}</span>
                                    <h4 class="text-xs sm:text-xl font-bold mt-0.5 sm:mt-1.5 drop-shadow leading-tight">${escapeHtmlAttr(prog.rightCityTitle || "Wrocław & Kraków")}</h4>
                                </div>
                            </div>
                        </div>

                        <!-- Permit & Visa Boxes -->
                        <div class="mt-2.5 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-6 lg:gap-10 items-stretch">
                            <div class="bg-gradient-to-r from-[#F0FAFC] via-white to-[#F0FAFC] border-2 border-teal/40 hover:border-teal rounded-xl sm:rounded-2xl p-2 sm:p-3.5 shadow-sm flex items-start sm:items-center gap-2 sm:gap-3.5 transition-all h-full">
                                <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-teal text-white flex items-center justify-center shrink-0 shadow-sm text-xs sm:text-lg mt-0.5 sm:mt-0">
                                    <i class="fa-solid fa-file-signature"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="text-[8.5px] sm:text-[11px] font-black uppercase tracking-wider text-teal">Work Permit</div>
                                    <div class="text-[10.5px] sm:text-sm lg:text-base font-extrabold text-navy leading-snug break-words mt-0.5">${escapeHtmlAttr(prog.permitTypeLong || "Voivodeship Type-A Permit")}</div>
                                </div>
                            </div>
                            <div class="bg-gradient-to-r from-[#F3F6FB] via-white to-[#F3F6FB] border-2 border-navy/30 hover:border-navy rounded-xl sm:rounded-2xl p-2 sm:p-3.5 shadow-sm flex items-start sm:items-center gap-2 sm:gap-3.5 transition-all h-full">
                                <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-navy text-white flex items-center justify-center shrink-0 shadow-sm text-xs sm:text-lg mt-0.5 sm:mt-0">
                                    <i class="fa-solid fa-passport text-amber-300"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="text-[8.5px] sm:text-[11px] font-black uppercase tracking-wider text-navy">Entry Visa</div>
                                    <div class="text-[10.5px] sm:text-sm lg:text-base font-extrabold text-navy leading-snug break-words mt-0.5">${escapeHtmlAttr(prog.visaTypeLong || "National D-Type Work Visa (Schengen Valid)")}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Schedule Strip -->
                        <div class="mt-3 sm:mt-6 border-2 border-teal rounded-xl sm:rounded-2xl bg-slate-50 p-2.5 sm:p-5 grid grid-cols-3 gap-1 sm:gap-4 divide-x divide-teal/30">
                            <div class="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-3.5 px-1 sm:px-2">
                                <div class="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-navy/10 text-navy flex items-center justify-center text-xs sm:text-2xl shrink-0"><i class="fa-solid fa-hourglass-half"></i></div>
                                <div class="min-w-0">
                                    <div class="text-[8.5px] sm:text-xs font-bold uppercase tracking-wider text-navy leading-tight">Processing</div>
                                    <div class="text-[11px] sm:text-lg lg:text-xl font-extrabold text-teal leading-tight mt-0.5">${escapeHtmlAttr(prog.processing || "3–6 Months")} <span class="text-[8px] sm:text-xs font-normal text-slate-500 block lg:inline">(${escapeHtmlAttr(prog.processingNote || "Approx.")})</span></div>
                                </div>
                            </div>
                            <div class="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-3.5 px-1 sm:px-2">
                                <div class="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-teal/15 text-teal flex items-center justify-center text-xs sm:text-2xl shrink-0"><i class="fa-solid fa-file-contract"></i></div>
                                <div class="min-w-0">
                                    <div class="text-[8.5px] sm:text-xs font-bold uppercase tracking-wider text-navy leading-tight">Contract</div>
                                    <div class="text-[11px] sm:text-lg lg:text-xl font-extrabold text-teal leading-tight mt-0.5">${escapeHtmlAttr(prog.contract || "1–3 Years")} <span class="text-[8px] sm:text-xs font-normal text-slate-500 block lg:inline">(${escapeHtmlAttr(prog.contractNote || "Renewable")})</span></div>
                                </div>
                            </div>
                            <div class="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-3.5 px-1 sm:px-2">
                                <div class="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-navy/10 text-navy flex items-center justify-center text-xs sm:text-2xl shrink-0"><i class="fa-solid fa-id-card"></i></div>
                                <div class="min-w-0">
                                    <div class="text-[8.5px] sm:text-xs font-bold uppercase tracking-wider text-navy leading-tight">Residence Path</div>
                                    <div class="text-[11px] sm:text-lg lg:text-xl font-extrabold text-teal leading-tight mt-0.5">${escapeHtmlAttr(prog.residence || "Karta Pobytu")} <span class="text-[8px] sm:text-xs font-normal text-slate-500 block lg:inline">(${escapeHtmlAttr(prog.residenceNote || "TRC")})</span></div>
                                </div>
                            </div>
                        </div>

                        <!-- Services Included -->
                        <div class="mt-3.5 sm:mt-7 text-center">
                            ${programmeServices.length ? `
                            <div class="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-navy via-teal to-navy text-white font-extrabold uppercase tracking-wider px-5 sm:px-8 py-1.5 sm:py-2.5 rounded-full shadow-md text-[10px] sm:text-sm">
                                <span class="text-[9px] sm:text-xs">\u25c6</span><span>Our Services</span><span class="text-[9px] sm:text-xs">\u25c6</span>
                            </div>

                            <div class="grid grid-cols-4 gap-1.5 sm:gap-5 mt-3 sm:mt-6 max-w-4xl mx-auto">
                                ${programmeServices.map((srv, i) => `
                                <div class="bg-slate-50 hover:bg-teal-accent/60 border border-slate-200 hover:border-teal/40 hover:-translate-y-1 shadow-sm rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-sm sm:text-2xl mb-1.5 sm:mb-3 transition-all"><i class="fa-solid ${programmeServiceIcons[i % programmeServiceIcons.length]}"></i></div>
                                    <h4 class="font-extrabold text-navy text-[10px] sm:text-base leading-tight">${escapeHtmlAttr(srv.title)}</h4>
                                    <p class="text-[8px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">${escapeHtmlAttr(srv.detail)}</p>
                                </div>`).join("")}
                            </div>` : ""}

                            <!-- Popular Job Categories -->
                            ${
                                categories.length
                                    ? `
                            <div class="mt-4 sm:mt-6 flex flex-wrap justify-center gap-1.5 sm:gap-2 max-w-4xl mx-auto">
                                <span class="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 w-full mb-0.5">Popular Job Categories</span>
                                ${categories.map((c) => `<span class="job-chip"><i class="fa-solid fa-briefcase"></i> ${escapeHtmlAttr(c)}</span>`).join("")}
                            </div>`
                                    : ""
                            }

                            <!-- Action Buttons -->
                            <div class="mt-4 sm:mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                                <button type="button" data-wp-apply="${escapeHtmlAttr(country)}" class="bg-navy hover:bg-navy-light text-white font-bold px-3.5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base">
                                    <i class="fa-solid fa-file-circle-check text-teal-light"></i><span>Apply Now</span>
                                </button>
                                <a href="https://wa.me/${activeWA}?text=${waText}" target="_blank" rel="noopener noreferrer" class="bg-teal hover:bg-teal-dark text-white font-bold px-3.5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base">
                                    <i class="fa-brands fa-whatsapp text-sm sm:text-xl"></i><span>Inquire via WhatsApp</span>
                                </a>
                                ${prog.posterImageUrl ? `
                                <button type="button" data-programme-poster="${escapeHtmlAttr(prog.posterImageUrl)}" class="bg-slate-100 hover:bg-teal-accent text-navy font-bold px-3.5 sm:px-6 py-2.5 sm:py-3.5 rounded-xl border border-teal/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base">
                                    <i class="fa-solid fa-file-image text-teal"></i><span>View Official Flyer</span>
                                </button>` : ""}
                            </div>
                        </div>
                    </div>
                </div>`;
            })
            .join("");
    }

    // ============================================================================
    // 4B. RENDER WORK PERMIT DESTINATION CARDS
    // ============================================================================

    // One flag rule for every work-permit surface: the uploaded flag image
    // when the record carries a flagUrl, otherwise the CSS-gradient flag
    // span. Pure (no DOM) so it stays testable like buildCountryPillsHtml.
    // `sizeCls` is the existing size class for that spot ("flag-xl",
    // "flag-lg", or "" for the plain 22x15 pill/filter size).
    function flagHtmlFor(record, sizeCls) {
        const size = sizeCls ? ` ${sizeCls}` : "";
        const url = record && record.flagUrl ? String(record.flagUrl) : "";
        if (url) {
            return `<img src="${escapeHtmlAttr(url)}" alt="" class="flag${size} object-cover">`;
        }
        const cls = String((record && record.flagClass) || "flag-eu")
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "") || "flag-eu";
        return `<span class="flag ${cls}${size}"></span>`;
    }

    // Country quick pills in the work-permit hero, rendered from the SAME
    // admin-provided work_permits collection as the destinations grid — so a
    // country only appears here when the admin provides it. Returns null when
    // there is nothing to show. Pure (no DOM) so it is testable.
    function buildCountryPillsHtml(permits) {
        const activePermits = (permits || [])
            .filter((p) => p && p.isActive !== false)
            .slice()
            .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
        if (!activePermits.length) return null;

        return activePermits
            .map((p) => {
                const country = String(p.countryName || "Country");
                const isOpen = /open/i.test(String(p.tagText || ""));
                const flagHtml = p.flagUrl
                    ? `<img src="${escapeHtmlAttr(p.flagUrl)}" alt="" class="flag object-cover">`
                    : `<span class="flag ${String(p.flagClass || "flag-eu")
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "") || "flag-eu"}"></span>`;
                const pillCls = isOpen
                    ? "inline-flex items-center gap-2 bg-white text-navy font-extrabold text-xs px-3.5 py-2 rounded-full shadow-md hover:-translate-y-0.5 transition-all"
                    : "inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-full hover:bg-white/20 transition-all";
                const badgeHtml = isOpen
                    ? ` <span class="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase">Open</span>`
                    : "";
                return `<a href="#europe-destinations" class="${pillCls}">${flagHtml} ${escapeHtmlAttr(country)}${badgeHtml}</a>`;
            })
            .join("");
    }

    function renderCountryPills(permits) {
        const wrap = document.getElementById("countryPills");
        if (!wrap) return;
        const html = buildCountryPillsHtml(permits);
        // F-02: the hardcoded fallback pills are gone, so an empty
        // collection leaves an empty row instead of stale pills.
        wrap.innerHTML = html || "";
    }

    function renderWorkPermitsGrid(permits) {
        const grid = document.getElementById("workPermitsGrid");
        if (!grid) return;

        const activePermits = (permits || []).filter((p) => p && p.isActive !== false);
        if (!activePermits.length) {
            grid.innerHTML = `<div class="col-span-full bg-white rounded-2xl p-8 text-center text-slate-500">Contact our desk on WhatsApp for current European work permit openings.</div>`;
            return;
        }

        const tagStyleMap = {
            emerald: "bg-emerald-100 text-emerald-700",
            sky: "bg-sky-100 text-sky-700",
            amber: "bg-amber-100 text-amber-700",
            rose: "bg-rose-100 text-rose-700",
            indigo: "bg-indigo-100 text-indigo-700",
            slate: "bg-slate-100 text-slate-700"
        };

        grid.innerHTML = activePermits
            .map((p) => {
                const country = String(p.countryName || "Country");
                const countryAttr = escapeHtmlAttr(country);
                const title = p.cardTitle || `${country} Work Permit`;
                const tagCls = tagStyleMap[String(p.tagStyle || "sky").toLowerCase()] || tagStyleMap.sky;
                const ticks = Array.isArray(p.ticks)
                    ? p.ticks
                    : String(p.ticks || "")
                          .split(/\r?\n|\|/)
                          .map((t) => t.trim())
                          .filter(Boolean);
                // Real WhatsApp link (not "#") so middle-click, open-in-new
                // -tab and no-JS all work. The delegated handler in
                // work-permit.html still intercepts normal clicks and opens
                // the same message with the live routing number.
                const waHref = `https://wa.me/${getResolvedActiveWhatsApp(liveSiteConfig)}?text=${encodeURIComponent(
                    `Assalam-o-Alaikum Zakir Travel & Tours!\n\nI am interested in a *${country} Work Permit*.\nPlease share eligibility, required documents, processing time and current openings.`
                )}`;

                return `
                <div class="dest-card card-hover-lift ${p.isFeatured ? "border-2 border-teal/50" : "border border-slate-200"}">
                    ${
                        p.isFeatured
                            ? `<span class="absolute top-0 right-0 bg-navy text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl rounded-tr-[1.4rem] flex items-center gap-1"><i class="fa-solid fa-star text-amber-300"></i> FEATURED</span>`
                            : ""
                    }
                    <div class="flex items-center gap-2 text-xs"><span class="dest-tag ${tagCls}">${escapeHtmlAttr(
                        p.tagText || "Applications Open"
                    )}</span><span class="text-slate-500 font-semibold"><i class="fa-regular fa-clock text-teal"></i> ${escapeHtmlAttr(
                        p.timeline || "3-6 Months"
                    )}</span></div>
                    <div class="flex items-center gap-3 mt-3">${flagHtmlFor(p, "flag-xl")}<h3 class="text-xl font-black text-navy leading-tight">${escapeHtmlAttr(
                        title
                    )}</h3></div>
                    <div class="dest-box"><div><span class="dest-label">Permit Type</span><div class="text-base font-black text-teal">${escapeHtmlAttr(
                        p.permitType || "Work Permit"
                    )}</div></div><span class="dest-pill">${escapeHtmlAttr(p.visaCode || "D-Visa")}</span></div>
                    <dl class="dest-rows">
                        <div><dt><i class="fa-solid fa-file-contract"></i> Contract</dt><dd>${escapeHtmlAttr(
                            p.contract || "1 Year, Renewable"
                        )}</dd></div>
                        <div><dt><i class="fa-solid fa-id-card"></i> Residence</dt><dd>${escapeHtmlAttr(
                            p.residence || "Residence Permit"
                        )}</dd></div>
                        <div><dt><i class="fa-solid fa-briefcase"></i> Sectors</dt><dd>${escapeHtmlAttr(
                            p.sectors || "General Labour"
                        )}</dd></div>
                    </dl>
                    <div class="dest-ticks">${ticks
                        .map((t) => `<span><i class="fa-solid fa-check"></i> ${escapeHtmlAttr(t)}</span>`)
                        .join("")}</div>
                    <div class="dest-actions"><button type="button" data-wp-apply="${countryAttr}" class="dest-btn-primary"><i class="fa-solid fa-paper-plane text-teal-light"></i> Quick Apply</button><a href="${waHref}" target="_blank" rel="noopener noreferrer" data-wa-country="${countryAttr}" class="dest-btn-wa"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a></div>
                </div>`;
            })
            .join("");
    }

    // Split a "Title|detail" list (one item per line; ";" also
    // separates items) into [{title, detail}]. Pure, so it stays
    // testable like buildCountryPillsHtml.
    function parseTitleDetailList(raw) {
        return String(raw || "")
            .split(/\r?\n|;/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const sep = line.indexOf("|");
                if (sep === -1) return { title: line, detail: "" };
                return { title: line.slice(0, sep).trim(), detail: line.slice(sep + 1).trim() };
            })
            .filter((item) => item.title);
    }

    // Split a pipe-separated list (newlines also separate items).
    function parsePipeList(raw) {
        return String(raw || "")
            .split(/\r?\n|\|/)
            .map((s) => s.trim())
            .filter(Boolean);
    }

    // Document checklist (E-05): one "Title | detail" line per item.
    // Leaves the HTML fallback alone when the list is empty.
    function renderWorkPermitChecklist(rawItems) {
        const listEl = document.getElementById("workPermitChecklistList");
        if (!listEl || !rawItems) return;
        const items = parseTitleDetailList(rawItems);
        if (!items.length) return;
        listEl.innerHTML = items
            .map(
                (item) =>
                    `<li class="check-item"><i class="fa-solid fa-circle-check"></i><div><strong>${escapeHtmlAttr(item.title)}</strong>${item.detail ? `<span>${escapeHtmlAttr(item.detail)}</span>` : ""}</div></li>`
            )
            .join("");
    }

    // FAQ (E-08): renders the work_permit_faqs collection as <details>
    // items, first one open — same markup as the HTML fallback.
    function renderWorkPermitFaqs(faqs) {
        const wrap = document.getElementById("workPermitFaqList");
        if (!wrap) return;
        const active = (faqs || [])
            .filter((f) => f && f.isActive !== false)
            .slice()
            .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
        if (!active.length) {
            wrap.innerHTML = `<div class="bg-slate-50 rounded-2xl p-8 text-center text-slate-500 text-sm">No FAQs yet — contact our desk on WhatsApp for answers.</div>`;
            return;
        }
        wrap.innerHTML = active
            .map(
                (f, idx) =>
                    `<details class="faq-item"${idx === 0 ? " open" : ""}>
                        <summary>${escapeHtmlAttr(f.question)}<i class="fa-solid fa-chevron-down"></i></summary>
                        <p>${escapeHtmlAttr(f.answer)}</p>
                    </details>`
            )
            .join("");
    }

    // Assessment form dropdowns (E-06): rebuilt at runtime from the
    // admin data, keeping the visitor's current choice when it still
    // exists. Country from the work_permits collection (open countries
    // keep their "(Applications Open)" suffix); sectors from the
    // pageContent.workPermit.sectors list; office from the branch
    // titles. "Other / Not Sure" and "Online / WhatsApp" stay as the
    // generic fallbacks.
    function rebuildWorkPermitAssessmentSelects() {
        const pWork =
            (liveSiteConfig && liveSiteConfig.pageContent && liveSiteConfig.pageContent.workPermit) || {};
        const pHome =
            (liveSiteConfig && liveSiteConfig.pageContent && liveSiteConfig.pageContent.home) || {};

        const countrySelect = document.getElementById("wpCountry");
        if (countrySelect) {
            const prevCountry = countrySelect.value;
            const activePermits = (liveWorkPermits || [])
                .filter((p) => p && p.isActive !== false)
                .slice()
                .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
            if (activePermits.length) {
                const options = activePermits.map((p) => {
                    const country = String(p.countryName || "Country");
                    const label = /open/i.test(String(p.tagText || ""))
                        ? `${country} (Applications Open)`
                        : country;
                    return `<option value="${escapeHtmlAttr(country)}">${escapeHtmlAttr(label)}</option>`;
                });
                options.push(`<option value="Other European Country">Other / Not Sure — Advise Me</option>`);
                countrySelect.innerHTML = options.join("");
                if (prevCountry && [...countrySelect.options].some((o) => o.value === prevCountry)) {
                    countrySelect.value = prevCountry;
                }
            }
        }

        const sectorSelect = document.getElementById("wpSector");
        if (sectorSelect && pWork.sectors) {
            const sectors = parsePipeList(pWork.sectors);
            if (sectors.length) {
                const prevSector = sectorSelect.value;
                sectorSelect.innerHTML = sectors
                    .map((s) => `<option value="${escapeHtmlAttr(s)}">${escapeHtmlAttr(s)}</option>`)
                    .join("");
                if (prevSector && [...sectorSelect.options].some((o) => o.value === prevSector)) {
                    sectorSelect.value = prevSector;
                }
            }
        }

        const branchSelect = document.getElementById("wpBranch");
        if (branchSelect) {
            const prevBranch = branchSelect.value;
            const titles = [pHome.branch1Title, pHome.branch2Title]
                .map((t) => String(t || "").trim())
                .filter(Boolean);
            if (titles.length) {
                branchSelect.innerHTML =
                    titles
                        .map((t) => `<option value="${escapeHtmlAttr(t)}">${escapeHtmlAttr(t)}</option>`)
                        .join("") + `<option value="Online / WhatsApp">Online / WhatsApp</option>`;
                if (prevBranch && [...branchSelect.options].some((o) => o.value === prevBranch)) {
                    branchSelect.value = prevBranch;
                }
            }
        }
    }

    // "Service Required" dropdown (G-08): rebuilt from
    // pageContent.contact.serviceOptions ("Label|value" lines). Only
    // runs when the element is a <select> — on other pages the same id
    // is the booking modal's readonly text input, which is untouched.
    function rebuildContactServiceOptions(rawOptions) {
        const select = document.getElementById("modalServiceInput");
        if (!select || select.tagName !== "SELECT" || !rawOptions) return;
        const options = parseTitleDetailList(rawOptions);
        if (!options.length) return;
        const prev = select.value;
        select.innerHTML = options
            .map(
                (o) =>
                    `<option value="${escapeHtmlAttr(o.detail || o.title)}">${escapeHtmlAttr(o.title)}</option>`
            )
            .join("");
        if (prev && [...select.options].some((o) => o.value === prev)) select.value = prev;
    }

    // ============================================================================
    // 5. PROMOTIONAL FLYER MODAL & ADMIN PORTAL DRAWER
    // ============================================================================

    function updateFlyerModalContent(config, specificDeal) {
        const s = specificDeal || (config && config.spotlight) || {};
        const c = (config && config.contacts) || {};
        const pUmrah = (config && config.pageContent && config.pageContent.umrah) || {};
        const activeWA = getResolvedActiveWhatsApp(config);

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        // --- Flyer modal headings (C-07) ---
        if (pUmrah.flyerModalEyebrow) setTxt("flyerModalEyebrow", pUmrah.flyerModalEyebrow);
        setTxt("flyerModalTitle", `${c.agencyName || "Zakir Travel & Tours"} Flyer`);

        const customImg = document.getElementById("flyerModalCustomImage");
        const digitalCard = document.getElementById("flyerModalDigitalPreview");

        if (customImg && digitalCard) {
            if (s.promotionalFlyerUrl) {
                customImg.src = s.promotionalFlyerUrl;
                customImg.classList.remove("hidden");
                digitalCard.classList.add("hidden");
            } else {
                customImg.classList.add("hidden");
                digitalCard.classList.remove("hidden");
            }
        }

        setTxt("flyerPreviewMonth", s.monthLabel || "January");
        setTxt("flyerPreviewTitle", s.title || "UMRAH PACKAGE");
        setTxt("flyerPreviewPrice", `PKR ${formatPKR(s.startingPrice || 232000)}`);
        setTxt("flyerPreviewUnit", s.priceUnit || "PER PERSON (SHARING)");
        setTxt("flyerPreviewDep", s.departureDate || "Jan 26, 2026");
        setTxt("flyerPreviewRet", s.returnDate || "Feb 09, 2026");
        setTxt("flyerPreviewDur", s.duration || "14 Nights");
        setTxt("flyerPreviewPhones", `${c.managerPhone || "+92 349 0558345"} | ${c.secondaryPhone || "+92 343 4159182"}`);

        const flyerBookWA = document.getElementById("flyerModalWhatsAppBtn");
        if (flyerBookWA) {
            const msg = encodeURIComponent(
                `Assalam-o-Alaikum ${c.agencyName || "Zakir Travel & Tours"}! I just viewed your ${s.monthLabel || "January"} ${s.title || "Umrah Package"} flyer (PKR ${formatPKR(s.startingPrice || 232000)}). Please share booking details.`
            );
            flyerBookWA.href = `https://wa.me/${activeWA}?text=${msg}`;
        }
    }

    function openPromotionalFlyerModal(dealId) {
        if (dealId) {
            const activeDeals = getActiveSpecialDeals(liveSpecialDeals);
            const found = activeDeals.find((d) => d.id === dealId);
            if (found) {
                updateFlyerModalContent(liveSiteConfig, found);
            }
        } else {
            updateFlyerModalContent(liveSiteConfig);
        }
        const modal = document.getElementById("promotionalFlyerModal");
        if (modal) modal.classList.remove("hidden");
    }

    function closePromotionalFlyerModal() {
        const modal = document.getElementById("promotionalFlyerModal");
        if (modal) modal.classList.add("hidden");
    }

    function openAdminPortalDrawer() {
        if (!AdminPortalManager) {
            window.location.href = "admin.html";
            return;
        }
        const drawer = document.getElementById("adminPortalDrawer");
        const mountNode = document.getElementById("adminPortalMount");
        if (!drawer || !mountNode) {
            window.location.href = "admin.html";
            return;
        }

        drawer.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        if (!adminDrawerInstance) {
            adminDrawerInstance = new AdminPortalManager(mountNode, {
                isDrawer: true,
                onCloseDrawer: () => closeAdminPortalDrawer()
            });
        }

        const currentPage = document.body.getAttribute("data-page");
        const pageTabMap = {
            home: "spotlight",
            umrah: "umrah",
            visas: "visas",
            calculator: "calculator",
            contact: "contacts"
        };
        if (currentPage && pageTabMap[currentPage] && adminDrawerInstance && typeof adminDrawerInstance._switchTab === "function") {
            adminDrawerInstance._switchTab(pageTabMap[currentPage]);
        }
    }

    function closeAdminPortalDrawer() {
        const drawer = document.getElementById("adminPortalDrawer");
        if (drawer) drawer.classList.add("hidden");
        document.body.style.overflow = "";
        if (window.location.hash === "#admin" || window.location.hash === "#/admin") {
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
    }

    function checkAdminHashRoute() {
        const hash = window.location.hash.toLowerCase();
        const params = new URLSearchParams(window.location.search);
        if (hash === "#admin" || hash === "#/admin" || params.get("admin") === "1") {
            openAdminPortalDrawer();
        }
    }

    // ============================================================================
    // 6. GLOBAL INTERACTIVE HANDLERS (CALCULATOR, BOOKING MODAL)
    // ============================================================================

    // Branch map data comes from the stored site config — never literals
    // (E-10 / G-09). The Swat embed URL is contacts.mapEmbedUrl;
    // Islamabad has its own contacts.branch2MapEmbedUrl /
    // branch2MapSearchUrl. Headings are composed from the branch titles
    // and addresses, so an admin edit flows through everywhere.
    function getBranchMapData(branch) {
        const cfg = liveSiteConfig || {};
        const c = cfg.contacts || {};
        const pHome = (cfg.pageContent && cfg.pageContent.home) || {};
        if (branch === "islamabad") {
            return {
                embedUrl: c.branch2MapEmbedUrl || "",
                searchUrl: c.branch2MapSearchUrl || "",
                title: String(pHome.branch2Title || "Islamabad Branch"),
                address: String(pHome.branch2Address || "")
            };
        }
        return {
            embedUrl: c.mapEmbedUrl || "",
            searchUrl: c.branch1MapSearchUrl || "",
            title: String(pHome.branch1Title || "Swat Head Office"),
            address: String(pHome.branch1Address || "")
        };
    }

    function isAllowedGoogleMapEmbedUrl(url) {
        try {
            const mapUrl = new URL(String(url || ""));
            return (
                mapUrl.protocol === "https:" &&
                /(^|\.)google\.com$/.test(mapUrl.hostname) &&
                mapUrl.pathname.startsWith("/maps")
            );
        } catch (_) {
            return false;
        }
    }

    window.switchMapBranch = function (branch) {
        const iframe = document.getElementById("contactMapIframe");
        const heading = document.getElementById("mapHeadingTitle");
        const subtitle = document.getElementById("mapHeadingSubtitle");
        const btnSwat = document.getElementById("btnMapSwat");
        const btnIsb = document.getElementById("btnMapIslamabad");
        const openBtn = document.getElementById("openInMapsBtn");
        if (!iframe) return;

        iframe.setAttribute("data-switched", "true");

        const isIslamabad = branch === "islamabad";
        const data = getBranchMapData(isIslamabad ? "islamabad" : "swat");
        // A missing or non-Google embed URL falls back to the Swat map,
        // the same fallback the initial render uses.
        const swatFallbackMap =
            "https://maps.google.com/maps?q=Hayat+Market,+Matta,+Swat,+Pakistan&t=&z=16&ie=UTF8&iwloc=&output=embed";
        iframe.src = isAllowedGoogleMapEmbedUrl(data.embedUrl) ? data.embedUrl : swatFallbackMap;
        if (heading) heading.textContent = `${data.title} Location`;
        if (subtitle) subtitle.textContent = data.address;
        if (openBtn) {
            openBtn.href =
                data.searchUrl ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`;
        }
        if (btnSwat) {
            btnSwat.className = isIslamabad
                ? "px-4 py-2 rounded-xl text-slate-600 hover:text-navy hover:bg-white/80 transition-all flex items-center gap-1.5"
                : "px-4 py-2 rounded-xl bg-navy text-white shadow-sm transition-all flex items-center gap-1.5";
        }
        if (btnIsb) {
            btnIsb.className = isIslamabad
                ? "px-4 py-2 rounded-xl bg-navy text-white shadow-sm transition-all flex items-center gap-1.5"
                : "px-4 py-2 rounded-xl text-slate-600 hover:text-navy hover:bg-white/80 transition-all flex items-center gap-1.5";
        }
    };

    // Programme flyer poster (E-09): show this programme's poster image
    // in the shared poster modal. Falls back to toggling the modal
    // directly when the page's own openPolandPosterModal is unavailable.
    window.openProgrammePosterModal = function (posterUrl) {
        const img = document.getElementById("polandPosterImg");
        if (img && posterUrl) img.src = posterUrl;
        if (typeof window.openPolandPosterModal === "function") {
            window.openPolandPosterModal();
            return;
        }
        const m = document.getElementById("polandPosterModal");
        if (m) {
            m.classList.remove("hidden");
            m.classList.add("flex");
        }
    };

    window.toggleFlightReturnDate = function () {
        const typeEl = document.getElementById("flightType");
        const returnBox = document.getElementById("flightReturnBox");
        const grid = document.getElementById("flightDatesGrid");
        if (!typeEl || !returnBox) return;
        const isRoundTrip = typeEl.value === "Round Trip";
        if (isRoundTrip) {
            returnBox.classList.remove("hidden");
            if (grid) {
                grid.classList.remove("sm:grid-cols-2");
                grid.classList.add("sm:grid-cols-3");
            }
        } else {
            returnBox.classList.add("hidden");
            if (grid) {
                grid.classList.remove("sm:grid-cols-3");
                grid.classList.add("sm:grid-cols-2");
            }
        }
    };

    window.handleStandaloneFlightSubmit = async function (e) {
        e.preventDefault();
        const clientEl = document.getElementById("clientPhone");
        const clientInfo = clientEl ? clientEl.value.trim() : "";
        const activeWA = getResolvedActiveWhatsApp(liveSiteConfig);
        const agencyName =
            (liveSiteConfig && liveSiteConfig.contacts && liveSiteConfig.contacts.agencyName) ||
            "Zakir Travel & Tours";

        const from = (document.getElementById("flightFrom") && document.getElementById("flightFrom").value) || "Islamabad";
        const to = (document.getElementById("flightTo") && document.getElementById("flightTo").value) || "Not specified";
        const type = (document.getElementById("flightType") && document.getElementById("flightType").value) || "Round Trip";
        const date = (document.getElementById("flightDate") && document.getElementById("flightDate").value) || "Flexible";
        const returnDate = (document.getElementById("flightReturnDate") && document.getElementById("flightReturnDate").value) || "";

        let dateDetails = `- Departure Date: ${date}`;
        if (type === "Round Trip" && returnDate) {
            dateDetails += `\n- Return Date: ${returnDate}`;
        }

        const details = `*Flight Ticket Inquiry*\n- Route: ${from} to ${to}\n- Type: ${type}\n${dateDetails}`;
        const message = encodeURIComponent(
            `Assalam-o-Alaikum ${agencyName}!\n\n${details}\n- Client Contact: ${clientInfo}\n\nPlease share the best flight fares and availability.`
        );
        await saveEnquiryThenOpenWhatsApp(
            {
                source: "flight-standalone",
                service: "Flight Ticket Inquiry",
                name: clientInfo,
                phone: cleanWhatsAppDigits(clientInfo) || clientInfo,
                details: details.replace(/\*/g, "") + ` | Client Contact: ${clientInfo}`,
                whatsappNumber: activeWA
            },
            `https://wa.me/${activeWA}?text=${message}`
        );
    };

    function updateCalculator() {
        const durationEl = document.getElementById("calcDuration");
        const roomEl = document.getElementById("calcRoom");
        const hotelEl = document.getElementById("calcHotel");
        const paxEl = document.getElementById("calcPax");

        if (!durationEl || !roomEl || !hotelEl || !paxEl) return;

        const durationAddon = parseInt(durationEl.value, 10) || 0;
        const baseRoomRate =
            parseInt(roomEl.value, 10) ||
            Number(
                (liveSiteConfig &&
                    liveSiteConfig.calculatorRates &&
                    liveSiteConfig.calculatorRates.sharingPrice) ||
                    232000
            );
        const hotelAddon = parseInt(hotelEl.value, 10) || 0;
        const pax = parseInt(paxEl.value, 10) || 1;

        const perPersonRate = Math.max(0, baseRoomRate + durationAddon + hotelAddon);
        const totalRate = perPersonRate * pax;

        const paxLabel = document.getElementById("paxCountLabel");
        if (paxLabel) paxLabel.textContent = `${pax} ${pax === 1 ? "Person" : "Persons"}`;

        const totalDisplay = document.getElementById("calcTotalDisplay");
        if (totalDisplay) totalDisplay.textContent = `PKR ${formatPKR(totalRate)}`;

        const perPersonDisplay = document.getElementById("calcPerPersonDisplay");
        if (perPersonDisplay) {
            perPersonDisplay.textContent = `PKR ${formatPKR(perPersonRate)} per person (All-Inclusive)`;
        }
    }

    window.updateCalculator = updateCalculator;

    window.sendCalculatorToWhatsApp = async function () {
        const durationSelect = document.getElementById("calcDuration");
        const roomSelect = document.getElementById("calcRoom");
        const hotelSelect = document.getElementById("calcHotel");
        const paxEl = document.getElementById("calcPax");
        const totalEl = document.getElementById("calcTotalDisplay");
        const perPersonEl = document.getElementById("calcPerPersonDisplay");

        if (!durationSelect || !roomSelect || !hotelSelect || !paxEl || !totalEl || !perPersonEl) return;

        const pax = paxEl.value;
        const totalText = totalEl.textContent;
        const perPersonText = perPersonEl.textContent;

        const durationText =
            (durationSelect.options[durationSelect.selectedIndex] &&
                durationSelect.options[durationSelect.selectedIndex].text) ||
            "14 Nights";
        const roomText =
            (roomSelect.options[roomSelect.selectedIndex] &&
                roomSelect.options[roomSelect.selectedIndex].text) ||
            "Sharing";
        const hotelText =
            (hotelSelect.options[hotelSelect.selectedIndex] &&
                hotelSelect.options[hotelSelect.selectedIndex].text) ||
            "Standard";

        const activeWA = getResolvedActiveWhatsApp(liveSiteConfig);
        const agencyName =
            (liveSiteConfig && liveSiteConfig.contacts && liveSiteConfig.contacts.agencyName) ||
            "Zakir Travel & Tours";

        const msg = encodeURIComponent(
            `Assalam-o-Alaikum ${agencyName}!\nI used your Live Umrah Package Calculator:\n- Duration: ${durationText}\n- Room Tier: ${roomText}\n- Hotel Category: ${hotelText}\n- Travelers: ${pax}\n- Rate: ${perPersonText}\n- *Estimated Total: ${totalText}*\n\nPlease confirm availability and final booking details.`
        );
        // The calculator has no name/phone fields, so this is saved as an
        // anonymous estimate — the visitor identifies themselves on WhatsApp.
        await saveEnquiryThenOpenWhatsApp(
            {
                source: "umrah-calculator",
                service: "Umrah Calculator Estimate",
                name: "Calculator user",
                phone: "not-provided",
                details: `Duration: ${durationText} | Room: ${roomText} | Hotel: ${hotelText} | Travelers: ${pax} | Rate: ${perPersonText} | Estimated Total: ${totalText}`,
                whatsappNumber: activeWA
            },
            `https://wa.me/${activeWA}?text=${msg}`
        );
    };

    window.openBookingModal = function (serviceTitle) {
        const input = document.getElementById("modalServiceInput");
        const modal = document.getElementById("bookingModal");
        if (input) input.value = serviceTitle;
        if (modal) modal.classList.remove("hidden");
    };

    window.closeBookingModal = function () {
        const modal = document.getElementById("bookingModal");
        if (modal) modal.classList.add("hidden");
    };

    window.submitModalInquiry = async function (e) {
        e.preventDefault();
        const service = document.getElementById("modalServiceInput").value;
        const name = document.getElementById("modalUserName").value.trim();
        const phone = document.getElementById("modalUserPhone").value.trim();
        const agentPhoneEl = document.getElementById("modalAgentPhone");
        const agentPhone =
            cleanWhatsAppDigits(agentPhoneEl && agentPhoneEl.value) ||
            getResolvedActiveWhatsApp(liveSiteConfig);
        const notes = document.getElementById("modalUserNotes").value.trim() || "None";
        const agencyName =
            (liveSiteConfig && liveSiteConfig.contacts && liveSiteConfig.contacts.agencyName) ||
            "Zakir Travel & Tours";

        const text = encodeURIComponent(
            `Assalam-o-Alaikum ${agencyName}!\n\n*Service Inquiry:* ${service}\n*Name:* ${name}\n*Phone:* ${phone}\n*Notes:* ${notes}`
        );
        window.closeBookingModal();
        await saveEnquiryThenOpenWhatsApp(
            {
                source: "booking-modal",
                service,
                name,
                phone,
                details: `Service: ${service} | Notes: ${notes}`,
                whatsappNumber: agentPhone
            },
            `https://wa.me/${agentPhone}?text=${text}`
        );
    };

    window.openPromotionalFlyerModal = openPromotionalFlyerModal;
    window.closePromotionalFlyerModal = closePromotionalFlyerModal;
    window.openAdminPortalDrawer = openAdminPortalDrawer;
    window.closeAdminPortalDrawer = closeAdminPortalDrawer;
    window.showPublicToast = showPublicToast;
    window.saveEnquiryThenOpenWhatsApp = saveEnquiryThenOpenWhatsApp;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initHomepageBindings);
    } else {
        initHomepageBindings();
    }
})(window);
