const express = require('express');
const { readPublicProducts, readPublicProduct } = require('../lib/publicProducts');

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
