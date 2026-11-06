/**
 * Zakir Travel & Tours - Full-Stack Database, Auth & Storage Service
 * Works natively on both file:// (direct browser open) and http/https servers!
 * Supports Firebase (Auth, Firestore, Storage) + instant real-time cross-tab sync
 * (BroadcastChannel + storage events + LocalStorage persistence).
 */
(function (window) {
    "use strict";

    // How long a Firebase Storage upload may take before we give up on it
    // and fall back to the compressed DataURL instead. Storage is broken
    // for this project right now (rules unpublished in the console, billing
    // not set up), so an upload can hang indefinitely while Firebase
    // retries — without this timeout the admin shows no preview and no
    // feedback at all while the upload is stuck.
    const STORAGE_UPLOAD_TIMEOUT_MS = 10000;

    function formatPKR(val) {
        const num = Number(val);
        if (isNaN(num)) return "0";
        return num.toLocaleString("en-US");
    }

    function cleanWhatsAppDigits(str) {
        return String(str || "").replace(/[^0-9]/g, "");
    }

    // ============================================================================
    // 1. INITIAL SEED DATA ("JANUARY FLYER DEFAULTS" + MULTI-PAGE CONTENT SCHEMA)
    // ============================================================================

    const DEFAULT_PRIMARY_DEAL = {
        id: "deal_jan_umrah_2026",
        monthLabel: "January & Upcoming",
        title: "UMRAH PACKAGE",
        subtitle: "Complete spiritual peace of mind with our all-inclusive featured Umrah package. Everything handled from Islamabad to Haramain.",
        badgeTag: "All-Inclusive Deal",
        startingPrice: 232000,
        priceUnit: "PER PERSON (SHARING)",
        departureDate: "Jan 26, 2026",
        departureSubtext: "(Weekly Batches)",
        returnDate: "Feb 09, 2026",
        duration: "14 Nights",
        leftFrameTitle: "Madinah Munawwarah",
        leftFrameBadge: "Ziyarat & Stay",
        madinahHotel: "Al Eiman Taibah / Similar (Near Markazia)",
        madinahImageUrl: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80",
        rightFrameTitle: "Makkah Mukarramah",
        rightFrameBadge: "Haram View Options",
        makkahHotel: "Emaar Al Khalil / Similar (Shuttle / Walk)",
        makkahImageUrl: "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80",
        promotionalFlyerUrl: "",
        showFlyerOnHomepage: true,
        servicesIncluded: {
            roundTrip: true,
            visa: true,
            hotel: true,
            transport: true
        },
        isPrimary: true,
        isActive: true,
        sortOrder: 1
    };

    const DEFAULT_PAGE_CONTENT = {
        home: {
            heroBadge: "Swat's Trusted Travel & Umrah Partner",
            heroHeadingMain: "Your Spiritual & Global Journey,",
            heroDescription:
                "Headquartered on 2nd Floor, Hayat Market, Matta Swat with a branch office in Islamabad, Zakir Travel & Tours has proudly served over 100,000+ happy pilgrims and travelers. We specialize in Umrah & Ziyarat pilgrimages, domestic & international air ticketing, and worldwide visa consultancy.",
            aboutBadge: "About Zakir Travel & Tours",
            aboutHeading: "Swat's Trusted Partner for Spiritual & Worldwide Travel",
            aboutDescription:
                "Headquartered on 2nd Floor, Hayat Market, Matta Swat, Zakir Travel & Tours is a full-service travel agency dedicated to making your Umrah pilgrimage, global visa applications, and domestic & international air ticketing completely seamless, transparent, and stress-free — supported by our branch office in Islamabad.",
            missionTitle: "Our Mission & Promise",
            missionDesc:
                "To serve every pilgrim, family, and traveler with complete honesty, transparent guidance, and reliable arrangements from departure to safe return.",
            visionTitle: "Rooted in Swat, Connected Nationwide",
            visionDesc:
                "Serving families and pilgrims right from our Swat Matta Head Office with direct walk-in support, backed by our Islamabad branch and 24/7 WhatsApp assistance.",
            branch1Title: "Swat Head Office (Matta)",
            branch1Address: "2nd Floor, Hayat Market, Matta Swat, Khyber Pakhtunkhwa, Pakistan",
            branch1Desc:
                "Our central headquarters in Swat Matta providing families, elders, and travelers across Swat and Malakand Division with direct walk-in Umrah bookings, air ticketing, and visa consultancy.",
            branch2Title: "Islamabad Branch Office",
            branch2Address: "Office No. 7, Ground Floor, Potohar Plaza, Fazal-e-Haq Road, Blue Area, Islamabad",
            branch2Desc:
                "Our branch office in Blue Area, Islamabad supporting embassy documentation, flight departures, and travelers in the twin cities.",
            stat1Number: "100K+",
            stat1Label: "Happy Clients & Pilgrims Served",
            stat2Number: "24/7",
            stat2Label: "WhatsApp & On-Trip Support",
            stat3Number: "50+",
            stat3Label: "Global Airlines & Destinations",
            stat4Number: "Swat Matta",
            stat4Label: "Central Head Office (Matta Swat)",
            why1Title: "Transparent & Honest Guidance",
            why1Desc:
                "Zero hidden charges. Every travel plan shared at our Swat Matta Head Office includes clear, honest breakdowns of flights, visas, and hotels.",
            why2Title: "Direct Management Supervision",
            why2Desc:
                "Direct personal care from our management team (Inam Khan & Sadiq Ullah) from your first inquiry until you safely return home.",
            why3Title: "Fast-Track One-Window Service",
            why3Desc:
                "Electronic Saudi Umrah visas, worldwide tourist visa consultancy, hotel bookings, and instant airline e-tickets handled under one roof.",
            srv1Title: "Umrah & Ziyarat Pilgrimage",
            srv1Desc:
                "Economy, Star, and 5-Star VIP Umrah arrangements for individuals, families, and groups with verified Haramain hotels and guided Ziyarat.",
            srv2Title: "Domestic & International Air Ticketing",
            srv2Desc:
                "Lowest guaranteed fares on PIA, Saudia, Emirates, Qatar Airways, Airblue, Fly Jinnah, and all global airlines with instant e-ticket issuance.",
            srv3Title: "Worldwide Visa Consultancy",
            srv3Desc:
                "Expert tourist, visit, and e-visa documentation and file preparation for Saudi Arabia, UAE, Turkey, Malaysia, Thailand, UK, and Schengen.",
            srv4Title: "Haramain Hotels & Transport",
            srv4Desc:
                "Walking-distance Makkah & Madinah hotel reservations and comfortable private GMC, H1, Coaster, and luxury AC bus transport."
        },
        umrah: {
            heroBadge: "Direct Departures from Islamabad (ISB)",
            heroTitle: "All-Inclusive Umrah Packages",
            heroSubtitle:
                "Experience spiritual peace with complete ease. From verified walking-distance Makkah and Madinah hotels to fast-track Saudi Umrah visas, return airline tickets, luxury AC ground transport, and guided historical Ziyarat.",
            inc1Title: "Flights & Visas",
            inc1Bullets:
                "Direct or 1-stop return flight ticket from Islamabad | Electronic Saudi Umrah Visa processing | Mandatory Saudi medical health insurance | Airport handling & baggage support",
            inc2Title: "Haram Hotel Stays",
            inc2Bullets:
                "Verified Makkah hotel (walking or 24/7 shuttle) | Peaceful Madinah Munawwarah hotel near Markazia | Clean AC rooms with private attached baths | Choice of Sharing, Quad, Triple or Couple Double",
            inc3Title: "Transport & Ziyarat",
            inc3Bullets:
                "Jeddah / Madinah Airport pickup & drop-off | Inter-city Makkah to Madinah luxury AC transfer | Guided Ziyarat of Makkah sacred landmarks | Guided Ziyarat of Madinah holy sites",
            familyBannerTitle: "Traveling with Family, Elders, or a Private Group?",
            familyBannerDesc:
                "We customize hotel courtyard proximities, private GMC transport, and child discounts to match your family's exact budget."
        },
        visas: {
            heroBadge: "Fast Processing & Embassy File Preparation",
            heroTitle: "Worldwide Visas & Air Tickets",
            heroSubtitle:
                "Whether you need a rapid Saudi Umrah e-visa, UAE 30/60 days tourist visa, Turkey e-visa, or complex UK/USA/Schengen file preparation, our Islamabad visa desk delivers high approval rates with zero stress.",
            flightHeading: "Domestic & International Air Ticket Booking",
            flightDescription:
                "We issue official e-tickets for all domestic routes across Pakistan and international flights to Saudi Arabia, UAE, UK, Europe, USA, and Far East with instant WhatsApp confirmations.",
            flightBullets:
                "Special Umrah Group & Family Fares on PIA, Saudia & Emirates | Domestic Flights: Islamabad to Karachi, Quetta, Gilgit, Skardu | Flexible Date Change, Baggage Extension & Refund Assistance",
            partnerAirlines:
                "PIA (Pakistan International), Saudia Airlines, Emirates, Qatar Airways, Airblue, Serene Air, Fly Jinnah",
            step1Title: "Send Passports & Photos",
            step1Desc:
                "Share clear scans of your passport copy and white-background photographs via WhatsApp or drop them off at our Potohar Plaza Blue Area office.",
            step2Title: "Document Verification",
            step2Desc:
                "Our experts check eligibility, prepare embassy cover letters, book biometric appointments, and process your online electronic visa file.",
            step3Title: "Receive Approved Visa",
            step3Desc:
                "Receive your verified electronic PDF visa via WhatsApp and email, or collect your stamped physical passport from our office desk."
        },
        calculator: {
            heroBadge: "Live Real-Time Cost Estimator",
            heroTitle: "Umrah Package Budget Calculator",
            heroSubtitle:
                "Estimate your custom Umrah package in seconds! Select your stay duration, room sharing tier (Quad, Triple, Double, Sharing), hotel courtyard distance, and number of pilgrims.",
            includedBullets:
                "Direct or 1-Stop Return Airline Ticket from Islamabad | Umrah Visa with Comprehensive Saudi Health Insurance | Makkah & Madinah Hotel Accommodation + Transport | Dedicated Airport Pickups & Guided Ziyarat Tours"
        },
        contact: {
            heroBadge: "Head Office: Blue Area, Islamabad",
            heroTitle: "Contact Our Travel Desk",
            heroSubtitle:
                "We are always here to assist your spiritual journey and global travel. Visit our Blue Area office or speak directly with our manager and consultant via phone or WhatsApp."
        },
        workPermit: {
            heroBadge: "EU & Schengen Employment \u2022 Legal Work Permits",
            heroTitle: "Europe Work Permits",
            heroScript: "Build Your Career Abroad \u2014 The Legal Way.",
            heroSubtitle:
                "A work permit allows you to legally live and work in a foreign country. From our Head Office in Matta Swat, Zakir Travel & Tours guides you through every stage of European employment \u2014 consultation, eligibility, documents and embassy filing \u2014 for Poland and other leading EU destinations.",
            featuredScript: "Now Accepting Applications",
            featuredDesc:
                "Our currently active European work permit programme, with complete legal processing handled by our Swat Head Office team.",
            destinationsHeading: "Work Permit Programmes Across Europe",
            destinationsDesc:
                "Compare permit types, timelines and in-demand sectors. Availability depends on employer demand and quotas \u2014 contact our desk for the latest openings.",
            benefitsHeading: "Benefits of a European Work Permit",
            processHeading: "Your Path to Working in Europe",
            checklistHeading: "General Document Checklist",
            checklistDesc:
                "Typical documents required for most European work permit applications. Exact requirements vary by country and employer.",
            assessmentHeading: "Europe Work Permit Assessment",
            faqHeading: "Frequently Asked Questions"
        }
    };

    const FLYER_DEFAULTS = {
        site_config: {
            main_settings: {
                spotlight: { ...DEFAULT_PRIMARY_DEAL },
                calculatorRates: {
                    sharingPrice: 232000,
                    quadPrice: 248000,
                    triplePrice: 268000,
                    doublePrice: 295000,
                    autoCalculateTiers: true,
                    dur10NightsOffset: -18000,
                    dur21NightsOffset: 35000,
                    dur28NightsOffset: 65000,
                    hotel3StarAddon: 45000,
                    hotel5StarAddon: 115000
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
                    officeAddress: "2nd Floor, Hayat Market, Matta Swat, Khyber Pakhtunkhwa, Pakistan",
                    officeHours: "Monday to Saturday: 9:30 AM – 8:00 PM (Sunday Closed / WhatsApp Support Active)",
                    officeEmail: "info@zakirtravels.com / inam@zakirtravels.com",
                    mapEmbedUrl:
                        "https://maps.google.com/maps?q=Hayat+Market,+Matta,+Swat,+Pakistan&t=&z=16&ie=UTF8&iwloc=&output=embed"
                },
                pageContent: JSON.parse(JSON.stringify(DEFAULT_PAGE_CONTENT)),
                updatedAt: new Date().toISOString()
            }
        },
        special_deals: [{ ...DEFAULT_PRIMARY_DEAL }],
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
        ],
        work_permits: [
            {
                id: "wp_poland",
                countryName: "Poland",
                cardTitle: "Poland Work Permit",
                flagClass: "flag-pl",
                tagText: "Applications Open",
                tagStyle: "emerald",
                timeline: "3\u20136 Months",
                permitType: "Type-A Work Permit",
                visaCode: "D-Visa",
                contract: "1\u20133 Years, Renewable",
                residence: "Karta Pobytu (TRC)",
                sectors: "Logistics, Factory, Construction",
                ticks: ["Schengen Access", "EU Labour Rights", "Social Security (ZUS)"],
                isFeatured: true,
                isActive: true,
                sortOrder: 1
            },
            {
                id: "wp_romania",
                countryName: "Romania",
                cardTitle: "Romania Work Permit",
                flagClass: "flag-ro",
                tagText: "EU Member",
                tagStyle: "sky",
                timeline: "3\u20135 Months",
                permitType: "Work Authorisation (Aviz)",
                visaCode: "D/AM Visa",
                contract: "1 Year, Renewable",
                residence: "Residence Permit (IGI)",
                sectors: "Construction, HoReCa, Delivery",
                ticks: ["Schengen Member", "Employer Sponsored", "Legal Contract"],
                isFeatured: false,
                isActive: true,
                sortOrder: 2
            },
            {
                id: "wp_croatia",
                countryName: "Croatia",
                cardTitle: "Croatia Work Permit",
                flagClass: "flag-hr",
                tagText: "EU & Schengen",
                tagStyle: "sky",
                timeline: "2\u20134 Months",
                permitType: "Stay & Work Permit",
                visaCode: "D-Visa",
                contract: "Up to 3 Years",
                residence: "Temporary Stay (MUP)",
                sectors: "Construction, Tourism, Shipyards",
                ticks: ["Schengen Access", "Seasonal & Annual", "Employer Sponsored"],
                isFeatured: false,
                isActive: true,
                sortOrder: 3
            },
            {
                id: "wp_hungary",
                countryName: "Hungary",
                cardTitle: "Hungary Work Permit",
                flagClass: "flag-hu",
                tagText: "EU & Schengen",
                tagStyle: "sky",
                timeline: "2\u20134 Months",
                permitType: "Single Work & Residence",
                visaCode: "D-Visa",
                contract: "Up to 2 Years",
                residence: "Residence Permit Card",
                sectors: "Manufacturing, Logistics",
                ticks: ["Schengen Access", "Industrial Jobs", "Legal Contract"],
                isFeatured: false,
                isActive: true,
                sortOrder: 4
            },
            {
                id: "wp_czech",
                countryName: "Czech Republic",
                cardTitle: "Czech Republic Work Permit",
                flagClass: "flag-cz",
                tagText: "EU & Schengen",
                tagStyle: "sky",
                timeline: "3\u20135 Months",
                permitType: "Employee Card",
                visaCode: "Long-Term",
                contract: "Up to 2 Years, Renewable",
                residence: "Combined Permit Card",
                sectors: "Automotive, Welding, Warehousing",
                ticks: ["Schengen Access", "Skilled Trades", "Family Pathway"],
                isFeatured: false,
                isActive: true,
                sortOrder: 5
            },
            {
                id: "wp_portugal",
                countryName: "Portugal",
                cardTitle: "Portugal Work Visa",
                flagClass: "flag-pt",
                tagText: "EU & Schengen",
                tagStyle: "sky",
                timeline: "3\u20136 Months",
                permitType: "Employment Work Visa",
                visaCode: "Type-D",
                contract: "1 Year+, Renewable",
                residence: "Residence Permit (AIMA)",
                sectors: "Agriculture, Hospitality, Construction",
                ticks: ["Schengen Access", "Residency Pathway", "Family Reunion"],
                isFeatured: false,
                isActive: true,
                sortOrder: 6
            }
        ],
        work_permit_programmes: [
            {
                id: "wpp_poland",
                countryName: "Poland",
                flagClass: "flag-pl",
                statusText: "Open",
                regionText: "EU & Schengen",
                leftImageUrl: "./assets/warsaw-poland.jpg",
                leftImageFallback:
                    "https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=900&q=80",
                leftImageBadge: "Capital & Business Hub",
                leftCityTitle: "Warsaw",
                rightImageUrl: "./assets/krakow-wroclaw-poland.jpg",
                rightImageFallback:
                    "https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=900&q=80",
                rightImageBadge: "Industry & Logistics",
                rightCityTitle: "Wroc\u0142aw & Krak\u00f3w",
                shieldLabel: "Work Permit",
                shieldCountry: "POLAND",
                shieldSub: "Type-A Permit + D-Visa",
                shieldStatus: "Applications Open",
                permitTypeLong: "Voivodeship Type-A Permit (Zezwolenie na prac\u0119)",
                visaTypeLong: "National D-Type Work Visa (Schengen Valid)",
                processing: "3\u20136 Months",
                processingNote: "Approx.",
                contract: "1\u20133 Years",
                contractNote: "Renewable",
                residence: "Karta Pobytu",
                residenceNote: "TRC",
                jobCategories:
                    "Warehouse & Logistics|Construction|Factory & Production|CE Drivers|Hospitality|Agriculture",
                applyCountry: "Poland",
                isActive: true,
                sortOrder: 1
            }
        ]
    };

    // ============================================================================
    // 2. TIER AUTO-SCALING MATH HELPER
    // ============================================================================
    function calculateScaledTiers(baseStartingPrice) {
        const base = Math.max(0, Number(baseStartingPrice) || 232000);
        return {
            sharingPrice: base,
            quadPrice: base + 16000,
            triplePrice: base + 36000,
            doublePrice: base + 63000
        };
    }

    function mergePageContent(baseContent, incomingContent) {
        const base = baseContent || DEFAULT_PAGE_CONTENT;
        const inc = incomingContent || {};
        const incHome = { ...(inc.home || {}) };
        if (
            !incHome.branch2Address ||
            incHome.stat1Number === "100%" ||
            incHome.stat4Number === "Blue Area" ||
            incHome.stat4Number === "24/7" ||
            (incHome.aboutHeading && incHome.aboutHeading.includes("Islamabad")) ||
            (incHome.heroBadge && incHome.heroBadge.includes("Islamabad")) ||
            (incHome.branch1Title && incHome.branch1Title.includes("Islamabad"))
        ) {
            Object.assign(incHome, DEFAULT_PAGE_CONTENT.home);
        }
        return {
            home: { ...DEFAULT_PAGE_CONTENT.home, ...(base.home || {}), ...incHome },
            umrah: { ...DEFAULT_PAGE_CONTENT.umrah, ...(base.umrah || {}), ...(inc.umrah || {}) },
            visas: { ...DEFAULT_PAGE_CONTENT.visas, ...(base.visas || {}), ...(inc.visas || {}) },
            calculator: { ...DEFAULT_PAGE_CONTENT.calculator, ...(base.calculator || {}), ...(inc.calculator || {}) },
            contact: { ...DEFAULT_PAGE_CONTENT.contact, ...(base.contact || {}), ...(inc.contact || {}) },
            workPermit: { ...DEFAULT_PAGE_CONTENT.workPermit, ...(base.workPermit || {}), ...(inc.workPermit || {}) }
        };
    }

    // ============================================================================
    // 3. DUAL-ENGINE DATABASE & AUTH LAYER (FIREBASE + LOCAL REAL-TIME SYNC)
    // ============================================================================

    const STORAGE_KEYS = {
        FIREBASE_CONFIG: "zakir_firebase_config_v1",
        SITE_CONFIG: "zakir_db_site_config_v1",
        SPECIAL_DEALS: "zakir_db_special_deals_v1",
        UMRAH_PACKAGES: "zakir_db_umrah_packages_v1",
        VISA_SERVICES: "zakir_db_visa_services_v1",
        WORK_PERMITS: "zakir_db_work_permits_v1",
        WORK_PERMIT_PROGRAMMES: "zakir_db_work_permit_programmes_v1",
        ENQUIRIES: "zakir_db_enquiries_v1",
        AUTH_SESSION: "zakir_auth_session_v1",
        LOCAL_ADMIN_PASS: "zakir_db_local_admin_pass_v1"
    };

    class ZakirBackendService {
        constructor() {
            this.mode = "local-realtime";
            this.app = null;
            this.auth = null;
            this.db = null;
            this.storage = null;

            this.listeners = {
                site_config: new Set(),
                special_deals: new Set(),
                umrah_packages: new Set(),
                visa_services: new Set(),
                work_permits: new Set(),
                work_permit_programmes: new Set(),
                enquiries: new Set(),
                auth: new Set(),
                // Connection-mode listeners: notified whenever the backend
                // switches between "firebase" and "local-realtime", so the
                // admin badge always shows the real connection state.
                mode: new Set()
            };

            this.firebaseUnsubscribes = [];

            try {
                this.channel =
                    typeof BroadcastChannel !== "undefined"
                        ? new BroadcastChannel("zakir_travels_realtime_sync")
                        : null;
                if (this.channel) {
                    this.channel.onmessage = (event) => {
                        const data = event.data || {};
                        if (data.type === "DB_UPDATED") {
                            this._notifyLocalListeners();
                        } else if (data.type === "AUTH_UPDATED") {
                            this._notifyAuthListeners();
                        }
                    };
                }
            } catch (_) {
                this.channel = null;
            }

            window.addEventListener("storage", (e) => {
                if (
                    e.key === STORAGE_KEYS.SITE_CONFIG ||
                    e.key === STORAGE_KEYS.SPECIAL_DEALS ||
                    e.key === STORAGE_KEYS.UMRAH_PACKAGES ||
                    e.key === STORAGE_KEYS.VISA_SERVICES ||
                    e.key === STORAGE_KEYS.WORK_PERMITS ||
                    e.key === STORAGE_KEYS.WORK_PERMIT_PROGRAMMES ||
                    e.key === STORAGE_KEYS.ENQUIRIES
                ) {
                    this._notifyLocalListeners();
                } else if (e.key === STORAGE_KEYS.AUTH_SESSION) {
                    this._notifyAuthListeners();
                }
            });

            this._ensureLocalSeed();
            this._tryInitializeFirebase();
        }

        _ensureLocalSeed() {
            try {
                if (!localStorage.getItem(STORAGE_KEYS.SITE_CONFIG)) {
                    localStorage.setItem(
                        STORAGE_KEYS.SITE_CONFIG,
                        JSON.stringify(FLYER_DEFAULTS.site_config.main_settings)
                    );
                }
                if (!localStorage.getItem(STORAGE_KEYS.SPECIAL_DEALS)) {
                    const cfg = this.getLocalSiteConfig();
                    const initialDeal = {
                        ...DEFAULT_PRIMARY_DEAL,
                        ...(cfg.spotlight || {}),
                        id: "deal_jan_umrah_2026",
                        isPrimary: true,
                        isActive: true,
                        sortOrder: 1
                    };
                    localStorage.setItem(STORAGE_KEYS.SPECIAL_DEALS, JSON.stringify([initialDeal]));
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
                if (!localStorage.getItem(STORAGE_KEYS.WORK_PERMITS)) {
                    localStorage.setItem(
                        STORAGE_KEYS.WORK_PERMITS,
                        JSON.stringify(FLYER_DEFAULTS.work_permits)
                    );
                }
                if (!localStorage.getItem(STORAGE_KEYS.WORK_PERMIT_PROGRAMMES)) {
                    localStorage.setItem(
                        STORAGE_KEYS.WORK_PERMIT_PROGRAMMES,
                        JSON.stringify(FLYER_DEFAULTS.work_permit_programmes)
                    );
                }
                if (!localStorage.getItem(STORAGE_KEYS.ENQUIRIES)) {
                    localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify([]));
                }
            } catch (err) {
                console.warn("LocalStorage seed warning:", err);
            }
        }

        getFirebaseConfig() {
            try {
                if (window.ZAKIR_FIREBASE_CONFIG && window.ZAKIR_FIREBASE_CONFIG.apiKey) {
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
                try {
                    unsub();
                } catch (_) {}
            });
            this.firebaseUnsubscribes = [];
            this._setMode("local-realtime");
            this._notifyLocalListeners();
        }

        // Single place that changes the connection mode, so every change is
        // announced to mode listeners (the admin connection badge).
        _setMode(mode) {
            if (this.mode !== mode) {
                this.mode = mode;
                this._notifyModeListeners();
            }
        }

        _notifyModeListeners() {
            this.listeners.mode.forEach((cb) => cb(this.mode));
        }

        async _tryInitializeFirebase() {
            const config = this.getFirebaseConfig();
            if (!config || !window.firebase) {
                this._setMode("local-realtime");
                return;
            }

            try {
                if (!window.firebase.apps.length) {
                    this.app = window.firebase.initializeApp(config);
                } else {
                    this.app = window.firebase.app();
                }
                this.auth = window.firebase.auth();
                this.db = window.firebase.firestore();
                this.storage = null;
                if (window.firebase.storage) {
                    try {
                        this.storage = window.firebase.storage();
                    } catch (_) {
                        this.storage = null;
                    }
                }
                this._setMode("firebase");

                await this._ensureFirestoreSeed();
                this._bindFirestoreSnapshots();

                this.auth.onAuthStateChanged((user) => {
                    this._notifyAuthListeners(user);
                });
            } catch (err) {
                console.warn("Firebase initialization fell back to local-realtime mode:", err);
                this._setMode("local-realtime");
            }
        }

        async _ensureFirestoreSeed() {
            if (this.mode !== "firebase" || !this.db) return;
            try {
                const snap = await this.db.collection("site_config").doc("main_settings").get();
                if (!snap.exists) {
                    await this.resetToFlyerDefaults();
                }
            } catch (err) {
                console.warn("Could not check Firestore seed status:", err);
            }
        }

        _bindFirestoreSnapshots() {
            if (this.mode !== "firebase" || !this.db) return;

            this.firebaseUnsubscribes.forEach((u) => {
                try {
                    u();
                } catch (_) {}
            });
            this.firebaseUnsubscribes = [];

            const unsubConfig = this.db
                .collection("site_config")
                .doc("main_settings")
                .onSnapshot((snap) => {
                    if (snap.exists) {
                        const data = snap.data();
                        localStorage.setItem(STORAGE_KEYS.SITE_CONFIG, JSON.stringify(data));
                        const merged = this.getLocalSiteConfig();
                        this.listeners.site_config.forEach((cb) => cb(merged));
                    }
                });

            const unsubDeals = this.db
                .collection("special_deals")
                .orderBy("sortOrder", "asc")
                .onSnapshot((snap) => {
                    const list = [];
                    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
                    if (list.length) {
                        localStorage.setItem(STORAGE_KEYS.SPECIAL_DEALS, JSON.stringify(list));
                        this.listeners.special_deals.forEach((cb) => cb(list));
                    }
                });

            const unsubPkgs = this.db
                .collection("umrah_packages")
                .orderBy("sortOrder", "asc")
                .onSnapshot((snap) => {
                    const list = [];
                    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
                    localStorage.setItem(STORAGE_KEYS.UMRAH_PACKAGES, JSON.stringify(list));
                    this.listeners.umrah_packages.forEach((cb) => cb(list));
                });

            const unsubVisas = this.db
                .collection("visa_services")
                .orderBy("sortOrder", "asc")
                .onSnapshot((snap) => {
                    const list = [];
                    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
                    localStorage.setItem(STORAGE_KEYS.VISA_SERVICES, JSON.stringify(list));
                    this.listeners.visa_services.forEach((cb) => cb(list));
                });

            const unsubWorkPermits = this.db
                .collection("work_permits")
                .orderBy("sortOrder", "asc")
                .onSnapshot((snap) => {
                    const list = [];
                    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
                    localStorage.setItem(STORAGE_KEYS.WORK_PERMITS, JSON.stringify(list));
                    this.listeners.work_permits.forEach((cb) => cb(list));
                });

            const unsubWorkPermitProgrammes = this.db
                .collection("work_permit_programmes")
                .orderBy("sortOrder", "asc")
                .onSnapshot((snap) => {
                    const list = [];
                    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
                    localStorage.setItem(STORAGE_KEYS.WORK_PERMIT_PROGRAMMES, JSON.stringify(list));
                    this.listeners.work_permit_programmes.forEach((cb) => cb(list));
                });

            const unsubEnquiries = this.db
                .collection("enquiries")
                .orderBy("createdAt", "desc")
                .limit(500)
                .onSnapshot(
                    (snap) => {
                        const list = [];
                        snap.forEach((d) => list.push({ id: d.id, ...this._normaliseEnquiry(d.data()) }));
                        // Keep locally-saved leads that have not synced yet
                        // (e.g. a Firestore write was rejected) — a snapshot
                        // must never wipe an unsynced lead.
                        const pending = this.getLocalEnquiries().filter((e) => e.syncPending);
                        pending.forEach((p) => {
                            if (!list.some((e) => e.id === p.id)) list.push(p);
                        });
                        list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
                        localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(list));
                        this.listeners.enquiries.forEach((cb) => cb(list));
                    },
                    () => {
                        // If the enquiries query fails (e.g. rules not deployed yet),
                        // keep the local copy — submissions still work via local fallback.
                    }
                );

            this.firebaseUnsubscribes.push(
                unsubConfig,
                unsubDeals,
                unsubPkgs,
                unsubVisas,
                unsubWorkPermits,
                unsubWorkPermitProgrammes,
                unsubEnquiries
            );
        }

        // --------------------------------------------------------------------
        // SNAPSHOT LISTENERS
        // --------------------------------------------------------------------

        onSiteConfigSnapshot(callback) {
            this.listeners.site_config.add(callback);
            callback(this.getLocalSiteConfig());
            return () => this.listeners.site_config.delete(callback);
        }

        onSpecialDealsSnapshot(callback) {
            this.listeners.special_deals.add(callback);
            callback(this.getLocalSpecialDeals());
            return () => this.listeners.special_deals.delete(callback);
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

        onWorkPermitsSnapshot(callback) {
            this.listeners.work_permits.add(callback);
            callback(this.getLocalWorkPermits());
            return () => this.listeners.work_permits.delete(callback);
        }

        onWorkPermitProgrammesSnapshot(callback) {
            this.listeners.work_permit_programmes.add(callback);
            callback(this.getLocalWorkPermitProgrammes());
            return () => this.listeners.work_permit_programmes.delete(callback);
        }

        onEnquiriesSnapshot(callback) {
            this.listeners.enquiries.add(callback);
            callback(this.getLocalEnquiries());
            return () => this.listeners.enquiries.delete(callback);
        }

        onAuthSnapshot(callback) {
            this.listeners.auth.add(callback);
            callback(this.getCurrentUser());
            return () => this.listeners.auth.delete(callback);
        }

        // Connection-mode subscription, same pattern as the other snapshots:
        // fires immediately with the current mode, then on every mode change.
        onModeSnapshot(callback) {
            this.listeners.mode.add(callback);
            callback(this.mode);
            return () => this.listeners.mode.delete(callback);
        }

        _notifyLocalListeners() {
            const siteConfig = this.getLocalSiteConfig();
            const deals = this.getLocalSpecialDeals();
            const packages = this.getLocalUmrahPackages();
            const visas = this.getLocalVisaServices();
            const workPermits = this.getLocalWorkPermits();
            const workPermitProgrammes = this.getLocalWorkPermitProgrammes();
            const enquiries = this.getLocalEnquiries();

            this.listeners.site_config.forEach((cb) => cb(siteConfig));
            this.listeners.special_deals.forEach((cb) => cb(deals));
            this.listeners.umrah_packages.forEach((cb) => cb(packages));
            this.listeners.visa_services.forEach((cb) => cb(visas));
            this.listeners.work_permits.forEach((cb) => cb(workPermits));
            this.listeners.work_permit_programmes.forEach((cb) => cb(workPermitProgrammes));
            this.listeners.enquiries.forEach((cb) => cb(enquiries));
        }

        _broadcastChange(type = "DB_UPDATED") {
            if (this.channel) {
                try {
                    this.channel.postMessage({ type, timestamp: Date.now() });
                } catch (_) {}
            }
        }

        // --------------------------------------------------------------------
        // GETTERS
        // --------------------------------------------------------------------

        getLocalSiteConfig() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.SITE_CONFIG);
                if (raw) {
                    const parsed = JSON.parse(raw);
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
                        },
                        pageContent: mergePageContent(DEFAULT_PAGE_CONTENT, parsed.pageContent)
                    };
                }
            } catch (e) {
                console.error("Error reading site_config:", e);
            }
            return JSON.parse(JSON.stringify(FLYER_DEFAULTS.site_config.main_settings));
        }

        getLocalSpecialDeals() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.SPECIAL_DEALS);
                if (raw) {
                    const list = JSON.parse(raw);
                    if (Array.isArray(list) && list.length > 0) {
                        return [...list]
                            .map((d) => ({
                                ...DEFAULT_PRIMARY_DEAL,
                                ...d,
                                servicesIncluded: {
                                    ...DEFAULT_PRIMARY_DEAL.servicesIncluded,
                                    ...(d.servicesIncluded || {})
                                }
                            }))
                            .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
                    }
                }
            } catch (e) {
                console.error("Error reading special_deals:", e);
            }
            return JSON.parse(JSON.stringify(FLYER_DEFAULTS.special_deals));
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

        getLocalWorkPermits() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.WORK_PERMITS);
                if (raw) {
                    const list = JSON.parse(raw);
                    return [...list].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
                }
            } catch (e) {
                console.error("Error reading work_permits:", e);
            }
            return JSON.parse(JSON.stringify(FLYER_DEFAULTS.work_permits));
        }

        getLocalWorkPermitProgrammes() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.WORK_PERMIT_PROGRAMMES);
                if (raw) {
                    const list = JSON.parse(raw);
                    return [...list].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
                }
            } catch (e) {
                console.error("Error reading work_permit_programmes:", e);
            }
            return JSON.parse(JSON.stringify(FLYER_DEFAULTS.work_permit_programmes));
        }

        // --------------------------------------------------------------------
        // ENQUIRIES (LEAD CAPTURE)
        // Every public form saves here first, then opens WhatsApp. Leads are
        // never wiped by resetToFlyerDefaults(). LocalStorage is the fallback
        // when Firebase is offline or rules are not deployed yet; Firestore
        // is the source of truth when it is available.
        // --------------------------------------------------------------------

        _normaliseEnquiry(data) {
            const d = data || {};
            let createdAt = d.createdAt;
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
                createdAt,
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
        }

        getLocalEnquiries() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.ENQUIRIES);
                if (raw) {
                    const list = JSON.parse(raw);
                    if (Array.isArray(list)) {
                        return list
                            .map((e) => this._normaliseEnquiry(e))
                            .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
                    }
                }
            } catch (e) {
                console.error("Error reading enquiries:", e);
            }
            return [];
        }

        async saveEnquiry(data) {
            const clean = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
            const name = clean(data && data.name, 100);
            const phone = clean(data && data.phone, 30);
            if (!name || !phone) {
                throw new Error("Enquiry needs a name and a phone number.");
            }
            const record = this._normaliseEnquiry({
                id: `enq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                createdAt: new Date().toISOString(),
                status: "new",
                source: clean(data.source, 50) || "website",
                service: clean(data.service, 120) || "General enquiry",
                name,
                phone,
                details: clean(data.details, 1000),
                whatsappNumber: clean(data.whatsappNumber, 20),
                whatsappSent: Boolean(data.whatsappSent),
                syncPending: false
            });

            const list = this.getLocalEnquiries();
            list.unshift(record);
            localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(list.slice(0, 500)));
            this.listeners.enquiries.forEach((cb) => cb(this.getLocalEnquiries()));
            this._broadcastChange("DB_UPDATED");

            if (this.mode === "firebase" && this.db) {
                try {
                    const { syncPending, ...firestoreRecord } = record;
                    await this.db.collection("enquiries").doc(record.id).set(firestoreRecord);
                    record.synced = true;
                } catch (err) {
                    // Keep the local copy and flag it — the admin can still see
                    // it on this device, and it will retry on the next save.
                    console.warn("Enquiry saved locally, Firestore sync failed:", err);
                    const pending = this.getLocalEnquiries();
                    const idx = pending.findIndex((e) => e.id === record.id);
                    if (idx !== -1) {
                        pending[idx].syncPending = true;
                        localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(pending));
                    }
                    record.syncPending = true;
                    record.synced = false;
                }
            } else {
                record.syncPending = true;
                record.synced = false;
                const pending = this.getLocalEnquiries();
                const idx = pending.findIndex((e) => e.id === record.id);
                if (idx !== -1) {
                    pending[idx].syncPending = true;
                    localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(pending));
                }
            }
            return record;
        }

        async updateEnquiry(enquiryId, patch) {
            const allowedStatus = ["new", "contacted", "booked", "closed"];
            const cleanPatch = {};
            if (patch.status && allowedStatus.includes(patch.status)) cleanPatch.status = patch.status;
            if (typeof patch.whatsappSent === "boolean") cleanPatch.whatsappSent = patch.whatsappSent;
            if (typeof patch.details === "string") cleanPatch.details = patch.details.slice(0, 1000);
            if (!Object.keys(cleanPatch).length) return null;

            const list = this.getLocalEnquiries();
            const idx = list.findIndex((e) => e.id === enquiryId);
            if (idx === -1) throw new Error("Enquiry not found.");
            list[idx] = { ...list[idx], ...cleanPatch };
            localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(list));
            this.listeners.enquiries.forEach((cb) => cb(this.getLocalEnquiries()));
            this._broadcastChange("DB_UPDATED");

            // Result object: `synced` tells the caller (admin) whether the
            // change actually reached Firestore. Firestore errors throw.
            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("enquiries").doc(enquiryId).set(cleanPatch, { merge: true });
            }
            return { synced, enquiry: list[idx] };
        }

        async deleteEnquiry(enquiryId) {
            const list = this.getLocalEnquiries().filter((e) => e.id !== enquiryId);
            localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(list));
            this.listeners.enquiries.forEach((cb) => cb(this.getLocalEnquiries()));
            this._broadcastChange("DB_UPDATED");
            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("enquiries").doc(enquiryId).delete();
            }
            return { synced };
        }

        // --------------------------------------------------------------------
        // MUTATIONS: SPECIAL FLYER DEALS (FULL CRUD + PRIMARY SYNC)
        // --------------------------------------------------------------------

        async saveSpecialDeal(dealData) {
            const list = this.getLocalSpecialDeals();
            const cleanPrice = Number(dealData.startingPrice);
            if (!cleanPrice || cleanPrice <= 0) {
                throw new Error("Special deal starting price must be greater than 0 PKR.");
            }

            let targetDeal;
            if (dealData.id) {
                const idx = list.findIndex((d) => d.id === dealData.id);
                if (idx !== -1) {
                    targetDeal = {
                        ...list[idx],
                        ...dealData,
                        startingPrice: cleanPrice,
                        servicesIncluded: {
                            ...(list[idx].servicesIncluded || DEFAULT_PRIMARY_DEAL.servicesIncluded),
                            ...(dealData.servicesIncluded || {})
                        },
                        sortOrder: Number(dealData.sortOrder ?? list[idx].sortOrder ?? idx + 1)
                    };
                    list[idx] = targetDeal;
                }
            }

            if (!targetDeal) {
                const newId = dealData.id || `deal_${Date.now()}`;
                targetDeal = {
                    ...DEFAULT_PRIMARY_DEAL,
                    ...dealData,
                    id: newId,
                    startingPrice: cleanPrice,
                    servicesIncluded: {
                        ...DEFAULT_PRIMARY_DEAL.servicesIncluded,
                        ...(dealData.servicesIncluded || {})
                    },
                    isPrimary: list.length === 0 ? true : Boolean(dealData.isPrimary),
                    isActive: dealData.isActive !== undefined ? Boolean(dealData.isActive) : true,
                    sortOrder: Number(dealData.sortOrder ?? list.length + 1)
                };
                list.push(targetDeal);
            }

            if (targetDeal.isPrimary) {
                list.forEach((d) => {
                    if (d.id !== targetDeal.id) d.isPrimary = false;
                });
            } else if (!list.some((d) => d.isPrimary)) {
                list[0].isPrimary = true;
            }

            localStorage.setItem(STORAGE_KEYS.SPECIAL_DEALS, JSON.stringify(list));

            // Sync primary deal with site_config.spotlight & calculatorRates
            const primaryDeal = list.find((d) => d.isPrimary) || list[0];
            if (primaryDeal) {
                await this.updateSiteConfig(
                    {
                        spotlight: { ...primaryDeal }
                    },
                    { skipDealSync: true }
                );
            } else {
                this._notifyLocalListeners();
                this._broadcastChange("DB_UPDATED");
            }

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("special_deals").doc(targetDeal.id).set(targetDeal, { merge: true });
            }

            return { synced, deal: targetDeal };
        }

        async deleteSpecialDeal(dealId) {
            let list = this.getLocalSpecialDeals();
            if (list.length <= 1) {
                throw new Error("At least one Special Flyer Deal must remain. You can edit or hide it instead.");
            }
            list = list.filter((d) => d.id !== dealId);
            if (!list.some((d) => d.isPrimary) && list.length > 0) {
                list[0].isPrimary = true;
            }

            localStorage.setItem(STORAGE_KEYS.SPECIAL_DEALS, JSON.stringify(list));
            const primaryDeal = list.find((d) => d.isPrimary) || list[0];
            if (primaryDeal) {
                await this.updateSiteConfig({ spotlight: { ...primaryDeal } }, { skipDealSync: true });
            } else {
                this._notifyLocalListeners();
                this._broadcastChange("DB_UPDATED");
            }

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("special_deals").doc(dealId).delete();
            }
            return { synced };
        }

        async reorderSpecialDeal(dealId, direction) {
            const list = this.getLocalSpecialDeals();
            const idx = list.findIndex((d) => d.id === dealId);
            if (idx === -1) return;
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= list.length) return;

            const temp = list[idx];
            list[idx] = list[swapIdx];
            list[swapIdx] = temp;

            list.forEach((item, index) => {
                item.sortOrder = index + 1;
            });

            localStorage.setItem(STORAGE_KEYS.SPECIAL_DEALS, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                const batch = this.db.batch();
                list.forEach((item) => {
                    batch.set(this.db.collection("special_deals").doc(item.id), item, { merge: true });
                });
                await batch.commit();
            }
            return { synced };
        }

        async duplicateSpecialDeal(dealId) {
            const list = this.getLocalSpecialDeals();
            const orig = list.find((d) => d.id === dealId);
            if (!orig) return null;

            const copy = {
                ...JSON.parse(JSON.stringify(orig)),
                id: `deal_${Date.now()}`,
                monthLabel: `${orig.monthLabel} (Copy)`,
                isPrimary: false,
                isActive: true,
                sortOrder: list.length + 1
            };
            return this.saveSpecialDeal(copy);
        }

        // --------------------------------------------------------------------
        // MUTATIONS: SITE CONFIG & 10-SECOND QUICK UPDATE
        // --------------------------------------------------------------------

        async updateSiteConfig(partialOrFullConfig, options = {}) {
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
                pageContent: mergePageContent(current.pageContent, partialOrFullConfig.pageContent),
                updatedAt: new Date().toISOString()
            };

            if (
                updated.calculatorRates.autoCalculateTiers &&
                partialOrFullConfig.spotlight &&
                partialOrFullConfig.spotlight.startingPrice !== undefined
            ) {
                const scaled = calculateScaledTiers(updated.spotlight.startingPrice);
                updated.calculatorRates = {
                    ...updated.calculatorRates,
                    ...scaled
                };
            }

            localStorage.setItem(STORAGE_KEYS.SITE_CONFIG, JSON.stringify(updated));

            if (partialOrFullConfig.spotlight && !options.skipDealSync) {
                const deals = this.getLocalSpecialDeals();
                const primaryIdx = deals.findIndex((d) => d.isPrimary);
                const targetIdx = primaryIdx !== -1 ? primaryIdx : 0;
                if (deals[targetIdx]) {
                    deals[targetIdx] = {
                        ...deals[targetIdx],
                        ...updated.spotlight,
                        id: deals[targetIdx].id,
                        isPrimary: true
                    };
                    localStorage.setItem(STORAGE_KEYS.SPECIAL_DEALS, JSON.stringify(deals));
                }
            }

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

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("site_config").doc("main_settings").set(updated, { merge: true });
            }

            return { synced, config: updated };
        }

        // Re-read a document straight from the Firestore server (never
        // the local cache) and check the saved values are really there.
        // The admin uses this after a save to prove the change is
        // actually live on the website before saying so.
        // Returns { verified: true } or { verified: false, reason }.
        // Never throws: a failed read, a missing document, a value
        // mismatch or a timeout all come back as verified: false, so a
        // slow or flaky check can never break a save that succeeded.
        async verifyDocSaved(collection, docId, expected = {}, timeoutMs = 8000) {
            if (this.mode !== "firebase" || !this.db) {
                return { verified: false, reason: "offline" };
            }
            if (!collection || !docId) {
                return { verified: false, reason: "missing-doc" };
            }
            try {
                const docRef = this.db.collection(collection).doc(docId);
                const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
                const snap = await Promise.race([docRef.get({ source: "server" }), timeout]);
                if (!snap) {
                    return { verified: false, reason: "timeout" };
                }
                if (!snap.exists) {
                    return { verified: false, reason: "not-found" };
                }
                const data = snap.data() || {};
                for (const [key, value] of Object.entries(expected)) {
                    if (data[key] !== value) {
                        return { verified: false, reason: "mismatch", field: key };
                    }
                }
                return { verified: true };
            } catch (err) {
                return { verified: false, reason: (err && err.message) || "read-failed" };
            }
        }

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

        // --------------------------------------------------------------------
        // MUTATIONS: UMRAH PACKAGES & VISA SERVICES
        // --------------------------------------------------------------------

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

            if (targetPkg.isFeatured) {
                list.forEach((p) => {
                    if (p.id !== targetPkg.id) p.isFeatured = false;
                });
            }

            localStorage.setItem(STORAGE_KEYS.UMRAH_PACKAGES, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("umrah_packages").doc(targetPkg.id).set(targetPkg, { merge: true });
            }

            return { synced, package: targetPkg };
        }

        async deleteUmrahPackage(pkgId) {
            const list = this.getLocalUmrahPackages().filter((p) => p.id !== pkgId);
            localStorage.setItem(STORAGE_KEYS.UMRAH_PACKAGES, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("umrah_packages").doc(pkgId).delete();
            }
            return { synced };
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

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                const batch = this.db.batch();
                list.forEach((item) => {
                    batch.set(this.db.collection("umrah_packages").doc(item.id), item, { merge: true });
                });
                await batch.commit();
            }
            return { synced };
        }

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
                    imageUrl:
                        visaData.imageUrl ||
                        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
                    isActive: visaData.isActive !== undefined ? Boolean(visaData.isActive) : true,
                    sortOrder: Number(visaData.sortOrder ?? list.length + 1)
                };
                list.push(targetVisa);
            }

            localStorage.setItem(STORAGE_KEYS.VISA_SERVICES, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("visa_services").doc(targetVisa.id).set(targetVisa, { merge: true });
            }

            return { synced, visa: targetVisa };
        }

        async deleteVisaService(visaId) {
            const list = this.getLocalVisaServices().filter((v) => v.id !== visaId);
            localStorage.setItem(STORAGE_KEYS.VISA_SERVICES, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("visa_services").doc(visaId).delete();
            }
            return { synced };
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

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                const batch = this.db.batch();
                list.forEach((item) => {
                    batch.set(this.db.collection("visa_services").doc(item.id), item, { merge: true });
                });
                await batch.commit();
            }
            return { synced };
        }

        async saveWorkPermit(permitData) {
            const list = this.getLocalWorkPermits();
            const ticks = Array.isArray(permitData.ticks)
                ? permitData.ticks
                : String(permitData.ticks || "")
                      .split(/\r?\n|\|/)
                      .map((t) => t.trim())
                      .filter(Boolean);

            let targetPermit;
            if (permitData.id) {
                const idx = list.findIndex((p) => p.id === permitData.id);
                if (idx !== -1) {
                    targetPermit = {
                        ...list[idx],
                        ...permitData,
                        ticks,
                        sortOrder: Number(permitData.sortOrder ?? list[idx].sortOrder ?? idx + 1)
                    };
                    list[idx] = targetPermit;
                }
            }

            if (!targetPermit) {
                const newId = permitData.id || `wp_${Date.now()}`;
                targetPermit = {
                    id: newId,
                    countryName: permitData.countryName || "Country Name",
                    cardTitle: permitData.cardTitle || `${permitData.countryName || "Country"} Work Permit`,
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
                    ticks,
                    isFeatured: Boolean(permitData.isFeatured),
                    isActive: permitData.isActive !== undefined ? Boolean(permitData.isActive) : true,
                    sortOrder: Number(permitData.sortOrder ?? list.length + 1)
                };
                list.push(targetPermit);
            }

            localStorage.setItem(STORAGE_KEYS.WORK_PERMITS, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("work_permits").doc(targetPermit.id).set(targetPermit, { merge: true });
            }

            return { synced, permit: targetPermit };
        }

        async deleteWorkPermit(permitId) {
            const list = this.getLocalWorkPermits().filter((p) => p.id !== permitId);
            localStorage.setItem(STORAGE_KEYS.WORK_PERMITS, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("work_permits").doc(permitId).delete();
            }
            return { synced };
        }

        async reorderWorkPermit(permitId, direction) {
            const list = this.getLocalWorkPermits();
            const idx = list.findIndex((p) => p.id === permitId);
            if (idx === -1) return;
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= list.length) return;

            const temp = list[idx];
            list[idx] = list[swapIdx];
            list[swapIdx] = temp;

            list.forEach((item, index) => {
                item.sortOrder = index + 1;
            });

            localStorage.setItem(STORAGE_KEYS.WORK_PERMITS, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                const batch = this.db.batch();
                list.forEach((item) => {
                    batch.set(this.db.collection("work_permits").doc(item.id), item, { merge: true });
                });
                await batch.commit();
            }
            return { synced };
        }

        // --------------------------------------------------------------------
        // MUTATIONS: FEATURED WORK PERMIT PROGRAMMES (SHOWCASE CRUD)
        // --------------------------------------------------------------------

        async saveWorkPermitProgramme(programmeData) {
            const list = this.getLocalWorkPermitProgrammes();
            let targetProgramme;
            if (programmeData.id) {
                const idx = list.findIndex((p) => p.id === programmeData.id);
                if (idx !== -1) {
                    targetProgramme = {
                        ...list[idx],
                        ...programmeData,
                        sortOrder: Number(programmeData.sortOrder ?? list[idx].sortOrder ?? idx + 1)
                    };
                    list[idx] = targetProgramme;
                }
            }

            if (!targetProgramme) {
                const newId = programmeData.id || `wpp_${Date.now()}`;
                targetProgramme = {
                    ...(FLYER_DEFAULTS.work_permit_programmes[0] || {}),
                    ...programmeData,
                    id: newId,
                    isActive: programmeData.isActive !== undefined ? Boolean(programmeData.isActive) : true,
                    sortOrder: Number(programmeData.sortOrder ?? list.length + 1)
                };
                list.push(targetProgramme);
            }

            localStorage.setItem(STORAGE_KEYS.WORK_PERMIT_PROGRAMMES, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db
                    .collection("work_permit_programmes")
                    .doc(targetProgramme.id)
                    .set(targetProgramme, { merge: true });
            }

            return { synced, programme: targetProgramme };
        }

        async deleteWorkPermitProgramme(programmeId) {
            let list = this.getLocalWorkPermitProgrammes();
            if (list.length <= 1) {
                throw new Error("At least one Featured Work Permit Programme must remain. You can edit or hide it instead.");
            }
            list = list.filter((p) => p.id !== programmeId);
            localStorage.setItem(STORAGE_KEYS.WORK_PERMIT_PROGRAMMES, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                await this.db.collection("work_permit_programmes").doc(programmeId).delete();
            }
            return { synced };
        }

        async reorderWorkPermitProgramme(programmeId, direction) {
            const list = this.getLocalWorkPermitProgrammes();
            const idx = list.findIndex((p) => p.id === programmeId);
            if (idx === -1) return;
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= list.length) return;

            const temp = list[idx];
            list[idx] = list[swapIdx];
            list[swapIdx] = temp;

            list.forEach((item, index) => {
                item.sortOrder = index + 1;
            });

            localStorage.setItem(STORAGE_KEYS.WORK_PERMIT_PROGRAMMES, JSON.stringify(list));
            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                const batch = this.db.batch();
                list.forEach((item) => {
                    batch.set(this.db.collection("work_permit_programmes").doc(item.id), item, { merge: true });
                });
                await batch.commit();
            }
            return { synced };
        }

        async duplicateWorkPermitProgramme(programmeId) {
            const list = this.getLocalWorkPermitProgrammes();
            const orig = list.find((p) => p.id === programmeId);
            if (!orig) return null;

            const copy = {
                ...JSON.parse(JSON.stringify(orig)),
                id: `wpp_${Date.now()}`,
                countryName: `${orig.countryName} (Copy)`,
                shieldCountry: `${orig.shieldCountry} (COPY)`,
                isActive: true,
                sortOrder: list.length + 1
            };
            return this.saveWorkPermitProgramme(copy);
        }

        async uploadMediaFile(file, folder = "zakir_media") {
            if (!file) throw new Error("No file selected.");

            if (this.mode === "firebase" && this.storage) {
                // Give the Storage upload one bounded window (put + getting
                // its download URL). If it stalls, cancel the task so it
                // stops retrying in the background and fall through to the
                // DataURL fallback below instead of hanging forever.
                let task = null;
                let timeoutTimer = null;
                const timeout = new Promise((_, reject) => {
                    timeoutTimer = setTimeout(
                        () => reject(new Error(`Storage upload timed out after ${STORAGE_UPLOAD_TIMEOUT_MS / 1000}s`)),
                        STORAGE_UPLOAD_TIMEOUT_MS
                    );
                });
                try {
                    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                    const ref = this.storage.ref(`${folder}/${safeName}`);
                    task = ref.put(file);
                    const snap = await Promise.race([task, timeout]);
                    const url = await Promise.race([snap.ref.getDownloadURL(), timeout]);
                    clearTimeout(timeoutTimer);
                    return url;
                } catch (err) {
                    clearTimeout(timeoutTimer);
                    if (task) {
                        try {
                            task.cancel();
                        } catch (_) {
                            // Already finished or already cancelled — nothing to stop.
                        }
                    }
                    console.warn("Firebase Storage fallback to compressed DataURL:", err);
                }
            }

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error("Failed to read image file."));
                reader.onload = (e) => {
                    const img = new Image();
                    img.onerror = () => reject(new Error("Invalid image format."));
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        const maxDim = 1100;
                        let width = img.width;
                        let height = img.height;
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
                        resolve(canvas.toDataURL("image/jpeg", 0.82));
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        }

        async resetToFlyerDefaults() {
            const defaultConfig = JSON.parse(JSON.stringify(FLYER_DEFAULTS.site_config.main_settings));
            const defaultDeals = JSON.parse(JSON.stringify(FLYER_DEFAULTS.special_deals));
            const defaultPkgs = JSON.parse(JSON.stringify(FLYER_DEFAULTS.umrah_packages));
            const defaultVisas = JSON.parse(JSON.stringify(FLYER_DEFAULTS.visa_services));
            const defaultWorkPermits = JSON.parse(JSON.stringify(FLYER_DEFAULTS.work_permits));
            const defaultWorkPermitProgrammes = JSON.parse(
                JSON.stringify(FLYER_DEFAULTS.work_permit_programmes)
            );

            localStorage.setItem(STORAGE_KEYS.SITE_CONFIG, JSON.stringify(defaultConfig));
            localStorage.setItem(STORAGE_KEYS.SPECIAL_DEALS, JSON.stringify(defaultDeals));
            localStorage.setItem(STORAGE_KEYS.UMRAH_PACKAGES, JSON.stringify(defaultPkgs));
            localStorage.setItem(STORAGE_KEYS.VISA_SERVICES, JSON.stringify(defaultVisas));
            localStorage.setItem(STORAGE_KEYS.WORK_PERMITS, JSON.stringify(defaultWorkPermits));
            localStorage.setItem(
                STORAGE_KEYS.WORK_PERMIT_PROGRAMMES,
                JSON.stringify(defaultWorkPermitProgrammes)
            );

            this._notifyLocalListeners();
            this._broadcastChange("DB_UPDATED");

            const synced = this.mode === "firebase" && this.db;
            if (synced) {
                const batch = this.db.batch();
                batch.set(this.db.collection("site_config").doc("main_settings"), defaultConfig);

                const existingDeals = await this.db.collection("special_deals").get();
                existingDeals.forEach((d) => batch.delete(d.ref));
                defaultDeals.forEach((deal) => {
                    batch.set(this.db.collection("special_deals").doc(deal.id), deal);
                });

                const existingPkgs = await this.db.collection("umrah_packages").get();
                existingPkgs.forEach((d) => batch.delete(d.ref));
                defaultPkgs.forEach((pkg) => {
                    batch.set(this.db.collection("umrah_packages").doc(pkg.id), pkg);
                });

                const existingVisas = await this.db.collection("visa_services").get();
                existingVisas.forEach((d) => batch.delete(d.ref));
                defaultVisas.forEach((visa) => {
                    batch.set(this.db.collection("visa_services").doc(visa.id), visa);
                });

                const existingWorkPermits = await this.db.collection("work_permits").get();
                existingWorkPermits.forEach((d) => batch.delete(d.ref));
                defaultWorkPermits.forEach((permit) => {
                    batch.set(this.db.collection("work_permits").doc(permit.id), permit);
                });

                const existingWpProgs = await this.db.collection("work_permit_programmes").get();
                existingWpProgs.forEach((d) => batch.delete(d.ref));
                defaultWorkPermitProgrammes.forEach((prog) => {
                    batch.set(this.db.collection("work_permit_programmes").doc(prog.id), prog);
                });

                await batch.commit();
            }

            return {
                synced,
                defaults: {
                    site_config: defaultConfig,
                    special_deals: defaultDeals,
                    umrah_packages: defaultPkgs,
                    visa_services: defaultVisas,
                    work_permits: defaultWorkPermits,
                    work_permit_programmes: defaultWorkPermitProgrammes
                }
            };
        }

        hasLocalAdminPassphrase() {
            try {
                return Boolean(localStorage.getItem(STORAGE_KEYS.LOCAL_ADMIN_PASS));
            } catch (_) {
                return false;
            }
        }

        setLocalAdminPassphrase(passphrase) {
            const value = String(passphrase || "");
            if (value.length < 8) {
                throw new Error("Local admin passphrase must be at least 8 characters.");
            }
            localStorage.setItem(STORAGE_KEYS.LOCAL_ADMIN_PASS, value);
        }

        getCurrentUser() {
            if (this.mode === "firebase") {
                if (!this.auth || !this.auth.currentUser) return null;
                const u = this.auth.currentUser;
                return {
                    email: u.email,
                    displayName: u.displayName || u.email,
                    role: "Admin"
                };
            }
            if (!this.hasLocalAdminPassphrase()) return null;
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

            if (!cleanPass) {
                throw new Error("Please enter your password.");
            }

            if (this.mode === "firebase" && this.auth) {
                const cred = await this.auth.signInWithEmailAndPassword(cleanEmail, cleanPass);
                const userObj = {
                    email: cred.user.email,
                    displayName: cred.user.displayName || cred.user.email,
                    role: "Admin",
                    loggedInAt: new Date().toISOString()
                };
                localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(userObj));
                this._notifyAuthListeners(userObj);
                this._broadcastChange("AUTH_UPDATED");
                try {
                    await this._ensureFirestoreSeed();
                } catch (_) {}
                return userObj;
            }

            if (!this.hasLocalAdminPassphrase()) {
                this.setLocalAdminPassphrase(cleanPass);
            } else if (localStorage.getItem(STORAGE_KEYS.LOCAL_ADMIN_PASS) !== cleanPass) {
                throw new Error("Incorrect local admin passphrase.");
            }

            const sessionUser = {
                email: cleanEmail || "local-admin@zakirtravels.local",
                displayName: cleanEmail || "Local Admin",
                role: "Local Admin",
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
                    await this.auth.signOut();
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

    const zakirDB = new ZakirBackendService();

    window.formatPKR = formatPKR;
    window.cleanWhatsAppDigits = cleanWhatsAppDigits;
    window.DEFAULT_PRIMARY_DEAL = DEFAULT_PRIMARY_DEAL;
    window.DEFAULT_PAGE_CONTENT = DEFAULT_PAGE_CONTENT;
    window.FLYER_DEFAULTS = FLYER_DEFAULTS;
    window.calculateScaledTiers = calculateScaledTiers;
    window.zakirDB = zakirDB;
})(window);
