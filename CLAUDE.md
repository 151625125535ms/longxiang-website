# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

```bash
npm start          # starts Node.js server on port 3000
node server/app.js # equivalent alternative
```

The server serves everything from the project root as static files AND exposes `/api/*` routes. Open `http://localhost:3000` for the public site or `http://localhost:3000/admin/` for the admin panel.

Admin login: username `admin`, password `admin123` (hardcoded in `server/routes/auth.js`).

## Architecture overview

This is a bilingual (Chinese + Arabic) corporate website for a transformer manufacturer, with a Node.js/Express backend and vanilla JS frontend.

### Layers

**Public frontend** — root HTML pages (`index.html`, `products.html`, etc.) and `ar/` Arabic mirrors. Each page loads `css/styles.css` and one or more scripts from `js/`. No framework; all scripts use the IIFE pattern `(function () { 'use strict'; ... })()`.

**Admin panel** — `admin/index.html` is a single-page app driven by `admin/js/admin.js` (one large IIFE). It talks to the API with a Bearer token stored in `localStorage` as `admin_token`. CSS lives in `admin/css/admin.css` using CSS custom properties (`--color-navy`, `--color-blue`, `--color-gold`, `--color-success`, `--color-danger`).

**Backend** — `server/app.js` mounts five route files under `/api/` and serves static files from the project root.

```
server/
  app.js               # entry point; mounts routes
  middleware/auth.js   # JWT authMiddleware + JWT_SECRET export
  lib/fileStore.js     # atomic JSON read/write helpers
  routes/
    auth.js            # POST /login, GET /verify
    products.js        # CRUD + multer image upload
    company.js         # GET/PUT company info
    inquiries.js       # public POST, admin GET/PUT/DELETE + email notify
    certifications.js  # CRUD
```

**Data** — All state is JSON files in `data/` (`products.json`, `company.json`, `inquiries.json`, `certifications.json`, `cases.json`, `downloads.json`). Use `server/lib/fileStore.js` (`readJson`, `writeJson`, `makeId`) rather than raw `fs` calls — `writeJson` does an atomic write via a `.tmp` file + rename.

**Uploads** — Product images go to `uploads/` via multer (10 MB limit, image types only). `products.js` routes handles the `/api/products/upload` endpoint.

### Key frontend patterns

- **Arabic detection**: `var isArabic = /\/ar\//.test(window.location.pathname)` — all public JS files use this. `ar/` pages are direct siblings of root pages, so `assetPrefix = isArabic ? '../' : ''` corrects relative paths to images and JSON.
- **Arabic field convention**: product JSON has base fields (`name`, `description`, …) and Arabic variants with `Ar` suffix (`nameAr`, `descriptionAr`, …).
- **API + JSON fallback**: `fetchJson(apiUrl, fallbackUrl)` tries the live API first, falls back to reading the JSON file directly — this keeps pages functional without the Node server running.
- **XSS protection**: `escapeHtml(value)` is defined in every JS file that renders user data into HTML.
- **Admin skeleton loading**: `skeletonRows(cols, count)` generates shimmer placeholder rows before API data loads.
- **Admin inline validation**: `showFieldError(fieldId, msg)` / `clearFieldError(fieldId)` add `.input-error` + `.field-error-msg` to form fields.
- **Featured toggle**: `toggleFeatured(productId)` in admin.js calls `PUT /api/products/:id` without opening a modal.

### API contract

All protected routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | /api/auth/login | — | returns `{ token, username }` |
| GET | /api/auth/verify | — | returns `{ valid: bool }` |
| GET | /api/products | — | `?category=` `?featured=true` |
| GET | /api/products/:id | — | |
| POST | /api/products | ✓ | requires `id` + `name` |
| PUT | /api/products/:id | ✓ | |
| DELETE | /api/products/:id | ✓ | |
| POST | /api/products/upload | ✓ | multipart `image` field |
| GET | /api/company | — | |
| PUT | /api/company | ✓ | |
| POST | /api/inquiries | — | public form submit |
| GET | /api/inquiries | ✓ | `?status=` `?page=` `?pageSize=` |
| GET | /api/inquiries/:id | ✓ | |
| PUT | /api/inquiries/:id | ✓ | fields: `status`, `notes` |
| DELETE | /api/inquiries/:id | ✓ | |
| GET/POST/PUT/DELETE | /api/certifications[/:id] | ✓ on write | |

Inquiry statuses: `new` → `read` → `replied` → `closed`.

### Email notifications (optional)

The inquiry route sends email via nodemailer when SMTP env vars are set:
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`, `INQUIRY_NOTIFY_TO`.
If any are missing, the inquiry is still saved — notification silently skips.

### Agent collaboration boundary

This repo is shared between Claude (backend + admin) and Codex (public frontend). To avoid conflicts:
- **Claude owns**: `admin/**`, `server/**`, `data/**`
- **Codex owns**: `css/styles.css`, `js/main.js`, root `*.html`, `ar/*.html`

If an interface between these areas changes (API shape, data file schema), update `API.md` at the project root before committing so both agents stay in sync.
