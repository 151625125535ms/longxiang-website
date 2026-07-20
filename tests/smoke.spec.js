const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_BASE || 'http://localhost:3000';

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
    await page.route('**/api/content-blocks/global-shell?locale=*', function (route) {
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
    await page.route('**/api/content-blocks/contact?locale=*', function (route) {
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
    await page.goto(BASE + '/');
    await expect(page).toHaveTitle(/Longxiang/i);
    await expect(page.locator('nav.navbar')).toBeVisible();
});

test('同版本公共壳水合保留服务端导航页脚和社交节点', async ({ page }) => {
    await page.route('**/api/content-blocks/global-shell?locale=*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
    });
    await page.route('**/api/company', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
    });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const probes = await page.evaluate(() => {
        const nodes = [
            document.querySelector('.nav-links .nav-item'),
            document.querySelector('.footer-grid .footer-company'),
            document.querySelector('[data-communication-links] > *')
        ];
        nodes.forEach((node, index) => {
            if (node) node.setAttribute('data-ssr-node-probe', String(index));
        });
        return nodes.map(Boolean);
    });
    expect(probes).toEqual([true, true, true]);
    await page.waitForTimeout(900);
    await expect(page.locator('.nav-links [data-ssr-node-probe="0"]')).toHaveCount(1);
    await expect(page.locator('.footer-grid [data-ssr-node-probe="1"]')).toHaveCount(1);
    await expect(page.locator('[data-communication-links] > [data-ssr-node-probe="2"]')).toHaveCount(1);
});

test('公共数据 API 失败时服务端导航和页脚保持可用', async ({ page }) => {
    await page.route('**/api/content-blocks/global-shell?locale=*', (route) => route.abort());
    await page.route('**/api/company', (route) => route.abort());
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    expect(await page.locator('.nav-links a').count()).toBeGreaterThan(0);
    await expect(page.locator('.footer-grid')).toContainText('henanlxgj@163.com');
    await expect(page.locator('.footer-links a[href="https://www.lxelec.cn/"]')).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.hamburger').click();
    await expect(page.locator('.nav-links')).toHaveClass(/active/);
});

test('首页非 Hero 产品卡使用现有专用缩略图', async ({ page }) => {
    await page.goto(BASE + '/');
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
        { path: '/', label: 'China Website / 中国官网' },
        { path: '/ar/', label: 'الموقع الرسمي في الصين' },
        { path: '/fr/', label: 'Site officiel en Chine' },
        { path: '/ru/', label: 'Официальный сайт в Китае' }
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

    await page.goto(BASE + '/fr/');
    const chinaWebsiteLink = page.locator('.footer-links a[href="https://www.lxelec.cn/"]');
    await expect(chinaWebsiteLink).toHaveCount(1);
    await expect.poll(function () {
        return chinaWebsiteLink.evaluate(function (link) { return link._chinaWebsiteTrackingBound === true; });
    }).toBe(true);
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

    await page.goto(BASE + '/');
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

test('.com 产品筛选参数页保持筛选体验但不建立独立索引', async ({ page }) => {
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
    expect(alternates.every(function (href) { return href && href.indexOf(BASE + '/') === 0; })).toBe(true);
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
    const resp = await page.goto(BASE + '/');
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
        await page.goto(BASE + '/');

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
        await page.goto(BASE + '/ar/');
        await expect(page.locator('.header-contact-bar__email')).toBeVisible();
        await expect(page.locator('[data-contact-bar-social="instagram"]')).toBeVisible();
        await expect(page.locator('[data-contact-bar-social="youtube"]')).toBeVisible();
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
            await page.goto(BASE + '/' + locale + '/');
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
        await page.goto(BASE + '/');
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
        await page.goto(BASE + '/');
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
        await page.goto(BASE + '/');
        await expect(page.locator('.header-contact-bar__email')).toBeVisible();
        await expect(page.locator('[data-contact-bar-social="instagram"]')).toHaveCount(0);
        await expect(page.locator('[data-contact-bar-social="youtube"]')).toBeVisible();
    });
});

test('同版本重点正文水合保留服务端正文和联系表单节点', async ({ page }) => {
    await page.route('**/api/content-blocks/contact?locale=*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.continue();
    });
    await page.goto(BASE + '/contact.html', { waitUntil: 'domcontentloaded' });
    const probes = await page.evaluate(() => {
        const root = document.querySelector('[data-content-page="contact"]');
        const section = root && root.querySelector('section');
        const form = root && root.querySelector('#contactForm');
        if (section) section.setAttribute('data-content-node-probe', 'section');
        if (form) form.setAttribute('data-content-node-probe', 'form');
        return [Boolean(section), Boolean(form), root && root.getAttribute('data-content-version')];
    });
    expect(probes[0]).toBe(true);
    expect(probes[1]).toBe(true);
    expect(probes[2]).toBeTruthy();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-content-page="contact"] section[data-content-node-probe="section"]')).toHaveCount(1);
    await expect(page.locator('#contactForm[data-content-node-probe="form"]')).toHaveCount(1);
    await expect(page.locator('[data-content-page="contact"]')).toHaveAttribute('data-content-hydrated-version', probes[2]);
});

test('重点正文 API 失败时服务端正文仍可见且可提交', async ({ page }) => {
    await page.route('**/api/content-blocks/contact?locale=*', (route) => route.abort());
    await page.goto(BASE + '/contact.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await expect(page.locator('[data-content-page="contact"] h2').first()).toBeVisible();
    await expect(page.locator('#contactForm')).toHaveCount(1);
    await expect(page.locator('[data-content-page="contact"]')).toHaveAttribute('data-content-fallback', 'static');
    await expect(page.locator('[data-content-page="contact"]')).not.toContainText('Loading contact information');
});

test('首页正文延迟水合不会清除已加载产品卡', async ({ page }) => {
    await page.route('**/api/content-blocks/home?locale=*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 900));
        await route.continue();
    });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#featured-products-container .product-card').first()).toBeVisible();
    const countBefore = await page.locator('#featured-products-container .product-card').count();
    await page.waitForTimeout(1100);
    const countAfter = await page.locator('#featured-products-container .product-card').count();
    expect(countAfter).toBe(countBefore);
    expect(countAfter).toBeGreaterThan(0);
});

test('同版本产品目录水合保留服务端首张卡片和分类节点', async ({ page }) => {
    await page.route('**/api/products?locale=*', async (route) => { await new Promise((resolve) => setTimeout(resolve, 700)); await route.continue(); });
    await page.route('**/api/product-categories?locale=*', async (route) => { await new Promise((resolve) => setTimeout(resolve, 700)); await route.continue(); });
    await page.goto(BASE + '/products.html', { waitUntil: 'domcontentloaded' });
    const probes = await page.evaluate(() => {
        const card = document.querySelector('#products-container .product-card');
        const category = document.querySelector('.product-tree-body [data-product-filter]');
        if (card) card.setAttribute('data-product-node-probe', 'card');
        if (category) category.setAttribute('data-product-node-probe', 'category');
        return [Boolean(card), Boolean(category)];
    });
    expect(probes).toEqual([true, true]);
    await page.waitForTimeout(1000);
    await expect(page.locator('#products-container [data-product-node-probe="card"]')).toHaveCount(1);
    await expect(page.locator('.product-tree-body [data-product-node-probe="category"]')).toHaveCount(1);
    await expect(page.locator('[data-product-ssr="catalog"]')).toHaveAttribute('data-product-hydrated', 'true');
});

test('产品目录 API 失败时保留服务端筛选结果', async ({ page }) => {
    await page.route('**/api/products?locale=*', (route) => route.abort());
    await page.route('**/api/product-categories?locale=*', (route) => route.abort());
    await page.goto(BASE + '/products.html?group=switchgear', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await expect(page.locator('#products-container .product-card').first()).toBeVisible();
    await expect(page.locator('[data-product-ssr="catalog"]')).toHaveAttribute('data-product-fallback', 'static');
    await expect(page.locator('#products-container')).not.toContainText('Unable to load products');
});

test('同版本产品详情水合保留H1规格相关产品和询盘节点', async ({ page }) => {
    await page.route('**/api/content-blocks/product-pages?locale=*', async (route) => { await new Promise((resolve) => setTimeout(resolve, 500)); await route.continue(); });
    await page.route('**/api/products/**?locale=*', async (route) => { await new Promise((resolve) => setTimeout(resolve, 800)); await route.continue(); });
    await page.route('**/api/products?locale=*', async (route) => { await new Promise((resolve) => setTimeout(resolve, 800)); await route.continue(); });
    await page.goto(BASE + '/products/anti-short-amorphous', { waitUntil: 'domcontentloaded' });
    const probes = await page.evaluate(() => {
        const nodes = [document.querySelector('#product-title'), document.querySelector('#specs-body tr'), document.querySelector('[data-product-related] .product-related-card'), document.querySelector('[data-product-detail-inquiry] form')];
        nodes.forEach((node, index) => { if (node) node.setAttribute('data-detail-node-probe', String(index)); });
        return nodes.map(Boolean);
    });
    expect(probes).toEqual([true, true, true, true]);
    await page.waitForTimeout(1500);
    for (let index = 0; index < 4; index += 1) await expect(page.locator('[data-detail-node-probe="' + index + '"]')).toHaveCount(1);
    await expect(page.locator('[data-product-ssr="detail"]')).toHaveAttribute('data-product-hydrated', 'true');
    const image = await page.locator('#main-product-image').getAttribute('src');
    expect(image).not.toContain('product-cards');
    await expect(page.locator('[data-product-gallery] [data-gallery-state="single"]')).toHaveCount(1);
    await expect(page.locator('[data-product-gallery-thumbnail]')).toHaveCount(0);
    await expect(page.locator('[data-product-gallery-step]')).toHaveCount(0);
});

test('产品详情 API 失败时保留服务端完整正文', async ({ page }) => {
    await page.route('**/api/content-blocks/product-pages?locale=*', (route) => route.abort());
    await page.route('**/api/products/**?locale=*', (route) => route.abort());
    await page.route('**/api/products?locale=*', (route) => route.abort());
    await page.goto(BASE + '/fr/products/anti-short-amorphous', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await expect(page.locator('#product-title')).not.toContainText('Product Details');
    await expect(page.locator('#specs-body tr').first()).toBeVisible();
    await expect(page.locator('[data-product-related] .product-related-card').first()).toBeVisible();
    await expect(page.locator('[data-product-detail-inquiry] form')).toHaveCount(1);
    await expect(page.locator('[data-product-ssr="detail"]')).toHaveAttribute('data-product-fallback', 'content-block');
});

test('禁用JavaScript时产品详情核心正文仍完整可见', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(BASE + '/ru/products/anti-short-amorphous');
    await expect(page.locator('#product-title')).toBeVisible();
    await expect(page.locator('#product-desc p').first()).toBeVisible();
    await expect(page.locator('#main-product-image')).toHaveAttribute('fetchpriority', 'high');
    await expect(page.locator('[data-product-gallery-thumbnail]')).toHaveCount(0);
    await expect(page.locator('#specs-body tr').first()).toBeVisible();
    await expect(page.locator('[data-product-related] a').first()).toHaveAttribute('href', /\/ru\/products\//);
    await context.close();
});

test('阿法俄页面正确加载共享展示模块并完成幂等水合', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const locale of ['ar', 'fr', 'ru']) {
        await page.goto(BASE + '/' + locale + '/about.html', { waitUntil: 'networkidle' });
        await expect(page.locator('[data-ssr-content="about-us"]')).toHaveAttribute('data-content-hydrated-version', /\d+/);
        await page.goto(BASE + '/' + locale + '/products.html', { waitUntil: 'networkidle' });
        await expect(page.locator('[data-product-ssr="catalog"]')).toHaveAttribute('data-product-hydrated', 'true');
        await page.goto(BASE + '/' + locale + '/products/anti-short-amorphous', { waitUntil: 'networkidle' });
        await expect(page.locator('[data-product-ssr="detail"]')).toHaveAttribute('data-product-hydrated', 'true');
    }
    expect(errors.filter((message) => /presentation|MIME|not defined/i.test(message))).toEqual([]);
});
