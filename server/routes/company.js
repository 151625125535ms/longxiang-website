const express = require('express');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { readJson, writeJson } = require('../lib/fileStore');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'company.json');

const ALLOWED_FIELDS = [
    'name', 'nameCN', 'founded', 'stockCode', 'registeredCapital',
    'phone', 'email', 'address', 'headquarters', 'officeHours',
    'huaiyangBase', 'factoryArea', 'patents', 'researchPartners',
    'description', 'aboutIntro', 'aboutDetail', 'footerText',
    'whatsapp', 'wechat', 'skype', 'ga4TrackingId'
];

function readCompany() {
    return readJson(DATA_FILE, {});
}

function writeCompany(company) {
    writeJson(DATA_FILE, company);
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
        const current = readCompany();
        const patch = {};
        ALLOWED_FIELDS.forEach(function(k) {
            if (req.body[k] !== undefined) patch[k] = req.body[k];
        });
        const merged = Object.assign({}, current, patch);
        if (!String(merged.name || '').trim()) {
            return res.status(400).json({ error: 'name is required' });
        }
        writeCompany(merged);
        res.json(merged);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update company info.' });
    }
});

module.exports = router;
