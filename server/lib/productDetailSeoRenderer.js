'use strict';

const { localeEntries } = require('./i18nRoutes');
const {
    buildPageEntity,
    buildBreadcrumbEntity,
    standaloneSchema
} = require('./siteEntityGraph');

const PRODUCT_LABELS = {
    en: 'Products',
    ar: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
    fr: 'Produits',
    ru: '\u041f\u0440\u043e\u0434\u0443\u043a\u0446\u0438\u044f'
};
const TITLE_SUFFIX = 'Henan Longxiang Electric Co., Ltd.';

function localeFieldSuffix(localeCode) {
    localeCode = String(localeCode || '').trim().toLowerCase();
    if (!localeCode || localeCode === 'en') return '';
    return localeCode.charAt(0).toUpperCase() + localeCode.slice(1);
}

function localizedProductValue(product, baseField, localeCode) {
    if (!product || !baseField) return '';
    const suffix = localeFieldSuffix(localeCode);
    const localizedKey = suffix ? baseField + suffix : '';
    const localized = localizedKey ? product[localizedKey] : '';
    return String(localized || product[baseField] || '').trim();
}

function productPublicIdentifier(product) {
    return String(product && (product.slug || product.id) || '').trim();
}

function localizedProductPath(product, locale) {
    const id = encodeURIComponent(productPublicIdentifier(product));
    return locale.pathPrefix + '/products/' + id;
}

function productCanonicalUrls(product, localeEntriesList, origin) {
    return localeEntriesList.reduce(function (acc, locale) {
        acc[locale.code] = origin + localizedProductPath(product, locale);
        return acc;
    }, {});
}

function clipSeoText(value, maxLength) {
    const textValue = String(value || '').replace(/\s+/g, ' ').trim();
    const chars = Array.from(textValue);
    if (chars.length <= maxLength) return textValue;
    const clipped = chars.slice(0, Math.max(0, maxLength - 3)).join('').replace(/[\s,;:.-]+\S*$/, '').trim();
    return (clipped || chars.slice(0, Math.max(0, maxLength - 3)).join('').trim()) + '...';
}

function cleanSeoTitle(value) {
    const textValue = String(value || '').replace(/\s+/g, ' ').trim();
    const maxLength = 90;
    if (Array.from(textValue).length <= maxLength) return textValue;
    const separator = ' | ';
    const index = textValue.lastIndexOf(separator);
    if (index > 0) {
        const suffix = textValue.slice(index + separator.length);
        const suffixLength = Array.from(suffix).length + separator.length;
        if (suffixLength < maxLength - 24) {
            return clipSeoText(textValue.slice(0, index), maxLength - suffixLength) + separator + suffix;
        }
    }
    return clipSeoText(textValue, maxLength);
}

function cleanMetaDescription(value) {
    const textValue = String(value || '').replace(/\s+/g, ' ').trim();
    if (textValue.length <= 165) return textValue;
    const clipped = textValue.slice(0, 162).replace(/[\s,;:.-]+[^\s,;:.-]*$/, '');
    return (clipped || textValue.slice(0, 162)).trim() + '...';
}

function productSeoTitle(product, localeCode) {
    const seoTitle = localeCode === 'ar' ? '' : localizedProductValue(product, 'seoTitle', localeCode);
    if (seoTitle) return cleanSeoTitle(seoTitle);
    const name = localizedProductValue(product, 'name', localeCode) || localizedProductValue(product, 'name', 'en');
    return cleanSeoTitle(name ? name + ' | ' + TITLE_SUFFIX : TITLE_SUFFIX);
}

function productSeoDescription(product, localeCode) {
    const candidates = [
        localeCode === 'ar' ? '' : localizedProductValue(product, 'seoDescription', localeCode),
        localizedProductValue(product, 'shortDesc', localeCode),
        localizedProductValue(product, 'description', localeCode),
        product && product.shortDesc,
        product && product.description
    ];
    return cleanMetaDescription(candidates.find(function (value) {
        return String(value || '').trim();
    }) || '');
}

function absoluteUrl(value, origin) {
    const textValue = String(value || '').trim().replace(/\\/g, '/');
    if (!textValue || /^data:|^blob:/i.test(textValue)) return '';
    if (/^https?:\/\//i.test(textValue)) return textValue;
    if (/^\/\//.test(textValue)) return 'https:' + textValue;
    try {
        return new URL(textValue.replace(/^\/+/, ''), origin + '/').href;
    } catch (err) {
        return '';
    }
}

function productPageJsonLd(product, localeCode, canonicalUrl, origin) {
    const name = localizedProductValue(product, 'name', localeCode) || localizedProductValue(product, 'name', 'en');
    const description = productSeoDescription(product, localeCode);
    const image = absoluteUrl(product && product.image, origin);
    return standaloneSchema(buildPageEntity({
        type: 'WebPage',
        canonicalUrl,
        name,
        description,
        language: localeCode,
        primaryImageOfPage: image
    }));
}

function productBreadcrumbJsonLd(product, localeCode, canonicalUrl, origin) {
    const locale = localeEntries().find(function (entry) {
        return entry.code === localeCode;
    }) || localeEntries()[0];
    const productName = localizedProductValue(product, 'name', localeCode) || localizedProductValue(product, 'name', 'en');
    return standaloneSchema(buildBreadcrumbEntity({
        canonicalUrl,
        items: [
            {
                '@type': 'ListItem',
                position: 1,
                name: PRODUCT_LABELS[localeCode] || PRODUCT_LABELS.en,
                item: origin + locale.pathPrefix + '/products.html'
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: productName,
                item: canonicalUrl
            }
        ]
    }));
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

function metaTag(name, property, content) {
    if (!content) return '';
    const key = property ? 'property="' + htmlEscape(property) + '"' : 'name="' + htmlEscape(name) + '"';
    return '<meta ' + key + ' content="' + htmlEscape(content) + '">';
}

function linkTag(rel, attrs) {
    const attrText = Object.keys(attrs || {}).map(function (key) {
        return key + '="' + htmlEscape(attrs[key]) + '"';
    }).join(' ');
    return '<link rel="' + htmlEscape(rel) + '" ' + attrText + '>';
}

function stripManagedHeadTags(html) {
    return html
        .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>\s*/gi, '')
        .replace(/<link\b[^>]*rel=["']alternate["'][^>]*>\s*/gi, '')
        .replace(/<meta\b[^>]*(?:name|property)=["']description["'][^>]*>\s*/gi, '')
        .replace(/<meta\b[^>]*(?:name|property)=["']og:[^"']+["'][^>]*>\s*/gi, '')
        .replace(/<meta\b[^>]*(?:name|property)=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
        .replace(/<script\b[^>]*data-schema-auto=["']product["'][^>]*>[\s\S]*?<\/script>\s*/gi, '')
        .replace(/<script\b[^>]*data-schema-auto=["']product-page["'][^>]*>[\s\S]*?<\/script>\s*/gi, '')
        .replace(/<script\b[^>]*data-schema-auto=["']product-breadcrumb["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
}

function renderProductDetailSeoHtml(html, product, locale, origin) {
    const localeCode = locale && locale.code || 'en';
    const entries = localeEntries().filter(function (entry) {
        return entry.includeInSitemap;
    });
    const defaultLocale = entries.find(function (entry) {
        return !entry.pathPrefix;
    }) || entries[0];
    const urls = productCanonicalUrls(product, entries, origin);
    const canonicalUrl = urls[localeCode] || urls[defaultLocale.code] || urls.en;
    const title = productSeoTitle(product, localeCode);
    const description = productSeoDescription(product, localeCode);
    const image = absoluteUrl(product && product.image, origin);
    const pageSchema = productPageJsonLd(product, localeCode, canonicalUrl, origin);
    const breadcrumbSchema = productBreadcrumbJsonLd(product, localeCode, canonicalUrl, origin);

    const seoTags = [
        '<title>' + htmlEscape(title) + '</title>',
        metaTag('description', '', description),
        metaTag('', 'og:type', 'product'),
        metaTag('', 'og:title', title),
        metaTag('', 'og:description', description),
        metaTag('', 'og:url', canonicalUrl),
        metaTag('', 'og:image', image),
        metaTag('twitter:card', '', image ? 'summary_large_image' : 'summary'),
        metaTag('twitter:title', '', title),
        metaTag('twitter:description', '', description),
        metaTag('twitter:image', '', image),
        linkTag('canonical', { href: canonicalUrl })
    ];

    entries.forEach(function (entry) {
        seoTags.push(linkTag('alternate', { hreflang: entry.hreflang, href: urls[entry.code] }));
    });
    seoTags.push(linkTag('alternate', { hreflang: 'x-default', href: urls[defaultLocale.code] }));
    seoTags.push('<script type="application/ld+json" data-schema-auto="product-page">' + jsonScriptValue(pageSchema) + '</script>');
    seoTags.push('<script type="application/ld+json" data-schema-auto="product-breadcrumb">' + jsonScriptValue(breadcrumbSchema) + '</script>');

    const cleaned = stripManagedHeadTags(html).replace(/<title>[\s\S]*?<\/title>\s*/i, '');
    return cleaned.replace(/<\/head>/i, '    ' + seoTags.filter(Boolean).join('\n    ') + '\n</head>');
}

module.exports = {
    localizedProductValue,
    productPublicIdentifier,
    localizedProductPath,
    productCanonicalUrls,
    cleanSeoTitle,
    cleanMetaDescription,
    productSeoTitle,
    productSeoDescription,
    productPageJsonLd,
    productBreadcrumbJsonLd,
    renderProductDetailSeoHtml
};
