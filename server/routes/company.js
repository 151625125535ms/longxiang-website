const express = require('express');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { readJson, resolveDataFile, updateJson } = require('../lib/fileStore');
const { getDb, isUseSqlite } = require('../lib/db');

const router = express.Router();
const FALLBACK_DATA_FILE = path.join(__dirname, '..', '..', 'data', 'company.json');
const DATA_FILE = resolveDataFile('COMPANY_DATA_FILE', FALLBACK_DATA_FILE);

function readCompany() {
    return readJson(DATA_FILE, {}, FALLBACK_DATA_FILE);
}

function normalizeCompanyPatch(body) {
    const patch = {};
    Object.keys(body || {}).forEach(function (key) {
        const value = body[key];
        if (value == null) {
            patch[key] = '';
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value) || typeof value === 'object') {
            patch[key] = value;
        }
    });
    return patch;
}

router.get('/', (req, res) => {
    try {
        if (isUseSqlite()) {
            const db = getDb();
            const getBlock = function (slug) {
                const row = db.prepare('SELECT body_json FROM content_blocks WHERE slug = ?').get(slug);
                return row ? JSON.parse(row.body_json) : {};
            };
            const getSetting = function (key) {
                const row = db.prepare('SELECT value_json FROM admin_settings WHERE key = ?').get(key);
                return row ? JSON.parse(row.value_json) : null;
            };

            const companyOverview = getBlock('company-overview');
            const contact = getBlock('contact');
            const pageBlocks = getBlock('page-blocks');
            const footerBlock = (pageBlocks.blocks || []).find(function (block) {
                return block.key === 'footer';
            }) || {};
            const ga4TrackingId = getSetting('ga4TrackingId') || '';

            return res.json({
                ...companyOverview,
                ...contact,
                footerText: footerBlock.footerText || '',
                footerTextAr: footerBlock.footerTextAr || '',
                ga4TrackingId
            });
        }

        const company = readCompany();
        res.json(company);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read company info.' });
    }
});

router.put('/', authMiddleware, (req, res) => {
    try {
        const patch = normalizeCompanyPatch(req.body);
        const updatedCompany = updateJson(DATA_FILE, {}, FALLBACK_DATA_FILE, function (current) {
            return { ...current, ...patch };
        }, 'company');
        res.json(updatedCompany);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update company info.' });
    }
});

module.exports = router;
