const express = require('express');
const { readPublicProductCategories } = require('../lib/publicProductTaxonomy');

const router = express.Router();

router.get('/', function (req, res, next) {
    try {
        res.json({ ok: true, data: readPublicProductCategories() });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
