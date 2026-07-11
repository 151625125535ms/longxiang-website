const express = require('express');
const { getDb } = require('../lib/db');
const {
    readCompanyIdentity,
    sanitizePublicContact,
    ensureChinaWebsiteLink
} = require('../lib/companyIdentity');

const router = express.Router();

const PUBLIC_CONTENT_BLOCK_SLUGS = new Set([
    'home',
    'solutions',
    'about-us',
    'contact',
    'product-pages',
    'global-shell',
    'certifications',
    'compare',
    'not-found',
    'applications',
    'innovation',
    'education',
    'page-blocks'
]);

function parseJson(value, fallback) {
    try {
        return JSON.parse(value || '');
    } catch (err) {
        return fallback;
    }
}

function normalizeRow(row, db) {
    if (!row) return null;
    let body = parseJson(row.body_json, {});
    if (row.slug === 'contact') body = sanitizePublicContact(body, readCompanyIdentity(db));
    if (row.slug === 'global-shell') body = ensureChinaWebsiteLink(body, readCompanyIdentity(db));
    return {
        id: row.id,
        slug: row.slug,
        title: row.title_en || '',
        titleAr: row.title_ar || '',
        body: body,
        version: row.version || 1,
        updatedAt: row.updated_at || null
    };
}

router.get('/:slug', function (req, res) {
    const slug = String(req.params.slug || '').trim();
    if (!PUBLIC_CONTENT_BLOCK_SLUGS.has(slug)) {
        return res.status(404).json({ error: 'Content block not found.' });
    }

    try {
        const db = getDb();
        const row = db.prepare(`
            SELECT id, slug, title_en, title_ar, body_json, version, updated_at
            FROM content_blocks
            WHERE slug = ? AND status = 'published'
        `).get(slug);

        if (!row) return res.status(404).json({ error: 'Content block not found.' });
        res.json(normalizeRow(row, db));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read content block.' });
    }
});

module.exports = router;
