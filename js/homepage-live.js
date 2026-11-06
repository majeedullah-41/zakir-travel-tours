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
            renderFeaturedWorkPermitsShowcase(liveWorkPermitProgrammes);
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
            });
        }

        if (zakirDB.onWorkPermitProgrammesSnapshot) {
            zakirDB.onWorkPermitProgrammesSnapshot((programmes) => {
                liveWorkPermitProgrammes = Array.isArray(programmes) ? programmes : [];
                renderFeaturedWorkPermitsShowcase(liveWorkPermitProgrammes);
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
            renderSiteConfigToDOM(liveSiteConfig);
            renderSpecialDealsShowcase(liveSpecialDeals);
            renderUmrahPackagesGrid(livePackages);
            renderVisaServicesGrid(liveVisas);
            renderWorkPermitsGrid(liveWorkPermits);
            renderFeaturedWorkPermitsShowcase(liveWorkPermitProgrammes);
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
            }
        });
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

        // --- Top Contact Bar ---
        setText("topBarOfficeAddress", officeAddress);
        setText("topBarManagerName", cleanManagerDisplayName);
        setText("topBarManagerPhone", c.managerPhone || "+92 349 0558345");
        setText("topBarSecondaryName", cleanSecondaryDisplayName);
        setText("topBarSecondaryPhone", c.secondaryPhone || "+92 343 4159182");

        const topManagerLink = document.getElementById("topBarManagerLink");
        if (topManagerLink) topManagerLink.href = `tel:${managerTel}`;

        const topSecondaryLink = document.getElementById("topBarSecondaryLink");
        if (topSecondaryLink) topSecondaryLink.href = `tel:${secondaryTel}`;

        // --- Header Logo & Tagline ---
        const agencyParts = agencyName.trim().split(/\s+/);
        const logoMain = agencyParts[0] || "ZAKIR";
        const logoSub = agencyParts.length > 1 ? agencyParts.slice(1).join(" ") : "Travel & Tours";
        setText("headerAgencyNameMain", logoMain.toUpperCase());
        setText("headerAgencyNameSub", logoSub);
        setText("headerTaglinePrimary", taglinePrimary.toUpperCase());

        // --- Navbar & Mobile Menu WhatsApp Links ---
        const generalWAMsg = encodeURIComponent(
            `Assalam-o-Alaikum ${agencyName}! I would like to inquire about your travel & Umrah services.`
        );
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

        // --- Page-Specific Content: UMRAH PACKAGES PAGE ---
        if (pUmrah.heroBadge) setText("umrahHeroBadge", pUmrah.heroBadge);
        if (pUmrah.heroTitle) setText("umrahHeroTitle", pUmrah.heroTitle);
        if (pUmrah.heroSubtitle) setText("umrahHeroSubtitle", pUmrah.heroSubtitle);
        if (pUmrah.inc1Title) setText("umrahInc1Title", pUmrah.inc1Title);
        if (pUmrah.inc2Title) setText("umrahInc2Title", pUmrah.inc2Title);
        if (pUmrah.inc3Title) setText("umrahInc3Title", pUmrah.inc3Title);
        if (pUmrah.familyBannerTitle) setText("umrahFamilyBannerTitle", pUmrah.familyBannerTitle);
        if (pUmrah.familyBannerDesc) setText("umrahFamilyBannerDesc", pUmrah.familyBannerDesc);

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

        renderCheckBullets("umrahInc1List", pUmrah.inc1Bullets);
        renderCheckBullets("umrahInc2List", pUmrah.inc2Bullets);
        renderCheckBullets("umrahInc3List", pUmrah.inc3Bullets);

        // --- Page-Specific Content: VISAS & FLIGHTS PAGE ---
        if (pVisas.heroBadge) setText("visaHeroBadge", pVisas.heroBadge);
        if (pVisas.heroTitle) setText("visaHeroTitle", pVisas.heroTitle);
        if (pVisas.heroSubtitle) setText("visaHeroSubtitle", pVisas.heroSubtitle);
        if (pVisas.flightHeading) setText("visaFlightHeading", pVisas.flightHeading);
        if (pVisas.flightDescription) setText("visaFlightDescription", pVisas.flightDescription);
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

        // --- About Us: Team Member Photos (uploaded by Admin, keyed by member id) ---
        const teamPhotos = config.teamPhotos || {};
        document.querySelectorAll("[data-team-photo]").forEach((slot) => {
            const key = slot.getAttribute("data-team-photo");
            const url = teamPhotos[key];
            const img = slot.querySelector(".team-photo-img");
            const placeholder = slot.querySelector(".team-photo-placeholder");
            if (!img) return;
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
        if (c.officeHours) setText("contactSectionHours", c.officeHours);
        if (c.officeEmail) setText("contactSectionEmail", c.officeEmail);

        const mapIframe = document.getElementById("contactMapIframe");
        if (mapIframe && !mapIframe.getAttribute("data-switched")) {
            const rawMapUrl = c.mapEmbedUrl || "";
            const isLegacyIslamabadMap = !rawMapUrl || /potohar/i.test(rawMapUrl) || /fazal-e-haq/i.test(rawMapUrl);
            const activeMapUrl = isLegacyIslamabadMap
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
                returnDate: s.returnDate || "Nov 10, 2026",
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
                                        deal.returnDate || "Nov 10, 2026"
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
                                <div class="w-12 h-12 rounded-2xl bg-teal-accent text-2xl flex items-center justify-center shrink-0 shadow-sm">
                                    ${escapeHtmlAttr(v.flagEmoji || "🌍")}
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
                                <span class="flag ${escapeHtmlAttr(p.flagClass || "flag-pl")}"></span>
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

        container.innerHTML = progsToShow
            .map((prog, idx) => {
                const country = String(prog.countryName || "Poland");
                const flagCls = String(prog.flagClass || "flag-pl").toLowerCase().replace(/[^a-z0-9-]/g, "") || "flag-pl";
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
                            <span class="flag ${flagCls} flag-lg"></span>
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
                                     onerror="this.src='${escapeHtmlAttr(leftFallback)}'"
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
                                     onerror="this.src='${escapeHtmlAttr(rightFallback)}'"
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
                            <div class="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-navy via-teal to-navy text-white font-extrabold uppercase tracking-wider px-5 sm:px-8 py-1.5 sm:py-2.5 rounded-full shadow-md text-[10px] sm:text-sm">
                                <span class="text-[9px] sm:text-xs">◆</span><span>Our Services</span><span class="text-[9px] sm:text-xs">◆</span>
                            </div>

                            <div class="grid grid-cols-4 gap-1.5 sm:gap-5 mt-3 sm:mt-6 max-w-4xl mx-auto">
                                <div class="bg-slate-50 hover:bg-teal-accent/60 border border-slate-200 hover:border-teal/40 hover:-translate-y-1 shadow-sm rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-sm sm:text-2xl mb-1.5 sm:mb-3 transition-all"><i class="fa-solid fa-headset"></i></div>
                                    <h4 class="font-extrabold text-navy text-[10px] sm:text-base leading-tight">Visa Consultation</h4>
                                    <p class="text-[8px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">One-to-one guidance</p>
                                </div>
                                <div class="bg-slate-50 hover:bg-teal-accent/60 border border-slate-200 hover:border-teal/40 hover:-translate-y-1 shadow-sm rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-sm sm:text-2xl mb-1.5 sm:mb-3 transition-all"><i class="fa-solid fa-clipboard-check"></i></div>
                                    <h4 class="font-extrabold text-navy text-[10px] sm:text-base leading-tight">Eligibility Assessment</h4>
                                    <p class="text-[8px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">Profile &amp; skill match</p>
                                </div>
                                <div class="bg-slate-50 hover:bg-teal-accent/60 border border-slate-200 hover:border-teal/40 hover:-translate-y-1 shadow-sm rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-sm sm:text-2xl mb-1.5 sm:mb-3 transition-all"><i class="fa-solid fa-file-lines"></i></div>
                                    <h4 class="font-extrabold text-navy text-[10px] sm:text-base leading-tight">Document Preparation</h4>
                                    <p class="text-[8px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">Translation &amp; attestation</p>
                                </div>
                                <div class="bg-slate-50 hover:bg-teal-accent/60 border border-slate-200 hover:border-teal/40 hover:-translate-y-1 shadow-sm rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-sm sm:text-2xl mb-1.5 sm:mb-3 transition-all"><i class="fa-solid fa-layer-group"></i></div>
                                    <h4 class="font-extrabold text-navy text-[10px] sm:text-base leading-tight">Application Assistance</h4>
                                    <p class="text-[8px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">Embassy filing &amp; follow-up</p>
                                </div>
                            </div>

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
                                <button type="button" onclick="selectWorkPermitCountry('${escapeHtmlAttr(country)}')" class="bg-navy hover:bg-navy-light text-white font-bold px-3.5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base">
                                    <i class="fa-solid fa-file-circle-check text-teal-light"></i><span>Apply Now</span>
                                </button>
                                <a href="https://wa.me/${activeWA}?text=${waText}" target="_blank" rel="noopener noreferrer" class="bg-teal hover:bg-teal-dark text-white font-bold px-3.5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base">
                                    <i class="fa-brands fa-whatsapp text-sm sm:text-xl"></i><span>Inquire via WhatsApp</span>
                                </a>
                                <button type="button" onclick="openPolandPosterModal()" class="bg-slate-100 hover:bg-teal-accent text-navy font-bold px-3.5 sm:px-6 py-2.5 sm:py-3.5 rounded-xl border border-teal/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base">
                                    <i class="fa-solid fa-file-image text-teal"></i><span>View Official Flyer</span>
                                </button>
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
                const flagClass = String(p.flagClass || "flag-eu")
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "") || "flag-eu";
                const ticks = Array.isArray(p.ticks)
                    ? p.ticks
                    : String(p.ticks || "")
                          .split(/\r?\n|\|/)
                          .map((t) => t.trim())
                          .filter(Boolean);

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
                    <div class="flex items-center gap-3 mt-3"><span class="flag ${flagClass} flag-xl"></span><h3 class="text-xl font-black text-navy leading-tight">${escapeHtmlAttr(
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
                    <div class="dest-actions"><button type="button" data-wp-apply="${countryAttr}" class="dest-btn-primary"><i class="fa-solid fa-paper-plane text-teal-light"></i> Quick Apply</button><a href="#" data-wa-country="${countryAttr}" class="dest-btn-wa"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a></div>
                </div>`;
            })
            .join("");
    }

    // ============================================================================
    // 5. PROMOTIONAL FLYER MODAL & ADMIN PORTAL DRAWER
    // ============================================================================

    function updateFlyerModalContent(config, specificDeal) {
        const s = specificDeal || (config && config.spotlight) || {};
        const c = (config && config.contacts) || {};
        const activeWA = getResolvedActiveWhatsApp(config);

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

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setTxt("flyerPreviewMonth", s.monthLabel || "January");
        setTxt("flyerPreviewTitle", s.title || "UMRAH PACKAGE");
        setTxt("flyerPreviewPrice", `PKR ${formatPKR(s.startingPrice || 232000)}`);
        setTxt("flyerPreviewUnit", s.priceUnit || "PER PERSON (SHARING)");
        setTxt("flyerPreviewDep", s.departureDate || "Jan 26, 2026");
        setTxt("flyerPreviewRet", s.returnDate || "Nov 10, 2026");
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
    // 6. GLOBAL INTERACTIVE HANDLERS (HERO TABS, CALCULATOR, BOOKING MODAL)
    // ============================================================================

    let currentHeroTab = "umrah";

    window.switchHeroTab = function (tabName) {
        currentHeroTab = tabName;
        const tabs = ["umrah", "flights", "visa"];
        tabs.forEach((t) => {
            const btn = document.getElementById(`tab-${t}`);
            const fields = document.getElementById(`fields-${t}`);
            if (!btn || !fields) return;
            if (t === tabName) {
                btn.className =
                    "hero-tab bg-navy text-white font-bold text-xs sm:text-sm py-2.5 rounded-lg shadow transition-all flex items-center justify-center gap-1.5";
                fields.classList.remove("hidden");
            } else {
                btn.className =
                    "hero-tab text-slate-600 hover:text-navy font-bold text-xs sm:text-sm py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5";
                fields.classList.add("hidden");
            }
        });
    };

    window.handleHeroSubmit = async function (e) {
        e.preventDefault();
        const clientInfo = document.getElementById("clientPhone").value.trim();
        const activeWA = getResolvedActiveWhatsApp(liveSiteConfig);
        const agencyName =
            (liveSiteConfig && liveSiteConfig.contacts && liveSiteConfig.contacts.agencyName) ||
            "Zakir Travel & Tours";

        let details = "";
        if (currentHeroTab === "umrah") {
            const pkg = document.getElementById("umrahPackageType").value;
            const room = document.getElementById("umrahRoom").value;
            const pax = document.getElementById("umrahPax").value;
            details = `*Umrah Inquiry*\n- Package: ${pkg}\n- Room: ${room}\n- Travelers: ${pax} Persons`;
        } else if (currentHeroTab === "flights") {
            const from = document.getElementById("flightFrom").value;
            const to = document.getElementById("flightTo").value || "Not specified";
            const type = document.getElementById("flightType").value;
            const date = document.getElementById("flightDate").value || "Flexible";
            details = `*Flight Ticket Inquiry*\n- Route: ${from} to ${to}\n- Type: ${type}\n- Date: ${date}`;
        } else {
            const country = document.getElementById("visaCountry").value;
            const applicants = document.getElementById("visaApplicants").value;
            details = `*Visa Inquiry*\n- Destination: ${country}\n- Applicants: ${applicants}`;
        }

        const message = encodeURIComponent(
            `Assalam-o-Alaikum ${agencyName}!\n\n${details}\n- Client Contact: ${clientInfo}\n\nPlease share the best rates and details.`
        );
        const serviceLabel =
            currentHeroTab === "umrah" ? "Umrah Inquiry" : currentHeroTab === "flights" ? "Flight Ticket Inquiry" : "Visa Inquiry";
        await saveEnquiryThenOpenWhatsApp(
            {
                source: `hero-${currentHeroTab}`,
                service: serviceLabel,
                name: clientInfo,
                phone: cleanWhatsAppDigits(clientInfo) || clientInfo,
                details: details.replace(/\*/g, "") + ` | Client Contact: ${clientInfo}`,
                whatsappNumber: activeWA
            },
            `https://wa.me/${activeWA}?text=${message}`
        );
    };

    window.switchMapBranch = function (branch) {
        const iframe = document.getElementById("contactMapIframe");
        const heading = document.getElementById("mapHeadingTitle");
        const subtitle = document.getElementById("mapHeadingSubtitle");
        const btnSwat = document.getElementById("btnMapSwat");
        const btnIsb = document.getElementById("btnMapIslamabad");
        const openBtn = document.getElementById("openInMapsBtn");
        if (!iframe) return;

        iframe.setAttribute("data-switched", "true");

        if (branch === "islamabad") {
            iframe.src = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3318.847503714243!2d73.0645624!3d33.7128613!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38dfbf9df175e11d%3A0xe54d6faeebdae812!2sPotohar%20Plaza%2C%20Fazal-e-Haq%20Rd%2C%20Blue%20Area%2C%20Islamabad!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s";
            if (heading) heading.textContent = "Islamabad Branch Location";
            if (subtitle) subtitle.textContent = "Office No. 7, Ground Floor, Potohar Plaza, Fazal-e-Haq Road, Blue Area, Islamabad";
            if (openBtn) openBtn.href = "https://www.google.com/maps/search/?api=1&query=Potohar+Plaza,+Blue+Area,+Islamabad";
            if (btnSwat) btnSwat.className = "px-4 py-2 rounded-xl text-slate-600 hover:text-navy hover:bg-white/80 transition-all flex items-center gap-1.5";
            if (btnIsb) btnIsb.className = "px-4 py-2 rounded-xl bg-navy text-white shadow-sm transition-all flex items-center gap-1.5";
        } else {
            iframe.src = "https://maps.google.com/maps?q=Hayat+Market,+Matta,+Swat,+Pakistan&t=&z=16&ie=UTF8&iwloc=&output=embed";
            if (heading) heading.textContent = "Swat Head Office Location";
            if (subtitle) subtitle.textContent = "2nd Floor, Hayat Market, Matta Swat, Khyber Pakhtunkhwa, Pakistan";
            if (openBtn) openBtn.href = "https://www.google.com/maps/search/?api=1&query=Hayat+Market,+Matta,+Swat";
            if (btnSwat) btnSwat.className = "px-4 py-2 rounded-xl bg-navy text-white shadow-sm transition-all flex items-center gap-1.5";
            if (btnIsb) btnIsb.className = "px-4 py-2 rounded-xl text-slate-600 hover:text-navy hover:bg-white/80 transition-all flex items-center gap-1.5";
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
        const pax = document.getElementById("calcPax").value;
        const totalText = document.getElementById("calcTotalDisplay").textContent;
        const perPersonText = document.getElementById("calcPerPersonDisplay").textContent;

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
