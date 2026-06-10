const express = require('express');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { readJson, resolveDataFile, writeJsonAtomic } = require('../lib/fileStore');

const router = express.Router();
const FALLBACK_DATA_FILE = path.join(__dirname, '..', '..', 'data', 'company.json');
const DATA_FILE = resolveDataFile('COMPANY_DATA_FILE', FALLBACK_DATA_FILE);

function readCompany() {
    return readJson(DATA_FILE, {}, FALLBACK_DATA_FILE);
}

function writeCompany(company) {
    writeJsonAtomic(DATA_FILE, company, 'company');
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
        const updatedCompany = req.body;
        writeCompany(updatedCompany);
        res.json(updatedCompany);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update company info.' });
    }
});

module.exports = router;
