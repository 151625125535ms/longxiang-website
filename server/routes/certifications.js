const express = require('express');
const path = require('path');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { ensureDirectory, resolveUploadDir, resolveUploadPublicPath } = require('../lib/fileStore');
const { getDb } = require('../lib/db');
const { normalizeUploadedFilename } = require('../lib/filenameEncoding');
const { getRuntimePublicTranslationReadAdapter } = require('../lib/publicTranslationReadAdapter');
const { resolveRequestedLocale, sendLocalizedJson, localizedEnvelope } = require('../lib/localizedApiResponse');

const router = express.Router();
const publicRead = getRuntimePublicTranslationReadAdapter();
const UPLOAD_DIR = resolveUploadDir();
const UPLOAD_PUBLIC_PATH = resolveUploadPublicPath();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        ensureDirectory(UPLOAD_DIR);
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'certification-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Only image or PDF files are allowed.'));
    }
});

function legacyGone(res) {
    return res.status(410).json({
        ok: false,
        error: {
            code: 'GONE',
            message: 'Legacy JSON certification writes are disabled. Use /api/admin/certifications.'
        }
    });
}

function registerAsset(file, publicPath) {
    const db = getDb();
    const now = Date.now();
    const originalName = normalizeUploadedFilename(file.originalname);
    db.prepare(`
        INSERT OR IGNORE INTO assets
            (
                path, filename, original_name, mime_type, file_size,
                checksum, module, entity_type, entity_id, is_active, created_at
            )
        VALUES
            (
                @path, @filename, @original_name, @mime_type, @file_size,
                '', 'certifications', 'certification', NULL, 1, @created_at
            )
    `).run({
        path: publicPath,
        filename: file.filename,
        original_name: originalName,
        mime_type: file.mimetype || '',
        file_size: file.size || 0,
        created_at: now
    });
}

router.get('/', function (req, res) {
    try {
        const requested = resolveRequestedLocale(req);
        if (requested.error) return res.status(requested.error.status).json(requested.error.body);
        if (requested.mode === 'localized') {
            const certifications = publicRead.readLocalizedCertifications(requested.locale);
            const fallbackLocale = requested.entry.fallbackLocale || (requested.locale === requested.registry.defaultLocale ? null : requested.registry.defaultLocale);
            return sendLocalizedJson(req, res, localizedEnvelope(certifications, requested.locale, fallbackLocale));
        }
        res.json(publicRead.readCertifications());
    } catch (err) {
        res.status(500).json({ error: 'Failed to read certifications.' });
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

router.post('/upload', authMiddleware, function (req, res) {
    upload.single('file')(req, res, function (err) {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'File must be 10MB or smaller.'
                : err.message;
            return res.status(422).json({ error: message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const publicPath = UPLOAD_PUBLIC_PATH + '/' + req.file.filename;
        try {
            registerAsset(req.file, publicPath);
            res.json({ path: publicPath, filename: req.file.filename });
        } catch (assetErr) {
            res.status(500).json({ error: 'Failed to register uploaded file.' });
        }
    });
});

module.exports = router;
