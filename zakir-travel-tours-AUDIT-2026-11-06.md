# Zakir Travel & Tours — Audit, 6 Nov 2026

Repo: https://github.com/majeedullah-41/zakir-travel-tours
Commit audited: 037e94a (single commit, 5 Nov 2026)
Stack: static HTML + Tailwind CDN, Firebase v10 compat (Firestore/Auth/Storage, project zakir-travels), Vercel config. No build step, no package.json, no tests.

JS syntax check (node --check): firebase-db.js, homepage-live.js, admin-portal.js, firebase-config.js all pass. All internal page anchors resolve. Local assets referenced all exist.

## What's actually built
- Pages: index, umrah-packages, visa-services, work-permit, contact, admin portal (/admin)
- Live content from Firestore: site_config, special_deals, umrah_packages, visa_services, work_permits, work_permit_programmes — with LocalStorage/BroadcastChannel fallback
- Admin CRUD for deals, Umrah packages, visas, work permits/programmes, page content, contacts/WhatsApp routing, media upload to Firebase Storage
- Umrah package estimator, hero/flight/visa inquiry forms, booking modal, flyer modal, FAQs/reviews section on homepage, team section on contact page

## P0 — Fix before calling it complete
1. **No lead capture.** Every form (submitModalInquiry, handleHeroSubmit, handleStandaloneFlightSubmit, handleEuropeWorkPermitSubmit, sendCalculatorToWhatsApp) only opens wa.me with a prefilled message. Nothing is saved to Firestore. There is no `enquiries`/`leads` collection, no Firestore rules for one, and no admin inbox. If a visitor closes WhatsApp, the lead is lost. Also: two WhatsApp numbers are in use (0349 0558345 x20, 0343 4159182 x1) — confirm which is primary.
2. **Stale / inconsistent content.** Primary deal is still "January & Upcoming", departure Jan 26, 2026, return Nov 10, 2026 in the seed deal (but Feb 09, 2026 in another seed copy), price PKR 232,000 hardcoded in several places. Placeholder phone "0300 1234567" is still in visa-services.html and work-permit.html placeholders.
3. **Team photos are placeholders.** 10 team slots (inam, sadiq, ceo, faisal, fida, hafizullah, mazhar, saad, salim, suliman) render initials only unless a photo URL is set in admin. No real team photos are in the repo.
4. **Deployment not verified.** firebase.json has Firestore + Storage rules only — no `hosting` section, so `firebase deploy` would not deploy the site. vercel.json has clean rewrites for /admin, /umrah, /visas, /contact but none for /work-permit (or /home). No 404.html, no robots.txt, no sitemap.xml. No live URL was in the repo to check.
5. **No SEO basics.** No `<meta name="description">`, no Open Graph / Twitter tags on any page, no sitemap/robots. Titles are good. Google Analytics measurementId (G-CRDXFTXY55) is in firebase-config.js but no gtag script is loaded, so analytics is likely not actually running.

## P1 — Should fix soon
6. **Repo hygiene.** No README.md, no .gitignore, no package.json. `index.html` and `zakir_travel_tours_homepage.html` are byte-identical (md5 2c6dca4cd72d99f0109e2ec376c8ec66) — editing one and deploying the other is an easy mistake. Whole project is one squashed commit, so there is no history to roll back to.
7. **Production performance.** Tailwind is loaded from CDN on all 7 pages (not recommended for production), plus Font Awesome, Google Fonts and the full Firebase compat SDKs on every page. Homepage is ~98 KB HTML, work-permit ~103 KB, with many Unsplash hotlinks and no local image optimisation noted.
8. **Admin / security hardening.** Admin access is a hardcoded UID (m7HIPZAuMRdO3IxAq4y6amGsdN53) plus a custom `admin` claim, duplicated in firestore.rules and storage.rules. There is a logout, but no password-reset flow in the admin UI. Firebase apiKey is committed in js/firebase-config.js (normal for Firebase web apps, but worth knowing it is public).

## P2 — Polish
9. Contact page has no standalone contact form — it reuses the booking modal. No confirmation/thank-you state after a WhatsApp handoff.
10. No automated tests, no CI, no staging vs production separation — Firebase config is a single hardcoded project.

## Suggested order
1. Lead capture (enquiries collection + rules + admin inbox + thank-you state) and fix the WhatsApp-number question
2. Refresh content/dates/prices, remove placeholder phone, add real team photos
3. Fix deployment: Vercel rewrite for work permits, 404 page, robots + sitemap, meta/OG tags, verify live URL
4. Repo clean-up: delete duplicate homepage file, add README + .gitignore
5. Performance: replace Tailwind CDN with a build step, optimise images
