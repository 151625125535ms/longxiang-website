const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'company.json');

function readCompany() {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
}

function writeCompany(company) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(company, null, 2), 'utf-8');
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
