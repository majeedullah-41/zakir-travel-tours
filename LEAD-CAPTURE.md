# Lead capture — what changed

## What it does now
Every form on the site saves an enquiry **before** opening WhatsApp:
- Homepage hero (Umrah / Flights / Visa)
- Booking modal (all pages)
- Standalone flight form (visa-services page)
- Europe work-permit assessment (work-permit page)
- Umrah calculator (saved as an anonymous estimate — it has no name/phone fields)

Visitors see a "Thanks — your enquiry is saved. Opening WhatsApp…" message.
If saving fails for any reason, WhatsApp still opens — the save never blocks the chat.

## Where leads go
- Firestore collection **`enquiries`** — fields: id, createdAt (ISO), status
  (`new` / `contacted` / `booked` / `closed`), source, service, name, phone,
  details, whatsappNumber, whatsappSent.
- Admin portal has a new **6. Enquiries** tab: newest first, filter by status,
  search by name/phone/service, change status, reply on WhatsApp, call, delete,
  export CSV. The tab badge shows the count of new enquiries.
- If Firebase is offline or the rules are not deployed yet, enquiries are kept
  in the browser's local storage and flagged "Not synced yet" in admin — they
  are never silently lost, and a Firestore snapshot never wipes an unsynced lead.
- `resetToFlyerDefaults()` does **not** delete enquiries.

## Files changed (5)
- `firestore.rules` — new `enquiries` rules (see below)
- `js/firebase-db.js` — `saveEnquiry` / `getLocalEnquiries` / `updateEnquiry` /
  `deleteEnquiry` / `onEnquiriesSnapshot`, with local fallback
- `js/homepage-live.js` — all submit handlers save first, then open WhatsApp
- `js/admin-portal.js` — Enquiries inbox tab
- `work-permit.html` — assessment form saves first, then opens WhatsApp

The plain "WhatsApp" buttons on work-permit country cards were left as-is —
they carry no name/phone, so there is nothing to save.

## Deploy — do this, or enquiries will only save locally
1. Copy these files back into your repo (or unzip this project over it) and push to GitHub.
2. Deploy the Firestore rules. Either:
   - Firebase console → Firestore Database → Rules → paste in `firestore.rules` → Publish, or
   - `firebase deploy --only firestore:rules`
3. Test: submit any form on the live site, then open `/admin` → **6. Enquiries**.
   The new lead should appear with status `new`.

## Rules summary
- Public may **create** an enquiry only, with validation (name 1–100 chars,
  phone 7–30, service 1–120, source 1–50, status must be `new`, details ≤ 1000).
- Only admins may **read, update or delete** enquiries — leads are not public.
