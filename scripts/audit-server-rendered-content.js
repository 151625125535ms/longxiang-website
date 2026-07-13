'use strict';

const { URL } = require('url');
const productPresentation = require('../js/product-page-presentation');

function option(name, fallback) {
    const index = process.argv.indexOf(name);
    return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const base = String(option('--base', 'http://127.0.0.1:3000')).replace(/\/+$/, '');
const expectedCount = Number(option('--expected-count', '184'));
const concurrency = Math.max(1, Number(option('--concurrency', '8')) || 8);
const failures = [];
const summary = { urls: 0, shell: 0, contentPages: 0, catalogs: 0, details: 0, parameterCatalogs: 0, sensitiveFindings: 0 };
let productsByIdentifier = new Map();
let publicProducts = [];
let productContentBlock = null;
const forbidden = [
    { label: 'domestic phone', pattern: /175[\s-]*1335[\s-]*4200/i },
    { label: 'domestic email', pattern: /hnlxdq2003\s*@\s*163\.com/i },
    { label: 'WhatsApp', pattern: /whats\s*app|wa\.me/i },
    { label: 'legacy capital', pattern: /100\s*million\s*RMB|100\s*مليون\s*يوان/i }
];

function fail(path, message) { failures.push(path + ': ' + message); }
function text(value) {
    return String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#(?:0*39|x0*27);/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();
}
function count(source, pattern) { return Array.from(String(source || '').matchAll(pattern)).length; }
function attributes(tag) {
    const out = {};
    String(tag || '').replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(["'])(.*?)\2/g, function (_, name, __, value) { out[name.toLowerCase()] = value; return ''; });
    return out;
}
function uniqueIds(html) {
    const seen = new Set(), duplicates = [];
    Array.from(html.matchAll(/(?:^|\s)id\s*=\s*(["'])(.*?)\1/gi)).forEach(function (match) { if (seen.has(match[2])) duplicates.push(match[2]); else seen.add(match[2]); });
    return duplicates;
}
function sitemapUrls(xml) { return Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/gi)).map(function (match) { return match[1].replace(/&amp;/g, '&'); }); }
function decodeCloudflareEmail(value) {
    value = String(value || '');
    if (!/^[0-9a-f]+$/i.test(value) || value.length < 4 || value.length % 2 !== 0) return '';
    const key = parseInt(value.slice(0, 2), 16);
    let output = '';
    for (let index = 2; index < value.length; index += 2) output += String.fromCharCode(parseInt(value.slice(index, index + 2), 16) ^ key);
    return output;
}
function localeFromPath(pathname) { const match = String(pathname || '').match(/^\/(ar|fr|ru)\//); return match ? match[1] : 'en'; }
function localizedProduct(product, field, locale) {
    if (locale === 'en') return String(product && product[field] || '');
    const suffix = locale.charAt(0).toUpperCase() + locale.slice(1);
    return String(product && (product[field + suffix] || product[field + '_' + locale] || product[field]) || '');
}
function productAsset(value, locale) {
    value = String(value || '').replace(/\\/g, '/');
    if (/^https:\/\//i.test(value) || value.charAt(0) === '/') return value;
    return (locale === 'en' ? '' : '../') + value.replace(/^\/+|^\.\.\//g, '');
}

async function fetchText(url) {
    const response = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Longxiang-Stage2C-SSR-Audit/1.0' }, signal: AbortSignal.timeout(20000) });
    return { status: response.status, headers: response.headers, body: await response.text() };
}

function inspectShell(path, html) {
    const cloudflareEmails = Array.from(html.matchAll(/data-cfemail=["']([0-9a-f]+)["']/gi)).map(function (match) { return decodeCloudflareEmail(match[1]); }).filter(Boolean);
    const searchableHtml = html + '\n' + cloudflareEmails.join('\n');
    const nav = (html.match(/<div\b[^>]*class=["'][^"']*\bnav-links\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || '';
    if (count(nav, /<a\b/gi) < 1) fail(path, 'empty server navigation');
    const footer = (html.match(/<footer\b[^>]*class=["'][^"']*\bfooter\b[^"']*["'][^>]*>([\s\S]*?)<\/footer>/i) || [])[1] || '';
    if (count(footer, /<a\b/gi) < 1 || !/footer-bottom/i.test(footer)) fail(path, 'incomplete server footer');
    if (!/henanlxgj\s*@\s*163\.com/i.test(searchableHtml)) fail(path, 'international email missing');
    const duplicates = uniqueIds(html);
    if (duplicates.length) fail(path, 'duplicate IDs: ' + Array.from(new Set(duplicates)).join(', '));
    const cnTags = Array.from(html.matchAll(/<(?:link|script)\b[^>]*>[\s\S]*?(?:<\/script>)?|<link\b[^>]*>/gi)).map(function (match) { return match[0]; }).filter(function (tag) { return /lxelec\.cn/i.test(tag); });
    if (cnTags.length) fail(path, '.cn appears in canonical/hreflang/schema');
    forbidden.forEach(function (item) { if (item.pattern.test(searchableHtml)) { summary.sensitiveFindings += 1; fail(path, 'sensitive value: ' + item.label); } });
    summary.shell += 1;
}

function inspectContentPage(path, html) {
    if (!/data-ssr-content=["'](?:home|about-us|solutions|contact)["']/i.test(html)) fail(path, 'key content SSR marker missing');
    if (count(html, /<h1\b/gi) !== 1) fail(path, 'expected one H1');
    if (/Loading (?:home content|company profile|solutions|contact information)/i.test(html)) fail(path, 'loading placeholder remains');
    const main = (html.match(/<main\b[^>]*data-content-page=["'][^"']+["'][^>]*>[\s\S]*?<\/main>/i) || [])[0] || '';
    if (count(main, /<h[23]\b/gi) < 1 || count(main, /<(?:a|button)\b/gi) < 1) fail(path, 'key SSR body headings or action missing');
    const hero = (html.match(/<[^>]+class=["'][^"']*\b(?:hero-bg|page-hero)\b[^"']*["'][^>]*>/i) || [])[0] || '';
    if (!/background-image\s*:/i.test(hero) || /[?&](?:w|width|q|quality)=/i.test(hero)) fail(path, 'Hero background missing or quality parameters changed');
    if (/\/solutions\.html$|\/(?:ar|fr|ru)\/solutions\.html$/i.test(new URL(path, base).pathname)) {
        const actions = (html.match(/<div\b[^>]*class=["'][^"']*\bsolutions-hero-actions\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || '';
        if (!/<a\b/i.test(actions)) fail(path, 'Solutions Hero action missing');
    }
    summary.contentPages += 1;
}

function inspectCatalog(path, html, parameter) {
    if (!/data-product-ssr=["']catalog["']/i.test(html)) fail(path, 'catalog SSR marker missing');
    const cards = count(html, /class=["'][^"']*\bproduct-card-v2\b/gi);
    if (cards < 1 || cards > 9) fail(path, 'catalog card count ' + cards);
    if (count(html, /href=["']\/(?:ar\/|fr\/|ru\/)?products\/[^"']+/gi) < cards) fail(path, 'crawlable product links missing');
    if (!/class=["'][^"']*\bproduct-tree-group\b/i.test(html)) fail(path, 'taxonomy tree missing');
    if (parameter) {
        const robots = Array.from(html.matchAll(/<meta\b[^>]*>/gi)).map(function (m) { return attributes(m[0]); }).find(function (a) { return String(a.name || '').toLowerCase() === 'robots'; });
        if (!robots || String(robots.content || '').toLowerCase() !== 'noindex,follow') fail(path, 'parameter catalog robots mismatch');
        const canonical = Array.from(html.matchAll(/<link\b[^>]*>/gi)).map(function (m) { return attributes(m[0]); }).find(function (a) { return String(a.rel || '').toLowerCase() === 'canonical'; });
        if (!canonical || /[?&]/.test(canonical.href || '') || !/\/(?:ar\/|fr\/|ru\/)?products\.html$/i.test(canonical.href || '')) fail(path, 'parameter catalog canonical is not clean');
        const alternates = Array.from(html.matchAll(/<link\b[^>]*>/gi)).map(function (m) { return attributes(m[0]); }).filter(function (a) { return String(a.rel || '').toLowerCase() === 'alternate' && a.hreflang; });
        const languages = new Set(alternates.map(function (a) { return String(a.hreflang).toLowerCase(); }));
        if (alternates.some(function (a) { return /[?&]/.test(a.href || ''); }) || !['en', 'ar', 'fr', 'ru', 'x-default'].every(function (language) { return languages.has(language); })) fail(path, 'parameter catalog hreflang is incomplete or contains query parameters');
        summary.parameterCatalogs += 1;
    } else summary.catalogs += 1;
}

function inspectDetail(path, html) {
    if (!/data-product-ssr=["']detail["']/i.test(html)) fail(path, 'detail SSR marker missing');
    const heading = (html.match(/<h1\b[^>]*id=["']product-title["'][^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
    if (!text(heading) || /Product Details|Loading/i.test(text(heading))) fail(path, 'product-specific H1 missing');
    const pathname = new URL(path, base).pathname;
    const locale = localeFromPath(pathname);
    const identifier = decodeURIComponent((pathname.match(/\/products\/([^/]+)\/?$/i) || [])[1] || '');
    const product = productsByIdentifier.get(identifier);
    const expectedView = product && productPresentation.presentDetail({ locale, product, products: publicProducts, contentBlock: productContentBlock, contentVersion: productContentBlock && productContentBlock.version || 0 });
    if (!product) fail(path, 'snapshot product mapping missing for ' + identifier);
    else if (text(heading) !== expectedView.hero.title) fail(path, 'H1 does not match URL product');
    const image = (html.match(/<img\b[^>]*id=["']main-product-image["'][^>]*>/i) || [])[0] || '';
    const imageAttrs = attributes(image);
    if (!imageAttrs.src || /product-cards/i.test(imageAttrs.src) || imageAttrs.width !== '960' || imageAttrs.height !== '720' || String(imageAttrs.fetchpriority || '').toLowerCase() !== 'high') fail(path, 'high-quality main image contract mismatch');
    if (expectedView && imageAttrs.src !== expectedView.image.src) fail(path, 'main image does not match URL product');
    const galleryLayout = (html.match(/<div\b[^>]*class=["'][^"']*\bproduct-gallery-layout\b[^"']*["'][^>]*>/i) || [])[0] || '';
    const galleryAttrs = attributes(galleryLayout);
    if (galleryAttrs['data-gallery-state'] !== 'single') fail(path, 'single-image production product has a non-single gallery state');
    if (count(html, /data-product-gallery-thumbnail/gi) !== 0 || count(html, /data-product-gallery-step/gi) !== 0 || /class=["'][^"']*\bproduct-gallery-rail\b/i.test(html)) {
        fail(path, 'single-image production product exposes gallery controls or an empty rail');
    }
    if (count(html, /<tbody\b[^>]*id=["']specs-body["'][^>]*>[\s\S]*?<tr>/gi) < 1) fail(path, 'specification rows missing');
    const specsBody = (html.match(/<tbody\b[^>]*id=["']specs-body["'][^>]*>([\s\S]*?)<\/tbody>/i) || [])[1] || '';
    if (expectedView && specsBody.trim() !== expectedView.fragments.specs.trim()) fail(path, 'specifications do not match URL product');
    ['data-product-decision-summary', 'data-product-applications', 'data-product-selection', 'data-product-detail-support', 'data-product-detail-faq', 'data-product-detail-inquiry', 'data-product-related'].forEach(function (attribute) { if (!new RegExp(attribute + '(?:=["\'][^"\']*["\'])?[^>]*>[\\s\\S]*?<(?:h2|h3|form|div|a)\\b', 'i').test(html)) fail(path, attribute + ' content missing'); });
    if (/"@type"\s*:\s*"Product"|"offers"\s*:|"price"\s*:|"availability"\s*:|"review"\s*:|"aggregateRating"\s*:/i.test(html)) fail(path, 'high-risk Product schema found');
    summary.details += 1;
}

async function inspectUrl(url) {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;
    const response = await fetchText(base + parsed.pathname + parsed.search);
    if (response.status !== 200) { fail(path, 'HTTP ' + response.status); return; }
    inspectShell(path, response.body);
    if (/^\/(?:ar\/|fr\/|ru\/)?products\.html$/i.test(parsed.pathname)) inspectCatalog(path, response.body, Boolean(parsed.search));
    else if (/^\/(?:ar\/|fr\/|ru\/)?products\/[^/]+\/?$/i.test(parsed.pathname)) inspectDetail(path, response.body);
    else if (/^\/(?:ar\/|fr\/|ru\/)?(?:about|solutions|contact)\.html$|^\/$|^\/(?:ar|fr|ru)\/(?:index\.html)?$/i.test(parsed.pathname)) inspectContentPage(path, response.body);
}

async function runPool(items) {
    let index = 0;
    async function worker() { while (index < items.length) { const current = items[index++]; try { await inspectUrl(current); } catch (err) { fail(new URL(current).pathname, err.message); } } }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

(async function () {
    const productsResponse = await fetchText(base + '/api/products');
    if (productsResponse.status !== 200) throw new Error('Products API HTTP ' + productsResponse.status);
    publicProducts = JSON.parse(productsResponse.body);
    if (!Array.isArray(publicProducts) || publicProducts.length !== 38) throw new Error('Expected 38 public products, found ' + (Array.isArray(publicProducts) ? publicProducts.length : 'invalid response'));
    const contentResponse = await fetchText(base + '/api/content-blocks/product-pages');
    if (contentResponse.status !== 200) throw new Error('Product content API HTTP ' + contentResponse.status);
    productContentBlock = JSON.parse(contentResponse.body);
    publicProducts.forEach(function (product) {
        [product.slug, product.id].filter(Boolean).forEach(function (identifier) { productsByIdentifier.set(String(identifier), product); });
    });
    const sitemap = await fetchText(base + '/sitemap.xml');
    if (sitemap.status !== 200) throw new Error('Sitemap HTTP ' + sitemap.status);
    const urls = sitemapUrls(sitemap.body);
    summary.urls = urls.length;
    if (urls.length !== expectedCount) fail('/sitemap.xml', 'expected ' + expectedCount + ' URLs, found ' + urls.length);
    await runPool(urls);
    const parameterPaths = ['/products.html?group=switchgear', '/ar/products.html?group=switchgear', '/fr/products.html?group=switchgear', '/ru/products.html?group=switchgear'];
    await runPool(parameterPaths.map(function (path) { return base + path; }));
    const expectedSummary = { contentPages: 16, catalogs: 4, details: 152, parameterCatalogs: 4 };
    Object.keys(expectedSummary).forEach(function (key) {
        if (summary[key] !== expectedSummary[key]) fail('summary', key + ' expected ' + expectedSummary[key] + ', found ' + summary[key]);
    });
    console.log(JSON.stringify({ base, summary, failures: failures.slice(0, 100) }, null, 2));
    if (failures.length) process.exitCode = 1;
}()).catch(function (err) { console.error(err.stack || err.message); process.exit(1); });
