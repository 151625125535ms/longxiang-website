const express = require('express');
const path = require('path');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const {
    ensureDirectory,
    readJson,
    resolveDataFile,
    resolveUploadDir,
    resolveUploadPublicPath,
    updateJson,
    writeJsonAtomic
} = require('../lib/fileStore');

const router = express.Router();
const FALLBACK_DATA_FILE = path.join(__dirname, '..', '..', 'data', 'education.json');
const DATA_FILE = resolveDataFile('EDUCATION_DATA_FILE', FALLBACK_DATA_FILE);
const UPLOAD_DIR = path.join(resolveUploadDir(), 'education');
const UPLOAD_PUBLIC_PATH = resolveUploadPublicPath().replace(/\/+$/g, '') + '/education';

function readEducation() {
    return readJson(DATA_FILE, {}, FALLBACK_DATA_FILE);
}

function validateEducation(data) {
    const errors = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return ['Education content must be an object.'];
    }
    if (!data.hero || typeof data.hero !== 'object') errors.push('hero is required.');
    if (data.hero && !String(data.hero.title || '').trim()) errors.push('hero.title is required.');
    if (!Array.isArray(data.stats || [])) errors.push('stats must be an array.');
    if (!Array.isArray(data.sections)) errors.push('sections must be an array.');
    if (data.cta && typeof data.cta !== 'object') errors.push('cta must be an object.');
    return errors;
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        ensureDirectory(UPLOAD_DIR);
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'education-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Only jpeg, jpg, png, or webp images are allowed.'));
    }
});

router.get('/', (req, res) => {
    try {
        res.json(readEducation());
    } catch (err) {
        res.status(500).json({ error: 'Failed to read education content.' });
    }
});

router.put('/', authMiddleware, (req, res) => {
    try {
        const content = { ...req.body, updatedAt: new Date().toISOString() };
        const errors = validateEducation(content);
        if (errors.length) {
            return res.status(400).json({ error: errors.join(' ') });
        }

        writeJsonAtomic(DATA_FILE, content, 'education');
        res.json({ message: 'Education content updated.', education: content });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update education content.' });
    }
});

router.patch('/', authMiddleware, (req, res) => {
    try {
        const updated = updateJson(DATA_FILE, {}, FALLBACK_DATA_FILE, function (current) {
            const next = { ...current, ...req.body, updatedAt: new Date().toISOString() };
            const errors = validateEducation(next);
            if (errors.length) {
                const err = new Error(errors.join(' '));
                err.statusCode = 400;
                throw err;
            }
            return next;
        }, 'education');
        res.json({ message: 'Education content updated.', education: updated });
    } catch (err) {
        if (err.statusCode === 400) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to update education content.' });
    }
});

router.post('/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    res.json({ path: UPLOAD_PUBLIC_PATH + '/' + req.file.filename, filename: req.file.filename });
});

module.exports = router;
