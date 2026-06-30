const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
    loadLocaleConfig,
    localeEntry,
    allLocaleEntries,
    plannedLocaleEntries,
    sitemapLocaleEntries,
    localizedStaticPath,
    localizedProductPath,
    staticPagesForSitemap,
    htmlPagesForVerification,
    pageShellsForVerification,
    plannedPageShellsForVerification
} = require('./i18n-page-model');

const root = path.resolve(__dirname, '..');
const siteOrigin = 'https://www.lxenelectric.com';
const sitemapNamespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const xhtmlNamespace = 'http://www.w3.org/1999/xhtml';
const expectedSitemapUrlCount = 96;
const failures = [];
const warnings = [];

const localeConfigPath = path.join(root, 'config', 'locales.json');
const rawLocaleConfig = JSON.parse(fs.readFileSync(localeConfigPath, 'utf8'));
const localeConfig = loadLocaleConfig(localeConfigPath);
const sitemapLocales = sitemapLocaleEntries(localeConfig);
const defaultLocale = localeEntry(localeConfig, localeConfig.defaultLocale);
const sitemapAlternateLanguages = sitemapLocales.map((locale) => locale.hreflang).concat(['x-default']);
const staticPages = staticPagesForSitemap(localeConfig);
const htmlPages = htmlPagesForVerification(localeConfig);
const expectedPlannedLocales = {
    ru: {
        label: 'Russian',
        nativeLabel: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439',
        htmlLang: 'ru',
        hreflang: 'ru',
        dir: 'ltr',
        pathPrefix: '/ru',
        homePath: '/ru/index.html',
        fallbackLocale: 'en',
        includeInSitemap: false
    },
    pt: {
        label: 'Portuguese',
        nativeLabel: 'Portugu\u00eas',
        htmlLang: 'pt',
        hreflang: 'pt',
        dir: 'ltr',
        pathPrefix: '/pt',
        homePath: '/pt/index.html',
        fallbackLocale: 'en',
        includeInSitemap: false
    },
    fr: {
        label: 'French',
        nativeLabel: 'Fran\u00e7ais',
        htmlLang: 'fr',
        hreflang: 'fr',
        dir: 'ltr',
        pathPrefix: '/fr',
        homePath: '/fr/index.html',
        fallbackLocale: 'en',
        includeInSitemap: false
    }
};

function fail(message) {
    failures.push(message);
}

function warn(message) {
    warnings.push(message);
}

function assert(condition, message) {
    if (!condition) fail(message);
}

function readText(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fileExists(relativePath) {
    return fs.existsSync(path.join(root, relativePath));
}

function normalizePathPrefixForVerification(value) {
    const prefix = String(value || '').trim().replace(/\/+$/, '');
    if (!prefix || prefix === '/') return '';
    return prefix.charAt(0) === '/' ? prefix : '/' + prefix;
}

function localeConfigSnapshot(value) {
    const localeMap = value && value.locales ? value.locales : {};
    const supportedLocales = Array.isArray(value && value.supportedLocales) && value.supportedLocales.length
        ? value.supportedLocales.slice()
        : Object.keys(localeMap);
    const defaultLocaleCode = value && value.defaultLocale ? value.defaultLocale : (supportedLocales[0] || 'en');
    const locales = {};

    supportedLocales.forEach((code) => {
        const entry = localeMap[code] || {};
        const pathPrefix = normalizePathPrefixForVerification(entry.pathPrefix);
        locales[code] = {
            label: entry.label || code,
            nativeLabel: entry.nativeLabel || entry.label || code,
            htmlLang: entry.htmlLang || code,
            hreflang: entry.hreflang || entry.htmlLang || code,
            dir: entry.dir || '',
            pathPrefix,
            homePath: entry.homePath || (pathPrefix ? pathPrefix + '/index.html' : '/'),
            fallbackLocale: entry.fallbackLocale || null,
            includeInSitemap: entry.includeInSitemap !== false
        };
    });

    return {
        defaultLocale: defaultLocaleCode,
        supportedLocales,
        locales
    };
}

function extractFrontendLocaleConfig() {
    const source = readText('js/main.js');
    const match = source.match(/var\s+LOCALE_CONFIG\s*=\s*({[\s\S]*?})\s*;\s*\r?\n\s*var\s+STATIC_PAGE_BASE_PATHS/);

    assert(Boolean(match), 'js/main.js 缺少可校验的 LOCALE_CONFIG 定义。');
    if (!match) return null;

    try {
        return vm.runInNewContext('(' + match[1] + ')', Object.create(null), { timeout: 1000 });
    } catch (err) {
        fail('js/main.js 的 LOCALE_CONFIG 无法解析：' + err.message);
        return null;
    }
}

function extractFrontendPlannedLocalePathPrefixes() {
    const source = readText('js/main.js');
    const match = source.match(/var\s+PLANNED_LOCALE_PATH_PREFIXES\s*=\s*(\[[\s\S]*?\])\s*;/);

    assert(Boolean(match), 'js/main.js is missing PLANNED_LOCALE_PATH_PREFIXES.');
    if (!match) return [];

    try {
        const prefixes = vm.runInNewContext(match[1], Object.create(null), { timeout: 1000 });
        assert(Array.isArray(prefixes), 'js/main.js PLANNED_LOCALE_PATH_PREFIXES must be an array.');
        if (!Array.isArray(prefixes)) return [];
        return prefixes.map(normalizePathPrefixForVerification).filter(Boolean).sort();
    } catch (err) {
        fail('js/main.js PLANNED_LOCALE_PATH_PREFIXES cannot be parsed: ' + err.message);
        return [];
    }
}

function assertJsonEqual(actual, expected, label) {
    assert(JSON.stringify(actual) === JSON.stringify(expected), label + ' 与 config/locales.json 不一致。');
}

function assertArrayEqual(actual, expected, message) {
    assert(JSON.stringify(actual) === JSON.stringify(expected), message);
}

function plannedLocaleCodes() {
    return Object.keys(expectedPlannedLocales);
}

function plannedLocalePathPrefixes() {
    return plannedLocaleEntries(localeConfig)
        .map((locale) => normalizePathPrefixForVerification(locale.pathPrefix))
        .filter(Boolean)
        .sort();
}

function configuredPlannedLocaleCodes() {
    return Object.keys(rawLocaleConfig.plannedLocales || {});
}

function plannedLocaleSnapshot(entry) {
    const pathPrefix = normalizePathPrefixForVerification(entry && entry.pathPrefix);
    return {
        label: entry && entry.label || '',
        nativeLabel: entry && entry.nativeLabel || '',
        htmlLang: entry && entry.htmlLang || '',
        hreflang: entry && entry.hreflang || '',
        dir: entry && entry.dir || '',
        pathPrefix,
        homePath: entry && entry.homePath || (pathPrefix ? pathPrefix + '/index.html' : '/'),
        fallbackLocale: entry && entry.fallbackLocale || null,
        includeInSitemap: Boolean(entry && entry.includeInSitemap)
    };
}

function relativeFileUsesLocalePrefix(file, locale) {
    const normalized = String(file || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const prefix = String(locale.pathPrefix || '').replace(/^\/+/, '').replace(/\/+$/, '');
    return Boolean(prefix) && (normalized === prefix || normalized.indexOf(prefix + '/') === 0);
}

function pathUsesLocalePrefix(pathname, locale) {
    const normalized = String(pathname || '');
    const prefix = String(locale.pathPrefix || '');
    return Boolean(prefix) && (normalized === prefix || normalized.indexOf(prefix + '/') === 0);
}

function urlUsesLocalePrefix(value, locale) {
    const href = String(value || '').trim();
    if (!href) return false;

    const parsed = parseSitemapUrl(href);
    if (parsed) return parsed.origin === siteOrigin && pathUsesLocalePrefix(parsed.pathname, locale);

    return pathUsesLocalePrefix(href, locale) || href.indexOf(siteOrigin + locale.pathPrefix + '/') !== -1;
}

function plannedLocaleDirectoryExists(locale) {
    const prefix = String(locale.pathPrefix || '').replace(/^\/+/, '').replace(/\/+$/, '');
    return Boolean(prefix) && fs.existsSync(path.join(root, prefix));
}

function assertXmlExcludesPlannedLocale(xml, label, locale) {
    const urls = collectElementContents(xml, 'loc')
        .concat(collectTags(xml, 'xhtml:link').map((tag) => tag.attrs.href).filter(hasText));

    urls.forEach((url) => {
        assert(!urlUsesLocalePrefix(url, locale),
            label + ' 不应包含 planned locale URL：' + url + '。');
    });

    assert(xml.indexOf('hreflang="' + locale.hreflang + '"') === -1,
        label + ' 不应包含 planned locale hreflang="' + locale.hreflang + '"。');
    assert(xml.indexOf("hreflang='" + locale.hreflang + "'") === -1,
        label + ' 不应包含 planned locale hreflang=\'' + locale.hreflang + '\'。');
}

function verifyPlannedLocaleConfig(frontendConfig) {
    const plannedLocales = rawLocaleConfig.plannedLocales || {};
    const sitemapXml = readText('sitemap.xml');
    const configuredCodes = configuredPlannedLocaleCodes().sort();
    const expectedCodes = plannedLocaleCodes().sort();

    assertArrayEqual(configuredCodes, expectedCodes, 'config/locales.json plannedLocales 语言清单应只包含 ru/pt/fr。');

    plannedLocaleCodes().forEach((code) => {
        const expected = expectedPlannedLocales[code];
        const planned = plannedLocales[code];

        assert(Boolean(planned), 'config/locales.json 缺少 plannedLocales.' + code + '。');
        if (planned) {
            assertJsonEqual(plannedLocaleSnapshot(planned), expected, 'config/locales.json plannedLocales.' + code);
        }

        assert(localeConfig.supportedLocales.indexOf(code) === -1, 'planned locale ' + code + ' 不应进入 supportedLocales。');
        assert(!localeConfig.locales[code], 'planned locale ' + code + ' 不应进入 active locales。');
        assert(frontendConfig.supportedLocales.indexOf(code) === -1, 'planned locale ' + code + ' 不应进入 js/main.js LOCALE_CONFIG.supportedLocales。');
        assert(!frontendConfig.locales[code], 'planned locale ' + code + ' 不应进入 js/main.js LOCALE_CONFIG.locales。');
        assertXmlExcludesPlannedLocale(sitemapXml, 'sitemap.xml', Object.assign({ code }, expected));
    });
}

function verifyFrontendLocaleConfigSync() {
    const frontendConfig = extractFrontendLocaleConfig();
    if (!frontendConfig) return;

    const expected = localeConfigSnapshot(localeConfig);
    const actual = localeConfigSnapshot(frontendConfig);

    assertJsonEqual(actual.defaultLocale, expected.defaultLocale, 'js/main.js LOCALE_CONFIG.defaultLocale');
    assertJsonEqual(actual.supportedLocales, expected.supportedLocales, 'js/main.js LOCALE_CONFIG.supportedLocales');
    expected.supportedLocales.forEach((code) => {
        assertJsonEqual(actual.locales[code], expected.locales[code], 'js/main.js LOCALE_CONFIG.locales.' + code);
    });

    verifyPlannedLocaleConfig(frontendConfig);
}

function verifyPageShellFiles() {
    pageShellsForVerification(localeConfig, root).forEach((shell) => {
        assert(shell.exists, shell.file + ' 页面壳不存在，但对应语言已启用 sitemap。');
    });
}

function verifyPlannedLocaleShellHtml(shell, locale) {
    const html = readText(shell.file);
    const htmlTag = collectTags(html, 'html')[0];
    const robots = findMetaByName(html, 'robots');
    const canonicalLinks = findHeadLinks(html, 'canonical');
    const alternateLinks = findHeadLinks(html, 'alternate');
    const plannedLocales = plannedLocaleEntries(localeConfig);

    assert(Boolean(htmlTag), shell.file + ' planned page shell is missing <html>.');
    if (htmlTag) {
        const attrs = htmlTag.attrs;
        assert(String(attrs.lang || '').toLowerCase() === locale.htmlLang.toLowerCase(),
            shell.file + ' planned page shell html lang must be "' + locale.htmlLang + '".');
        assert(!attrs.dir || String(attrs.dir).toLowerCase() === 'ltr',
            shell.file + ' planned page shell must not use a non-ltr dir.');
    }

    assert(Boolean(robots), shell.file + ' planned page shell is missing robots noindex.');
    if (robots) {
        const content = String(robots.content || '').toLowerCase();
        assert(content.indexOf('noindex') !== -1, shell.file + ' planned page shell robots must include noindex.');
        assert(content.indexOf('follow') !== -1, shell.file + ' planned page shell robots must include follow.');
    }

    plannedLocales.forEach((plannedLocale) => {
        canonicalLinks.forEach((attrs) => {
            assert(!urlUsesLocalePrefix(attrs.href, plannedLocale),
                shell.file + ' planned page shell canonical must not point to planned locale path: ' + attrs.href + '.');
        });

        alternateLinks.forEach((attrs) => {
            assert(String(attrs.hreflang || '').toLowerCase() !== plannedLocale.hreflang.toLowerCase(),
                shell.file + ' planned page shell must not include hreflang="' + plannedLocale.hreflang + '".');
            assert(!urlUsesLocalePrefix(attrs.href, plannedLocale),
                shell.file + ' planned page shell alternate must not point to planned locale path: ' + attrs.href + '.');
        });
    });
}

function verifyPlannedLocaleModelIsolation() {
    const plannedLocales = plannedLocaleEntries(localeConfig);
    const activeLocaleCodes = allLocaleEntries(localeConfig).map((locale) => locale.code);
    const sitemapLocaleCodes = sitemapLocales.map((locale) => locale.code);
    const activeShells = pageShellsForVerification(localeConfig, root);
    const plannedShells = plannedPageShellsForVerification(localeConfig, root);

    plannedLocales.forEach((locale) => {
        assert(locale.includeInSitemap === false, 'planned locale ' + locale.code + ' 必须保持 includeInSitemap=false。');
        assert(!locale.fallbackLocale || activeLocaleCodes.indexOf(locale.fallbackLocale) !== -1,
            'planned locale ' + locale.code + ' 的 fallbackLocale 必须指向已启用语言。');
        assert(activeLocaleCodes.indexOf(locale.code) === -1, 'planned locale ' + locale.code + ' 不应进入 active locale helper。');
        assert(sitemapLocaleCodes.indexOf(locale.code) === -1, 'planned locale ' + locale.code + ' 不应进入 sitemap locale helper。');
        assert(sitemapAlternateLanguages.indexOf(locale.hreflang) === -1,
            'planned locale ' + locale.code + ' 不应进入 sitemap alternate 语言集合。');
        staticPages.forEach((page) => {
            assert(page.locale !== locale.code, 'staticPagesForSitemap() 不应输出 planned locale：' + locale.code + '。');
            assert(page.hreflang !== locale.hreflang, 'staticPagesForSitemap() 不应输出 planned hreflang：' + locale.hreflang + '。');
            assert(!pathUsesLocalePrefix(page.path, locale), 'staticPagesForSitemap() 不应输出 planned 路径：' + page.path + '。');
            assert(!relativeFileUsesLocalePrefix(page.file, locale), 'staticPagesForSitemap() 不应输出 planned 文件：' + page.file + '。');
        });

        activeShells.forEach((shell) => {
            assert(shell.locale !== locale.code, 'pageShellsForVerification() active 输出不应包含 planned locale：' + locale.code + '。');
            assert(!pathUsesLocalePrefix(shell.path, locale), 'pageShellsForVerification() active 输出不应包含 planned 路径：' + shell.path + '。');
            assert(!relativeFileUsesLocalePrefix(shell.file, locale), 'pageShellsForVerification() active 输出不应包含 planned 文件：' + shell.file + '。');
        });

        htmlPages.forEach((page) => {
            assert(!relativeFileUsesLocalePrefix(page.file, locale), 'htmlPagesForVerification() 不应输出 planned 文件：' + page.file + '。');
            assert(!pathUsesLocalePrefix(page.canonicalPath, locale), 'htmlPagesForVerification() 不应输出 planned canonical：' + page.canonicalPath + '。');
            if (page.alternates) {
                Object.keys(page.alternates).forEach((lang) => {
                    assert(lang !== locale.hreflang, 'htmlPagesForVerification() 不应输出 planned hreflang：' + lang + '。');
                    assert(!pathUsesLocalePrefix(page.alternates[lang], locale),
                        'htmlPagesForVerification() 不应输出 planned alternate：' + page.alternates[lang] + '。');
                });
            }
        });

        const localeShells = plannedShells.filter((shell) => shell.locale === locale.code);
        assert(localeShells.length > 0, 'planned locale ' + locale.code + ' 缺少未来页面壳枚举 helper 输出。');
        localeShells.forEach((shell) => {
            assert(relativeFileUsesLocalePrefix(shell.file, locale),
                'planned locale ' + locale.code + ' 的未来页面壳文件路径应带语言目录：' + shell.file + '。');
            assert(pathUsesLocalePrefix(shell.path, locale),
                'planned locale ' + locale.code + ' 的未来页面壳公开路径应带语言前缀：' + shell.path + '。');
            if (plannedLocaleDirectoryExists(locale)) {
                assert(shell.exists, 'planned locale ' + locale.code + ' directory exists, so page shell is required: ' + shell.file + '.');
                if (shell.exists) verifyPlannedLocaleShellHtml(shell, locale);
            } else {
                assert(!shell.exists, 'planned locale ' + locale.code + ' page shell exists without its directory: ' + shell.file + '.');
            }
        });
    });
}

function buildUrl(pathname) {
    return siteOrigin + pathname;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasText(value) {
    return typeof value === 'string' && value.replace(/&nbsp;/gi, ' ').trim().length > 0;
}

function stripTags(value) {
    return String(value || '')
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();
}

function parseAttributes(source) {
    const attrs = {};
    const attrPattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;

    while ((match = attrPattern.exec(source || '')) !== null) {
        const name = match[1].toLowerCase();
        const value = match[2] != null ? match[2] : (match[3] != null ? match[3] : (match[4] != null ? match[4] : ''));
        attrs[name] = value.trim();
    }

    return attrs;
}

function collectTags(source, tagName) {
    const tags = [];
    const pattern = new RegExp('<\\s*' + escapeRegExp(tagName) + '\\b([^>]*)>', 'gi');
    let match;

    while ((match = pattern.exec(source || '')) !== null) {
        tags.push({
            raw: match[0],
            attrs: parseAttributes(match[1])
        });
    }

    return tags;
}

function collectElementContents(source, tagName) {
    const contents = [];
    const pattern = new RegExp('<\\s*' + escapeRegExp(tagName) + '\\b[^>]*>([\\s\\S]*?)<\\s*/\\s*' + escapeRegExp(tagName) + '\\s*>', 'gi');
    let match;

    while ((match = pattern.exec(source || '')) !== null) {
        contents.push(match[1]);
    }

    return contents;
}

function firstElementText(source, tagName) {
    const contents = collectElementContents(source, tagName);
    return contents.length ? stripTags(contents[0]) : '';
}

function relTokens(attrs) {
    return String(attrs.rel || '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
}

function hasRel(attrs, rel) {
    return relTokens(attrs).indexOf(rel.toLowerCase()) !== -1;
}

function findMetaByName(html, name) {
    const expected = name.toLowerCase();
    return collectTags(html, 'meta')
        .map((tag) => tag.attrs)
        .find((attrs) => String(attrs.name || '').toLowerCase() === expected);
}

function findHeadLinks(html, rel) {
    return collectTags(html, 'link')
        .map((tag) => tag.attrs)
        .filter((attrs) => hasRel(attrs, rel));
}

function verifyPlannedLocalesNotInStaticHeadLinks() {
    const plannedLocales = plannedLocaleEntries(localeConfig);

    htmlPages.forEach((page) => {
        if (!fileExists(page.file)) return;

        const html = readText(page.file);
        const canonicalLinks = findHeadLinks(html, 'canonical');
        const alternateLinks = findHeadLinks(html, 'alternate');

        plannedLocales.forEach((locale) => {
            canonicalLinks.forEach((attrs) => {
                assert(!urlUsesLocalePrefix(attrs.href, locale),
                    page.file + ' 的 canonical 不应指向 planned locale 路径：' + attrs.href + '。');
            });

            alternateLinks.forEach((attrs) => {
                assert(String(attrs.hreflang || '').toLowerCase() !== locale.hreflang.toLowerCase(),
                    page.file + ' 不应包含 planned locale hreflang="' + locale.hreflang + '"。');
                assert(!urlUsesLocalePrefix(attrs.href, locale),
                    page.file + ' 的 alternate 不应指向 planned locale 路径：' + attrs.href + '。');
            });
        });
    });
}

function verifyHtmlPage(page) {
    assert(fileExists(page.file), page.file + ' 文件不存在，但对应语言已启用 sitemap。');
    if (!fileExists(page.file)) return;

    const html = readText(page.file);
    const htmlTag = collectTags(html, 'html')[0];
    const title = firstElementText(html, 'title');
    const description = findMetaByName(html, 'description');
    const canonicalLinks = findHeadLinks(html, 'canonical');
    const alternateLinks = findHeadLinks(html, 'alternate');
    const h1Texts = collectElementContents(html, 'h1').map(stripTags).filter(hasText);

    assert(Boolean(htmlTag), page.file + ' 缺少 <html> 标签。');
    if (htmlTag) {
        const attrs = htmlTag.attrs;
        assert(String(attrs.lang || '').toLowerCase() === page.lang, page.file + ' 的 html lang 应为 "' + page.lang + '"。');
        if (page.dir && page.dir.toLowerCase() !== 'ltr') {
            assert(String(attrs.dir || '').toLowerCase() === page.dir, page.file + ' 的 html dir 应为 "' + page.dir + '"。');
        } else {
            assert(!attrs.dir || String(attrs.dir).toLowerCase() === 'ltr', page.file + ' 不应设置非 ltr 的 dir。');
        }
    }

    assert(hasText(title) && title.toLowerCase() !== 'longxiang', page.file + ' 缺少页面专属 title。');
    assert(description && hasText(description.content), page.file + ' 缺少 meta description。');

    if (page.canonicalPath) {
        assert(canonicalLinks.length === 1, page.file + ' 应包含且只包含 1 个 canonical 链接。');
        if (canonicalLinks.length === 1) {
            assert(canonicalLinks[0].href === buildUrl(page.canonicalPath), page.file + ' canonical href 应为 ' + buildUrl(page.canonicalPath) + '。');
        }
    }

    if (page.alternates) {
        Object.keys(page.alternates).forEach((lang) => {
            const expectedHref = buildUrl(page.alternates[lang]);
            const link = alternateLinks.find((attrs) => String(attrs.hreflang || '').toLowerCase() === lang);

            assert(Boolean(link), page.file + ' 缺少 hreflang="' + lang + '" 的静态 alternate。');
            if (link) {
                assert(link.href === expectedHref, page.file + ' 的 hreflang="' + lang + '" href 应为 ' + expectedHref + '。');
            }
        });
    }

    assert(h1Texts.length > 0, page.file + ' 缺少可读的 H1 fallback 文案。');
}

function collectUpsertHeadLinkObjects(source, rel) {
    const objects = [];
    const pattern = new RegExp('upsertHeadLink\\s*\\(\\s*[\'"]' + escapeRegExp(rel) + '[\'"]\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*\\)', 'g');
    let match;

    while ((match = pattern.exec(source || '')) !== null) {
        objects.push(match[1]);
    }

    return objects;
}

function hasStringProperty(objectSource, key, value) {
    const pattern = new RegExp('(?:^|[,\\s])' + escapeRegExp(key) + '\\s*:\\s*[\'"]' + escapeRegExp(value) + '[\'"](?:\\s|,|$)');
    return pattern.test(objectSource || '');
}

function hasIdentifierProperty(objectSource, key, value) {
    const pattern = new RegExp('(?:^|[,\\s])' + escapeRegExp(key) + '\\s*:\\s*' + escapeRegExp(value) + '\\b');
    return pattern.test(objectSource || '');
}

function verifyProductDetailJs() {
    const source = readText('js/product-detail.js');
    const canonicalObjects = collectUpsertHeadLinkObjects(source, 'canonical');
    assert(/function\s+productCanonicalUrls\s*\(/.test(source), 'js/product-detail.js 缺少动态 productCanonicalUrls()。');
    assert(canonicalObjects.some((objectSource) => hasIdentifierProperty(objectSource, 'href', 'canonicalUrl')), 'js/product-detail.js 缺少写入 canonicalUrl 的动态 canonical。');
    assert(/seoLocales\s*\(/.test(source), 'js/product-detail.js 应使用 LongxiangI18n.seoLocales() 生成产品详情 alternate。');
    assert(/entries\.forEach\s*\(/.test(source), 'js/product-detail.js 应按语言列表循环写入产品详情 alternate。');
    assert(/hreflang\s*:\s*entry\.hreflang/.test(source), 'js/product-detail.js 的产品详情 alternate 应使用语言配置 hreflang。');
    assert(/href\s*:\s*urls\[entry\.code\]/.test(source), 'js/product-detail.js 的产品详情 alternate 应使用语言代码 URL map。');
    assert(/hreflang\s*:\s*['"]x-default['"]\s*,\s*href\s*:\s*urls\[defaultLocale\]/.test(source), 'js/product-detail.js 应把 x-default 指向默认语言产品 URL。');
    assert(/upsertMeta\s*\(\s*['"][^'"]*['"]\s*,\s*['"]og:type['"]\s*,\s*['"]product['"]\s*\)/.test(source), 'js/product-detail.js 缺少 og:type product。');
}

function assertSourceContains(source, pattern, message) {
    assert(pattern.test(source), message);
}

function assertSourceNotContains(source, pattern, message) {
    assert(!pattern.test(source), message);
}

function functionSource(source, name) {
    const pattern = new RegExp('function\\s+' + escapeRegExp(name) + '\\s*\\([^)]*\\)\\s*\\{');
    const match = pattern.exec(source || '');
    if (!match) return '';

    let depth = 0;
    for (let index = match.index; index < source.length; index += 1) {
        const char = source[index];
        if (char === '{') depth += 1;
        if (char === '}') {
            depth -= 1;
            if (depth === 0) return source.slice(match.index, index + 1);
        }
    }

    return source.slice(match.index);
}

function verifyFrontendPlannedLocaleRuntimeSeoGuards(source) {
    const expectedPrefixes = plannedLocalePathPrefixes();
    const actualPrefixes = extractFrontendPlannedLocalePathPrefixes();
    const basePathSource = functionSource(source, 'baseStaticPathFromLocalizedPath');
    const alternateSource = functionSource(source, 'injectAlternateSeoLinks');

    assertArrayEqual(actualPrefixes, expectedPrefixes, 'js/main.js PLANNED_LOCALE_PATH_PREFIXES must match config/locales.json plannedLocales pathPrefix values.');
    assertSourceContains(source, /function\s+plannedLocalePathInfo\s*\(/, 'js/main.js is missing plannedLocalePathInfo().');
    assertSourceContains(source, /function\s+isPlannedLocalePath\s*\(/, 'js/main.js is missing isPlannedLocalePath().');
    assertSourceContains(basePathSource, /plannedLocalePathInfo\s*\(/, 'js/main.js baseStaticPathFromLocalizedPath() must normalize planned locale paths first.');
    assertSourceContains(alternateSource, /plannedLocalePathInfo\s*\(/, 'js/main.js injectAlternateSeoLinks() must detect planned locale paths.');
    assertSourceContains(alternateSource, /canonicalUrl/, 'js/main.js injectAlternateSeoLinks() must compute a guarded canonicalUrl.');
    assertSourceContains(alternateSource, /href\s*:\s*canonicalUrl/, 'js/main.js injectAlternateSeoLinks() must write canonicalUrl to canonical.');
    assertSourceContains(alternateSource, /defaultPath/, 'js/main.js injectAlternateSeoLinks() must use default locale path for planned canonical fallback.');
    assertSourceNotContains(alternateSource, /upsertLink\s*\(\s*['"]canonical['"]\s*,\s*\{\s*href\s*:\s*currentUrl\s*\}\s*\)/,
        'js/main.js injectAlternateSeoLinks() must not write currentUrl directly to canonical.');
}

function verifyFrontendRuntimeI18nJs() {
    const source = readText('js/main.js');

    [
        'localeEntry',
        'localeEntries',
        'currentLocaleEntry',
        'localizedStaticPath',
        'localizedProductPath',
        'baseStaticPathFromLocalizedPath',
        'plannedLocalePathInfo',
        'isPlannedLocalePath',
        'productIdentifierFromLocalizedPath',
        'seoLocales'
    ].forEach((name) => {
        assertSourceContains(source, new RegExp('\\b' + name + '\\b'), 'js/main.js 缺少运行时 i18n helper：' + name + '。');
    });

    assertSourceNotContains(source, /return\s+path\s*===\s*['"]\/ar['"]\s*\|\|\s*path\.indexOf\(['"]\/ar\/['"]\)\s*===\s*0\s*\?\s*['"]ar['"]/, 'js/main.js 的 inferLocaleFromPath() 仍写死 /ar。');
    assertSourceNotContains(source, /lang\s*===\s*['"]ar['"]\s*\?\s*['"]\/ar\/products\/['"]\s*:\s*['"]\/products\/['"]/, 'js/main.js 的 languageUrl() 仍写死产品详情语言路径。');
    assertSourceNotContains(source, /<option value="en">English<\/option>\s*['"]\s*\+\s*['"]<option value="ar">/, 'js/main.js 的语言选择器仍写死 en/ar option。');
    assertSourceNotContains(source, /var\s+detail\s*=\s*\(isArabic\s*\?\s*['"]\/ar\/products\/['"]\s*:\s*['"]\/products\/['"]\)/, 'js/main.js 首页产品详情链接仍写死 en/ar。');

    const alternateSource = functionSource(source, 'injectAlternateSeoLinks');
    assertSourceContains(alternateSource, /seoLocales\s*\(/, 'js/main.js 的 injectAlternateSeoLinks() 应使用 LongxiangI18n.seoLocales()。');
    assertSourceContains(alternateSource, /baseStaticPathFromLocalizedPath\s*\(/, 'js/main.js 的 injectAlternateSeoLinks() 应从当前路径计算基础静态路径。');
    assertSourceContains(alternateSource, /localizedStaticPath\s*\(/, 'js/main.js 的 injectAlternateSeoLinks() 应使用 localizedStaticPath() 生成静态页 alternate。');
    assertSourceNotContains(alternateSource, /hreflang\s*:\s*['"]en['"]/, 'js/main.js 的 injectAlternateSeoLinks() 仍写死 hreflang=en。');
    assertSourceNotContains(alternateSource, /hreflang\s*:\s*['"]ar['"]/, 'js/main.js 的 injectAlternateSeoLinks() 仍写死 hreflang=ar。');
    verifyFrontendPlannedLocaleRuntimeSeoGuards(source);
}

function verifyProductListRuntimeI18nJs() {
    const source = readText('js/products-list.js');
    assertSourceContains(source, /localizedProductPath\s*\(/, 'js/products-list.js 应使用 LongxiangI18n.localizedProductPath() 生成产品详情链接。');
}

function verifyContentPagesRuntimeSeoJs() {
    const source = readText('js/content-pages.js');
    assertSourceContains(source, /seoLocales\s*\(/, 'js/content-pages.js 应按 LongxiangI18n.seoLocales() 生成 alternate。');
    assertSourceNotContains(source, /paths\.en/, 'js/content-pages.js 的 alternate 仍直接使用 paths.en。');
    assertSourceNotContains(source, /paths\.ar/, 'js/content-pages.js 的 alternate 仍直接使用 paths.ar。');
}

function verifyEducationCompareRuntimeI18nJs() {
    const educationSource = readText('js/education.js');
    const compareSource = readText('js/compare.js');
    const educationCanonicalSource = functionSource(educationSource, 'setCanonicalLink');

    assertSourceContains(educationSource, /LongxiangI18n\.currentLocale\s*\(/, 'js/education.js 应优先使用 LongxiangI18n.currentLocale() 识别语言。');
    assertSourceContains(compareSource, /LongxiangI18n\.currentLocale\s*\(/, 'js/compare.js 应优先使用 LongxiangI18n.currentLocale() 识别语言。');
    assertSourceContains(educationCanonicalSource, /baseStaticPathFromLocalizedPath\s*\(/, 'js/education.js 的 canonical 应使用 baseStaticPathFromLocalizedPath() 计算基础路径。');
    assertSourceContains(educationCanonicalSource, /localizedStaticPath\s*\(/, 'js/education.js 的 canonical 应使用 localizedStaticPath() 生成当前语言路径。');
    assertSourceNotContains(educationCanonicalSource, /isArabic\s*&&\s*canonicalPath\s*===\s*['"]education\.html['"]\)\s*canonicalPath\s*=/, 'js/education.js 的 canonical 仍只通过 isArabic 特判生成阿语路径。');
}

function verifyServerI18nRoutesJs() {
    const appSource = readText('server/app.js');
    assertSourceContains(appSource, /require\(['"]\.\/lib\/i18nRoutes['"]\)/, 'server/app.js 应导入 server/lib/i18nRoutes.js。');
    assertSourceContains(appSource, /productDetailRoutePatterns\s*\(\s*\)/, 'server/app.js 应使用 productDetailRoutePatterns() 注册产品详情路由。');
    assertSourceContains(appSource, /notFoundShellForRequestPath\s*\(/, 'server/app.js 应使用 notFoundShellForRequestPath() 处理 404 页面壳。');
    assertSourceNotContains(appSource, /app\.get\(\s*\[\s*['"]\/products\/:slug['"]\s*,\s*['"]\/ar\/products\/:slug['"]\s*\]/, 'server/app.js 仍写死 en/ar 产品详情路由数组。');
    assertSourceNotContains(functionSource(appSource, 'sendNotFoundShell'), /\/ar\//, 'server/app.js 的 sendNotFoundShell() 仍写死 /ar/ 语言判断。');

    assert(fileExists('server/lib/i18nRoutes.js'), '缺少 server/lib/i18nRoutes.js。');
    if (fileExists('server/lib/i18nRoutes.js')) {
        const routeSource = readText('server/lib/i18nRoutes.js');
        ['localeEntries', 'localeForRequestPath', 'localizedHtmlShellPath', 'baseHrefForLocale', 'notFoundShellForRequestPath', 'productDetailRoutePatterns'].forEach((name) => {
            assertSourceContains(routeSource, new RegExp('\\b' + name + '\\b'), 'server/lib/i18nRoutes.js 缺少函数：' + name + '。');
        });
        assertSourceContains(functionSource(routeSource, 'notFoundShellForRequestPath'), /localeForRequestPath\s*\(/, 'server/lib/i18nRoutes.js 的 404 helper 应按请求路径识别语言。');
        assertSourceContains(functionSource(routeSource, 'notFoundShellForRequestPath'), /fs\.existsSync\s*\(/, 'server/lib/i18nRoutes.js 的 404 helper 应检查页面壳是否存在。');
    }
}

function verifyPendingRuntimeHardcodingWarnings() {
    const mainSource = readText('js/main.js');
    const appSource = readText('server/app.js');
    const educationSource = readText('js/education.js');
    const compareSource = readText('js/compare.js');

    if (/function\s+injectAlternateSeoLinks\s*\([^)]*\)\s*\{[\s\S]*?\bhreflang\s*:\s*['"]en['"][\s\S]*?\bhreflang\s*:\s*['"]ar['"]/.test(mainSource)) {
        warn('js/main.js 的 injectAlternateSeoLinks() 仍存在固定 en/ar alternate 输出，Stage B1 需要泛化。');
    }

    if (/function\s+sendNotFoundShell\s*\([^)]*\)\s*\{[\s\S]*?req\.path\.indexOf\(['"]\/ar\/['"]\)/.test(appSource)) {
        warn('server/app.js 的 sendNotFoundShell() 仍存在固定 /ar/ 404 语言判断，Stage B1 需要泛化。');
    }

    if (!/LongxiangI18n\.currentLocale\s*\(/.test(educationSource) && /\/\\\/ar\\\//.test(educationSource)) {
        warn('js/education.js 仍完全依赖 /ar/ 推断语言，Stage B2 需要泛化。');
    }

    if (!/LongxiangI18n\.currentLocale\s*\(/.test(compareSource) && /\/\\\/ar\\\//.test(compareSource)) {
        warn('js/compare.js 仍完全依赖 /ar/ 推断语言，Stage B2 需要泛化。');
    }
}

function parseSitemapUrl(value) {
    try {
        return new URL(value);
    } catch (err) {
        return null;
    }
}

function hasInvalidSitemapPath(pathname) {
    if (pathname.indexOf('//') !== -1) return true;

    return sitemapLocales.some((locale) => {
        return locale.pathPrefix
            && (pathname === locale.pathPrefix + locale.pathPrefix
                || pathname.indexOf(locale.pathPrefix + locale.pathPrefix + '/') !== -1);
    });
}

function sitemapPathFromUrl(value, label) {
    const parsed = parseSitemapUrl(value);

    assert(Boolean(parsed), 'sitemap.xml 的 ' + label + ' 不是有效绝对 URL：' + value + '。');
    if (!parsed) return null;

    assert(parsed.origin === siteOrigin, 'sitemap.xml 的 ' + label + ' 必须同源 ' + siteOrigin + '，当前为 ' + value + '。');
    assert(!hasInvalidSitemapPath(parsed.pathname), 'sitemap.xml 的 ' + label + ' 包含异常路径：' + value + '。');

    return parsed.pathname || '/';
}

function expectedSitemapAlternates(pathname) {
    const productMatch = sitemapLocales.reduce((match, locale) => {
        if (match) return match;
        const productPrefix = locale.pathPrefix + '/products/';
        return pathname.indexOf(productPrefix) === 0
            ? pathname.slice(productPrefix.length)
            : '';
    }, '');

    if (productMatch) {
        return sitemapLocales.reduce((acc, locale) => {
            acc[locale.hreflang] = buildUrl(localizedProductPath(productMatch, locale));
            return acc;
        }, {
            'x-default': buildUrl(localizedProductPath(productMatch, defaultLocale))
        });
    }

    const matchedLocale = sitemapLocales.find((locale) => pathname === locale.homePath)
        || sitemapLocales.find((locale) => locale.pathPrefix && pathname.indexOf(locale.pathPrefix + '/') === 0)
        || defaultLocale;
    const basePath = pathname === matchedLocale.homePath
        ? '/'
        : (matchedLocale.pathPrefix && pathname.indexOf(matchedLocale.pathPrefix + '/') === 0
            ? '/' + pathname.slice(matchedLocale.pathPrefix.length + 1)
            : pathname);

    return sitemapLocales.reduce((acc, locale) => {
        acc[locale.hreflang] = buildUrl(localizedStaticPath(basePath, locale));
        return acc;
    }, {
        'x-default': buildUrl(localizedStaticPath(basePath, defaultLocale))
    });
}

function verifySitemapAlternateSet(loc, alternateLinks) {
    const locPath = sitemapPathFromUrl(loc, 'loc');
    const expectedAlternates = locPath ? expectedSitemapAlternates(locPath) : null;
    const alternatesByLanguage = {};

    assert(alternateLinks.length === sitemapAlternateLanguages.length, 'sitemap.xml 的 ' + loc + ' 必须正好包含 '
        + sitemapAlternateLanguages.join('/') + ' 共 ' + sitemapAlternateLanguages.length + ' 个 alternate。');

    alternateLinks.forEach((attrs) => {
        const lang = String(attrs.hreflang || '').toLowerCase();
        const href = String(attrs.href || '').trim();

        assert(sitemapAlternateLanguages.indexOf(lang) !== -1, 'sitemap.xml 的 ' + loc + ' 包含不允许的 hreflang="' + lang + '"。');
        if (sitemapAlternateLanguages.indexOf(lang) !== -1) {
            assert(!alternatesByLanguage[lang], 'sitemap.xml 的 ' + loc + ' 重复 hreflang="' + lang + '"。');
            if (!alternatesByLanguage[lang]) {
                alternatesByLanguage[lang] = attrs;
            }
        }

        assert(hasText(href), 'sitemap.xml 的 ' + loc + ' 存在空 alternate href。');
        if (hasText(href)) {
            sitemapPathFromUrl(href, 'hreflang="' + (lang || '?') + '" href');
        }
    });

    sitemapAlternateLanguages.forEach((lang) => {
        const alternate = alternatesByLanguage[lang];
        assert(Boolean(alternate), 'sitemap.xml 的 ' + loc + ' 缺少 hreflang="' + lang + '"。');

        if (alternate && expectedAlternates) {
            assert(alternate.href === expectedAlternates[lang], 'sitemap.xml 的 ' + loc + ' hreflang="' + lang + '" href 应为 ' + expectedAlternates[lang] + '。');
        }
    });
}

function verifySitemap() {
    const xml = readText('sitemap.xml');
    const urlsetTag = collectTags(xml, 'urlset')[0];

    assert(Boolean(urlsetTag), 'sitemap.xml 缺少 <urlset>。');
    if (urlsetTag) {
        assert(urlsetTag.attrs.xmlns === sitemapNamespace, 'sitemap.xml 缺少默认 sitemap namespace。');
        assert(urlsetTag.attrs['xmlns:xhtml'] === xhtmlNamespace, 'sitemap.xml 缺少 xhtml namespace。');
    }

    const urlEntries = collectElementContents(xml, 'url');
    assert(urlEntries.length > 0, 'sitemap.xml 缺少 url 条目。');
    assert(urlEntries.length === expectedSitemapUrlCount,
        'sitemap.xml URL count 应保持 ' + expectedSitemapUrlCount + '，当前为 ' + urlEntries.length + '。');

    urlEntries.forEach((entry, index) => {
        const loc = firstElementText(entry, 'loc');
        const locLabel = loc || '第 ' + (index + 1) + ' 个 url';
        const alternateLinks = collectTags(entry, 'xhtml:link')
            .map((tag) => tag.attrs)
            .filter((attrs) => hasRel(attrs, 'alternate'));

        assert(hasText(loc), 'sitemap.xml 的 ' + locLabel + ' 缺少 loc。');
        if (hasText(loc)) {
            verifySitemapAlternateSet(loc, alternateLinks);
        }
    });
}

function verifyGeneratedSitemapDryRunGuards() {
    let generatedXml = '';

    try {
        generatedXml = require('./generate-sitemap').buildSitemap();
    } catch (err) {
        fail('generate-sitemap dry-run 校验无法生成 sitemap：' + err.message);
        return;
    }

    const urlEntries = collectElementContents(generatedXml, 'url');
    assert(urlEntries.length === expectedSitemapUrlCount,
        'generate-sitemap dry-run URL count 应保持 ' + expectedSitemapUrlCount + '，当前为 ' + urlEntries.length + '。');

    plannedLocaleEntries(localeConfig).forEach((locale) => {
        assertXmlExcludesPlannedLocale(generatedXml, 'generate-sitemap dry-run 输出', locale);
    });
}

function verifyDisabledLocalesNotInSitemap() {
    const xml = readText('sitemap.xml');
    allLocaleEntries(localeConfig)
        .filter((locale) => !locale.includeInSitemap && locale.pathPrefix)
        .forEach((locale) => {
            assert(xml.indexOf(siteOrigin + locale.pathPrefix + '/') === -1,
                'sitemap.xml 不应包含 includeInSitemap=false 的语言路径前缀：' + locale.pathPrefix + '。');
        });
}

function parseRobotsDirectives(source) {
    return source.split(/\r?\n/)
        .map((line) => line.replace(/#.*/, '').trim())
        .filter(Boolean)
        .map((line) => {
            const separator = line.indexOf(':');
            if (separator < 0) return null;

            return {
                key: line.slice(0, separator).trim().toLowerCase(),
                value: line.slice(separator + 1).trim()
            };
        })
        .filter(Boolean);
}

function hasDirective(directives, key, value) {
    const normalizedKey = key.toLowerCase();
    return directives.some((directive) => directive.key === normalizedKey && directive.value === value);
}

function verifyRobots() {
    const directives = parseRobotsDirectives(readText('robots.txt'));

    assert(hasDirective(directives, 'User-agent', '*'), 'robots.txt 缺少 User-agent: *。');
    assert(hasDirective(directives, 'Allow', '/'), 'robots.txt 缺少 Allow: /。');
    ['/admin/', '/api/admin/', '/api/auth/'].forEach((rule) => {
        assert(hasDirective(directives, 'Disallow', rule), 'robots.txt 缺少 Disallow: ' + rule + '。');
    });
    assert(hasDirective(directives, 'Sitemap', buildUrl('/sitemap.xml')), 'robots.txt 缺少正确的 Sitemap 指向。');
}

function main() {
    verifyFrontendLocaleConfigSync();
    verifyPageShellFiles();
    verifyPlannedLocaleModelIsolation();
    verifyPlannedLocalesNotInStaticHeadLinks();
    htmlPages.forEach(verifyHtmlPage);
    verifyProductDetailJs();
    verifyFrontendRuntimeI18nJs();
    verifyProductListRuntimeI18nJs();
    verifyContentPagesRuntimeSeoJs();
    verifyEducationCompareRuntimeI18nJs();
    verifyServerI18nRoutesJs();
    verifyPendingRuntimeHardcodingWarnings();
    verifySitemap();
    verifyGeneratedSitemapDryRunGuards();
    verifyDisabledLocalesNotInSitemap();
    verifyRobots();

    if (warnings.length) {
        console.warn('SEO i18n 校验警告：');
        warnings.forEach((message) => console.warn('- ' + message));
    }

    if (failures.length) {
        console.error('SEO i18n 校验失败：');
        failures.forEach((message) => console.error('- ' + message));
        process.exit(1);
    }

    console.log('SEO i18n 校验通过。');
}

if (require.main === module) {
    main();
}
