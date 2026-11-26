# CSE 340 Service Network

A server-rendered web app that connects volunteers with service organizations and projects. Browse partner organizations, see upcoming service projects, filter projects by category, and create or edit organizations, projects and categories.

Built for BYU-Idaho CSE 340.

## Tech Stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Runtime    | Node.js (ES modules)                        |
| Server     | Express 5                                   |
| Templating | EJS (server-side rendering with partials)   |
| Database   | PostgreSQL via the `pg` connection pool     |
| Dev tools  | nodemon                                     |
| Styling    | Hand-written CSS (`public/css/main.css`)    |

There is no frontend framework, bundler, or TypeScript.

## Features

- **Home** page with the network's mission and logo
- **Organizations**: list of partner organizations, a detail page for each with its contact email and projects, and forms to **create** and **edit** organizations
- **Projects**: the next five upcoming projects (soonest first), a detail page with date, location, organization, and category tags, and forms to **create** and **edit** projects (organization picker, date validation)
- **Categories**: list of categories, a detail page listing the projects in each, and forms to **create** and **edit** categories (server-side validation, duplicate-name detection)
- Rendered **404** and **500** error pages
- Light and dark themes, responsive layout, keyboard-visible focus, and reduced-motion support

## Getting Started

### Prerequisites

- **Node.js 22.9 or newer.** The scripts rely on Node's built-in `--env-file` flags (`npm start` uses `--env-file-if-exists`, which is newer than `--env-file`). If you are on an older Node 20 release and see an unknown-flag error, upgrade Node.
- **PostgreSQL** (local, or a hosted provider that gives you a connection string)

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

Create an empty PostgreSQL database, then run the schema and seed data:

```bash
psql "$DB_URL" -f src/setup.sql
```

> **Warning:** `src/setup.sql` is the source of truth for the schema, but it is **destructive**. It runs `DROP TABLE IF EXISTS` on `project_categories`, `projects`, and `categories`. Do not run it against a database that holds data you want to keep. It also runs a plain `CREATE TABLE organization`, so running it twice against the same database will fail on that statement unless you drop that table first.

The script creates and seeds:

- `organization` (3 sample organizations)
- `projects` (3 sample projects, linked to the first organization)
- `categories` (4 sample categories)
- `project_categories` (junction table linking projects and categories)
- `users` (2 development accounts: one `admin`, one `volunteer`)
- `session` (login sessions, managed by `connect-pg-simple`)

**Adding login to a database that already has data:** do not re-run the whole script. Run only the `users` and `session` sections at the bottom of `src/setup.sql` (they use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `ON CONFLICT DO NOTHING`, so they are safe to run on their own and more than once).

**Upgrading an existing login setup:** logins are now stored in a `session` table (see Security Notes). Run the `session` section of `src/setup.sql` before starting the new version, or every request that touches a session will fail with a 500 error. Everyone is logged out once when you deploy, because the old in-memory sessions do not carry over.

### 3. Configure environment variables

Create a `.env` file in the project root (it is gitignored, so never commit it):

```env
DB_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=replace-with-a-long-random-string
NODE_ENV=development
PORT=3000
ENABLE_SQL_LOGGING=true
```

| Variable             | Required | Purpose                                                                                      |
| -------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `DB_URL`             | Yes      | PostgreSQL connection string: `postgresql://user:pass@host:port/db`                          |
| `SESSION_SECRET`     | Yes      | Long random string used to sign session cookies. The server refuses to start without it      |
| `NODE_ENV`           | No       | `development` or `production` (defaults to `production`)                                     |
| `PORT`               | No       | Port the server listens on (defaults to `3000`)                                              |
| `ENABLE_SQL_LOGGING` | No       | `true` logs every query with timing. Only takes effect when `NODE_ENV=development`           |
| `DB_CA`              | No       | Your database provider's CA certificate (PEM text; `\n` sequences are converted to newlines) |
| `DB_SSL_INSECURE`    | No       | `true` keeps TLS encryption but skips certificate verification                               |

**TLS behavior** (see `src/models/db.js`): connections are strict by default (`ssl: true`). If you hit certificate errors, prefer setting `DB_CA` to your provider's CA. Use `DB_SSL_INSECURE=true` only for local troubleshooting, never in production.

### 4. Run the app

```bash
npm run dev     # development: nodemon, loads .env, restarts on changes
npm start       # production: node server.js
```

When it starts correctly you should see `Database connection successful` followed by `Server is running at http://127.0.0.1:3000`.

## Routes

| Method | Path                  | Description                                  |
| ------ | --------------------- | -------------------------------------------- |
| GET    | `/`                   | Home page                                    |
| GET    | `/login`              | Login form                                   |
| POST   | `/login`              | Log in (starts a session)                    |
| POST   | `/logout`             | Log out (ends the session)                   |
| GET    | `/register`           | Registration form                            |
| POST   | `/register`           | Create a volunteer account                   |
| GET    | `/dashboard`          | Logged-in user's name and email (login required) |
| GET    | `/users`              | All registered users and roles (admin only)  |
| GET    | `/organizations`      | All partner organizations                    |
| GET    | `/organization/:id`   | One organization and its projects            |
| GET    | `/new-organization`   | New organization form                        |
| POST   | `/new-organization`   | Create an organization                       |
| GET    | `/edit-organization/:id` | Edit organization form                    |
| POST   | `/edit-organization/:id` | Update an organization                    |
| GET    | `/projects`           | Next 5 upcoming projects                     |
| GET    | `/project/:id`        | One project with its organization/categories |
| GET    | `/new-project`        | New project form                             |
| POST   | `/new-project`        | Create a project                             |
| GET    | `/edit-project/:id`   | Edit project form                            |
| POST   | `/edit-project/:id`   | Update a project                             |
| GET    | `/categories`         | All categories                               |
| GET    | `/category/:id`       | One category and its projects                |
| GET    | `/new-category`       | New category form                            |
| POST   | `/new-category`       | Create a category                            |
| GET    | `/edit-category/:id`  | Edit category form                           |
| POST   | `/edit-category/:id`  | Update a category                            |

**Admin-only routes:** `/users` and every `new-*` and `edit-*` route above (both the GET form and the POST submit) are protected by `requireRole('admin')`. Visitors who are not logged in are redirected to `/login` and sent back afterwards; logged-in users without the `admin` role are redirected to `/dashboard` with a message. The Add/Edit buttons and the dashboard's "View all users" link are only rendered for admins. `/dashboard` only needs `requireLogin`, so any logged-in user can open it.

Route IDs are validated by `parseId` (positive 32-bit integers only). Invalid or unknown IDs fall through to the 404 page.

## Project Structure

```
server.js                    # App bootstrap, middleware, error handling
src/
  routes/index.js            # Route definitions
  middleware/auth.js         # requireLogin + requireRole + setCurrentUser + refreshSessionUser
  middleware/csrf.js         # CSRF token check for every POST
  middleware/rateLimit.js    # Login and registration rate limits
  utils/password.js          # scrypt password hashing (built into Node, no dependency)
  controllers/               # Parse input, call models, choose a view
    index.js
    organizations.js
    projects.js
    categories.js
    auth.js                  # login / logout
    users.js                 # dashboard, admin users list, registration
    parseId.js
  models/                    # Data access only (all SQL lives here)
    db.js                    # Connection pool + testConnection
    organizations.js
    projects.js
    categories.js
    users.js
  views/                     # EJS templates
    partials/                # head, header, footer, category-form
    errors/                  # 403, 404, 429 and 500 pages
  setup.sql                  # Canonical schema + seed data
public/
  css/main.css               # Single token-driven stylesheet (light + dark)
  js/organizations.js        # Client script (see Known Issues)
  images/
sql/                         # Course learning/assignment SQL (reference only)
```

### Architecture

- **Routes** map URLs to controllers.
- **Controllers** validate input, call models, and render views or redirect. No SQL.
- **Models** own all SQL, always parameterized, and return plain row data.
- **Views** render data with EJS. Output is escaped with `<%= %>`.

## Database Schema

```
organization (organization_id PK, name, description, contact_email, logo_filename)
projects (project_id PK, organization_id FK, title, description, location, project_date)
categories (category_id PK, name UNIQUE)
project_categories (project_id FK, category_id FK, PRIMARY KEY (project_id, category_id))
users (user_id PK, name, email UNIQUE, password_hash, role CHECK IN ('admin', 'volunteer'))
```

Deleting an organization cascades to its projects. Deleting a project or category cascades to the junction rows. The table is named `organization` (singular) while the others are plural; this is a known inconsistency and should only be changed as a deliberate migration.

## Security Notes

- All SQL is parameterized.
- Server-side validation on every create/edit form (values trimmed; required fields, length limits, email format, a plain-file-name check on logo names, real-calendar-date check on project dates). Client-side `required`/`maxlength`/`type` attributes mirror these, but the server never trusts them.
- Errors show a generic message to users; details go to the server log only.
- **Authentication and roles:** users log in with email and password (hashed with scrypt). The session stores only `{ id, name, email, role }`, and the session ID is regenerated on login and logout. Sessions live in the PostgreSQL `session` table (not in server memory), so they survive restarts, and each login expires after 8 hours. New accounts come from `/register` and are always `volunteer`; the role is never read from the form. `requireLogin` guards `/dashboard`, and `requireRole('admin')` guards `/users` and every create/edit route. On every request from a logged-in user, `refreshSessionUser` re-reads that user from the database (one primary-key lookup), so a role change takes effect on their next request and a deleted account is logged out immediately.
- **Sample accounts (development only):** `admin@example.org` / `Admin#2026-demo` and `volunteer@example.org` / `Volunteer#2026-demo`, created by `src/setup.sql`. Remove or change them before deploying.
- **CSRF protection:** every POST must carry a per-session random token (hidden `_csrf` field, included by `partials/csrf-field.ejs`), checked in constant time by `src/middleware/csrf.js`. A missing or wrong token gets a 403 page. Any new form must include that partial. The session cookie is also `HttpOnly` and `SameSite=Lax` (plus `Secure` in production).
- **Security headers:** `helmet` sets a Content-Security-Policy that only allows this site's own scripts, styles, and images, plus clickjacking, MIME-sniffing, and referrer protections. Because of the CSP, views must not use inline `<script>` blocks or inline event handlers such as `onclick`; put scripts in `public/js/`.
- **Rate limiting:** `POST /login` allows 10 failed attempts per IP address per 15 minutes (successful logins are not counted), and `POST /register` allows 10 attempts per IP address per hour. Over the limit returns a 429 page. Counters are kept in server memory, so they reset on restart and are not shared if you run more than one instance.
- **Not yet implemented:** account lockout per email address (the limits above are per IP address), password reset, and email verification.

## Known Issues

1. **Dead client script:** `public/js/organizations.js` expects a `#org-list` element and a `GET /api/organizations` endpoint, and none of them exist (the organizations page is server-rendered). The script is still loaded by `organizations.ejs`. Remove it, or implement the API and align field names.
2. **Duplicate/misnested HTML tags:** `head.ejs`, `header.ejs`, `footer.ejs`, and several page templates each open or close `<html>`/`<body>`, producing invalid markup on some pages.
3. **Server starts even if the DB connection fails:** the startup error is logged but the app keeps running.
4. **Schema duplication:** `src/setup.sql` and the files in `sql/` overlap, and `setup.sql` is not idempotent.

## Manual Verification Checklist

There is no automated test suite yet (`npm test` is a placeholder). Before considering a change done:

- `npm run dev` boots and logs `Database connection successful`
- `/`, `/organizations`, `/projects`, and `/categories` render without console errors
- An unknown URL shows the 404 page
- Layout looks right at mobile and desktop widths, in light and dark mode
- Keyboard-only navigation works with visible focus

## Contributing

- Small, focused commits with imperative messages (e.g. `Add project detail route`).
- Follow the conventions in `CLAUDE.md`: ESM with `.js` extensions on relative imports, 4-space indentation, JSDoc on exported model functions, parameterized SQL only.
- Update `src/setup.sql` in the same change as any model that depends on a schema change.

## License

ISC
