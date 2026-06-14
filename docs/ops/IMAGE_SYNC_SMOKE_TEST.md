# Image Sync Smoke Test

Use this checklist after product image upload or image-pipeline changes are deployed.

## Production State

Run on the deployment machine:

```bash
cd /home/ubuntu/longxiang-website
git log --oneline -1
pm2 status longxiang-website
grep -E '^(UPLOAD_DIR|UPLOAD_PUBLIC_PATH|PORT|NODE_ENV)=' .env
```

Expected:

- PM2 app `longxiang-website` is `online`.
- `UPLOAD_DIR` points to the persistent upload directory.
- `UPLOAD_PUBLIC_PATH` is `uploads`.

## HTTP Checks

Run on the deployment machine:

```bash
curl -I -s http://127.0.0.1:3000/admin/ | head -1
curl -I -s http://127.0.0.1:3000/admin/js/admin.js | grep -Ei 'HTTP/|cache-control|etag|content-type'
curl -s -o /tmp/products.json -w '%{http_code} %{size_download}\n' http://127.0.0.1:3000/api/products
```

Expected:

- Admin page and admin JS return `200`.
- `/api/products` returns `200`.
- API responses are not browser-cache dependent.

## Product Image Checks

Pick one known product image path from `/api/products`, then run:

```bash
IMAGE_PATH="uploads/example-product-image.png"
curl -I -s "http://127.0.0.1:3000/${IMAGE_PATH}" | grep -Ei 'HTTP/|cache-control|etag|content-type|content-length'
```

Expected:

- Image returns `200`.
- `Cache-Control` can be long-lived because uploaded product filenames must be unique.
- Do not manually overwrite an existing file path under `UPLOAD_DIR`; upload a new file and persist the new path instead.

## Health Audit

Run:

```bash
npm run images:audit
```

Expected output includes clear labels for:

- `missing cover files`
- `invalid product_media paths`
- `non-upload product_media paths`
- `orphan upload files`
- `assets.entity_id IS NULL`
- `product_media.asset_id IS NULL`

Notes:

- `assets.entity_id IS NULL` and `product_media.asset_id IS NULL` are currently informational because `assets` and `product_media` are not fully linked.
- Missing cover files or invalid `product_media` paths should be treated as actionable problems.

## Admin Upload Acceptance

1. Log in to admin.
2. Edit a product.
3. Upload a new image.
4. Save the product.
5. Confirm no save-validation error toast appears.
6. Reopen the product and confirm the preview uses the saved `uploads/...` path.
7. Open English product list/detail and confirm the image renders.
8. Open Arabic product list/detail and confirm the relative URL resolves as `../uploads/...`.

## Clear Cover Acceptance

1. Edit a product with an existing cover.
2. Remove the image in admin.
3. Save the product.
4. Confirm public product API returns an empty `image` value for that product.
5. Confirm frontend handles the empty image path without showing the old image.

## Fallback Detection

Frontend scripts mark static product fallback by setting:

```html
<html data-products-source="static-fallback">
```

If this marker appears in production, `/api/products` failed and the page loaded `data/products.json` instead. Treat that as degraded mode.
