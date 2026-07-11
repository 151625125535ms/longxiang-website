'use strict';

const { getDb } = require('./db');
const { readCompanyIdentity, sanitizePublicContact, ensureChinaWebsiteLink } = require('./companyIdentity');

const PUBLIC_SLUGS = new Set(['home', 'solutions', 'about-us', 'contact', 'product-pages', 'global-shell', 'certifications', 'compare', 'not-found', 'applications', 'innovation', 'education', 'page-blocks']);

function parseJson(value, fallback) {
    try { return JSON.parse(value || ''); } catch (err) { return fallback; }
}

function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce(function (out, key) { out[key] = clone(value[key]); return out; }, {});
}

function merge(base, patch) {
    if (!patch || typeof patch !== 'object') return clone(patch);
    if (Array.isArray(base)) return Array.isArray(patch) ? clone(patch) : applyArrayPatch(base, patch);
    if (!base || typeof base !== 'object' || Array.isArray(patch)) return clone(patch);
    const out = clone(base);
    Object.keys(patch).forEach(function (key) { out[key] = merge(out[key], patch[key]); });
    return out;
}

function normalizedKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function patchIndex(items, key) {
    const match = /^index_(\d+)$/i.exec(String(key || ''));
    if (match) return Number(match[1]) < items.length ? Number(match[1]) : -1;
    const normalized = normalizedKey(key);
    return items.findIndex(function (item) {
        if (!item || typeof item !== 'object') return false;
        return String(item.id || '') === String(key) || item.slug === key || item.key === key || item.name === key || item.href === key || item.hash === '#' + key || normalizedKey(item.label) === normalized || normalizedKey(item.title) === normalized;
    });
}

function applyArrayPatch(items, patch) {
    const out = items.map(clone);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return out;
    Object.keys(patch).forEach(function (key) {
        const index = patchIndex(out, key);
        if (index >= 0) out[index] = merge(out[index], patch[key]);
    });
    return out;
}

function localizeTree(value, locale) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(function (item) { return localizeTree(item, locale); });
    const out = {};
    Object.keys(value).forEach(function (key) { out[key] = localizeTree(value[key], locale); });
    const suffix = locale.charAt(0).toUpperCase() + locale.slice(1);
    Object.keys(value).forEach(function (key) {
        const camel = key.endsWith('Patch' + suffix) ? key.slice(0, -('Patch' + suffix).length) : '';
        const snakeSuffix = '_patch_' + locale;
        const snake = key.endsWith(snakeSuffix) ? key.slice(0, -snakeSuffix.length) : '';
        const base = camel || snake;
        if (!base || !Object.prototype.hasOwnProperty.call(out, base)) return;
        out[base] = Array.isArray(out[base]) ? applyArrayPatch(out[base], value[key]) : merge(out[base], value[key]);
    });
    return out;
}

function normalizeRow(row, db) {
    if (!row) return null;
    const identity = readCompanyIdentity(db);
    let body = parseJson(row.body_json, {});
    if (row.slug === 'contact') body = sanitizePublicContact(body, identity);
    if (row.slug === 'global-shell') body = ensureChinaWebsiteLink(body, identity);
    return { id: row.id, slug: row.slug, title: row.title_en || '', titleAr: row.title_ar || '', body, version: row.version || 1, updatedAt: row.updated_at || null };
}

function readPublicContentBlock(slug, dbValue) {
    if (!PUBLIC_SLUGS.has(slug)) return null;
    const db = dbValue || getDb();
    const row = db.prepare("SELECT id, slug, title_en, title_ar, body_json, version, updated_at FROM content_blocks WHERE slug = ? AND status = 'published'").get(slug);
    return normalizeRow(row, db);
}

function localizePublicContentBlock(block, locale) {
    if (!block) return null;
    return { ...block, body: localizeTree(block.body, locale || 'en') };
}

module.exports = { PUBLIC_SLUGS, readPublicContentBlock, localizePublicContentBlock, localizeTree };
