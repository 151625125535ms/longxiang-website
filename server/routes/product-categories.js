const express = require('express');
const { readPublicProductCategories } = require('../lib/publicProductTaxonomy');
const { readLocalizedProductCategories } = require('../lib/localizedPublicCatalog');
const { resolveRequestedLocale, sendLocalizedJson, localizedEnvelope } = require('../lib/localizedApiResponse');

const router = express.Router();

router.get('/', function (req, res, next) {
    try {
        const requested = resolveRequestedLocale(req);
        if (requested.error) return res.status(requested.error.status).json(requested.error.body);
        if (requested.mode === 'localized') {
            const categories = readLocalizedProductCategories(requested.locale);
            const fallbackLocale = requested.entry.fallbackLocale || (requested.locale === requested.registry.defaultLocale ? null : requested.registry.defaultLocale);
            return sendLocalizedJson(req, res, localizedEnvelope(categories, requested.locale, fallbackLocale));
        }
        res.json({ ok: true, data: readPublicProductCategories() });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
