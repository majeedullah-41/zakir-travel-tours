-- ============================================================================
-- Zakir Travel & Tours — MySQL schema + seed data
--
-- Import into the EMPTY database created in Hostinger hPanel (phpMyAdmin ->
-- Import). Do NOT run CREATE DATABASE here: the database and user are created
-- in hPanel first (see api/README.md).
--
-- Charset utf8mb4 / utf8mb4_unicode_ci, engine InnoDB throughout.
-- String ids (VARCHAR(64)) match the ids the site already uses today
-- (deal_jan_umrah_2026, pkg_jan_saver, visa_ksa, wp_poland, wpp_poland, ...).
-- Each content table stores the full record object in `data` (JSON, camelCase
-- fields exactly as the site uses today) plus typed mirrors kept in sync by
-- the PHP API on every write (sort_order, is_active, prices, flags, FK).
--
-- Seed data is the repo's own FLYER_DEFAULTS (js/firebase-db.js) — the same
-- data the site shows today when Firestore is empty. This is NOT new business
-- data. Seed INSERTs are idempotent: re-importing re-applies the defaults
-- (INSERT ... ON DUPLICATE KEY UPDATE). No admin user is seeded here — the
-- owner account is created separately by db/seed_owner.php.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------------------
-- site_config — single row (id 'main') holding the homepage/site settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_config (
  id         VARCHAR(32)  NOT NULL,
  settings   JSON         NOT NULL,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- special_deals — homepage deals (mirrors: is_primary, starting_price)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS special_deals (
  id         VARCHAR(64)  NOT NULL,
  data       JSON         NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  is_active  TINYINT(1)  NOT NULL DEFAULT 1,
  is_primary    TINYINT(1)     DEFAULT 0,
  starting_price DECIMAL(12,2) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_special_deals_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- umrah_packages — Umrah packages (mirrors: price, is_featured)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS umrah_packages (
  id         VARCHAR(64)  NOT NULL,
  data       JSON         NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  is_active  TINYINT(1)  NOT NULL DEFAULT 1,
  price       DECIMAL(12,2) NULL,
  is_featured TINYINT(1)     DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_umrah_packages_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- visa_services — visa services (mirror: price_pkr)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visa_services (
  id         VARCHAR(64)  NOT NULL,
  data       JSON         NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  is_active  TINYINT(1)  NOT NULL DEFAULT 1,
  price_pkr DECIMAL(12,2) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_visa_services_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- work_permits — work-permit countries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_permits (
  id         VARCHAR(64)  NOT NULL,
  data       JSON         NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  is_active  TINYINT(1)  NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_work_permits_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- work_permit_programmes — work-permit programmes (mirror: work_permit_id FK)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_permit_programmes (
  id             VARCHAR(64)  NOT NULL,
  data           JSON         NOT NULL,
  sort_order     INT          NOT NULL DEFAULT 0,
  is_active      TINYINT(1)  NOT NULL DEFAULT 1,
  work_permit_id VARCHAR(64)  NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_work_permit_programmes_active_sort (is_active, sort_order),
  INDEX idx_work_permit_programmes_permit (work_permit_id),
  CONSTRAINT fk_wpp_work_permit FOREIGN KEY (work_permit_id)
    REFERENCES work_permits (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- enquiries — leads from the website forms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enquiries (
  id             VARCHAR(64)   NOT NULL,
  name           VARCHAR(100)  NOT NULL,
  phone          VARCHAR(30)   NOT NULL,
  service        VARCHAR(120)  NOT NULL DEFAULT 'General enquiry',
  source         VARCHAR(50)   NOT NULL DEFAULT 'website',
  details        TEXT          NULL,
  whatsapp_number VARCHAR(20)  NOT NULL DEFAULT '',
  whatsapp_sent  TINYINT(1)   NOT NULL DEFAULT 0,
  status         ENUM('new','contacted','booked','closed') NOT NULL DEFAULT 'new',
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_enquiries_status_created (status, created_at),
  INDEX idx_enquiries_service_created (service, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- admin_users — admin logins (owner + admins). Passwords are bcrypt hashes
-- created by db/seed_owner.php and the admin API; NEVER store plain text.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id            INT           NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('owner','admin') NOT NULL DEFAULT 'admin',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- rate_limits — login (5 failed / IP / 15 min) and enquiry (20 / IP / hour)
-- rate limiting. rate_key is e.g. 'login:1.2.3.4' or 'enquiry:1.2.3.4'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  rate_key     VARCHAR(128) NOT NULL,
  window_start DATETIME     NOT NULL,
  count        INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (rate_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA — from FLYER_DEFAULTS (js/firebase-db.js). Idempotent: re-importing
-- re-applies these defaults. No admin user is seeded here.
-- ============================================================================

-- site_config 'main'
INSERT INTO site_config (id, settings) VALUES ('main', '{"spotlight":{"id":"deal_jan_umrah_2026","monthLabel":"January & Upcoming","title":"UMRAH PACKAGE","subtitle":"Complete spiritual peace of mind with our all-inclusive featured Umrah package. Everything handled from Islamabad to Haramain.","badgeTag":"All-Inclusive Deal","startingPrice":232000,"priceUnit":"PER PERSON (SHARING)","departureDate":"Jan 26, 2026","departureSubtext":"(Weekly Batches)","returnDate":"Feb 09, 2026","duration":"14 Nights","leftFrameTitle":"Madinah Munawwarah","leftFrameBadge":"Ziyarat & Stay","madinahHotel":"Al Eiman Taibah / Similar (Near Markazia)","madinahImageUrl":"https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80","rightFrameTitle":"Makkah Mukarramah","rightFrameBadge":"Haram View Options","makkahHotel":"Emaar Al Khalil / Similar (Shuttle / Walk)","makkahImageUrl":"https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80","promotionalFlyerUrl":"","showFlyerOnHomepage":true,"servicesIncluded":{"roundTrip":true,"visa":true,"hotel":true,"transport":true},"isPrimary":true,"isActive":true,"sortOrder":1},"calculatorRates":{"sharingPrice":232000,"quadPrice":248000,"triplePrice":268000,"doublePrice":295000,"autoCalculateTiers":true,"dur10NightsOffset":-18000,"dur21NightsOffset":35000,"dur28NightsOffset":65000,"hotel3StarAddon":45000,"hotel5StarAddon":115000},"contacts":{"agencyName":"Zakir Travel & Tours","taglinePrimary":"Your Journey Our Priority","taglineSecondary":"Your Journey Our Responsibility","managerName":"Inam Khan (Manager)","managerPhone":"+92 349 0558345","managerWhatsApp":"923490558345","secondaryName":"Sadiq Ullah","secondaryPhone":"+92 343 4159182","secondaryWhatsApp":"923434159182","activeBookingWhatsApp":"923490558345","officeAddress":"2nd Floor, Hayat Market, Matta Swat, Khyber Pakhtunkhwa, Pakistan","officeHours":"Monday to Saturday: 9:30 AM – 8:00 PM (Sunday Closed / WhatsApp Support Active)","officeEmail":"info@zakirtravels.com / inam@zakirtravels.com","mapEmbedUrl":"https://maps.google.com/maps?q=Hayat+Market,+Matta,+Swat,+Pakistan&t=&z=16&ie=UTF8&iwloc=&output=embed"},"pageContent":{"home":{"heroBadge":"Swat\'s Trusted Travel & Umrah Partner","heroHeadingMain":"Your Spiritual & Global Journey,","heroDescription":"Headquartered on 2nd Floor, Hayat Market, Matta Swat with a branch office in Islamabad, Zakir Travel & Tours has proudly served over 100,000+ happy pilgrims and travelers. We specialize in Umrah & Ziyarat pilgrimages, domestic & international air ticketing, and worldwide visa consultancy.","aboutBadge":"About Zakir Travel & Tours","aboutHeading":"Swat\'s Trusted Partner for Spiritual & Worldwide Travel","aboutDescription":"Headquartered on 2nd Floor, Hayat Market, Matta Swat, Zakir Travel & Tours is a full-service travel agency dedicated to making your Umrah pilgrimage, global visa applications, and domestic & international air ticketing completely seamless, transparent, and stress-free — supported by our branch office in Islamabad.","missionTitle":"Our Mission & Promise","missionDesc":"To serve every pilgrim, family, and traveler with complete honesty, transparent guidance, and reliable arrangements from departure to safe return.","visionTitle":"Rooted in Swat, Connected Nationwide","visionDesc":"Serving families and pilgrims right from our Swat Matta Head Office with direct walk-in support, backed by our Islamabad branch and 24/7 WhatsApp assistance.","branch1Title":"Swat Head Office (Matta)","branch1Address":"2nd Floor, Hayat Market, Matta Swat, Khyber Pakhtunkhwa, Pakistan","branch1Desc":"Our central headquarters in Swat Matta providing families, elders, and travelers across Swat and Malakand Division with direct walk-in Umrah bookings, air ticketing, and visa consultancy.","branch2Title":"Islamabad Branch Office","branch2Address":"Office No. 7, Ground Floor, Potohar Plaza, Fazal-e-Haq Road, Blue Area, Islamabad","branch2Desc":"Our branch office in Blue Area, Islamabad supporting embassy documentation, flight departures, and travelers in the twin cities.","stat1Number":"100K+","stat1Label":"Happy Clients & Pilgrims Served","stat2Number":"24/7","stat2Label":"WhatsApp & On-Trip Support","stat3Number":"50+","stat3Label":"Global Airlines & Destinations","stat4Number":"Swat Matta","stat4Label":"Central Head Office (Matta Swat)","why1Title":"Transparent & Honest Guidance","why1Desc":"Zero hidden charges. Every travel plan shared at our Swat Matta Head Office includes clear, honest breakdowns of flights, visas, and hotels.","why2Title":"Direct Management Supervision","why2Desc":"Direct personal care from our management team (Inam Khan & Sadiq Ullah) from your first inquiry until you safely return home.","why3Title":"Fast-Track One-Window Service","why3Desc":"Electronic Saudi Umrah visas, worldwide tourist visa consultancy, hotel bookings, and instant airline e-tickets handled under one roof.","srv1Title":"Umrah & Ziyarat Pilgrimage","srv1Desc":"Economy, Star, and 5-Star VIP Umrah arrangements for individuals, families, and groups with verified Haramain hotels and guided Ziyarat.","srv2Title":"Domestic & International Air Ticketing","srv2Desc":"Lowest guaranteed fares on PIA, Saudia, Emirates, Qatar Airways, Airblue, Fly Jinnah, and all global airlines with instant e-ticket issuance.","srv3Title":"Worldwide Visa Consultancy","srv3Desc":"Expert tourist, visit, and e-visa documentation and file preparation for Saudi Arabia, UAE, Turkey, Malaysia, Thailand, UK, and Schengen.","srv4Title":"Haramain Hotels & Transport","srv4Desc":"Walking-distance Makkah & Madinah hotel reservations and comfortable private GMC, H1, Coaster, and luxury AC bus transport."},"umrah":{"heroBadge":"Direct Departures from Islamabad (ISB)","heroTitle":"All-Inclusive Umrah Packages","heroSubtitle":"Experience spiritual peace with complete ease. From verified walking-distance Makkah and Madinah hotels to fast-track Saudi Umrah visas, return airline tickets, luxury AC ground transport, and guided historical Ziyarat.","inc1Title":"Flights & Visas","inc1Bullets":"Direct or 1-stop return flight ticket from Islamabad | Electronic Saudi Umrah Visa processing | Mandatory Saudi medical health insurance | Airport handling & baggage support","inc2Title":"Haram Hotel Stays","inc2Bullets":"Verified Makkah hotel (walking or 24/7 shuttle) | Peaceful Madinah Munawwarah hotel near Markazia | Clean AC rooms with private attached baths | Choice of Sharing, Quad, Triple or Couple Double","inc3Title":"Transport & Ziyarat","inc3Bullets":"Jeddah / Madinah Airport pickup & drop-off | Inter-city Makkah to Madinah luxury AC transfer | Guided Ziyarat of Makkah sacred landmarks | Guided Ziyarat of Madinah holy sites","familyBannerTitle":"Traveling with Family, Elders, or a Private Group?","familyBannerDesc":"We customize hotel courtyard proximities, private GMC transport, and child discounts to match your family\'s exact budget."},"visas":{"heroBadge":"Fast Processing & Embassy File Preparation","heroTitle":"Worldwide Visas & Air Tickets","heroSubtitle":"Whether you need a rapid Saudi Umrah e-visa, UAE 30/60 days tourist visa, Turkey e-visa, or complex UK/USA/Schengen file preparation, our Islamabad visa desk delivers high approval rates with zero stress.","flightHeading":"Domestic & International Air Ticket Booking","flightDescription":"We issue official e-tickets for all domestic routes across Pakistan and international flights to Saudi Arabia, UAE, UK, Europe, USA, and Far East with instant WhatsApp confirmations.","flightBullets":"Special Umrah Group & Family Fares on PIA, Saudia & Emirates | Domestic Flights: Islamabad to Karachi, Quetta, Gilgit, Skardu | Flexible Date Change, Baggage Extension & Refund Assistance","partnerAirlines":"PIA (Pakistan International), Saudia Airlines, Emirates, Qatar Airways, Airblue, Serene Air, Fly Jinnah","step1Title":"Send Passports & Photos","step1Desc":"Share clear scans of your passport copy and white-background photographs via WhatsApp or drop them off at our Potohar Plaza Blue Area office.","step2Title":"Document Verification","step2Desc":"Our experts check eligibility, prepare embassy cover letters, book biometric appointments, and process your online electronic visa file.","step3Title":"Receive Approved Visa","step3Desc":"Receive your verified electronic PDF visa via WhatsApp and email, or collect your stamped physical passport from our office desk."},"calculator":{"heroBadge":"Live Real-Time Cost Estimator","heroTitle":"Umrah Package Budget Calculator","heroSubtitle":"Estimate your custom Umrah package in seconds! Select your stay duration, room sharing tier (Quad, Triple, Double, Sharing), hotel courtyard distance, and number of pilgrims.","includedBullets":"Direct or 1-Stop Return Airline Ticket from Islamabad | Umrah Visa with Comprehensive Saudi Health Insurance | Makkah & Madinah Hotel Accommodation + Transport | Dedicated Airport Pickups & Guided Ziyarat Tours"},"contact":{"heroBadge":"Head Office: Blue Area, Islamabad","heroTitle":"Contact Our Travel Desk","heroSubtitle":"We are always here to assist your spiritual journey and global travel. Visit our Blue Area office or speak directly with our manager and consultant via phone or WhatsApp."},"workPermit":{"heroBadge":"EU & Schengen Employment • Legal Work Permits","heroTitle":"Europe Work Permits","heroScript":"Build Your Career Abroad — The Legal Way.","heroSubtitle":"A work permit allows you to legally live and work in a foreign country. From our Head Office in Matta Swat, Zakir Travel & Tours guides you through every stage of European employment — consultation, eligibility, documents and embassy filing — for Poland and other leading EU destinations.","featuredScript":"Now Accepting Applications","featuredDesc":"Our currently active European work permit programme, with complete legal processing handled by our Swat Head Office team.","destinationsHeading":"Work Permit Programmes Across Europe","destinationsDesc":"Compare permit types, timelines and in-demand sectors. Availability depends on employer demand and quotas — contact our desk for the latest openings.","benefitsHeading":"Benefits of a European Work Permit","processHeading":"Your Path to Working in Europe","checklistHeading":"General Document Checklist","checklistDesc":"Typical documents required for most European work permit applications. Exact requirements vary by country and employer.","assessmentHeading":"Europe Work Permit Assessment","faqHeading":"Frequently Asked Questions"}},"updatedAt":"2026-11-07T08:12:11.982Z"}')
  ON DUPLICATE KEY UPDATE settings = VALUES(settings);

-- special_deals (1 row)
INSERT INTO special_deals (id, data, sort_order, is_active, is_primary, starting_price) VALUES ('deal_jan_umrah_2026', '{"id":"deal_jan_umrah_2026","monthLabel":"January & Upcoming","title":"UMRAH PACKAGE","subtitle":"Complete spiritual peace of mind with our all-inclusive featured Umrah package. Everything handled from Islamabad to Haramain.","badgeTag":"All-Inclusive Deal","startingPrice":232000,"priceUnit":"PER PERSON (SHARING)","departureDate":"Jan 26, 2026","departureSubtext":"(Weekly Batches)","returnDate":"Feb 09, 2026","duration":"14 Nights","leftFrameTitle":"Madinah Munawwarah","leftFrameBadge":"Ziyarat & Stay","madinahHotel":"Al Eiman Taibah / Similar (Near Markazia)","madinahImageUrl":"https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80","rightFrameTitle":"Makkah Mukarramah","rightFrameBadge":"Haram View Options","makkahHotel":"Emaar Al Khalil / Similar (Shuttle / Walk)","makkahImageUrl":"https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80","promotionalFlyerUrl":"","showFlyerOnHomepage":true,"servicesIncluded":{"roundTrip":true,"visa":true,"hotel":true,"transport":true},"isPrimary":true,"isActive":true,"sortOrder":1}', 1, 1, 1, 232000)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), is_primary = VALUES(is_primary), starting_price = VALUES(starting_price);

-- umrah_packages (4 rows)
INSERT INTO umrah_packages (id, data, sort_order, is_active, price, is_featured) VALUES ('pkg_jan_saver', '{"id":"pkg_jan_saver","title":"January Economy Saver Umrah","badgeText":"Flyer Special","price":232000,"roomType":"Sharing (Quad / Quint)","departureDate":"Jan 26, 2026","returnDate":"Feb 09, 2026","duration":"14 Nights / 15 Days","makkahHotelDist":"600m (24/7 Shuttle)","madinahHotelDist":"450m Walking Distance","services":["Return Air Ticket","Umrah E-Visa & Insurance","Hotel Stay","Luxury AC Transport"],"isFeatured":true,"isActive":true,"sortOrder":1}', 1, 1, 232000, 1)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), price = VALUES(price), is_featured = VALUES(is_featured);
INSERT INTO umrah_packages (id, data, sort_order, is_active, price, is_featured) VALUES ('pkg_3star_walking', '{"id":"pkg_3star_walking","title":"3-Star Plus Haram Walking Package","badgeText":"Most Popular","price":268000,"roomType":"Quad / Triple Sharing","departureDate":"Feb 02, 2026","returnDate":"Feb 16, 2026","duration":"14 Nights / 15 Days","makkahHotelDist":"350m Walking Distance","madinahHotelDist":"250m Near Masjid Nabawi","services":["Direct Return Flight","Umrah Visa & Insurance","3-Star Near Haram Hotels","Full Ziyarat & Transport"],"isFeatured":false,"isActive":true,"sortOrder":2}', 2, 1, 268000, 0)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), price = VALUES(price), is_featured = VALUES(is_featured);
INSERT INTO umrah_packages (id, data, sort_order, is_active, price, is_featured) VALUES ('pkg_short_10nights', '{"id":"pkg_short_10nights","title":"10-Nights Executive Quick Umrah","badgeText":"Short Stay","price":214000,"roomType":"Sharing / Family Rooms","departureDate":"Weekly Batches","returnDate":"Flexible Schedule","duration":"10 Nights / 11 Days","makkahHotelDist":"400m Walking Distance","madinahHotelDist":"300m Walking Distance","services":["Return Air Ticket","Fast E-Visa","Makkah & Madinah Hotels","Airport Pickup & Transport"],"isFeatured":false,"isActive":true,"sortOrder":3}', 3, 1, 214000, 0)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), price = VALUES(price), is_featured = VALUES(is_featured);
INSERT INTO umrah_packages (id, data, sort_order, is_active, price, is_featured) VALUES ('pkg_5star_vip', '{"id":"pkg_5star_vip","title":"5-Star VIP Clock Tower View","badgeText":"VIP Luxury","price":365000,"roomType":"Double / Couple Room","departureDate":"Custom Dates","returnDate":"Flexible Return","duration":"14 Nights / 15 Days","makkahHotelDist":"0m Haram Courtyard (5-Star)","madinahHotelDist":"100m Front Row Markazia","services":["Direct Saudi/PIA Flight","VIP Umrah Visa","5-Star Buffet Breakfast","Private GMC Ground Transport"],"isFeatured":false,"isActive":true,"sortOrder":4}', 4, 1, 365000, 0)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), price = VALUES(price), is_featured = VALUES(is_featured);

-- visa_services (6 rows)
INSERT INTO visa_services (id, data, sort_order, is_active, price_pkr) VALUES ('visa_ksa', '{"id":"visa_ksa","countryName":"Saudi Arabia","flagEmoji":"🇸🇦","visaType":"Umrah & Visit Visa","processingTime":"24-48 Hours","pricePKR":42000,"requirementsSummary":"Valid Passport (6+ Months), White Background Photo, CNIC Copy","imageUrl":"https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=600&q=80","isActive":true,"sortOrder":1}', 1, 1, 42000)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), price_pkr = VALUES(price_pkr);
INSERT INTO visa_services (id, data, sort_order, is_active, price_pkr) VALUES ('visa_uae', '{"id":"visa_uae","countryName":"Dubai / UAE","flagEmoji":"🇦🇪","visaType":"30 & 60 Days E-Visa","processingTime":"3-5 Working Days","pricePKR":34500,"requirementsSummary":"Passport Scan, CNIC Front/Back, Passport Size Photograph, Bank Statement","imageUrl":"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80","isActive":true,"sortOrder":2}', 2, 1, 34500)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), price_pkr = VALUES(price_pkr);
INSERT INTO visa_services (id, data, sort_order, is_active, price_pkr) VALUES ('visa_turkey', '{"id":"visa_turkey","countryName":"Turkey","flagEmoji":"🇹🇷","visaType":"Tourist Sticker / E-Visa","processingTime":"7-10 Working Days","pricePKR":48000,"requirementsSummary":"Original Passport, 6 Months Bank Statement, FRC, Hotel & Flight Reservation","imageUrl":"https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80","isActive":true,"sortOrder":3}', 3, 1, 48000)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), price_pkr = VALUES(price_pkr);
INSERT INTO visa_services (id, data, sort_order, is_active, price_pkr) VALUES ('visa_malaysia', '{"id":"visa_malaysia","countryName":"Malaysia & Thailand","flagEmoji":"🇲🇾","visaType":"Tourist E-Visa","processingTime":"3-4 Working Days","pricePKR":18500,"requirementsSummary":"Passport First Page Scan, Digital White Background Photo, Bank Statement","imageUrl":"https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=600&q=80","isActive":true,"sortOrder":4}', 4, 1, 18500)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), price_pkr = VALUES(price_pkr);
INSERT INTO visa_services (id, data, sort_order, is_active, price_pkr) VALUES ('visa_uk_schengen', '{"id":"visa_uk_schengen","countryName":"UK & Schengen Europe","flagEmoji":"🇬🇧","visaType":"Visit File & Appointment","processingTime":"15-21 Working Days","pricePKR":35000,"requirementsSummary":"Complete Visa Consultancy, Cover Letter, Appointment Scheduling & File Prep","imageUrl":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80","isActive":true,"sortOrder":5}', 5, 1, 35000)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), price_pkr = VALUES(price_pkr);
INSERT INTO visa_services (id, data, sort_order, is_active, price_pkr) VALUES ('visa_baku', '{"id":"visa_baku","countryName":"Azerbaijan (Baku)","flagEmoji":"🇦🇿","visaType":"ASAN Tourist E-Visa","processingTime":"3 Working Days","pricePKR":14500,"requirementsSummary":"Clear Passport Copy & CNIC Only — Fast Approval with Return Ticket Deals","imageUrl":"https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=600&q=80","isActive":true,"sortOrder":6}', 6, 1, 14500)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), price_pkr = VALUES(price_pkr);

-- work_permits (6 rows) — seeded BEFORE programmes (FK target)
INSERT INTO work_permits (id, data, sort_order, is_active) VALUES ('wp_poland', '{"id":"wp_poland","countryName":"Poland","cardTitle":"Poland Work Permit","flagClass":"flag-pl","tagText":"Applications Open","tagStyle":"emerald","timeline":"3–6 Months","permitType":"Type-A Work Permit","visaCode":"D-Visa","contract":"1–3 Years, Renewable","residence":"Karta Pobytu (TRC)","sectors":"Logistics, Factory, Construction","ticks":["Schengen Access","EU Labour Rights","Social Security (ZUS)"],"isFeatured":true,"isActive":true,"sortOrder":1}', 1, 1)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active);
INSERT INTO work_permits (id, data, sort_order, is_active) VALUES ('wp_romania', '{"id":"wp_romania","countryName":"Romania","cardTitle":"Romania Work Permit","flagClass":"flag-ro","tagText":"EU Member","tagStyle":"sky","timeline":"3–5 Months","permitType":"Work Authorisation (Aviz)","visaCode":"D/AM Visa","contract":"1 Year, Renewable","residence":"Residence Permit (IGI)","sectors":"Construction, HoReCa, Delivery","ticks":["Schengen Member","Employer Sponsored","Legal Contract"],"isFeatured":false,"isActive":true,"sortOrder":2}', 2, 1)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active);
INSERT INTO work_permits (id, data, sort_order, is_active) VALUES ('wp_croatia', '{"id":"wp_croatia","countryName":"Croatia","cardTitle":"Croatia Work Permit","flagClass":"flag-hr","tagText":"EU & Schengen","tagStyle":"sky","timeline":"2–4 Months","permitType":"Stay & Work Permit","visaCode":"D-Visa","contract":"Up to 3 Years","residence":"Temporary Stay (MUP)","sectors":"Construction, Tourism, Shipyards","ticks":["Schengen Access","Seasonal & Annual","Employer Sponsored"],"isFeatured":false,"isActive":true,"sortOrder":3}', 3, 1)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active);
INSERT INTO work_permits (id, data, sort_order, is_active) VALUES ('wp_hungary', '{"id":"wp_hungary","countryName":"Hungary","cardTitle":"Hungary Work Permit","flagClass":"flag-hu","tagText":"EU & Schengen","tagStyle":"sky","timeline":"2–4 Months","permitType":"Single Work & Residence","visaCode":"D-Visa","contract":"Up to 2 Years","residence":"Residence Permit Card","sectors":"Manufacturing, Logistics","ticks":["Schengen Access","Industrial Jobs","Legal Contract"],"isFeatured":false,"isActive":true,"sortOrder":4}', 4, 1)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active);
INSERT INTO work_permits (id, data, sort_order, is_active) VALUES ('wp_czech', '{"id":"wp_czech","countryName":"Czech Republic","cardTitle":"Czech Republic Work Permit","flagClass":"flag-cz","tagText":"EU & Schengen","tagStyle":"sky","timeline":"3–5 Months","permitType":"Employee Card","visaCode":"Long-Term","contract":"Up to 2 Years, Renewable","residence":"Combined Permit Card","sectors":"Automotive, Welding, Warehousing","ticks":["Schengen Access","Skilled Trades","Family Pathway"],"isFeatured":false,"isActive":true,"sortOrder":5}', 5, 1)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active);
INSERT INTO work_permits (id, data, sort_order, is_active) VALUES ('wp_portugal', '{"id":"wp_portugal","countryName":"Portugal","cardTitle":"Portugal Work Visa","flagClass":"flag-pt","tagText":"EU & Schengen","tagStyle":"sky","timeline":"3–6 Months","permitType":"Employment Work Visa","visaCode":"Type-D","contract":"1 Year+, Renewable","residence":"Residence Permit (AIMA)","sectors":"Agriculture, Hospitality, Construction","ticks":["Schengen Access","Residency Pathway","Family Reunion"],"isFeatured":false,"isActive":true,"sortOrder":6}', 6, 1)
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active);

-- work_permit_programmes (1 row) — work_permit_id resolved from
-- countryName matching a work_permits row (case-insensitive), else NULL.
INSERT INTO work_permit_programmes (id, data, sort_order, is_active, work_permit_id) VALUES ('wpp_poland', '{"id":"wpp_poland","countryName":"Poland","flagClass":"flag-pl","statusText":"Open","regionText":"EU & Schengen","leftImageUrl":"./assets/warsaw-poland.jpg","leftImageFallback":"https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=900&q=80","leftImageBadge":"Capital & Business Hub","leftCityTitle":"Warsaw","rightImageUrl":"./assets/krakow-wroclaw-poland.jpg","rightImageFallback":"https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=900&q=80","rightImageBadge":"Industry & Logistics","rightCityTitle":"Wrocław & Kraków","shieldLabel":"Work Permit","shieldCountry":"POLAND","shieldSub":"Type-A Permit + D-Visa","shieldStatus":"Applications Open","permitTypeLong":"Voivodeship Type-A Permit (Zezwolenie na pracę)","visaTypeLong":"National D-Type Work Visa (Schengen Valid)","processing":"3–6 Months","processingNote":"Approx.","contract":"1–3 Years","contractNote":"Renewable","residence":"Karta Pobytu","residenceNote":"TRC","jobCategories":"Warehouse & Logistics|Construction|Factory & Production|CE Drivers|Hospitality|Agriculture","applyCountry":"Poland","isActive":true,"sortOrder":1}', 1, 1, 'wp_poland')
  ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order), is_active = VALUES(is_active), work_permit_id = VALUES(work_permit_id);

-- End of schema + seed. Next: create .env from .env.example, then run
-- db/seed_owner.php once to create the owner login (see api/README.md).
