# Online Image Sync Analysis And Optimization Plan

## Task

Analyze the production issue where images modified in the admin/backend environment may not appear synchronized on the frontend, then define an executable, verifiable optimization plan for the full backend-to-frontend image pipeline.

This document is an analysis and execution plan. It does not implement code changes by itself.

## Current Production Facts

- Production commit: `cac44bc fix(admin): persist uploaded product image path`.
- PM2 app: `longxiang-website`, status `online`.
- Production project path: `/home/ubuntu/longxiang-website`.
- Production upload storage:
  - `UPLOAD_DIR=/var/lib/longxiang/uploads`
  - `UPLOAD_PUBLIC_PATH=uploads`
- Nginx currently proxies all traffic to Node on `127.0.0.1:3000`.
- No separate Nginx `/uploads` location or `proxy_cache` rule was found in `/etc/nginx/sites-enabled` or `/etc/nginx/conf.d`.
- Express serves uploads with `Cache-Control: public, max-age=2592000`, equal to 30 days.
- Express serves API responses under `/api` with `Cache-Control: no-store`.
- Express serves HTML/JSON/JS static project files with `Cache-Control: public, max-age=300`.

## Current Image Flow

### Admin Product Upload

1. Admin selects a product image in `admin/index.html`.
2. `admin/js/admin.js` uploads the file to `POST /api/admin/products/upload` using `FormData` field `image`.
3. `server/routes/admin/products.js` stores the file in `resolveUploadDir()`.
4. The upload endpoint inserts an `assets` row and returns a public path such as `uploads/product-...png`.
5. The admin UI stores the returned path in `field-cover-image` and `uploadedImagePath`.
6. When the product is saved, the UI sends `cover_image`.
7. The admin product route validates the path with `normalizeCoverPath()`.
8. `replaceCoverImage()` deletes the old cover row and inserts a new `product_media` cover row.
9. Public `GET /api/products` maps the `product_media.is_cover=1` row to the frontend `image` field.
10. Frontend pages load the image path from `/api/products` and render it as `/uploads/...` or `../uploads/...` on Arabic pages.

### Legacy Product Upload Endpoint

- `POST /api/products/upload` still exists in `server/routes/products.js`.
- It is protected by `authMiddleware`, but it is not the current admin UI upload endpoint.
- It uses the older upload implementation and does not insert an `assets` record.
- Current handling decision: keep it for compatibility in this planning task, mark it as deprecated, and do not route new frontend code to it.
- Follow-up small task: either remove this endpoint after confirming no external callers use it, or keep it with explicit deprecation comments and matching upload-path validation.

### Frontend Loading

- English pages use `assetPrefix = ''`.
- Arabic pages use `assetPrefix = '../'`.
- Product list/detail pages fetch `/api/products` first, then fall back to static `data/products.json` if the API fails.
- In production SQLite mode, the server does not fall back to `data/products.json`; the static JSON fallback is client-side only after `/api/products` fails.
- Because `/api` is `no-store`, the product image path should update immediately after a successful save.
- The image binary itself is cached for 30 days by `/uploads`.

## Likely Causes Of "Image Not Synchronized"

### Confirmed Or High-Probability Causes

1. **Browser cache on reused image URLs**
   - `/uploads` responses are cacheable for 30 days.
   - If the same file path is overwritten or manually replaced, browsers may keep showing the old image.
   - This is less likely for normal admin uploads because generated filenames are unique, but it remains a risk for manual replacement or future features that reuse filenames.

2. **Upload path not persisted before the latest fix**
   - The admin UI previously had a gap where upload preview and saved server path could diverge.
   - Commit `cac44bc` added explicit path persistence through `field-cover-image`.
   - This should fix the normal admin path: upload -> receive path -> save product -> frontend reads new image.

3. **API fallback can mask backend state**
   - If `/api/products` fails, frontend falls back to static `data/products.json`.
   - That fallback data may contain older image paths.
   - A user may interpret fallback rendering as "backend change did not sync".

4. **Two image data sources exist**
   - SQLite `product_media` is the production source for dynamic product images.
   - Static `data/products.json` remains a fallback and import source.
   - These can diverge unless explicitly documented and monitored.

5. **Legacy upload endpoint remains live**
   - `/api/products/upload` is not used by the admin UI, but remains reachable to authenticated callers.
   - It should be treated as deprecated until removed or aligned with `/api/admin/products/upload`.

### Lower-Probability Causes To Verify During Implementation

1. CDN cache, if a CDN is later added in front of the site.
2. Mixed deployment state if GitHub, local, and server commits diverge.
3. Upload directory permission or persistence issues under `/var/lib/longxiang/uploads`.
4. Multiple PM2 instances using different working directories or env files.
5. Frontend pages not re-fetching `/api/products` after admin save in the same browser session.
6. Orphaned `assets` rows because current admin upload records `assets.entity_id = NULL` and `product_media.asset_id = NULL`.

## Optimization Plan

### Phase 1: Stabilize The Current Flow

1. Keep the current unique filename upload strategy for product images.
2. Never overwrite an existing `/uploads/...` file for product cover replacement.
3. Ensure all admin upload endpoints return a normalized relative path:
   - `uploads/...`
   - no leading slash
   - no absolute URL required
   - new product upload work must target `/api/admin/products/upload`, not the deprecated `/api/products/upload`
4. Ensure admin save endpoints persist that returned path into the canonical data table:
   - products: `product_media`
   - education: relevant content block JSON or current education store
   - certifications: `image_path`
5. Add or keep UI state that clearly distinguishes:
   - local preview URL (`blob:...`)
   - saved server path (`uploads/...`)

### Phase 2: Cache Strategy

1. Keep `/api` as `no-store`.
2. Keep generated upload filenames immutable and long-cacheable.
3. For any endpoint or workflow that may overwrite an existing upload path, add one of:
   - content-hash filename
   - timestamped filename
   - version query string such as `?v=asset.updated_at`
4. Do not change the current `/uploads` `maxAge` as the first step; the production workflow already generates unique filenames.
5. Document that manual file replacement under `/var/lib/longxiang/uploads` is not a supported image update workflow unless cache purge/versioning is also performed.
6. If same-path replacement is introduced later, add explicit filename versioning before increasing cache complexity in Express or Nginx.

### Phase 3: Frontend Rendering Guardrails

1. Centralize image URL building in a small helper per frontend bundle:
   - normalize leading slashes
   - preserve absolute URLs if allowed
   - apply Arabic `../` prefix only for relative project paths
2. Add a visible or logged fallback marker when static JSON fallback is used.
3. For admin save success, confirm `cover_image` equals the submitted path inside the existing `admin/js/admin.js` `saveProduct()` `then` callback.
   - Use the existing `saved = unwrapDataResponse(response)` result.
   - Do not add a second detail fetch unless the save response stops including `cover_image`.
4. For product list/detail, keep loading from `/api/products`; fallback should be treated as degraded mode, not normal production state.

### Phase 4: Observability And Verification

Add a repeatable verification checklist:

1. Upload a new product image in admin.
2. Confirm upload response includes `path: uploads/...`.
3. Save the product.
4. Confirm admin product detail returns `cover_image` equal to that path.
5. Confirm public `/api/products/:id` or `/api/products` returns `image` equal to that path.
6. Confirm `GET /uploads/...` returns `200`.
7. Confirm English product list/detail renders the new image.
8. Confirm Arabic product list/detail renders the new image.
9. Confirm no fallback marker is present.
10. Confirm browser hard refresh is not required when the path is new.
11. Clear a product cover intentionally and confirm public `image` becomes an empty string.
12. Confirm Arabic detail/list paths are rendered as `../uploads/...` for relative upload paths.

### Phase 5: Longer-Term Hardening

1. Add an admin asset health check endpoint or script:
   - list product records with missing cover files
   - list upload files not referenced by assets or product media
   - verify `product_media.path` starts with `uploads/`
   - report `assets` rows where `entity_id IS NULL`
   - report the count and ratio of `product_media.asset_id IS NULL`
   - explicitly label current `assets`/`product_media` decoupling as informational unless a later task links them
2. Add a cleanup policy for orphaned upload files after product cover replacement.
3. Add deployment smoke tests for:
   - `/api/products`
   - one known `/uploads/...` image
   - admin JS asset
4. Add documentation under `docs/ops/` for:
   - upload directory
   - backup requirements
   - cache behavior
   - manual recovery steps

## Recommended Immediate Implementation

The next code task should be scoped and practical:

1. Add a small frontend `normalizeImagePath()` helper for product list/detail and compare pages.
2. Add cache-busting only for admin preview or for any same-path replacement flow, not for normal unique uploaded files.
3. Add a server-side verification script:
   - checks product covers in SQLite
   - confirms corresponding files exist under `UPLOAD_DIR`
   - prints missing/orphan summaries
   - reports `assets.entity_id IS NULL` and `product_media.asset_id IS NULL`
4. Add an admin save verification step after product image replacement:
   - implement in `admin/js/admin.js` inside the existing `saveProduct()` `then` callback
   - after save, compare returned `saved.cover_image` with submitted `cover_image`
   - show an error if they differ
5. Add production smoke-test commands to docs.
6. Add a small deprecation cleanup task for `POST /api/products/upload`:
   - preferred: remove after confirming no callers
   - fallback: document as deprecated and align its response/path validation with the admin upload endpoint

## Risks And Boundaries

- Do not change database schema unless explicitly approved.
- Do not change public API response shape.
- Do not remove the static JSON fallback yet; first add observability so fallback usage is visible.
- Do not delete `POST /api/products/upload` in this planning task; handle it as a separate small compatibility task.
- Submitting `cover_image: ''` is a valid clear-cover operation. It deletes the existing `product_media` cover row and does not insert a replacement.
- Current `assets` rows are not linked back to product records because admin upload writes `entity_id = NULL` and `replaceCoverImage()` writes `product_media.asset_id = NULL`; treat this as a known integration gap until a dedicated linking task is approved.
- Do not manually edit production server files; deploy through GitHub pull and PM2 restart.
- Claude reviews only; Codex implements, verifies, commits, and deploys.

## Acceptance Criteria

The optimization is considered complete when:

1. Admin upload returns a server path and product save persists it.
2. Public product API returns the same path immediately after save.
3. English and Arabic frontend pages render the new image path.
4. Reused-path cache risks are either eliminated by unique filenames or explicitly versioned.
5. A repeatable production smoke test exists.
6. Upload directory and image cache policy are documented.
