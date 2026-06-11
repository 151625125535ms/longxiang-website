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
const { getDb, isUseSqlite } = require('../lib/db');

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

function asString(value) {
    return String(value == null ? '' : value).trim();
}

function normalizeList(value) {
    if (Array.isArray(value)) {
        return value.map(asString).filter(Boolean);
    }
    return asString(value).split(/\r?\n/).map(asString).filter(Boolean);
}

function normalizeCards(cards) {
    if (!Array.isArray(cards)) return [];
    return cards.map(function (card) {
        return {
            title: asString(card.title),
            titleAr: asString(card.titleAr),
            text: asString(card.text),
            textAr: asString(card.textAr)
        };
    }).filter(function (card) {
        return card.title || card.text || card.titleAr || card.textAr;
    });
}

function normalizeStats(stats) {
    if (!Array.isArray(stats)) return [];
    return stats.map(function (stat, index) {
        return {
            id: asString(stat.id) || 'stat-' + (index + 1),
            value: asString(stat.value),
            label: asString(stat.label),
            labelAr: asString(stat.labelAr)
        };
    }).filter(function (stat) {
        return stat.value || stat.label || stat.labelAr;
    });
}

function normalizeSection(section, index) {
    const id = asString(section.id) || 'section-' + (index + 1);
    return {
        id,
        modeNumber: asString(section.modeNumber) || String(index + 1).padStart(2, '0'),
        title: asString(section.title),
        titleAr: asString(section.titleAr),
        tagline: asString(section.tagline),
        taglineAr: asString(section.taglineAr),
        summary: asString(section.summary),
        summaryAr: asString(section.summaryAr),
        body: normalizeList(section.body),
        bodyAr: normalizeList(section.bodyAr),
        image: asString(section.image),
        images: normalizeList(section.images),
        bestFor: asString(section.bestFor),
        bestForAr: asString(section.bestForAr),
        deliverables: normalizeList(section.deliverables),
        deliverablesAr: normalizeList(section.deliverablesAr),
        outcomes: normalizeList(section.outcomes),
        outcomesAr: normalizeList(section.outcomesAr),
        cards: normalizeCards(section.cards)
    };
}

function normalizeEditorPayload(body) {
    const sections = Array.isArray(body.sections) ? body.sections : [];
    const content = {
        updatedAt: new Date().toISOString(),
        hero: {
            eyebrow: asString(body.hero && body.hero.eyebrow),
            title: asString(body.hero && body.hero.title),
            titleAr: asString(body.hero && body.hero.titleAr),
            subtitle: asString(body.hero && body.hero.subtitle),
            subtitleAr: asString(body.hero && body.hero.subtitleAr),
            backgroundImage: asString(body.hero && body.hero.backgroundImage)
        },
        stats: normalizeStats(body.stats),
        sections: sections.map(normalizeSection).filter(function (section) {
            return section.id && (section.title || section.summary || section.image);
        }),
        cta: {
            title: asString(body.cta && body.cta.title),
            titleAr: asString(body.cta && body.cta.titleAr),
            text: asString(body.cta && body.cta.text),
            textAr: asString(body.cta && body.cta.textAr),
            buttonText: asString(body.cta && body.cta.buttonText),
            buttonTextAr: asString(body.cta && body.cta.buttonTextAr),
            href: asString(body.cta && body.cta.href) || 'contact.html'
        }
    };

    if (body.gallery) {
        content.sections.push({
            id: 'gallery',
            title: asString(body.gallery.title),
            titleAr: asString(body.gallery.titleAr),
            summary: asString(body.gallery.summary),
            summaryAr: asString(body.gallery.summaryAr),
            images: normalizeList(body.gallery.images),
            body: [],
            bodyAr: [],
            cards: []
        });
    }

    if (body.philosophy) {
        content.sections.push({
            id: 'cooperation-philosophy',
            title: asString(body.philosophy.title),
            titleAr: asString(body.philosophy.titleAr),
            summary: asString(body.philosophy.summary),
            summaryAr: asString(body.philosophy.summaryAr),
            body: normalizeList(body.philosophy.body),
            bodyAr: normalizeList(body.philosophy.bodyAr),
            images: [],
            cards: []
        });
    }

    return content;
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
        if (isUseSqlite()) {
            const row = getDb()
                .prepare("SELECT body_json FROM content_blocks WHERE slug = 'education'")
                .get();
            if (row) {
                return res.json(JSON.parse(row.body_json));
            }
        }

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

router.put('/editor', authMiddleware, (req, res) => {
    try {
        const content = normalizeEditorPayload(req.body || {});
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
