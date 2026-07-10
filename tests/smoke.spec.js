const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';

async function mockHeaderContactBarData(page, overrides) {
    overrides = overrides || {};
    const company = Object.assign({
        name: 'Longxiang Electrical',
        email: 'sales@longxiang.test',
        instagram: 'https://www.instagram.com/longxiang.test/',
        youtube: 'https://www.youtube.com/@longxiang-test'
    }, overrides.company || {});
    const contactBar = Object.assign({
        enabled: true,
        showEmail: true,
        showInstagram: true,
        showYouTube: true
    }, overrides.contactBar || {});

    await page.route('**/api/company', function (route) {
        return route.fulfill({ json: company });
    });
    await page.route('**/api/content-blocks/global-shell', function (route) {
        return route.fulfill({
            json: {
                slug: 'global-shell',
                body: {
                    navigation: {
                        mainLinks: [],
                        contactBar: contactBar
                    },
                    footer: {},
                    inquiry: {}
                }
            }
        });
    });
}

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

test.describe('顶部公共联系方式栏', function () {
    test('桌面端数据、布局和滚动收起符合 A 方案', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await mockHeaderContactBarData(page);
        await page.goto(BASE + '/index.html');

        const bar = page.locator('.header-contact-bar');
        const email = bar.locator('.header-contact-bar__email');
        const instagram = bar.locator('[data-contact-bar-social="instagram"]');
        const youtube = bar.locator('[data-contact-bar-social="youtube"]');
        await expect(bar).toBeVisible();
        await expect(email).toHaveAttribute('href', 'mailto:sales@longxiang.test');
        await expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/longxiang.test/');
        await expect(instagram).toHaveAttribute('target', '_blank');
        await expect(instagram).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(youtube).toHaveAttribute('href', 'https://www.youtube.com/@longxiang-test');

        const layout = await page.evaluate(function () {
            var barEl = document.querySelector('.header-contact-bar');
            var emailEl = document.querySelector('.header-contact-bar__email');
            var instagramEl = document.querySelector('[data-contact-bar-social="instagram"]');
            var youtubeEl = document.querySelector('[data-contact-bar-social="youtube"]');
            var navContainer = document.querySelector('.navbar > .container');
            var barBox = barEl.getBoundingClientRect();
            var emailBox = emailEl.getBoundingClientRect();
            var instagramBox = instagramEl.getBoundingClientRect();
            var youtubeBox = youtubeEl.getBoundingClientRect();
            var navBox = navContainer.getBoundingClientRect();
            var style = getComputedStyle(barEl);
            return {
                barHeight: barBox.height,
                barTop: barBox.top,
                background: style.backgroundColor,
                emailX: emailBox.x,
                instagramX: instagramBox.x,
                youtubeX: youtubeBox.x,
                navTop: navBox.top,
                overflow: document.documentElement.scrollWidth - window.innerWidth
            };
        });
        expect(layout.barHeight).toBeGreaterThanOrEqual(39);
        expect(layout.barHeight).toBeLessThanOrEqual(41);
        expect(layout.barTop).toBe(0);
        expect(layout.background).toBe('rgb(10, 22, 40)');
        expect(layout.emailX).toBeLessThan(layout.instagramX);
        expect(layout.instagramX).toBeLessThan(layout.youtubeX);
        expect(layout.navTop).toBeGreaterThanOrEqual(39);
        expect(layout.overflow).toBeLessThanOrEqual(0);

        const iconColors = await page.evaluate(function () {
            var link = document.querySelector('[data-contact-bar-social="youtube"]');
            return {
                link: getComputedStyle(link).color,
                instagram: getComputedStyle(document.querySelector('.header-contact-bar .instagram-glyph')).stroke,
                youtube: getComputedStyle(document.querySelector('.header-contact-bar .youtube-back')).fill
            };
        });
        expect(iconColors.link).toBe('rgb(255, 255, 255)');
        expect(iconColors.instagram).toBe(iconColors.link);
        expect(iconColors.youtube).toBe(iconColors.link);
        await youtube.hover();
        await expect.poll(function () {
            return youtube.evaluate(function (element) {
                return {
                    link: getComputedStyle(element).color,
                    icon: getComputedStyle(element.querySelector('.youtube-back')).fill
                };
            });
        }).toEqual({ link: 'rgb(212, 168, 67)', icon: 'rgb(212, 168, 67)' });

        await page.evaluate(function () { window.scrollTo(0, 180); });
        await expect(page.locator('.navbar')).toHaveClass(/scrolled/);
        await expect.poll(async function () {
            return bar.evaluate(function (element) { return element.getBoundingClientRect().height; });
        }).toBeLessThan(1);
        await expect(page.locator('.navbar .nav-logo')).toBeVisible();
    });

    test('阿语页面仍保持邮箱在物理左侧、社交图标在右侧', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 768 });
        await mockHeaderContactBarData(page);
        await page.goto(BASE + '/ar/index.html');
        const positions = await page.evaluate(function () {
            var email = document.querySelector('.header-contact-bar__email').getBoundingClientRect();
            var instagram = document.querySelector('[data-contact-bar-social="instagram"]').getBoundingClientRect();
            var youtube = document.querySelector('[data-contact-bar-social="youtube"]').getBoundingClientRect();
            return {
                emailX: email.x,
                instagramX: instagram.x,
                youtubeX: youtube.x,
                overflow: document.documentElement.scrollWidth - window.innerWidth
            };
        });
        expect(positions.emailX).toBeLessThan(positions.instagramX);
        expect(positions.instagramX).toBeLessThan(positions.youtubeX);
        expect(positions.overflow).toBeLessThanOrEqual(0);
    });

    ['fr', 'ru'].forEach(function (locale) {
        test(locale + ' 页面在 1024px 下显示完整且不横向溢出', async ({ page }) => {
            await page.setViewportSize({ width: 1024, height: 768 });
            await mockHeaderContactBarData(page);
            await page.goto(BASE + '/' + locale + '/index.html');
            await expect(page.locator('.header-contact-bar')).toBeVisible();
            await expect(page.locator('.header-contact-bar__email')).toHaveText('sales@longxiang.test');
            const overflow = await page.evaluate(function () {
                return document.documentElement.scrollWidth - window.innerWidth;
            });
            expect(overflow).toBeLessThanOrEqual(0);
        });
    });

    test('移动端隐藏顶栏且不改变现有导航高度', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await mockHeaderContactBarData(page);
        await page.goto(BASE + '/index.html');
        await expect(page.locator('.header-contact-bar')).toBeHidden();
        const navHeight = await page.locator('.navbar').evaluate(function (element) {
            return element.getBoundingClientRect().height;
        });
        expect(navHeight).toBeGreaterThanOrEqual(64);
        expect(navHeight).toBeLessThanOrEqual(66);
        await expect(page.locator('.hamburger')).toBeVisible();
    });

    test('关闭开关或链接不安全时不输出对应入口', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await mockHeaderContactBarData(page, {
            company: {
                instagram: 'javascript:alert(1)',
                youtube: ''
            },
            contactBar: {
                showEmail: false
            }
        });
        await page.goto(BASE + '/index.html');
        await expect(page.locator('.header-contact-bar')).toHaveCount(0);
        await expect(page.locator('[data-contact-bar-social][href^="javascript:"]')).toHaveCount(0);
    });

    test('单项开关只隐藏对应入口', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await mockHeaderContactBarData(page, {
            contactBar: {
                showInstagram: false
            }
        });
        await page.goto(BASE + '/index.html');
        await expect(page.locator('.header-contact-bar__email')).toBeVisible();
        await expect(page.locator('[data-contact-bar-social="instagram"]')).toHaveCount(0);
        await expect(page.locator('[data-contact-bar-social="youtube"]')).toBeVisible();
    });
});
