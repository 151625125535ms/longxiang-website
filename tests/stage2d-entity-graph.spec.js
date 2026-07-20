const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_BASE || 'http://localhost:3000';
const ORIGIN = 'https://www.lxenelectric.com';
const ORGANIZATION_ID = ORIGIN + '/#organization';
const WEBSITE_ID = ORIGIN + '/#website';

function jsonLdScriptFromHtml(html, key) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(html).match(new RegExp(
        '(<script\\b[^>]*data-schema-auto=["\\\']' + escaped + '["\\\'][^>]*)>([\\s\\S]*?)<\\/script>',
        'i'
    ));
    if (!match) return null;
    const version = match[1].match(/data-schema-version=["']([^"']*)["']/i);
    return { text: match[2], version: version ? version[1] : '' };
}

async function schemaSummary(page) {
    return page.evaluate(() => {
        function flatten(value, output) {
            output = output || [];
            if (!value || typeof value !== 'object') return output;
            if (Array.isArray(value)) {
                value.forEach((item) => flatten(item, output));
                return output;
            }
            if (value['@type']) output.push(value);
            if (Array.isArray(value['@graph'])) value['@graph'].forEach((item) => flatten(item, output));
            return output;
        }
        const nodes = [];
        const parseErrors = [];
        document.querySelectorAll('script[type="application/ld+json"]').forEach((script, index) => {
            try {
                flatten(JSON.parse(script.textContent || '{}'), nodes);
            } catch (err) {
                parseErrors.push({ index, message: err.message });
            }
        });
        function definitions(type) {
            return nodes.filter((node) => {
                const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
                return types.includes(type);
            });
        }
        return {
            parseErrors,
            organization: definitions('Organization'),
            website: definitions('WebSite'),
            localBusiness: definitions('LocalBusiness'),
            webPage: definitions('WebPage'),
            contactPage: definitions('ContactPage'),
            aboutPage: definitions('AboutPage'),
            collectionPage: definitions('CollectionPage')
        };
    });
}

test('域名首页水合后只保留唯一 Organization 与 WebSite 实体图', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const summary = await schemaSummary(page);
    expect(summary.parseErrors).toEqual([]);
    expect(summary.organization).toHaveLength(1);
    expect(summary.website).toHaveLength(1);
    expect(summary.localBusiness).toHaveLength(0);
    expect(summary.webPage).toHaveLength(1);
    expect(summary.organization[0]['@id']).toBe(ORGANIZATION_ID);
    expect(summary.website[0]['@id']).toBe(WEBSITE_ID);
    expect(summary.website[0].publisher).toEqual({ '@id': ORGANIZATION_ID });
    expect(summary.webPage[0].isPartOf).toEqual({ '@id': WEBSITE_ID });
});

test('SSR 与 API 同版本时客户端不改写受管 JSON-LD', async ({ page, request }) => {
    for (const sample of [
        { path: '/about.html', key: 'content-page', ready: 'longxiangContentPagePromise' },
        { path: '/education.html', key: 'education-page', ready: 'longxiangEducationPromise' },
        { path: '/products/anti-short-amorphous', key: 'product-page', ready: 'longxiangProductDetailPromise' }
    ]) {
        const response = await request.get(BASE + sample.path);
        expect(response.status(), sample.path).toBe(200);
        const raw = jsonLdScriptFromHtml(await response.text(), sample.key);
        expect(raw, sample.path).not.toBeNull();
        expect(raw.version, sample.path).not.toBe('');

        await page.goto(BASE + sample.path, { waitUntil: 'domcontentloaded' });
        await page.evaluate(async (ready) => {
            const value = window[ready];
            if (value && typeof value.then === 'function') await value;
        }, sample.ready);
        const rendered = await page.locator('script[data-schema-auto="' + sample.key + '"]').textContent();
        expect(rendered, sample.path).toBe(raw.text);
    }
});

test('content API 失败时保留服务端 Schema', async ({ page, request }) => {
    const response = await request.get(BASE + '/about.html');
    const raw = jsonLdScriptFromHtml(await response.text(), 'content-page');
    expect(raw).not.toBeNull();
    await page.route('**/api/content-blocks/about-us?locale=*', (route) => route.abort());
    await page.goto(BASE + '/about.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
        if (window.longxiangContentPagePromise) await window.longxiangContentPagePromise;
    });
    await expect(page.locator('script[data-schema-auto="content-page"]')).toHaveCount(1);
    expect(await page.locator('script[data-schema-auto="content-page"]').textContent()).toBe(raw.text);
});

test('API 新版本只更新页面字段且重复初始化不增加 Schema', async ({ page, request }) => {
    const response = await request.get(BASE + '/about.html');
    const raw = jsonLdScriptFromHtml(await response.text(), 'content-page');
    const before = JSON.parse(raw.text);
    const nextVersion = String(Number(raw.version) + 1);

    await page.route('**/api/content-blocks/about-us?locale=*', async (route) => {
        const apiResponse = await route.fetch();
        const block = await apiResponse.json();
        block.version = Number(nextVersion);
        block.body = block.body || {};
        block.body.hero = Object.assign({}, block.body.hero, { title: 'Stage 2D updated entity name' });
        block.body.seo = Object.assign({}, block.body.seo, {
            description: 'Stage 2D controlled schema hydration description for an updated content API version.'
        });
        await route.fulfill({ response: apiResponse, json: block });
    });

    await page.goto(BASE + '/about.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => { await window.longxiangContentPagePromise; });
    const selector = 'script[data-schema-auto="content-page"]';
    await expect(page.locator(selector)).toHaveAttribute('data-schema-version', nextVersion);
    const afterText = await page.locator(selector).textContent();
    const after = JSON.parse(afterText);
    expect(after.description).toBe('Stage 2D controlled schema hydration description for an updated content API version.');
    expect(after['@id']).toBe(before['@id']);
    expect(after['@type']).toBe(before['@type']);
    expect(after.url).toBe(before.url);
    expect(after.isPartOf).toEqual(before.isPartOf);
    expect(after.about).toEqual(before.about);

    const clientSrc = await page.locator('script[src*="content-pages.js"]').getAttribute('src');
    await page.evaluate((src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    }), clientSrc);
    await page.waitForTimeout(500);
    await expect(page.locator(selector)).toHaveCount(1);
    expect(await page.locator(selector).textContent()).toBe(afterText);
});

test('语言规范首页不会定义独立 Organization 或 WebSite', async ({ page }) => {
    for (const path of ['/ar/', '/fr/', '/ru/']) {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const summary = await schemaSummary(page);
        expect(summary.parseErrors, path).toEqual([]);
        expect(summary.organization, path).toHaveLength(0);
        expect(summary.website, path).toHaveLength(0);
        expect(summary.localBusiness, path).toHaveLength(0);
        expect(summary.webPage, path).toHaveLength(1);
        expect(summary.webPage[0].isPartOf, path).toEqual({ '@id': WEBSITE_ID });
    }
});

test('Contact 使用 ContactPage 且 About、目录、详情保持站点引用', async ({ page }) => {
    for (const path of ['/contact.html', '/ar/contact.html', '/fr/contact.html', '/ru/contact.html']) {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const summary = await schemaSummary(page);
        expect(summary.localBusiness, path).toHaveLength(0);
        expect(summary.contactPage, path).toHaveLength(1);
        expect(summary.contactPage[0].isPartOf, path).toEqual({ '@id': WEBSITE_ID });
        expect(summary.contactPage[0].about, path).toEqual({ '@id': ORGANIZATION_ID });
    }

    const samples = [
        { path: '/about.html', key: 'aboutPage' },
        { path: '/products.html', key: 'collectionPage' },
        { path: '/products/anti-short-amorphous', key: 'webPage' }
    ];
    for (const sample of samples) {
        await page.goto(BASE + sample.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const summary = await schemaSummary(page);
        expect(summary[sample.key], sample.path).toHaveLength(1);
        expect(summary[sample.key][0].isPartOf, sample.path).toEqual({ '@id': WEBSITE_ID });
    }
});

test('禁用 JavaScript 后实体图仍存在且无重复企业定义', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(BASE + '/');
    let summary = await schemaSummary(page);
    expect(summary.organization).toHaveLength(1);
    expect(summary.website).toHaveLength(1);
    expect(summary.webPage).toHaveLength(1);

    await page.goto(BASE + '/fr/contact.html');
    summary = await schemaSummary(page);
    expect(summary.localBusiness).toHaveLength(0);
    expect(summary.contactPage).toHaveLength(1);
    await context.close();
});
