# Zakir Travel & Tours

Official website for **Zakir Travel & Tours** — Umrah packages, worldwide visa
services, air tickets and Europe work permits.

- **Head office:** 2nd Floor, Hayat Market, Matta, Swat
- **Branch:** Potohar Plaza, Blue Area, Islamabad
- **WhatsApp (primary):** +92 349 0558345 (Inam Khan) · +92 343 4159182 (Sadiq Ullah)

## Stack

- Static HTML + Tailwind CSS via CDN (no build step — see note below)
- Data is local-only for testing: content lives in the browser's
  LocalStorage, seeded with built-in defaults. There is no shared database
  and no sync between devices or browsers — an edit made in the admin portal
  on one device does not appear on another.
- Admin login is a local per-browser passphrase (no accounts, no cloud login).
- Deployed on Vercel (`vercel.json` — clean-URL rewrites, permanent alias
  redirects, cache + security headers)
- Google Analytics measurement ID `G-CRDXFTXY55` (gtag.js snippet in every page)

## Pages

| Page | File |
|---|---|
| Homepage | `index.html` |
| Umrah packages | `umrah-packages.html` (`/umrah-packages`) |
| Visa services | `visa-services.html` (`/visa-services`) |
| Work permits | `work-permit.html` (`/work-permit`) |
| Contact / team | `contact.html` (`/contact`) |
| Admin portal (mobile) | `admin.html` (`/admin`) |
| Not found | `404.html` |

Live content (deals, Umrah packages, visas, work permits, site text, contacts)
is stored in the browser's LocalStorage and edited from the admin portal — no
code changes needed for price/date updates. It starts from built-in seed
defaults. Because there is no shared database yet, changes are visible only
in the browser they were made in.

## Lead capture (enquiries)

Every public form (homepage hero, booking modal, flight form, Umrah
calculator, work-permit assessment) saves the enquiry locally in the
visitor's browser (LocalStorage) **before** opening WhatsApp, so no lead is
lost if a visitor closes WhatsApp. Enquiries are listed in the admin portal
under tab **6. Enquiries** (status, search, WhatsApp/call reply, CSV
export) — but only in the same browser the enquiry was made in. There is no
shared enquiries inbox until the PHP backend is live (see below).

> **Admin access.** The portal is protected by a local passphrase stored in
> the browser. There is no shared account list — a passphrase set on one
> device does not carry over to another.

## Backend (PHP + MySQL — ready, dormant until hosting is bought)

A PHP + MySQL backend is ready in `api/` (PHP API) and `db/` (`schema.sql`,
`seed_owner.php`), with `js/api-db.js` as the matching data layer. It is
dormant: Vercel serves static files only and cannot run PHP or MySQL, so
merging it changes nothing on the live site.

It activates only after Hostinger hosting is bought and the backend is
deployed there. Then a browser is switched to the API backend with the
`localStorage` flag:

```js
localStorage.setItem('zakir_backend', 'api')
```

Reload the page after setting it; `localStorage.removeItem('zakir_backend')`
(and a reload) switches that browser back to the local-only data layer.
Until hosting is bought, everything runs on the local-only layer above.

## Deploy

### Vercel (the live site)

Push to `main` — Vercel rebuilds automatically. Clean URLs are defined in
`vercel.json`: `/admin`, `/umrah-packages`, `/visa-services`, `/work-permit`,
`/contact`, `/` (homepage). The old alias slugs are permanent (308)
redirects to the working URLs: `/umrah` → `/umrah-packages`,
`/visas` → `/visa-services`, `/home` → `/`, `/contact-us` → `/contact`.
`/calculator` and `/estimator` redirect (temporary) to
`/umrah-packages#package-estimator`.

## Local preview

No build step — open the folder with any static server, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Still to do (owner decisions needed)

- **Live domain:** the live site is `https://zakir-travel-tours.vercel.app/`
  (Vercel-hosted, no custom domain bought). `robots.txt`, `sitemap.xml` and
  the Open Graph tags all use this URL. If a custom domain is bought later,
  search for `zakir-travel-tours.vercel.app` and replace it.
- **Shared data / hosting:** there is no shared database until Hostinger
  hosting is bought and the PHP backend in `api/` + `db/` is deployed there.
  Until then, admin edits and enquiries stay in the browser they were made
  in and do not sync between devices.
- **Team photos:** the team section on `contact.html` shows initials only
  until real photo URLs are added in the admin portal.
- **Deal dates/prices:** the featured deal is seeded as Jan 26 – Feb 09, 2026
  (14 nights, PKR 232,000). Update current dates/prices in the admin portal,
  not in code.
- **Tailwind build step:** Tailwind is still loaded from the CDN, which is
  not recommended for production. Switching to a build step needs a Vercel
  build configuration change and full visual testing — deliberately not done
  in this round.
