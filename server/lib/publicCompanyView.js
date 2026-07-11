'use strict';

const { getDb } = require('./db');
const { readCompanyIdentity, sanitizePublicContact } = require('./companyIdentity');

function parseJson(value, fallback) { try { return JSON.parse(value || ''); } catch (err) { return fallback; } }
function block(db, slug) {
    const row = db.prepare("SELECT body_json FROM content_blocks WHERE slug = ? AND status = 'published'").get(slug);
    return row ? parseJson(row.body_json, {}) : {};
}
function setting(db, key) {
    const row = db.prepare('SELECT value_json FROM admin_settings WHERE key = ?').get(key);
    return row ? parseJson(row.value_json, '') : '';
}
function scrub(value) {
    if (Array.isArray(value)) return value.map(scrub);
    if (!value || typeof value !== 'object') {
        return /100\s*(?:million\s*rmb|مليون\s*يوان\s*صيني)/i.test(String(value || '')) ? '' : value;
    }
    return Object.keys(value).reduce(function (out, key) {
        if (/whatsapp/i.test(key)) return out;
        out[key] = scrub(value[key]);
        return out;
    }, {});
}
function readPublicCompanyView(dbValue) {
    const db = dbValue || getDb();
    const identity = readCompanyIdentity(db);
    const overview = sanitizePublicContact(block(db, 'company-overview'), identity);
    const contact = sanitizePublicContact(block(db, 'contact'), identity);
    const pageBlocks = block(db, 'page-blocks');
    const footer = (pageBlocks.blocks || []).find(function (item) { return item.key === 'footer'; }) || {};
    const versionRow = db.prepare("SELECT MAX(updated_at) AS version FROM content_blocks WHERE slug IN ('company-identity','company-overview','contact','page-blocks') AND status = 'published'").get();
    return scrub({
        ...overview,
        ...contact,
        identity,
        overview,
        contactPageData: contact,
        name: identity.legalName,
        registeredCapital: identity.registeredCapital,
        email: identity.globalSalesEmail,
        address: identity.headquarters,
        headquarters: identity.headquarters,
        huaiyangBase: identity.productionBase,
        globalWebsite: identity.globalWebsite,
        chinaWebsite: identity.chinaWebsite,
        footerText: footer.footerText || '',
        footerTextAr: footer.footerTextAr || '',
        ga4TrackingId: setting(db, 'ga4TrackingId') || '',
        version: versionRow && versionRow.version || 1
    });
}

module.exports = { readPublicCompanyView };
