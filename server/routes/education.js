const express = require('express');
const path = require('path');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { ensureDirectory, resolveUploadDir, resolveUploadPublicPath } = require('../lib/fileStore');
const { getDb } = require('../lib/db');
const { normalizeUploadedFilename } = require('../lib/filenameEncoding');

const router = express.Router();
const UPLOAD_DIR = path.join(resolveUploadDir(), 'education');
const UPLOAD_PUBLIC_PATH = resolveUploadPublicPath().replace(/\/+$/g, '') + '/education';

function sendGone(res) {
    return res.status(410).json({
        ok: false,
        error: { code: 'GONE', message: 'Legacy JSON education writes are disabled. Use /api/admin/content-blocks/education.' }
    });
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
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Only jpeg, jpg, png, or webp images are allowed.'));
    }
});

function registerAsset(file, publicPath) {
    const db = getDb();
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
                '', 'education', 'content_block', NULL, 1, @created_at
            )
    `).run({
        path: publicPath,
        filename: file.filename,
        original_name: originalName,
        mime_type: file.mimetype || '',
        file_size: file.size || 0,
        created_at: Date.now()
    });
}

router.get('/', function (req, res) {
    try {
        const row = getDb()
            .prepare("SELECT body_json FROM content_blocks WHERE slug = 'education' AND status = 'published'")
            .get();
        if (!row) return res.status(404).json({ error: 'Education content not found.' });
        res.json(JSON.parse(row.body_json));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read education content.' });
    }
});

router.put('/', function (req, res) {
    return sendGone(res);
});

router.put('/editor', function (req, res) {
    return sendGone(res);
});

router.patch('/', function (req, res) {
    return sendGone(res);
});

router.post('/upload', authMiddleware, function (req, res) {
    upload.single('image')(req, res, function (err) {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'Image must be 10MB or smaller.'
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
