'use strict';

const presentation = require('../../js/content-page-presentation');

const SUPPORTED = new Set(presentation.SUPPORTED_PAGES);
const HOME_MARKERS = Object.freeze({
    applications: 'data-home-applications',
    news: 'data-home-news',
    trust: 'data-home-trust',
    features: 'data-home-features',
    stats: 'data-home-stats',
    cta: 'data-home-cta'
});

function findElementRange(html, attribute, value) {
    const escapedAttribute = String(attribute).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedValue = value == null ? null : String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escapedValue == null
        ? new RegExp('<([a-z][a-z0-9:-]*)\\b[^>]*\\b' + escapedAttribute + '(?:\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s>]+))?[^>]*>', 'i')
        : new RegExp('<([a-z][a-z0-9:-]*)\\b[^>]*\\b' + escapedAttribute + '\\s*=\\s*(["\'])' + escapedValue + '\\2[^>]*>', 'i');
    const match = pattern.exec(html);
    if (!match) return null;
    const tag = match[1].toLowerCase();
    const openStart = match.index;
    const openEnd = openStart + match[0].length;
    const tokenPattern = new RegExp('<\\/?' + tag + '\\b[^>]*>', 'ig');
    tokenPattern.lastIndex = openEnd;
    let depth = 1;
    let token;
    while ((token = tokenPattern.exec(html))) {
        if (/^<\//.test(token[0])) depth -= 1;
        else if (!/\/>$/.test(token[0])) depth += 1;
        if (depth === 0) {
            return { openStart, openEnd, closeStart: token.index, closeEnd: token.index + token[0].length, openTag: match[0] };
        }
    }
    return null;
}

function findElementRangeByClass(html, className) {
    const escaped = String(className).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('<([a-z][a-z0-9:-]*)\\b[^>]*\\bclass\\s*=\\s*(["\'])[^"\']*\\b' + escaped + '\\b[^"\']*\\2[^>]*>', 'i');
    const match = pattern.exec(html);
    if (!match) return null;
    const tag = match[1].toLowerCase();
    const openStart = match.index;
    const openEnd = openStart + match[0].length;
    const tokenPattern = new RegExp('<\\/?' + tag + '\\b[^>]*>', 'ig');
    tokenPattern.lastIndex = openEnd;
    let depth = 1;
    let token;
    while ((token = tokenPattern.exec(html))) {
        if (/^<\//.test(token[0])) depth -= 1;
        else if (!/\/>$/.test(token[0])) depth += 1;
        if (depth === 0) return { openStart, openEnd, closeStart: token.index, closeEnd: token.index + token[0].length, openTag: match[0] };
    }
    return null;
}

function replaceClassInnerHtml(html, className, innerHtml) {
    const range = findElementRangeByClass(html, className);
    if (!range) return html;
    return html.slice(0, range.openEnd) + innerHtml + html.slice(range.closeStart);
}

function replaceElementInnerHtml(html, attribute, value, innerHtml, mutateOpenTag) {
    const range = findElementRange(html, attribute, value);
    if (!range) throw new Error('Missing content page marker: ' + attribute + (value == null ? '' : '=' + value));
    const openTag = typeof mutateOpenTag === 'function' ? mutateOpenTag(range.openTag) : range.openTag;
    return html.slice(0, range.openStart) + openTag + innerHtml + html.slice(range.closeStart);
}

function setAttribute(tag, name, value) {
    const escaped = presentation.escapeHtml(value);
    const pattern = new RegExp('\\s' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=\\s*(["\']).*?\\1', 'i');
    if (pattern.test(tag)) return tag.replace(pattern, ' ' + name + '="' + escaped + '"');
    return tag.replace(/>$/, ' ' + name + '="' + escaped + '">');
}

function markContentTag(tag, options) {
    return [
        ['data-ssr-content', options.slug],
        ['data-content-slug', options.slug],
        ['data-content-locale', options.locale],
        ['data-content-version', String(options.version || 0)],
        ['data-content-renderer-version', '1']
    ].reduce(function (out, entry) { return setAttribute(out, entry[0], entry[1]); }, tag);
}

function injectPresentationScript(html) {
    if (/content-page-presentation\.js/i.test(html)) return html;
    const script = '<script src="js/content-page-presentation.js?v=20260711"></script>\n    ';
    const pattern = /<script\b[^>]*src=(["'])[^"']*content-pages\.js[^"']*\1[^>]*><\/script>/i;
    if (!pattern.test(html)) throw new Error('Missing content-pages.js script marker');
    return html.replace(pattern, script + '$&');
}

function patchHome(html, body, options) {
    const patches = presentation.renderHomeSections(body, { locale: options.locale });
    html = replaceElementInnerHtml(html, 'data-content-page', 'home',
        findElementRange(html, 'data-content-page', 'home')
            ? html.slice(findElementRange(html, 'data-content-page', 'home').openEnd, findElementRange(html, 'data-content-page', 'home').closeStart)
            : '',
        function (tag) { return markContentTag(tag, options); });

    const productRange = findElementRange(html, 'data-home-products', null);
    if (productRange) {
        const productHtml = html.slice(productRange.openEnd, productRange.closeStart);
        let patchedProductHtml = productHtml;
        const headerRange = findElementRangeByClass(productHtml, 'section-header');
        if (headerRange && patches.productsHeader) {
            patchedProductHtml = productHtml.slice(0, headerRange.openStart) + headerRange.openTag + patches.productsHeader.replace(/^<div class="section-header">|<\/div>$/g, '') + productHtml.slice(headerRange.closeStart);
        }
        if (patches.productsButton) {
            patchedProductHtml = patchedProductHtml.replace(/(<a\b[^>]*class=["'][^"']*\ball-products-btn\b[^"']*["'][^>]*)(>)[\s\S]*?(<\/a>)/i, function (_, tag, close, end) {
                tag = setAttribute(tag + '>', 'href', patches.productsButton.href).replace(/>$/, '');
                return tag + close + presentation.escapeHtml(patches.productsButton.label) + end;
            });
        }
        html = html.slice(0, productRange.openEnd) + patchedProductHtml + html.slice(productRange.closeStart);
    }

    Object.keys(HOME_MARKERS).forEach(function (key) {
        if (!findElementRange(html, HOME_MARKERS[key], null)) return;
        html = replaceElementInnerHtml(html, HOME_MARKERS[key], null, patches[key] || '', function (tag) {
            if ((key === 'applications' || key === 'news') && patches[key + 'Hidden'] && !/\shidden(?:\s|=|>)/i.test(tag)) {
                return tag.replace(/>$/, ' hidden>');
            }
            return tag;
        });
    });
    return html;
}

function renderContentPageHtml(html, options) {
    options = options || {};
    const slug = String(options.slug || '');
    const locale = String(options.locale && options.locale.code || options.locale || 'en');
    const block = options.block;
    if (!SUPPORTED.has(slug)) throw new Error('Unsupported content page: ' + slug);
    if (!block || !block.body) throw new Error('Missing published content block: ' + slug);
    const config = { slug, locale, version: block.version || 0 };
    let rendered = String(html || '');
    const hero = presentation.renderHeroFragments(slug, block.body, { locale });
    if (hero.title) rendered = rendered.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i, '$1' + presentation.escapeHtml(hero.title) + '$2');
    if (hero.subtitle) rendered = rendered.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>\s*<p\b[^>]*>)[\s\S]*?(<\/p>)/i, '$1' + presentation.escapeHtml(hero.subtitle) + '$2');
    if (hero.kicker && slug === 'about-us') rendered = replaceClassInnerHtml(rendered, 'section-kicker', presentation.escapeHtml(hero.kicker));
    if (slug === 'home') {
        rendered = replaceClassInnerHtml(rendered, 'hero-hex-actions', hero.actionsHtml);
        rendered = replaceClassInnerHtml(rendered, 'hero-proof-strip', hero.proofHtml);
    } else if (slug === 'about-us') {
        rendered = replaceClassInnerHtml(rendered, 'about-hero-actions', hero.actionsHtml);
    }
    if (slug === 'home') {
        rendered = patchHome(rendered, block.body, config);
    } else {
        const bodyHtml = presentation.renderPageBody(slug, block.body, { locale });
        rendered = replaceElementInnerHtml(rendered, 'data-content-page', slug, bodyHtml, function (tag) {
            return markContentTag(tag, config);
        });
    }
    return injectPresentationScript(rendered);
}

module.exports = {
    findElementRange,
    renderContentPageHtml
};
