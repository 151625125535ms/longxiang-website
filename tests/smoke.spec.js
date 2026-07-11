const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';

async function mockHeaderContactBarData(page, overrides) {
    overrides = overrides || {};
    const company = Object.assign({
        name: 'Longxiang Electric',
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
                        mainLinks: [{ href: 'index.html', label: 'Home' }],
                        contactBar: contactBar
                    },
                    footer: {},
                    inquiry: {}
                }
            }
        });
    });
}

async function mockContactCardData(page) {
    await page.route('**/api/content-blocks/contact', function (route) {
        return route.fulfill({
            json: {
                slug: 'contact',
                body: {
                    hero: { title: 'Contact Us', subtitle: 'Send your project requirements.' },
                    phone: '0371-85901122',
                    email: 'sales@longxiang.test',
                    instagram: 'https://www.instagram.com/longxiang.test/',
                    youtube: 'https://www.youtube.com/@longxiang-test',
                    headquarters: 'Zhengzhou Factory',
                    huaiyangBase: 'Zhoukou Factory',
                    contactPage: {
                        companyName: 'Henan Longxiang Electric Co., Ltd.',
                        infoTitle: 'Headquarters Information',
                        officeLabel: 'Office',
                        emailLabel: 'Email',
                        factoryAddressLabel: 'Factory Address',
                        socialTitle: 'Social Media'
                    }
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

test('首页非 Hero 产品卡使用现有专用缩略图', async ({ page }) => {
    await page.goto(BASE + '/index.html');
    const images = page.locator('#featured-products-container .product-card-image img');
    await expect(images.first()).toBeVisible();
    const sources = await images.evaluateAll(function (items) {
        return items.map(function (item) { return item.getAttribute('src') || ''; });
    });
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every(function (source) {
        return source.indexOf('assets/optimized/product-cards/') !== -1;
    })).toBe(true);
});

test('四种正式语言页脚均显示中国官网绝对链接', async ({ page }) => {
    const locales = [
        { path: '/index.html', label: 'China Website / 中国官网' },
        { path: '/ar/index.html', label: 'الموقع الرسمي في الصين' },
        { path: '/fr/index.html', label: 'Site officiel en Chine' },
        { path: '/ru/index.html', label: 'Официальный сайт в Китае' }
    ];
    for (const locale of locales) {
        await page.goto(BASE + locale.path);
        const link = page.locator('.footer-links a[href="https://www.lxelec.cn/"]');
        await expect(link).toHaveCount(1);
        await expect(link).toHaveText(locale.label);
        await expect(link).not.toHaveAttribute('rel', /nofollow/i);
        await expect(page.locator('body')).not.toContainText('Longxiang ' + 'Electrical');
    }
});

test('中国官网跳转仅在分析同意后发送带页面上下文的 GA4 事件', async ({ page }) => {
    await page.addInitScript(function () {
        window.__capturedGtagCalls = [];
        window.gtag = function () {
            window.__capturedGtagCalls.push(Array.from(arguments));
        };
        localStorage.setItem('lx_cookie_consent_v1', JSON.stringify({
            necessary: true,
            analytics: true,
            functional: false,
            updatedAt: new Date().toISOString()
        }));
    });

    await page.goto(BASE + '/fr/index.html');
    const chinaWebsiteLink = page.locator('.footer-links a[href="https://www.lxelec.cn/"]');
    await expect(chinaWebsiteLink).toHaveCount(1);
    await chinaWebsiteLink.evaluate(function (link) {
        link.addEventListener('click', function (event) { event.preventDefault(); }, { once: true });
        link.click();
    });

    const eventCalls = await page.evaluate(function () {
        return window.__capturedGtagCalls.filter(function (call) {
            return call[0] === 'event' && call[1] === 'click_china_website';
        });
    });
    expect(eventCalls).toEqual([[
        'event',
        'click_china_website',
        { locale: 'fr', page_type: 'home', source_component: 'footer' }
    ]]);
});

test('未同意分析 Cookie 时不发送中国官网 GA4 事件', async ({ page }) => {
    await page.addInitScript(function () {
        window.__capturedGtagCalls = [];
        window.gtag = function () {
            window.__capturedGtagCalls.push(Array.from(arguments));
        };
    });

    await page.goto(BASE + '/index.html');
    const chinaWebsiteLink = page.locator('.footer-links a[href="https://www.lxelec.cn/"]');
    await expect(chinaWebsiteLink).toHaveCount(1);
    await chinaWebsiteLink.evaluate(function (link) {
        link.addEventListener('click', function (event) { event.preventDefault(); }, { once: true });
        link.click();
    });

    const eventCalls = await page.evaluate(function () {
        return window.__capturedGtagCalls.filter(function (call) {
            return call[0] === 'event' && call[1] === 'click_china_website';
        });
    });
    expect(eventCalls).toEqual([]);
});

test('真实联系页保持原地址标签且仅显示国际邮箱', async ({ page }) => {
    await page.goto(BASE + '/contact.html');
    const rows = page.locator('.contact-info-list .contact-info-row');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('henanlxgj@163.com');
    await expect(rows.nth(1).locator('strong')).toHaveText('Factory Address');
    await expect(rows.nth(2).locator('strong')).toHaveText('Factory Address');
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
});

test('产品列表页加载正常', async ({ page }) => {
    await page.goto(BASE + '/products.html');
    await expect(page.locator('nav.navbar')).toBeVisible();
});

test('产品筛选参数页保持筛选体验但不建立独立索引', async ({ page }) => {
    await page.goto(BASE + '/fr/products.html?group=transformer&sub=dry-type');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        BASE + '/fr/products.html'
    );
    const alternates = await page.locator('link[rel="alternate"]').evaluateAll(function (links) {
        return links.map(function (link) { return link.getAttribute('href'); });
    });
    expect(alternates.every(function (href) { return href && href.indexOf('?') === -1; })).toBe(true);
    await expect(page.locator('.catalog-filter-status')).toBeVisible();
    await expect(page.locator('#catalog-current-filter')).toContainText('Transformateurs secs');
});

test('敏感路径返回 403', async ({ page }) => {
    for (const path of ['/data/longxiang.db', '/tests/smoke.spec.js', '/.tmp/admin-js-raw-head.js', '/docs/']) {
        const resp = await page.request.get(BASE + path);
        expect(resp.status(), path).toBe(403);
    }
});

test('CSP Report-Only 头存在', async ({ page }) => {
    const resp = await page.goto(BASE + '/index.html');
    const headers = resp.headers();
    expect(headers['content-security-policy-report-only']).toBeTruthy();
});

test('联系页三项联系方式采用精简列表且 Social Media 保持不变', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockContactCardData(page);
    await page.goto(BASE + '/contact.html');

    const rows = page.locator('.contact-info-list .contact-info-row');
    await expect(rows).toHaveCount(3);
    await expect(page.locator('.contact-info-list a[href^="tel:"]')).toHaveCount(0);
    await expect(rows.nth(0).locator('strong')).toHaveText('Email');
    await expect(rows.nth(0).locator('a')).toHaveAttribute('href', 'mailto:sales@longxiang.test');
    await expect(rows.nth(1).locator('strong')).toHaveText('Factory Address');
    await expect(rows.nth(1)).toContainText('Zhengzhou Factory');
    await expect(rows.nth(2)).toContainText('Zhoukou Factory');
    const socialBlock = page.locator('.contact-social-block');
    await expect(socialBlock).toBeVisible();
    await expect(socialBlock.locator('h4')).toHaveText('Social Media');
    await expect(socialBlock.locator('.contact-social-icons a')).toHaveCount(2);

    const visual = await page.evaluate(function () {
        var list = document.querySelector('.contact-info-list');
        var elements = Array.from(list.querySelectorAll('.contact-info-row'));
        var social = document.querySelector('.contact-social-block');
        var socialIcons = document.querySelector('.contact-social-icons');
        var socialLink = socialIcons.querySelector('a');
        var rowStyle = getComputedStyle(elements[0]);
        var socialStyle = getComputedStyle(social);
        var socialLinkStyle = getComputedStyle(socialLink);
        return {
            rows: elements.map(function (element) {
            var box = element.getBoundingClientRect();
            return { x: box.x, y: box.y, width: box.width };
            }),
            listBorderTopWidth: getComputedStyle(list).borderTopWidth,
            rowBackground: rowStyle.backgroundColor,
            rowBorderRadius: rowStyle.borderRadius,
            rowBorderLeftWidth: rowStyle.borderLeftWidth,
            rowBorderRightWidth: rowStyle.borderRightWidth,
            rowBorderBottomWidth: rowStyle.borderBottomWidth,
            socialMarginTop: socialStyle.marginTop,
            socialPaddingTop: socialStyle.paddingTop,
            socialBorderTopWidth: socialStyle.borderTopWidth,
            socialGap: getComputedStyle(socialIcons).gap,
            socialLinkWidth: socialLinkStyle.width,
            socialLinkHeight: socialLinkStyle.height
        };
    });
    expect(visual.rows[0].width).toBeGreaterThan(500);
    expect(Math.abs(visual.rows[0].width - visual.rows[1].width)).toBeLessThanOrEqual(1);
    expect(Math.abs(visual.rows[1].width - visual.rows[2].width)).toBeLessThanOrEqual(1);
    expect(Math.abs(visual.rows[0].x - visual.rows[1].x)).toBeLessThanOrEqual(1);
    expect(Math.abs(visual.rows[1].x - visual.rows[2].x)).toBeLessThanOrEqual(1);
    expect(visual.rows[0].y).toBeLessThan(visual.rows[1].y);
    expect(visual.rows[1].y).toBeLessThan(visual.rows[2].y);
    expect(visual.listBorderTopWidth).toBe('2px');
    expect(visual.rowBackground).toBe('rgba(0, 0, 0, 0)');
    expect(visual.rowBorderRadius).toBe('0px');
    expect(visual.rowBorderLeftWidth).toBe('0px');
    expect(visual.rowBorderRightWidth).toBe('0px');
    expect(visual.rowBorderBottomWidth).toBe('1px');
    expect(visual.socialMarginTop).toBe('24px');
    expect(visual.socialPaddingTop).toBe('20px');
    expect(visual.socialBorderTopWidth).toBe('1px');
    expect(visual.socialGap).toBe('12px');
    expect(visual.socialLinkWidth).toBe('44px');
    expect(visual.socialLinkHeight).toBe('44px');
});

test.describe('顶部公共联系方式栏', function () {
    test('桌面端顶栏滚动后保持显示并与导航统一为白底', async ({ page }) => {
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
        expect(layout.background).toBe('rgba(0, 0, 0, 0)');
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
        }).toBeGreaterThanOrEqual(39);
        await expect.poll(async function () {
            return bar.evaluate(function (element) { return getComputedStyle(element).backgroundColor; });
        }).toBe('rgb(255, 255, 255)');
        const scrolledLayout = await page.evaluate(function () {
            var barEl = document.querySelector('.header-contact-bar');
            var navbarEl = document.querySelector('.navbar');
            var emailEl = document.querySelector('.header-contact-bar__email');
            var instagramGlyphEl = document.querySelector('.header-contact-bar .instagram-glyph');
            var instagramDotEl = document.querySelector('.header-contact-bar .instagram-dot');
            var logoEl = document.querySelector('.nav-logo-text');
            var navLinkEl = document.querySelector('.nav-links > .nav-item > a');
            var languageEl = document.querySelector('.language-switcher select');
            return {
                barBackground: getComputedStyle(barEl).backgroundColor,
                navBackground: getComputedStyle(navbarEl, '::before').backgroundColor,
                emailColor: getComputedStyle(emailEl).color,
                instagramStroke: getComputedStyle(instagramGlyphEl).stroke,
                instagramDot: getComputedStyle(instagramDotEl).fill,
                logoColor: getComputedStyle(logoEl).color,
                navLinkColor: getComputedStyle(navLinkEl).color,
                languageColor: getComputedStyle(languageEl).color,
                barHeight: barEl.getBoundingClientRect().height,
                navbarHeight: navbarEl.getBoundingClientRect().height
            };
        });
        expect(scrolledLayout.barBackground).toBe('rgb(255, 255, 255)');
        expect(scrolledLayout.navBackground).toBe('rgb(255, 255, 255)');
        expect(scrolledLayout.emailColor).toBe('rgb(10, 22, 40)');
        expect(scrolledLayout.instagramStroke).toBe('rgb(10, 22, 40)');
        expect(scrolledLayout.instagramDot).toBe('rgb(10, 22, 40)');
        expect(scrolledLayout.logoColor).toBe('rgb(10, 22, 40)');
        expect(scrolledLayout.navLinkColor).toBe('rgb(10, 22, 40)');
        expect(scrolledLayout.languageColor).toBe('rgb(10, 22, 40)');
        expect(scrolledLayout.barHeight).toBeLessThanOrEqual(41);
        expect(scrolledLayout.navbarHeight).toBeGreaterThanOrEqual(109);
        expect(scrolledLayout.navbarHeight).toBeLessThanOrEqual(111);
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
        await page.evaluate(function () { window.scrollTo(0, 180); });
        const scrolledNavHeight = await page.locator('.navbar').evaluate(function (element) {
            return element.getBoundingClientRect().height;
        });
        expect(scrolledNavHeight).toBeGreaterThanOrEqual(64);
        expect(scrolledNavHeight).toBeLessThanOrEqual(66);
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
