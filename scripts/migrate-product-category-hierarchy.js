#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { resolveDbPath } = require('../server/lib/db');

const dryRun = process.argv.indexOf('--dry-run') !== -1;

const HIERARCHY = [
    {
        slug: 'transformer',
        name_en: 'Transformer',
        name_ar: 'المحولات',
        sort_order: 0,
        children: [
            { slug: 'oil-immersed', name_en: 'Oil-Immersed', name_ar: 'محولات مغمورة بالزيت', sort_order: 1 },
            { slug: 'dry-type', name_en: 'Dry-Type', name_ar: 'محولات جافة', sort_order: 2 },
            { slug: 'special', name_en: 'Special', name_ar: 'محولات خاصة', sort_order: 3 },
            { slug: 'combined', name_en: 'Combined', name_ar: 'محولات مركبة', sort_order: 4 }
        ]
    },
    {
        slug: 'new-energy-equipment',
        name_en: 'New Energy Equipment',
        name_ar: 'معدات الطاقة الجديدة',
        sort_order: 10,
        children: [
            { slug: 'ac', name_en: 'AC EV Charging Station', name_ar: 'محطة شحن تيار متردد', sort_order: 11 },
            { slug: 'dc', name_en: 'DC EV Charging Station', name_ar: 'محطة شحن تيار مستمر', sort_order: 12 },
            { slug: 'energy-storage', name_en: 'Energy Storage System', name_ar: 'نظام تخزين الطاقة', sort_order: 13 }
        ]
    },
    {
        slug: 'switchgear',
        name_en: 'Switchgear',
        name_ar: 'معدات مفاتيح كهربائية',
        sort_order: 20,
        children: [
            { slug: 'medium-low-voltage', name_en: 'Medium&Low Voltage Switchgear', name_ar: 'معدات مفاتيح الجهد المتوسط والمنخفض', sort_order: 21 },
            { slug: 'high-voltage', name_en: 'High-Voltage Switchgear', name_ar: 'معدات مفاتيح الجهد العالي', sort_order: 22 }
        ]
    }
];

const PARENT_BY_CHILD_SLUG = HIERARCHY.reduce(function (acc, parent) {
    parent.children.forEach(function (child) {
        acc[child.slug] = parent.slug;
    });
    return acc;
}, {});

function nowStamp() {
    const now = new Date();
    function pad(value) {
        return String(value).padStart(2, '0');
    }
    return [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate())
    ].join('') + '-' + [
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds())
    ].join('');
}

function openDb() {
    const db = new Database(resolveDbPath(), dryRun ? { readonly: true, fileMustExist: true } : {});
    if (!dryRun) {
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

function getCategory(db, slug) {
    return db.prepare(`
        SELECT id, type, parent_id, slug, name_en, name_ar, sort_order, is_active
        FROM categories
        WHERE type = 'product' AND slug = ?
    `).get(slug);
}

function ensureCategory(db, category, parentId, changes) {
    const existing = getCategory(db, category.slug);
    const timestamp = Date.now();
    if (!existing) {
        if (!dryRun) {
            db.prepare(`
                INSERT INTO categories
                    (type, parent_id, slug, name_en, name_ar, sort_order, is_active, created_at, updated_at)
                VALUES
                    ('product', @parent_id, @slug, @name_en, @name_ar, @sort_order, 1, @created_at, @updated_at)
            `).run({
                parent_id: parentId,
                slug: category.slug,
                name_en: category.name_en,
                name_ar: category.name_ar,
                sort_order: category.sort_order,
                created_at: timestamp,
                updated_at: timestamp
            });
        }
        changes.push({
            action: 'create-category',
            slug: category.slug,
            parent_id: parentId
        });
        return dryRun ? { id: 'new:' + category.slug, slug: category.slug } : getCategory(db, category.slug);
    }

    const shouldUpdate = (
        String(existing.name_en || '') !== String(category.name_en || '') ||
        String(existing.name_ar || '') !== String(category.name_ar || '') ||
        Number(existing.sort_order || 0) !== Number(category.sort_order || 0) ||
        String(existing.parent_id || '') !== String(parentId || '') ||
        existing.is_active !== 1
    );

    if (shouldUpdate) {
        if (!dryRun) {
            db.prepare(`
                UPDATE categories
                SET parent_id = @parent_id,
                    name_en = @name_en,
                    name_ar = @name_ar,
                    sort_order = @sort_order,
                    is_active = 1,
                    updated_at = @updated_at
                WHERE id = @id
            `).run({
                id: existing.id,
                parent_id: parentId,
                name_en: category.name_en,
                name_ar: category.name_ar,
                sort_order: category.sort_order,
                updated_at: timestamp
            });
        }
        changes.push({
            action: 'update-category',
            slug: category.slug,
            from_parent_id: existing.parent_id,
            to_parent_id: parentId
        });
    }

    return dryRun ? existing : getCategory(db, category.slug);
}

function planSwitchgearProductMove(db, changes) {
    const switchgear = getCategory(db, 'switchgear');
    const mediumLow = getCategory(db, 'medium-low-voltage');
    if (!switchgear || !mediumLow) return;
    const rows = db.prepare(`
        SELECT id, legacy_id, name_en
        FROM products
        WHERE category_id = ?
    `).all(switchgear.id);
    rows.forEach(function (row) {
        changes.push({
            action: 'move-product-from-parent',
            id: row.id,
            legacy_id: row.legacy_id,
            name_en: row.name_en,
            from_category: 'switchgear',
            to_category: 'medium-low-voltage'
        });
    });
    if (!dryRun && rows.length) {
        db.prepare(`
            UPDATE products
            SET category_id = @to_category_id,
                product_group = 'switchgear',
                sub_category = 'medium-low-voltage',
                updated_at = @updated_at
            WHERE category_id = @from_category_id
        `).run({
            from_category_id: switchgear.id,
            to_category_id: mediumLow.id,
            updated_at: Date.now()
        });
    }
}

function syncProductGroups(db, changes) {
    const rows = db.prepare(`
        SELECT
            p.id,
            p.legacy_id,
            p.name_en,
            p.product_group,
            p.sub_category,
            child.slug AS child_slug,
            parent.slug AS parent_slug
        FROM products p
        JOIN categories child ON child.id = p.category_id
        LEFT JOIN categories parent ON parent.id = child.parent_id
        WHERE child.type = 'product'
    `).all();

    const update = dryRun ? null : db.prepare(`
        UPDATE products
        SET product_group = @product_group,
            sub_category = @sub_category,
            updated_at = @updated_at
        WHERE id = @id
    `);
    const timestamp = Date.now();

    rows.forEach(function (row) {
        const nextGroup = row.parent_slug || PARENT_BY_CHILD_SLUG[row.child_slug] || '';
        if (!nextGroup) return;
        if (row.product_group === nextGroup && row.sub_category === row.child_slug) return;
        changes.push({
            action: 'sync-product-group',
            id: row.id,
            legacy_id: row.legacy_id,
            name_en: row.name_en,
            old_product_group: row.product_group,
            old_sub_category: row.sub_category,
            new_product_group: nextGroup,
            new_sub_category: row.child_slug
        });
        if (update) {
            update.run({
                id: row.id,
                product_group: nextGroup,
                sub_category: row.child_slug,
                updated_at: timestamp
            });
        }
    });
}

async function backupDatabase(db) {
    const dbPath = resolveDbPath();
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(
        backupDir,
        'longxiang.db.bak-category-hierarchy-' + nowStamp()
    );
    await db.backup(backupPath);
    return backupPath;
}

async function main() {
    const db = openDb();
    const changes = [];
    let backupPath = null;

    try {
        if (!dryRun) backupPath = await backupDatabase(db);

        const migrate = dryRun ? function (fn) { return fn(); } : db.transaction(function () {
            HIERARCHY.forEach(function (parent) {
                const parentRow = ensureCategory(db, parent, null, changes);
                parent.children.forEach(function (child) {
                    ensureCategory(db, child, parentRow.id, changes);
                });
            });
            planSwitchgearProductMove(db, changes);
            syncProductGroups(db, changes);
        });

        if (dryRun) {
            HIERARCHY.forEach(function (parent) {
                const parentRow = ensureCategory(db, parent, null, changes);
                parent.children.forEach(function (child) {
                    ensureCategory(db, child, parentRow.id, changes);
                });
            });
            planSwitchgearProductMove(db, changes);
            syncProductGroups(db, changes);
        } else {
            migrate();
        }

        const summary = {
            mode: dryRun ? 'dry-run' : 'write',
            backupPath,
            changes: changes.length,
            byAction: changes.reduce(function (acc, change) {
                acc[change.action] = (acc[change.action] || 0) + 1;
                return acc;
            }, {}),
            items: changes
        };
        console.log(JSON.stringify(summary, null, 2));
    } finally {
        db.close();
    }
}

main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
