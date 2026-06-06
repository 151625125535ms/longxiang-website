const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'products.json');

function readProducts() {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
}

function writeProducts(products) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf-8');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
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
        const product = products.find(p => p.id === req.params.id);
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
        const products = readProducts();
        const newProduct = req.body;
        if (!newProduct.id || !newProduct.name) {
            return res.status(400).json({ error: 'Product id and name are required.' });
        }
        if (products.find(p => p.id === newProduct.id)) {
            return res.status(400).json({ error: 'Product id already exists.' });
        }
        products.push(newProduct);
        writeProducts(products);
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create product.' });
    }
});

router.put('/:id', authMiddleware, (req, res) => {
    try {
        const products = readProducts();
        const index = products.findIndex(p => p.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        const updatedProduct = { ...products[index], ...req.body, id: req.params.id };
        products[index] = updatedProduct;
        writeProducts(products);
        res.json(updatedProduct);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update product.' });
    }
});

router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const products = readProducts();
        const index = products.findIndex(p => p.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        const deleted = products.splice(index, 1);
        writeProducts(products);
        res.json({ message: 'Product deleted.', product: deleted[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});

router.post('/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const imagePath = 'uploads/' + req.file.filename;
    res.json({ path: imagePath, filename: req.file.filename });
});

module.exports = router;
