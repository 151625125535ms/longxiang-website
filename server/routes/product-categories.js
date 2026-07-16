const express = require('express');
const { getRuntimePublicTranslationReadAdapter } = require('../lib/publicTranslationReadAdapter');
const { resolveRequestedLocale, sendLocalizedJson, localizedEnvelope } = require('../lib/localizedApiResponse');

const router = express.Router();
const publicRead = getRuntimePublicTranslationReadAdapter();

router.get('/', function (req, res, next) {
    try {
        const requested = resolveRequestedLocale(req);
        if (requested.error) return res.status(requested.error.status).json(requested.error.body);
        if (requested.mode === 'localized') {
            const categories = publicRead.readLocalizedProductCategories(requested.locale);
            const fallbackLocale = requested.entry.fallbackLocale || (requested.locale === requested.registry.defaultLocale ? null : requested.registry.defaultLocale);
            return sendLocalizedJson(req, res, localizedEnvelope(categories, requested.locale, fallbackLocale));
        }
        res.json({ ok: true, data: publicRead.readProductCategories() });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
