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
const { expectedSitemapUrlCount } = require('./sitemap-count-model');

const root = path.resolve(__dirname, '..');
const siteOrigin = 'https://www.lxenelectric.com';
const sitemapNamespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const xhtmlNamespace = 'http://www.w3.org/1999/xhtml';
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
const sitemapCountModel = expectedSitemapUrlCount({ localeConfig });
const expectedPlannedLocales = {
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
    }
};
const localizedStaticShellExpectations = {
    fr: {
        'index.html': {
            title: "Fabricant de transformateurs et d'appareillages | Longxiang",
            description: "Longxiang Electrical fabrique des transformateurs, appareillages, bornes de recharge EV et systèmes de stockage d'énergie pour les projets industriels et d'énergies renouvelables."
        },
        'about.html': {
            title: 'À propos | Henan Longxiang Electrical Co., Ltd.',
            description: "Découvrez Henan Longxiang Electrical, fabricant high-tech coté d'équipements intelligents et bas carbone pour la distribution électrique."
        },
        'products.html': {
            title: 'Transformateurs, appareillages et bornes EV | Longxiang',
            description: "Parcourez les transformateurs, appareillages, bornes de recharge EV, systèmes de stockage et équipements PV Longxiang pour projets industriels et énergétiques."
        },
        'solutions.html': {
            title: 'Solutions de distribution électrique | Henan Longxiang Electrical',
            description: "Solutions Longxiang pour transformateurs, appareillages, recharge EV, solaire PV, stockage, micro-réseaux, EPC et maintenance de lignes électriques."
        },
        'education.html': {
            title: 'Coopération éducative | Henan Longxiang Electrical Co., Ltd.',
            description: "Programmes de coopération école-entreprise Longxiang pour collèges industriels, formation des talents, équipements pédagogiques et coopération internationale."
        },
        'certifications.html': {
            title: 'Certificats | Henan Longxiang Electrical Co., Ltd.',
            description: 'Certificats, qualifications, brevets et rapports d’essai de Henan Longxiang Electrical pour la revue technique et fournisseur.'
        },
        'compare.html': {
            title: 'Comparaison de produits | Henan Longxiang Electrical Co., Ltd.',
            description: 'Comparez côte à côte les modèles Longxiang sélectionnés et leurs principales spécifications techniques.'
        },
        'contact.html': {
            title: 'Contactez-nous | Henan Longxiang Electrical Co., Ltd.',
            description: "Contactez Henan Longxiang Electrical pour devis, sélection technique et support de projet sur transformateurs, appareillages, bornes EV et distribution électrique."
        }
    },
    ru: {
        'index.html': {
            title: 'Производитель трансформаторов и КРУ | Longxiang',
            description: 'Longxiang Electrical производит трансформаторы, распределительные устройства, зарядные станции EV и системы накопления энергии для промышленных и энергетических проектов.'
        },
        'about.html': {
            title: 'О компании | Henan Longxiang Electrical Co., Ltd.',
            description: 'О Henan Longxiang Electrical: высокотехнологичный производитель интеллектуального низкоуглеродного оборудования для распределения электроэнергии.'
        },
        'products.html': {
            title: 'Трансформаторы, КРУ и зарядные станции EV | Longxiang',
            description: 'Каталог трансформаторов, распределительных устройств, зарядных станций EV, систем накопления энергии и PV-оборудования Longxiang.'
        },
        'solutions.html': {
            title: 'Решения для электроснабжения | Henan Longxiang Electrical',
            description: 'Решения Longxiang для трансформаторов, распределительных устройств, зарядки EV, солнечной энергетики, накопителей, микросетей, EPC и обслуживания линий.'
        },
        'education.html': {
            title: 'Образовательное сотрудничество | Henan Longxiang Electrical Co., Ltd.',
            description: 'Программы сотрудничества Longxiang с учебными заведениями для промышленных колледжей, подготовки специалистов, учебного оборудования и международных проектов.'
        },
        'certifications.html': {
            title: 'Сертификаты | Henan Longxiang Electrical Co., Ltd.',
            description: 'Сертификаты, квалификации, патенты и отчеты испытаний Henan Longxiang Electrical для технической проверки и оценки поставщика.'
        },
        'compare.html': {
            title: 'Сравнение продукции | Henan Longxiang Electrical Co., Ltd.',
            description: 'Сравните выбранные модели оборудования Longxiang и их основные технические характеристики.'
        },
        'contact.html': {
            title: 'Свяжитесь с нами | Henan Longxiang Electrical Co., Ltd.',
            description: 'Свяжитесь с Henan Longxiang Electrical для запроса цены, технического подбора и поддержки проектов по трансформаторам, КРУ, зарядке EV и распределению энергии.'
        }
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

    assertArrayEqual(configuredCodes, expectedCodes, 'config/locales.json plannedLocales must only contain pt.');

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

function findMetaByProperty(html, property) {
    const expected = property.toLowerCase();
    return collectTags(html, 'meta')
        .map((tag) => tag.attrs)
        .find((attrs) => String(attrs.property || '').toLowerCase() === expected);
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
    const robots = findMetaByName(html, 'robots');
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
    if (robots) {
        assert(String(robots.content || '').toLowerCase().indexOf('noindex') === -1,
            page.file + ' 已启用页面不应包含 noindex。');
    }

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

function verifyLocalizedStaticShellText() {
    staticPages
        .filter((page) => Object.prototype.hasOwnProperty.call(localizedStaticShellExpectations, page.locale))
        .forEach((page) => {
            const fileName = path.basename(page.file);
            const expected = localizedStaticShellExpectations[page.locale][fileName];
            if (!expected) return;

            assert(fileExists(page.file), page.file + ' 启用语言静态页面壳不存在。');
            if (!fileExists(page.file)) return;

            const html = readText(page.file);
            const title = firstElementText(html, 'title');
            const description = findMetaByName(html, 'description');
            const ogTitle = findMetaByProperty(html, 'og:title');
            const ogDescription = findMetaByProperty(html, 'og:description');
            const twitterTitle = findMetaByName(html, 'twitter:title');
            const twitterDescription = findMetaByName(html, 'twitter:description');
            const canonicalLinks = findHeadLinks(html, 'canonical');

            assert(title === expected.title, page.file + ' title 应为 "' + expected.title + '"，当前为 "' + title + '"。');
            assert(description && description.content === expected.description,
                page.file + ' meta description 应为 "' + expected.description + '"。');
            if (ogTitle) assert(ogTitle.content === expected.title, page.file + ' og:title 应同步为本语言 title。');
            if (ogDescription) assert(ogDescription.content === expected.description, page.file + ' og:description 应同步为本语言 description。');
            if (twitterTitle) assert(twitterTitle.content === expected.title, page.file + ' twitter:title 应同步为本语言 title。');
            if (twitterDescription) assert(twitterDescription.content === expected.description, page.file + ' twitter:description 应同步为本语言 description。');
            assert(canonicalLinks.length === 1, page.file + ' 应包含且只包含 1 个静态 canonical。');
            if (canonicalLinks.length === 1) {
                assert(canonicalLinks[0].href === buildUrl(page.path),
                    page.file + ' canonical href 应为 ' + buildUrl(page.path) + '。');
            }
        });
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
        'assetBasePrefix',
        'localizedAssetPath',
        'baseStaticPathFromLocalizedPath',
        'plannedLocalePathInfo',
        'isPlannedLocalePath',
        'productIdentifierFromLocalizedPath',
        'seoLocales',
        'normalizeContentLocale',
        'localizedPatchValue',
        'applyArrayPatch',
        'contentPatchBaseFields',
        'snakeToCamel',
        'localizeContentTree'
    ].forEach((name) => {
        assertSourceContains(source, new RegExp('\\b' + name + '\\b'), 'js/main.js 缺少运行时 i18n helper：' + name + '。');
    });

    assertSourceNotContains(source, /return\s+path\s*===\s*['"]\/ar['"]\s*\|\|\s*path\.indexOf\(['"]\/ar\/['"]\)\s*===\s*0\s*\?\s*['"]ar['"]/, 'js/main.js 的 inferLocaleFromPath() 仍写死 /ar。');
    assertSourceNotContains(source, /lang\s*===\s*['"]ar['"]\s*\?\s*['"]\/ar\/products\/['"]\s*:\s*['"]\/products\/['"]/, 'js/main.js 的 languageUrl() 仍写死产品详情语言路径。');
    assertSourceNotContains(source, /<option value="en">English<\/option>\s*['"]\s*\+\s*['"]<option value="ar">/, 'js/main.js 的语言选择器仍写死 en/ar option。');
    assertSourceNotContains(source, /var\s+detail\s*=\s*\(isArabic\s*\?\s*['"]\/ar\/products\/['"]\s*:\s*['"]\/products\/['"]\)/, 'js/main.js 首页产品详情链接仍写死 en/ar。');

    const alternateSource = functionSource(source, 'injectAlternateSeoLinks');
    const shellLabelSource = functionSource(source, 'shellLabel');
    const mergePatchSource = functionSource(source, 'mergeContentPatch');
    const localizeTreeSource = functionSource(source, 'localizeContentTree');
    assertSourceContains(alternateSource, /seoLocales\s*\(/, 'js/main.js 的 injectAlternateSeoLinks() 应使用 LongxiangI18n.seoLocales()。');
    assertSourceContains(alternateSource, /baseStaticPathFromLocalizedPath\s*\(/, 'js/main.js 的 injectAlternateSeoLinks() 应从当前路径计算基础静态路径。');
    assertSourceContains(alternateSource, /localizedStaticPath\s*\(/, 'js/main.js 的 injectAlternateSeoLinks() 应使用 localizedStaticPath() 生成静态页 alternate。');
    assertSourceNotContains(alternateSource, /hreflang\s*:\s*['"]en['"]/, 'js/main.js 的 injectAlternateSeoLinks() 仍写死 hreflang=en。');
    assertSourceNotContains(alternateSource, /hreflang\s*:\s*['"]ar['"]/, 'js/main.js 的 injectAlternateSeoLinks() 仍写死 hreflang=ar。');
    assertSourceContains(mergePatchSource, /applyArrayPatch\s*\(/, 'js/main.js mergeContentPatch() must preserve nested arrays with patch objects.');
    assertSourceContains(localizeTreeSource, /normalizeContentLocale\s*\(/, 'js/main.js localizeContentTree() must allow planned locale patch suffixes without exposing planned locales.');
    assertSourceContains(source, /field\s*\+\s*['"]Patch['"]\s*\+\s*suffix/, 'js/main.js localizeContentTree() must support PatchFr/PatchRu content block patches.');
    assertSourceContains(source, /snakeToCamel\s*\(\s*baseField\s*\)/, 'js/main.js localizeContentTree() must map snake-case patch fields back to camelCase base fields.');
    assertSourceContains(shellLabelSource, /LongxiangI18n\.localized\s*\(/, 'js/main.js shellLabel() must read localized labels after PatchFr/PatchRu merge.');
    verifyFrontendPlannedLocaleRuntimeSeoGuards(source);
}

function verifyFrontendAssetPathRuntimeJs() {
    const mainSource = readText('js/main.js');
    const assetBaseSource = functionSource(mainSource, 'assetBasePrefix');
    const localizedAssetSource = functionSource(mainSource, 'localizedAssetPath');
    const pageScripts = [
        'js/content-pages.js',
        'js/products-list.js',
        'js/product-detail.js',
        'js/education.js',
        'js/compare.js'
    ];

    assertSourceContains(assetBaseSource, /pathPrefix\s*\?\s*['"]\.\.\/['"]\s*:\s*['"]['"]/, 'js/main.js assetBasePrefix() must derive asset prefix from locale pathPrefix.');
    assertSourceContains(localizedAssetSource, /assetBasePrefix\s*\(/, 'js/main.js localizedAssetPath() must use assetBasePrefix().');
    assertSourceContains(localizedAssetSource, /replace\s*\(\s*\/\\\\\/g\s*,\s*['"]\/['"]\s*\)/, 'js/main.js localizedAssetPath() must normalize backslashes.');
    assertSourceContains(localizedAssetSource, /\^\(https\?:\)\?\\\/\\\//, 'js/main.js localizedAssetPath() must preserve absolute URLs.');
    assertSourceNotContains(mainSource, /var\s+assetPrefix\s*=\s*isArabic\s*\?\s*['"]\.\.\/['"]\s*:\s*['"]['"]\s*;/, 'js/main.js assetPrefix must not be based on isArabic.');

    pageScripts.forEach((file) => {
        const source = readText(file);
        assertSourceContains(source, /LongxiangI18n\.assetBasePrefix\s*\(/, file + ' must use LongxiangI18n.assetBasePrefix().');
        assertSourceContains(source, /LongxiangI18n\.localizedAssetPath\s*\(/, file + ' must use LongxiangI18n.localizedAssetPath().');
        assertSourceNotContains(source, /var\s+assetPrefix\s*=\s*isArabic\s*\?\s*['"]\.\.\/['"]\s*:\s*['"]['"]\s*;/, file + ' assetPrefix must not be based on isArabic.');
    });
}

function verifyProductListRuntimeI18nJs() {
    const source = readText('js/products-list.js');
    ['Voir les détails', 'Demander un prix', 'Подробнее', 'Запросить цену'].forEach((text) => {
        assertSourceContains(source, new RegExp(escapeRegExp(text)), 'js/products-list.js 缺少产品目录 fr/ru 运行时文案：' + text);
    });
    ['localizeCatalogStaticUi', 'productCategories', 'clearFilters', 'searchPlaceholder'].forEach((name) => {
        assertSourceContains(source, new RegExp('\\b' + name + '\\b'), 'js/products-list.js 缺少产品目录静态控件本地化能力：' + name);
    });
    assertSourceContains(source, /localizedProductPath\s*\(/, 'js/products-list.js 应使用 LongxiangI18n.localizedProductPath() 生成产品详情链接。');
}

function verifyStaticHtmlRuntimeCacheVersions() {
    const oldVersionPatterns = [
        /20260702-i18n-patch/,
        /js\/\.js\?v=/,
        /js\/main\.js\?v=20260702-i18n-patch/,
        /js\/content-pages\.js\?v=20260702-i18n-patch/,
        /js\/products-list\.js\?v=20260701-remove-compare/
    ];
    const roots = ['', 'ar', 'fr', 'ru', 'pt'];
    roots.forEach((dir) => {
        fs.readdirSync(path.join(root, dir || '.'))
            .filter((name) => name.endsWith('.html'))
            .forEach((name) => {
                const relativePath = dir ? path.join(dir, name) : name;
                const source = readText(relativePath);
                oldVersionPatterns.forEach((pattern) => {
                    assertSourceNotContains(source, pattern, relativePath + ' 仍引用旧 JS 缓存版本，可能导致 fr/ru runtime 不生效。');
                });
            });
    });
}

function verifyPublicApiI18nFieldMapping() {
    const productsSource = readText('server/routes/products.js');
    const categoriesSource = readText('server/routes/product-categories.js');
    const certificationsSource = readText('server/routes/certifications.js');

    [
        'nameFr', 'nameRu',
        'shortDescFr', 'shortDescRu',
        'descriptionFr', 'descriptionRu',
        'seoTitleFr', 'seoTitleRu',
        'seoDescriptionFr', 'seoDescriptionRu',
        'seoKeywordsFr', 'seoKeywordsRu',
        'categoryLabelFr', 'categoryLabelRu',
        'groupLabelFr', 'groupLabelRu',
        'subCategoryLabelFr', 'subCategoryLabelRu'
    ].forEach((field) => {
        assertSourceContains(productsSource, new RegExp('\\b' + field + '\\b'), 'server/routes/products.js 缺少公开产品字段：' + field + '。');
    });

    ['labelFr', 'labelRu'].forEach((field) => {
        assertSourceContains(categoriesSource, new RegExp('\\b' + field + '\\b'), 'server/routes/product-categories.js 缺少公开分类字段：' + field + '。');
    });

    [
        'nameFr', 'nameRu',
        'categoryLabelFr', 'categoryLabelRu',
        'issuerFr', 'issuerRu',
        'descriptionFr', 'descriptionRu'
    ].forEach((field) => {
        assertSourceContains(certificationsSource, new RegExp('\\b' + field + '\\b'), 'server/routes/certifications.js 缺少公开证书字段：' + field + '。');
    });
}

function verifyFrontendI18nFieldReaders() {
    const mainSource = readText('js/main.js');
    const productsListSource = readText('js/products-list.js');
    const productDetailSource = readText('js/product-detail.js');

    assertSourceContains(mainSource, /function\s+localizedApiValue\s*\(/, 'js/main.js 缺少 localizedApiValue() 读取公开 API 多语言字段。');
    assertSourceContains(mainSource, /localizedApiValue\s*\(\s*product\s*,\s*['"]name['"]\s*\)/, 'js/main.js 首页产品名称应使用 localizedApiValue()。');
    assertSourceContains(mainSource, /localizedApiValue\s*\(\s*cert\s*,\s*['"]name['"]\s*\)/, 'js/main.js 证书名称应使用 localizedApiValue()。');
    assertSourceContains(mainSource, /labelFr\s*:\s*category\.labelFr/, 'js/main.js apiHomeCategories() 应透传 labelFr。');
    assertSourceContains(mainSource, /labelRu\s*:\s*category\.labelRu/, 'js/main.js apiHomeCategories() 应透传 labelRu。');
    assertSourceContains(productsListSource, /localize\s*\(\s*parent\s*,\s*['"]label['"]\s*\)/, 'js/products-list.js 分类父级标签应使用 localize()。');
    assertSourceContains(productsListSource, /labelFr/, 'js/products-list.js 应保留 product-categories 的 labelFr 字段。');
    assertSourceContains(productsListSource, /labelFr\s*:\s*item\.labelFr/, 'js/products-list.js deriveTaxonomyFromProducts() 应返回父级 labelFr。');
    assertSourceContains(productsListSource, /labelRu\s*:\s*item\.labelRu/, 'js/products-list.js deriveTaxonomyFromProducts() 应返回父级 labelRu。');
    assertSourceContains(productDetailSource, /localize\s*\(\s*product\s*,\s*['"]seoTitle['"]\s*\)/, 'js/product-detail.js 应准备读取 locale-specific SEO title。');
    assertSourceContains(productDetailSource, /localize\s*\(\s*product\s*,\s*['"]seoDescription['"]\s*\)/, 'js/product-detail.js 应准备读取 locale-specific SEO description。');
}

function assertAdminFormIds(source, ids, label) {
    ids.forEach((id) => {
        assertSourceContains(source, new RegExp('id=["\\\']' + escapeRegExp(id) + '["\\\']'), label + ' 缺少表单字段：' + id + '。');
    });
}

function collectSelectClauses(source, fromPattern) {
    const clauses = [];
    const pattern = new RegExp('SELECT\\s+([\\s\\S]*?)' + fromPattern, 'gi');
    let match;

    while ((match = pattern.exec(source || '')) !== null) {
        clauses.push(match[1]);
    }

    return clauses;
}

function tokenPattern(token) {
    const suffix = /\*$/.test(token) ? '' : '\\b';
    return new RegExp('\\b' + escapeRegExp(token) + suffix);
}

function sourceBetween(source, startPattern, endPattern, label) {
    const startMatch = startPattern.exec(source || '');
    assert(Boolean(startMatch), label + ' 缺少起始片段。');

    const startIndex = startMatch.index;
    const afterStart = source.slice(startIndex + startMatch[0].length);
    const endMatch = endPattern.exec(afterStart);
    assert(Boolean(endMatch), label + ' 缺少结束片段。');

    return source.slice(startIndex, startIndex + startMatch[0].length + endMatch.index);
}

function assertSelectClauseContainsAll(source, fromPattern, fieldTokens, label) {
    const clauses = collectSelectClauses(source, fromPattern);
    assert(clauses.length > 0, label + ' 缺少可校验的 SELECT 片段。');

    const completeClause = clauses.find((clause) => {
        return fieldTokens.every((token) => tokenPattern(token).test(clause));
    });
    assert(Boolean(completeClause), label + ' 缺少同一个 SELECT 片段内的字段：' + fieldTokens.join(', ') + '。');
}

function templateConstantSource(source, name, label) {
    const pattern = new RegExp('const\\s+' + escapeRegExp(name) + '\\s*=\\s*`([\\s\\S]*?)`;');
    const match = pattern.exec(source || '');
    assert(Boolean(match), label + ' 缺少常量：' + name + '。');
    return match ? match[1] : '';
}

function assertTemplateConstantContains(source, name, fieldTokens, label) {
    const value = templateConstantSource(source, name, label);

    fieldTokens.forEach((token) => {
        assertSourceContains(value, new RegExp('\\b' + escapeRegExp(token) + '\\b', 'i'), label + ' ' + name + ' 缺少字段：' + token + '。');
    });
}

function collectInsertStatementParts(source, tableName) {
    const pattern = new RegExp('INSERT\\s+INTO\\s+' + escapeRegExp(tableName) + '\\s*\\(([\\s\\S]*?)\\)\\s*VALUES\\s*\\(([\\s\\S]*?)\\)', 'gi');
    const candidates = [];
    let match;

    while ((match = pattern.exec(source || '')) !== null) {
        candidates.push({ columns: match[1], values: match[2] });
    }

    return candidates;
}

function insertStatementParts(source, tableName, fields, label) {
    const candidates = collectInsertStatementParts(source, tableName);
    assert(candidates.length > 0, label + ' 缺少可校验的 INSERT 片段。');

    const completeCandidate = candidates.find((candidate) => {
        return fields.every((field) => {
            return tokenPattern(field).test(candidate.columns)
                && new RegExp('@' + escapeRegExp(field) + '\\b').test(candidate.values);
        });
    });

    assert(Boolean(completeCandidate), label + ' 缺少完整包含 ' + fields.join(', ') + ' 的 INSERT 片段。');
    return completeCandidate || { columns: '', values: '' };
}

function collectUpdateSetClauses(source, tableName) {
    const pattern = new RegExp('UPDATE\\s+' + escapeRegExp(tableName) + '\\s+SET\\s+([\\s\\S]*?)\\s+WHERE\\s+id\\s*=', 'gi');
    const clauses = [];
    let match;

    while ((match = pattern.exec(source || '')) !== null) {
        clauses.push(match[1]);
    }

    return clauses;
}

function updateSetClause(source, tableName, fields, label) {
    const clauses = collectUpdateSetClauses(source, tableName);
    assert(clauses.length > 0, label + ' 缺少可校验的 UPDATE 片段。');

    const completeClause = clauses.find((clause) => {
        return fields.every((field) => {
            return new RegExp('\\b' + escapeRegExp(field) + '\\s*=\\s*@' + escapeRegExp(field) + '\\b').test(clause);
        });
    });

    assert(Boolean(completeClause), label + ' 缺少完整包含 ' + fields.join(', ') + ' 的 UPDATE 片段。');
    return completeClause || '';
}

function assertRouteWrites(source, tableName, fields, label) {
    const insertParts = insertStatementParts(source, tableName, fields, label);
    const updateSource = updateSetClause(source, tableName, fields, label);

    fields.forEach((field) => {
        assertSourceContains(insertParts.columns, tokenPattern(field), label + ' INSERT column 缺少字段：' + field + '。');
        assertSourceContains(insertParts.values, new RegExp('@' + escapeRegExp(field) + '\\b'), label + ' INSERT value 缺少字段：' + field + '。');
        assertSourceContains(updateSource, new RegExp('\\b' + escapeRegExp(field) + '\\s*=\\s*@' + escapeRegExp(field) + '\\b'), label + ' UPDATE 缺少字段：' + field + '。');
    });
}

function assertProductAdminMappings(source, mappings, label) {
    mappings.forEach(([field, id]) => {
        assertSourceContains(source, new RegExp('["\\\']' + escapeRegExp(id) + '["\\\']\\s*:\\s*product\\.' + escapeRegExp(field) + '\\b'),
            label + ' 回填缺少映射：' + id + ' <- product.' + field + '。');
        assertSourceContains(source, new RegExp('\\b' + escapeRegExp(field) + '\\s*:\\s*getFieldValue\\(\\s*["\\\']' + escapeRegExp(id) + '["\\\']\\s*\\)'),
            label + ' payload 缺少映射：' + field + ' <- ' + id + '。');
    });
}

function assertDomValueMapping(source, id, objectName, field, label) {
    assertSourceContains(source, new RegExp('document\\.getElementById\\(\\s*["\\\']' + escapeRegExp(id) + '["\\\']\\s*\\)\\.value\\s*=\\s*'
        + escapeRegExp(objectName) + '\\.' + escapeRegExp(field) + '\\b'),
        label + ' 回填缺少映射：' + id + ' <- ' + objectName + '.' + field + '。');
}

function assertVariableFromDom(source, variableName, id, label) {
    assertSourceContains(source, new RegExp('\\bvar\\s+' + escapeRegExp(variableName) + '\\s*=\\s*document\\.getElementById\\(\\s*["\\\']'
        + escapeRegExp(id) + '["\\\']\\s*\\)\\.value\\.trim\\(\\)'),
        label + ' 缺少表单读取变量：' + variableName + ' <- ' + id + '。');
}

function assertPayloadVariable(source, field, variableName, label) {
    assertSourceContains(source, new RegExp('\\b' + escapeRegExp(field) + '\\s*:\\s*' + escapeRegExp(variableName) + '\\b'),
        label + ' payload 缺少映射：' + field + ' <- ' + variableName + '。');
}

function assertPayloadDomValue(source, field, id, label) {
    assertSourceContains(source, new RegExp('\\b' + escapeRegExp(field) + '\\s*:\\s*document\\.getElementById\\(\\s*["\\\']'
        + escapeRegExp(id) + '["\\\']\\s*\\)\\.value\\.trim\\(\\)'),
        label + ' payload 缺少映射：' + field + ' <- ' + id + '。');
}

function assertCategoryAdminMappings(source) {
    [
        ['name_fr', 'cat-name-fr', 'nameFr'],
        ['name_ru', 'cat-name-ru', 'nameRu']
    ].forEach(([field, id, variableName]) => {
        assertDomValueMapping(source, id, 'category', field, 'admin/js/admin.js 分类后台');
        assertVariableFromDom(source, variableName, id, 'admin/js/admin.js 分类后台');
        assertPayloadVariable(source, field, variableName, 'admin/js/admin.js 分类后台');
    });
}

function assertCertificationAdminMappings(source) {
    [
        ['name_fr', 'cert-name-fr'],
        ['name_ru', 'cert-name-ru'],
        ['issuer_fr', 'cert-issuer-fr'],
        ['issuer_ru', 'cert-issuer-ru'],
        ['description_fr', 'cert-description-fr'],
        ['description_ru', 'cert-description-ru']
    ].forEach(([field, id]) => {
        assertDomValueMapping(source, id, 'detail', field, 'admin/js/admin.js 证书后台');
        assertPayloadDomValue(source, field, id, 'admin/js/admin.js 证书后台');
    });
}

function assertVisualBuilderLanguageSupport(source) {
    assertSourceContains(source, /key:\s*['"]fr['"]/, 'admin/js/admin.js 可视化内容编辑器缺少法语语言按钮。');
    assertSourceContains(source, /key:\s*['"]ru['"]/, 'admin/js/admin.js 可视化内容编辑器缺少俄语语言按钮。');
    assertSourceContains(source, /visualLanguageSuffix\s*\(/, 'admin/js/admin.js 可视化内容编辑器应使用通用语言后缀生成 Fr/Ru/Ar 字段。');
    assertSourceContains(source, /field\.localizedKeyByLanguage/, 'admin/js/admin.js 可视化内容编辑器应支持字段级语言键映射。');
    assertSourceContains(source, /visualUsesPatchFields\s*\(/, 'admin/js/admin.js 可视化编辑器必须区分 Fr/Ru Patch 字段模式。');
    assertSourceContains(source, /visualPatchCollectionKey\s*\(/, 'admin/js/admin.js 可视化编辑器必须能生成 cardsPatchFr/sectionsPatchRu 等 Patch 集合路径。');
    assertSourceContains(source, /visualSectionPatchBasePath\s*\(/, 'admin/js/admin.js 可视化编辑器必须能把 section 字段写入 sectionsPatchFr/sectionsPatchRu。');
    assertSourceContains(source, /visualLocalizedArrayFieldPath\s*\(/, 'admin/js/admin.js 可视化编辑器必须能把数组项字段写入 itemsPatchFr/detailFaqPatchRu 等路径。');
    assertSourceContains(source, /key:\s*['"]detailFaqItems['"]/, 'admin/js/admin.js 可视化编辑器必须开放 product-pages detailFaq 条目维护入口。');
    assertSourceContains(source, /key:\s*['"]contactFaqItems['"]/, 'admin/js/admin.js 可视化编辑器必须开放 contact FAQ items 条目维护入口。');
    assertSourceContains(source, /法语\/俄语模式只维护已有项目的本地化内容/, 'admin/js/admin.js Fr/Ru 模式必须禁止调整中性数组结构。');
    assertSourceNotContains(source, /if\s*\(\s*!visualIsArabicLanguage\s*\(\s*\)\s*\|\|\s*!visualFieldSupportsLanguage\s*\(\s*field\s*\)\s*\)\s*return\s+key\s*;/,
        'admin/js/admin.js 可视化内容编辑器仍只按阿语生成本地化字段。');
}

function verifyAdminI18nEditingEntrypoints() {
    const adminHtml = readText('admin/index.html');
    const productAdminSource = readText('admin/js/modules/admin-products.js');
    const adminSource = readText('admin/js/admin.js');
    const productRouteSource = readText('server/routes/admin/products.js');
    const categoryRouteSource = readText('server/routes/admin/categories.js');
    const certificationRouteSource = readText('server/routes/admin/certifications.js');

    const productMappings = [
        ['name_fr', 'field-nameFr'], ['name_ru', 'field-nameRu'],
        ['short_desc_fr', 'field-shortDescFr'], ['short_desc_ru', 'field-shortDescRu'],
        ['description_fr', 'field-descriptionFr'], ['description_ru', 'field-descriptionRu'],
        ['seo_title_fr', 'field-seo-title-fr'], ['seo_title_ru', 'field-seo-title-ru'],
        ['seo_description_fr', 'field-seo-description-fr'], ['seo_description_ru', 'field-seo-description-ru'],
        ['seo_keywords_fr', 'field-seo-keywords-fr'], ['seo_keywords_ru', 'field-seo-keywords-ru']
    ];
    const categoryFields = ['name_fr', 'name_ru'];
    const certificationFields = [
        'name_fr', 'name_ru',
        'issuer_fr', 'issuer_ru',
        'description_fr', 'description_ru'
    ];
    const productFields = productMappings.map((mapping) => mapping[0]);
    const productListRouteSource = sourceBetween(productRouteSource,
        /router\.get\(\s*['"]\/['"]\s*,\s*function\b/,
        /router\.get\(\s*['"]\/:id['"]\s*,\s*function\b/,
        'server/routes/admin/products.js 产品列表路由');
    const productDetailRouteSource = sourceBetween(productRouteSource,
        /router\.get\(\s*['"]\/:id['"]\s*,\s*function\b/,
        /router\.post\(\s*['"]\/upload['"]\s*,\s*function\b/,
        'server/routes/admin/products.js 产品详情路由');
    const productBaseSource = functionSource(productRouteSource, 'getProductBase');
    const productFullSource = functionSource(productRouteSource, 'getFullProduct');
    const certificationListRouteSource = sourceBetween(certificationRouteSource,
        /router\.get\(\s*['"]\/['"]\s*,\s*function\b/,
        /router\.get\(\s*['"]\/:id['"]\s*,\s*function\b/,
        'server/routes/admin/certifications.js 证书列表路由');
    const certificationDetailSource = functionSource(certificationRouteSource, 'getCertification');

    assertAdminFormIds(adminHtml, [
        'field-nameFr', 'field-nameRu',
        'field-shortDescFr', 'field-shortDescRu',
        'field-descriptionFr', 'field-descriptionRu',
        'field-seo-title-fr', 'field-seo-title-ru',
        'field-seo-description-fr', 'field-seo-description-ru',
        'field-seo-keywords-fr', 'field-seo-keywords-ru'
    ], 'admin/index.html 产品后台');
    assertAdminFormIds(adminHtml, ['cat-name-fr', 'cat-name-ru'], 'admin/index.html 分类后台');
    assertAdminFormIds(adminHtml, [
        'cert-name-fr', 'cert-name-ru',
        'cert-issuer-fr', 'cert-issuer-ru',
        'cert-description-fr', 'cert-description-ru'
    ], 'admin/index.html 证书后台');

    assertProductAdminMappings(productAdminSource, productMappings, 'admin/js/modules/admin-products.js 产品后台');
    assertCategoryAdminMappings(adminSource);
    assertCertificationAdminMappings(adminSource);
    assertVisualBuilderLanguageSupport(adminSource);

    assertSelectClauseContainsAll(productListRouteSource, 'FROM\\s+products\\s+p\\b', productFields.map((field) => 'p.' + field), 'server/routes/admin/products.js 产品列表后台');
    assertSourceContains(productDetailRouteSource, /getFullProduct\s*\(/, 'server/routes/admin/products.js 产品详情路由应读取完整产品。');
    assertSourceContains(productFullSource, /getProductBase\s*\(/, 'server/routes/admin/products.js getFullProduct() 应复用 getProductBase()。');
    assertSelectClauseContainsAll(productBaseSource, 'FROM\\s+products\\s+p\\b', ['p.*'], 'server/routes/admin/products.js 产品详情后台');
    assertRouteWrites(productRouteSource, 'products', productFields, 'server/routes/admin/products.js 产品后台');

    assertSourceContains(categoryRouteSource, /SELECT\s+\$\{CATEGORY_FIELDS\}/, 'server/routes/admin/categories.js 分类后台应使用 CATEGORY_FIELDS 查询分类。');
    assertTemplateConstantContains(categoryRouteSource, 'CATEGORY_FIELDS', categoryFields.map((field) => 'c.' + field), 'server/routes/admin/categories.js 分类后台');
    assertTemplateConstantContains(categoryRouteSource, 'CATEGORY_FIELDS', ['parent.name_fr AS parent_name_fr', 'parent.name_ru AS parent_name_ru'], 'server/routes/admin/categories.js 分类后台');
    assertRouteWrites(categoryRouteSource, 'categories', categoryFields, 'server/routes/admin/categories.js 分类后台');

    assertSelectClauseContainsAll(certificationListRouteSource, 'FROM\\s+certifications\\s+cert\\b', certificationFields.map((field) => 'cert.' + field), 'server/routes/admin/certifications.js 证书列表后台');
    assertSelectClauseContainsAll(certificationDetailSource, 'FROM\\s+certifications\\s+cert\\b', certificationFields.map((field) => 'cert.' + field), 'server/routes/admin/certifications.js 证书详情后台');
    assertRouteWrites(certificationRouteSource, 'certifications', certificationFields, 'server/routes/admin/certifications.js 证书后台');
    assertSourceNotContains(certificationRouteSource, /category_label_fr\s*=\s*@category_label_fr/, 'server/routes/admin/certifications.js 不应在 E8c 开放 category_label_fr 编辑。');
    assertSourceNotContains(certificationRouteSource, /category_label_ru\s*=\s*@category_label_ru/, 'server/routes/admin/certifications.js 不应在 E8c 开放 category_label_ru 编辑。');
}

function verifyContentPagesRuntimeSeoJs() {
    const source = readText('js/content-pages.js');
    const productDetailSource = readText('js/product-detail.js');
    assertSourceContains(source, /seoLocales\s*\(/, 'js/content-pages.js 应按 LongxiangI18n.seoLocales() 生成 alternate。');
    assertSourceNotContains(source, /paths\.en/, 'js/content-pages.js 的 alternate 仍直接使用 paths.en。');
    assertSourceNotContains(source, /paths\.ar/, 'js/content-pages.js 的 alternate 仍直接使用 paths.ar。');
    assertSourceContains(source, /localizeContentTree\s*\(/, 'js/content-pages.js must localize content block PatchFr/PatchRu before rendering.');
    assertSourceContains(productDetailSource, /localizeContentTree\s*\(/, 'js/product-detail.js must localize product-page content block PatchFr/PatchRu before rendering.');
}

function verifyEducationCompareRuntimeI18nJs() {
    const educationSource = readText('js/education.js');
    const compareSource = readText('js/compare.js');
    const educationCanonicalSource = functionSource(educationSource, 'setCanonicalLink');
    assertSourceContains(educationSource, /localizeContentTree\s*\(/, 'js/education.js must localize content block PatchFr/PatchRu before rendering.');
    assertSourceContains(compareSource, /localizeContentTree\s*\(/, 'js/compare.js must localize content block PatchFr/PatchRu before rendering.');

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
    const staticSitemapMatchesDynamic = urlEntries.length === sitemapCountModel.expectedUrlCount;
    assert(urlEntries.length > 0, 'sitemap.xml 缺少 url 条目。');
    if (!staticSitemapMatchesDynamic) {
        warn('sitemap.xml URL count 当前为 ' + urlEntries.length
            + '，动态期望为 ' + sitemapCountModel.expectedUrlCount
            + '。当前站点由 server/app.js 动态响应 /sitemap.xml，静态文件 count 不作为生产写库 hard gate。');
    }

    urlEntries.forEach((entry, index) => {
        const loc = firstElementText(entry, 'loc');
        const locLabel = loc || '第 ' + (index + 1) + ' 个 url';
        const alternateLinks = collectTags(entry, 'xhtml:link')
            .map((tag) => tag.attrs)
            .filter((attrs) => hasRel(attrs, 'alternate'));

        assert(hasText(loc), 'sitemap.xml 的 ' + locLabel + ' 缺少 loc。');
        if (staticSitemapMatchesDynamic && hasText(loc)) {
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
    assert(urlEntries.length === sitemapCountModel.expectedUrlCount,
        'generate-sitemap dry-run URL count 应为动态期望 '
        + sitemapCountModel.expectedUrlCount
        + '（静态页 ' + sitemapCountModel.staticUrlCount
        + ' + eligible 产品 ' + sitemapCountModel.eligibleProductCount
        + ' * sitemap locale ' + sitemapCountModel.sitemapLocaleCount
        + '），当前为 ' + urlEntries.length + '。');

    urlEntries.forEach((entry, index) => {
        const loc = firstElementText(entry, 'loc');
        const locLabel = loc || '第 ' + (index + 1) + ' 个 url';
        const alternateLinks = collectTags(entry, 'xhtml:link')
            .map((tag) => tag.attrs)
            .filter((attrs) => hasRel(attrs, 'alternate'));

        assert(hasText(loc), 'generate-sitemap dry-run 的 ' + locLabel + ' 缺少 loc。');
        if (hasText(loc)) {
            verifySitemapAlternateSet(loc, alternateLinks);
        }
    });

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
    verifyLocalizedStaticShellText();
    verifyProductDetailJs();
    verifyFrontendRuntimeI18nJs();
    verifyFrontendAssetPathRuntimeJs();
    verifyProductListRuntimeI18nJs();
    verifyStaticHtmlRuntimeCacheVersions();
    verifyPublicApiI18nFieldMapping();
    verifyFrontendI18nFieldReaders();
    verifyAdminI18nEditingEntrypoints();
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
