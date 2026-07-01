const express = require('express');
const path = require('path');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { ensureDirectory, resolveUploadDir, resolveUploadPublicPath } = require('../lib/fileStore');
const { getDb } = require('../lib/db');
const { normalizeUploadedFilename } = require('../lib/filenameEncoding');

const router = express.Router();
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

function containsCjk(value) {
    return /[\u3400-\u9fff]/.test(String(value || ''));
}

function legacyNumber(certification) {
    const match = String(certification.legacy_id || '').match(/(\d+)$/);
    return match ? match[1] : String(certification.id || '').padStart(3, '0');
}

const qualificationNames = {
    'qualifications-001': 'AAA Credit Rating Certificate',
    'qualifications-002': 'Work Safety Permit',
    'qualifications-003': 'Power Facility Installation, Maintenance and Testing Permit',
    'qualifications-004': 'Engineering Design Qualification Certificate',
    'qualifications-005': 'Environmental Management System Certificate',
    'qualifications-006': 'Construction Enterprise Qualification Certificate',
    'qualifications-007': 'Energy Management System Certificate',
    'qualifications-008': 'Occupational Health and Safety Management System Certificate',
    'qualifications-009': 'Quality Management System Certificate'
};

function publicCertificationName(certification, lang) {
    const localizedNames = {
        ar: certification.name_ar,
        fr: certification.name_fr,
        ru: certification.name_ru
    };
    const sourceName = lang === 'en' ? certification.name_en : localizedNames[lang];
    if (sourceName && !containsCjk(sourceName)) return sourceName;
    if (lang === 'fr' || lang === 'ru') return '';

    const id = String(certification.legacy_id || '');
    const number = legacyNumber(certification);
    if (lang === 'ar') {
        if (id.indexOf('test-reports-extra') === 0) return '\u062a\u0642\u0631\u064a\u0631 \u0627\u062e\u062a\u0628\u0627\u0631 \u0645\u062d\u0648\u0644 \u0631\u0642\u0645 ' + number;
        if (id.indexOf('patents') === 0) return '\u0634\u0647\u0627\u062f\u0629 \u0628\u0631\u0627\u0621\u0629 \u0627\u062e\u062a\u0631\u0627\u0639 \u0631\u0642\u0645 ' + number;
        if (id.indexOf('qualifications') === 0) return '\u0634\u0647\u0627\u062f\u0629 \u062a\u0623\u0647\u064a\u0644 \u0631\u0642\u0645 ' + number;
        return '\u0634\u0647\u0627\u062f\u0629 \u0644\u0648\u0646\u063a\u0634\u064a\u0627\u0646\u063a \u0631\u0642\u0645 ' + number;
    }
    if (qualificationNames[id]) return qualificationNames[id];
    if (id.indexOf('test-reports-extra') === 0) return 'Transformer Test Report ' + number;
    if (id.indexOf('patents') === 0) return 'Patent Certificate ' + number;
    return 'Longxiang Certificate ' + number;
}

router.get('/', function (req, res) {
    try {
        const certifications = getDb().prepare(`
            SELECT * FROM certifications
            WHERE status = 'published'
            ORDER BY sort_order, id
        `).all().map(function (certification) {
            return {
                id: certification.legacy_id,
                name: publicCertificationName(certification, 'en'),
                nameAr: publicCertificationName(certification, 'ar'),
                nameFr: publicCertificationName(certification, 'fr'),
                nameRu: publicCertificationName(certification, 'ru'),
                category: certification.legacy_category || '',
                categoryLabel: certification.category_label_en || '',
                categoryLabelAr: certification.category_label_ar || '',
                categoryLabelFr: certification.category_label_fr || '',
                categoryLabelRu: certification.category_label_ru || '',
                image: certification.image_path || '',
                type: certification.source_type || '',
                issuer: certification.issuer_en || '',
                issuerAr: certification.issuer_ar || '',
                issuerFr: certification.issuer_fr || '',
                issuerRu: certification.issuer_ru || '',
                description: certification.description_en || '',
                descriptionAr: certification.description_ar || '',
                descriptionFr: certification.description_fr || '',
                descriptionRu: certification.description_ru || '',
                pages: certification.pages || 1,
                width: certification.width,
                height: certification.height
            };
        });
        res.json(certifications);
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
