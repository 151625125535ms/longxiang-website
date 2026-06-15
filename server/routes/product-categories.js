const express = require('express');
const { getDb } = require('../lib/db');
const { getCategoryMapping, GROUP_ORDER } = require('../lib/category-helper');

const router = express.Router();

const GROUP_LABELS = Object.freeze({
    transformer: {
        label: 'Transformer',
        labelAr: 'المحولات'
    },
    'new-energy-equipment': {
        label: 'New Energy Equipment',
        labelAr: 'معدات الطاقة الجديدة'
    },
    switchgear: {
        label: 'Switchgear',
        labelAr: 'معدات المفاتيح الكهربائية'
    }
});

function createGroup(group) {
    const labels = GROUP_LABELS[group] || { label: group, labelAr: group };
    return {
        group: group,
        label: labels.label,
        labelAr: labels.labelAr,
        children: []
    };
}

function addChild(group, row, mapping) {
    const child = {
        sub: mapping.subCategory,
        label: row.name_en || row.slug,
        labelAr: row.name_ar || row.name_en || row.slug,
        sourceSlug: row.slug
    };
    const existingIndex = group.children.findIndex(function (item) {
        return item.sub === child.sub;
    });

    if (existingIndex === -1) {
        group.children.push(child);
        return;
    }

    if (child.sourceSlug === child.sub && group.children[existingIndex].sourceSlug !== child.sub) {
        group.children[existingIndex] = child;
    }
}

function serializeGroup(group) {
    return {
        group: group.group,
        label: group.label,
        labelAr: group.labelAr,
        children: group.children.map(function (child) {
            return {
                sub: child.sub,
                label: child.label,
                labelAr: child.labelAr
            };
        })
    };
}

router.get('/', function (req, res, next) {
    try {
        const rows = getDb().prepare(`
            SELECT id, slug, name_en, name_ar, sort_order
            FROM categories
            WHERE type = 'product' AND is_active = 1
            ORDER BY sort_order ASC, id ASC
        `).all();

        const grouped = {};

        GROUP_ORDER.forEach(function (group) {
            grouped[group] = createGroup(group);
        });

        rows.forEach(function (row) {
            const mapping = getCategoryMapping(row.slug);
            if (!mapping) return;

            if (!grouped[mapping.group]) {
                grouped[mapping.group] = createGroup(mapping.group);
            }

            addChild(grouped[mapping.group], row, mapping);
        });

        const data = GROUP_ORDER
            .map(function (group) { return grouped[group]; })
            .filter(function (group) { return group && group.children.length; })
            .map(serializeGroup);

        res.json({ ok: true, data: data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
