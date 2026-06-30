const fs = require('fs');
const path = require('path');
const {
    loadLocaleConfig,
    localeEntry,
    allLocaleEntries,
    sitemapLocaleEntries,
    localizedStaticPath,
    localizedProductPath,
    htmlPagesForVerification
} = require('./i18n-page-model');

const root = path.resolve(__dirname, '..');
const siteOrigin = 'https://www.lxenelectric.com';
const sitemapNamespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const xhtmlNamespace = 'http://www.w3.org/1999/xhtml';
const failures = [];

const localeConfig = loadLocaleConfig(path.join(root, 'config', 'locales.json'));
const sitemapLocales = sitemapLocaleEntries(localeConfig);
const defaultLocale = localeEntry(localeConfig, localeConfig.defaultLocale);
const sitemapAlternateLanguages = sitemapLocales.map((locale) => locale.hreflang).concat(['x-default']);
const htmlPages = htmlPagesForVerification(localeConfig);

function fail(message) {
    failures.push(message);
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
    const alternateObjects = collectUpsertHeadLinkObjects(source, 'alternate');

    assert(/function\s+productCanonicalUrls\s*\(/.test(source), 'js/product-detail.js 缺少动态 productCanonicalUrls()。');
    assert(canonicalObjects.some((objectSource) => hasIdentifierProperty(objectSource, 'href', 'canonicalUrl')), 'js/product-detail.js 缺少写入 canonicalUrl 的动态 canonical。');

    sitemapLocales.map((locale) => ({
        lang: locale.hreflang,
        href: 'urls.' + locale.code
    })).concat([{
        lang: 'x-default',
        href: 'urls.' + defaultLocale.code
    }]).forEach((expected) => {
        const found = alternateObjects.some((objectSource) => (
            hasStringProperty(objectSource, 'hreflang', expected.lang)
            && hasIdentifierProperty(objectSource, 'href', expected.href)
        ));

        assert(found, 'js/product-detail.js 缺少 hreflang="' + expected.lang + '" 的动态 alternate。');
    });

    assert(/upsertMeta\s*\(\s*['"][^'"]*['"]\s*,\s*['"]og:type['"]\s*,\s*['"]product['"]\s*\)/.test(source), 'js/product-detail.js 缺少 og:type product。');
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
    htmlPages.forEach(verifyHtmlPage);
    verifyProductDetailJs();
    verifySitemap();
    verifyDisabledLocalesNotInSitemap();
    verifyRobots();

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
