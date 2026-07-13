const path = require('path');
const { test, expect } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.TEST_BASE || 'http://127.0.0.1:3899';
const ADMIN_USERNAME = process.env.TEST_ADMIN_USERNAME || 'gallery-test-admin';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'GalleryTestPassword!2026';
const PRODUCT_SLUG = 'gallery-integration-product';
const LOCAL_ORIGIN = new URL(BASE).origin;
const UPLOAD_FILES = [
    'uploads/product-scbh19-dry-amorphous.png',
    'uploads/product-ggd-low-voltage-fixed-switchgear.png',
    'uploads/product-scb13-silicon-dry.png',
    'uploads/product-zgsbh15-pv-amorphous-combined.png'
].map(function (file) { return path.join(ROOT, ...file.split('/')); });

test.describe.configure({ mode: 'serial' });

async function blockExternalRequests(context) {
    await context.route('**/*', function (route) {
        const requestUrl = route.request().url();
        if (/^https?:/i.test(requestUrl) && !requestUrl.startsWith(LOCAL_ORIGIN + '/')) return route.abort();
        return route.continue();
    });
}

test.beforeEach(async ({ context }) => {
    await blockExternalRequests(context);
});

function watchImageFailures(page) {
    const failures = [];
    page.on('response', function (response) {
        if (response.request().resourceType() === 'image' && response.status() >= 400) {
            failures.push(response.status() + ' ' + response.url());
        }
    });
    return failures;
}

async function storeNecessaryConsent(page) {
    await page.addInitScript(function () {
        localStorage.setItem('lx_cookie_consent_v1', JSON.stringify({
            necessary: true,
            analytics: false,
            functional: false,
            updatedAt: '2026-07-13T00:00:00.000Z'
        }));
    });
}

async function openProductEditor(page) {
    const productsGroup = page.locator('.nav-group[data-group="products"]');
    if (await productsGroup.locator('.nav-group-items').isHidden()) {
        await productsGroup.locator('.nav-group-toggle').click();
    }
    await productsGroup.locator('[data-view="products"]').click();
    const row = page.locator('#products-tbody tr').filter({ hasText: 'Gallery Integration Product' });
    await expect(row).toHaveCount(1);
    await row.locator('[data-edit-product]').click();
    await expect(page.locator('#product-modal')).toHaveClass(/show/);
    await expect(page.locator('#product-gallery-preview .product-gallery-editor-item')).toHaveCount(4);
}

async function galleryEditorImageSources(page) {
    return page.locator('#product-gallery-preview .product-gallery-editor-item img').evaluateAll(function (images) {
        return images.map(function (image) { return image.currentSrc || image.src; });
    });
}

async function expectImagesLoaded(page, selector) {
    await expect.poll(function () {
        return page.locator(selector).evaluateAll(function (images) {
            return images.length > 0 && images.every(function (image) { return image.complete && image.naturalWidth > 0; });
        });
    }, { timeout: 15000 }).toBeTruthy();
}

test('admin can upload, reorder, save and reopen a product gallery', async ({ page }) => {
    const imageFailures = watchImageFailures(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/admin/login.html');
    await page.locator('#login-username').fill(ADMIN_USERNAME);
    await page.locator('#login-password').fill(ADMIN_PASSWORD);
    await Promise.all([
        page.waitForURL(/\/admin\/index\.html/),
        page.locator('#btn-login').click()
    ]);

    await openProductEditor(page);
    const galleryItems = page.locator('#product-gallery-preview .product-gallery-editor-item');
    while (await galleryItems.count()) {
        await galleryItems.first().locator('[data-remove-gallery-image]').click();
    }
    await expect(page.locator('#product-gallery-help')).toContainText(/0\s*\/\s*6/);

    await page.locator('#product-gallery-upload-input').setInputFiles(UPLOAD_FILES);
    await expect(galleryItems).toHaveCount(4, { timeout: 15000 });
    await expect(page.locator('#product-gallery-help')).toContainText(/4\s*\/\s*6/);
    const uploadedOrder = await galleryEditorImageSources(page);
    expect(uploadedOrder.every(function (source) { return /\/uploads\//.test(source); })).toBeTruthy();

    await galleryItems.first().locator('[data-move-gallery-image="next"]').click();
    const reordered = await galleryEditorImageSources(page);
    expect(reordered[0]).toBe(uploadedOrder[1]);
    expect(reordered[1]).toBe(uploadedOrder[0]);
    await expect(galleryItems.nth(0).locator('[data-move-gallery-image="previous"]')).toBeDisabled();
    await expect(galleryItems.nth(3).locator('[data-move-gallery-image="next"]')).toBeDisabled();

    await page.locator('#product-gallery-preview').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(ROOT, '.tmp', 'product-gallery-admin-1440.png') });
    await expect(page.locator('#modal-submit')).toBeEnabled();
    await page.locator('#modal-submit').click();
    await expect(page.locator('#product-modal')).not.toHaveClass(/show/);

    await openProductEditor(page);
    expect(await galleryEditorImageSources(page)).toEqual(reordered);
    await expect(page.locator('#product-gallery-help')).toContainText(/4\s*\/\s*6/);
    expect(imageFailures).toEqual([]);
});

test('desktop gallery switches images and keeps the rail next to the main image', async ({ page }) => {
    const imageFailures = watchImageFailures(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await storeNecessaryConsent(page);
    await page.goto(BASE + '/products/' + PRODUCT_SLUG, { waitUntil: 'domcontentloaded' });

    const gallery = page.locator('[data-product-gallery] .product-gallery-layout');
    const main = page.locator('.product-gallery-main-stage');
    const rail = page.locator('.product-gallery-rail');
    const thumbnails = page.locator('[data-product-gallery-thumbnail]');
    await expect(gallery).toHaveAttribute('data-gallery-state', 'multiple');
    await expect(thumbnails).toHaveCount(5);
    await expect(rail).toBeVisible();
    await expectImagesLoaded(page, '[data-product-gallery-thumbnail] img');

    const mainBox = await main.boundingBox();
    const railBox = await rail.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(railBox).not.toBeNull();
    expect(railBox.x).toBeGreaterThanOrEqual(mainBox.x + mainBox.width - 2);
    expect(Math.abs(mainBox.height - 420)).toBeLessThanOrEqual(2);

    const secondSource = await thumbnails.nth(1).getAttribute('data-gallery-src');
    await expect(thumbnails.nth(1).locator('img')).toHaveAttribute('src', /\/media\/product-gallery\//);
    await thumbnails.nth(1).click();
    await expect(thumbnails.nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#main-product-image')).toHaveAttribute('src', secondSource);
    await expect(page.locator('.product-gallery-count')).toContainText('2 / 5');

    await thumbnails.nth(2).focus();
    await thumbnails.nth(2).press('Enter');
    await expect(thumbnails.nth(2)).toHaveAttribute('aria-current', 'true');
    await page.screenshot({ path: path.join(ROOT, '.tmp', 'product-gallery-public-1440.png'), fullPage: true });
    expect(imageFailures).toEqual([]);
});

test('single-image product has no gallery controls or empty rail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await storeNecessaryConsent(page);
    await page.goto(BASE + '/products/omitted-gallery', { waitUntil: 'domcontentloaded' });
    const gallery = page.locator('[data-product-gallery] .product-gallery-layout');
    await expect(gallery).toHaveAttribute('data-gallery-state', 'single');
    await expect(page.locator('.product-gallery-rail')).toHaveCount(0);
    await expect(page.locator('[data-product-gallery-thumbnail]')).toHaveCount(0);
    await expect(page.locator('[data-product-gallery-step]')).toHaveCount(0);
    await expect(page.locator('#main-product-image')).toBeVisible();
    await expectImagesLoaded(page, '#main-product-image');
});

test('mobile gallery stacks below the image without horizontal overflow', async ({ page }) => {
    const imageFailures = watchImageFailures(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await storeNecessaryConsent(page);
    await page.goto(BASE + '/products/' + PRODUCT_SLUG, { waitUntil: 'domcontentloaded' });

    const mainBox = await page.locator('.product-gallery-main-stage').boundingBox();
    const railBox = await page.locator('.product-gallery-rail').boundingBox();
    expect(mainBox).not.toBeNull();
    expect(railBox).not.toBeNull();
    expect(railBox.y).toBeGreaterThanOrEqual(mainBox.y + mainBox.height - 2);
    expect(await page.evaluate(function () { return document.documentElement.scrollWidth <= document.documentElement.clientWidth; })).toBeTruthy();
    await expect(page.locator('.product-gallery-toolbar')).toBeHidden();
    await expect(page.locator('[data-product-gallery-thumbnail]')).toHaveCount(5);
    await expectImagesLoaded(page, '[data-product-gallery-thumbnail] img');
    await page.screenshot({ path: path.join(ROOT, '.tmp', 'product-gallery-public-390.png'), fullPage: true });
    expect(imageFailures).toEqual([]);
});

test('all enabled locales render the gallery and RTL places the rail on the logical start side', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await storeNecessaryConsent(page);
    for (const locale of ['', '/fr', '/ru']) {
        await page.goto(BASE + locale + '/products/' + PRODUCT_SLUG, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-product-gallery-thumbnail]')).toHaveCount(5);
        await expect(page.locator('[data-product-gallery] .product-gallery-layout')).toHaveAttribute('data-gallery-state', 'multiple');
    }

    await page.goto(BASE + '/ar/products/' + PRODUCT_SLUG, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('[data-product-gallery-thumbnail]')).toHaveCount(5);
    const mainBox = await page.locator('.product-gallery-main-stage').boundingBox();
    const railBox = await page.locator('.product-gallery-rail').boundingBox();
    expect(railBox.x + railBox.width).toBeLessThanOrEqual(mainBox.x + 2);
});

test('SSR keeps the full gallery usable when JavaScript is disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    await blockExternalRequests(context);
    const page = await context.newPage();
    await page.goto(BASE + '/products/' + PRODUCT_SLUG, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main-product-image')).toBeVisible();
    await expect(page.locator('[data-product-gallery-thumbnail]')).toHaveCount(5);
    await expect(page.locator('[data-product-gallery] .product-gallery-layout')).toHaveAttribute('data-gallery-state', 'multiple');
    await expectImagesLoaded(page, '#main-product-image, [data-product-gallery-thumbnail] img');
    await context.close();
});

async function collectGalleryPerformance(browser, slug) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await blockExternalRequests(context);
    const page = await context.newPage();
    await storeNecessaryConsent(page);
    await page.addInitScript(function () {
        window.__galleryLcp = [];
        new PerformanceObserver(function (list) {
            list.getEntries().forEach(function (entry) { window.__galleryLcp.push(entry.startTime); });
        }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto(BASE + '/products/' + slug, { waitUntil: 'domcontentloaded' });
    await expectImagesLoaded(page, '#main-product-image, [data-product-gallery-thumbnail] img');
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(function () {
        const thumbs = Array.from(document.querySelectorAll('[data-product-gallery-thumbnail] img'));
        const main = document.querySelector('#main-product-image');
        const galleryUrls = new Set(thumbs.map(function (image) { return image.currentSrc || image.src; }));
        const mainUrl = main ? (main.currentSrc || main.src) : '';
        const addedTransfer = performance.getEntriesByType('resource').reduce(function (sum, entry) {
            return galleryUrls.has(entry.name) && entry.name !== mainUrl ? sum + Number(entry.transferSize || 0) : sum;
        }, 0);
        const lcp = window.__galleryLcp.length ? window.__galleryLcp[window.__galleryLcp.length - 1] : 0;
        return { addedTransfer, lcp, thumbnailCount: thumbs.length };
    });
    await context.close();
    return metrics;
}

test('five-image gallery stays within the transfer budget without a visible LCP regression', async ({ browser }) => {
    const single = await collectGalleryPerformance(browser, 'omitted-gallery');
    const multiple = await collectGalleryPerformance(browser, PRODUCT_SLUG);
    console.log(JSON.stringify({ singleLcpMs: single.lcp, multipleLcpMs: multiple.lcp, addedGalleryTransferBytes: multiple.addedTransfer }));
    expect(multiple.thumbnailCount).toBe(5);
    expect(multiple.addedTransfer).toBeLessThanOrEqual(2.5 * 1024 * 1024);
    expect(multiple.lcp).toBeLessThanOrEqual(single.lcp + 500);
});
