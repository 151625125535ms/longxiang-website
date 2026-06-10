const express = require('express');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { readJson, resolveDataFile, updateJson } = require('../lib/fileStore');

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
