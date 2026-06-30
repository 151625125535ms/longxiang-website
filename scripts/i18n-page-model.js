const fs = require('fs');
const path = require('path');

const DEFAULT_LOCALE_CONFIG_PATH = path.join(__dirname, '..', 'config', 'locales.json');

const BASE_STATIC_PAGES = [
    { basePath: '/', file: 'index.html', changefreq: 'weekly', priority: { default: '1.0', nonDefault: '0.8' } },
    { basePath: '/about.html', file: 'about.html', changefreq: 'monthly', priority: { default: '0.8', nonDefault: '0.6' }, block: 'about-us' },
    { basePath: '/products.html', file: 'products.html', changefreq: 'weekly', priority: { default: '0.9', nonDefault: '0.7' }, block: 'product-pages', staticAlternates: true },
    { basePath: '/solutions.html', file: 'solutions.html', changefreq: 'monthly', priority: { default: '0.8', nonDefault: '0.6' }, block: 'solutions' },
    { basePath: '/education.html', file: 'education.html', changefreq: 'monthly', priority: { default: '0.5', nonDefault: '0.4' }, block: 'education' },
    { basePath: '/certifications.html', file: 'certifications.html', changefreq: 'monthly', priority: { default: '0.7', nonDefault: '0.5' }, block: 'certifications' },
    { basePath: '/compare.html', file: 'compare.html', changefreq: 'monthly', priority: { default: '0.5', nonDefault: '0.5' }, block: 'compare' },
    { basePath: '/contact.html', file: 'contact.html', changefreq: 'monthly', priority: { default: '0.8', nonDefault: '0.6' }, block: 'contact' }
];

const PRODUCT_DETAIL_SHELL = {
    basePath: '/product-detail.html',
    file: 'product-detail.html'
};

function loadLocaleConfig(configPath) {
    const parsed = JSON.parse(fs.readFileSync(configPath || DEFAULT_LOCALE_CONFIG_PATH, 'utf8'));
    const localeMap = parsed.locales || {};
    const supportedLocales = Array.isArray(parsed.supportedLocales) && parsed.supportedLocales.length
        ? parsed.supportedLocales
        : Object.keys(localeMap);

    return {
        defaultLocale: parsed.defaultLocale || supportedLocales[0] || 'en',
        supportedLocales: supportedLocales,
        locales: localeMap
    };
}

function normalizePathPrefix(value) {
    const prefix = String(value || '').trim().replace(/\/+$/, '');
    if (!prefix || prefix === '/') return '';
    return prefix.charAt(0) === '/' ? prefix : '/' + prefix;
}

function normalizeBasePath(value) {
    const pathname = String(value || '/').trim();
    if (!pathname || pathname === '/') return '/';
    return pathname.charAt(0) === '/' ? pathname : '/' + pathname;
}

function localeEntry(config, code) {
    const localeConfig = config && config.locales ? config.locales[code] || {} : {};
    const prefix = normalizePathPrefix(localeConfig.pathPrefix);

    return {
        code: code,
        label: localeConfig.label || code,
        nativeLabel: localeConfig.nativeLabel || localeConfig.label || code,
        htmlLang: localeConfig.htmlLang || code,
        hreflang: localeConfig.hreflang || localeConfig.htmlLang || code,
        dir: localeConfig.dir || '',
        pathPrefix: prefix,
        homePath: localeConfig.homePath || (prefix ? prefix + '/index.html' : '/'),
        fallbackLocale: localeConfig.fallbackLocale || null,
        includeInSitemap: localeConfig.includeInSitemap !== false
    };
}

function allLocaleEntries(config) {
    return (config.supportedLocales || []).map(function (code) {
        return localeEntry(config, code);
    });
}

function sitemapLocaleEntries(config) {
    return allLocaleEntries(config).filter(function (locale) {
        return locale.includeInSitemap;
    });
}

function localizedStaticPath(basePath, locale) {
    const normalizedBasePath = normalizeBasePath(basePath);
    if (normalizedBasePath === '/') return locale.homePath;
    return locale.pathPrefix + normalizedBasePath;
}

function localizedStaticFile(baseFile, locale) {
    const normalizedFile = String(baseFile || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!locale.pathPrefix) return normalizedFile;
    return locale.pathPrefix.replace(/^\/+/, '') + '/' + normalizedFile;
}

function localizedProductPath(productId, locale) {
    return locale.pathPrefix + '/products/' + productId;
}

function pagePriority(page, locale, defaultLocale) {
    const priority = page.priority;
    if (priority && typeof priority === 'object') {
        return locale.code === defaultLocale.code ? priority.default : priority.nonDefault;
    }
    return priority;
}

function staticPagesForSitemap(config) {
    const defaultLocale = localeEntry(config, config.defaultLocale);

    return sitemapLocaleEntries(config).reduce(function (pages, locale) {
        BASE_STATIC_PAGES.forEach(function (page) {
            pages.push({
                basePath: page.basePath,
                path: localizedStaticPath(page.basePath, locale),
                file: localizedStaticFile(page.file, locale),
                changefreq: page.changefreq,
                priority: pagePriority(page, locale, defaultLocale),
                block: page.block,
                locale: locale.code,
                hreflang: locale.hreflang,
                staticAlternates: page.staticAlternates === true
            });
        });
        return pages;
    }, []);
}

function htmlPagesForVerification(config) {
    const pages = staticPagesForSitemap(config).map(function (page) {
        const locale = localeEntry(config, page.locale);
        return {
            file: page.file,
            lang: locale.htmlLang,
            dir: locale.dir,
            canonicalPath: page.staticAlternates ? page.path : '',
            alternates: page.staticAlternates ? alternatePathMap(config, page.basePath) : null
        };
    });

    sitemapLocaleEntries(config).forEach(function (locale) {
        pages.push({
            file: localizedStaticFile(PRODUCT_DETAIL_SHELL.file, locale),
            lang: locale.htmlLang,
            dir: locale.dir
        });
    });

    return pages;
}

function alternatePathMap(config, basePath) {
    const defaultLocale = localeEntry(config, config.defaultLocale);
    const alternates = sitemapLocaleEntries(config).reduce(function (acc, locale) {
        acc[locale.hreflang] = localizedStaticPath(basePath, locale);
        return acc;
    }, {});
    alternates['x-default'] = localizedStaticPath(basePath, defaultLocale);
    return alternates;
}

module.exports = {
    BASE_STATIC_PAGES,
    PRODUCT_DETAIL_SHELL,
    loadLocaleConfig,
    normalizePathPrefix,
    localeEntry,
    allLocaleEntries,
    sitemapLocaleEntries,
    localizedStaticPath,
    localizedStaticFile,
    localizedProductPath,
    staticPagesForSitemap,
    htmlPagesForVerification
};
