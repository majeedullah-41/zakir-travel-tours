# Zakir Travel & Tours

Official website for **Zakir Travel & Tours** — Umrah packages, worldwide visa
services, air tickets and Europe work permits.

- **Head office:** 2nd Floor, Hayat Market, Matta, Swat
- **Branch:** Potohar Plaza, Blue Area, Islamabad
- **WhatsApp (primary):** +92 349 0558345 (Inam Khan) · +92 343 4159182 (Sadiq Ullah)

## Stack

- Static HTML + Tailwind CSS via CDN (no build step — see note below)
- Firebase v10 compat SDKs (Firestore / Auth / Storage), project `zakir-travels`
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
is stored in Firestore and edited from the admin portal — no code changes
needed for price/date updates. If Firestore is unavailable, pages fall back
to LocalStorage seed data.

## Lead capture (enquiries)

Every public form (homepage hero, booking modal, flight form, Umrah
calculator, work-permit assessment) saves the enquiry to the Firestore
`enquiries` collection **before** opening WhatsApp, so no lead is lost if a
visitor closes WhatsApp. Enquiries are listed in the admin portal under
tab **6. Enquiries** (status, search, WhatsApp/call reply, CSV export).

> **Firestore rules — important.** `service` is a **reserved word** in
> Firestore Rules, so the field must be accessed as
> `request.resource.data['service']` — writing `data.service` makes Firebase
> reject the whole rules file (error on the `is string` line). If you edit
> `firestore.rules`, keep the bracket notation.
>
> **Publishing rules.** Merging a PR never changes the live rules — after
> any rules change, paste the full `firestore.rules` (Firestore Database →
> Rules → Publish) **and** the full `storage.rules` (Storage → Rules →
> Publish) in the Firebase console. The `storage.rules` publish from the
> team-photo fix is still outstanding.
>
> **Admin access.** The portal's 7th tab, **Admin Access** (owner only),
> manages the `admin_users/allowed` allowlist of emails that may open the
> admin besides the owner. Only the owner (or a custom-claim admin) may
> change the allowlist — an allowlisted admin cannot add new admins.

## Deploy

### Vercel (the live site)

Push to `main` — Vercel rebuilds automatically. Clean URLs are defined in
`vercel.json`: `/admin`, `/umrah-packages`, `/visa-services`, `/work-permit`,
`/contact`, `/` (homepage). The old alias slugs are permanent (308)
redirects to the working URLs: `/umrah` → `/umrah-packages`,
`/visas` → `/visa-services`, `/home` → `/`, `/contact-us` → `/contact`.
`/calculator` and `/estimator` redirect (temporary) to
`/umrah-packages#package-estimator`. `firebase.json` only holds the
Firestore/Storage rules references; the site is **not** deployed via
Firebase Hosting.

### Firestore rules (after any rules change)

Firebase console → project `zakir-travels` → **Firestore Database → Rules** →
paste the full contents of `firestore.rules` → **Publish**. (Or
`firebase deploy --only firestore:rules` from a machine with the Firebase CLI.)

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
- **Team photos:** the team section on `contact.html` shows initials only
  until real photo URLs are added in the admin portal.
- **Deal dates/prices:** the featured deal is seeded as Jan 26 – Feb 09, 2026
  (14 nights, PKR 232,000). Update current dates/prices in the admin portal,
  not in code.
- **Tailwind build step:** Tailwind is still loaded from the CDN, which is
  not recommended for production. Switching to a build step needs a Vercel
  build configuration change and full visual testing — deliberately not done
  in this round.
