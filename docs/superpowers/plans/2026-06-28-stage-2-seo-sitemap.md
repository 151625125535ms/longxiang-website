# Stage 2 SEO and Sitemap Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix sitemap dry-run behavior, add sitemap hreflang alternates, strengthen English/Arabic static SEO fallbacks, and add a repeatable SEO/i18n verification script without touching later governance stages.

**Architecture:** Keep Stage 2 narrowly scoped to SEO correctness and validation. `scripts/generate-sitemap.js` remains the single sitemap source, static HTML files provide crawler-safe fallback metadata, and `scripts/verify-seo-i18n.js` becomes the local regression check for robots, sitemap, canonical, title, description, H tags, and hreflang basics. No multilingual architecture refactor, resource cleanup, database migration, CSS split, JS module split, or admin modularization belongs in this stage.

**Tech Stack:** Node.js, static HTML, vanilla JavaScript, XML sitemap, robots.txt, GitHub `main`, AWS Lightsail production pull, PM2.

---

## Scope Boundaries

### Allowed Files

- Modify: `D:\Projects\longxiang-website\scripts\generate-sitemap.js`
- Create: `D:\Projects\longxiang-website\scripts\verify-seo-i18n.js`
- Modify: `D:\Projects\longxiang-website\sitemap.xml`
- Modify: `D:\Projects\longxiang-website\product-detail.html`
- Modify: `D:\Projects\longxiang-website\products.html`
- Modify: `D:\Projects\longxiang-website\ar\product-detail.html`
- Modify: `D:\Projects\longxiang-website\ar\products.html`
- Modify: `D:\Projects\longxiang-website\js\content-pages.js`
- Modify only if verification proves it necessary: `D:\Projects\longxiang-website\js\product-detail.js`

### Files and Areas Not Allowed in Stage 2

- Do not touch: `D:\Projects\longxiang-website\.tmp\`
- Do not touch: `D:\Projects\longxiang-website\chanpince\`
- Do not touch: `D:\Projects\longxiang-website\server\db\`
- Do not touch: `D:\Projects\longxiang-website\data\`
- Do not touch: `D:\Projects\longxiang-website\uploads\`
- Do not touch: `D:\Projects\longxiang-website\admin\`
- Do not touch: `D:\Projects\longxiang-website\css\styles.css`
- Do not touch: `D:\Projects\longxiang-website\js\main.js`
- Do not touch: package dependency files unless a verification command proves a missing script cannot be run without changing them:
  - `D:\Projects\longxiang-website\package.json`
  - `D:\Projects\longxiang-website\package-lock.json`
- Do not add new languages.
- Do not change the current English/Arabic URL structure.
- Do not copy competitor wording or competitor page content.
- Do not start Stage 3-6 work.

## Current Observations

- `scripts/generate-sitemap.js` currently writes `sitemap.xml` unconditionally in `main()` and does not parse `--dry-run`.
- `sitemap.xml` currently uses only the sitemap namespace and has no `xhtml:link` hreflang alternates.
- `robots.txt` already allows public pages, blocks admin/auth API paths, and points to `https://www.lxenelectric.com/sitemap.xml`.
- `products.html` already has a useful English title, description, canonical, Open Graph, Twitter metadata, and CollectionPage JSON-LD.
- `product-detail.html` has English fallback title/description but lacks static product-detail fallback text in the hero/title placeholders. Product-specific canonical and alternates are injected by `js/product-detail.js` after loading the product.
- `ar/products.html` and `ar/product-detail.html` currently have empty meta descriptions and generic `Longxiang` titles, so Arabic static SEO fallback is weak.
- `js/content-pages.js` currently updates canonical and social metadata but does not add English/Arabic/x-default alternate links for content pages.
- `js/product-detail.js` already injects product canonical and alternate links for product detail pages. Stage 2 should verify this before changing it.

---

## Task 1: Baseline and Current-State Checks

**Files:**
- Read: `D:\Projects\longxiang-website\AGENTS.md`
- Read: `D:\Projects\longxiang-website\docs\superpowers\plans\2026-06-28-project-governance.md`
- Read: allowed files listed above

- [ ] **Step 1: Confirm branch**

Run:

```powershell
git branch --show-current
```

Expected:

```text
main
```

- [ ] **Step 2: Confirm working tree before Stage 2**

Run:

```powershell
git status --short
```

Expected known untracked entries may include:

```text
?? .tmp/
?? chanpince/
?? docs/superpowers/
```

If tracked files are modified, inspect them before continuing:

```powershell
git diff -- <tracked-file>
```

Do not restore or overwrite user changes unless the user explicitly authorizes it.

- [ ] **Step 3: Confirm sitemap script currently has no dry-run handling**

Run:

```powershell
Select-String -Path scripts\generate-sitemap.js -Pattern 'dry|argv|writeFileSync|xhtml|hreflang' -CaseSensitive:$false
```

Expected before implementation:

```text
writeFileSync is present.
No real dry-run argument handling is present.
No xhtml namespace or hreflang output is present.
```

- [ ] **Step 4: Confirm target SEO fallback gaps**

Run:

```powershell
Select-String -Path product-detail.html,products.html,ar\product-detail.html,ar\products.html -Pattern '<title>|name="description"|rel="canonical"|hreflang|<h1|page-hero-title' -CaseSensitive:$false
```

Expected before implementation:

```text
products.html has English metadata and canonical.
ar/products.html has generic or empty fallback metadata.
ar/product-detail.html has generic or empty fallback metadata.
product-detail.html has dynamic H1 placeholders and no product-specific static canonical.
```

- [ ] **Step 5: Confirm existing product detail dynamic SEO**

Run:

```powershell
Select-String -Path js\product-detail.js -Pattern "upsertHeadLink\('canonical'|hreflang: 'en'|hreflang: 'ar'|hreflang: 'x-default'|og:type', 'product'" -CaseSensitive:$false
```

Expected:

```text
The script injects product canonical, en/ar/x-default alternates, and Product Open Graph metadata.
```

---

## Task 2: Add SEO/i18n Verification Script First

**Files:**
- Create: `D:\Projects\longxiang-website\scripts\verify-seo-i18n.js`

- [ ] **Step 1: Create `scripts\verify-seo-i18n.js`**

Create the file with this complete content:

```javascript
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_ORIGIN = 'https://www.lxenelectric.com';

const htmlChecks = [
    {
        file: 'products.html',
        lang: 'en',
        dir: null,
        titleIncludes: ['Longxiang'],
        canonical: SITE_ORIGIN + '/products.html',
        h1Pattern: /<h1[^>]*>\s*Products\s*<\/h1>/i,
        descriptionMin: 80,
        requireStaticAlternates: true
    },
    {
        file: 'ar/products.html',
        lang: 'ar',
        dir: 'rtl',
        titleIncludes: ['Longxiang'],
        canonical: SITE_ORIGIN + '/ar/products.html',
        h1Pattern: /<h1[^>]*>[\s\S]*?<\/h1>/i,
        descriptionMin: 40,
        requireStaticAlternates: true
    },
    {
        file: 'product-detail.html',
        lang: 'en',
        dir: null,
        titleIncludes: ['Product'],
        canonical: null,
        h1Pattern: /<h1[^>]*id="product-title"[^>]*>\s*Product Details\s*<\/h1>/i,
        descriptionMin: 80,
        requireDynamicProductSeo: true
    },
    {
        file: 'ar/product-detail.html',
        lang: 'ar',
        dir: 'rtl',
        titleIncludes: ['Longxiang'],
        canonical: null,
        h1Pattern: /<h1[^>]*id="product-title"[^>]*>[\s\S]+?<\/h1>/i,
        descriptionMin: 40,
        requireDynamicProductSeo: true
    }
];

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function fail(message) {
    throw new Error(message);
}

function assert(condition, message) {
    if (!condition) fail(message);
}

function attr(html, tagPattern, attrName) {
    const match = html.match(tagPattern);
    if (!match) return '';
    const tag = match[0];
    const attrMatch = tag.match(new RegExp(attrName + '=["\']([^"\']+)["\']', 'i'));
    return attrMatch ? attrMatch[1].trim() : '';
}

function metaContent(html, selectorName) {
    const escaped = selectorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('<meta\\s+[^>]*name=["\']' + escaped + '["\'][^>]*>', 'i');
    return attr(html, pattern, 'content');
}

function linkHref(html, rel, extraAttr) {
    const relEscaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let patternText = '<link\\s+[^>]*rel=["\']' + relEscaped + '["\'][^>]*';
    if (extraAttr) patternText += extraAttr;
    patternText += '>';
    return attr(html, new RegExp(patternText, 'i'), 'href');
}

function hasAlternate(html, hreflang, href) {
    const escapedLang = hreflang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
        new RegExp('<link\\s+[^>]*rel=["\']alternate["\'][^>]*hreflang=["\']' + escapedLang + '["\'][^>]*href=["\']' + escapedHref + '["\'][^>]*>', 'i'),
        new RegExp('<link\\s+[^>]*href=["\']' + escapedHref + '["\'][^>]*hreflang=["\']' + escapedLang + '["\'][^>]*rel=["\']alternate["\'][^>]*>', 'i')
    ];
    return patterns.some(function (pattern) {
        return pattern.test(html);
    });
}

function expectedAlternatesFor(file) {
    if (file === 'products.html' || file === 'ar/products.html') {
        return {
            en: SITE_ORIGIN + '/products.html',
            ar: SITE_ORIGIN + '/ar/products.html',
            'x-default': SITE_ORIGIN + '/products.html'
        };
    }
    return null;
}

function checkHtmlFallbacks() {
    htmlChecks.forEach(function (check) {
        const html = read(check.file);
        const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
        const description = metaContent(html, 'description');
        const htmlLang = attr(html, /<html\s+[^>]*>/i, 'lang');
        const htmlDir = attr(html, /<html\s+[^>]*>/i, 'dir');

        assert(htmlLang === check.lang, check.file + ': expected html lang="' + check.lang + '"');
        if (check.dir) assert(htmlDir === check.dir, check.file + ': expected html dir="' + check.dir + '"');
        check.titleIncludes.forEach(function (part) {
            assert(title.indexOf(part) !== -1, check.file + ': title must include "' + part + '"');
        });
        assert(description.trim().length >= check.descriptionMin, check.file + ': meta description is too short or empty');
        assert(check.h1Pattern.test(html), check.file + ': expected non-empty H1 fallback');

        if (check.canonical) {
            const canonical = linkHref(html, 'canonical');
            assert(canonical === check.canonical, check.file + ': canonical mismatch. Found: ' + canonical);
        }

        if (check.requireStaticAlternates) {
            const alternates = expectedAlternatesFor(check.file);
            Object.keys(alternates).forEach(function (lang) {
                assert(hasAlternate(html, lang, alternates[lang]), check.file + ': missing alternate ' + lang);
            });
        }
    });
}

function checkDynamicProductSeo() {
    const script = read('js/product-detail.js');
    [
        "upsertHeadLink('canonical'",
        "hreflang: 'en'",
        "hreflang: 'ar'",
        "hreflang: 'x-default'",
        "og:type', 'product'"
    ].forEach(function (needle) {
        assert(script.indexOf(needle) !== -1, 'js/product-detail.js missing dynamic SEO marker: ' + needle);
    });
}

function parseSitemapUrls(xml) {
    const urls = [];
    const urlPattern = /<url>([\s\S]*?)<\/url>/g;
    let match;
    while ((match = urlPattern.exec(xml))) {
        const block = match[1];
        const loc = (block.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1] || '';
        const alternates = [];
        const altPattern = /<xhtml:link\s+[^>]*rel="alternate"[^>]*>/g;
        let altMatch;
        while ((altMatch = altPattern.exec(block))) {
            const tag = altMatch[0];
            alternates.push({
                hreflang: attr(tag, /^<xhtml:link[\s\S]*>$/i, 'hreflang'),
                href: attr(tag, /^<xhtml:link[\s\S]*>$/i, 'href')
            });
        }
        urls.push({ loc: loc, alternates: alternates });
    }
    return urls;
}

function checkSitemap() {
    const xml = read('sitemap.xml');
    assert(xml.indexOf('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"') !== -1, 'sitemap missing default namespace');
    assert(xml.indexOf('xmlns:xhtml="http://www.w3.org/1999/xhtml"') !== -1, 'sitemap missing xhtml namespace');

    const urls = parseSitemapUrls(xml);
    assert(urls.length >= 16, 'sitemap URL count looks too low: ' + urls.length);
    urls.forEach(function (entry) {
        ['en', 'ar', 'x-default'].forEach(function (lang) {
            assert(entry.alternates.some(function (alt) {
                return alt.hreflang === lang && /^https:\/\/www\.lxenelectric\.com\//.test(alt.href);
            }), 'sitemap entry missing ' + lang + ' alternate: ' + entry.loc);
        });
    });
}

function checkRobots() {
    const robots = read('robots.txt');
    [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        'Disallow: /api/admin/',
        'Disallow: /api/auth/',
        'Sitemap: ' + SITE_ORIGIN + '/sitemap.xml'
    ].forEach(function (line) {
        assert(robots.indexOf(line) !== -1, 'robots.txt missing line: ' + line);
    });
}

function main() {
    checkHtmlFallbacks();
    checkDynamicProductSeo();
    checkSitemap();
    checkRobots();
    console.log('SEO/i18n verification passed');
}

if (require.main === module) {
    main();
}
```

- [ ] **Step 2: Run the new script and confirm it fails before fixes**

Run:

```powershell
node scripts/verify-seo-i18n.js
```

Expected before implementation:

```text
The command fails because sitemap hreflang, Arabic static metadata, or static H1 fallback checks are not yet satisfied.
```

- [ ] **Step 3: Check syntax of the new script**

Run:

```powershell
node --check scripts/verify-seo-i18n.js
```

Expected:

```text
No syntax errors.
```

---

## Task 3: Fix Sitemap Dry-Run and Add Hreflang Alternates

**Files:**
- Modify: `D:\Projects\longxiang-website\scripts\generate-sitemap.js`
- Later generated output: `D:\Projects\longxiang-website\sitemap.xml`

- [ ] **Step 1: Add locale and static alternate helpers**

In `scripts\generate-sitemap.js`, add these constants and helpers near the existing constants:

```javascript
const LOCALES = ['en', 'ar'];
const DEFAULT_LOCALE = 'en';

function normalizePagePath(pathname) {
    if (pathname === '/') return '/';
    return '/' + String(pathname || '').replace(/^\/+/, '').replace(/\/+$/, '');
}

function staticAlternatePaths(pathname) {
    const normalized = normalizePagePath(pathname);
    if (normalized === '/') {
        return {
            en: '/',
            ar: '/ar/index.html',
            'x-default': '/'
        };
    }
    if (normalized === '/ar/index.html') {
        return {
            en: '/',
            ar: '/ar/index.html',
            'x-default': '/'
        };
    }
    if (normalized.indexOf('/ar/') === 0) {
        return {
            en: normalized.replace(/^\/ar\//, '/'),
            ar: normalized,
            'x-default': normalized.replace(/^\/ar\//, '/')
        };
    }
    return {
        en: normalized,
        ar: '/ar' + normalized,
        'x-default': normalized
    };
}

function productAlternatePaths(id) {
    const encodedId = encodeURIComponent(id);
    return {
        en: '/products/' + encodedId,
        ar: '/ar/products/' + encodedId,
        'x-default': '/products/' + encodedId
    };
}
```

- [ ] **Step 2: Replace `makeEntry` with an alternate-aware version**

Replace the existing `makeEntry(loc, lastmod, changefreq, priority)` with:

```javascript
function makeAlternateLinks(alternates) {
    if (!alternates) return [];
    return Object.keys(alternates).map(function (hreflang) {
        return '    <xhtml:link rel="alternate" hreflang="' + escapeXml(hreflang) + '" href="' + escapeXml(buildUrl(alternates[hreflang])) + '" />';
    });
}

function makeEntry(pathname, lastmod, changefreq, priority, alternates) {
    return [
        '  <url>',
        '    <loc>' + escapeXml(buildUrl(pathname)) + '</loc>',
        '    <lastmod>' + escapeXml(lastmod) + '</lastmod>',
        '    <changefreq>' + escapeXml(changefreq) + '</changefreq>',
        '    <priority>' + escapeXml(priority) + '</priority>'
    ].concat(makeAlternateLinks(alternates), [
        '  </url>'
    ]).join('\n');
}
```

- [ ] **Step 3: Update static page entry generation**

Change the `STATIC_PAGES.forEach` call so each entry passes a path and alternates:

```javascript
entries.push(makeEntry(
    page.path,
    toIsoDate(lastmodSource),
    page.changefreq,
    page.priority,
    staticAlternatePaths(page.path)
));
```

- [ ] **Step 4: Update product entry generation**

Change the product loop so English and Arabic entries share the same alternate group:

```javascript
const alternates = productAlternatePaths(id);
entries.push(makeEntry(
    alternates.en,
    lastmod,
    'monthly',
    '0.7',
    alternates
));
entries.push(makeEntry(
    alternates.ar,
    lastmod,
    'monthly',
    '0.6',
    alternates
));
```

- [ ] **Step 5: Add the xhtml namespace**

Change sitemap root generation to:

```javascript
return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    + entries.join('\n')
    + '\n</urlset>\n';
```

- [ ] **Step 6: Implement real `--dry-run` behavior**

Replace `main()` with:

```javascript
function main(argv) {
    argv = argv || process.argv.slice(2);
    const dryRun = argv.indexOf('--dry-run') !== -1;
    const xml = buildSitemap();
    const urlCount = (xml.match(/<url>/g) || []).length;
    if (dryRun) {
        console.log('Sitemap dry run: output not written');
        console.log('Output path:', OUTPUT_PATH);
        console.log('URL count:', urlCount);
        return;
    }
    fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
    console.log('Sitemap generated:', OUTPUT_PATH);
    console.log('URL count:', urlCount);
}
```

Update the module export to:

```javascript
module.exports = {
    buildSitemap,
    main
};
```

- [ ] **Step 7: Verify dry-run does not write**

Run:

```powershell
$before = Get-FileHash sitemap.xml
npm run sitemap:generate -- --dry-run
$after = Get-FileHash sitemap.xml
if ($before.Hash -ne $after.Hash) { throw "sitemap.xml changed during dry-run" }
```

Expected:

```text
Sitemap dry run: output not written
Output path: D:\Projects\longxiang-website\sitemap.xml
URL count: <number>
```

- [ ] **Step 8: Check syntax**

Run:

```powershell
node --check scripts/generate-sitemap.js
```

Expected:

```text
No syntax errors.
```

---

## Task 4: Improve Static SEO Fallback and Alternate Links

**Files:**
- Modify: `D:\Projects\longxiang-website\products.html`
- Modify: `D:\Projects\longxiang-website\product-detail.html`
- Modify: `D:\Projects\longxiang-website\ar\products.html`
- Modify: `D:\Projects\longxiang-website\ar\product-detail.html`
- Modify: `D:\Projects\longxiang-website\js\content-pages.js`
- Read and verify: `D:\Projects\longxiang-website\js\product-detail.js`

- [ ] **Step 1: Add static alternates to `products.html`**

In `products.html`, keep the existing title, description, canonical, OG, Twitter, and JSON-LD. Add these links after the canonical link:

```html
    <link rel="alternate" hreflang="en" href="https://www.lxenelectric.com/products.html">
    <link rel="alternate" hreflang="ar" href="https://www.lxenelectric.com/ar/products.html">
    <link rel="alternate" hreflang="x-default" href="https://www.lxenelectric.com/products.html">
```

- [ ] **Step 2: Improve English product detail static fallback**

In `product-detail.html`, keep the current description and title. Change the empty hero and H1 placeholders to useful fallback text that the runtime script can replace:

```html
            <div class="breadcrumb" aria-live="polite"><span class="current" id="breadcrumb-product">Product Details</span></div>
            <p class="page-hero-title" id="page-title">Product Details</p>
            <p id="page-subtitle">Review product information, specifications and inquiry details.</p>
```

And:

```html
                            <h1 id="product-title">Product Details</h1>
                            <div class="product-detail-desc" id="product-desc">Review product information, specifications and inquiry details. The page will load the selected Longxiang product automatically.</div>
```

Do not add a static canonical to `product-detail.html`; product detail canonical URLs are product-specific and are injected by `js/product-detail.js`.

- [ ] **Step 3: Improve Arabic product listing static fallback**

In `ar\products.html`, replace the empty description and generic title with Arabic fallback metadata, add canonical and alternates, and keep existing script/style paths:

```html
    <meta name="description" content="تصفح محولات لونغشيانغ، معدات المفاتيح الكهربائية، شواحن المركبات الكهربائية، أنظمة تخزين الطاقة ومعدات الطاقة الشمسية للمشاريع الصناعية ومشاريع الطاقة.">
    <title>المحولات والمفاتيح الكهربائية وشواحن المركبات الكهربائية | Longxiang</title>
    <link rel="canonical" href="https://www.lxenelectric.com/ar/products.html">
    <link rel="alternate" hreflang="en" href="https://www.lxenelectric.com/products.html">
    <link rel="alternate" hreflang="ar" href="https://www.lxenelectric.com/ar/products.html">
    <link rel="alternate" hreflang="x-default" href="https://www.lxenelectric.com/products.html">
    <meta property="og:type" content="website">
    <meta property="og:title" content="المحولات والمفاتيح الكهربائية وشواحن المركبات الكهربائية | Longxiang">
    <meta property="og:description" content="تصفح محولات لونغشيانغ، معدات المفاتيح الكهربائية، شواحن المركبات الكهربائية، أنظمة تخزين الطاقة ومعدات الطاقة الشمسية للمشاريع الصناعية ومشاريع الطاقة.">
    <meta property="og:url" content="https://www.lxenelectric.com/ar/products.html">
    <meta property="og:image" content="https://www.lxenelectric.com/assets/optimized/longxiang-logo-symbol-320.webp">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="المحولات والمفاتيح الكهربائية وشواحن المركبات الكهربائية | Longxiang">
    <meta name="twitter:description" content="تصفح محولات لونغشيانغ، معدات المفاتيح الكهربائية، شواحن المركبات الكهربائية، أنظمة تخزين الطاقة ومعدات الطاقة الشمسية للمشاريع الصناعية ومشاريع الطاقة.">
    <meta name="twitter:image" content="https://www.lxenelectric.com/assets/optimized/longxiang-logo-symbol-320.webp">
```

Also replace the empty hero fallback:

```html
            <h1>المنتجات</h1>
            <p>تصفح محولات لونغشيانغ، معدات المفاتيح الكهربائية، شواحن المركبات الكهربائية وأنظمة الطاقة.</p>
```

- [ ] **Step 4: Improve Arabic product detail static fallback**

In `ar\product-detail.html`, replace the empty description and generic title with Arabic fallback metadata:

```html
    <meta name="description" content="راجع تفاصيل منتجات لونغشيانغ، المواصفات الفنية، سيناريوهات التطبيق ومعلومات طلب عرض السعر لمعدات الطاقة.">
    <title>تفاصيل المنتج | Longxiang Electrical</title>
```

Replace the empty hero and H1 placeholders:

```html
            <div class="breadcrumb" aria-live="polite"><span class="current" id="breadcrumb-product">تفاصيل المنتج</span></div>
            <p class="page-hero-title" id="page-title">تفاصيل المنتج</p>
            <p id="page-subtitle">راجع معلومات المنتج والمواصفات وبيانات طلب عرض السعر.</p>
```

And:

```html
                            <h1 id="product-title">تفاصيل المنتج</h1>
                            <div class="product-detail-desc" id="product-desc">راجع معلومات المنتج والمواصفات وبيانات طلب عرض السعر. سيتم تحميل المنتج المحدد تلقائيا.</div>
```

Do not add a static canonical to `ar\product-detail.html`; product-specific Arabic canonical URLs are injected by `js/product-detail.js`.

- [ ] **Step 5: Add content-page alternate links in `js\content-pages.js`**

Add this helper near `absoluteSiteUrl` / SEO helpers:

```javascript
    function alternatePathsForCanonical(pathname) {
        pathname = String(pathname || '').trim() || '/';
        if (pathname === '/ar/' || pathname === '/ar/index.html') {
            return { en: '/', ar: '/ar/index.html', 'x-default': '/' };
        }
        if (pathname === '/') {
            return { en: '/', ar: '/ar/index.html', 'x-default': '/' };
        }
        if (pathname.indexOf('/ar/') === 0) {
            var enPath = pathname.replace(/^\/ar\//, '/');
            return { en: enPath, ar: pathname, 'x-default': enPath };
        }
        return { en: pathname, ar: '/ar' + pathname, 'x-default': pathname };
    }

    function upsertAlternateLinks(canonicalPath) {
        var alternates = alternatePathsForCanonical(canonicalPath);
        Object.keys(alternates).forEach(function (hreflang) {
            upsertHeadLink('alternate', {
                hreflang: hreflang,
                href: absoluteSiteUrl(alternates[hreflang])
            });
        });
    }
```

Then call it in `updateSeo(seo, hero)` after the canonical link is upserted:

```javascript
        upsertHeadLink('canonical', { href: canonicalUrl });
        upsertAlternateLinks(seo.canonicalPath || defaults.canonicalPath);
```

- [ ] **Step 6: Verify product detail dynamic SEO remains intact**

Run:

```powershell
Select-String -Path js\product-detail.js -Pattern "upsertHeadLink\('canonical'|hreflang: 'en'|hreflang: 'ar'|hreflang: 'x-default'" -CaseSensitive:$false
```

Expected:

```text
The existing product detail script still injects canonical and en/ar/x-default alternates.
```

- [ ] **Step 7: Syntax check changed JavaScript**

Run:

```powershell
node --check js/content-pages.js
node --check js/product-detail.js
```

Expected:

```text
No syntax errors.
```

---

## Task 5: Generate Sitemap and Run Stage 2 Verification

**Files:**
- Modify generated output: `D:\Projects\longxiang-website\sitemap.xml`
- Verify: `D:\Projects\longxiang-website\robots.txt`
- Verify: all Stage 2 allowed files

- [ ] **Step 1: Generate sitemap for real**

Run:

```powershell
npm run sitemap:generate
```

Expected:

```text
Sitemap generated: D:\Projects\longxiang-website\sitemap.xml
URL count: <number>
```

- [ ] **Step 2: Confirm sitemap contains hreflang namespace and alternates**

Run:

```powershell
Select-String -Path sitemap.xml -Pattern 'xmlns:xhtml|hreflang="en"|hreflang="ar"|hreflang="x-default"'
```

Expected:

```text
All four patterns are found.
```

- [ ] **Step 3: Confirm dry-run does not modify sitemap**

Run:

```powershell
$before = Get-FileHash sitemap.xml
npm run sitemap:generate -- --dry-run
$after = Get-FileHash sitemap.xml
if ($before.Hash -ne $after.Hash) { throw "sitemap.xml changed during dry-run" }
```

Expected:

```text
Sitemap dry run: output not written
No exception is thrown.
```

- [ ] **Step 4: Run SEO/i18n verification**

Run:

```powershell
node scripts/verify-seo-i18n.js
```

Expected:

```text
SEO/i18n verification passed
```

- [ ] **Step 5: Run acceptance tests**

Run:

```powershell
node scripts/test-acceptance.js
```

Expected:

```text
26 通过 / 0 失败
```

- [ ] **Step 6: Check only intended files changed**

Run:

```powershell
git status --short
```

Expected tracked or new Stage 2 files:

```text
 M ar/product-detail.html
 M ar/products.html
 M js/content-pages.js
 M product-detail.html
 M products.html
 M scripts/generate-sitemap.js
 M sitemap.xml
?? scripts/verify-seo-i18n.js
```

Known unrelated untracked entries may still appear and must not be staged:

```text
?? .tmp/
?? chanpince/
```

- [ ] **Step 7: Whitespace check**

Run:

```powershell
git diff --check
```

Expected:

```text
No whitespace errors.
```

---

## Task 6: Commit, Push, Server Pull, and Production Verification

**Files to stage only:**
- `D:\Projects\longxiang-website\scripts\generate-sitemap.js`
- `D:\Projects\longxiang-website\scripts\verify-seo-i18n.js`
- `D:\Projects\longxiang-website\sitemap.xml`
- `D:\Projects\longxiang-website\product-detail.html`
- `D:\Projects\longxiang-website\products.html`
- `D:\Projects\longxiang-website\ar\product-detail.html`
- `D:\Projects\longxiang-website\ar\products.html`
- `D:\Projects\longxiang-website\js\content-pages.js`
- `D:\Projects\longxiang-website\js\product-detail.js` only if it was actually changed

- [ ] **Step 1: Stage intended Stage 2 files**

Run:

```powershell
git add scripts/generate-sitemap.js scripts/verify-seo-i18n.js sitemap.xml product-detail.html products.html ar/product-detail.html ar/products.html js/content-pages.js
```

If `js/product-detail.js` was changed after verification, stage it explicitly:

```powershell
git add js/product-detail.js
```

- [ ] **Step 2: Confirm staged diff**

Run:

```powershell
git diff --cached --stat
```

Expected:

```text
Only Stage 2 SEO, sitemap, HTML fallback, and verification script files are listed.
```

- [ ] **Step 3: Commit with Chinese message**

Run:

```powershell
git commit -m "完善站点地图与SEO校验"
```

- [ ] **Step 4: Push to GitHub main**

Run:

```powershell
git push origin main
```

- [ ] **Step 5: Pull on production server**

Run:

```powershell
ssh longxiang "cd /home/ubuntu/longxiang-website && git pull --ff-only origin main"
```

- [ ] **Step 6: Restart only if runtime JavaScript or server behavior requires it**

This stage changes static files and scripts, not server dependencies. If PM2 serves static files from the current checkout and no server code changed, restart is optional. To keep deployment verification consistent, run:

```powershell
ssh longxiang "pm2 status longxiang-website --no-color"
```

Expected:

```text
longxiang-website is online.
```

If PM2 is not online, restart:

```powershell
ssh longxiang "pm2 restart longxiang-website && pm2 status longxiang-website --no-color"
```

- [ ] **Step 7: Production HTTP checks**

Run:

```powershell
ssh longxiang "curl -I https://www.lxenelectric.com/ && curl -I https://www.lxenelectric.com/products.html && curl -I https://www.lxenelectric.com/ar/products.html && curl -I https://www.lxenelectric.com/sitemap.xml"
```

Expected:

```text
Each URL returns 200 or an expected Cloudflare/proxy 301/200 chain.
```

- [ ] **Step 8: Production sitemap smoke check**

Run:

```powershell
ssh longxiang "cd /home/ubuntu/longxiang-website && grep -E 'xmlns:xhtml|hreflang=\"en\"|hreflang=\"ar\"|hreflang=\"x-default\"' sitemap.xml | head"
```

Expected:

```text
Sitemap contains xhtml namespace and hreflang alternate entries.
```

---

## Rollback Plan

### Before Commit

If Stage 2 changes are not ready and nothing has been committed:

```powershell
git restore scripts/generate-sitemap.js sitemap.xml product-detail.html products.html ar/product-detail.html ar/products.html js/content-pages.js js/product-detail.js
Remove-Item -LiteralPath scripts\verify-seo-i18n.js
```

Do not remove `.tmp\`, `chanpince\`, or unrelated untracked files.

### After Local Commit but Before Push

If the Stage 2 commit is the latest local commit and has not been pushed:

```powershell
git reset --soft HEAD~1
git restore --staged scripts/generate-sitemap.js scripts/verify-seo-i18n.js sitemap.xml product-detail.html products.html ar/product-detail.html ar/products.html js/content-pages.js js/product-detail.js
```

Then either fix and recommit, or restore the files as in the before-commit rollback.

### After Push or Production Pull

Use a revert commit:

```powershell
git revert HEAD
git push origin main
ssh longxiang "cd /home/ubuntu/longxiang-website && git pull --ff-only origin main && pm2 status longxiang-website --no-color"
```

If production status is not online after the pull:

```powershell
ssh longxiang "pm2 restart longxiang-website && pm2 status longxiang-website --no-color"
```

---

## Final Verification Checklist

- [ ] `git branch --show-current` returns `main`.
- [ ] `.tmp\` and `chanpince\` were not staged or modified.
- [ ] `node --check scripts/generate-sitemap.js` passes.
- [ ] `node --check scripts/verify-seo-i18n.js` passes.
- [ ] `node --check js/content-pages.js` passes.
- [ ] `node --check js/product-detail.js` passes.
- [ ] `npm run sitemap:generate -- --dry-run` does not change `sitemap.xml`.
- [ ] `npm run sitemap:generate` regenerates `sitemap.xml`.
- [ ] `sitemap.xml` includes `xmlns:xhtml`.
- [ ] Every sitemap URL entry includes `hreflang="en"`, `hreflang="ar"`, and `hreflang="x-default"` alternates.
- [ ] `node scripts/verify-seo-i18n.js` prints `SEO/i18n verification passed`.
- [ ] `node scripts/test-acceptance.js` reports `26 通过 / 0 失败`.
- [ ] `git diff --check` reports no whitespace errors.
- [ ] Stage 2 commit is pushed to GitHub `main`.
- [ ] Production server pulls from GitHub with `git pull --ff-only origin main`.
- [ ] `pm2 status longxiang-website --no-color` shows the app online.
- [ ] `https://www.lxenelectric.com/sitemap.xml` is reachable after production pull.

---

## Self-Review

- Spec coverage:
  - Current status checks are in Task 1.
  - `--dry-run` behavior is covered in Task 3 and Task 5.
  - sitemap hreflang alternates are covered in Task 3 and Task 5.
  - SEO/i18n verification script is covered in Task 2.
  - English and Arabic static SEO fallback files are covered in Task 4.
  - robots, sitemap, canonical, title, description, and H tag checks are covered in Task 2 and Task 5.
  - No competitor content is copied.
  - Stage 3-6 work is explicitly excluded.

- Placeholder scan:
  - No unfinished placeholder markers or unspecified implementation slots remain.
  - Commands and expected results are explicit.
  - Rollback commands are concrete.

- Type and command consistency:
  - Sitemap alternates use `en`, `ar`, and `x-default` consistently.
  - Static listing pages use static canonical and alternates.
  - Product detail pages rely on dynamic product-specific canonical/alternate injection to avoid assigning one static canonical to many products.
  - Git and production update flow follows `AGENTS.md`: local change, local verification, commit, push GitHub, server pull.
