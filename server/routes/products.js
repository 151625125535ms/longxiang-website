const express = require('express');
const { getDb } = require('../lib/db');
const { VALID_GROUPS, getCategoryMapping } = require('../lib/category-helper');

const router = express.Router();

function parseJsonArray(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function legacyGone(res) {
    return res.status(410).json({
        ok: false,
        error: {
            code: 'GONE',
            message: 'Legacy JSON product writes are disabled. Use /api/admin/products.'
        }
    });
}

function mapSqliteProduct(row, specsByProduct, coverByProduct) {
    const specs = specsByProduct[row.id] || [];
    let group = row.product_group || '';
    let subCategory = row.sub_category || '';

    if (row.parent_slug) {
        group = row.parent_slug;
        subCategory = row.category_slug || subCategory;
    } else if (!group || !VALID_GROUPS.has(group)) {
        const mapping = getCategoryMapping(row.category_slug);
        if (!mapping) return null;
        group = mapping.group;
        subCategory = mapping.subCategory;
    }

    return {
        id: row.legacy_id,
        name: row.name_en,
        nameAr: row.name_ar || '',
        image: coverByProduct[row.id] || '',
        category: row.category_slug || '',
        categoryLabel: row.category_label || '',
        categoryLabelAr: row.category_label_ar || '',
        groupLabel: row.parent_label || '',
        groupLabelAr: row.parent_label_ar || '',
        subCategoryLabel: row.category_label || '',
        subCategoryLabelAr: row.category_label_ar || '',
        group,
        subCategory,
        shortDesc: row.short_desc_en || '',
        shortDescAr: row.short_desc_ar || '',
        description: row.description_en || '',
        descriptionAr: row.description_ar || '',
        capacities: specs.filter(item => item.spec_group === 'capacity').map(item => item.spec_value),
        voltages: specs.filter(item => item.spec_group === 'voltage').map(item => item.spec_value),
        specs: specs.filter(item => item.spec_group === 'technical').map(item => [item.spec_key, item.spec_value]),
        featured: row.featured === 1,
        aliases: parseJsonArray(row.aliases_json),
        seoTitle: row.seo_title || '',
        seoDescription: row.seo_description || '',
        seoKeywords: row.seo_keywords || ''
    };
}

function findSqliteProductByAlias(db, id) {
    const rows = db.prepare(`
        SELECT id, aliases_json
        FROM products
        WHERE status = 'published' AND aliases_json IS NOT NULL AND aliases_json != ''
    `).all();
    for (const row of rows) {
        if (parseJsonArray(row.aliases_json).indexOf(id) !== -1) return row.id;
    }
    return null;
}

function readSqliteProducts(id) {
    const db = getDb();
    let params = [];
    let idWhere = '';
    if (id) {
        const direct = db.prepare(`
            SELECT id
            FROM products
            WHERE status = 'published' AND legacy_id = ?
            LIMIT 1
        `).get(id);
        const internalId = direct ? direct.id : findSqliteProductByAlias(db, id);
        if (!internalId) return [];
        params = [internalId];
        idWhere = 'AND p.id = ?';
    }

    const products = db.prepare(`
        SELECT
            p.*,
            c.slug AS category_slug,
            c.name_en AS category_label,
            c.name_ar AS category_label_ar,
            parent.slug AS parent_slug,
            parent.name_en AS parent_label,
            parent.name_ar AS parent_label_ar
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE p.status = 'published'
            AND p.category_id IS NOT NULL
            AND c.id IS NOT NULL
            AND c.is_active = 1
            AND (c.parent_id IS NULL OR parent.is_active = 1)
            ${idWhere}
        ORDER BY p.sort_order, p.id
    `).all(params);

    if (!products.length) return [];

    const ids = products.map(product => product.id);
    const placeholders = ids.map(() => '?').join(',');
    const specRows = db.prepare(`
        SELECT * FROM product_specs
        WHERE product_id IN (${placeholders})
        ORDER BY spec_group, sort_order, id
    `).all(ids);
    const mediaRows = db.prepare(`
        SELECT * FROM product_media
        WHERE product_id IN (${placeholders}) AND is_cover = 1
        ORDER BY sort_order, id
    `).all(ids);

    const specsByProduct = {};
    specRows.forEach(function (spec) {
        if (!specsByProduct[spec.product_id]) specsByProduct[spec.product_id] = [];
        specsByProduct[spec.product_id].push(spec);
    });

    const coverByProduct = {};
    mediaRows.forEach(function (media) {
        if (!coverByProduct[media.product_id]) coverByProduct[media.product_id] = media.path || '';
    });

    return products
        .map(product => mapSqliteProduct(product, specsByProduct, coverByProduct))
        .filter(Boolean);
}

router.get('/', function (req, res) {
    try {
        let result = readSqliteProducts();
        const { category, featured } = req.query;
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

router.get('/:id', function (req, res) {
    try {
        const product = readSqliteProducts(req.params.id)[0];
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read product.' });
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

router.post('/upload', function (req, res) {
    return legacyGone(res);
});

module.exports = router;
