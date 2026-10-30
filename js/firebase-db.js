/**
 * Zakir Travel & Tours - Full-Stack Database, Auth & Storage Service
 * Supports Firebase v10 (Auth, Firestore, Storage) with automatic real-time
 * reactive sync (onSnapshot + BroadcastChannel + LocalStorage persistence)
 * so the application works out-of-the-box and syncs instantly across tabs/devices.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    collection,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ============================================================================
// 1. INITIAL SEED DATA ("JANUARY FLYER DEFAULTS")
// ============================================================================

export const FLYER_DEFAULTS = {
    site_config: {
        main_settings: {
            spotlight: {
                monthLabel: "January",
                title: "UMRAH PACKAGE",
                startingPrice: 232000,
                priceUnit: "PER PERSON (SHARING)",
                departureDate: "Jan 26, 2026",
                returnDate: "Nov 10, 2026",
                duration: "14 Nights",
                madinahImageUrl: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80",
                makkahImageUrl: "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80",
                promotionalFlyerUrl: "",
                showFlyerOnHomepage: true,
                servicesIncluded: {
                    roundTrip: true,
                    visa: true,
                    hotel: true,
                    transport: true
                }
            },
            calculatorRates: {
                sharingPrice: 232000,
                quadPrice: 248000,
                triplePrice: 268000,
                doublePrice: 295000,
                autoCalculateTiers: true
            },
            contacts: {
                agencyName: "Zakir Travel & Tours",
                taglinePrimary: "Your Journey Our Priority",
                taglineSecondary: "Your Journey Our Responsibility",
                managerName: "Inam Khan (Manager)",
                managerPhone: "+92 349 0558345",
                managerWhatsApp: "923490558345",
                secondaryName: "Sadiq Ullah",
                secondaryPhone: "+92 343 4159182",
                secondaryWhatsApp: "923434159182",
                activeBookingWhatsApp: "923490558345",
                officeAddress: "Office No. 7 Ground Floor Potohar Plaza, Fazal-e-Haq Road Blue Area, Islamabad"
            },
            updatedAt: new Date().toISOString()
        }
    },
    umrah_packages: [
        {
            id: "pkg_jan_saver",
            title: "January Economy Saver Umrah",
            badgeText: "Flyer Special",
            price: 232000,
            roomType: "Sharing (Quad / Quint)",
            departureDate: "Jan 26, 2026",
            returnDate: "Feb 09, 2026",
            duration: "14 Nights / 15 Days",
            makkahHotelDist: "600m (24/7 Shuttle)",
            madinahHotelDist: "450m Walking Distance",
            services: ["Return Air Ticket", "Umrah E-Visa & Insurance", "Hotel Stay", "Luxury AC Transport"],
            isFeatured: true,
            isActive: true,
            sortOrder: 1
        },
        {
            id: "pkg_3star_walking",
            title: "3-Star Plus Haram Walking Package",
            badgeText: "Most Popular",
            price: 268000,
            roomType: "Quad / Triple Sharing",
            departureDate: "Feb 02, 2026",
            returnDate: "Feb 16, 2026",
            duration: "14 Nights / 15 Days",
            makkahHotelDist: "350m Walking Distance",
            madinahHotelDist: "250m Near Masjid Nabawi",
            services: ["Direct Return Flight", "Umrah Visa & Insurance", "3-Star Near Haram Hotels", "Full Ziyarat & Transport"],
            isFeatured: false,
            isActive: true,
            sortOrder: 2
        },
        {
            id: "pkg_short_10nights",
            title: "10-Nights Executive Quick Umrah",
            badgeText: "Short Stay",
            price: 214000,
            roomType: "Sharing / Family Rooms",
            departureDate: "Weekly Batches",
            returnDate: "Flexible Schedule",
            duration: "10 Nights / 11 Days",
            makkahHotelDist: "400m Walking Distance",
            madinahHotelDist: "300m Walking Distance",
            services: ["Return Air Ticket", "Fast E-Visa", "Makkah & Madinah Hotels", "Airport Pickup & Transport"],
            isFeatured: false,
            isActive: true,
            sortOrder: 3
        },
        {
            id: "pkg_5star_vip",
            title: "5-Star VIP Clock Tower View",
            badgeText: "VIP Luxury",
            price: 365000,
            roomType: "Double / Couple Room",
            departureDate: "Custom Dates",
            returnDate: "Flexible Return",
            duration: "14 Nights / 15 Days",
            makkahHotelDist: "0m Haram Courtyard (5-Star)",
            madinahHotelDist: "100m Front Row Markazia",
            services: ["Direct Saudi/PIA Flight", "VIP Umrah Visa", "5-Star Buffet Breakfast", "Private GMC Ground Transport"],
            isFeatured: false,
            isActive: true,
            sortOrder: 4
        }
    ],
    visa_services: [
        {
            id: "visa_ksa",
            countryName: "Saudi Arabia",
            flagEmoji: "🇸🇦",
            visaType: "Umrah & Visit Visa",
            processingTime: "24-48 Hours",
            pricePKR: 42000,
            requirementsSummary: "Valid Passport (6+ Months), White Background Photo, CNIC Copy",
            imageUrl: "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=600&q=80",
            isActive: true,
            sortOrder: 1
        },
        {
            id: "visa_uae",
            countryName: "Dubai / UAE",
            flagEmoji: "🇦🇪",
            visaType: "30 & 60 Days E-Visa",
            processingTime: "3-5 Working Days",
            pricePKR: 34500,
            requirementsSummary: "Passport Scan, CNIC Front/Back, Passport Size Photograph, Bank Statement",
            imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80",
            isActive: true,
            sortOrder: 2
        },
        {
            id: "visa_turkey",
            countryName: "Turkey",
            flagEmoji: "🇹🇷",
            visaType: "Tourist Sticker / E-Visa",
            processingTime: "7-10 Working Days",
            pricePKR: 48000,
            requirementsSummary: "Original Passport, 6 Months Bank Statement, FRC, Hotel & Flight Reservation",
            imageUrl: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80",
            isActive: true,
            sortOrder: 3
        },
        {
            id: "visa_malaysia",
            countryName: "Malaysia & Thailand",
            flagEmoji: "🇲🇾",
            visaType: "Tourist E-Visa",
            processingTime: "3-4 Working Days",
            pricePKR: 18500,
            requirementsSummary: "Passport First Page Scan, Digital White Background Photo, Bank Statement",
            imageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=600&q=80",
            isActive: true,
            sortOrder: 4
        },
        {
            id: "visa_uk_schengen",
            countryName: "UK & Schengen Europe",
            flagEmoji: "🇬🇧",
            visaType: "Visit File & Appointment",
            processingTime: "15-21 Working Days",
            pricePKR: 35000,
            requirementsSummary: "Complete Visa Consultancy, Cover Letter, Appointment Scheduling & File Prep",
            imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80",
            isActive: true,
            sortOrder: 5
        },
        {
            id: "visa_baku",
            countryName: "Azerbaijan (Baku)",
            flagEmoji: "🇦🇿",
            visaType: "ASAN Tourist E-Visa",
            processingTime: "3 Working Days",
            pricePKR: 14500,
            requirementsSummary: "Clear Passport Copy & CNIC Only — Fast Approval with Return Ticket Deals",
            imageUrl: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=600&q=80",
            isActive: true,
            sortOrder: 6
        }
    ]
};

// ============================================================================
// 2. TIER AUTO-SCALING MATH HELPER
// ============================================================================
// Offsets based on the initial specification:
// Sharing: 232,000 (Base)
// Quad:    248,000 (+16,000)
// Triple:  268,000 (+36,000)
// Double:  295,000 (+63,000)
export function calculateScaledTiers(baseStartingPrice) {
    const base = Math.max(0, Number(baseStartingPrice) || 232000);
    return {
        sharingPrice: base,
        quadPrice: base + 16000,
        triplePrice: base + 36000,
        doublePrice: base + 63000
    };
}

// ============================================================================
// 3. DUAL-ENGINE DATABASE & AUTH LAYER (FIREBASE + LOCAL REAL-TIME EMULATOR)
// ============================================================================

const STORAGE_KEYS = {
    FIREBASE_CONFIG: "zakir_firebase_config_v1",
    SITE_CONFIG: "zakir_db_site_config_v1",
    UMRAH_PACKAGES: "zakir_db_umrah_packages_v1",
    VISA_SERVICES: "zakir_db_visa_services_v1",
    AUTH_SESSION: "zakir_auth_session_v1"
};

// Default Staff Accounts for instant phone login when using built-in auth or initial setup
const STAFF_ACCOUNTS = [
    {
        email: "inam@zakirtravels.com",
        password: "Zakir2026!",
        displayName: "Inam Khan (Manager)",
        role: "Manager"
    },
    {
        email: "sadiq@zakirtravels.com",
        password: "Zakir2026!",
        displayName: "Sadiq Ullah",
        role: "Travel Consultant"
    },
    {
        email: "admin@zakirtravels.com",
        password: "admin123",
        displayName: "Zakir Travels Admin",
        role: "Administrator"
    }
];

class ZakirBackendService {
    constructor() {
        this.mode = "local-realtime"; // "firebase" | "local-realtime"
        this.app = null;
        this.auth = null;
        this.db = null;
        this.storage = null;

        this.listeners = {
            site_config: new Set(),
            umrah_packages: new Set(),
            visa_services: new Set(),
            auth: new Set()
        };

        this.firebaseUnsubscribes = [];

        // Cross-tab instant synchronization channel
        this.channel = typeof BroadcastChannel !== "undefined"
            ? new BroadcastChannel("zakir_travels_realtime_sync")
            : null;

        if (this.channel) {
            this.channel.onmessage = (event) => {
                const { type } = event.data || {};
                if (type === "DB_UPDATED") {
                    this._notifyLocalListeners();
                } else if (type === "AUTH_UPDATED") {
                    this._notifyAuthListeners();
                }
            };
        }

        // Also listen to window storage events for cross-tab fallback
        if (typeof window !== "undefined") {
            window.addEventListener("storage", (e) => {
                if (
                    e.key === STORAGE_KEYS.SITE_CONFIG ||
                    e.key === STORAGE_KEYS.UMRAH_PACKAGES ||
                    e.key === STORAGE_KEYS.VISA_SERVICES
                ) {
                    this._notifyLocalListeners();
                } else if (e.key === STORAGE_KEYS.AUTH_SESSION) {
                    this._notifyAuthListeners();
                }
            });
        }

        this._ensureLocalSeed();
        this._tryInitializeFirebase();
    }

    // ------------------------------------------------------------------------
    // INITIALIZATION & FIREBASE CONNECTION
    // ------------------------------------------------------------------------

    _ensureLocalSeed() {
        if (!localStorage.getItem(STORAGE_KEYS.SITE_CONFIG)) {
            localStorage.setItem(
                STORAGE_KEYS.SITE_CONFIG,
                JSON.stringify(FLYER_DEFAULTS.site_config.main_settings)
            );
        }
        if (!localStorage.getItem(STORAGE_KEYS.UMRAH_PACKAGES)) {
            localStorage.setItem(
                STORAGE_KEYS.UMRAH_PACKAGES,
                JSON.stringify(FLYER_DEFAULTS.umrah_packages)
            );
        }
        if (!localStorage.getItem(STORAGE_KEYS.VISA_SERVICES)) {
            localStorage.setItem(
                STORAGE_KEYS.VISA_SERVICES,
                JSON.stringify(FLYER_DEFAULTS.visa_services)
            );
        }
    }

    getFirebaseConfig() {
        try {
            // Check window.ZAKIR_FIREBASE_CONFIG first, then localStorage
            if (typeof window !== "undefined" && window.ZAKIR_FIREBASE_CONFIG && window.ZAKIR_FIREBASE_CONFIG.apiKey) {
                return window.ZAKIR_FIREBASE_CONFIG;
            }
            const raw = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && parsed.apiKey && parsed.projectId) {
                return parsed;
            }
        } catch (err) {
            console.warn("Invalid stored Firebase config:", err);
        }
        return null;
    }

    async saveFirebaseConfig(configObj) {
        if (!configObj || !configObj.apiKey || !configObj.projectId) {
            throw new Error("Firebase config must include at least apiKey and projectId.");
        }
        localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(configObj));
        await this._tryInitializeFirebase();
        return this.mode;
    }

    disconnectFirebaseConfig() {
        localStorage.removeItem(STORAGE_KEYS.FIREBASE_CONFIG);
        this.firebaseUnsubscribes.forEach((unsub) => {
            try { unsub(); } catch (_) {}
        });
        this.firebaseUnsubscribes = [];
        this.mode = "local-realtime";
        this._notifyLocalListeners();
    }

    async _tryInitializeFirebase() {
        const config = this.getFirebaseConfig();
        if (!config) {
            this.mode = "local-realtime";
            return;
        }

        try {
            const existingApps = getApps();
            this.app = existingApps.length ? existingApps[0] : initializeApp(config);
            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);
            this.storage = getStorage(this.app);
            this.mode = "firebase";

            // Ensure cloud Firestore has initial seed data if empty
            await this._ensureFirestoreSeed();
            this._bindFirestoreSnapshots();

            onAuthStateChanged(this.auth, (user) => {
                this._notifyAuthListeners(user);
            });
        } catch (err) {
            console.warn("Firebase initialization fell back to local-realtime mode:", err);
            this.mode = "local-realtime";
        }
    }

    async _ensureFirestoreSeed() {
        if (this.mode !== "firebase" || !this.db) return;
        try {
            const mainRef = doc(this.db, "site_config", "main_settings");
            const snap = await getDoc(mainRef);
            if (!snap.exists()) {
                await this.resetToFlyerDefaults();
            }
        } catch (err) {
            console.warn("Could not check Firestore seed status:", err);
        }
    }

    _bindFirestoreSnapshots() {
        if (this.mode !== "firebase" || !this.db) return;

        // Clear any existing listeners
        this.firebaseUnsubscribes.forEach((u) => {
            try { u(); } catch (_) {}
        });
        this.firebaseUnsubscribes = [];

        // 1. site_config/main_settings listener
        const configRef = doc(this.db, "site_config", "main_settings");
        const unsubConfig = onSnapshot(configRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                localStorage.setItem(STORAGE_KEYS.SITE_CONFIG, JSON.stringify(data));
                this.listeners.site_config.forEach((cb) => cb(data));
            }
        });

        // 2. umrah_packages collection listener
        const pkgQuery = query(collection(this.db, "umrah_packages"), orderBy("sortOrder", "asc"));
        const unsubPkgs = onSnapshot(pkgQuery, (snap) => {
            const list = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
            localStorage.setItem(STORAGE_KEYS.UMRAH_PACKAGES, JSON.stringify(list));
            this.listeners.umrah_packages.forEach((cb) => cb(list));
        });

        // 3. visa_services collection listener
        const visaQuery = query(collection(this.db, "visa_services"), orderBy("sortOrder", "asc"));
        const unsubVisas = onSnapshot(visaQuery, (snap) => {
            const list = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
            localStorage.setItem(STORAGE_KEYS.VISA_SERVICES, JSON.stringify(list));
            this.listeners.visa_services.forEach((cb) => cb(list));
        });

        this.firebaseUnsubscribes.push(unsubConfig, unsubPkgs, unsubVisas);
    }

    // ------------------------------------------------------------------------
    // REAL-TIME LISTENERS (onSnapshot API)
    // ------------------------------------------------------------------------

    onSiteConfigSnapshot(callback) {
        this.listeners.site_config.add(callback);
        // Immediately emit current state
        callback(this.getLocalSiteConfig());
        return () => this.listeners.site_config.delete(callback);
    }

    onUmrahPackagesSnapshot(callback) {
        this.listeners.umrah_packages.add(callback);
        callback(this.getLocalUmrahPackages());
        return () => this.listeners.umrah_packages.delete(callback);
    }

    onVisaServicesSnapshot(callback) {
        this.listeners.visa_services.add(callback);
        callback(this.getLocalVisaServices());
        return () => this.listeners.visa_services.delete(callback);
    }

    onAuthSnapshot(callback) {
        this.listeners.auth.add(callback);
        callback(this.getCurrentUser());
        return () => this.listeners.auth.delete(callback);
    }

    _notifyLocalListeners() {
        const siteConfig = this.getLocalSiteConfig();
        const packages = this.getLocalUmrahPackages();
        const visas = this.getLocalVisaServices();

        this.listeners.site_config.forEach((cb) => cb(siteConfig));
        this.listeners.umrah_packages.forEach((cb) => cb(packages));
        this.listeners.visa_services.forEach((cb) => cb(visas));
    }

    _broadcastChange(type = "DB_UPDATED") {
        if (this.channel) {
            try {
                this.channel.postMessage({ type, timestamp: Date.now() });
            } catch (_) {}
        }
    }

    // ------------------------------------------------------------------------
    // GETTERS
    // ------------------------------------------------------------------------

    getLocalSiteConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.SITE_CONFIG);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Deep merge with defaults to ensure no missing keys
                return {
                    ...FLYER_DEFAULTS.site_config.main_settings,
                    ...parsed,
                    spotlight: {
                        ...FLYER_DEFAULTS.site_config.main_settings.spotlight,
                        ...(parsed.spotlight || {}),
                        servicesIncluded: {
                            ...FLYER_DEFAULTS.site_config.main_settings.spotlight.servicesIncluded,
                            ...((parsed.spotlight && parsed.spotlight.servicesIncluded) || {})
                        }
                    },
                    calculatorRates: {
                        ...FLYER_DEFAULTS.site_config.main_settings.calculatorRates,
                        ...(parsed.calculatorRates || {})
                    },
                    contacts: {
                        ...FLYER_DEFAULTS.site_config.main_settings.contacts,
                        ...(parsed.contacts || {})
                    }
                };
            }
        } catch (e) {
            console.error("Error reading site_config:", e);
        }
        return JSON.parse(JSON.stringify(FLYER_DEFAULTS.site_config.main_settings));
    }

    getLocalUmrahPackages() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.UMRAH_PACKAGES);
            if (raw) {
                const list = JSON.parse(raw);
                return [...list].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
            }
        } catch (e) {
            console.error("Error reading umrah_packages:", e);
        }
        return JSON.parse(JSON.stringify(FLYER_DEFAULTS.umrah_packages));
    }

    getLocalVisaServices() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.VISA_SERVICES);
            if (raw) {
                const list = JSON.parse(raw);
                return [...list].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
            }
        } catch (e) {
            console.error("Error reading visa_services:", e);
        }
        return JSON.parse(JSON.stringify(FLYER_DEFAULTS.visa_services));
    }

    // ------------------------------------------------------------------------
    // MUTATIONS: SITE CONFIG & 10-SECOND QUICK UPDATE
    // ------------------------------------------------------------------------

    async updateSiteConfig(partialOrFullConfig) {
        const current = this.getLocalSiteConfig();
        const updated = {
            ...current,
            ...partialOrFullConfig,
            spotlight: {
                ...current.spotlight,
                ...(partialOrFullConfig.spotlight || {}),
                servicesIncluded: {
                    ...current.spotlight.servicesIncluded,
                    ...((partialOrFullConfig.spotlight && partialOrFullConfig.spotlight.servicesIncluded) || {})
                }
            },
            calculatorRates: {
                ...current.calculatorRates,
                ...(partialOrFullConfig.calculatorRates || {})
            },
            contacts: {
                ...current.contacts,
                ...(partialOrFullConfig.contacts || {})
            },
            updatedAt: new Date().toISOString()
        };

        // If autoCalculateTiers is enabled and startingPrice changed, scale tiers automatically
        if (updated.calculatorRates.autoCalculateTiers && partialOrFullConfig.spotlight?.startingPrice !== undefined) {
            const scaled = calculateScaledTiers(updated.spotlight.startingPrice);
            updated.calculatorRates = {
                ...updated.calculatorRates,
                ...scaled
            };
        }

        // Save to local cache immediately for optimistic UI & local mode
        localStorage.setItem(STORAGE_KEYS.SITE_CONFIG, JSON.stringify(updated));

        // Also keep featured package in umrah_packages in sync if startingPrice/departureDate changed
        if (partialOrFullConfig.spotlight) {
            const pkgs = this.getLocalUmrahPackages();
            const featuredIdx = pkgs.findIndex((p) => p.isFeatured);
            if (featuredIdx !== -1) {
                pkgs[featuredIdx] = {
                    ...pkgs[featuredIdx],
                    price: Number(updated.spotlight.startingPrice) || pkgs[featuredIdx].price,
                    departureDate: updated.spotlight.departureDate || pkgs[featuredIdx].departureDate,
                    duration: updated.spotlight.duration || pkgs[featuredIdx].duration
                };
                localStorage.setItem(STORAGE_KEYS.UMRAH_PACKAGES, JSON.stringify(pkgs));
            }
        }

        this._notifyLocalListeners();
        this._broadcastChange("DB_UPDATED");

        if (this.mode === "firebase" && this.db) {
            const ref = doc(this.db, "site_config", "main_settings");
            await setDoc(ref, updated, { merge: true });
        }

        return updated;
    }

    /**
     * 10-Second Quick Update Bar Handler:
     * Updates startingPrice, departureDate, and monthLabel in one atomic operation,
     * and recalculates calculator room tiers if autoCalculateTiers is true.
     */
    async publishQuickUpdate({ startingPrice, departureDate, monthLabel }) {
        const cleanPrice = Number(startingPrice);
        if (!cleanPrice || cleanPrice <= 0) {
            throw new Error("Starting price must be a positive amount in PKR.");
        }
        if (!departureDate || !String(departureDate).trim()) {
            throw new Error("Departure date is required.");
        }
        if (!monthLabel || !String(monthLabel).trim()) {
            throw new Error("Package Month Label is required.");
        }

        const current = this.getLocalSiteConfig();
        const autoCalc = current.calculatorRates.autoCalculateTiers !== false;
        const newRates = autoCalc
            ? { ...current.calculatorRates, ...calculateScaledTiers(cleanPrice) }
            : { ...current.calculatorRates, sharingPrice: cleanPrice };

        return this.updateSiteConfig({
            spotlight: {
                ...current.spotlight,
                startingPrice: cleanPrice,
                departureDate: String(departureDate).trim(),
                monthLabel: String(monthLabel).trim()
            },
            calculatorRates: newRates
        });
    }

    // ------------------------------------------------------------------------
    // MUTATIONS: UMRAH PACKAGES (CRUD + REORDER)
    // ------------------------------------------------------------------------

    async saveUmrahPackage(pkgData) {
        const list = this.getLocalUmrahPackages();
        const cleanPrice = Number(pkgData.price);
        if (!cleanPrice || cleanPrice <= 0) {
            throw new Error("Package price must be greater than 0 PKR.");
        }

        let targetPkg;
        if (pkgData.id) {
            const idx = list.findIndex((p) => p.id === pkgData.id);
            if (idx !== -1) {
                targetPkg = {
                    ...list[idx],
                    ...pkgData,
                    price: cleanPrice,
                    sortOrder: Number(pkgData.sortOrder ?? list[idx].sortOrder ?? idx + 1)
                };
                list[idx] = targetPkg;
            }
        }

        if (!targetPkg) {
            const newId = pkgData.id || `pkg_${Date.now()}`;
            targetPkg = {
                id: newId,
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
                          .map((s) => s.trim())
                          .filter(Boolean),
                isFeatured: Boolean(pkgData.isFeatured),
                isActive: pkgData.isActive !== undefined ? Boolean(pkgData.isActive) : true,
                sortOrder: Number(pkgData.sortOrder ?? list.length + 1)
            };
            list.push(targetPkg);
        }

        // If marked featured, unmark others
        if (targetPkg.isFeatured) {
            list.forEach((p) => {
                if (p.id !== targetPkg.id) p.isFeatured = false;
            });
        }

        localStorage.setItem(STORAGE_KEYS.UMRAH_PACKAGES, JSON.stringify(list));
        this._notifyLocalListeners();
        this._broadcastChange("DB_UPDATED");

        if (this.mode === "firebase" && this.db) {
            const ref = doc(this.db, "umrah_packages", targetPkg.id);
            await setDoc(ref, targetPkg, { merge: true });
        }

        return targetPkg;
    }

    async deleteUmrahPackage(pkgId) {
        const list = this.getLocalUmrahPackages().filter((p) => p.id !== pkgId);
        localStorage.setItem(STORAGE_KEYS.UMRAH_PACKAGES, JSON.stringify(list));
        this._notifyLocalListeners();
        this._broadcastChange("DB_UPDATED");

        if (this.mode === "firebase" && this.db) {
            await deleteDoc(doc(this.db, "umrah_packages", pkgId));
        }
    }

    async reorderUmrahPackage(pkgId, direction) {
        const list = this.getLocalUmrahPackages();
        const idx = list.findIndex((p) => p.id === pkgId);
        if (idx === -1) return;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= list.length) return;

        const temp = list[idx];
        list[idx] = list[swapIdx];
        list[swapIdx] = temp;

        list.forEach((item, index) => {
            item.sortOrder = index + 1;
        });

        localStorage.setItem(STORAGE_KEYS.UMRAH_PACKAGES, JSON.stringify(list));
        this._notifyLocalListeners();
        this._broadcastChange("DB_UPDATED");

        if (this.mode === "firebase" && this.db) {
            const batch = writeBatch(this.db);
            list.forEach((item) => {
                batch.set(doc(this.db, "umrah_packages", item.id), item, { merge: true });
            });
            await batch.commit();
        }
    }

    // ------------------------------------------------------------------------
    // MUTATIONS: VISA SERVICES (CRUD + REORDER)
    // ------------------------------------------------------------------------

    async saveVisaService(visaData) {
        const list = this.getLocalVisaServices();
        const cleanPrice = Number(visaData.pricePKR);
        if (isNaN(cleanPrice) || cleanPrice < 0) {
            throw new Error("Visa price must be 0 or a positive PKR amount.");
        }

        let targetVisa;
        if (visaData.id) {
            const idx = list.findIndex((v) => v.id === visaData.id);
            if (idx !== -1) {
                targetVisa = {
                    ...list[idx],
                    ...visaData,
                    pricePKR: cleanPrice,
                    sortOrder: Number(visaData.sortOrder ?? list[idx].sortOrder ?? idx + 1)
                };
                list[idx] = targetVisa;
            }
        }

        if (!targetVisa) {
            const newId = visaData.id || `visa_${Date.now()}`;
            targetVisa = {
                id: newId,
                countryName: visaData.countryName || "Country Name",
                flagEmoji: visaData.flagEmoji || "🌍",
                visaType: visaData.visaType || "Tourist / Visit Visa",
                processingTime: visaData.processingTime || "3-5 Working Days",
                pricePKR: cleanPrice,
                requirementsSummary: visaData.requirementsSummary || "Passport Scan, Photo & CNIC Copy",
                imageUrl: visaData.imageUrl || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
                isActive: visaData.isActive !== undefined ? Boolean(visaData.isActive) : true,
                sortOrder: Number(visaData.sortOrder ?? list.length + 1)
            };
            list.push(targetVisa);
        }

        localStorage.setItem(STORAGE_KEYS.VISA_SERVICES, JSON.stringify(list));
        this._notifyLocalListeners();
        this._broadcastChange("DB_UPDATED");

        if (this.mode === "firebase" && this.db) {
            const ref = doc(this.db, "visa_services", targetVisa.id);
            await setDoc(ref, targetVisa, { merge: true });
        }

        return targetVisa;
    }

    async deleteVisaService(visaId) {
        const list = this.getLocalVisaServices().filter((v) => v.id !== visaId);
        localStorage.setItem(STORAGE_KEYS.VISA_SERVICES, JSON.stringify(list));
        this._notifyLocalListeners();
        this._broadcastChange("DB_UPDATED");

        if (this.mode === "firebase" && this.db) {
            await deleteDoc(doc(this.db, "visa_services", visaId));
        }
    }

    async reorderVisaService(visaId, direction) {
        const list = this.getLocalVisaServices();
        const idx = list.findIndex((v) => v.id === visaId);
        if (idx === -1) return;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= list.length) return;

        const temp = list[idx];
        list[idx] = list[swapIdx];
        list[swapIdx] = temp;

        list.forEach((item, index) => {
            item.sortOrder = index + 1;
        });

        localStorage.setItem(STORAGE_KEYS.VISA_SERVICES, JSON.stringify(list));
        this._notifyLocalListeners();
        this._broadcastChange("DB_UPDATED");

        if (this.mode === "firebase" && this.db) {
            const batch = writeBatch(this.db);
            list.forEach((item) => {
                batch.set(doc(this.db, "visa_services", item.id), item, { merge: true });
            });
            await batch.commit();
        }
    }

    // ------------------------------------------------------------------------
    // MEDIA UPLOADER (FIREBASE STORAGE + CLIENT-SIDE COMPRESSED DATA URL)
    // ------------------------------------------------------------------------

    async uploadMediaFile(file, folder = "zakir_media") {
        if (!file) throw new Error("No file selected.");

        // If Firebase Storage is active, try uploading to bucket first
        if (this.mode === "firebase" && this.storage) {
            try {
                const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                const fileRef = storageRef(this.storage, `${folder}/${safeName}`);
                const snap = await uploadBytes(fileRef, file);
                const downloadUrl = await getDownloadURL(snap.ref);
                return downloadUrl;
            } catch (err) {
                console.warn("Firebase Storage upload fallback to compressed DataURL:", err);
            }
        }

        // Compress and convert image client-side so mobile photos save instantaneously
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("Failed to read image file."));
            reader.onload = (e) => {
                const img = new Image();
                img.onerror = () => reject(new Error("Invalid image format."));
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const maxDim = 1100;
                    let { width, height } = img;
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
                    resolve(dataUrl);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ------------------------------------------------------------------------
    // RESET TO ORIGINAL JANUARY FLYER DEFAULTS (SEED SCRIPT)
    // ------------------------------------------------------------------------

    async resetToFlyerDefaults() {
        const defaultConfig = JSON.parse(JSON.stringify(FLYER_DEFAULTS.site_config.main_settings));
        const defaultPkgs = JSON.parse(JSON.stringify(FLYER_DEFAULTS.umrah_packages));
        const defaultVisas = JSON.parse(JSON.stringify(FLYER_DEFAULTS.visa_services));

        localStorage.setItem(STORAGE_KEYS.SITE_CONFIG, JSON.stringify(defaultConfig));
        localStorage.setItem(STORAGE_KEYS.UMRAH_PACKAGES, JSON.stringify(defaultPkgs));
        localStorage.setItem(STORAGE_KEYS.VISA_SERVICES, JSON.stringify(defaultVisas));

        this._notifyLocalListeners();
        this._broadcastChange("DB_UPDATED");

        if (this.mode === "firebase" && this.db) {
            const batch = writeBatch(this.db);
            batch.set(doc(this.db, "site_config", "main_settings"), defaultConfig);

            // Clear existing docs and re-seed
            const existingPkgs = await getDocs(collection(this.db, "umrah_packages"));
            existingPkgs.forEach((d) => batch.delete(d.ref));
            defaultPkgs.forEach((pkg) => {
                batch.set(doc(this.db, "umrah_packages", pkg.id), pkg);
            });

            const existingVisas = await getDocs(collection(this.db, "visa_services"));
            existingVisas.forEach((d) => batch.delete(d.ref));
            defaultVisas.forEach((visa) => {
                batch.set(doc(this.db, "visa_services", visa.id), visa);
            });

            await batch.commit();
        }

        return {
            site_config: defaultConfig,
            umrah_packages: defaultPkgs,
            visa_services: defaultVisas
        };
    }

    // ------------------------------------------------------------------------
    // AUTHENTICATION (EMAIL / PASSWORD WITH SESSION PERSISTENCE)
    // ------------------------------------------------------------------------

    getCurrentUser() {
        if (this.mode === "firebase" && this.auth && this.auth.currentUser) {
            const u = this.auth.currentUser;
            return {
                email: u.email,
                displayName: u.displayName || u.email,
                role: "Admin"
            };
        }
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    async login(email, password) {
        const cleanEmail = String(email || "").trim().toLowerCase();
        const cleanPass = String(password || "");

        if (!cleanEmail || !cleanPass) {
            throw new Error("Please enter both email and password.");
        }

        // If Firebase mode is active, try Firebase Auth first
        if (this.mode === "firebase" && this.auth) {
            try {
                const cred = await signInWithEmailAndPassword(this.auth, cleanEmail, cleanPass);
                const userObj = {
                    email: cred.user.email,
                    displayName: cred.user.displayName || cred.user.email,
                    role: "Admin",
                    loggedInAt: new Date().toISOString()
                };
                localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(userObj));
                this._notifyAuthListeners(userObj);
                this._broadcastChange("AUTH_UPDATED");
                return userObj;
            } catch (fbErr) {
                // Also allow pre-configured staff credentials if Firebase Auth user hasn't been created yet
                const staffMatch = STAFF_ACCOUNTS.find(
                    (a) => a.email.toLowerCase() === cleanEmail && a.password === cleanPass
                );
                if (!staffMatch) {
                    throw new Error(fbErr.message || "Invalid login credentials.");
                }
            }
        }

        const matched = STAFF_ACCOUNTS.find(
            (a) => a.email.toLowerCase() === cleanEmail && a.password === cleanPass
        );

        if (!matched) {
            throw new Error("Invalid email or password. Use Inam Khan or Sadiq Ullah's staff credentials.");
        }

        const sessionUser = {
            email: matched.email,
            displayName: matched.displayName,
            role: matched.role,
            loggedInAt: new Date().toISOString()
        };

        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(sessionUser));
        this._notifyAuthListeners(sessionUser);
        this._broadcastChange("AUTH_UPDATED");
        return sessionUser;
    }

    async logout() {
        localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
        if (this.mode === "firebase" && this.auth) {
            try {
                await signOut(this.auth);
            } catch (_) {}
        }
        this._notifyAuthListeners(null);
        this._broadcastChange("AUTH_UPDATED");
    }

    _notifyAuthListeners(userOverride) {
        const user = userOverride !== undefined ? userOverride : this.getCurrentUser();
        this.listeners.auth.forEach((cb) => cb(user));
    }
}

export const zakirDB = new ZakirBackendService();
window.zakirDB = zakirDB;

