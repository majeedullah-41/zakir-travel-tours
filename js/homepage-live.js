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
    let selectedSpecialDealFilter = "ALL"; // "ALL" or specific deal.id
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

        // Re-sync when tab gains focus (helpful for file:// cross-tab edits)
        window.addEventListener("focus", () => {
            liveSiteConfig = zakirDB.getLocalSiteConfig();
            liveSpecialDeals = zakirDB.getLocalSpecialDeals ? zakirDB.getLocalSpecialDeals() : [];
            livePackages = zakirDB.getLocalUmrahPackages();
            liveVisas = zakirDB.getLocalVisaServices();
            renderSiteConfigToDOM(liveSiteConfig);
            renderSpecialDealsShowcase(liveSpecialDeals);
            renderUmrahPackagesGrid(livePackages);
            renderVisaServicesGrid(liveVisas);
            populateHeroUmrahDropdown(livePackages, liveSpecialDeals, liveSiteConfig);
            updateCalculator();
        });

        checkAdminHashRoute();
        window.addEventListener("hashchange", checkAdminHashRoute);
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
        const officeAddress =
            c.officeAddress ||
            "Office No. 7, Ground Floor, Potohar Plaza, Fazal-e-Haq Road, Blue Area, Islamabad";

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
        const logoSub = agencyParts.length > 1 ? agencyParts.slice(1).join(" ") : "TRAVEL & TOURS";
        setText("headerAgencyNameMain", logoMain.toUpperCase());
        setText("headerAgencyNameSub", logoSub.toUpperCase());
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
        setText("calcIntroBasePrice", `PKR ${formatPKR(r.sharingPrice || s.startingPrice || 232000)}`);

        const calcRoomSelect = document.getElementById("calcRoom");
        if (calcRoomSelect) {
            const prevIndex = calcRoomSelect.selectedIndex >= 0 ? calcRoomSelect.selectedIndex : 0;
            const sharingVal = Number(r.sharingPrice || s.startingPrice || 232000);
            const quadVal = Number(r.quadPrice || 248000);
            const tripleVal = Number(r.triplePrice || 268000);
            const doubleVal = Number(r.doublePrice || 295000);

            calcRoomSelect.innerHTML = `
                <option value="${sharingVal}">Sharing Room (PKR ${formatPKR(sharingVal)}/person)</option>
                <option value="${quadVal}">Quad Room - 4 Bed (PKR ${formatPKR(quadVal)}/person)</option>
                <option value="${tripleVal}">Triple Room - 3 Bed (PKR ${formatPKR(tripleVal)}/person)</option>
                <option value="${doubleVal}">Double Room - 2 Bed (PKR ${formatPKR(doubleVal)}/person)</option>
            `;
            calcRoomSelect.selectedIndex = Math.min(prevIndex, calcRoomSelect.options.length - 1);
        }

        // --- Contact & Islamabad Office Section ---
        setText("contactSectionAgencyName", agencyName);
        setText("contactSectionTagline", `"${taglineSecondary}"`);
        setText("contactSectionAddress", officeAddress);

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
                <option value="${managerWA}">${c.managerName || "Inam Khan (Manager)"} - ${c.managerPhone || "+92 349 0558345"}</option>
                <option value="${secondaryWA}">${c.secondaryName || "Sadiq Ullah"} - ${c.secondaryPhone || "+92 343 4159182"}</option>
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
                rightFrameBadge: "Haram View Options",
                rightFrameTitle: "Makkah Mukarramah",
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
                        <button type="button" onclick="filterSpecialDealsShowcase('ALL')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
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
                            <button type="button" onclick="filterSpecialDealsShowcase('${escapeHtmlAttr(deal.id)}')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
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

                const bookingLabel = `${deal.monthLabel || "Special"} ${deal.title || "Umrah Package"} (${deal.duration || "14 Nights"} - PKR ${formatPKR(deal.startingPrice || 232000)})`;
                const waText = encodeURIComponent(
                    `Assalam-o-Alaikum ${agencyName}!\n\nI am interested in your Special Offer:\n*${deal.monthLabel || "Special"} ${deal.title || "UMRAH PACKAGE"}*\n- Starting Price: PKR ${formatPKR(deal.startingPrice || 232000)} (${deal.priceUnit || "PER PERSON SHARING"})\n- Duration: ${deal.duration || "14 Nights"}\n- Departure: ${deal.departureDate || "Flexible"}\n- Return: ${deal.returnDate || "Scheduled"}\n\nPlease share seat availability and booking details.`
                );

                const srvClass = (isInc) =>
                    isInc !== false
                        ? "bg-slate-50 hover:bg-teal-accent/60 border border-slate-200 hover:border-teal/40 hover:-translate-y-1 shadow-sm"
                        : "bg-slate-50 border border-slate-200 opacity-40 grayscale line-through";

                return `
                <div class="special-deal-showcase-card bg-white rounded-3xl shadow-flyer border-2 ${
                    deal.isPrimary ? "border-teal/35" : "border-navy/15"
                } overflow-hidden transition-all duration-500 hover:shadow-2xl" style="animation: zakirDealCardEntrance 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.12}s both;">
                    
                    <!-- Deal Top Ribbon Header (Always shown when multiple deals exist or for clear deal branding) -->
                    <div class="bg-gradient-to-r from-slate-50 via-teal-accent/40 to-slate-50 px-6 sm:px-10 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-3">
                            <span class="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-sm ${
                                deal.isPrimary
                                    ? "bg-gradient-to-r from-navy to-teal text-white"
                                    : "bg-navy/10 text-navy"
                            }">
                                <i class="fa-solid ${deal.isPrimary ? "fa-crown text-amber-300" : "fa-bolt text-teal"}"></i>
                                ${escapeHtmlAttr(deal.badgeTag || (deal.isPrimary ? "Primary Spotlight Deal" : "Limited Time Offer"))}
                            </span>
                            <span class="font-script text-2xl sm:text-3xl text-teal">${escapeHtmlAttr(deal.monthLabel || "January")}</span>
                            <h3 class="text-xl sm:text-2xl font-black tracking-tight uppercase">
                                <span class="text-navy">${escapeHtmlAttr(firstWord)}</span>
                                <span class="text-teal">${escapeHtmlAttr(restWords)}</span>
                            </h3>
                        </div>
                        <div class="flex items-center gap-2 text-xs font-bold text-slate-500">
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

                    <div class="p-6 sm:p-10 lg:p-12">
                        <!-- Dual Framed Images (Madinah & Makkah) with Animated Floating Center Price Shield -->
                        <div class="relative grid md:grid-cols-2 gap-6 lg:gap-12 items-center">
                            
                            <!-- Left Frame: Masjid an-Nabawi (Madinah) -->
                            <div class="group relative rounded-2xl overflow-hidden border-4 border-teal shadow-lg h-64 sm:h-80">
                                <img src="${escapeHtmlAttr(
                                    deal.madinahImageUrl ||
                                        "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80"
                                )}" 
                                     onerror="this.src='https://placehold.co/800x600/0B2D5B/FFFFFF?text=Masjid+an-Nabawi+Madinah'"
                                     alt="${escapeHtmlAttr(deal.leftFrameTitle || "Madinah Munawwarah")}" 
                                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out">
                                <div class="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/20 to-transparent"></div>
                                <div class="absolute bottom-4 left-4 text-white">
                                    <span class="bg-teal text-xs font-bold uppercase px-2.5 py-1 rounded-md shadow">${escapeHtmlAttr(
                                        deal.leftFrameBadge || "Ziyarat & Stay"
                                    )}</span>
                                    <h4 class="text-xl font-bold mt-1.5 drop-shadow">${escapeHtmlAttr(
                                        deal.leftFrameTitle || "Madinah Munawwarah"
                                    )}</h4>
                                </div>
                            </div>

                            <!-- Center Overlapping Price Badge (Animated Floating Flyer Shield) -->
                            <div class="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-20 flex justify-center my-2 md:my-0">
                                <div class="flyer-badge floating-price-shield text-white p-1.5 rounded-3xl shadow-2xl border-4 border-white text-center w-64 sm:w-72 transform hover:scale-105 transition-transform duration-300">
                                    <div class="border-2 border-teal-light/60 rounded-2xl py-5 px-4 bg-navy/40 backdrop-blur-sm">
                                        <span class="text-[11px] font-bold uppercase tracking-widest text-sky-200 block">STARTING FROM</span>
                                        <div class="text-3xl sm:text-4xl font-black tracking-tight my-1 text-white drop-shadow">
                                            ${formatPKR(deal.startingPrice || 232000)}
                                        </div>
                                        <span class="text-xs font-semibold uppercase tracking-wider text-teal-accent block">PKR ${escapeHtmlAttr(
                                            deal.priceUnit || "PER PERSON (SHARING)"
                                        )}</span>
                                        <div class="mt-2 inline-flex items-center gap-1 text-[11px] bg-white/15 px-2.5 py-0.5 rounded-full">
                                            <i class="fa-solid fa-mosque text-amber-300"></i> ${escapeHtmlAttr(
                                                deal.badgeTag || "All-Inclusive Deal"
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Frame: Holy Kaaba (Makkah) -->
                            <div class="group relative rounded-2xl overflow-hidden border-4 border-navy shadow-lg h-64 sm:h-80">
                                <img src="${escapeHtmlAttr(
                                    deal.makkahImageUrl ||
                                        "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80"
                                )}" 
                                     onerror="this.src='https://placehold.co/800x600/0D8A9E/FFFFFF?text=Makkah+Mukarramah'"
                                     alt="${escapeHtmlAttr(deal.rightFrameTitle || "Makkah Mukarramah")}" 
                                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out">
                                <div class="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/20 to-transparent"></div>
                                <div class="absolute bottom-4 left-4 md:left-auto md:right-4 md:text-right text-white">
                                    <span class="bg-navy text-xs font-bold uppercase px-2.5 py-1 rounded-md shadow">${escapeHtmlAttr(
                                        deal.rightFrameBadge || "Haram View Options"
                                    )}</span>
                                    <h4 class="text-xl font-bold mt-1.5 drop-shadow">${escapeHtmlAttr(
                                        deal.rightFrameTitle || "Makkah Mukarramah"
                                    )}</h4>
                                </div>
                            </div>

                        </div>

                        <!-- Schedule Strip (Departures | Return | Duration) -->
                        <div class="mt-10 border-2 border-teal rounded-2xl bg-slate-50 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-teal/30">
                            <div class="flex items-center justify-center gap-4 pt-2 md:pt-0">
                                <div class="w-12 h-12 rounded-xl bg-navy/10 text-navy flex items-center justify-center text-2xl">
                                    <i class="fa-solid fa-plane-departure"></i>
                                </div>
                                <div>
                                    <div class="text-xs font-bold uppercase tracking-wider text-navy">Departures</div>
                                    <div class="text-lg sm:text-xl font-extrabold text-teal">
                                        <span>${escapeHtmlAttr(deal.departureDate || "Jan 26, 2026")}</span>
                                        <span class="text-xs font-normal text-slate-500 block sm:inline">(Weekly Batches)</span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex items-center justify-center gap-4 pt-4 md:pt-0">
                                <div class="w-12 h-12 rounded-xl bg-navy/10 text-navy flex items-center justify-center text-2xl">
                                    <i class="fa-solid fa-plane-arrival"></i>
                                </div>
                                <div>
                                    <div class="text-xs font-bold uppercase tracking-wider text-navy">Return / Schedule</div>
                                    <div class="text-lg sm:text-xl font-extrabold text-teal">${escapeHtmlAttr(
                                        deal.returnDate || "Nov 10, 2026"
                                    )}</div>
                                </div>
                            </div>

                            <div class="flex items-center justify-center gap-4 pt-4 md:pt-0">
                                <div class="w-12 h-12 rounded-xl bg-navy/10 text-navy flex items-center justify-center text-2xl">
                                    <i class="fa-regular fa-clock"></i>
                                </div>
                                <div>
                                    <div class="text-xs font-bold uppercase tracking-wider text-navy">Duration</div>
                                    <div class="text-lg sm:text-xl font-extrabold text-teal">${escapeHtmlAttr(
                                        deal.duration || "14 Nights"
                                    )}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Services Included Banner -->
                        <div class="mt-10 text-center">
                            <div class="inline-flex items-center gap-3 bg-gradient-to-r from-navy via-teal to-navy text-white font-extrabold uppercase tracking-wider px-8 py-2.5 rounded-full shadow-md text-sm sm:text-base">
                                <span class="text-xs">◆</span>
                                <span>SERVICES INCLUDED</span>
                                <span class="text-xs">◆</span>
                            </div>

                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-8 max-w-4xl mx-auto">
                                <div class="${srvClass(srv.roundTrip)} rounded-2xl p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-2xl mb-3 transition-all">
                                        <i class="fa-solid fa-earth-americas"></i>
                                    </div>
                                    <h4 class="font-extrabold text-navy text-base">Round Trip</h4>
                                    <p class="text-xs text-slate-500 mt-1">Return Air Ticket Included</p>
                                </div>

                                <div class="${srvClass(srv.visa)} rounded-2xl p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-2xl mb-3 transition-all">
                                        <i class="fa-solid fa-id-card-clip"></i>
                                    </div>
                                    <h4 class="font-extrabold text-navy text-base">Umrah Visa</h4>
                                    <p class="text-xs text-slate-500 mt-1">Fast E-Visa & Insurance</p>
                                </div>

                                <div class="${srvClass(srv.hotel)} rounded-2xl p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-2xl mb-3 transition-all">
                                        <i class="fa-solid fa-hotel"></i>
                                    </div>
                                    <h4 class="font-extrabold text-navy text-base">Hotel Stay</h4>
                                    <p class="text-xs text-slate-500 mt-1">Makkah & Madinah Hotels</p>
                                </div>

                                <div class="${srvClass(srv.transport)} rounded-2xl p-5 flex flex-col items-center transition-all duration-300 group">
                                    <div class="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-navy group-hover:text-teal group-hover:scale-110 text-2xl mb-3 transition-all">
                                        <i class="fa-solid fa-bus-simple"></i>
                                    </div>
                                    <h4 class="font-extrabold text-navy text-base">Transport</h4>
                                    <p class="text-xs text-slate-500 mt-1">Luxury AC Ground Transport</p>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
                                <button type="button" onclick="openBookingModal('${escapeHtmlAttr(bookingLabel.replace(/'/g, "\\'"))}')" class="w-full sm:w-auto bg-navy hover:bg-navy-light text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                                    <i class="fa-solid fa-calendar-check text-teal-light"></i>
                                    <span>Reserve Your Seat Now</span>
                                </button>
                                <a href="https://wa.me/${activeWA}?text=${waText}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto bg-teal hover:bg-teal-dark text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                                    <i class="fa-brands fa-whatsapp text-xl"></i>
                                    <span>Book via WhatsApp</span>
                                </a>
                                ${
                                    deal.showFlyerButton !== false
                                        ? `<button type="button" onclick="openPromotionalFlyerModal('${escapeHtmlAttr(deal.id)}')" class="w-full sm:w-auto bg-slate-100 hover:bg-teal-accent text-navy font-bold px-6 py-4 rounded-xl border border-teal/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
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
                <div class="bg-white rounded-3xl p-6 border-2 ${pkg.isFeatured ? "border-teal shadow-flyer" : "border-slate-200/90 shadow-md"} hover:border-teal hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                    ${
                        pkg.isFeatured
                            ? `<div class="absolute top-0 right-0 bg-gradient-to-r from-navy to-teal text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl">
                                <i class="fa-solid fa-star text-amber-300 mr-1"></i>Featured Deal
                               </div>`
                            : ""
                    }
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <span class="bg-teal-accent text-teal text-xs font-extrabold uppercase px-3 py-1 rounded-full">
                                ${pkg.badgeText || "Umrah Deal"}
                            </span>
                            <span class="text-xs font-bold text-slate-500">
                                <i class="fa-regular fa-clock text-teal mr-1"></i>${pkg.duration}
                            </span>
                        </div>

                        <h3 class="text-xl font-black text-navy mb-2">${pkg.title}</h3>

                        <div class="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 mb-4 flex items-baseline justify-between">
                            <div>
                                <span class="text-[10px] font-bold uppercase text-slate-400 block">Starting From</span>
                                <div class="text-2xl font-black text-teal">PKR ${formatPKR(pkg.price)}</div>
                            </div>
                            <span class="text-xs font-bold text-navy bg-white px-2.5 py-1 rounded-lg border border-slate-200">${pkg.roomType}</span>
                        </div>

                        <div class="space-y-2 text-xs text-slate-600 mb-4">
                            <div class="flex items-center justify-between py-1 border-b border-slate-100">
                                <span class="font-semibold text-slate-500"><i class="fa-solid fa-plane-departure text-teal w-4"></i> Departure:</span>
                                <span class="font-bold text-navy">${pkg.departureDate}</span>
                            </div>
                            <div class="flex items-center justify-between py-1 border-b border-slate-100">
                                <span class="font-semibold text-slate-500"><i class="fa-solid fa-plane-arrival text-teal w-4"></i> Return:</span>
                                <span class="font-bold text-navy">${pkg.returnDate}</span>
                            </div>
                            <div class="flex items-center justify-between py-1 border-b border-slate-100">
                                <span class="font-semibold text-slate-500"><i class="fa-solid fa-kaaba text-teal w-4"></i> Makkah Hotel:</span>
                                <span class="font-bold text-navy">${pkg.makkahHotelDist}</span>
                            </div>
                            <div class="flex items-center justify-between py-1">
                                <span class="font-semibold text-slate-500"><i class="fa-solid fa-mosque text-teal w-4"></i> Madinah Hotel:</span>
                                <span class="font-bold text-navy">${pkg.madinahHotelDist}</span>
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-1.5 mb-6">
                            ${servicesList
                                .map(
                                    (srv) =>
                                        `<span class="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                            <i class="fa-solid fa-check text-teal text-[10px]"></i> ${srv}
                                         </span>`
                                )
                                .join("")}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                        <button type="button" onclick="openBookingModal('${pkg.title.replace(/'/g, "\\'")} (PKR ${formatPKR(pkg.price)})')" class="bg-navy hover:bg-navy-light text-white font-bold text-xs py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-paper-plane text-teal-light"></i>
                            <span>Quick Book</span>
                        </button>
                        <a href="https://wa.me/${activeWA}?text=${waText}" target="_blank" rel="noopener noreferrer" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5">
                            <i class="fa-brands fa-whatsapp text-sm"></i>
                            <span>Book via WhatsApp</span>
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
                    `<option value="${v.countryName} (${v.visaType} - PKR ${formatPKR(v.pricePKR)})">${v.flagEmoji || "🌍"} ${v.countryName} — ${v.visaType} (PKR ${formatPKR(v.pricePKR)})</option>`
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
                                    ${v.flagEmoji || "🌍"}
                                </div>
                                <div>
                                    <h4 class="font-extrabold text-navy text-base">${v.countryName}</h4>
                                    <span class="inline-block bg-slate-100 text-teal font-bold text-[11px] px-2.5 py-0.5 rounded-md mt-0.5">${v.visaType}</span>
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
                                <span class="font-bold text-navy">${v.processingTime}</span>
                            </div>
                            <p class="text-[11px] text-slate-500 leading-relaxed pt-1">
                                <strong class="text-slate-700">Docs:</strong> ${v.requirementsSummary}
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 pt-2">
                        <button type="button" onclick="openBookingModal('${v.countryName.replace(/'/g, "\\'")} - ${v.visaType.replace(/'/g, "\\'")} (PKR ${formatPKR(v.pricePKR)})')" class="flex-1 text-navy hover:bg-navy hover:text-white font-bold text-xs py-2.5 px-3 rounded-xl bg-slate-100 transition-colors">
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

    window.handleHeroSubmit = function (e) {
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
        window.open(`https://wa.me/${activeWA}?text=${message}`, "_blank");
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

    window.sendCalculatorToWhatsApp = function () {
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
        window.open(`https://wa.me/${activeWA}?text=${msg}`, "_blank");
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

    window.submitModalInquiry = function (e) {
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
        window.open(`https://wa.me/${agentPhone}?text=${text}`, "_blank");
        window.closeBookingModal();
    };

    window.openPromotionalFlyerModal = openPromotionalFlyerModal;
    window.closePromotionalFlyerModal = closePromotionalFlyerModal;
    window.openAdminPortalDrawer = openAdminPortalDrawer;
    window.closeAdminPortalDrawer = closeAdminPortalDrawer;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initHomepageBindings);
    } else {
        initHomepageBindings();
    }
})(window);
