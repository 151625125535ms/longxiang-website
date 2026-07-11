'use strict';

const presentation = require('../../js/product-page-presentation');
const { findElementRange } = require('./contentPageHtmlRenderer');
const { renderHeroBackgroundHtml } = require('./pageHeroHtmlRenderer');

function escapeAttribute(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function setAttribute(tag, name, value) {
    const escaped = escapeAttribute(value);
    const pattern = new RegExp('\\s' + name + '\\s*=\\s*(["\']).*?\\1', 'i');
    if (pattern.test(tag)) return tag.replace(pattern, ' ' + name + '="' + escaped + '"');
    return tag.replace(/>$/, ' ' + name + '="' + escaped + '">');
}

function addClass(tag, className) {
    const match = tag.match(/\sclass\s*=\s*(["'])(.*?)\1/i);
    if (!match) return setAttribute(tag, 'class', className);
    const classes = match[2].split(/\s+/).filter(Boolean);
    if (classes.indexOf(className) === -1) classes.push(className);
    return tag.replace(match[0], ' class="' + escapeAttribute(classes.join(' ')) + '"');
}

function addArabicTextAttributes(tag) {
    tag = setAttribute(tag, 'dir', 'rtl');
    tag = setAttribute(tag, 'lang', 'ar');
    return addClass(tag, 'rtl-product-text');
}

function replaceElement(html, attribute, value, innerHtml, mutateOpenTag) {
    const range = findElementRange(html, attribute, value);
    if (!range) throw new Error('Missing product detail SSR marker: ' + attribute + (value == null ? '' : '=' + value));
    const openTag = mutateOpenTag ? mutateOpenTag(range.openTag) : range.openTag;
    return html.slice(0, range.openStart) + openTag + innerHtml + html.slice(range.closeStart);
}

function injectScripts(html, bootstrap) {
    const pattern = /<script\b[^>]*src=(["'])[^"']*product-detail\.js[^"']*\1[^>]*><\/script>/i;
    if (!pattern.test(html)) throw new Error('Missing product-detail.js script marker');
    let scripts = '';
    if (!/content-presentation-i18n\.js/i.test(html)) scripts += '<script src="/js/content-presentation-i18n.js?v=20260711"></script>\n    ';
    if (!/content-page-presentation\.js/i.test(html)) scripts += '<script src="/js/content-page-presentation.js?v=20260711"></script>\n    ';
    if (!/product-presentation-i18n\.js/i.test(html)) scripts += '<script src="/js/product-presentation-i18n.js?v=20260711"></script>\n    ';
    if (!/product-page-presentation\.js/i.test(html)) scripts += '<script src="/js/product-page-presentation.js?v=20260711"></script>\n    ';
    scripts += '<script type="application/json" id="product-detail-bootstrap">' + presentation.serializeBootstrap(bootstrap) + '</script>\n    ';
    return html.replace(pattern, scripts + '$&');
}

function renderProductDetailBodyHtml(html, options) {
    options = options || {};
    const locale = String(options.locale && options.locale.code || options.locale || 'en');
    const product = options.product;
    const block = options.contentBlock;
    if (!product) throw new Error('Missing public product');
    if (!block || !block.body) throw new Error('Missing product-pages content block');
    const view = presentation.presentDetail({ locale, product, products: options.products, contentBlock: block, contentVersion: block.version || 0 });
    let rendered = String(html || '');
    rendered = renderHeroBackgroundHtml(rendered, { locale, backgroundImage: block.body.detailHero && block.body.detailHero.backgroundImage });
    const mainRange = findElementRange(rendered, 'data-product-page-kind', 'detail');
    rendered = replaceElement(rendered, 'data-product-page-kind', 'detail', rendered.slice(mainRange.openEnd, mainRange.closeStart), function (tag) {
        tag = setAttribute(tag, 'data-product-ssr', 'detail');
        tag = setAttribute(tag, 'data-product-view-key', view.key);
        tag = setAttribute(tag, 'data-product-locale', locale);
        tag = setAttribute(tag, 'data-product-id', product.id || '');
        tag = setAttribute(tag, 'data-product-content-version', String(block.version || 0));
        return tag;
    });
    const arabicTag = locale === 'ar' ? addArabicTextAttributes : null;
    rendered = replaceElement(rendered, 'id', 'breadcrumb-product', escapeAttribute(view.hero.breadcrumb), arabicTag);
    rendered = replaceElement(rendered, 'id', 'page-title', escapeAttribute(view.hero.title), arabicTag);
    rendered = replaceElement(rendered, 'id', 'page-subtitle', escapeAttribute(view.hero.subtitle), arabicTag);
    rendered = replaceElement(rendered, 'id', 'product-title', view.fragments.title, arabicTag);
    rendered = replaceElement(rendered, 'id', 'product-desc', view.fragments.description, arabicTag);
    rendered = replaceElement(rendered, 'data-product-decision-summary', null, view.fragments.decision);
    rendered = replaceElement(rendered, 'data-product-applications', null, view.fragments.applications);
    rendered = replaceElement(rendered, 'data-product-selection', null, view.fragments.selection);
    rendered = replaceElement(rendered, 'data-product-specs-title', null, view.fragments.specsTitle);
    rendered = replaceElement(rendered, 'id', 'specs-body', view.fragments.specs);
    rendered = replaceElement(rendered, 'data-product-detail-support', null, view.fragments.support);
    rendered = replaceElement(rendered, 'data-product-detail-faq', null, view.fragments.faq);
    rendered = replaceElement(rendered, 'data-product-related', null, view.fragments.related, function (tag) {
        if (view.fragments.related) return tag.replace(/\s+hidden(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/i, '');
        return /\shidden(?:\s|=|>)/i.test(tag) ? tag : tag.replace(/>$/, ' hidden>');
    });
    rendered = replaceElement(rendered, 'data-product-detail-inquiry', null, view.fragments.inquiry);
    rendered = rendered.replace(/<img\b[^>]*id=["']main-product-image["'][^>]*>/i, function (tag) {
        tag = setAttribute(tag, 'src', view.image.src);
        tag = setAttribute(tag, 'alt', view.image.alt);
        tag = setAttribute(tag, 'width', String(view.image.width));
        tag = setAttribute(tag, 'height', String(view.image.height));
        tag = setAttribute(tag, 'loading', 'eager');
        tag = setAttribute(tag, 'decoding', 'async');
        return setAttribute(tag, 'fetchpriority', 'high');
    });
    return injectScripts(rendered, view.bootstrap);
}

module.exports = { renderProductDetailBodyHtml };
