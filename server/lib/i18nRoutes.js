const fs = require('fs');
const path = require('path');
const { loadLocaleRegistry } = require('./localeRegistry');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function localeEntries() {
    return loadLocaleRegistry().publicEntries;
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

function defaultLocaleEntry() {
    const registry = loadLocaleRegistry();
    return registry.get(registry.defaultLocale);
}

function notFoundShellForRequestPath(pathname) {
    const requestedLocale = localeForRequestPath(pathname);
    const fallbackLocale = defaultLocaleEntry();
    const requestedFilePath = localizedHtmlShellPath('404.html', requestedLocale);
    const locale = fs.existsSync(requestedFilePath) ? requestedLocale : fallbackLocale;

    return {
        filePath: localizedHtmlShellPath('404.html', locale),
        baseHref: baseHrefForLocale(locale),
        locale: locale.code
    };
}

function productDetailRoutePatterns() {
    return localeEntries().filter(function (locale) {
        return fs.existsSync(localizedHtmlShellPath('product-detail.html', locale));
    }).map(function (locale) {
        return locale.pathPrefix + '/products/:slug';
    });
}

function homeRouteRedirects() {
    return localeEntries().reduce(function (redirects, locale) {
        const aliases = locale.pathPrefix
            ? [locale.pathPrefix, locale.pathPrefix + '/index.html']
            : ['/index.html'];
        aliases.forEach(function (from) {
            if (from !== locale.homePath) redirects.push({ from, to: locale.homePath });
        });
        return redirects;
    }, []);
}

module.exports = {
    localeEntries,
    localeForRequestPath,
    localizedHtmlShellPath,
    baseHrefForLocale,
    notFoundShellForRequestPath,
    productDetailRoutePatterns,
    homeRouteRedirects
};
