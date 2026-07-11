'use strict';

const presentation = require('../../js/product-page-presentation');
const { findElementRange } = require('./contentPageHtmlRenderer');
const { renderHeroBackgroundHtml } = require('./pageHeroHtmlRenderer');
const {
    SITE_ENTITY_IDS,
    entityReference,
    pageEntityId
} = require('./siteEntityGraph');

function replaceRange(html, range, innerHtml, openTag) {
    if (!range) throw new Error('Missing product list SSR marker');
    return html.slice(0, range.openStart) + (openTag || range.openTag) + innerHtml + html.slice(range.closeStart);
}

function replaceByAttribute(html, attribute, value, innerHtml, mutateOpenTag) {
    const range = findElementRange(html, attribute, value);
    return replaceRange(html, range, innerHtml, mutateOpenTag ? mutateOpenTag(range.openTag) : range.openTag);
}

function setAttribute(tag, name, value) {
    const escaped = String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const pattern = new RegExp('\\s' + name + '\\s*=\\s*(["\']).*?\\1', 'i');
    if (pattern.test(tag)) return tag.replace(pattern, ' ' + name + '="' + escaped + '"');
    return tag.replace(/>$/, ' ' + name + '="' + escaped + '">');
}

function injectScripts(html, bootstrap) {
    if (!/product-presentation-i18n\.js/i.test(html)) {
        const scripts = '<script src="/js/content-presentation-i18n.js?v=20260711"></script>\n    <script src="/js/content-page-presentation.js?v=20260711"></script>\n    <script src="/js/product-presentation-i18n.js?v=20260711"></script>\n    <script src="/js/product-page-presentation.js?v=20260711"></script>\n    ';
        const pattern = /<script\b[^>]*src=(["'])[^"']*products-list\.js[^"']*\1[^>]*><\/script>/i;
        if (!pattern.test(html)) throw new Error('Missing products-list.js script marker');
        html = html.replace(pattern, scripts + '$&');
    }
    const payload = '<script type="application/json" id="product-catalog-bootstrap">' + presentation.serializeBootstrap(bootstrap) + '</script>\n    ';
    return html.replace(/<script\b[^>]*src=(["'])[^"']*product-presentation-i18n\.js[^"']*\1/i, payload + '$&');
}

function renderProductListSchemaHtml(html, required) {
    let found = false;
    const rendered = String(html || '').replace(
        /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
        function (full, jsonText) {
            let schema;
            try {
                schema = JSON.parse(jsonText);
            } catch (err) {
                return full;
            }
            const types = Array.isArray(schema && schema['@type']) ? schema['@type'] : [schema && schema['@type']];
            if (types.indexOf('CollectionPage') === -1) return full;
            const canonicalUrl = String(schema.url || '').trim();
            if (!canonicalUrl) throw new Error('Product list CollectionPage schema is missing url');
            schema['@id'] = pageEntityId(canonicalUrl);
            schema.isPartOf = entityReference(SITE_ENTITY_IDS.website);
            found = true;
            return '<script type="application/ld+json" data-schema-auto="product-list-page">'
                + JSON.stringify(schema).replace(/</g, '\\u003c')
                + '</script>';
        }
    );
    if (!found && required) throw new Error('Missing product list CollectionPage schema');
    return rendered;
}

function renderProductListHtml(html, options) {
    options = options || {};
    const locale = String(options.locale && options.locale.code || options.locale || 'en');
    const contentBlock = options.contentBlock;
    if (!contentBlock || !contentBlock.body) throw new Error('Missing product-pages content block');
    const view = presentation.presentCatalog({
        locale,
        products: options.products,
        taxonomy: options.taxonomy,
        query: options.query,
        contentBlock,
        contentVersion: contentBlock.version || 0
    });
    let rendered = renderProductListSchemaHtml(html, Boolean(options.requireSeoSchema));
    rendered = renderHeroBackgroundHtml(rendered, { locale, backgroundImage: contentBlock.body.productsHero && contentBlock.body.productsHero.backgroundImage });
    rendered = replaceByAttribute(rendered, 'data-content-page', 'product-pages',
        rendered.slice(findElementRange(rendered, 'data-content-page', 'product-pages').openEnd, findElementRange(rendered, 'data-content-page', 'product-pages').closeStart),
        function (tag) {
            tag = setAttribute(tag, 'data-product-ssr', 'catalog');
            tag = setAttribute(tag, 'data-product-view-key', view.key);
            tag = setAttribute(tag, 'data-product-locale', locale);
            tag = setAttribute(tag, 'data-product-content-version', String(contentBlock.version || 0));
            return tag;
        });
    rendered = replaceByAttribute(rendered, 'class', 'product-tree-body', view.fragments.tree);
    rendered = replaceByAttribute(rendered, 'id', 'catalog-title', view.fragments.title);
    rendered = replaceByAttribute(rendered, 'id', 'catalog-summary', view.fragments.summary);
    rendered = replaceByAttribute(rendered, 'id', 'catalog-current-filter', view.fragments.filterCurrent);
    rendered = rendered.replace(/(<div\b[^>]*class=["'][^"']*\bcatalog-filter-status\b[^"']*["'][^>]*)\s+hidden(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/i, '$1');
    rendered = replaceByAttribute(rendered, 'id', 'products-container', view.fragments.cards);
    rendered = replaceByAttribute(rendered, 'class', 'catalog-pagination', view.fragments.pagination);
    rendered = replaceByAttribute(rendered, 'data-product-listing-support', null, view.fragments.support);
    rendered = replaceByAttribute(rendered, 'data-product-listing-cta', null, view.fragments.cta);
    rendered = rendered.replace(/(<input\b[^>]*id=["']catalog-search["'][^>]*)(>)/i, function (_, tag, close) { return setAttribute(tag + close, 'value', view.state.search); });
    return injectScripts(rendered, view.bootstrap);
}

module.exports = { renderProductListHtml, renderProductListSchemaHtml };
