const express = require('express');
const { PUBLIC_SLUGS } = require('../lib/publicContentBlocks');
const { getRuntimePublicTranslationReadAdapter } = require('../lib/publicTranslationReadAdapter');
const { resolveRequestedLocale, sendLocalizedJson, localizedEnvelope } = require('../lib/localizedApiResponse');

const router = express.Router();
const publicRead = getRuntimePublicTranslationReadAdapter();

router.get('/:slug', function (req, res) {
    const slug = String(req.params.slug || '').trim();
    if (!PUBLIC_SLUGS.has(slug)) {
        return res.status(404).json({ error: 'Content block not found.' });
    }

    try {
        const requested = resolveRequestedLocale(req);
        if (requested.error) return res.status(requested.error.status).json(requested.error.body);
        const block = publicRead.readContentBlock(slug);
        if (!block) return res.status(404).json({ error: 'Content block not found.' });
        if (requested.mode === 'localized') {
            const localized = publicRead.readLocalizedContentBlock(slug, requested.locale);
            const fallbackLocale = requested.entry.fallbackLocale || (requested.locale === requested.registry.defaultLocale ? null : requested.registry.defaultLocale);
            return sendLocalizedJson(req, res, localizedEnvelope(localized, requested.locale, fallbackLocale));
        }
        res.json(block);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read content block.' });
    }
});

module.exports = router;
