const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';

test('首页加载正常', async ({ page }) => {
    await page.goto(BASE + '/index.html');
    await expect(page).toHaveTitle(/Longxiang/i);
    await expect(page.locator('nav.navbar')).toBeVisible();
});

test('产品列表页加载正常', async ({ page }) => {
    await page.goto(BASE + '/products.html');
    await expect(page.locator('nav.navbar')).toBeVisible();
});

test('敏感路径返回 403', async ({ page }) => {
    const resp = await page.request.get(BASE + '/data/longxiang.db');
    expect(resp.status()).toBe(403);
});

test('CSP Report-Only 头存在', async ({ page }) => {
    const resp = await page.goto(BASE + '/index.html');
    const headers = resp.headers();
    expect(headers['content-security-policy-report-only']).toBeTruthy();
});
