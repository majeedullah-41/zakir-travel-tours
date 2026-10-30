/**
 * Zakir Travel & Tours - Mobile-First Admin Portal Controller
 * Renders and manages the complete Admin Portal (Auth, 10-Second Quick Update Bar,
 * 4 Management Tabs, CRUD modals, Toast notifications, Validation, and Reset to Defaults).
 * Can mount into a dedicated page (admin.html) or the protected #admin drawer on index.html.
 */

import { zakirDB, calculateScaledTiers } from "./firebase-db.js";

export function formatPKR(val) {
    const num = Number(val);
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-US");
}

export function cleanWhatsAppDigits(str) {
    return String(str || "").replace(/[^0-9]/g, "");
}

export class AdminPortalManager {
    constructor(containerEl, options = {}) {
        this.container = containerEl;
        this.isDrawer = Boolean(options.isDrawer);
        this.onCloseDrawer = options.onCloseDrawer || (() => {});

        this.activeTab = "spotlight"; // "spotlight" | "crud" | "media" | "contacts"
        this.activeCrudSubtab = "packages"; // "packages" | "visas"

        this.siteConfig = zakirDB.getLocalSiteConfig();
        this.packages = zakirDB.getLocalUmrahPackages();
        this.visas = zakirDB.getLocalVisaServices();
        this.currentUser = zakirDB.getCurrentUser();

        this._init();
    }

    _init() {
        this.renderShell();
        this._bindGlobalEvents();

        zakirDB.onAuthSnapshot((user) => {
            this.currentUser = user;
            this._updateAuthView();
        });

        zakirDB.onSiteConfigSnapshot((config) => {
            this.siteConfig = config;
            this._populateConfigFields();
            this._updateLivePreviewBadges();
        });

        zakirDB.onUmrahPackagesSnapshot((pkgs) => {
            this.packages = pkgs;
            this._renderPackagesList();
        });

        zakirDB.onVisaServicesSnapshot((visas) => {
            this.visas = visas;
            this._renderVisasList();
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

        toast.className = `${bgClass} text-white px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-bold transform transition-all duration-300 translate-y-2 opacity-0`;
        toast.innerHTML = `
            <i class="fa-solid ${iconClass} text-lg"></i>
            <span>${message}</span>
        `;
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
            <div id="adminToastContainer" class="fixed bottom-5 right-5 z-[90] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"></div>

            <!-- ============================================================== -->
            <!-- 1. AUTHENTICATION LOGIN SCREEN                                 -->
            <!-- ============================================================== -->
            <div id="adminAuthView" class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#071E3E] via-[#0B2D5B] to-[#0D8A9E]">
                <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-white/20">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-2xl bg-[#0B2D5B] text-white flex items-center justify-center font-black text-xl shadow">
                                Z
                            </div>
                            <div>
                                <span class="text-[11px] font-bold uppercase tracking-widest text-[#0D8A9E] block">Staff Control Center</span>
                                <h1 class="text-xl font-black text-[#0B2D5B]">Zakir Travel Admin</h1>
                            </div>
                        </div>
                        ${
                            this.isDrawer
                                ? `<button type="button" data-action="close-drawer" class="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center" title="Back to Website">
                                    <i class="fa-solid fa-xmark"></i>
                                   </button>`
                                : `<a href="index.html" class="text-xs font-bold text-[#0D8A9E] hover:underline flex items-center gap-1">
                                    <i class="fa-solid fa-arrow-left"></i> Website
                                   </a>`
                        }
                    </div>

                    <div class="bg-[#E6F6F8] border border-[#0D8A9E]/30 rounded-2xl p-3.5 mb-5 text-xs text-[#0B2D5B]">
                        <div class="font-extrabold flex items-center gap-1.5 mb-1">
                            <i class="fa-solid fa-bolt text-[#0D8A9E]"></i>
                            <span>Mobile 10-Second Quick Portal</span>
                        </div>
                        <p class="text-slate-600 leading-relaxed">
                            Sign in as <strong>Inam Khan</strong> or <strong>Sadiq Ullah</strong> to update Umrah prices, dates, packages, visas, and WhatsApp routing live.
                        </p>
                        <div class="flex flex-wrap gap-2 mt-2.5">
                            <button type="button" data-action="quick-fill-login" data-email="inam@zakirtravels.com" data-pass="Zakir2026!" class="bg-white hover:bg-[#0B2D5B] hover:text-white text-[#0B2D5B] border border-[#0B2D5B]/20 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors">
                                <i class="fa-solid fa-user-tie mr-1"></i>Fill Inam Khan
                            </button>
                            <button type="button" data-action="quick-fill-login" data-email="sadiq@zakirtravels.com" data-pass="Zakir2026!" class="bg-white hover:bg-[#0D8A9E] hover:text-white text-[#0D8A9E] border border-[#0D8A9E]/20 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors">
                                <i class="fa-solid fa-user-check mr-1"></i>Fill Sadiq Ullah
                            </button>
                        </div>
                    </div>

                    <form id="adminLoginForm" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Staff Email Address</label>
                            <input type="email" id="adminLoginEmail" required value="inam@zakirtravels.com" placeholder="inam@zakirtravels.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#0D8A9E]">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
                            <input type="password" id="adminLoginPassword" required value="Zakir2026!" placeholder="••••••••" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#0D8A9E]">
                        </div>
                        <div id="adminLoginError" class="hidden text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3"></div>
                        <button type="submit" class="w-full bg-gradient-to-r from-[#0B2D5B] to-[#0D8A9E] hover:opacity-95 text-white font-extrabold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-unlock-keyhole"></i>
                            <span>Unlock Admin Portal</span>
                        </button>
                    </form>
                </div>
            </div>

            <!-- ============================================================== -->
            <!-- 2. AUTHENTICATED MOBILE-FIRST ADMIN DASHBOARD                  -->
            <!-- ============================================================== -->
            <div id="adminDashboardView" class="hidden min-h-screen bg-slate-100 pb-24">
                
                <!-- Sticky Top Admin Bar with Live Preview Badge & Lock Button -->
                <header class="sticky top-0 z-40 bg-[#0B2D5B] text-white shadow-lg border-b border-white/10">
                    <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-[#0D8A9E] flex items-center justify-center font-black text-lg shadow">
                                Z
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h1 class="font-black text-base sm:text-lg leading-none">Zakir Admin Portal</h1>
                                    <span id="dbModeBadge" class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                        Live Sync
                                    </span>
                                </div>
                                <p id="adminActiveUserLabel" class="text-[11px] text-slate-300 mt-0.5">Logged in as Inam Khan</p>
                            </div>
                        </div>

                        <!-- Live Price Preview Pill & Action Buttons -->
                        <div class="flex items-center gap-2 sm:gap-3 ml-auto">
                            <div class="bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                <div class="text-left">
                                    <span class="text-[9px] uppercase tracking-wider text-sky-200 block leading-none">Live Featured Price</span>
                                    <span id="livePreviewPriceBadge" class="text-xs sm:text-sm font-black text-white">PKR 232,000</span>
                                </div>
                            </div>

                            ${
                                this.isDrawer
                                    ? `<button type="button" data-action="close-drawer" class="bg-[#0D8A9E] hover:bg-[#096979] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow">
                                        <i class="fa-solid fa-eye"></i>
                                        <span class="hidden sm:inline">View Live Page</span>
                                       </button>`
                                    : `<a href="index.html" class="bg-[#0D8A9E] hover:bg-[#096979] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow">
                                        <i class="fa-solid fa-eye"></i>
                                        <span class="hidden sm:inline">Live Website</span>
                                       </a>`
                            }

                            <button type="button" data-action="logout" class="bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold px-3 py-2.5 rounded-xl flex items-center gap-1.5 shadow" title="Lock / Logout">
                                <i class="fa-solid fa-lock"></i>
                                <span class="hidden sm:inline">Lock</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main class="max-w-6xl mx-auto px-4 pt-5 space-y-6">

                    <!-- ========================================================== -->
                    <!-- TOP "10-SECOND QUICK UPDATE" BAR (MOBILE PRIORITY)         -->
                    <!-- ========================================================== -->
                    <section class="bg-gradient-to-r from-[#0B2D5B] via-[#16437E] to-[#0D8A9E] rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-white/15 relative overflow-hidden">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div class="flex items-center gap-2">
                                <span class="bg-amber-400 text-[#0B2D5B] text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <i class="fa-solid fa-bolt"></i> 10-Second Quick Update
                                </span>
                                <h2 class="text-base sm:text-lg font-extrabold">Instant Mobile Flyer Rate Updater</h2>
                            </div>
                            <span id="quickUpdateTierHint" class="text-[11px] text-sky-200 font-medium">
                                <i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Auto-scales Quad, Triple & Double tiers
                            </span>
                        </div>

                        <form id="quickUpdateForm" class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            <div class="sm:col-span-4">
                                <label class="block text-[11px] font-bold uppercase tracking-wider text-sky-200 mb-1">
                                    Featured Starting Price (PKR)
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
                                    Month Label
                                </label>
                                <input type="text" id="quickMonthLabel" required placeholder="e.g. Ramzan"
                                    class="w-full bg-white text-[#0B2D5B] font-extrabold text-sm rounded-xl px-3.5 py-3.5 focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-inner">
                            </div>

                            <div class="sm:col-span-3">
                                <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="fa-solid fa-cloud-arrow-up text-base"></i>
                                    <span>Publish Live Now</span>
                                </button>
                            </div>
                        </form>
                    </section>

                    <!-- ========================================================== -->
                    <!-- 4 ORGANIZED MANAGEMENT TABS NAVIGATION                     -->
                    <!-- ========================================================== -->
                    <nav class="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                        <button type="button" data-tab="spotlight" class="admin-tab-btn bg-[#0B2D5B] text-white font-extrabold text-xs sm:text-sm py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                            <i class="fa-solid fa-kaaba text-[#15B2CB]"></i>
                            <span>1. Spotlight & Calc</span>
                        </button>
                        <button type="button" data-tab="crud" class="admin-tab-btn text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                            <i class="fa-solid fa-box-open text-[#0D8A9E]"></i>
                            <span>2. Packages & Visas</span>
                        </button>
                        <button type="button" data-tab="media" class="admin-tab-btn text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                            <i class="fa-solid fa-images text-[#0D8A9E]"></i>
                            <span>3. Media & Flyer</span>
                        </button>
                        <button type="button" data-tab="contacts" class="admin-tab-btn text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                            <i class="fa-brands fa-whatsapp text-emerald-600"></i>
                            <span>4. Contacts & Routing</span>
                        </button>
                    </nav>

                    <!-- ========================================================== -->
                    <!-- TAB 1: SPOTLIGHT & CALCULATOR TAB                          -->
                    <!-- ========================================================== -->
                    <div id="admin-panel-spotlight" class="admin-tab-panel space-y-6">
                        <form id="spotlightAndCalcForm" class="grid lg:grid-cols-12 gap-6">
                            
                            <!-- Left Card: Featured Umrah Spotlight Editor -->
                            <div class="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Hero & Flyer Section</span>
                                        <h3 class="text-lg font-black text-[#0B2D5B]">Featured Umrah Spotlight</h3>
                                    </div>
                                    <span class="bg-[#E6F6F8] text-[#0D8A9E] text-xs font-bold px-3 py-1 rounded-full">Main Flyer Card</span>
                                </div>

                                <div class="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Month / Season Label</label>
                                        <input type="text" id="spotMonthLabel" required placeholder="January" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Spotlight Heading Title</label>
                                        <input type="text" id="spotTitle" required placeholder="UMRAH PACKAGE" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Starting Price (PKR)</label>
                                        <input type="number" id="spotStartingPrice" min="1000" step="500" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-[#0D8A9E] focus:outline-none focus:border-[#0D8A9E]">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Price Unit Subtitle</label>
                                        <input type="text" id="spotPriceUnit" required placeholder="PER PERSON (SHARING)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Departure Date</label>
                                        <input type="text" id="spotDepartureDate" required placeholder="Jan 26, 2026" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Return Date / Schedule</label>
                                        <input type="text" id="spotReturnDate" required placeholder="Nov 10, 2026" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                    </div>
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Package Duration</label>
                                        <input type="text" id="spotDuration" required placeholder="14 Nights" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                    </div>
                                </div>

                                <!-- Included Services Checkboxes -->
                                <div class="pt-2">
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-2.5">Included Services Badges (Toggle on Spotlight)</label>
                                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <label class="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-[#0D8A9E]">
                                            <input type="checkbox" id="srvRoundTrip" class="w-4 h-4 accent-[#0D8A9E] rounded">
                                            <span class="text-xs font-bold text-[#0B2D5B]">Round Trip</span>
                                        </label>
                                        <label class="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-[#0D8A9E]">
                                            <input type="checkbox" id="srvVisa" class="w-4 h-4 accent-[#0D8A9E] rounded">
                                            <span class="text-xs font-bold text-[#0B2D5B]">Umrah Visa</span>
                                        </label>
                                        <label class="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-[#0D8A9E]">
                                            <input type="checkbox" id="srvHotel" class="w-4 h-4 accent-[#0D8A9E] rounded">
                                            <span class="text-xs font-bold text-[#0B2D5B]">Hotel Stay</span>
                                        </label>
                                        <label class="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-[#0D8A9E]">
                                            <input type="checkbox" id="srvTransport" class="w-4 h-4 accent-[#0D8A9E] rounded">
                                            <span class="text-xs font-bold text-[#0B2D5B]">Transport</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Card: Calculator Tier Pricing & Auto-Scale -->
                            <div class="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-5">
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div>
                                            <span class="text-[11px] font-bold uppercase tracking-wider text-[#0D8A9E]">Dynamic Estimator Math</span>
                                            <h3 class="text-lg font-black text-[#0B2D5B]">Calculator Room Tier Rates</h3>
                                        </div>
                                        <i class="fa-solid fa-calculator text-2xl text-[#0D8A9E]"></i>
                                    </div>

                                    <!-- Auto-scale toggle -->
                                    <label class="flex items-start gap-3 bg-[#E6F6F8]/70 border border-[#0D8A9E]/30 rounded-2xl p-3.5 cursor-pointer">
                                        <input type="checkbox" id="calcAutoScaleToggle" class="w-5 h-5 accent-[#0B2D5B] mt-0.5 rounded">
                                        <div>
                                            <span class="text-xs font-extrabold text-[#0B2D5B] block">Auto-scale tiers from base price</span>
                                            <span class="text-[11px] text-slate-600">Automatically calculates Sharing, Quad (+16k), Triple (+36k), and Double (+63k) when Starting Price changes.</span>
                                        </div>
                                    </label>

                                    <div class="space-y-3">
                                        <div>
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Sharing Room Rate (PKR / Person)</label>
                                            <input type="number" id="rateSharing" min="1000" step="500" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Quad Room Rate (4 Bed - PKR / Person)</label>
                                            <input type="number" id="rateQuad" min="1000" step="500" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Triple Room Rate (3 Bed - PKR / Person)</label>
                                            <input type="number" id="rateTriple" min="1000" step="500" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Double / Couple Room Rate (2 Bed - PKR / Person)</label>
                                            <input type="number" id="rateDouble" min="1000" step="500" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-[#0B2D5B] focus:outline-none focus:border-[#0D8A9E]">
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                    <span>Save Spotlight & Calculator Rates</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- ========================================================== -->
                    <!-- TAB 2: PACKAGES & VISAS (CRUD) TAB                         -->
                    <!-- ========================================================== -->
                    <div id="admin-panel-crud" class="admin-tab-panel hidden space-y-6">
                        
                        <!-- Sub-toggle between Umrah Packages and Visa Services -->
                        <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div class="flex gap-2">
                                <button type="button" data-crud-subtab="packages" class="crud-subtab-btn bg-[#0B2D5B] text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all">
                                    <i class="fa-solid fa-kaaba mr-1.5"></i>Umrah Packages
                                </button>
                                <button type="button" data-crud-subtab="visas" class="crud-subtab-btn bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all">
                                    <i class="fa-solid fa-passport mr-1.5"></i>Country Visa Cards
                                </button>
                            </div>

                            <div class="flex gap-2">
                                <button type="button" data-action="open-pkg-modal" class="bg-[#0D8A9E] hover:bg-[#096979] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5">
                                    <i class="fa-solid fa-plus"></i> Add Umrah Package
                                </button>
                                <button type="button" data-action="open-visa-modal" class="bg-[#0B2D5B] hover:bg-[#16437E] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5">
                                    <i class="fa-solid fa-plus"></i> Add Country Visa
                                </button>
                            </div>
                        </div>

                        <!-- Umrah Packages List -->
                        <div id="crudPackagesContainer" class="space-y-3"></div>

                        <!-- Country Visas List -->
                        <div id="crudVisasContainer" class="hidden space-y-3"></div>
                    </div>

                    <!-- ========================================================== -->
                    <!-- TAB 3: MEDIA & FLYER UPLOADER TAB                          -->
                    <!-- ========================================================== -->
                    <div id="admin-panel-media" class="admin-tab-panel hidden space-y-6">
                        <form id="mediaForm" class="grid md:grid-cols-3 gap-6">
                            
                            <!-- 1. Madinah Spotlight Frame -->
                            <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
                                <div class="space-y-3">
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-[#0D8A9E] bg-[#E6F6F8] px-2.5 py-1 rounded-full">Left Frame</span>
                                    <h3 class="text-base font-black text-[#0B2D5B]">Madinah Munawwarah Image</h3>
                                    <div class="h-44 rounded-2xl overflow-hidden border-2 border-[#0D8A9E] bg-slate-100 relative">
                                        <img id="previewMadinahImg" src="" alt="Madinah Preview" class="w-full h-full object-cover">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Paste Image URL</label>
                                        <input type="text" id="inputMadinahUrl" placeholder="https://..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0D8A9E]">
                                    </div>
                                </div>
                                <div>
                                    <label class="w-full bg-slate-100 hover:bg-slate-200 text-[#0B2D5B] font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors">
                                        <i class="fa-solid fa-camera"></i>
                                        <span>Upload from Phone / PC</span>
                                        <input type="file" accept="image/*" data-upload-target="inputMadinahUrl" data-preview-target="previewMadinahImg" class="hidden">
                                    </label>
                                </div>
                            </div>

                            <!-- 2. Makkah Spotlight Frame -->
                            <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
                                <div class="space-y-3">
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-[#0B2D5B] bg-slate-100 px-2.5 py-1 rounded-full">Right Frame</span>
                                    <h3 class="text-base font-black text-[#0B2D5B]">Makkah Mukarramah Image</h3>
                                    <div class="h-44 rounded-2xl overflow-hidden border-2 border-[#0B2D5B] bg-slate-100 relative">
                                        <img id="previewMakkahImg" src="" alt="Makkah Preview" class="w-full h-full object-cover">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Paste Image URL</label>
                                        <input type="text" id="inputMakkahUrl" placeholder="https://..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0D8A9E]">
                                    </div>
                                </div>
                                <div>
                                    <label class="w-full bg-slate-100 hover:bg-slate-200 text-[#0B2D5B] font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors">
                                        <i class="fa-solid fa-camera"></i>
                                        <span>Upload from Phone / PC</span>
                                        <input type="file" accept="image/*" data-upload-target="inputMakkahUrl" data-preview-target="previewMakkahImg" class="hidden">
                                    </label>
                                </div>
                            </div>

                            <!-- 3. Promotional Monthly WhatsApp Flyer -->
                            <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
                                <div class="space-y-3">
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">Monthly Flyer Popup</span>
                                    <h3 class="text-base font-black text-[#0B2D5B]">Promotional Flyer Image</h3>
                                    <div class="h-44 rounded-2xl overflow-hidden border-2 border-dashed border-[#0D8A9E] bg-slate-50 flex items-center justify-center relative">
                                        <img id="previewFlyerImg" src="" alt="Flyer Preview" class="w-full h-full object-cover hidden">
                                        <div id="previewFlyerPlaceholder" class="text-center p-4 text-xs text-slate-500">
                                            <i class="fa-solid fa-file-image text-2xl text-[#0D8A9E] mb-1 block"></i>
                                            Auto-generated live digital flyer active (or upload custom flyer image)
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Custom Flyer Image URL (Optional)</label>
                                        <input type="text" id="inputFlyerUrl" placeholder="Leave blank for live digital flyer" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0D8A9E]">
                                    </div>
                                    <label class="flex items-center gap-2 pt-1 cursor-pointer">
                                        <input type="checkbox" id="chkShowFlyerButton" class="w-4 h-4 accent-[#0D8A9E] rounded">
                                        <span class="text-xs font-bold text-[#0B2D5B]">Show "View Latest Flyer" modal button on homepage</span>
                                    </label>
                                </div>
                                <div class="space-y-2">
                                    <label class="w-full bg-slate-100 hover:bg-slate-200 text-[#0B2D5B] font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors">
                                        <i class="fa-solid fa-upload"></i>
                                        <span>Upload Monthly Flyer</span>
                                        <input type="file" accept="image/*" data-upload-target="inputFlyerUrl" data-preview-target="previewFlyerImg" class="hidden">
                                    </label>
                                </div>
                            </div>

                            <div class="md:col-span-3 flex justify-end">
                                <button type="submit" class="w-full sm:w-auto bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="fa-solid fa-cloud-arrow-up text-[#15B2CB]"></i>
                                    <span>Save & Publish Media Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- ========================================================== -->
                    <!-- TAB 4: CONTACTS & WHATSAPP ROUTING TAB                     -->
                    <!-- ========================================================== -->
                    <div id="admin-panel-contacts" class="admin-tab-panel hidden space-y-6">
                        <form id="contactsForm" class="grid lg:grid-cols-12 gap-6">
                            
                            <!-- Left Column: Active WhatsApp Lead Routing + Staff Numbers -->
                            <div class="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
                                <div class="border-b border-slate-100 pb-4">
                                    <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Instant Lead Distribution</span>
                                    <h3 class="text-lg font-black text-[#0B2D5B]">Active WhatsApp Booking Routing</h3>
                                    <p class="text-xs text-slate-500 mt-0.5">Choose which staff member receives automated inquiries from the Hero Widget, Umrah Calculator, and Visa/Package CTA buttons.</p>
                                </div>

                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 mb-2">Route Website Booking Inquiries To:</label>
                                    <select id="contactActiveRouting" class="w-full bg-emerald-50 border-2 border-emerald-500 rounded-2xl px-4 py-3.5 text-sm font-black text-[#0B2D5B] focus:outline-none">
                                        <option value="923490558345">Inam Khan (Manager) — 923490558345</option>
                                        <option value="923434159182">Sadiq Ullah — 923434159182</option>
                                    </select>
                                </div>

                                <!-- Primary Contact: Inam Khan -->
                                <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                                    <div class="text-xs font-black uppercase text-[#0B2D5B] flex items-center gap-1.5">
                                        <i class="fa-solid fa-user-tie text-[#0D8A9E]"></i> Primary Contact (Manager)
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
                                    <div class="text-xs font-black uppercase text-[#0B2D5B] flex items-center gap-1.5">
                                        <i class="fa-solid fa-headset text-[#0D8A9E]"></i> Secondary Contact (Consultant)
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
                            </div>

                            <!-- Right Column: Agency Branding, Office Address & Safety Reset -->
                            <div class="lg:col-span-5 space-y-6">
                                <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                                    <h3 class="text-lg font-black text-[#0B2D5B]">Agency Details & Address</h3>
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
                                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Islamabad Office Address</label>
                                        <textarea id="contactOfficeAddress" rows="2" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#0B2D5B]"></textarea>
                                    </div>
                                    <button type="submit" class="w-full bg-[#0B2D5B] hover:bg-[#16437E] text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                        <i class="fa-solid fa-floppy-disk text-[#15B2CB]"></i>
                                        <span>Save Contacts & Routing</span>
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
                                        Made a mistake while editing? Restore all prices, dates, packages, visas, and contacts back to the original <strong>January Flyer Defaults (PKR 232,000)</strong>.
                                    </p>
                                    <div class="flex flex-col sm:flex-row gap-2.5">
                                        <button type="button" data-action="reset-flyer-defaults" class="flex-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-extrabold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2">
                                            <i class="fa-solid fa-rotate-left"></i>
                                            <span>Reset to Original January Flyer Defaults</span>
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
            <!-- MODAL: ADD / EDIT UMRAH PACKAGE                                -->
            <!-- ============================================================== -->
            <div id="pkgCrudModal" class="fixed inset-0 z-[80] hidden bg-[#071E3E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
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
            <div id="visaCrudModal" class="fixed inset-0 z-[80] hidden bg-[#071E3E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
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
            <div id="resetConfirmModal" class="fixed inset-0 z-[85] hidden bg-[#071E3E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
                    <div class="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
                        <i class="fa-solid fa-rotate-left"></i>
                    </div>
                    <h3 class="text-xl font-black text-[#0B2D5B]">Reset to Original January Flyer Defaults?</h3>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        This will restore the Featured Umrah Price to <strong>PKR 232,000</strong>, dates to <strong>Jan 26 – Nov 10, 2026 (14 Nights)</strong>, and reset all calculator tiers, packages, visas, and contacts to the original flyer settings.
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
            <div id="firebaseConfigModal" class="fixed inset-0 z-[85] hidden bg-[#071E3E]/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
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
                        By default, the app runs with instant real-time cross-tab synchronization. Paste your Firebase Web App JSON config below to connect directly to your live Google Firebase project (Firestore, Auth & Storage).
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
                modeBadge.textContent = zakirDB.mode === "firebase" ? "Firebase Cloud" : "Real-Time Sync";
            }
        } else {
            authView.classList.remove("hidden");
            dashView.classList.add("hidden");
        }
    }

    _updateLivePreviewBadges() {
        const s = this.siteConfig?.spotlight || {};
        const c = this.siteConfig?.contacts || {};
        const badge = this.container.querySelector("#livePreviewPriceBadge");
        if (badge) {
            badge.textContent = `PKR ${formatPKR(s.startingPrice || 232000)} (${s.monthLabel || "January"})`;
        }

        // Update routing select options with current staff names/numbers
        const routingSelect = this.container.querySelector("#contactActiveRouting");
        if (routingSelect && c.managerWhatsApp && c.secondaryWhatsApp) {
            const currentVal = c.activeBookingWhatsApp || c.managerWhatsApp;
            routingSelect.innerHTML = `
                <option value="${cleanWhatsAppDigits(c.managerWhatsApp)}">${c.managerName || "Inam Khan"} — ${cleanWhatsAppDigits(c.managerWhatsApp)}</option>
                <option value="${cleanWhatsAppDigits(c.secondaryWhatsApp)}">${c.secondaryName || "Sadiq Ullah"} — ${cleanWhatsAppDigits(c.secondaryWhatsApp)}</option>
            `;
            routingSelect.value = cleanWhatsAppDigits(currentVal);
        }
    }

    _populateConfigFields() {
        const s = this.siteConfig?.spotlight || {};
        const r = this.siteConfig?.calculatorRates || {};
        const c = this.siteConfig?.contacts || {};
        const srv = s.servicesIncluded || {};

        const setVal = (sel, val) => {
            const el = this.container.querySelector(sel);
            if (el && document.activeElement !== el) {
                el.value = val ?? "";
            }
        };
        const setChk = (sel, val) => {
            const el = this.container.querySelector(sel);
            if (el) el.checked = Boolean(val);
        };

        // 10-Second Quick Update Bar
        setVal("#quickStartingPrice", s.startingPrice ?? 232000);
        setVal("#quickDepartureDate", s.departureDate ?? "Jan 26, 2026");
        setVal("#quickMonthLabel", s.monthLabel ?? "January");

        // Tab 1: Spotlight & Calculator
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

        // Tab 3: Media & Flyer
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

        // Tab 4: Contacts & Routing
        setVal("#contactAgencyName", c.agencyName || "Zakir Travel & Tours");
        setVal("#contactTagline1", c.taglinePrimary || "Your Journey Our Priority");
        setVal("#contactTagline2", c.taglineSecondary || "Your Journey Our Responsibility");
        setVal("#contactManagerName", c.managerName || "Inam Khan (Manager)");
        setVal("#contactManagerPhone", c.managerPhone || "+92 349 0558345");
        setVal("#contactManagerWA", c.managerWhatsApp || "923490558345");
        setVal("#contactSecondaryName", c.secondaryName || "Sadiq Ullah");
        setVal("#contactSecondaryPhone", c.secondaryPhone || "+92 343 4159182");
        setVal("#contactSecondaryWA", c.secondaryWhatsApp || "923434159182");
        setVal("#contactOfficeAddress", c.officeAddress || "");
        this._updateLivePreviewBadges();
    }

    _renderPackagesList() {
        const wrap = this.container.querySelector("#crudPackagesContainer");
        if (!wrap) return;

        if (!this.packages.length) {
            wrap.innerHTML = `<div class="bg-white rounded-2xl p-8 text-center text-slate-500 text-sm">No Umrah packages found. Click "Add Umrah Package" to create one.</div>`;
            return;
        }

        wrap.innerHTML = this.packages
            .map(
                (pkg, idx) => `
            <div class="bg-white rounded-2xl p-4 sm:p-5 border ${pkg.isActive ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"} shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="bg-[#0B2D5B] text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">#${idx + 1}</span>
                        <span class="bg-[#E6F6F8] text-[#0D8A9E] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">${pkg.badgeText || "Package"}</span>
                        ${pkg.isFeatured ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-star mr-1"></i>Featured</span>` : ""}
                        ${!pkg.isActive ? `<span class="bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">Hidden</span>` : ""}
                    </div>
                    <h4 class="text-base font-black text-[#0B2D5B]">${pkg.title}</h4>
                    <div class="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span><strong class="text-[#0D8A9E]">PKR ${formatPKR(pkg.price)}</strong> (${pkg.roomType})</span>
                        <span><i class="fa-regular fa-calendar mr-1"></i>${pkg.departureDate}</span>
                        <span><i class="fa-regular fa-clock mr-1"></i>${pkg.duration}</span>
                        <span><i class="fa-solid fa-hotel mr-1"></i>Makkah: ${pkg.makkahHotelDist}</span>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    <button type="button" data-action="move-pkg" data-id="${pkg.id}" data-dir="up" ${idx === 0 ? "disabled" : ""} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs" title="Move Up">
                        <i class="fa-solid fa-arrow-up"></i>
                    </button>
                    <button type="button" data-action="move-pkg" data-id="${pkg.id}" data-dir="down" ${idx === this.packages.length - 1 ? "disabled" : ""} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs" title="Move Down">
                        <i class="fa-solid fa-arrow-down"></i>
                    </button>
                    <button type="button" data-action="toggle-pkg-active" data-id="${pkg.id}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${pkg.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"}">
                        ${pkg.isActive ? "Active" : "Hidden"}
                    </button>
                    <button type="button" data-action="edit-pkg" data-id="${pkg.id}" class="px-3 py-1.5 rounded-lg bg-[#E6F6F8] text-[#0B2D5B] hover:bg-[#0D8A9E] hover:text-white text-xs font-bold transition-colors">
                        <i class="fa-solid fa-pen mr-1"></i>Edit
                    </button>
                    <button type="button" data-action="delete-pkg" data-id="${pkg.id}" class="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center text-xs transition-colors" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
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
            wrap.innerHTML = `<div class="bg-white rounded-2xl p-8 text-center text-slate-500 text-sm">No Visa services found. Click "Add Country Visa" to create one.</div>`;
            return;
        }

        wrap.innerHTML = this.visas
            .map(
                (v, idx) => `
            <div class="bg-white rounded-2xl p-4 sm:p-5 border ${v.isActive ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"} shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-start gap-3.5">
                    <div class="w-12 h-12 rounded-2xl bg-[#E6F6F8] text-2xl flex items-center justify-center shrink-0">
                        ${v.flagEmoji || "🌍"}
                    </div>
                    <div class="space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <h4 class="text-base font-black text-[#0B2D5B]">${v.countryName}</h4>
                            <span class="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">${v.visaType}</span>
                            ${!v.isActive ? `<span class="bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">Hidden</span>` : ""}
                        </div>
                        <div class="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                            <span>Fee: <strong class="text-[#0D8A9E]">PKR ${formatPKR(v.pricePKR)}</strong></span>
                            <span><i class="fa-regular fa-clock mr-1"></i>${v.processingTime}</span>
                        </div>
                        <p class="text-[11px] text-slate-500">${v.requirementsSummary}</p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    <button type="button" data-action="move-visa" data-id="${v.id}" data-dir="up" ${idx === 0 ? "disabled" : ""} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs" title="Move Up">
                        <i class="fa-solid fa-arrow-up"></i>
                    </button>
                    <button type="button" data-action="move-visa" data-id="${v.id}" data-dir="down" ${idx === this.visas.length - 1 ? "disabled" : ""} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center text-xs" title="Move Down">
                        <i class="fa-solid fa-arrow-down"></i>
                    </button>
                    <button type="button" data-action="toggle-visa-active" data-id="${v.id}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${v.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"}">
                        ${v.isActive ? "Active" : "Hidden"}
                    </button>
                    <button type="button" data-action="edit-visa" data-id="${v.id}" class="px-3 py-1.5 rounded-lg bg-[#E6F6F8] text-[#0B2D5B] hover:bg-[#0D8A9E] hover:text-white text-xs font-bold transition-colors">
                        <i class="fa-solid fa-pen mr-1"></i>Edit
                    </button>
                    <button type="button" data-action="delete-visa" data-id="${v.id}" class="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center text-xs transition-colors" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
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
            btn.className = isMatch
                ? "admin-tab-btn bg-[#0B2D5B] text-white font-extrabold text-xs sm:text-sm py-3 px-3 rounded-xl flex items-center justify-center gap-2 shadow transition-all"
                : "admin-tab-btn text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition-all";
        });

        ["spotlight", "crud", "media", "contacts"].forEach((t) => {
            const panel = this.container.querySelector(`#admin-panel-${t}`);
            if (panel) {
                panel.classList.toggle("hidden", t !== tabName);
            }
        });
    }

    _switchCrudSubtab(subtab) {
        this.activeCrudSubtab = subtab;
        this.container.querySelectorAll(".crud-subtab-btn").forEach((btn) => {
            const isMatch = btn.getAttribute("data-crud-subtab") === subtab;
            btn.className = isMatch
                ? "crud-subtab-btn bg-[#0B2D5B] text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all"
                : "crud-subtab-btn bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all";
        });

        const pkgWrap = this.container.querySelector("#crudPackagesContainer");
        const visaWrap = this.container.querySelector("#crudVisasContainer");
        if (pkgWrap && visaWrap) {
            pkgWrap.classList.toggle("hidden", subtab !== "packages");
            visaWrap.classList.toggle("hidden", subtab !== "visas");
        }
    }

    _bindGlobalEvents() {
        // 1. Login Form Submit
        const loginForm = this.container.querySelector("#adminLoginForm");
        loginForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = this.container.querySelector("#adminLoginEmail").value;
            const pass = this.container.querySelector("#adminLoginPassword").value;
            const errEl = this.container.querySelector("#adminLoginError");
            try {
                errEl.classList.add("hidden");
                await zakirDB.login(email, pass);
                this.showToast("Welcome back! Admin Portal unlocked.");
            } catch (err) {
                errEl.textContent = err.message;
                errEl.classList.remove("hidden");
            }
        });

        // 2. 10-Second Quick Update Bar Submit
        const quickForm = this.container.querySelector("#quickUpdateForm");
        quickForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const startingPrice = Number(this.container.querySelector("#quickStartingPrice").value);
            const departureDate = this.container.querySelector("#quickDepartureDate").value.trim();
            const monthLabel = this.container.querySelector("#quickMonthLabel").value.trim();

            if (!startingPrice || startingPrice <= 0) {
                this.showToast("Price must be a positive PKR number!", "error");
                return;
            }
            if (!departureDate || !monthLabel) {
                this.showToast("Please fill in Departure Date and Month Label.", "error");
                return;
            }

            try {
                await zakirDB.publishQuickUpdate({ startingPrice, departureDate, monthLabel });
                this.showToast("Saved & Published Live! All tiers updated.");
            } catch (err) {
                this.showToast(err.message || "Update failed.", "error");
            }
        });

        // 3. Auto-Scale Live Preview when editing Starting Price in Tab 1
        const spotPriceInput = this.container.querySelector("#spotStartingPrice");
        const autoScaleChk = this.container.querySelector("#calcAutoScaleToggle");
        const syncScaledInputs = () => {
            if (autoScaleChk?.checked && spotPriceInput) {
                const scaled = calculateScaledTiers(spotPriceInput.value);
                this.container.querySelector("#rateSharing").value = scaled.sharingPrice;
                this.container.querySelector("#rateQuad").value = scaled.quadPrice;
                this.container.querySelector("#rateTriple").value = scaled.triplePrice;
                this.container.querySelector("#rateDouble").value = scaled.doublePrice;
            }
        };
        spotPriceInput?.addEventListener("input", syncScaledInputs);
        autoScaleChk?.addEventListener("change", syncScaledInputs);

        // 4. Tab 1: Spotlight & Calculator Form Submit
        const spotForm = this.container.querySelector("#spotlightAndCalcForm");
        spotForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const startingPrice = Number(this.container.querySelector("#spotStartingPrice").value);
            const sharingPrice = Number(this.container.querySelector("#rateSharing").value);
            const quadPrice = Number(this.container.querySelector("#rateQuad").value);
            const triplePrice = Number(this.container.querySelector("#rateTriple").value);
            const doublePrice = Number(this.container.querySelector("#rateDouble").value);

            if ([startingPrice, sharingPrice, quadPrice, triplePrice, doublePrice].some((p) => !p || p <= 0)) {
                this.showToast("All package and calculator prices must be greater than 0 PKR.", "error");
                return;
            }

            await zakirDB.updateSiteConfig({
                spotlight: {
                    monthLabel: this.container.querySelector("#spotMonthLabel").value.trim(),
                    title: this.container.querySelector("#spotTitle").value.trim(),
                    startingPrice,
                    priceUnit: this.container.querySelector("#spotPriceUnit").value.trim(),
                    departureDate: this.container.querySelector("#spotDepartureDate").value.trim(),
                    returnDate: this.container.querySelector("#spotReturnDate").value.trim(),
                    duration: this.container.querySelector("#spotDuration").value.trim(),
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
                    doublePrice
                }
            });

            this.showToast("Saved & Published Live!");
        });

        // 5. Tab 3: Media & Flyer Form Submit + File Uploads
        this.container.querySelectorAll("input[type='file'][data-upload-target]").forEach((fileInput) => {
            fileInput.addEventListener("change", async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const targetInputId = fileInput.getAttribute("data-upload-target");
                const previewImgId = fileInput.getAttribute("data-preview-target");

                try {
                    this.showToast("Processing & uploading image...", "warning");
                    const url = await zakirDB.uploadMediaFile(file);
                    const urlInput = this.container.querySelector(`#${targetInputId}`);
                    if (urlInput) urlInput.value = url;
                    const prevImg = this.container.querySelector(`#${previewImgId}`);
                    if (prevImg) {
                        prevImg.src = url;
                        prevImg.classList.remove("hidden");
                    }
                    if (previewImgId === "previewFlyerImg") {
                        this.container.querySelector("#previewFlyerPlaceholder")?.classList.add("hidden");
                    }
                    this.showToast("Image ready! Click Save & Publish Media Changes.");
                } catch (err) {
                    this.showToast(err.message || "Failed to upload image.", "error");
                }
            });
        });

        const mediaForm = this.container.querySelector("#mediaForm");
        mediaForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const madinahImageUrl = this.container.querySelector("#inputMadinahUrl").value.trim();
            const makkahImageUrl = this.container.querySelector("#inputMakkahUrl").value.trim();
            const promotionalFlyerUrl = this.container.querySelector("#inputFlyerUrl").value.trim();
            const showFlyerOnHomepage = this.container.querySelector("#chkShowFlyerButton").checked;

            await zakirDB.updateSiteConfig({
                spotlight: {
                    madinahImageUrl: madinahImageUrl || this.siteConfig.spotlight.madinahImageUrl,
                    makkahImageUrl: makkahImageUrl || this.siteConfig.spotlight.makkahImageUrl,
                    promotionalFlyerUrl,
                    showFlyerOnHomepage
                }
            });
            this.showToast("Media & Flyer Settings Saved & Published Live!");
        });

        // 6. Tab 4: Contacts & WhatsApp Routing Form Submit
        const contactsForm = this.container.querySelector("#contactsForm");
        contactsForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const managerPhone = this.container.querySelector("#contactManagerPhone").value.trim();
            const managerWhatsApp = cleanWhatsAppDigits(this.container.querySelector("#contactManagerWA").value);
            const secondaryPhone = this.container.querySelector("#contactSecondaryPhone").value.trim();
            const secondaryWhatsApp = cleanWhatsAppDigits(this.container.querySelector("#contactSecondaryWA").value);

            if (!managerPhone || !managerWhatsApp || !secondaryPhone || !secondaryWhatsApp) {
                this.showToast("Phone and WhatsApp numbers cannot be empty!", "error");
                return;
            }

            await zakirDB.updateSiteConfig({
                contacts: {
                    agencyName: this.container.querySelector("#contactAgencyName").value.trim(),
                    taglinePrimary: this.container.querySelector("#contactTagline1").value.trim(),
                    taglineSecondary: this.container.querySelector("#contactTagline2").value.trim(),
                    managerName: this.container.querySelector("#contactManagerName").value.trim(),
                    managerPhone,
                    managerWhatsApp,
                    secondaryName: this.container.querySelector("#contactSecondaryName").value.trim(),
                    secondaryPhone,
                    secondaryWhatsApp,
                    activeBookingWhatsApp: cleanWhatsAppDigits(this.container.querySelector("#contactActiveRouting").value),
                    officeAddress: this.container.querySelector("#contactOfficeAddress").value.trim()
                }
            });

            this.showToast("Contacts & WhatsApp Routing Published Live!");
        });

        // 7. Package Modal Submit
        const pkgForm = this.container.querySelector("#pkgCrudForm");
        pkgForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const price = Number(this.container.querySelector("#pkgEditPrice").value);
            if (!price || price <= 0) {
                this.showToast("Package price must be positive!", "error");
                return;
            }

            await zakirDB.saveUmrahPackage({
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

        // 8. Visa Modal Submit
        const visaForm = this.container.querySelector("#visaCrudForm");
        visaForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const pricePKR = Number(this.container.querySelector("#visaEditPrice").value);
            if (isNaN(pricePKR) || pricePKR < 0) {
                this.showToast("Visa price cannot be negative!", "error");
                return;
            }

            await zakirDB.saveVisaService({
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

        // 9. Delegated Click Actions
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

            if (action === "quick-fill-login") {
                this.container.querySelector("#adminLoginEmail").value = actionEl.getAttribute("data-email");
                this.container.querySelector("#adminLoginPassword").value = actionEl.getAttribute("data-pass");
            } else if (action === "logout") {
                await zakirDB.logout();
                this.showToast("Admin session locked.", "warning");
            } else if (action === "close-drawer") {
                this.onCloseDrawer();
            } else if (action === "open-pkg-modal") {
                this._openPkgModal(null);
            } else if (action === "close-pkg-modal") {
                this.container.querySelector("#pkgCrudModal").classList.add("hidden");
            } else if (action === "edit-pkg") {
                const pkg = this.packages.find((p) => p.id === actionEl.getAttribute("data-id"));
                if (pkg) this._openPkgModal(pkg);
            } else if (action === "delete-pkg") {
                const id = actionEl.getAttribute("data-id");
                await zakirDB.deleteUmrahPackage(id);
                this.showToast("Package deleted.", "warning");
            } else if (action === "toggle-pkg-active") {
                const pkg = this.packages.find((p) => p.id === actionEl.getAttribute("data-id"));
                if (pkg) {
                    await zakirDB.saveUmrahPackage({ ...pkg, isActive: !pkg.isActive });
                    this.showToast(`Package ${!pkg.isActive ? "shown" : "hidden"} live.`);
                }
            } else if (action === "move-pkg") {
                await zakirDB.reorderUmrahPackage(
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
                const id = actionEl.getAttribute("data-id");
                await zakirDB.deleteVisaService(id);
                this.showToast("Visa destination deleted.", "warning");
            } else if (action === "toggle-visa-active") {
                const visa = this.visas.find((v) => v.id === actionEl.getAttribute("data-id"));
                if (visa) {
                    await zakirDB.saveVisaService({ ...visa, isActive: !visa.isActive });
                    this.showToast(`Visa card ${!visa.isActive ? "shown" : "hidden"} live.`);
                }
            } else if (action === "move-visa") {
                await zakirDB.reorderVisaService(
                    actionEl.getAttribute("data-id"),
                    actionEl.getAttribute("data-dir")
                );
            } else if (action === "reset-flyer-defaults") {
                this.container.querySelector("#resetConfirmModal").classList.remove("hidden");
            } else if (action === "cancel-reset-modal") {
                this.container.querySelector("#resetConfirmModal").classList.add("hidden");
            } else if (action === "confirm-reset-defaults") {
                await zakirDB.resetToFlyerDefaults();
                this.container.querySelector("#resetConfirmModal").classList.add("hidden");
                this.showToast("Restored Original January Flyer Defaults (PKR 232,000)!");
            } else if (action === "open-firebase-modal") {
                const existing = zakirDB.getFirebaseConfig();
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
                    await zakirDB.saveFirebaseConfig(parsed);
                    this.container.querySelector("#firebaseConfigModal").classList.add("hidden");
                    this._updateAuthView();
                    this.showToast("Connected to Firebase Cloud!");
                } catch (err) {
                    this.showToast("Invalid Firebase JSON config: " + err.message, "error");
                }
            } else if (action === "disconnect-firebase") {
                zakirDB.disconnectFirebaseConfig();
                this.container.querySelector("#firebaseConfigModal").classList.add("hidden");
                this._updateAuthView();
                this.showToast("Switched to Built-In Real-Time Local Sync.");
            }
        });
    }

    _openPkgModal(pkg) {
        this._switchCrudSubtab("packages");
        this.container.querySelector("#pkgModalTitle").textContent = pkg
            ? "Edit Umrah Package"
            : "Add New Umrah Package";
        this.container.querySelector("#pkgEditId").value = pkg?.id || "";
        this.container.querySelector("#pkgEditTitle").value = pkg?.title || "";
        this.container.querySelector("#pkgEditBadge").value = pkg?.badgeText || "Special Offer";
        this.container.querySelector("#pkgEditPrice").value = pkg?.price || 232000;
        this.container.querySelector("#pkgEditRoom").value = pkg?.roomType || "Sharing (Quad)";
        this.container.querySelector("#pkgEditDuration").value = pkg?.duration || "14 Nights / 15 Days";
        this.container.querySelector("#pkgEditDep").value = pkg?.departureDate || "Jan 26, 2026";
        this.container.querySelector("#pkgEditRet").value = pkg?.returnDate || "Feb 09, 2026";
        this.container.querySelector("#pkgEditMakkahDist").value = pkg?.makkahHotelDist || "450m Walking Distance";
        this.container.querySelector("#pkgEditMadinahDist").value = pkg?.madinahHotelDist || "300m Near Haram";
        this.container.querySelector("#pkgEditServices").value = Array.isArray(pkg?.services)
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
        this.container.querySelector("#visaEditId").value = visa?.id || "";
        this.container.querySelector("#visaEditCountry").value = visa?.countryName || "";
        this.container.querySelector("#visaEditFlag").value = visa?.flagEmoji || "🌍";
        this.container.querySelector("#visaEditType").value = visa?.visaType || "Tourist E-Visa";
        this.container.querySelector("#visaEditTime").value = visa?.processingTime || "3-5 Working Days";
        this.container.querySelector("#visaEditPrice").value = visa?.pricePKR ?? 25000;
        this.container.querySelector("#visaEditImage").value = visa?.imageUrl || "";
        this.container.querySelector("#visaEditReqs").value =
            visa?.requirementsSummary || "Passport Scan, CNIC Copy, White Background Photo";
        this.container.querySelector("#visaEditActive").checked = visa ? Boolean(visa.isActive) : true;

        this.container.querySelector("#visaCrudModal").classList.remove("hidden");
    }
}

