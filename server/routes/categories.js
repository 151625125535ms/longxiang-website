const express = require('express');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { readJson, writeJson, makeId } = require('../lib/fileStore');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'categories.json');
const PRODUCTS_FILE = path.join(__dirname, '..', '..', 'data', 'products.json');

function readCategories() {
    return readJson(DATA_FILE, []);
}

function writeCategories(categories) {
    writeJson(DATA_FILE, categories);
}

function slugify(text) {
    const slug = String(text).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    // Non-ASCII labels (e.g. Chinese) produce an empty slug — use a short random fallback.
    return slug || makeId('').slice(0, 8);
}

function validateGroup(body) {
    const label = String(body.label || '').trim();
    if (!label) return 'label is required.';
    if (label.length > 80) return 'label must be 80 characters or fewer.';
    return null;
}

function validateSub(body) {
    const label = String(body.label || '').trim();
    if (!label) return 'label is required.';
    if (label.length > 80) return 'label must be 80 characters or fewer.';
    return null;
}

// GET /api/categories — public
router.get('/', (req, res) => {
    try {
        res.json(readCategories());
    } catch (err) {
        res.status(500).json({ error: 'Failed to read categories.' });
    }
});

// POST /api/categories — add main category
router.post('/', authMiddleware, (req, res) => {
    try {
        const err = validateGroup(req.body);
        if (err) return res.status(400).json({ error: err });

        const label = String(req.body.label).trim();
        const baseId = slugify(req.body.id || label);
        const categories = readCategories();

        // Ensure unique ID: append short suffix only on collision
        let id = baseId;
        if (categories.find(g => g.id === id)) {
            id = baseId + '-' + makeId('').slice(0, 6);
        }
        if (categories.find(g => g.id === id)) {
            return res.status(409).json({ error: `Category id "${baseId}" already exists.` });
        }

        const group = {
            id,
            label,
            labelAr: String(req.body.labelAr || '').trim(),
            labelZh: String(req.body.labelZh || '').trim(),
            subcategories: []
        };

        categories.push(group);
        writeCategories(categories);
        res.status(201).json(group);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create category.' });
    }
});

// PUT /api/categories/:id — update main category
router.put('/:id', authMiddleware, (req, res) => {
    try {
        const err = validateGroup(req.body);
        if (err) return res.status(400).json({ error: err });

        const categories = readCategories();
        const index = categories.findIndex(g => g.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Category not found.' });

        categories[index] = {
            ...categories[index],
            label: String(req.body.label).trim(),
            labelAr: String(req.body.labelAr !== undefined ? req.body.labelAr : categories[index].labelAr || '').trim(),
            labelZh: String(req.body.labelZh !== undefined ? req.body.labelZh : categories[index].labelZh || '').trim()
        };

        writeCategories(categories);
        res.json(categories[index]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update category.' });
    }
});

// DELETE /api/categories/:id — delete main category (guarded)
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const categories = readCategories();
        const index = categories.findIndex(g => g.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Category not found.' });

        const products = readJson(PRODUCTS_FILE, []);
        // Guard against both new-style (group field) and legacy (category field) products
        const group = categories[index];
        const subIds = group.subcategories.map(s => s.id);
        const linked = products.filter(p =>
            p.group === req.params.id ||
            (!p.group && subIds.includes(p.category))
        );
        if (linked.length > 0) {
            return res.status(409).json({
                error: `Cannot delete: ${linked.length} product(s) belong to this category. Reassign them first.`,
                count: linked.length
            });
        }

        const deleted = categories.splice(index, 1)[0];
        writeCategories(categories);
        res.json({ message: 'Category deleted.', category: deleted });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete category.' });
    }
});

// POST /api/categories/:id/subcategories — add subcategory
router.post('/:id/subcategories', authMiddleware, (req, res) => {
    try {
        const err = validateSub(req.body);
        if (err) return res.status(400).json({ error: err });

        const categories = readCategories();
        const group = categories.find(g => g.id === req.params.id);
        if (!group) return res.status(404).json({ error: 'Category not found.' });

        const label = String(req.body.label).trim();
        const baseSubId = slugify(req.body.id || label);
        let subId = baseSubId;
        if (group.subcategories.find(s => s.id === subId)) {
            subId = baseSubId + '-' + makeId('').slice(0, 6);
        }
        if (group.subcategories.find(s => s.id === subId)) {
            return res.status(409).json({ error: `Subcategory id "${baseSubId}" already exists in this category.` });
        }

        const sub = {
            id: subId,
            label,
            labelAr: String(req.body.labelAr || '').trim(),
            labelZh: String(req.body.labelZh || '').trim()
        };

        group.subcategories.push(sub);
        writeCategories(categories);
        res.status(201).json(sub);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create subcategory.' });
    }
});

// PUT /api/categories/:id/subcategories/:subId — update subcategory
router.put('/:id/subcategories/:subId', authMiddleware, (req, res) => {
    try {
        const err = validateSub(req.body);
        if (err) return res.status(400).json({ error: err });

        const categories = readCategories();
        const group = categories.find(g => g.id === req.params.id);
        if (!group) return res.status(404).json({ error: 'Category not found.' });

        const subIndex = group.subcategories.findIndex(s => s.id === req.params.subId);
        if (subIndex === -1) return res.status(404).json({ error: 'Subcategory not found.' });

        group.subcategories[subIndex] = {
            ...group.subcategories[subIndex],
            label: String(req.body.label).trim(),
            labelAr: String(req.body.labelAr !== undefined ? req.body.labelAr : group.subcategories[subIndex].labelAr || '').trim(),
            labelZh: String(req.body.labelZh !== undefined ? req.body.labelZh : group.subcategories[subIndex].labelZh || '').trim()
        };

        writeCategories(categories);
        res.json(group.subcategories[subIndex]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update subcategory.' });
    }
});

// DELETE /api/categories/:id/subcategories/:subId — delete subcategory (guarded)
router.delete('/:id/subcategories/:subId', authMiddleware, (req, res) => {
    try {
        const categories = readCategories();
        const group = categories.find(g => g.id === req.params.id);
        if (!group) return res.status(404).json({ error: 'Category not found.' });

        const subIndex = group.subcategories.findIndex(s => s.id === req.params.subId);
        if (subIndex === -1) return res.status(404).json({ error: 'Subcategory not found.' });

        const products = readJson(PRODUCTS_FILE, []);
        // Guard against both new-style (group+subCategory) and legacy (category only) products
        const linked = products.filter(p =>
            (p.group === req.params.id && p.subCategory === req.params.subId) ||
            (!p.group && p.category === req.params.subId)
        );
        if (linked.length > 0) {
            return res.status(409).json({
                error: `Cannot delete: ${linked.length} product(s) use this subcategory. Reassign them first.`,
                count: linked.length
            });
        }

        const deleted = group.subcategories.splice(subIndex, 1)[0];
        writeCategories(categories);
        res.json({ message: 'Subcategory deleted.', subcategory: deleted });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete subcategory.' });
    }
});

module.exports = router;
