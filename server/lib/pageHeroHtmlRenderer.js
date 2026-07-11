'use strict';

function safeHeroAsset(value, locale) {
    value = String(value || '').trim().replace(/\\/g, '/');
    if (!value || /[\u0000-\u001f\u007f&<>"'();]/.test(value) || /^\/\//.test(value)) return '';
    if (/^https:\/\//i.test(value) || (value.charAt(0) === '/' && value.charAt(1) !== '/')) return value;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';
    return (locale === 'en' ? '' : '../') + value.replace(/^\/+|^\.\.\//g, '');
}

function setBackgroundStyle(tag, asset) {
    const declaration = "background-image: url('" + asset + "');";
    const match = tag.match(/\sstyle\s*=\s*(["'])(.*?)\1/i);
    if (!match) return tag.replace(/>$/, ' style="' + declaration + '">');
    const style = match[2].replace(/(?:^|;)\s*background-image\s*:[^;]*(?:;|$)/i, ';').replace(/^;+|;+$/g, '').trim();
    return tag.replace(match[0], ' style="' + (style ? style + '; ' : '') + declaration + '"');
}

function renderHeroBackgroundHtml(html, options) {
    options = options || {};
    const locale = String(options.locale && options.locale.code || options.locale || 'en');
    const className = String(options.className || 'page-hero');
    const asset = safeHeroAsset(options.backgroundImage, locale);
    if (!asset) return String(html || '');
    const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('<([a-z][a-z0-9:-]*)\\b[^>]*\\bclass\\s*=\\s*(["\'])[^"\']*\\b' + escapedClass + '\\b[^"\']*\\2[^>]*>', 'i');
    if (!pattern.test(html)) throw new Error('Missing Hero marker: ' + className);
    return String(html).replace(pattern, function (tag) { return setBackgroundStyle(tag, asset); });
}

module.exports = { renderHeroBackgroundHtml, safeHeroAsset };
