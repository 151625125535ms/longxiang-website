const express = require('express');
const { readPublicProducts, readPublicProduct } = require('../lib/publicProducts');
const { readLocalizedProducts, readLocalizedProduct } = require('../lib/localizedPublicCatalog');
const { resolveRequestedLocale, sendLocalizedJson, localizedEnvelope } = require('../lib/localizedApiResponse');

const router = express.Router();

function legacyGone(res) {
    return res.status(410).json({
        ok: false,
        error: {
            code: 'GONE',
            message: 'Legacy JSON product writes are disabled. Use /api/admin/products.'
        }
    });
}

router.get('/', function (req, res) {
    try {
        const requested = resolveRequestedLocale(req);
        if (requested.error) return res.status(requested.error.status).json(requested.error.body);
        if (requested.mode === 'localized') {
            let localized = readLocalizedProducts(requested.locale);
            const { category, featured } = req.query;
            if (category) localized = localized.filter(function (product) { return product.category === category; });
            if (featured === 'true') localized = localized.filter(function (product) { return product.featured; });
            const fallbackLocale = requested.entry.fallbackLocale || (requested.locale === requested.registry.defaultLocale ? null : requested.registry.defaultLocale);
            return sendLocalizedJson(req, res, localizedEnvelope(localized, requested.locale, fallbackLocale));
        }
        let result = readPublicProducts();
        const { category, featured } = req.query;
        if (category) {
            result = result.filter(p => p.category === category);
        }
        if (featured === 'true') {
            result = result.filter(p => p.featured);
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read products.' });
    }
});

router.get('/:id', function (req, res) {
    try {
        const requested = resolveRequestedLocale(req);
        if (requested.error) return res.status(requested.error.status).json(requested.error.body);
        if (requested.mode === 'localized') {
            const localized = readLocalizedProduct(req.params.id, requested.locale);
            if (!localized) {
                return res.status(404).json({ ok: false, error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' } });
            }
            const fallbackLocale = requested.entry.fallbackLocale || (requested.locale === requested.registry.defaultLocale ? null : requested.registry.defaultLocale);
            return sendLocalizedJson(req, res, localizedEnvelope(localized, requested.locale, fallbackLocale));
        }
        const product = readPublicProduct(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read product.' });
    }
});

router.post('/', function (req, res) {
    return legacyGone(res);
});

router.put('/:id', function (req, res) {
    return legacyGone(res);
});

router.delete('/:id', function (req, res) {
    return legacyGone(res);
});

router.post('/upload', function (req, res) {
    return legacyGone(res);
});

module.exports = router;
