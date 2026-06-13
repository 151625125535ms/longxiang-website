# Admin UI/UX Optimization Progress

## Batch 1: Lists, Filters, Pagination, Batch Actions

### Precheck
- [x] Browser visited `http://127.0.0.1:3000/admin/`; Chinese text renders correctly.

### 1-A Pagination Helper
- [x] Create `admin/js/pagination.js` with `renderPagination(container, meta, onPageChange)`.
- [x] Include `js/pagination.js` in `admin/index.html`.

### 1-B Products List
- [x] Add status filter: All / Published / Draft.
- [x] Add featured filter: All / Yes / No.
- [x] Add clear filters button shown only when filters are active.
- [x] Use `/admin/products?status=&featured=&q=&page=&pageSize=` parameters.
- [x] Render pagination with `renderPagination()`.

### 1-C Inquiries List
- [x] Add search input.
- [x] Add unread filter toggle: All / Unread only.
- [x] Add row checkboxes plus select-all checkbox.
- [x] Add sticky batch bar: selected count, mark read, close, delete, clear selection.
- [x] Call `/admin/inquiries/batch` with `mark_read`, `close`, `soft_delete`.
- [x] Refresh list, clear selection, and show toast after batch actions.

### 1-D Certifications List
- [x] Add search input.
- [x] Add status filter dropdown.
- [x] Render pagination with `renderPagination()`.

### 1-E Verification
- [x] `node --check server/app.js`
- [x] `node --check server/routes/admin/inquiries.js`
- [x] `node --check server/routes/admin/products.js`
- [x] `node --check admin/js/admin.js`
- [x] `node --check admin/js/pagination.js`
- [x] `git diff --check`
- [x] `npx playwright test tests/smoke.spec.js --reporter=line`
- [x] Product add/edit modal remains functional.
- [x] Certification add/edit modal remains functional.
- [x] Single inquiry status save remains functional.

## Blockers

None.



