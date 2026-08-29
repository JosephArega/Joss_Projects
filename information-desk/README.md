# Information Desk

An internal service portal: one page listing every system the organization
provides, plus a protected admin area for managing that list.

The public page is a **read-only link directory**. Each entry is a name, a URL,
a category and an optional one-line description. Nothing is fetched from or
embedded from the target systems — no iframes, no uptime probes, no scraping.
Every link opens in a new tab.

- **Portal** — `/` — anonymous, no admin controls anywhere on the page.
- **Admin** — `/admin` — session-protected; reachable from a small link in the footer.

---

## Contents

- [Stack](#stack)
- [Requirements](#requirements)
- [Environment variables](#environment-variables)
- [First run](#first-run)
- [Running migrations](#running-migrations)
- [First login and the forced password change](#first-login-and-the-forced-password-change)
- [Adding more administrators](#adding-more-administrators)
- [Adding a service through the UI](#adding-a-service-through-the-ui)
- [Swapping the logo](#swapping-the-logo)
- [Backing up](#backing-up)
- [Deployment](#deployment)
- [HTTPS is required](#https-is-required)
- [API reference](#api-reference)
- [Project layout](#project-layout)

---

## Stack

| Layer      | Choice                                                  |
| ---------- | ------------------------------------------------------- |
| Frontend   | Vue 3 (`<script setup>`), Vite, TypeScript               |
| UI         | PrimeVue 4 with the Aura preset, PrimeIcons              |
| Backend    | Node 20, Express, TypeScript                             |
| Database   | PostgreSQL (an existing server — none is installed here) |
| DB access  | `pg` connection pool, `node-pg-migrate` for migrations   |
| Validation | `zod` on every request body                              |
| Auth       | argon2id password hashing, JWT in an httpOnly cookie     |

One npm workspace root with `client` and `server`. A single Node process serves
the built client and the API on one port.

---

## Requirements

- Node 20 or newer
- An existing PostgreSQL 13+ server you can reach, with a database for the app
- The ability to create the `pgcrypto`, `citext` and `pg_trgm` extensions in
  that database (all three are *trusted* extensions on PostgreSQL 13+, so the
  database owner can create them without superuser)

The app uses a dedicated `portal` schema and does not put its tables in
`public`.

---

## Environment variables

Copy `server/.env.example` to `server/.env` (development) or install it as
`/etc/information-desk.env` (production). **Never commit a real `.env`.**

| Variable                 | Required | Default          | Notes                                                       |
| ------------------------ | -------- | ---------------- | ----------------------------------------------------------- |
| `DATABASE_URL`           | yes      | —                | `postgres://user:pass@host:5432/portal`                      |
| `JWT_SECRET`             | yes      | —                | 32+ chars. `openssl rand -base64 48`                         |
| `APP_ORIGIN`             | yes      | `localhost:5173` | The browser-facing origin. CORS is locked to it.             |
| `PORT`                   | no       | `4000`           |                                                              |
| `NODE_ENV`               | no       | `development`    | Set to `production` when deployed                            |
| `PGSSLMODE`              | no       | unset            | `require` / `verify-ca` / `verify-full` / `no-verify` …      |
| `PGSSLROOTCERT`          | no       | unset            | CA bundle path for `verify-ca` / `verify-full`               |
| `PGPOOL_MAX`             | no       | `10`             | Pool size                                                    |
| `SESSION_HOURS`          | no       | `8`              | Session lifetime, refreshed on activity                      |
| `COOKIE_SECURE`          | no       | `true`           | Only set `false` for local http — see [HTTPS](#https-is-required) |
| `ADMIN_USERNAME`         | no       | unset            | Seeds the first admin when the table is empty                |
| `ADMIN_INITIAL_PASSWORD` | no       | unset            | Seeds the first admin when the table is empty                |
| `ORG_NAME`               | no       | `Information Desk` | Shown in the portal header                                 |
| `SUPPORT_EMAIL`          | no       | `servicedesk@example.org` | Shown in the footer                                 |
| `SUPPORT_PHONE`          | no       | unset            | Shown in the footer if set                                   |

The server validates all of this at boot and **exits with a readable message**
rather than starting half-configured. It also fails fast, with an explicit
instruction to run the migrations, if the database is reachable but unmigrated.

---

## First run

```bash
npm install

cp server/.env.example server/.env
$EDITOR server/.env          # DATABASE_URL, JWT_SECRET, ADMIN_* at minimum

npm run migrate              # creates the portal schema and seeds the catalogue
npm run dev                  # API on :4000, Vite on :5173 with /api proxied
```

Open <http://localhost:5173>. For local http you must set `COOKIE_SECURE=false`,
otherwise the browser will refuse to store the session cookie.

Production:

```bash
npm ci
npm run build                # builds client/dist and server/dist
npm run migrate
npm start                    # one process serves the SPA and /api on $PORT
```

---

## Running migrations

Migrations live in `server/migrations/` and are plain, reviewable SQL wrapped in
`node-pg-migrate` files. The app **never** creates tables at runtime.

```bash
npm run migrate              # apply everything outstanding
npm run migrate:down         # roll back exactly one migration
```

They run inside a transaction, so a failure leaves nothing half-applied.

Rolling all the way down leaves an empty `portal` schema behind on purpose:
`node-pg-migrate` keeps its own bookkeeping table there, so dropping the schema
would delete the record of the migration being rolled back. Remove it by hand if
you really want bare metal:

```sql
DROP SCHEMA portal CASCADE;
```

What the migrations create:

- `portal.categories`, `portal.services`, `portal.admins`, `portal.audit_log`
- Indexes on `services(category_id)`, `services(is_active)`,
  `audit_log(created_at DESC)`, plus `lower(name)` and trigram indexes on
  `services.name` / `services.description` to back search
- A shared `portal.set_updated_at()` trigger on `services` and `categories`
- Seed data: six categories and eighteen placeholder services, all safe to edit
  or delete through the admin UI

---

## First login and the forced password change

1. Set `ADMIN_USERNAME` and `ADMIN_INITIAL_PASSWORD` before the first boot.
   When the `admins` table is empty, the server creates that account and logs
   `Seeded first administrator "…"`.
2. Go to `/admin`, sign in with those credentials.
3. You land on **Choose a new password** and cannot reach the dashboard until
   you have replaced the initial password. New passwords must be at least 12
   characters and contain a letter and a number.

Seeding only happens when there are **no** administrators at all, so leaving the
variables in the environment afterwards is harmless — they will never reset an
existing password.

If you forget to set them, the server says so at boot and you can create an
account with the CLI instead.

---

## Adding more administrators

```bash
npm run create-admin -- --username alice
# prompts twice for a password, without echoing it

npm run create-admin -- --username bob --password 'a long passphrase 42'
npm run create-admin -- --username svc --no-force-change
```

New accounts are created with `must_change_password = true` unless you pass
`--no-force-change`, so the person who receives the initial password has to
replace it before they can do anything.

---

## Adding a service through the UI

For a non-developer, no database access needed:

1. Open the portal and click the small **Admin** link at the bottom of the page.
2. Sign in.
3. On the **Services** tab, click **Add service**.
4. Fill in:
   - **Name** — what staff will see, e.g. `Expense Claims`
   - **Link** — the full address including `https://`. Relative paths and
     `javascript:` / `data:` / `file:` links are rejected.
   - **Category** — which tab it appears under
   - **Icon** — optional; leave it as *No icon* to get an initials tile in the
     category colour
   - **Description** — one short line, up to 280 characters
   - **Visible on the portal** — leave on to publish it immediately
5. Click **Add service**. It appears on the portal straight away.

Other things you can do from the same screen:

- **Reorder** — drag the handle at the left of a row. The new order saves
  immediately. Clear the search and category filter first: dragging is disabled
  while a filter is applied, because reordering a filtered subset would silently
  move the hidden rows too.
- **Hide instead of delete** — the eye icon takes a service off the portal while
  keeping it in the admin list.
- **Delete** — removes it from the portal but keeps the record and its history
  (a soft delete). Switch it back on with the eye icon at any time.
- **Categories tab** — add, rename, reorder and delete categories. A category
  that still has services attached cannot be deleted; the message tells you how
  many are in the way.
- **Activity tab** — a read-only log of every create, update, delete, login and
  password change.

---

## Swapping the logo

Replace `client/public/logo.png` with your own file and rebuild:

```bash
cp /path/to/your-logo.png client/public/logo.png
npm run build
```

A square image of about 256×256 works best; it is displayed at 44 px in the
portal header and 36 px in the admin header, and it doubles as the browser tab
icon. Transparent PNGs sit well on both the light and dark themes.

If the file is missing the header falls back to clean initials derived from
`ORG_NAME`, so nothing ever renders as a broken image.

---

## Backing up

Everything the app owns is in the `portal` schema:

```bash
pg_dump \
  --host localhost --port 5432 \
  --username portal_user \
  --dbname portal \
  --schema=portal \
  --format=custom \
  --file "information-desk-$(date +%F).dump"
```

Restore into an empty database with:

```bash
pg_restore --host localhost --username portal_user --dbname portal \
  --schema=portal --clean --if-exists information-desk-2026-01-31.dump
```

For a plain-text dump you can read and diff, swap `--format=custom` for
`--format=plain` and drop the `pg_restore` step (feed it to `psql` instead).

The dump contains password hashes. Store it as you would any other credential
backup.

---

## Deployment

`npm run build` produces `client/dist` and `server/dist`. In production Express
serves the built client statically and handles `/api/*`, so **one Node process
on one port serves everything** — no separate web server for the frontend.

`deploy/` contains:

| File                              | What it is                                                        |
| --------------------------------- | ----------------------------------------------------------------- |
| `nginx.conf`                      | TLS-terminating reverse proxy in front of the Node process         |
| `information-desk.service`        | systemd unit, hardened, reading `/etc/information-desk.env`        |
| `docker-compose.yml`              | Runs **only the app**, pointed at your existing external Postgres  |
| `Dockerfile`                      | Multi-stage build used by the compose file                         |

The compose file deliberately does **not** define a Postgres service. Set
`DATABASE_URL` to your existing server; on Linux, reach a database on the host
through `host.docker.internal` (the required `extra_hosts` mapping is already
there).

`vite.config.ts` sets `base: './'`, so the built asset URLs are relative.
`client/index.html` carries a matching `<base href="/">` — without it a deep link
such as `/admin/change-password` would resolve those relative URLs against
`/admin/` and 404. To mount the portal under a sub-path, change that one `href`.

### A note on `trust proxy`

The app runs with `trust proxy = 1`, meaning exactly one proxy hop is trusted
when working out the client IP for rate limiting. If you put a second proxy or a
CDN in front of nginx, raise that value in `server/src/app.ts` to match, or the
login rate limit will see the proxy's address instead of the client's.

---

## HTTPS is required

The session cookie is issued `httpOnly`, `SameSite=Strict` **and `Secure`**.
Browsers do not send `Secure` cookies over plain `http://`, so over http the
admin area will appear to sign you out on every request.

This is deliberate. Terminate TLS in front of the app (the sample nginx config
does), and set `APP_ORIGIN` to the `https://` origin.

For local development against `http://localhost` only, set `COOKIE_SECURE=false`.
The server warns loudly at boot if it sees that in production.

Other security properties, for the record:

- Passwords hashed with **argon2id** (OWASP-baseline parameters); bcrypt is used
  automatically only if the argon2 native module cannot be built. Stored hashes
  are self-describing, so both verify correctly.
- Login is rate-limited to **5 attempts per 15 minutes per IP**, and the failure
  message is the same string for an unknown user, a wrong password or a blocked
  attempt — it never reveals which field was wrong. An unknown username is still
  checked against a dummy hash so the response time does not leak either.
- **CSRF**: a double-submit token. A script-readable `id_csrf` cookie is echoed
  in an `X-CSRF-Token` header and compared in constant time on every mutating
  request. The token is minted at login and after a password change, and stays
  stable for the session so it cannot race a page that read it a moment earlier.
- The JWT lives only in the httpOnly cookie. **It is never written to
  `localStorage`.** The only things in `localStorage` are the theme preference
  and the per-browser favourites list.
- `helmet` sets CSP, `frame-ancestors 'none'`, HSTS and a strict referrer
  policy. CORS is locked to `APP_ORIGIN`.
- Every query is parameterized. Update statements build their `SET` list from a
  fixed column map, never from request keys, so there is no path from user input
  to SQL text.
- Service URLs must parse as `http:` or `https:` with a hostname. `javascript:`,
  `data:`, `file:`, other schemes, control characters and relative paths are all
  rejected, at the API — not just in the form.
- Reorders and other multi-row writes run in a single transaction with the
  affected rows locked.
- Every create, update, delete, login and password change is written to
  `portal.audit_log` with before/after snapshots.

---

## API reference

Public:

| Method | Path            | Notes                                      |
| ------ | --------------- | ------------------------------------------ |
| GET    | `/api/services` | Active services and categories, one payload |
| GET    | `/api/health`   | Liveness plus a real database round trip    |

Authentication:

| Method | Path                       | Notes                              |
| ------ | -------------------------- | ---------------------------------- |
| POST   | `/api/auth/login`          | Public, rate-limited               |
| POST   | `/api/auth/logout`         | Authenticated                      |
| GET    | `/api/auth/me`             | Authenticated; used by the guard   |
| POST   | `/api/auth/change-password`| Authenticated                      |

Admin (authenticated, CSRF-protected, blocked until any forced password change
is done):

| Method | Path                             | Notes                                   |
| ------ | -------------------------------- | --------------------------------------- |
| GET    | `/api/admin/services`            | Includes inactive services              |
| POST   | `/api/admin/services`            |                                         |
| PUT    | `/api/admin/services/:id`        |                                         |
| DELETE | `/api/admin/services/:id`        | Soft delete (`is_active = false`)        |
| PUT    | `/api/admin/services/reorder`    | Ordered id array, one transaction        |
| GET    | `/api/admin/categories`          |                                         |
| POST   | `/api/admin/categories`          |                                         |
| PUT    | `/api/admin/categories/:id`      |                                         |
| DELETE | `/api/admin/categories/:id`      | **409** if services are still attached   |
| PUT    | `/api/admin/categories/reorder`  | Ordered id array, one transaction        |
| GET    | `/api/admin/audit`               | Paginated audit log                      |

Reorder endpoints assign positions from the order you send, so send the complete
list of ids, not a subset.

---

## Project layout

```
information-desk/
├── package.json               workspaces + npm run dev / build / migrate
├── client/
│   ├── index.html             carries the <base href> discussed above
│   ├── vite.config.ts         base: './', /api proxied in dev
│   ├── public/logo.png        swap this to rebrand
│   └── src/
│       ├── api/               fetch client + shared types
│       ├── components/        ServiceCard, IconPicker, admin tabs and dialogs
│       ├── composables/       theme, favourites, auth session
│       ├── router/            routes and the /admin guard
│       ├── views/             Portal, Login, ChangePassword, Admin
│       └── style.css          the design-token layer; no component holds a colour
└── server/
    ├── migrations/            node-pg-migrate files, checked in
    └── src/
        ├── app.ts             helmet, CORS, routers, static client
        ├── db.ts              pool, transactions, fail-fast boot check
        ├── env.ts             zod-validated configuration
        ├── lib/               password, tokens, audit, validators
        ├── middleware/        auth, csrf, rate limits, error handler
        ├── routes/            public, auth, admin services/categories/audit
        └── scripts/           create-admin CLI
```

### Design notes

Every colour in the UI resolves to a PrimeVue design token (`--p-*`) or to an
app token derived from one in `client/src/style.css`. No component contains a
literal colour, so dark mode and a change of preset both work without touching
components. Spacing follows an 8 px scale; transitions are 160–200 ms and never
bounce. The layout is verified at 360, 768, 1280 and 1920 px in both themes.
