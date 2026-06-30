const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const LOCALE_CONFIG_PATH = path.join(PROJECT_ROOT, 'config', 'locales.json');

function loadLocaleConfig() {
    const parsed = JSON.parse(fs.readFileSync(LOCALE_CONFIG_PATH, 'utf8'));
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

function localeEntry(config, code) {
    const localeConfig = config.locales[code] || {};
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

function localeEntries() {
    const config = loadLocaleConfig();
    return config.supportedLocales.map(function (code) {
        return localeEntry(config, code);
    });
}

function localeForRequestPath(pathname) {
    const normalized = '/' + String(pathname || '/').replace(/\\/g, '/').replace(/^\/+/, '');
    const entries = localeEntries().filter(function (locale) {
        return locale.pathPrefix;
    }).sort(function (a, b) {
        return b.pathPrefix.length - a.pathPrefix.length;
    });

    for (let i = 0; i < entries.length; i += 1) {
        const locale = entries[i];
        if (normalized === locale.pathPrefix || normalized.indexOf(locale.pathPrefix + '/') === 0) return locale;
    }

    return localeEntries().filter(function (locale) {
        return !locale.pathPrefix;
    })[0] || localeEntries()[0];
}

function localizedStaticFile(baseFile, locale) {
    const normalizedFile = String(baseFile || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!locale.pathPrefix) return normalizedFile;
    return locale.pathPrefix.replace(/^\/+/, '') + '/' + normalizedFile;
}

function localizedHtmlShellPath(baseFile, locale) {
    return path.join(PROJECT_ROOT, localizedStaticFile(baseFile, locale));
}

function baseHrefForLocale(locale) {
    return locale.pathPrefix ? locale.pathPrefix + '/' : '/';
}

function productDetailRoutePatterns() {
    return localeEntries().filter(function (locale) {
        return fs.existsSync(localizedHtmlShellPath('product-detail.html', locale));
    }).map(function (locale) {
        return locale.pathPrefix + '/products/:slug';
    });
}

module.exports = {
    localeEntries,
    localeForRequestPath,
    localizedHtmlShellPath,
    baseHrefForLocale,
    productDetailRoutePatterns
};
