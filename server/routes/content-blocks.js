const express = require('express');
const { getDb } = require('../lib/db');

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

function normalizeRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        slug: row.slug,
        title: row.title_en || '',
        titleAr: row.title_ar || '',
        body: parseJson(row.body_json, {}),
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
        const row = getDb().prepare(`
            SELECT id, slug, title_en, title_ar, body_json, version, updated_at
            FROM content_blocks
            WHERE slug = ? AND status = 'published'
        `).get(slug);

        if (!row) return res.status(404).json({ error: 'Content block not found.' });
        res.json(normalizeRow(row));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read content block.' });
    }
});

module.exports = router;
