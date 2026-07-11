'use strict';

const {
    localeEntries,
    localizedHtmlShellPath
} = require('./i18nRoutes');
const { PUBLIC_COMPANY_IDENTITY } = require('./companyIdentity');
const {
    buildPageEntity,
    buildHomeSiteGraph,
    buildBreadcrumbEntity,
    standaloneSchema
} = require('./siteEntityGraph');

const STATIC_SEO_PAGES = Object.freeze([
    Object.freeze({
        basePath: '/',
        file: 'index.html',
        schemaType: 'WebPage',
        schemaKey: 'site-page'
    }),
    Object.freeze({
        basePath: '/about.html',
        file: 'about.html',
        schemaType: 'AboutPage',
        schemaKey: 'content-page',
        breadcrumbKey: 'content-breadcrumb'
    }),
    Object.freeze({
        basePath: '/solutions.html',
        file: 'solutions.html',
        schemaType: 'WebPage',
        schemaKey: 'content-page',
        breadcrumbKey: 'content-breadcrumb'
    }),
    Object.freeze({
        basePath: '/education.html',
        file: 'education.html',
        schemaType: 'WebPage',
        schemaKey: 'education-page',
        breadcrumbKey: 'education-breadcrumb'
    }),
    Object.freeze({
        basePath: '/certifications.html',
        file: 'certifications.html',
        schemaType: 'CollectionPage',
        schemaKey: 'content-page',
        breadcrumbKey: 'content-breadcrumb'
    }),
    Object.freeze({
        basePath: '/compare.html',
        file: 'compare.html',
        schemaType: 'WebPage',
        schemaKey: 'content-page',
        breadcrumbKey: 'content-breadcrumb'
    }),
    Object.freeze({
        basePath: '/contact.html',
        file: 'contact.html',
        schemaType: 'ContactPage',
        schemaKey: 'contact-page'
    })
]);

const HOME_LABELS = Object.freeze({
    en: 'Home',
    ar: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    fr: 'Accueil',
    ru: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f'
});

function normalizeOrigin(value) {
    return String(value || 'https://www.lxenelectric.com').replace(/\/+$/, '');
}

function includedLocaleEntries() {
    return localeEntries().filter(function (locale) {
        return locale.includeInSitemap;
    });
}

function localizedStaticPath(basePath, locale) {
    if (basePath === '/') return locale.homePath;
    return locale.pathPrefix + basePath;
}

function staticSeoRouteDefinitions() {
    return includedLocaleEntries().reduce(function (routes, locale) {
        STATIC_SEO_PAGES.forEach(function (page) {
            routes.push({
                path: localizedStaticPath(page.basePath, locale),
                basePath: page.basePath,
                file: page.file,
                filePath: localizedHtmlShellPath(page.file, locale),
                locale: locale,
                schemaType: page.schemaType,
                schemaKey: page.schemaKey,
                breadcrumbKey: page.breadcrumbKey || ''
            });
        });
        return routes;
    }, []);
}

function parseAttributes(tag) {
    const attributes = {};
    String(tag || '').replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(["'])(.*?)\2/g, function (_, name, __, value) {
        attributes[name.toLowerCase()] = value;
        return '';
    });
    return attributes;
}

function decodeHtml(value) {
    return String(value || '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#0*39;|&apos;/gi, "'");
}

function textContent(value) {
    return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}

function firstMatch(source, pattern) {
    const match = String(source || '').match(pattern);
    return match ? textContent(match[1]) : '';
}

function pageTitle(html) {
    return firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
}

function pageHeading(html) {
    return firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
}

function metaDescription(html) {
    const tags = Array.from(String(html || '').matchAll(/<meta\b[^>]*>/gi))
        .map(function (match) { return parseAttributes(match[0]); });
    const found = tags.find(function (attributes) {
        return String(attributes.name || '').toLowerCase() === 'description';
    });
    return found ? decodeHtml(found.content || '').replace(/\s+/g, ' ').trim() : '';
}

function stripBrandSuffix(value) {
    return String(value || '')
        .replace(/\s+\|\s+(Longxiang|Longxiang Electric|Henan Longxiang Electric).*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function localizedField(value, key, localeCode) {
    if (!value || typeof value !== 'object') return '';
    const code = String(localeCode || 'en');
    const suffix = code === 'en' ? '' : code.charAt(0).toUpperCase() + code.slice(1);
    const localized = suffix ? value[key + suffix] : value[key];
    return localized == null || localized === '' ? String(value[key] || '') : String(localized);
}

function htmlEscape(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function jsonScriptValue(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

function linkTag(rel, attributes) {
    const attributeText = Object.keys(attributes || {}).map(function (key) {
        return key + '="' + htmlEscape(attributes[key]) + '"';
    }).join(' ');
    return '<link rel="' + htmlEscape(rel) + '" ' + attributeText + '>';
}

function schemaScript(key, value, version) {
    const versionAttribute = version == null ? '' : ' data-schema-version="' + htmlEscape(version) + '"';
    return '<script type="application/ld+json" data-schema-auto="' + htmlEscape(key) + '"' + versionAttribute + '>'
        + jsonScriptValue(value)
        + '</script>';
}

function topLevelSchemaTypes(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const type = value['@type'];
    if (!type) return [];
    return Array.isArray(type) ? type.map(String) : [String(type)];
}

function managedSchemaTypes(value) {
    const types = topLevelSchemaTypes(value);
    if (value && Array.isArray(value['@graph'])) {
        value['@graph'].forEach(function (node) {
            topLevelSchemaTypes(node).forEach(function (type) {
                if (types.indexOf(type) === -1) types.push(type);
            });
        });
    }
    return types;
}

function stripManagedJsonLd(html, route) {
    const managedKeys = [route.schemaKey, route.breadcrumbKey, 'site', 'site-graph', 'site-page', 'contact-page'].filter(Boolean);
    const managedTypes = [route.schemaType, 'Organization', 'WebSite', 'LocalBusiness'];
    if (route.breadcrumbKey) managedTypes.push('BreadcrumbList');

    return String(html || '').replace(
        /<script\b([^>]*)type=["']application\/ld\+json["']([^>]*)>([\s\S]*?)<\/script>\s*/gi,
        function (full, beforeType, afterType, jsonText) {
            const attributes = Object.assign({}, parseAttributes(beforeType), parseAttributes(afterType));
            if (managedKeys.indexOf(attributes['data-schema-auto'] || '') !== -1) return '';
            try {
                const value = JSON.parse(jsonText);
                if (managedSchemaTypes(value).some(function (type) {
                    return managedTypes.indexOf(type) !== -1;
                })) return '';
            } catch (err) {
                return full;
            }
            return full;
        }
    );
}

function stripManagedHeadTags(html, route) {
    const withoutLinks = String(html || '').replace(/<link\b[^>]*>\s*/gi, function (tag) {
        const attributes = parseAttributes(tag);
        const rel = String(attributes.rel || '').toLowerCase();
        const isManagedAlternate = rel === 'alternate' && Boolean(attributes.hreflang);
        return rel === 'canonical' || isManagedAlternate ? '' : tag;
    });
    return stripManagedJsonLd(withoutLinks, route);
}

function pageSchema(route, canonicalUrl, origin, name, description) {
    if (route.basePath === '/' && route.locale.code === 'en') {
        return buildHomeSiteGraph({
            canonicalUrl,
            name,
            description: description || name,
            language: route.locale.htmlLang
        });
    }
    return standaloneSchema(buildPageEntity({
        type: route.schemaType,
        canonicalUrl,
        name,
        description: description || name,
        language: route.locale.htmlLang,
        aboutOrganization: route.basePath === '/' || route.basePath === '/about.html' || route.basePath === '/contact.html'
    }));
}

function breadcrumbSchema(route, canonicalUrl, origin, name) {
    return standaloneSchema(buildBreadcrumbEntity({
        canonicalUrl,
        items: [
            {
                '@type': 'ListItem',
                position: 1,
                name: HOME_LABELS[route.locale.code] || HOME_LABELS.en,
                item: origin + route.locale.homePath
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: name,
                item: canonicalUrl
            }
        ]
    }));
}

function renderStaticPageSeoHtml(html, route, originValue) {
    const origin = normalizeOrigin(originValue);
    const locales = includedLocaleEntries();
    const defaultLocale = locales.find(function (locale) {
        return !locale.pathPrefix;
    }) || locales[0];
    const canonicalUrl = origin + route.path;
    const schemaBody = route.schemaContentBlock && route.schemaContentBlock.body || {};
    const schemaSeo = schemaBody.seo || {};
    const schemaHero = schemaBody.hero || {};
    const name = localizedField(schemaHero, 'title', route.locale.code)
        || pageHeading(html)
        || stripBrandSuffix(localizedField(schemaSeo, 'title', route.locale.code))
        || stripBrandSuffix(pageTitle(html))
        || PUBLIC_COMPANY_IDENTITY.brandName;
    const description = localizedField(schemaSeo, 'description', route.locale.code) || metaDescription(html);
    const cleaned = stripManagedHeadTags(html, route);
    const tags = [linkTag('canonical', { href: canonicalUrl })];

    locales.forEach(function (locale) {
        tags.push(linkTag('alternate', {
            hreflang: locale.hreflang,
            href: origin + localizedStaticPath(route.basePath, locale)
        }));
    });
    tags.push(linkTag('alternate', {
        hreflang: 'x-default',
        href: origin + localizedStaticPath(route.basePath, defaultLocale)
    }));
    const schema = pageSchema(route, canonicalUrl, origin, name, description);
    const schemaKey = route.basePath === '/' && route.locale.code === 'en' ? 'site-graph' : route.schemaKey;
    tags.push(schemaScript(schemaKey, schema, route.schemaVersion));
    if (route.breadcrumbKey) {
        tags.push(schemaScript(route.breadcrumbKey, breadcrumbSchema(route, canonicalUrl, origin, name), route.schemaVersion));
    }

    if (!/<\/head>/i.test(cleaned)) {
        throw new Error('Static SEO shell is missing </head>: ' + route.file);
    }
    return cleaned.replace(/<\/head>/i, '    ' + tags.join('\n    ') + '\n</head>');
}

module.exports = {
    STATIC_SEO_PAGES,
    staticSeoRouteDefinitions,
    renderStaticPageSeoHtml
};
