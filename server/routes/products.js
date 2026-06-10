const express = require('express');
const path = require('path');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { ensureDirectory, readJson, resolveDataFile, resolveUploadDir, resolveUploadPublicPath, updateJson } = require('../lib/fileStore');

const router = express.Router();
const FALLBACK_DATA_FILE = path.join(__dirname, '..', '..', 'data', 'products.json');
const DATA_FILE = resolveDataFile('PRODUCTS_DATA_FILE', FALLBACK_DATA_FILE);
const UPLOAD_DIR = resolveUploadDir();
const UPLOAD_PUBLIC_PATH = resolveUploadPublicPath();

function readProducts() {
    return readJson(DATA_FILE, [], FALLBACK_DATA_FILE);
}

function matchesProductId(product, id) {
    if (product.id === id) return true;
    return Array.isArray(product.aliases) && product.aliases.indexOf(id) !== -1;
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        ensureDirectory(UPLOAD_DIR);
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'product-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed.'));
        }
    }
});

router.get('/', (req, res) => {
    try {
        const products = readProducts();
        const { category, featured } = req.query;
        let result = products;
        if (category) {
            result = result.filter(p => p.category === category);
        }
        if (featured === 'true') {
            result = result.filter(p => p.featured);
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read products.' });
    }
});

router.get('/:id', (req, res) => {
    try {
        const products = readProducts();
        const product = products.find(p => matchesProductId(p, req.params.id));
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read product.' });
    }
});

router.post('/', authMiddleware, (req, res) => {
    try {
        const newProduct = req.body;
        if (!newProduct.id || !newProduct.name) {
            return res.status(400).json({ error: 'Product id and name are required.' });
        }
        updateJson(DATA_FILE, [], FALLBACK_DATA_FILE, function (products) {
            if (products.find(p => matchesProductId(p, newProduct.id))) {
                const err = new Error('Product id already exists.');
                err.statusCode = 400;
                throw err;
            }
            products.push(newProduct);
            return products;
        }, 'products');
        res.status(201).json(newProduct);
    } catch (err) {
        if (err.statusCode === 400) return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Failed to create product.' });
    }
});

router.put('/:id', authMiddleware, (req, res) => {
    try {
        let updatedProduct = null;
        updateJson(DATA_FILE, [], FALLBACK_DATA_FILE, function (products) {
            const index = products.findIndex(p => matchesProductId(p, req.params.id));
            if (index === -1) {
                const err = new Error('Product not found.');
                err.statusCode = 404;
                throw err;
            }
            updatedProduct = { ...products[index], ...req.body, id: products[index].id };
            products[index] = updatedProduct;
            return products;
        }, 'products');
        res.json(updatedProduct);
    } catch (err) {
        if (err.statusCode === 404) return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Failed to update product.' });
    }
});

router.delete('/:id', authMiddleware, (req, res) => {
    try {
        let deleted = null;
        updateJson(DATA_FILE, [], FALLBACK_DATA_FILE, function (products) {
            const index = products.findIndex(p => matchesProductId(p, req.params.id));
            if (index === -1) {
                const err = new Error('Product not found.');
                err.statusCode = 404;
                throw err;
            }
            deleted = products.splice(index, 1)[0];
            return products;
        }, 'products');
        res.json({ message: 'Product deleted.', product: deleted });
    } catch (err) {
        if (err.statusCode === 404) return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});

router.post('/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const imagePath = UPLOAD_PUBLIC_PATH + '/' + req.file.filename;
    res.json({ path: imagePath, filename: req.file.filename });
});

module.exports = router;
