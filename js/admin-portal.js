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
                0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45); }
                50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
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
            .anim-pulse-emerald {
                animation: zakirPulseGlow 2.2s infinite;
            }
            .admin-gradient-animated {
                background: linear-gradient(125deg, #071E3E, #0B2D5B, #0D8A9E, #0B2D5B);
                background-size: 260% 260%;
                animation: zakirShimmerBg 10s ease infinite;
            }
            .admin-card-hover {
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
            }
            .admin-card-hover:hover {
                transform: translateY(-3px);
                box-shadow: 0 16px 35px -10px rgba(11, 45, 91, 0.14);
            }
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
            this.currentUser = db.getCurrentUser();

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

            db.onAuthSnapshot((user) => {
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
        }

        showToast(message, type = "success") {
            const toastContainer = this.container.querySelector("#adminToastContainer");
            if (!toastContainer) return;

            const toast = document.createElement("div");
            const bgClass =
                type === "error"
                    ? "bg-rose-600 border-rose-400"
                    : type === "warning"
                    ? "bg-amber-600 border-amber-400"
                    : "bg-emerald-600 border-emerald-400";
            const iconClass =
                type === "error"
                    ? "fa-circle-exclamation"
                    : type === "warning"
                    ? "fa-triangle-exclamation"
                    : "fa-circle-check";

            toast.className = `${bgClass} text-white px-4 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-bold transform transition-all duration-300 translate-y-2 opacity-0`;
            toast.innerHTML = `
                <i class="fa-solid ${iconClass} text-lg"></i>
                <span></span>
            `;
            const toastLabel = toast.querySelector("span");
            if (toastLabel) toastLabel.textContent = String(message == null ? "" : message);
            toastContainer.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.remove("translate-y-2", "opacity-0");
            });

            setTimeout(() => {
                toast.classList.add("opacity-0", "translate-y-2");
                setTimeout(() => toast.remove(), 300);
            }, 3200);
        }

        renderShell() {
            this.container.innerHTML = `
                <!-- Toast Notification Container -->
                <div id="adminToastContainer" class="fixed bottom-5 right-5 z-[95] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"></div>

                <!-- ============================================================== -->
                <!-- 1. AUTHENTICATION LOGIN SCREEN                                 -->
                <!-- ============================================================== -->
                <div id="adminAuthView" class="min-h-screen flex items-center justify-center p-4 admin-gradient-animated">
                    <div class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-white/30 anim-scale-in">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-lg border border-slate-200/80">
                                    <img src="./assets/logo-mark.png" alt="Zakir Travel Logo" class="w-full h-full object-contain">
                                </div>
                                <div>
                                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-[#0D8A9E] block">Cloud Control Center</span>
                                    <h1 class="text-xl font-black text-[#0B2D5B]">Zakir Travel Admin</h1>
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

                        <div class="bg-gradient-to-r from-[#E6F6F8] to-sky-50 border border-[#0D8A9E]/30 rounded-2xl p-4 mb-5 text-xs text-[#0B2D5B]">
                            <div class="font-extrabold flex items-center gap-1.5 mb-1">
                                <i class="fa-solid fa-shield-halved text-amber-500"></i>
                                <span>Secure Admin Access</span>
                            </div>
                            <p class="text-slate-600 leading-relaxed">
                                Sign in with your authorized email and password to manage Special Flyer Deals, Umrah Packages, Visas, and WhatsApp lead routing.
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
                            <button type="submit" class="w-full bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-extrabold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-unlock-keyhole"></i>
                                <span>Unlock Admin Dashboard</span>
                            </button>
                        </form>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- 2. AUTHENTICATED MOBILE-FIRST ADMIN DASHBOARD                  -->
                <!-- ============================================================== -->
                <div id="adminDashboardView" class="hidden min-h-screen bg-slate-100/90 pb-24">
                    
                    <!-- Sticky Glassmorphic Top Admin Header -->
                    <header class="sticky top-0 z-40 bg-[#071E3E]/95 backdrop-blur-md text-white shadow-xl border-b border-white/10">
                        <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div class="w-11 h-11 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-lg">
                                    <img src="./assets/logo-mark.png" alt="Zakir Travel Logo" class="w-full h-full object-contain">
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h1 class="font-black text-base sm:text-lg tracking-tight leading-none">Zakir Control Center</h1>
                                        <span id="dbModeBadge" class="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Sync
                                        </span>
                                    </div>
                                    <p id="adminActiveUserLabel" class="text-[11px] text-slate-300 mt-0.5">Signed in as Inam Khan</p>
                                </div>
                            </div>

                            <!-- Live Price Badge & Action Buttons -->
                            <div class="flex flex-wrap items-center gap-2 sm:gap-2.5 ml-auto">
                                <div class="hidden md:flex bg-white/10 border border-white/15 rounded-xl px-3.5 py-1.5 items-center gap-2.5">
                                    <i class="fa-solid fa-tag text-[#15B2CB]"></i>
                                    <div class="text-left">
                                        <span class="text-[9px] uppercase tracking-wider text-sky-200 block leading-none">Primary Flyer Deal</span>
                                        <span id="livePreviewPriceBadge" class="text-xs sm:text-sm font-black text-white">PKR 232,000</span>
                                    </div>
                                </div>

                                <!-- Save & Push to Website Button -->
                                <button type="button" id="headerSavePushBtn" data-action="save-push-all" class="anim-pulse-emerald bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95">
                                    <i class="fa-solid fa-cloud-arrow-up text-sm"></i>
                                    <span>Save & Push to Website</span>
                                </button>

                                ${
                                    this.isDrawer
                                        ? `<button type="button" data-action="close-drawer" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all">
                                            <i class="fa-solid fa-eye text-[#15B2CB]"></i>
                                            <span class="hidden sm:inline">View Live Page</span>
                                           </button>`
                                        : `<a href="index.html" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all">
                                            <i class="fa-solid fa-eye text-[#15B2CB]"></i>
                                            <span class="hidden sm:inline">Live Website</span>
                                           </a>`
                                }

                                <button type="button" data-action="logout" class="bg-rose-500/20 hover:bg-rose-600 border border-rose-400/30 text-rose-200 hover:text-white text-xs font-bold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-all" title="Lock / Logout">
                                    <i class="fa-solid fa-lock"></i>
                                    <span class="hidden sm:inline">Lock</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    <main class="max-w-7xl mx-auto px-4 pt-6 space-y-6">

                        <!-- ========================================================== -->
                        <!-- TOP "10-SECOND QUICK UPDATE" BAR (MOBILE PRIORITY)         -->
                        <!-- ========================================================== -->
                        <section class="admin-gradient-animated rounded-3xl p-5 sm:p-6 text-white shadow-2xl border border-white/15 relative overflow-hidden anim-fade-up">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <div class="flex items-center gap-2.5">
                                    <span class="bg-amber-400 text-[#071E3E] text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow">
                                        <i class="fa-solid fa-bolt"></i> 10-Second Quick Update
                                    </span>
                                    <h2 class="text-base sm:text-lg font-black tracking-tight">Primary Flyer Deal & Tier Rate Updater</h2>
                                </div>
                                <span id="quickUpdateTierHint" class="text-[11px] text-sky-200 font-semibold flex items-center gap-1.5">
                                    <i class="fa-solid fa-wand-magic-sparkles text-amber-300"></i>
                                    <span>Auto-scales Primary Deal + Calculator Tiers</span>
                                </span>
                            </div>

                            <form id="quickUpdateForm" class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                <div class="sm:col-span-4">
                                    <label class="block text-[11px] font-bold uppercase tracking-wider text-sky-200 mb-1">
                                        Primary Deal Starting Price (PKR)
                                    </label>
                                    <div class="relative">
                                        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-[#0B2D5B]">PKR</span>
                                        <input type="number" id="quickStartingPrice" min="1000" step="500" required
                                            class="w-full bg-white text-[#0B2D5B] font-black text-base rounded-xl pl-12 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-inner">
                                    </div>
                                </div>

                                <div class="sm:col-span-3">
                                    <label class="block text-[11px] font-bold uppercase tracking-wider text-sky-200 mb-1">
                                        Next Departure Date
                                    </label>
                                    <input type="text" id="quickDepartureDate" required placeholder="e.g. Jan 26, 2026"
                                        class="w-full bg-white text-[#0B2D5B] font-extrabold text-sm rounded-xl px-3.5 py-3.5 focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-inner">
                                </div>

                                <div class="sm:col-span-2">
                                    <label class="block text-[11px] font-bold uppercase tracking-wider text-sky-200 mb-1">
                                        Season / Month Label
                                    </label>
                                    <input type="text" id="quickMonthLabel" required placeholder="e.g. Ramzan"
                                        class="w-full bg-white text-[#0B2D5B] font-extrabold text-sm rounded-xl px-3.5 py-3.5 focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-inner">
                                </div>

                                <div class="sm:col-span-3">
                                    <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm">
                                        <i class="fa-solid fa-bolt"></i>
                                        <span>Publish Live Now</span>
                                    </button>
                                </div>
                            </form>
                        </section>

                        <!-- ========================================================== -->
                        <!-- 5 PAGE-DEDICATED MANAGEMENT TABS NAVIGATION                -->
                        <!-- ========================================================== -->
                        <nav class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-white p-2 rounded-2xl shadow-md border border-slate-200/80">
                            <button type="button" data-tab="spotlight" class="admin-tab-btn bg-gradient-to-r from-[#0B2D5B] to-[#16437E] text-white font-extrabold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all">
                                <i class="fa-solid fa-house-chimney text-amber-300"></i>
                                <span>1. Home Page</span>
                            </button>
                            <button type="button" data-tab="umrah" class="admin-tab-btn text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                                <i class="fa-solid fa-kaaba text-[#0D8A9E]"></i>
                                <span>2. Umrah Page</span>
                                <span id="tabBadgeDeals" class="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full" title="Special Flyer Deals">1</span>
                                <span id="tabBadgePkgs" class="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full" title="Comparison Packages">4</span>
                            </button>
                            <button type="button" data-tab="visas" class="admin-tab-btn text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                                <i class="fa-solid fa-passport text-[#0D8A9E]"></i>
                                <span>3. Visas & Flights</span>
                                <span id="tabBadgeVisas" class="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">6</span>
                            </button>
                            <button type="button" data-tab="calculator" class="admin-tab-btn text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                                <i class="fa-solid fa-calculator text-[#0D8A9E]"></i>
                                <span>4. Calculator Page</span>
                            </button>
                            <button type="button" data-tab="contacts" class="admin-tab-btn text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all col-span-2 sm:col-span-1">
                                <i class="fa-brands fa-whatsapp text-emerald-600 text-base"></i>
                                <span>5. Contact & Office</span>
                            </button>
                        </nav>

                        <!-- ========================================================== -->
                        <!-- TAB 1: HOME PAGE GENERAL AGENCY INFORMATION (index.html)   -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-spotlight" class="admin-tab-panel space-y-6 anim-fade-up">
                            <form id="homePageContentForm" class="grid lg:grid-cols-12 gap-6">
                                <!-- Left Column: Home Hero, About Our Agency & 4 Key Stats -->
                                <div class="lg:col-span-6 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div>
                                            <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">index.html General Agency Info</span>
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
                                <div class="lg:col-span-6 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5 flex flex-col justify-between">
                                    <div class="space-y-5">
                                        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Trust Pillars & Services Overview</span>
                                                <h3 class="text-lg font-black text-[#0B2D5B]">Why Choose Us & 4 Core Services</h3>
                                            </div>
                                            <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">index.html</span>
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

                                    <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
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
                            <div class="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                                            Umrah Flyer Showcase CRUD
                                        </span>
                                        <span class="text-xs font-bold text-[#0D8A9E]">• Live on umrah-packages.html</span>
                                    </div>
                                    <h3 class="text-xl font-black text-[#0B2D5B] mt-1">Manage Special Umrah Flyer Deals & Offers</h3>
                                    <p class="text-xs text-slate-500 mt-0.5">
                                        Add multiple visual Flyer Deals (e.g. January Umrah, Ramzan Special, Rabi-ul-Awal Deal). Each deal renders its own dual-frame showcase card on the Umrah page!
                                    </p>
                                </div>

                                <div class="flex flex-wrap items-center gap-2.5 shrink-0">
                                    <button type="button" data-action="quick-add-ramzan-deal" class="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs px-4 py-3 rounded-2xl transition-all flex items-center gap-1.5 shadow-sm">
                                        <i class="fa-solid fa-moon text-amber-600"></i>
                                        <span>+ Quick Add Ramzan Deal</span>
                                    </button>
                                    <button type="button" data-action="open-deal-modal" class="bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                        <i class="fa-solid fa-plus"></i>
                                        <span>Add New Special Deal</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Special Flyer Deals Visual CRUD Grid -->
                            <div id="crudSpecialDealsContainer" class="grid grid-cols-1 lg:grid-cols-2 gap-6"></div>

                            <!-- Comparison Umrah Packages Header & Grid -->
                            <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                                <div>
                                    <span class="text-[10px] font-black uppercase tracking-wider text-[#0D8A9E]">umrah-packages.html Manager</span>
                                    <h3 class="text-xl font-black text-[#0B2D5B]">Comparison Umrah Packages (CRUD)</h3>
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
                                <div class="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div>
                                            <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Page Text & Inclusions Editor</span>
                                            <h3 class="text-lg font-black text-[#0B2D5B]">Umrah Page Banner, Inclusions & Family CTA</h3>
                                        </div>
                                        <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">umrah-packages.html</span>
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

                                    <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                        <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                        <span>Save Umrah Page Content</span>
                                    </button>
                                </div>

                                <!-- Right Column: Primary Deal Media & Monthly Flyer Popup Uploader -->
                                <div class="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5 flex flex-col justify-between">
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
                                                    <input type="text" id="inputMadinahUrl" placeholder="Image URL..." class="mt-2 w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
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
                                                    <input type="text" id="inputMakkahUrl" placeholder="Image URL..." class="mt-2 w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
                                                </div>
                                                <label class="w-full bg-white hover:bg-[#0B2D5B] hover:text-white text-[#0B2D5B] border border-slate-200 font-bold text-[11px] py-1.5 px-2 rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-colors">
                                                    <i class="fa-solid fa-camera"></i> Upload
                                                    <input type="file" accept="image/*" data-upload-target="inputMakkahUrl" data-preview-target="previewMakkahImg" class="hidden">
                                                </label>
                                            </div>

                                            <!-- Promotional Flyer -->
                                            <div class="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col justify-between space-y-2">
                                                <div>
                                                    <span class="text-[10px] font-bold uppercase text-emerald-700">Flyer Popup</span>
                                                    <div class="h-28 rounded-xl overflow-hidden border border-dashed border-[#0D8A9E] bg-white mt-1 flex items-center justify-center">
                                                        <img id="previewFlyerImg" src="" alt="Flyer" class="w-full h-full object-cover hidden">
                                                        <div id="previewFlyerPlaceholder" class="text-center p-2 text-[10px] text-slate-400">
                                                            <i class="fa-solid fa-file-image text-lg text-[#0D8A9E] block mb-1"></i>
                                                            Digital Flyer
                                                        </div>
                                                    </div>
                                                    <input type="text" id="inputFlyerUrl" placeholder="Flyer URL (Opt)" class="mt-2 w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
                                                </div>
                                                <label class="w-full bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 font-bold text-[11px] py-1.5 px-2 rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-colors">
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
                                        <i class="fa-solid fa-cloud-arrow-up"></i>
                                        <span>Save Umrah Media & Flyer Settings</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- ========================================================== -->
                        <!-- TAB 3: VISAS & FLIGHTS PAGE (CRUD + PAGE CONTENT)          -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-visas" class="admin-tab-panel hidden space-y-6 anim-fade-up">
                            
                            <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                                <div>
                                    <span class="text-[10px] font-black uppercase tracking-wider text-[#0D8A9E]">visa-services.html Manager</span>
                                    <h3 class="text-xl font-black text-[#0B2D5B]">Country Visa Cards (CRUD)</h3>
                                    <p class="text-xs text-slate-500">Add, edit, reorder, or hide Country Visa destinations and starting fees.</p>
                                </div>
                                <button type="button" data-action="open-visa-modal" class="bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition-all">
                                    <i class="fa-solid fa-plus"></i> Add Country Visa
                                </button>
                            </div>

                            <!-- Country Visas List -->
                            <div id="crudVisasContainer" class="grid md:grid-cols-2 gap-4"></div>

                            <!-- Visas & Flights Page Content Editor -->
                            <form id="visaPageContentForm" class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Visas, Flights & 3-Step Process Editor</span>
                                        <h3 class="text-lg font-black text-[#0B2D5B]">Manage Visas & Air Tickets Page Content</h3>
                                    </div>
                                    <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">visa-services.html</span>
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

                                <button type="submit" class="w-full sm:w-auto bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                    <span>Save Visas & Flights Page Content</span>
                                </button>
                            </form>
                        </div>

                        <!-- ========================================================== -->
                        <!-- TAB 4: CALCULATOR PAGE (TIER RATES, ADDONS & PAGE CONTENT) -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-calculator" class="admin-tab-panel hidden space-y-6 anim-fade-up">
                            <form id="spotlightAndCalcForm" class="grid lg:grid-cols-12 gap-6">
                                
                                <!-- Left Column: Calculator Room Tier Pricing & Auto-Scale -->
                                <div class="lg:col-span-6 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-5">
                                    <div class="space-y-4">
                                        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Interactive Estimator Math</span>
                                                <h3 class="text-lg font-black text-[#0B2D5B]">Room Sharing Tier Rates & Add-Ons</h3>
                                            </div>
                                            <div class="w-10 h-10 rounded-2xl bg-[#E6F6F8] text-[#0D8A9E] flex items-center justify-center text-lg">
                                                <i class="fa-solid fa-calculator"></i>
                                            </div>
                                        </div>

                                        <!-- Auto-scale toggle -->
                                        <label class="flex items-start gap-3 bg-[#E6F6F8]/70 border border-[#0D8A9E]/30 rounded-2xl p-3.5 cursor-pointer">
                                            <input type="checkbox" id="calcAutoScaleToggle" class="w-5 h-5 accent-[#0B2D5B] mt-0.5 rounded">
                                            <div>
                                                <span class="text-xs font-extrabold text-[#0B2D5B] block">Auto-scale tiers from Primary Deal price</span>
                                                <span class="text-[11px] text-slate-600">Automatically scales Sharing, Quad (+16k), Triple (+36k), and Double (+63k) when the Primary Deal price changes.</span>
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
                                            <span class="text-[10px] font-black uppercase text-[#0D8A9E] block mb-2">Duration & Hotel Star Add-On Modifiers (PKR)</span>
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

                                    <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                        <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                        <span>Save Calculator Rates</span>
                                    </button>
                                </div>

                                <!-- Right Column: Calculator Page Text & Included Bullets -->
                                <div class="lg:col-span-6 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-5">
                                    <div class="space-y-4">
                                        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Package Estimator Manager</span>
                                                <h3 class="text-lg font-black text-[#0B2D5B]">Package Estimator Banner &amp; Inclusions</h3>
                                            </div>
                                            <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">umrah-packages.html</span>
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Calculator Hero Top Badge</label>
                                            <input type="text" id="calcHeroBadgeInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Calculator Hero Heading</label>
                                            <input type="text" id="calcHeroTitleInput" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B2D5B]">
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Calculator Hero Subtitle</label>
                                            <textarea id="calcHeroSubtitleInput" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">What Is Included in Every Estimate (1 bullet per line)</label>
                                            <textarea id="calcIncludedBulletsInput" rows="4" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"></textarea>
                                        </div>
                                    </div>

                                    <button type="submit" class="w-full bg-[#0D8A9E] hover:bg-[#096979] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                        <i class="fa-solid fa-cloud-arrow-up"></i>
                                        <span>Save Calculator Page & Rates</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- ========================================================== -->
                        <!-- TAB 5: CONTACT & OFFICE PAGE (ROUTING, DETAILS & MAP)      -->
                        <!-- ========================================================== -->
                        <div id="admin-panel-contacts" class="admin-tab-panel hidden space-y-6 anim-fade-up">
                            <form id="contactsForm" class="grid lg:grid-cols-12 gap-6">
                                
                                <!-- Left Column: Active WhatsApp Lead Routing + Staff Numbers + Contact Page Banner -->
                                <div class="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
                                    <div class="border-b border-slate-100 pb-4">
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Instant Lead Distribution</span>
                                        <h3 class="text-lg font-black text-[#0B2D5B]">Active WhatsApp Booking Routing</h3>
                                        <p class="text-xs text-slate-500 mt-0.5">Choose which staff member receives automated inquiries from the Hero Widget, Special Deal Cards, Umrah Calculator, and Visa CTA buttons across all pages.</p>
                                    </div>

                                    <div>
                                        <label class="block text-xs font-bold uppercase text-slate-600 mb-2">Route Website Booking Inquiries To:</label>
                                        <select id="contactActiveRouting" class="w-full bg-emerald-50 border-2 border-emerald-500 rounded-2xl px-4 py-3.5 text-sm font-black text-[#0B2D5B] focus:outline-none">
                                            <option value="manager">Primary Contact (Inam Khan)</option>
                                            <option value="secondary">Secondary Contact (Sadiq Ullah)</option>
                                        </select>
                                    </div>

                                    <!-- Primary Contact: Inam Khan -->
                                    <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                                        <div class="text-xs font-black uppercase text-[#0B2D5B] flex items-center justify-between">
                                            <span><i class="fa-solid fa-user-tie text-[#0D8A9E] mr-1.5"></i>Primary Contact (Manager)</span>
                                            <span id="badgeRoutingManager" class="hidden bg-emerald-500 text-white text-[10px] px-2.5 py-0.5 rounded-full">Active Lead Receiver</span>
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
                                                <input type="text" id="contactManagerWA" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Secondary Contact: Sadiq Ullah -->
                                    <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                                        <div class="text-xs font-black uppercase text-[#0B2D5B] flex items-center justify-between">
                                            <span><i class="fa-solid fa-headset text-[#0D8A9E] mr-1.5"></i>Secondary Contact (Consultant)</span>
                                            <span id="badgeRoutingSecondary" class="hidden bg-emerald-500 text-white text-[10px] px-2.5 py-0.5 rounded-full">Active Lead Receiver</span>
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
                                                <input type="text" id="contactSecondaryWA" required class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Contact Page Hero Banner Fields -->
                                    <div class="border-t border-slate-100 pt-4 space-y-3">
                                        <span class="text-[10px] font-black uppercase text-[#0D8A9E] block">About Us &amp; Contact Page (contact.html) Hero Banner Text</span>
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
                                            <span class="text-[10px] font-black uppercase text-[#0D8A9E] block"><i class="fa-solid fa-users mr-1"></i>About Us — Team Member Photos</span>
                                            <span class="text-[10px] font-bold text-slate-400">Upload, then click Save &amp; Push</span>
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
                                                <div class="flex items-center gap-1.5">
                                                    <label class="cursor-pointer bg-[#0B2D5B] hover:bg-[#0D8A9E] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                                                        <i class="fa-solid fa-upload mr-1"></i>Upload
                                                        <input type="file" accept="image/*" class="hidden" data-team-photo-upload="${m.id}">
                                                    </label>
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
                                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3.5">
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
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Google Maps Embed URL</label>
                                            <input type="text" id="contactMapEmbedUrl" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-[11px] text-slate-600">
                                        </div>
                                        <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                            <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                            <span>Save Contact Page & Push Live</span>
                                        </button>
                                    </div>

                                    <!-- Safety Reset & Firebase Cloud Connection Card -->
                                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-rose-200 space-y-4">
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <span class="text-[10px] font-extrabold uppercase text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">Safety Recovery</span>
                                                <h4 class="text-sm font-black text-[#0B2D5B] mt-1">Reset or Configure Cloud DB</h4>
                                            </div>
                                            <i class="fa-solid fa-shield-halved text-xl text-rose-500"></i>
                                        </div>
                                        <p class="text-xs text-slate-500">
                                            Restore all Special Deals, prices, dates, packages, visas, page text, and contacts back to the original <strong>January Flyer Defaults (PKR 232,000)</strong>.
                                        </p>
                                        <div class="flex flex-col sm:flex-row gap-2.5">
                                            <button type="button" data-action="reset-flyer-defaults" class="flex-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-extrabold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2">
                                                <i class="fa-solid fa-rotate-left"></i>
                                                <span>Reset to January Flyer Defaults</span>
                                            </button>
                                            <button type="button" data-action="open-firebase-modal" class="bg-slate-100 hover:bg-slate-200 text-[#0B2D5B] font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5">
                                                <i class="fa-solid fa-database text-[#0D8A9E]"></i>
                                                <span>Firebase Config</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                    </main>
                </div>

                <!-- ============================================================== -->
                <!-- MODAL: ADD / EDIT SPECIAL FLYER DEAL (FULL CRUD)               -->
                <!-- ============================================================== -->
                <div id="dealCrudModal" class="fixed inset-0 z-[85] hidden bg-[#071E3E]/80 backdrop-blur-sm flex items-center justify-center p-4">
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
                                    <input type="number" id="dealEditPrice" min="1000" step="500" required placeholder="232000" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-emerald-700">
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
                                    <input type="text" id="dealEditRet" required placeholder="Nov 10, 2026" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B]">
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
                                        <input type="text" id="dealEditMadinahUrl" required placeholder="Left Image URL" class="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
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
                                        <input type="text" id="dealEditMakkahUrl" required placeholder="Right Image URL" class="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                        <label class="bg-[#0B2D5B] hover:bg-[#16437E] text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1 shrink-0">
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
                                    <input type="checkbox" id="dealEditPrimary" class="w-4 h-4 accent-amber-500">
                                    <span class="text-xs font-bold text-[#0B2D5B]">Set as Primary Deal (Syncs with 10s Quick Bar & Calculator)</span>
                                </label>
                            </div>

                            <div class="flex gap-3 pt-2">
                                <button type="button" data-action="close-deal-modal" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl text-xs">
                                    Cancel
                                </button>
                                <button type="submit" class="flex-1 bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-black py-3.5 px-6 rounded-xl shadow-lg text-sm flex items-center justify-center gap-2">
                                    <i class="fa-solid fa-cloud-arrow-up"></i>
                                    <span>Save & Publish Special Deal</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- MODAL: ADD / EDIT UMRAH PACKAGE                                -->
                <!-- ============================================================== -->
                <div id="pkgCrudModal" class="fixed inset-0 z-[85] hidden bg-[#071E3E]/80 backdrop-blur-sm flex items-center justify-center p-4">
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
                            <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold py-3.5 rounded-xl shadow-lg mt-2">
                                Save Umrah Package
                            </button>
                        </form>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- MODAL: ADD / EDIT COUNTRY VISA SERVICE                         -->
                <!-- ============================================================== -->
                <div id="visaCrudModal" class="fixed inset-0 z-[85] hidden bg-[#071E3E]/80 backdrop-blur-sm flex items-center justify-center p-4">
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
                                    <input type="text" id="visaEditFlag" required placeholder="🇸🇦" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
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
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Image URL (Optional)</label>
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
                            <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold py-3.5 rounded-xl shadow-lg mt-2">
                                Save Country Visa
                            </button>
                        </form>
                    </div>
                </div>

                <!-- ============================================================== -->
                <!-- MODAL: RESET TO FLYER DEFAULTS CONFIRMATION                    -->
                <!-- ============================================================== -->
                <div id="resetConfirmModal" class="fixed inset-0 z-[90] hidden bg-[#071E3E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4 anim-scale-in">
                        <div class="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
                            <i class="fa-solid fa-rotate-left"></i>
                        </div>
                        <h3 class="text-xl font-black text-[#0B2D5B]">Reset to Original January Flyer Defaults?</h3>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            This will restore the Featured Umrah Price to <strong>PKR 232,000</strong>, dates to <strong>Jan 26 – Nov 10, 2026 (14 Nights)</strong>, and reset all Special Deals, calculator tiers, packages, visas, and contacts.
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

                <!-- ============================================================== -->
                <!-- MODAL: FIREBASE CLOUD CONFIGURATION                            -->
                <!-- ============================================================== -->
                <div id="firebaseConfigModal" class="fixed inset-0 z-[90] hidden bg-[#071E3E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 anim-scale-in">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <span class="text-[10px] font-bold uppercase text-[#0D8A9E]">Cloud Backend</span>
                                <h3 class="text-lg font-black text-[#0B2D5B]">Firebase Project Configuration</h3>
                            </div>
                            <button type="button" data-action="close-firebase-modal" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            By default, the app runs with instant real-time cross-tab synchronization. Paste your Firebase Web App JSON config below to connect directly to your live Google Firebase project.
                        </p>
                        <textarea id="firebaseConfigTextarea" rows="6" placeholder='{"apiKey": "AIza...", "authDomain": "...", "projectId": "...", "storageBucket": "..."}' class="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0D8A9E]"></textarea>
                        <div class="flex justify-between gap-3">
                            <button type="button" data-action="disconnect-firebase" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs">
                                Use Built-In Local Sync
                            </button>
                            <button type="button" data-action="save-firebase-config" class="bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold py-2.5 px-6 rounded-xl text-xs shadow">
                                Connect Firebase Cloud
                            </button>
                        </div>
                    </div>
                </div>
            `;
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
        }

        _updateAuthView() {
            const authView = this.container.querySelector("#adminAuthView");
            const dashView = this.container.querySelector("#adminDashboardView");
            const userLabel = this.container.querySelector("#adminActiveUserLabel");
            const modeBadge = this.container.querySelector("#dbModeBadge");

            if (!authView || !dashView) return;

            if (this.currentUser) {
                authView.classList.add("hidden");
                dashView.classList.remove("hidden");
                if (userLabel) {
                    userLabel.textContent = `Signed in as ${this.currentUser.displayName || this.currentUser.email}`;
                }
                if (modeBadge) {
                    modeBadge.innerHTML =
                        window.zakirDB.mode === "firebase"
                            ? `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Firebase Cloud`
                            : `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Sync`;
                }
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
                <option value="manager">Primary: ${escapeHtml(mgrName)} — ${escapeHtml(mgrWA)}</option>
                <option value="secondary">Secondary: ${escapeHtml(secName)} — ${escapeHtml(secWA)}</option>
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
            const s = (this.siteConfig && this.siteConfig.spotlight) || {};
            const badge = this.container.querySelector("#livePreviewPriceBadge");
            if (badge) {
                badge.textContent = `PKR ${formatPKR(s.startingPrice || 232000)} (${s.monthLabel || "January"})`;
            }
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

            setVal("#quickStartingPrice", s.startingPrice ?? 232000);
            setVal("#quickDepartureDate", s.departureDate ?? "Jan 26, 2026");
            setVal("#quickMonthLabel", s.monthLabel ?? "January");

            setVal("#spotMonthLabel", s.monthLabel ?? "January");
            setVal("#spotTitle", s.title ?? "UMRAH PACKAGE");
            setVal("#spotStartingPrice", s.startingPrice ?? 232000);
            setVal("#spotPriceUnit", s.priceUnit ?? "PER PERSON (SHARING)");
            setVal("#spotDepartureDate", s.departureDate ?? "Jan 26, 2026");
            setVal("#spotReturnDate", s.returnDate ?? "Nov 10, 2026");
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
            setVal("#contactOfficeHours", c.officeHours || "Monday to Saturday: 9:30 AM – 8:00 PM (Sunday Closed / WhatsApp Support Active)");
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

            const legacyBadges = ["Head Office: Blue Area, Islamabad", "Swat Head Office (Matta) • Islamabad Branch Office"];
            const aboutBadge = pContact.heroBadge && !legacyBadges.includes(pContact.heroBadge) ? pContact.heroBadge : "About Us • Our People • Contact";
            const aboutTitle = pContact.heroTitle && pContact.heroTitle !== "Contact Our Travel Desk" ? pContact.heroTitle : "Meet Zakir Travel & Tours";
            const aboutSubtitle =
                pContact.heroSubtitle && !/^We are always here to assist your spiritual journey/i.test(pContact.heroSubtitle)
                    ? pContact.heroSubtitle
                    : "Led from our Swat Matta Head Office with a branch in Islamabad, our dedicated team of visa, Umrah and ticketing professionals personally handles every file — from your first inquiry until you return home safely.";
            setVal("#contactHeroBadgeInput", aboutBadge);
            setVal("#contactHeroTitleInput", aboutTitle);
            setVal("#contactHeroSubtitleInput", aboutSubtitle);

            // About Us — Team Member Photos
            const teamPhotos = (this.siteConfig && this.siteConfig.teamPhotos) || {};
            TEAM_MEMBERS.forEach((m) => this._setTeamPhotoPreview(m.id, teamPhotos[m.id] || ""));

            this._updateLivePreviewBadges();
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
                            <div class="relative grid grid-cols-2 gap-1 bg-slate-900 h-40 overflow-hidden">
                                <div class="relative h-full overflow-hidden">
                                    <img src="${escapeHtml(deal.madinahImageUrl)}" onerror="this.src='https://placehold.co/600x400/0B2D5B/FFFFFF?text=Madinah'" class="w-full h-full object-cover opacity-90">
                                    <div class="absolute inset-0 bg-gradient-to-t from-[#071E3E]/90 via-transparent to-transparent"></div>
                                    <span class="absolute bottom-2 left-2.5 text-[10px] font-bold text-white">${escapeHtml(deal.leftFrameTitle || "Madinah")}</span>
                                </div>
                                <div class="relative h-full overflow-hidden">
                                    <img src="${escapeHtml(deal.makkahImageUrl)}" onerror="this.src='https://placehold.co/600x400/0D8A9E/FFFFFF?text=Makkah'" class="w-full h-full object-cover opacity-90">
                                    <div class="absolute inset-0 bg-gradient-to-t from-[#071E3E]/90 via-transparent to-transparent"></div>
                                    <span class="absolute bottom-2 right-2.5 text-[10px] font-bold text-white">${escapeHtml(deal.rightFrameTitle || "Makkah")}</span>
                                </div>

                                <!-- Top Left Status Badges -->
                                <div class="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                                    <span class="bg-[#071E3E]/90 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                                        Deal #${idx + 1}
                                    </span>
                                    ${
                                        deal.isPrimary
                                            ? `<span class="bg-amber-400 text-[#071E3E] text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                                                <i class="fa-solid fa-star"></i> Primary Flyer
                                               </span>`
                                            : ""
                                    }
                                    ${
                                        !deal.isActive
                                            ? `<span class="bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">Hidden</span>`
                                            : `<span class="bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">Live</span>`
                                    }
                                </div>

                                <!-- Center Price Shield -->
                                <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                    <div class="bg-gradient-to-b from-[#0B2D5B] via-[#0D8A9E] to-[#0B2D5B] text-white px-4 py-2 rounded-2xl border-2 border-white shadow-2xl text-center">
                                        <span class="text-[8px] font-bold uppercase tracking-widest text-sky-200 block">STARTING FROM</span>
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
                                    <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg ${srv.roundTrip !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 line-through"}">
                                        <i class="fa-solid fa-plane mr-1"></i>Round Trip
                                    </span>
                                    <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg ${srv.visa !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 line-through"}">
                                        <i class="fa-solid fa-passport mr-1"></i>Umrah Visa
                                    </span>
                                    <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg ${srv.hotel !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 line-through"}">
                                        <i class="fa-solid fa-hotel mr-1"></i>Hotel Stay
                                    </span>
                                    <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg ${srv.transport !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 line-through"}">
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
                                <button type="button" data-action="toggle-deal-active" data-id="${escapeHtml(deal.id)}" class="px-3 py-1.5 rounded-xl text-xs font-bold border ${deal.isActive ? "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50" : "bg-slate-200 text-slate-700 border-slate-300"}">
                                    ${deal.isActive ? "Visible" : "Hidden"}
                                </button>
                                ${
                                    !deal.isPrimary
                                        ? `<button type="button" data-action="set-primary-deal" data-id="${escapeHtml(deal.id)}" class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200" title="Set as Primary Deal">
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

        async saveAllPortalChanges() {
            const db = window.zakirDB;

            const startingPrice = Number(this.container.querySelector("#quickStartingPrice").value || this.container.querySelector("#spotStartingPrice").value);
            const sharingPrice = Number(this.container.querySelector("#rateSharing").value);
            const quadPrice = Number(this.container.querySelector("#rateQuad").value);
            const triplePrice = Number(this.container.querySelector("#rateTriple").value);
            const doublePrice = Number(this.container.querySelector("#rateDouble").value);

            if ([startingPrice, sharingPrice, quadPrice, triplePrice, doublePrice].some((p) => !p || p <= 0)) {
                this.showToast("All package and calculator prices must be greater than 0 PKR.", "error");
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

            const quickMonth = this.container.querySelector("#quickMonthLabel").value.trim();
            const quickDep = this.container.querySelector("#quickDepartureDate").value.trim();

            const getVal = (sel, fallback = "") => {
                const el = this.container.querySelector(sel);
                return el ? el.value.trim() : fallback;
            };

            const teamPhotoInputs = this.container.querySelectorAll("input[data-team-photo-key]");
            const teamPhotos = { ...((this.siteConfig && this.siteConfig.teamPhotos) || {}) };
            teamPhotoInputs.forEach((inp) => {
                teamPhotos[inp.getAttribute("data-team-photo-key")] = inp.value.trim();
            });

            await db.updateSiteConfig({
                teamPhotos,
                spotlight: {
                    monthLabel: quickMonth || getVal("#spotMonthLabel", "January"),
                    title: getVal("#spotTitle", "UMRAH PACKAGE") || "UMRAH PACKAGE",
                    startingPrice,
                    priceUnit: getVal("#spotPriceUnit", "PER PERSON (SHARING)") || "PER PERSON (SHARING)",
                    departureDate: quickDep || getVal("#spotDepartureDate", "Jan 26, 2026"),
                    returnDate: getVal("#spotReturnDate", "Nov 10, 2026") || "Nov 10, 2026",
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
                    officeHours: getVal("#contactOfficeHours", "Monday to Saturday: 9:30 AM – 8:00 PM (Sunday Closed / WhatsApp Support Active)"),
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
                    contact: {
                        heroBadge: getVal("#contactHeroBadgeInput"),
                        heroTitle: getVal("#contactHeroTitleInput"),
                        heroSubtitle: getVal("#contactHeroSubtitleInput")
                    }
                }
            });

            this.showToast("Saved & Pushed All Changes Live to Website!");
            return true;
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
                <div class="admin-card-hover bg-white rounded-3xl p-5 border ${pkg.isActive ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"} shadow-sm flex flex-col justify-between gap-4">
                    <div class="space-y-2">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5">
                                <span class="bg-[#0B2D5B] text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">#${idx + 1}</span>
                                <span class="bg-[#E6F6F8] text-[#0D8A9E] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">${escapeHtml(pkg.badgeText || "Package")}</span>
                                ${pkg.isFeatured ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-star mr-1"></i>Featured</span>` : ""}
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
                            <button type="button" data-action="toggle-pkg-active" data-id="${escapeHtml(pkg.id)}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${pkg.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"}">
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
                <div class="admin-card-hover bg-white rounded-3xl p-5 border ${v.isActive ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"} shadow-sm flex flex-col justify-between gap-4">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-start gap-3.5">
                            <div class="w-12 h-12 rounded-2xl bg-[#E6F6F8] text-2xl flex items-center justify-center shrink-0">
                                ${escapeHtml(v.flagEmoji || "🌍")}
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
                            <button type="button" data-action="toggle-visa-active" data-id="${escapeHtml(v.id)}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${v.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"}">
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

        _switchTab(tabName) {
            this.activeTab = tabName;
            this.container.querySelectorAll(".admin-tab-btn").forEach((btn) => {
                const isMatch = btn.getAttribute("data-tab") === tabName;
                const extraColSpan = btn.getAttribute("data-tab") === "contacts" ? " col-span-2 sm:col-span-1" : "";
                btn.className = isMatch
                    ? `admin-tab-btn bg-gradient-to-r from-[#0B2D5B] to-[#16437E] text-white font-extrabold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all${extraColSpan}`
                    : `admin-tab-btn text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm py-3 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all${extraColSpan}`;
            });

            ["spotlight", "umrah", "visas", "calculator", "contacts"].forEach((t) => {
                const panel = this.container.querySelector(`#admin-panel-${t}`);
                if (panel) {
                    panel.classList.toggle("hidden", t !== tabName);
                }
            });
        }

        _switchCrudSubtab(subtab) {
            if (subtab === "packages") {
                this._switchTab("umrah");
            } else if (subtab === "visas") {
                this._switchTab("visas");
            }
        }

        _bindGlobalEvents() {
            const db = window.zakirDB;

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
                    }
                });
            }

            // Sync Quick Update Bar with Calculator Tiers
            const quickPriceEl = this.container.querySelector("#quickStartingPrice");
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

            if (quickPriceEl) {
                quickPriceEl.addEventListener("input", () => {
                    if (spotPriceInput) spotPriceInput.value = quickPriceEl.value;
                    syncScaledInputs(quickPriceEl.value);
                });
            }
            if (autoScaleChk && quickPriceEl) {
                autoScaleChk.addEventListener("change", () => syncScaledInputs(quickPriceEl.value));
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

            // Quick Update Form Submit
            const quickForm = this.container.querySelector("#quickUpdateForm");
            if (quickForm) {
                quickForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    await this.saveAllPortalChanges();
                });
            }

            // Calculator & Media Form Submit
            const spotForm = this.container.querySelector("#spotlightAndCalcForm");
            if (spotForm) {
                spotForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    await this.saveAllPortalChanges();
                });
            }

            // Home, Umrah & Visa Page Content Forms Submit
            ["#homePageContentForm", "#umrahPageContentForm", "#visaPageContentForm"].forEach((formSel) => {
                const formEl = this.container.querySelector(formSel);
                if (formEl) {
                    formEl.addEventListener("submit", async (e) => {
                        e.preventDefault();
                        await this.saveAllPortalChanges();
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

                    try {
                        this.showToast("Uploading & optimizing image...", "warning");
                        const url = await db.uploadMediaFile(file);
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
                        this.showToast("Image ready! Click Save & Push to Website.");
                    } catch (err) {
                        this.showToast(err.message || "Failed to upload image.", "error");
                    }
                });
            });

            // About Us — Team Member Photo Uploads
            this.container.querySelectorAll("input[type='file'][data-team-photo-upload]").forEach((fileInput) => {
                fileInput.addEventListener("change", async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const memberId = fileInput.getAttribute("data-team-photo-upload");
                    try {
                        this.showToast("Uploading & optimizing team photo...", "warning");
                        const url = await db.uploadMediaFile(file, "zakir_team");
                        this._setTeamPhotoPreview(memberId, url);
                        this.showToast("Photo ready! Click Save & Push to Website.");
                    } catch (err) {
                        this.showToast(err.message || "Failed to upload photo.", "error");
                    } finally {
                        fileInput.value = "";
                    }
                });
            });
            this.container.querySelectorAll("[data-team-photo-remove]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    this._setTeamPhotoPreview(btn.getAttribute("data-team-photo-remove"), "");
                    this.showToast("Photo removed. Click Save & Push to Website.", "warning");
                });
            });

            // Special Deal Modal Image File Uploads
            this.container.querySelectorAll("input[type='file'][data-deal-upload]").forEach((fileInput) => {
                fileInput.addEventListener("change", async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const targetId = fileInput.getAttribute("data-deal-upload");
                    try {
                        this.showToast("Optimizing deal image...", "warning");
                        const url = await db.uploadMediaFile(file);
                        const inputEl = this.container.querySelector(`#${targetId}`);
                        if (inputEl) inputEl.value = url;
                        this.showToast("Deal image uploaded!");
                    } catch (err) {
                        this.showToast(err.message || "Image upload failed.", "error");
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

                    await db.saveSpecialDeal({
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
                    });

                    this.container.querySelector("#dealCrudModal").classList.add("hidden");
                    this.showToast("Special Flyer Deal Saved & Published Live!");
                });
            }

            // Tab 4 Contacts Form Submit
            const contactsForm = this.container.querySelector("#contactsForm");
            if (contactsForm) {
                contactsForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    await this.saveAllPortalChanges();
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

                    await db.saveUmrahPackage({
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
                    });

                    this.container.querySelector("#pkgCrudModal").classList.add("hidden");
                    this.showToast("Umrah Package Saved & Published Live!");
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

                    await db.saveVisaService({
                        id: this.container.querySelector("#visaEditId").value || undefined,
                        countryName: this.container.querySelector("#visaEditCountry").value.trim(),
                        flagEmoji: this.container.querySelector("#visaEditFlag").value.trim(),
                        visaType: this.container.querySelector("#visaEditType").value.trim(),
                        processingTime: this.container.querySelector("#visaEditTime").value.trim(),
                        pricePKR,
                        imageUrl: this.container.querySelector("#visaEditImage").value.trim(),
                        requirementsSummary: this.container.querySelector("#visaEditReqs").value.trim(),
                        isActive: this.container.querySelector("#visaEditActive").checked
                    });

                    this.container.querySelector("#visaCrudModal").classList.add("hidden");
                    this.showToast("Country Visa Saved & Published Live!");
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
                    await this.saveAllPortalChanges();
                } else if (action === "logout") {
                    await db.logout();
                    this.showToast("Admin session locked.", "warning");
                } else if (action === "close-drawer") {
                    await this.saveAllPortalChanges();
                    this.onCloseDrawer();
                } else if (action === "open-deal-modal") {
                    this._openDealModal(null);
                } else if (action === "close-deal-modal") {
                    this.container.querySelector("#dealCrudModal").classList.add("hidden");
                } else if (action === "edit-deal") {
                    const deal = this.specialDeals.find((d) => d.id === actionEl.getAttribute("data-id"));
                    if (deal) this._openDealModal(deal);
                } else if (action === "duplicate-deal") {
                    await db.duplicateSpecialDeal(actionEl.getAttribute("data-id"));
                    this.showToast("Special Flyer Deal cloned & published!");
                } else if (action === "set-primary-deal") {
                    const deal = this.specialDeals.find((d) => d.id === actionEl.getAttribute("data-id"));
                    if (deal) {
                        await db.saveSpecialDeal({ ...deal, isPrimary: true, isActive: true });
                        this.showToast(`"${deal.monthLabel}" set as Primary Deal!`);
                    }
                } else if (action === "toggle-deal-active") {
                    const deal = this.specialDeals.find((d) => d.id === actionEl.getAttribute("data-id"));
                    if (deal) {
                        await db.saveSpecialDeal({ ...deal, isActive: !deal.isActive });
                        this.showToast(`Special Deal ${!deal.isActive ? "shown" : "hidden"} live.`);
                    }
                } else if (action === "move-deal") {
                    await db.reorderSpecialDeal(
                        actionEl.getAttribute("data-id"),
                        actionEl.getAttribute("data-dir")
                    );
                } else if (action === "delete-deal") {
                    try {
                        await db.deleteSpecialDeal(actionEl.getAttribute("data-id"));
                        this.showToast("Special Flyer Deal deleted.", "warning");
                    } catch (err) {
                        this.showToast(err.message, "error");
                    }
                } else if (action === "quick-add-ramzan-deal") {
                    await db.saveSpecialDeal({
                        monthLabel: "Ramzan Ashra Special",
                        title: "RAMZAN UMRAH DEAL",
                        badgeTag: "Limited VIP Seats",
                        startingPrice: 315000,
                        priceUnit: "PER PERSON (SHARING)",
                        departureDate: "1st Ramzan 2026",
                        returnDate: "20th Ramzan / Eid",
                        duration: "20 Nights",
                        leftFrameTitle: "Madinah Munawwarah",
                        leftFrameBadge: "Markazia Walking Stay",
                        madinahHotel: "Al Eiman Royal / Similar (150m Markazia)",
                        madinahImageUrl:
                            "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80",
                        rightFrameTitle: "Makkah Mukarramah",
                        rightFrameBadge: "Near Haram Iftar Options",
                        makkahHotel: "Swissotel / Le Meridien Towers / Similar",
                        makkahImageUrl:
                            "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80",
                        servicesIncluded: { roundTrip: true, visa: true, hotel: true, transport: true },
                        isActive: true,
                        isPrimary: false
                    });
                    this.showToast("Ramzan Special Flyer Deal added & live on website!");
                } else if (action === "open-pkg-modal") {
                    this._openPkgModal(null);
                } else if (action === "close-pkg-modal") {
                    this.container.querySelector("#pkgCrudModal").classList.add("hidden");
                } else if (action === "edit-pkg") {
                    const pkg = this.packages.find((p) => p.id === actionEl.getAttribute("data-id"));
                    if (pkg) this._openPkgModal(pkg);
                } else if (action === "delete-pkg") {
                    await db.deleteUmrahPackage(actionEl.getAttribute("data-id"));
                    this.showToast("Package deleted.", "warning");
                } else if (action === "toggle-pkg-active") {
                    const pkg = this.packages.find((p) => p.id === actionEl.getAttribute("data-id"));
                    if (pkg) {
                        await db.saveUmrahPackage({ ...pkg, isActive: !pkg.isActive });
                        this.showToast(`Package ${!pkg.isActive ? "shown" : "hidden"} live.`);
                    }
                } else if (action === "move-pkg") {
                    await db.reorderUmrahPackage(
                        actionEl.getAttribute("data-id"),
                        actionEl.getAttribute("data-dir")
                    );
                } else if (action === "open-visa-modal") {
                    this._openVisaModal(null);
                } else if (action === "close-visa-modal") {
                    this.container.querySelector("#visaCrudModal").classList.add("hidden");
                } else if (action === "edit-visa") {
                    const visa = this.visas.find((v) => v.id === actionEl.getAttribute("data-id"));
                    if (visa) this._openVisaModal(visa);
                } else if (action === "delete-visa") {
                    await db.deleteVisaService(actionEl.getAttribute("data-id"));
                    this.showToast("Visa destination deleted.", "warning");
                } else if (action === "toggle-visa-active") {
                    const visa = this.visas.find((v) => v.id === actionEl.getAttribute("data-id"));
                    if (visa) {
                        await db.saveVisaService({ ...visa, isActive: !visa.isActive });
                        this.showToast(`Visa card ${!visa.isActive ? "shown" : "hidden"} live.`);
                    }
                } else if (action === "move-visa") {
                    await db.reorderVisaService(
                        actionEl.getAttribute("data-id"),
                        actionEl.getAttribute("data-dir")
                    );
                } else if (action === "reset-flyer-defaults") {
                    this.container.querySelector("#resetConfirmModal").classList.remove("hidden");
                } else if (action === "cancel-reset-modal") {
                    this.container.querySelector("#resetConfirmModal").classList.add("hidden");
                } else if (action === "confirm-reset-defaults") {
                    await db.resetToFlyerDefaults();
                    this.container.querySelector("#resetConfirmModal").classList.add("hidden");
                    this.showToast("Restored Original January Flyer Defaults (PKR 232,000)!");
                } else if (action === "open-firebase-modal") {
                    const existing = db.getFirebaseConfig();
                    this.container.querySelector("#firebaseConfigTextarea").value = existing
                        ? JSON.stringify(existing, null, 2)
                        : "";
                    this.container.querySelector("#firebaseConfigModal").classList.remove("hidden");
                } else if (action === "close-firebase-modal") {
                    this.container.querySelector("#firebaseConfigModal").classList.add("hidden");
                } else if (action === "save-firebase-config") {
                    try {
                        const raw = this.container.querySelector("#firebaseConfigTextarea").value.trim();
                        const parsed = JSON.parse(raw);
                        await db.saveFirebaseConfig(parsed);
                        this.container.querySelector("#firebaseConfigModal").classList.add("hidden");
                        this._updateAuthView();
                        this.showToast("Connected to Firebase Cloud!");
                    } catch (err) {
                        this.showToast("Invalid Firebase JSON config: " + err.message, "error");
                    }
                } else if (action === "disconnect-firebase") {
                    db.disconnectFirebaseConfig();
                    this.container.querySelector("#firebaseConfigModal").classList.add("hidden");
                    this._updateAuthView();
                    this.showToast("Switched to Built-In Real-Time Local Sync.");
                }
            });
        }

        _openDealModal(deal) {
            this.container.querySelector("#dealModalTitle").textContent = deal
                ? "Edit Special Flyer Deal"
                : "Create New Special Flyer Deal";
            this.container.querySelector("#dealEditId").value = (deal && deal.id) || "";
            this.container.querySelector("#dealEditMonth").value =
                (deal && deal.monthLabel) || "February & शाबान Special";
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

            this.container.querySelector("#dealCrudModal").classList.remove("hidden");
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

            this.container.querySelector("#pkgCrudModal").classList.remove("hidden");
        }

        _openVisaModal(visa) {
            this._switchCrudSubtab("visas");
            this.container.querySelector("#visaModalTitle").textContent = visa
                ? "Edit Country Visa"
                : "Add New Country Visa";
            this.container.querySelector("#visaEditId").value = (visa && visa.id) || "";
            this.container.querySelector("#visaEditCountry").value = (visa && visa.countryName) || "";
            this.container.querySelector("#visaEditFlag").value = (visa && visa.flagEmoji) || "🌍";
            this.container.querySelector("#visaEditType").value = (visa && visa.visaType) || "Tourist E-Visa";
            this.container.querySelector("#visaEditTime").value = (visa && visa.processingTime) || "3-5 Working Days";
            this.container.querySelector("#visaEditPrice").value =
                visa && visa.pricePKR !== undefined ? visa.pricePKR : 25000;
            this.container.querySelector("#visaEditImage").value = (visa && visa.imageUrl) || "";
            this.container.querySelector("#visaEditReqs").value =
                (visa && visa.requirementsSummary) || "Passport Scan, CNIC Copy, White Background Photo";
            this.container.querySelector("#visaEditActive").checked = visa ? Boolean(visa.isActive) : true;

            this.container.querySelector("#visaCrudModal").classList.remove("hidden");
        }
    }

    window.formatPKR = formatPKR;
    window.cleanWhatsAppDigits = cleanWhatsAppDigits;
    window.AdminPortalManager = AdminPortalManager;
})(window);
