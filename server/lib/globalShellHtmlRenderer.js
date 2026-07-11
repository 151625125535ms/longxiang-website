'use strict';

const HYDRATION_ASSET_VERSION = '20260711-stage2c-final';

function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function localized(item, key, locale, fallback) {
    if (!item) return fallback || '';
    const suffix = locale === 'en' ? '' : locale.charAt(0).toUpperCase() + locale.slice(1);
    const value = suffix && item[key + suffix] != null ? item[key + suffix] : item[key];
    return value == null || value === '' ? (fallback || '') : value;
}

function localizedHref(href, locale, extra) {
    href = String(href || 'index.html');
    if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) return href + (extra || '');
    const parts = href.split('#');
    const queryParts = parts[0].split('?');
    const clean = queryParts[0].replace(/^\.\//, '').replace(/^\/+/, '');
    const prefix = locale === 'en' ? '/' : '/' + locale + '/';
    const path = clean === 'index.html' && locale === 'en' ? '/' : prefix + clean;
    const existing = queryParts[1] ? '?' + queryParts[1] : '';
    const appended = extra ? (extra.charAt(0) === '?' || extra.charAt(0) === '#' ? extra : '#' + extra) : '';
    return path + existing + (parts[1] ? '#' + parts[1] : '') + appended;
}

function currentPage(pathname) {
    const clean = String(pathname || '/').split('?')[0].replace(/\/+$/, '');
    if (/\/(?:ar\/|fr\/|ru\/)?products\/[^/]+$/i.test(clean)) return 'product-detail.html';
    return clean.split('/').pop() || 'index.html';
}

function itemActive(item, pathname) {
    const page = currentPage(pathname);
    const own = String(item.href || 'index.html').split(/[?#]/)[0].split('/').pop() || 'index.html';
    const pages = Array.isArray(item.activePages) ? item.activePages : [own];
    return pages.indexOf(page) !== -1 || (item.children || []).some(function (child) { return itemActive(child, pathname); });
}

function linkHtml(item, locale, className) {
    const label = localized(item, 'label', locale, '');
    if (!label) return '';
    const href = localizedHref(item.href || 'index.html', locale, item.search || item.hash || '');
    return '<a href="' + escapeHtml(href) + '"' + (className ? ' class="' + escapeHtml(className) + '"' : '') + '>' + escapeHtml(label) + '</a>';
}

function navItemHtml(item, locale, pathname) {
    const children = Array.isArray(item.children) ? item.children : [];
    const active = itemActive(item, pathname);
    let link = linkHtml(item, locale, active ? 'active' : '');
    if (children.length) link = link.replace('<a ', '<a aria-expanded="false" ');
    let html = '<div class="nav-item' + (children.length ? ' has-dropdown' : '') + '">' + link;
    if (children.length) html += '<div class="nav-dropdown">' + children.map(function (child) { return linkHtml(child, locale, ''); }).join('') + '</div>';
    return html + '</div>';
}

function socialHtml(company) {
    const icons = {
        instagram: '<svg class="social-brand-icon instagram-brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect class="instagram-glyph" x="5" y="5" width="14" height="14" rx="4"></rect><circle class="instagram-glyph" cx="12" cy="12" r="3.2"></circle><circle class="instagram-dot" cx="16.8" cy="7.2" r="1.05"></circle></svg>',
        youtube: '<svg class="social-brand-icon youtube-brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect class="youtube-back" x="3" y="6.5" width="18" height="11" rx="3.2"></rect><path class="youtube-play" d="M10.4 9.4L15.2 12l-4.8 2.6z"></path></svg>'
    };
    const links = ['instagram', 'youtube', 'tiktok'].map(function (key) {
        const href = String(company[key] || '').trim();
        if (!/^https?:\/\//i.test(href)) return '';
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        return '<a class="messenger-link ' + key + (icons[key] ? ' is-icon' : '') + '" href="' + escapeHtml(href) + '" target="_blank" rel="noopener" aria-label="' + label + '" title="' + label + '" data-track-event="click_' + key + '">' + (icons[key] || escapeHtml(label)) + (icons[key] ? '<span class="sr-only">' + label + '</span>' : '') + '</a>';
    }).join('');
    return links || '<div class="wechat-placeholder"><strong>TikTok / Line / YouTube</strong><span>To be updated</span></div>';
}

function footerHtml(body, company, locale) {
    const nav = body.navigation || {};
    const inquiry = body.inquiry || {};
    const quick = (nav.quickLinks || []).map(function (item) { return linkHtml(item, locale, ''); }).join('');
    const products = (nav.productLinks || []).map(function (item) { return linkHtml(item, locale, ''); }).join('');
    return '<div class="footer-company">' +
        '<div class="footer-brand"><a href="' + escapeHtml(localizedHref('index.html', locale)) + '" class="nav-logo"><span class="nav-logo-text">LONG<span>XIANG</span></span></a><p>' + escapeHtml(localized(body.footer || {}, 'text', locale, '')) + '</p></div>' +
        '<div class="footer-contact-item" data-company-contact="email"><span class="icon">&#9993;</span><span class="footer-contact-value">' + escapeHtml(company.email) + '</span></div>' +
        '<div class="footer-contact-item" data-company-contact="address"><span class="icon">&#8982;</span><span class="footer-contact-value">' + escapeHtml(company.address) + '</span></div>' +
        '<div class="messenger-links" data-communication-links>' + socialHtml(company) + '</div></div>' +
        '<div class="footer-navigation"><div class="footer-column"><h4>' + escapeHtml(localized(nav, 'quickTitle', locale, '')) + '</h4><div class="footer-links">' + quick + '<button type="button" class="footer-cookie-settings" data-cookie-settings>' + escapeHtml(localized(nav, 'cookieSettingsLabel', locale, '')) + '</button></div></div>' +
        '<div class="footer-column"><h4>' + escapeHtml(localized(nav, 'productsTitle', locale, '')) + '</h4><div class="footer-links">' + products + '</div></div></div>' +
        '<div class="footer-conversion footer-column"><h4>' + escapeHtml(localized(inquiry, 'title', locale, '')) + '</h4><p class="footer-conversion-text">' + escapeHtml(localized(inquiry, 'text', locale, '')) + '</p>' +
        '<form class="footer-quote-form" data-inquiry-form><input type="hidden" name="name" value="' + escapeHtml(localized(inquiry, 'hiddenName', locale, '')) + '"><input type="hidden" name="subject" value="quote"><input type="hidden" name="productContext" value="' + escapeHtml(localized(inquiry, 'productContext', locale, '')) + '"><textarea name="message" rows="4" placeholder="' + escapeHtml(localized(inquiry, 'messagePlaceholder', locale, '')) + '" required></textarea><div class="footer-quote-row"><input type="email" name="email" placeholder="' + escapeHtml(localized(inquiry, 'emailPlaceholder', locale, '')) + '" required><input type="text" name="phone" placeholder="' + escapeHtml(localized(inquiry, 'phonePlaceholder', locale, '')) + '"></div><button type="submit">' + escapeHtml(localized(inquiry, 'submitLabel', locale, '')) + '</button><div class="form-status" aria-live="polite"></div></form></div>';
}

function versionHydrationScripts(html) {
    return String(html || '').replace(/(<script\b[^>]*\bsrc=)(["'])(?:\.\.\/|\.\/|\/)?js\/(main|content-pages|products-list|product-detail)\.js(?:\?[^"']*)?\2/gi, function (_, prefix, quote, name) {
        return prefix + quote + '/js/' + name + '.js?v=' + HYDRATION_ASSET_VERSION + quote;
    });
}

function renderGlobalShellHtml(html, options) {
    const shell = options.shell || {};
    const body = shell.body || {};
    const version = shell.version || 1;
    const locale = options.locale || 'en';
    const nav = ((body.navigation || {}).mainLinks || []).map(function (item) { return navItemHtml(item, locale, options.pathname); }).join('');
    let output = String(html).replace(/<div class="nav-links"[^>]*>\s*<\/div>/i, '<div class="nav-links" aria-live="polite" data-ssr-shell="true" data-shell-version="' + escapeHtml(version) + '" data-company-version="' + escapeHtml((options.company || {}).version || 1) + '">' + nav + '</div>');
    output = output.replace(/<div class="footer-grid"[^>]*>\s*<\/div>\s*<div class="footer-bottom">/i, '<div class="footer-grid" aria-live="polite" data-ssr-shell="true" data-shell-version="' + escapeHtml(version) + '" data-company-version="' + escapeHtml((options.company || {}).version || 1) + '">' + footerHtml(body, options.company || {}, locale) + '</div><div class="footer-bottom">');
    if (!output.includes('data-ssr-shell="true"')) throw new Error('HTML shell is missing empty SSR shell placeholders.');
    output = output.replace(/(<div class="footer-bottom"><p>)[\s\S]*?(<\/p>)/i, '$1' + escapeHtml(localized(body.footer || {}, 'copyright', locale, '')) + '$2');
    return versionHydrationScripts(output);
}

module.exports = { renderGlobalShellHtml, versionHydrationScripts, localizedHref, escapeHtml, localized };
