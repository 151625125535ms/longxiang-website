const express = require('express');
const { readPublicCompanyView } = require('../lib/publicCompanyView');

const router = express.Router();

router.get('/', function (req, res) {
    try {
        res.json(readPublicCompanyView());
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
