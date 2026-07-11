'use strict';

const { getDb } = require('./db');
const { getCategoryMapping, GROUP_ORDER } = require('./category-helper');

const GROUP_LABELS = Object.freeze({
    transformer: { label: 'Transformer', labelAr: 'المحولات' },
    'new-energy-equipment': { label: 'New Energy Equipment', labelAr: 'معدات الطاقة الجديدة' },
    switchgear: { label: 'Switchgear', labelAr: 'معدات المفاتيح الكهربائية' }
});

function createGroup(group) {
    const labels = GROUP_LABELS[group] || { label: group, labelAr: group };
    return { group, label: labels.label, labelAr: labels.labelAr, labelFr: labels.labelFr || '', labelRu: labels.labelRu || '', children: [] };
}

function addChild(group, row, mapping) {
    const child = {
        sub: mapping.subCategory,
        label: row.name_en || row.slug,
        labelAr: row.name_ar || row.name_en || row.slug,
        labelFr: row.name_fr || '',
        labelRu: row.name_ru || '',
        sourceSlug: row.slug
    };
    const existingIndex = group.children.findIndex(function (item) { return item.sub === child.sub; });
    if (existingIndex === -1) group.children.push(child);
    else if (child.sourceSlug === child.sub && group.children[existingIndex].sourceSlug !== child.sub) group.children[existingIndex] = child;
}

function serializeGroup(group) {
    return {
        group: group.group,
        label: group.label,
        labelAr: group.labelAr,
        labelFr: group.labelFr || '',
        labelRu: group.labelRu || '',
        children: group.children.map(function (child) {
            return { sub: child.sub, label: child.label, labelAr: child.labelAr, labelFr: child.labelFr || '', labelRu: child.labelRu || '' };
        })
    };
}

function serializeHierarchy(rows) {
    const childrenByParent = {};
    rows.forEach(function (row) {
        if (row.parent_id != null) {
            if (!childrenByParent[row.parent_id]) childrenByParent[row.parent_id] = [];
            childrenByParent[row.parent_id].push(row);
        }
    });
    return rows.filter(function (row) { return row.parent_id == null; }).map(function (parent) {
        const children = (childrenByParent[parent.id] || []).map(function (child) {
            return {
                sub: child.slug,
                label: child.name_en || child.slug,
                labelAr: child.name_ar || child.name_en || child.slug,
                labelFr: child.name_fr || '',
                labelRu: child.name_ru || ''
            };
        });
        return {
            group: parent.slug,
            label: parent.name_en || parent.slug,
            labelAr: parent.name_ar || parent.name_en || parent.slug,
            labelFr: parent.name_fr || '',
            labelRu: parent.name_ru || '',
            children
        };
    }).filter(function (group) { return group.children.length; });
}

function readPublicProductCategories(dbValue) {
    const db = dbValue || getDb();
    const rows = db.prepare(`
        SELECT c.id, c.parent_id, c.slug, c.name_en, c.name_ar, c.name_fr, c.name_ru, c.sort_order
        FROM categories c
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE c.type = 'product'
            AND c.is_active = 1
            AND (c.parent_id IS NULL OR parent.is_active = 1)
        ORDER BY
            COALESCE(parent.sort_order, c.sort_order) ASC,
            CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
            c.sort_order ASC,
            c.id ASC
    `).all();
    const hierarchy = serializeHierarchy(rows);
    if (hierarchy.length) return hierarchy;

    const grouped = {};
    GROUP_ORDER.forEach(function (group) { grouped[group] = createGroup(group); });
    rows.forEach(function (row) {
        const mapping = getCategoryMapping(row.slug);
        if (!mapping) return;
        if (!grouped[mapping.group]) grouped[mapping.group] = createGroup(mapping.group);
        addChild(grouped[mapping.group], row, mapping);
    });
    return GROUP_ORDER.map(function (group) { return grouped[group]; })
        .filter(function (group) { return group && group.children.length; })
        .map(serializeGroup);
}

module.exports = { readPublicProductCategories };
