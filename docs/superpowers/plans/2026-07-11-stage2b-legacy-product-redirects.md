# Stage 2B Legacy Product Redirects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将四种正式语言的旧 `product-detail.html?id=...` URL 服务端永久重定向到唯一、无参数的清洁产品 URL，同时对无效或歧义标识返回本语言 404。

**Architecture:** 新建 `server/lib/legacyProductRedirect.js`，集中维护 28 条经过批准的大小写敏感 alias 白名单，并使用当前公开产品数据按 `legacy_id → slug → approved alias` 的顺序解析唯一目标。`server/app.js` 在 `express.static` 之前挂载四语言精确旧路径；独立审计脚本以 `redirect: manual` 验证 GET/HEAD、Location、404 和无重定向链。

**Tech Stack:** Node.js 24、Express 4、SQLite 只读产品接口、Node `assert`、Playwright、现有 SEO 审计脚本。

## Global Constraints

- 本批次只修改 `lxenelectric.com`，不得读取后修改或部署 `.cn`。
- 不写数据库，不修改 `aliases_json`，不改变 `readPublicProduct()` 或清洁产品 alias URL 的现有行为。
- 不创建分类页、分类路由、分类 Schema、分类 hreflang、分类 sitemap URL 或分类数据库字段。
- 不修改 `/products.html`、筛选参数策略、清洁产品页、sitemap URL 集合、canonical、hreflang、Schema、正文、CSS 或客户端 UI。
- 不修改 Hero 图片或布局，不降低图片清晰度，不修改 Contact 地址标签或联系方式。
- 不输出国内电话、国内邮箱、虚构国际电话或 WhatsApp；`pt` 继续 planned。
- 旧 URL 只接收一个非空字符串 `id`；其他 query 一律丢弃，Location 不带 query 或 fragment。
- `.tmp/`、`chanpince/` 保持未跟踪且不进入提交。
- 主代理独占文件修改、Git 和部署；子代理只能只读审查和复核测试结果。

---

### Task 1: Add the approved legacy redirect resolver with TDD

**Files:**
- Create: `D:\Projects\longxiang-website\scripts\test-legacy-product-redirect.js`
- Create: `D:\Projects\longxiang-website\server\lib\legacyProductRedirect.js`

**Interfaces:**
- Consumes: `readPublicProducts(): Product[]` from `server/lib/publicProducts.js`
- Produces: `APPROVED_LEGACY_ALIAS_REDIRECTS`, `resolveLegacyProductRedirect(identifier, products?)`, `localizedLegacyProductPath(targetIdentifier, locale)`

- [x] **Step 1: Write the failing resolver test**

The test must require the planned module, assert exactly 28 frozen case-sensitive aliases, verify all current products by `id` and `slug`, verify all approved aliases, and prove that `3phase-3limb` and `3phase-5limb` resolve to themselves before alias lookup. It must also reject missing, empty, whitespace-padded, array, object, unknown, ambiguous legacy ID, ambiguous slug and missing whitelist targets.

- [x] **Step 2: Run the resolver test and verify RED**

Run:

```powershell
node scripts/test-legacy-product-redirect.js
```

Expected: fail because `server/lib/legacyProductRedirect.js` does not exist.

- [x] **Step 3: Implement the minimal resolver**

The resolver must:

1. Reject any identifier whose type is not string, is empty, or changes after `trim()`.
2. Find exactly one product by `product.id === identifier`; multiple matches return `null`.
3. If no legacy ID matches, find exactly one product by `product.slug === identifier`; multiple matches return `null`.
4. If no direct match exists, read the exact case-sensitive target from the frozen 28-entry whitelist.
5. Resolve the whitelist target to exactly one current product by `slug || id`; missing or duplicate targets return `null`.
6. Return `{ matchedBy, sourceIdentifier, targetIdentifier }` without modifying product data.
7. Build the target path from `locale.pathPrefix + '/products/' + encodeURIComponent(targetIdentifier)`.

- [x] **Step 4: Run the resolver test and verify GREEN**

Run:

```powershell
node scripts/test-legacy-product-redirect.js
```

Expected: resolver tests pass with 38 products, 28 approved aliases and 2 direct-over-alias conflicts.

---

### Task 2: Add failing HTTP coverage and mount the exact 301 route

**Files:**
- Create: `D:\Projects\longxiang-website\scripts\audit-legacy-product-redirects.js`
- Modify: `D:\Projects\longxiang-website\scripts\test-acceptance.js`
- Modify: `D:\Projects\longxiang-website\server\app.js`
- Modify: `D:\Projects\longxiang-website\package.json`

**Interfaces:**
- Consumes: resolver exports from Task 1, `localeForRequestPath()`, existing `sendNotFoundShell()`
- Produces: HTTP 301/404 behavior for `^/(?:ar/|fr/|ru/)?product-detail\.html$`; reusable audit command with `--base`

- [x] **Step 1: Write the failing HTTP tests and audit script**

The acceptance test must verify a valid English direct ID, one localized alias, both conflicts, query dropping, missing/duplicate/unknown IDs, and GET/HEAD parity. The audit script must cover 38 legacy IDs × 4 locales, all formal slugs × 4, 28 aliases × 4, 2 conflicts × 4, invalid cases in every locale, clean Location values and a cached set of 200 final targets.

- [x] **Step 2: Run HTTP coverage and verify RED**

Run:

```powershell
node scripts/test-acceptance.js
```

Expected: fail because `express.static` still serves the old HTML as 200.

- [x] **Step 3: Mount the route before `express.static`**

Add an exact GET route for the four allowed paths. Reject non-scalar `req.query.id`; resolve the target through the new module; call `sendNotFoundShell()` for invalid or unresolved values; otherwise call `res.redirect(301, cleanLocalizedPath)`. Do not copy any query parameters. Rely on Express GET-to-HEAD behavior and test it explicitly.

- [x] **Step 4: Register syntax, unit and audit gates**

Add the new module/test/audit syntax checks to the existing package scripts without removing current checks. Keep `check:all` as the full repository gate.

- [x] **Step 5: Verify GREEN**

Run:

```powershell
node scripts/test-legacy-product-redirect.js
node scripts/test-acceptance.js
node scripts/audit-legacy-product-redirects.js --base http://127.0.0.1:3000
```

Expected: complete redirect matrix passes; existing acceptance total increases with zero failures.

---

### Task 3: Full regression, read-only review and documentation

**Files:**
- Modify: `D:\Projects\longxiang-website\docs\seo\stage2-com-technical-audit-20260711.md`
- Modify: `D:\Projects\longxiang-website\docs\superpowers\plans\2026-07-11-stage2b-legacy-product-redirects.md`

**Interfaces:**
- Consumes: completed implementation and audit evidence
- Produces: local verification record and review findings before commit

- [x] **Step 1: Run all local gates sequentially**

Run syntax checks, `git diff --check`, `npm run check:all`, sitemap dry-run, SEO i18n verification, legacy redirect audit, 152-product raw SEO audit, 184-URL schema audit, then the 18-test Playwright smoke suite. Do not run the two full browser audits concurrently.

- [x] **Step 2: Dispatch two read-only subagent reviews**

One subagent reviews code/spec boundaries; the other reviews alias/301/404 matrices and test output. They may not edit files, run Git writes or access the server. The main agent independently verifies and fixes actionable findings.

- [x] **Step 3: Update the SEO audit record**

Record exact counts, 404 cases, GET/HEAD parity, query dropping, unchanged sitemap/schema/product/browser results, and all excluded scopes.

---

### Task 4: Commit, deploy and verify production

**Files:**
- Commit only the files listed by Tasks 1–3.

**Interfaces:**
- Consumes: fully reviewed and verified local change
- Produces: deployed production 301 behavior with rollback commit boundary

- [ ] **Step 1: Stage precisely and commit**

Run `git diff --cached --check`, commit as `规范旧查询式产品详情URL`, and push `origin main`.

- [ ] **Step 2: Pull and restart once**

Verify the production checkout is clean, run `git pull --ff-only origin main`, restart `longxiang-website` exactly once, and confirm PM2 is `online`.

- [ ] **Step 3: Run full production verification**

Run the complete redirect audit against `https://www.lxenelectric.com`, the 152-product raw audit, the 184-URL schema audit, and real-browser checks for four representative language redirects and Contact constraints.

- [ ] **Step 4: Record production evidence**

Mark all plan steps complete and append production results. Commit and deploy documentation only without another PM2 restart.

If any production check fails, create and deploy a Git revert; never edit server files directly. Report that cached 301 responses may outlive a code rollback.
