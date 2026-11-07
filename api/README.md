# Zakir Travel & Tours — PHP + MySQL backend

This folder is the PHP API that replaces Firebase as the site's backend. The
public pages and the admin portal keep calling the same `zakirDB` methods — the
data layer just talks to this API instead of Firestore (see `js/api-db.js` and
the switch described in the migration plan).

**Default behaviour: the live site still uses Firebase.** The API only takes
over when `localStorage` key `zakir_backend` is set to `'api'`. Merging the
backend code does not change the live site.

## What lives here

| File | What it does |
|---|---|
| `api/index.php` | Front controller + router |
| `api/config.php` | Loads `.env`, exposes settings |
| `api/db.php` | PDO connection |
| `api/helpers.php` | JSON envelope, validation, errors |
| `api/auth.php` | Sessions, `requireAuth()` / `requireOwner()` |
| `api/routes/*.php` | Endpoint handlers (public, enquiries, content, uploads, auth, admin users) |
| `api/seed_defaults.php` | The repo's own `FLYER_DEFAULTS` as a PHP array (used by reset-defaults). Generated — do not hand-edit. |
| `db/schema.sql` | MySQL schema (9 tables) + seed data |
| `db/seed_owner.php` | CLI-only script that creates the first (owner) admin account |
| `.env.example` | Placeholder settings — copy to `.env` and fill in |

## Setup on Hostinger Single (hPanel)

Do these steps **in order**. Nothing here needs the command line except step 5,
which has a no-SSH alternative.

### 1. Buy the Single plan and create the database

- In hPanel go to **Databases → MySQL Databases**.
- Create a database, e.g. `zakir_travels` (Hostinger prefixes it with your
  username, e.g. `u123456789_zakir_travels` — use the full name it shows).
- Create a MySQL user and give it **all privileges on that database**.
- Write down: database name, username, password, host (usually `localhost`).
- The Single plan includes MySQL — no extra purchase is needed for the database.

### 2. Upload the files

- Upload the whole project (all files, including `api/`, `db/`, `js/`, the HTML
  pages) into `public_html/` — by File Manager upload or FTP.
- Do **not** upload `.env` from your computer unless it already has the real
  values; create it on the server in step 3 instead.

### 3. Create `.env` on the server

- In File Manager, copy `.env.example` to `.env` (same folder — the project
  root, next to `index.html`).
- Edit `.env` and fill in the real values:
  - `DB_HOST` (usually `localhost`), `DB_PORT` (`3306`), `DB_NAME`, `DB_USER`,
    `DB_PASSWORD` — from step 1.
  - `SESSION_SECRET` — a long random string (generate one at
    https://www.random.org/strings/ or with `openssl rand -hex 32`).
  - `OWNER_EMAIL` / `OWNER_PASSWORD` — the email and temporary password
    (at least 8 characters) for the first admin login.
  - `APP_ENV=production`, `APP_URL=https://your-domain-or-subdomain` (no
    trailing slash).
- `.env` is gitignored and must **never** be committed, emailed, or shared.

### 4. Import the schema + seed data (phpMyAdmin)

- In hPanel go to **Databases → phpMyAdmin**, open your database.
- Click **Import**, choose the file `db/schema.sql` from your computer, click
  **Go**.
- It creates 9 tables (`site_config`, `special_deals`, `umrah_packages`,
  `visa_services`, `work_permits`, `work_permit_programmes`, `enquiries`,
  `admin_users`, `rate_limits`) and seeds the site content from the repo's own
  `FLYER_DEFAULTS` — the same deals, packages, visas, permits and settings the
  site shows today. No admin user is created by this import.
- Re-importing is safe: the seed `INSERT`s re-apply the defaults instead of
  failing on duplicate ids.

### 5. Create the owner account (run once)

**Option A — SSH (recommended if available on your plan):**

```bash
cd ~/domains/your-domain/public_html
php db/seed_owner.php
```

It reads `OWNER_EMAIL` / `OWNER_PASSWORD` from `.env` (or from the
environment), validates them, and creates the `owner` account. It refuses if
an owner already exists.

**Option B — no SSH (one-time web call):**

If the Single plan has no SSH access, the script can be triggered once from a
browser — but only if you protect it first:

1. In File Manager, temporarily rename `db/seed_owner.php` is **not** enough —
   the script refuses to run via the web on purpose (it is CLI-only).
2. Instead, ask for help to run it via Hostinger's **Cron Jobs** (hPanel →
   Advanced → Cron Jobs): create a one-time cron that runs
   `php /home/u123456789/domains/your-domain/public_html/db/seed_owner.php`
   once, then delete the cron job. Cron output is emailed to you, so you will
   see the success/error message.

Either way, **delete `db/seed_owner.php` from the server (or move it out of
`public_html`) as soon as the owner account exists.** It must not stay on the
live server.

### 6. Upload folders + permissions

- Create `uploads/` inside `public_html/` with three subfolders:
  `uploads/zakir_media/`, `uploads/zakir_team/`, `uploads/zakir_work_permits/`.
- Set permissions: folders `755`, files `644`. The web server user must be
  able to write into the three subfolders (photos land here, not in Firebase
  Storage any more).
- If uploads fail with a permissions error, set the three subfolders to `775`
  first; use `777` only as a last resort and only temporarily.

## What to check after setup

1. **Public API read:** open `https://your-domain/api/config` in a browser —
   you should get JSON starting with `{"ok":true,"data":{...}}` (site
   settings). If you see a PHP error or a 500, check `.env` values and that
   step 4 imported without errors.
2. **Content endpoints:** `https://your-domain/api/deals` should return the
   seeded deal (1 deal), `/api/umrah-packages` 4 packages, `/api/visas` 6
   visas, `/api/work-permits` 6 permits, `/api/programmes` 1 programme.
3. **Admin login:** open the admin portal and log in with the owner email and
   password from step 5. The connection badge should show the API as live.
4. **One save test:** change one small thing in the admin (e.g. a deal title),
   save, and confirm the "Confirmed live" message appears and the public site
   shows the change.
5. **Enquiry test:** submit the contact form on the public site and check the
   new enquiry appears in the admin Enquiries inbox.

## Switching the live site to the API

The switch is per-browser, in `localStorage`: set `zakir_backend` to `'api'`
(there will be a toggle for this; until then it can be set from the browser
console). Default (no value) is Firebase — the site keeps working exactly as
today until you deliberately switch. Keep Firebase untouched for 1–2 weeks
after switching, as a fallback.

## What is still untested / still to do

- **No live Hostinger test yet.** The code was syntax-checked (`php -l`) and
  the schema was imported into a local MySQL and verified (row counts,
  mirrors, indexes, FK), but nobody has run it on Hostinger yet — steps 1–6
  above are the first live run. Expect small hPanel differences (database name
  prefix, exact phpMyAdmin wording) and report them rather than guessing.
- **No data migration yet.** The seed is the repo's `FLYER_DEFAULTS`, not the
  live Firestore content. Migrating the live deals/enquiries/team photos from
  Firestore happens later, after hosting exists (the live Firestore contents
  could not be read from here — REST access was blocked).
- **Majeed still has to do (from earlier work, still pending):**
  - Buy the Hostinger Single plan (step 1 above).
  - Publish **both** rules files in the Firebase console — Firestore rules
    **and** Storage rules (Firestore → Rules → Publish; Storage → Rules →
    Publish). Merging the earlier PRs did not publish them, and the Firebase
    site keeps running on the old rules until this is done.
- **After switching to the API:** change the owner password from the temporary
  one, add other admins from the Admin Access tab, and re-upload team photos
  and visa/work-permit flags through the admin portal (they now land in
  `uploads/`, not Firebase Storage).
- **Backups:** the Single plan backs up weekly. Export the MySQL database
  from phpMyAdmin after any big admin change until a backup routine exists.
