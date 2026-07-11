# Stage 2A Static SEO Head Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让四种正式语言的 28 个静态 sitemap 页面在服务器原始 HTML 中统一输出唯一 canonical、完整 hreflang 和与当前渲染后页面等价的基础 Schema。

**Architecture:** 新建独立的 `server/lib/staticPageSeoRenderer.js`，集中维护本批次允许处理的七类静态页面及四语言 URL。模块只重写 `<head>` 中受管的 canonical、alternate 和基础 JSON-LD，保持 `<body>` 字节内容不变；`server/app.js` 在 `express.static` 前为28个正式 URL 挂载服务器响应。

**Tech Stack:** Node.js 24、Express 4、原生 `fs`、现有 `config/locales.json`、现有 `server/lib/i18nRoutes.js`、Node `assert`、Playwright。

## Global Constraints

- 只处理 `https://www.lxenelectric.com/`。
- 不修改或请求修改 `.cn`。
- 不创建、开发或上线独立产品分类页面。
- 不修改 Hero 图片、Hero 布局、页面正文、CSS 或客户端可见文案。
- 不修改 Contact 页地址标签。
- 不输出国内电话、国内邮箱或不存在的国际电话/WhatsApp。
- 只支持 `en`、`ar`、`fr`、`ru`；`pt` 继续 planned，不进入输出。
- 不处理或提交 `.tmp/`、`chanpince/`。
- 不修改数据库、Nginx、环境变量、依赖或 sitemap URL 集合。

---

### Task 1: Add failing static SEO renderer tests

**Files:**
- Create: `D:\Projects\longxiang-website\scripts\test-static-page-seo-renderer.js`
- Test: `D:\Projects\longxiang-website\scripts\test-static-page-seo-renderer.js`

**Interfaces:**
- Consumes: planned module `server/lib/staticPageSeoRenderer.js`
- Produces: executable regression gate covering `staticSeoRouteDefinitions()` and `renderStaticPageSeoHtml(html, route, origin)`

- [ ] **Step 1: Write the failing test**

The test must:

1. Require the planned module.
2. Assert exactly 28 unique route definitions.
3. Assert no route contains `products.html`, `/products/`, `/pt/` or any `.cn` origin.
4. Read each route's real HTML file.
5. Render with `https://www.lxenelectric.com`.
6. Assert exactly one canonical and exactly five alternates.
7. Assert alternate keys are `en`, `ar`, `fr`, `ru`, `x-default`.
8. Assert canonical and alternates match the locale configuration.
9. Assert the `<body>` substring is unchanged.
10. Assert the expected page Schema exists once.
11. Assert About/Solutions/Education/Certifications/Compare have one BreadcrumbList.
12. Assert Home and Contact have no BreadcrumbList added by this batch.
13. Assert generated JSON-LD contains no `telephone`, `whatsapp`, domestic email or `.cn`.

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node scripts/test-static-page-seo-renderer.js
```

Expected: fail because `server/lib/staticPageSeoRenderer.js` does not exist.

---

### Task 2: Implement the isolated static SEO renderer

**Files:**
- Create: `D:\Projects\longxiang-website\server\lib\staticPageSeoRenderer.js`
- Test: `D:\Projects\longxiang-website\scripts\test-static-page-seo-renderer.js`

**Interfaces:**
- Consumes:
  - `localeEntries()`
  - `localizedHtmlShellPath(file, locale)`
  - `PUBLIC_COMPANY_IDENTITY`
- Produces:
  - `staticSeoRouteDefinitions(): Array<RouteDefinition>`
  - `renderStaticPageSeoHtml(html: string, route: RouteDefinition, origin: string): string`

The route definition shape is:

```js
{
    path: '/fr/about.html',
    basePath: '/about.html',
    file: 'about.html',
    filePath: 'D:/Projects/longxiang-website/fr/about.html',
    locale: {
        code: 'fr',
        hreflang: 'fr',
        htmlLang: 'fr',
        pathPrefix: '/fr',
        homePath: '/fr/index.html'
    },
    schemaType: 'AboutPage',
    schemaKey: 'content-page',
    breadcrumbKey: 'content-breadcrumb'
}
```

The seven allowed page definitions are:

```js
[
    { basePath: '/', file: 'index.html', schemaType: 'Organization', schemaKey: 'site' },
    { basePath: '/about.html', file: 'about.html', schemaType: 'AboutPage', schemaKey: 'content-page', breadcrumbKey: 'content-breadcrumb' },
    { basePath: '/solutions.html', file: 'solutions.html', schemaType: 'WebPage', schemaKey: 'content-page', breadcrumbKey: 'content-breadcrumb' },
    { basePath: '/education.html', file: 'education.html', schemaType: 'WebPage', schemaKey: 'education-page', breadcrumbKey: 'education-breadcrumb' },
    { basePath: '/certifications.html', file: 'certifications.html', schemaType: 'CollectionPage', schemaKey: 'content-page', breadcrumbKey: 'content-breadcrumb' },
    { basePath: '/compare.html', file: 'compare.html', schemaType: 'WebPage', schemaKey: 'content-page', breadcrumbKey: 'content-breadcrumb' },
    { basePath: '/contact.html', file: 'contact.html', schemaType: 'LocalBusiness', schemaKey: 'site' }
]
```

- [ ] **Step 1: Implement URL generation**

Use only locale entries whose `includeInSitemap` is true. Generate canonical paths as:

```js
function localizedStaticPath(basePath, locale) {
    if (basePath === '/') return locale.homePath;
    return locale.pathPrefix + basePath;
}
```

Generate x-default from the locale with an empty `pathPrefix`.

- [ ] **Step 2: Implement managed head cleanup**

Remove:

- all existing canonical links;
- all existing hreflang alternate links;
- JSON-LD scripts whose `data-schema-auto` matches the route's managed keys;
- existing unmanaged JSON-LD whose top-level `@type` is the route's managed page type or BreadcrumbList.

Do not remove unrelated JSON-LD.

- [ ] **Step 3: Implement page Schema generation**

For AboutPage/WebPage/CollectionPage:

```js
{
    '@context': 'https://schema.org',
    '@type': route.schemaType,
    name: extractedH1 || extractedTitle,
    description: extractedMetaDescription,
    url: canonicalUrl,
    inLanguage: route.locale.htmlLang,
    isPartOf: {
        '@type': 'WebSite',
        name: 'Longxiang Electric',
        url: origin + '/'
    }
}
```

For Organization:

```js
{
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: PUBLIC_COMPANY_IDENTITY.legalName,
    alternateName: PUBLIC_COMPANY_IDENTITY.brandName,
    email: PUBLIC_COMPANY_IDENTITY.globalSalesEmail,
    url: origin + '/'
}
```

For LocalBusiness:

```js
{
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: PUBLIC_COMPANY_IDENTITY.legalName,
    email: PUBLIC_COMPANY_IDENTITY.globalSalesEmail,
    address: PUBLIC_COMPANY_IDENTITY.headquarters,
    url: origin + '/'
}
```

Do not emit `telephone`, `whatsapp`, domestic email or China Website fields.

- [ ] **Step 4: Implement BreadcrumbList**

Only routes with `breadcrumbKey` receive:

```js
{
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        {
            '@type': 'ListItem',
            position: 1,
            name: localizedHomeLabel(route.locale.code),
            item: origin + route.locale.homePath
        },
        {
            '@type': 'ListItem',
            position: 2,
            name: extractedH1 || extractedTitle,
            item: canonicalUrl
        }
    ]
}
```

For English, `route.locale.homePath` is `/`.

- [ ] **Step 5: Inject head tags before `</head>`**

Inject in this order:

1. canonical;
2. en/ar/fr/ru alternates;
3. x-default;
4. page Schema;
5. optional BreadcrumbList.

Escape HTML attributes and replace `<` in JSON with `\u003c`.

- [ ] **Step 6: Run the test and verify GREEN**

Run:

```powershell
node scripts/test-static-page-seo-renderer.js
```

Expected: `static page SEO renderer tests passed (28 routes)`.

---

### Task 3: Mount the 28 server-rendered static routes

**Files:**
- Modify: `D:\Projects\longxiang-website\server\app.js`
- Modify: `D:\Projects\longxiang-website\scripts\test-acceptance.js`
- Modify: `D:\Projects\longxiang-website\package.json`
- Test: `D:\Projects\longxiang-website\scripts\test-static-page-seo-renderer.js`
- Test: `D:\Projects\longxiang-website\scripts\test-acceptance.js`

**Interfaces:**
- Consumes: `staticSeoRouteDefinitions()`, `renderStaticPageSeoHtml()`
- Produces: HTTP 200 original HTML for the 28 exact routes before `express.static`

- [ ] **Step 1: Add a failing HTTP acceptance test**

Add an acceptance test before admin tests that requests all 28 paths and asserts:

- status 200;
- one canonical;
- five hreflang alternates;
- expected canonical;
- no `/pt/` or `.cn`;
- expected page Schema in raw HTML;
- no `telephone`, domestic email or domestic phone;
- `/products.html` remains outside this route set.

Run:

```powershell
node scripts/test-acceptance.js
```

Expected: fail because the server has not mounted the renderer.

- [ ] **Step 2: Mount routes in `server/app.js`**

Import:

```js
const {
    staticSeoRouteDefinitions,
    renderStaticPageSeoHtml
} = require('./lib/staticPageSeoRenderer');
```

After `requestOrigin(req)` and before product/static routes:

```js
staticSeoRouteDefinitions().forEach(function (route) {
    app.get(route.path, function (req, res, next) {
        fs.readFile(route.filePath, 'utf8', function (err, html) {
            if (err) return next(err);
            const rendered = renderStaticPageSeoHtml(html, route, requestOrigin(req));
            sendHtmlString(res, rendered, 200);
        });
    });
});
```

Do not mount `/index.html`, product list, product details, parameter pages or category paths.

- [ ] **Step 3: Add the renderer test to `check:server`**

Insert:

```json
"check:server": "node --check server/app.js && node --check server/routes/products.js && node --check server/lib/publicProducts.js && node --check server/lib/productDetailSeoRenderer.js && node --check server/lib/staticPageSeoRenderer.js && node scripts/test-static-page-seo-renderer.js && node scripts/test-content-block-safe-patch.js && node scripts/test-product-field-safe-patch.js && node scripts/test-acceptance.js"
```

- [ ] **Step 4: Verify unit and HTTP tests GREEN**

Run:

```powershell
node scripts/test-static-page-seo-renderer.js
node scripts/test-acceptance.js
```

Expected: all tests pass and the new acceptance test reports 28 routes.

---

### Task 4: Full regression and production verification

**Files:**
- Modify: `D:\Projects\longxiang-website\docs\seo\stage2-com-technical-audit-20260711.md`

**Interfaces:**
- Consumes: completed renderer and server routes
- Produces: verified stage2A completion evidence

- [ ] **Step 1: Run syntax and repository checks**

```powershell
node --check server/lib/staticPageSeoRenderer.js
node --check server/app.js
node --check scripts/test-static-page-seo-renderer.js
git diff --check
npm run check:all
```

- [ ] **Step 2: Run SEO and schema audits against local server**

```powershell
node scripts/generate-sitemap.js --dry-run
node scripts/verify-seo-i18n.js
node scripts/audit-schema-structured-data.js --base http://127.0.0.1:3000
node scripts/audit-product-detail-raw-seo.js --base http://127.0.0.1:3000 --expected-count 152
```

Expected:

- sitemap remains 184;
- no pt exposure;
- no missing/mismatched Schema;
- all 152 product routes remain unchanged.

- [ ] **Step 3: Run browser regression**

```powershell
npx playwright test tests/smoke.spec.js --reporter=line
```

Expected: all existing tests pass, including Hero, Contact label, international-only contact, four-language footer and parameter URL behavior.

- [ ] **Step 4: Update the audit report**

Append a stage2A implementation record containing:

- original canonical 28/28;
- original complete hreflang 28/28;
- raw required page Schema 28/28;
- sitemap 184;
- no UI, Hero, Contact, category or contact-data changes.

- [ ] **Step 5: Commit, push and deploy**

```powershell
git add server/lib/staticPageSeoRenderer.js server/app.js scripts/test-static-page-seo-renderer.js scripts/test-acceptance.js package.json docs/seo/stage2-com-technical-audit-20260711.md docs/superpowers/plans/2026-07-11-stage2a-static-seo-head.md
git commit -m "统一全球站静态页原始SEO标签"
git push origin main
ssh longxiang "cd /home/ubuntu/longxiang-website && git pull --ff-only origin main && pm2 status longxiang-website --no-color"
```

Because runtime server code changes, restart PM2 only after the pull and only once:

```powershell
ssh longxiang "pm2 restart longxiang-website && pm2 status longxiang-website --no-color"
```

- [ ] **Step 6: Verify production original HTML**

Audit all 28 production routes:

- one canonical each;
- five alternates each;
- page Schema each;
- no duplicate Organization;
- no pt or `.cn` SEO link;
- no domestic contact;
- real browser appearance unchanged.

If production verification fails, revert through GitHub and let the server pull the revert; never edit production files directly.
