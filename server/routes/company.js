const express = require('express');
const { getDb } = require('../lib/db');
const { readCompanyIdentity, sanitizePublicContact } = require('../lib/companyIdentity');

const router = express.Router();

function parseJson(value, fallback) {
    try {
        return JSON.parse(value || '');
    } catch (err) {
        return fallback;
    }
}

function getBlock(db, slug) {
    const row = db.prepare('SELECT body_json FROM content_blocks WHERE slug = ?').get(slug);
    return row ? parseJson(row.body_json, {}) : {};
}

function getSetting(db, key) {
    const row = db.prepare('SELECT value_json FROM admin_settings WHERE key = ?').get(key);
    return row ? parseJson(row.value_json, null) : null;
}

router.get('/', function (req, res) {
    try {
        const db = getDb();
        const identity = readCompanyIdentity(db);
        const companyOverview = sanitizePublicContact(getBlock(db, 'company-overview'), identity);
        const contact = sanitizePublicContact(getBlock(db, 'contact'), identity);
        const pageBlocks = getBlock(db, 'page-blocks');
        const footerBlock = (pageBlocks.blocks || []).find(function (block) {
            return block.key === 'footer';
        }) || {};
        const ga4TrackingId = getSetting(db, 'ga4TrackingId') || '';

        res.json({
            ...companyOverview,
            ...contact,
            identity,
            overview: companyOverview,
            contactPageData: contact,
            name: identity.legalName,
            registeredCapital: identity.registeredCapital,
            email: identity.globalSalesEmail,
            address: identity.headquarters,
            headquarters: identity.headquarters,
            huaiyangBase: identity.productionBase,
            footerText: footerBlock.footerText || '',
            footerTextAr: footerBlock.footerTextAr || '',
            ga4TrackingId
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to read company info.' });
    }
});

router.put('/', function (req, res) {
    return res.status(410).json({
        ok: false,
        error: {
            code: 'GONE',
            message: 'Legacy JSON company writes are disabled. Use /api/admin/content-blocks.'
        }
    });
});

module.exports = router;
