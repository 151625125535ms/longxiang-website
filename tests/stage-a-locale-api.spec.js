const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_BASE || 'http://localhost:3000';

test('四语产品目录使用显式 locale 轻量接口', async ({ page }) => {
    const cases = [
        { locale: 'en', path: '/products.html', dir: 'ltr' },
        { locale: 'ar', path: '/ar/products.html', dir: 'rtl' },
        { locale: 'fr', path: '/fr/products.html', dir: 'ltr' },
        { locale: 'ru', path: '/ru/products.html', dir: 'ltr' }
    ];
    for (const item of cases) {
        await page.setViewportSize(item.locale === 'ar' ? { width: 390, height: 844 } : { width: 1280, height: 900 });
        const responsePromise = page.waitForResponse(function (response) {
            return response.url().includes('/api/products?locale=' + item.locale) && response.status() === 200;
        });
        await page.goto(BASE + item.path, { waitUntil: 'domcontentloaded' });
        const response = await responsePromise;
        const payload = await response.json();
        expect(payload.ok).toBe(true);
        expect(payload.meta.locale).toBe(item.locale);
        expect(Array.isArray(payload.data)).toBe(true);
        expect(payload.data.length).toBeGreaterThan(0);
        expect(payload.data[0]).not.toHaveProperty('nameAr');
        expect(payload.data[0]).not.toHaveProperty('description');
        await expect(page.locator('#products-container .product-card').first()).toBeVisible();
        if (item.dir === 'rtl') await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        const computedDirection = await page.locator('html').evaluate(function (node) {
            return window.getComputedStyle(node).direction;
        });
        expect(computedDirection).toBe(item.dir);
        const overflow = await page.evaluate(function () {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
        });
        expect(overflow).toBe(false);
    }
});

test('首页、证书和内容页使用当前语言接口', async ({ page }) => {
    const checks = [
        { path: '/fr/index.html', api: '/api/products?locale=fr', selector: '#featured-products-container .product-card' },
        { path: '/ru/certifications.html', api: '/api/certifications?locale=ru', selector: '[data-content-page="certifications"]' },
        { path: '/ar/about.html', api: '/api/content-blocks/about-us?locale=ar', selector: '[data-content-page="about-us"]' }
    ];
    for (const check of checks) {
        const responsePromise = page.waitForResponse(function (response) {
            return response.url().includes(check.api) && response.status() === 200;
        });
        await page.goto(BASE + check.path, { waitUntil: 'domcontentloaded' });
        await responsePromise;
        await expect(page.locator(check.selector).first()).toBeVisible();
    }
});

test('比较页最多请求三个本地化详情且不下载全量列表', async ({ page, request }) => {
    const response = await request.get(BASE + '/api/products?locale=en');
    const products = (await response.json()).data.slice(0, 4);
    const productRequests = [];
    page.on('request', function (req) {
        const url = new URL(req.url());
        if (url.pathname.indexOf('/api/products') === 0) productRequests.push(url.pathname + url.search);
    });
    await page.goto(BASE + '/compare.html?ids=' + products.map(function (product) { return product.id; }).join(','), { waitUntil: 'networkidle' });
    const detailRequests = productRequests.filter(function (url) { return /^\/api\/products\/[^?]+\?locale=en$/.test(url); });
    const listRequests = productRequests.filter(function (url) { return url === '/api/products?locale=en'; });
    expect(detailRequests).toHaveLength(3);
    expect(listRequests).toHaveLength(0);
    await expect(page.locator('#comparison-container')).toBeVisible();
});

test('详情按 locale 加载完整字段且 planned locale 不公开', async ({ page, request }) => {
    const listResponse = await request.get(BASE + '/api/products?locale=en');
    const list = await listResponse.json();
    const product = list.data[0];

    const detailResponsePromise = page.waitForResponse(function (response) {
        return response.url().includes('/api/products/' + encodeURIComponent(product.slug) + '?locale=ar') && response.status() === 200;
    });
    await page.goto(BASE + '/ar/products/' + encodeURIComponent(product.slug), { waitUntil: 'domcontentloaded' });
    const detailResponse = await detailResponsePromise;
    const detail = await detailResponse.json();
    expect(detail.data.description).toBeTruthy();
    expect(Array.isArray(detail.data.specs)).toBe(true);
    expect(Array.isArray(detail.data.images)).toBe(true);
    await expect(page.locator('#product-title')).toBeVisible();

    const planned = await request.get(BASE + '/api/products?locale=pt');
    expect(planned.status()).toBe(404);
    expect((await planned.json()).error.code).toBe('LOCALE_NOT_AVAILABLE');
});
