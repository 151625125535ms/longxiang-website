const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_BASE || 'http://localhost:3000';

test('仅分类 API 失败时保留服务端目录节点', async ({ page }) => {
    await page.route('**/api/product-categories?locale=*', (route) => route.abort());
    await page.route('**/api/products?locale=*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.continue();
    });
    await page.goto(BASE + '/products.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#products-container .product-card').first().evaluate((node) => node.setAttribute('data-taxonomy-fallback-probe', 'card'));
    await page.locator('.product-tree-body [data-product-filter]').first().evaluate((node) => node.setAttribute('data-taxonomy-fallback-probe', 'tree'));
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-taxonomy-fallback-probe="card"]')).toHaveCount(1);
    await expect(page.locator('[data-taxonomy-fallback-probe="tree"]')).toHaveCount(1);
    await expect(page.locator('[data-product-ssr="catalog"]')).toHaveAttribute('data-product-fallback', 'taxonomy');
});

test('仅目录内容 API 失败时保留服务端目录节点', async ({ page }) => {
    await page.route('**/api/content-blocks/product-pages?locale=*', (route) => route.abort());
    await page.route('**/api/products?locale=*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.continue();
    });
    await page.goto(BASE + '/products.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#products-container .product-card').first().evaluate((node) => node.setAttribute('data-content-fallback-probe', 'card'));
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-content-fallback-probe="card"]')).toHaveCount(1);
    await expect(page.locator('[data-product-ssr="catalog"]')).toHaveAttribute('data-product-fallback', 'content-block');
});

test('产品正文 API 新版本触发受控重绘并更新版本标记', async ({ page }) => {
    let nextVersion = 0;
    await page.route('**/api/content-blocks/product-pages?locale=*', async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        nextVersion = Number(body.version || 0) + 1;
        body.version = nextVersion;
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.fulfill({ response, json: body });
    });
    await page.goto(BASE + '/products/anti-short-amorphous', { waitUntil: 'domcontentloaded' });
    const initialVersion = Number(await page.locator('[data-product-ssr="detail"]').getAttribute('data-product-content-version'));
    const initialKey = await page.locator('[data-product-ssr="detail"]').getAttribute('data-product-view-key');
    await page.locator('#specs-body tr').first().evaluate((node) => node.setAttribute('data-version-probe', 'old'));
    await expect(page.locator('[data-product-ssr="detail"]')).toHaveAttribute('data-product-content-version', String(initialVersion + 1), { timeout: 5000 });
    expect(nextVersion).toBe(initialVersion + 1);
    await expect(page.locator('[data-product-ssr="detail"]')).not.toHaveAttribute('data-product-view-key', initialKey || '');
    await expect(page.locator('#specs-body tr[data-version-probe="old"]')).toHaveCount(0);
    const title = (await page.locator('#product-title').textContent() || '').trim();
    await expect(page.locator('[data-product-context]')).toHaveValue(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('仅详情内容 API 失败时保留完整服务端正文', async ({ page }) => {
    await page.route('**/api/content-blocks/product-pages?locale=*', (route) => route.abort());
    await page.goto(BASE + '/fr/products/anti-short-amorphous', { waitUntil: 'domcontentloaded' });
    const probes = await page.evaluate(() => {
        const nodes = [document.querySelector('#product-title'), document.querySelector('#specs-body tr'), document.querySelector('[data-product-related] .product-related-card'), document.querySelector('[data-product-detail-inquiry] form')];
        nodes.forEach((node, index) => { if (node) node.setAttribute('data-content-fallback-detail-probe', String(index)); });
        return nodes.map(Boolean);
    });
    expect(probes).toEqual([true, true, true, true]);
    await page.waitForTimeout(500);
    for (let index = 0; index < 4; index += 1) await expect(page.locator('[data-content-fallback-detail-probe="' + index + '"]')).toHaveCount(1);
    await expect(page.locator('[data-product-ssr="detail"]')).toHaveAttribute('data-product-fallback', 'content-block');
});

test('禁用 JavaScript 时重点页面目录详情保留原始 Hero 背景', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(BASE + '/fr/about.html');
    await expect(page.locator('.page-hero')).toHaveAttribute('style', /background-image:[^;]+/);
    await page.goto(BASE + '/ar/products.html');
    await expect(page.locator('.page-hero')).toHaveAttribute('style', /assets\/hero\/product\.webp/);
    await page.goto(BASE + '/ru/products/anti-short-amorphous');
    await expect(page.locator('.page-hero')).toHaveAttribute('style', /assets\/hero\/product\.webp/);
    await expect(page.locator('[data-product-related] a').first()).toHaveAttribute('href', /\/ru\/products\//);
    await context.close();
});

test('四语言共享正文和产品 clean URL 保持本地化', async ({ page }) => {
    for (const locale of ['ar', 'fr', 'ru']) {
        await page.goto(BASE + '/' + locale + '/about.html', { waitUntil: 'networkidle' });
        await expect(page.locator('.page-hero h1')).not.toHaveText('About Longxiang');
        await page.goto(BASE + '/' + locale + '/products.html', { waitUntil: 'networkidle' });
        await expect(page.locator('#products-container .product-card a').first()).toHaveAttribute('href', new RegExp('/' + locale + '/products/'));
        await page.goto(BASE + '/' + locale + '/products/anti-short-amorphous', { waitUntil: 'networkidle' });
        await expect(page.locator('[data-product-related] a').first()).toHaveAttribute('href', new RegExp('/' + locale + '/products/'));
        await expect(page.locator('#specs-body tr').first()).toBeVisible();
    }
});
