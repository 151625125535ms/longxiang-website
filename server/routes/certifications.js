const express = require('express');
const path = require('path');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const {
    ensureDirectory,
    makeId,
    readJson,
    resolveDataFile,
    resolveUploadDir,
    resolveUploadPublicPath,
    writeJsonAtomic
} = require('../lib/fileStore');

const router = express.Router();
const FALLBACK_DATA_FILE = path.join(__dirname, '..', '..', 'data', 'certifications.json');
const DATA_FILE = resolveDataFile('CERTIFICATIONS_DATA_FILE', FALLBACK_DATA_FILE);
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
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Only image or PDF files are allowed.'));
    }
});

function readCertifications() {
    return readJson(DATA_FILE, [], FALLBACK_DATA_FILE);
}

function writeCertifications(certifications) {
    writeJsonAtomic(DATA_FILE, certifications, 'certifications');
}

router.get('/', (req, res) => {
    try {
        res.json(readCertifications());
    } catch (err) {
        res.status(500).json({ error: 'Failed to read certifications.' });
    }
});

router.post('/', authMiddleware, (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name) return res.status(400).json({ error: 'Certification name is required.' });

        const certifications = readCertifications();
        const certification = {
            id: req.body.id || makeId('cert'),
            name,
            issuer: String(req.body.issuer || '').trim(),
            expiryDate: String(req.body.expiryDate || '').trim(),
            image: String(req.body.image || '').trim(),
            description: String(req.body.description || '').trim()
        };
        certifications.push(certification);
        writeCertifications(certifications);
        res.status(201).json(certification);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create certification.' });
    }
});

router.put('/:id', authMiddleware, (req, res) => {
    try {
        const certifications = readCertifications();
        const index = certifications.findIndex(item => item.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Certification not found.' });

        certifications[index] = {
            ...certifications[index],
            name: String(req.body.name || certifications[index].name || '').trim(),
            issuer: String(req.body.issuer || '').trim(),
            expiryDate: String(req.body.expiryDate || '').trim(),
            image: String(req.body.image || '').trim(),
            description: String(req.body.description || '').trim()
        };

        writeCertifications(certifications);
        res.json(certifications[index]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update certification.' });
    }
});

router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const certifications = readCertifications();
        const index = certifications.findIndex(item => item.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Certification not found.' });

        const deleted = certifications.splice(index, 1)[0];
        writeCertifications(certifications);
        res.json({ message: 'Certification deleted.', certification: deleted });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete certification.' });
    }
});

router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    res.json({ path: UPLOAD_PUBLIC_PATH + '/' + req.file.filename, filename: req.file.filename });
});

module.exports = router;
