#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { resolveDbPath } = require('../server/lib/db');
const { getCategoryMapping } = require('../server/lib/category-helper');

const dryRun = process.argv.indexOf('--dry-run') !== -1;

function formatTimestamp(date) {
    function pad(value) {
        return String(value).padStart(2, '0');
    }

    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate())
    ].join('') + '-' + [
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
    ].join('');
}

function normalize(value) {
    return value == null ? '' : String(value);
}

function buildPlan(rows) {
    const changes = [];
    const skipped = [];
    const byOldGroup = {};

    rows.forEach(function (row) {
        if (row.category_id == null) {
            skipped.push({
                id: row.id,
                legacy_id: row.legacy_id,
                name: row.name_en,
                reason: 'category_id is NULL'
            });
            return;
        }

        if (!row.category_slug) {
            skipped.push({
                id: row.id,
                legacy_id: row.legacy_id,
                name: row.name_en,
                category_id: row.category_id,
                reason: 'category not found'
            });
            return;
        }

        const mapping = getCategoryMapping(row.category_slug);
        if (!mapping) {
            skipped.push({
                id: row.id,
                legacy_id: row.legacy_id,
                name: row.name_en,
                category_id: row.category_id,
                category_slug: row.category_slug,
                reason: 'category slug is not mapped'
            });
            return;
        }

        const oldGroup = normalize(row.product_group);
        const oldSubCategory = normalize(row.sub_category);
        if (oldGroup === mapping.group && oldSubCategory === mapping.subCategory) return;

        byOldGroup[oldGroup || '(empty)'] = (byOldGroup[oldGroup || '(empty)'] || 0) + 1;
        changes.push({
            id: row.id,
            legacy_id: row.legacy_id,
            name: row.name_en,
            status: row.status,
            category_id: row.category_id,
            category_slug: row.category_slug,
            old_product_group: oldGroup,
            old_sub_category: oldSubCategory,
            new_product_group: mapping.group,
            new_sub_category: mapping.subCategory
        });
    });

    return { changes, skipped, byOldGroup };
}

function backupDatabase() {
    const dbPath = resolveDbPath();
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const backupPath = path.join(
        backupDir,
        'longxiang.db.bak-repair-' + formatTimestamp(new Date())
    );
    fs.copyFileSync(dbPath, backupPath);
    return backupPath;
}

function openDatabase() {
    const db = new Database(resolveDbPath(), dryRun ? { readonly: true, fileMustExist: true } : {});
    if (!dryRun) {
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

function main() {
    const db = openDatabase();
    const rows = db.prepare(`
        SELECT
            p.id,
            p.legacy_id,
            p.name_en,
            p.status,
            p.category_id,
            p.product_group,
            p.sub_category,
            c.slug AS category_slug
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ORDER BY p.id
    `).all();

    const plan = buildPlan(rows);

    console.log(JSON.stringify({
        mode: dryRun ? 'dry-run' : 'write',
        affected: plan.changes.length,
        byOldGroup: plan.byOldGroup,
        skipped: plan.skipped,
        changes: plan.changes
    }, null, 2));

    if (dryRun || !plan.changes.length) return;

    const backupPath = backupDatabase();
    const update = db.prepare(`
        UPDATE products
        SET product_group = @new_product_group,
            sub_category = @new_sub_category,
            updated_at = @updated_at
        WHERE id = @id
    `);
    const now = Date.now();

    const runUpdates = db.transaction(function () {
        plan.changes.forEach(function (change) {
            update.run({
                id: change.id,
                new_product_group: change.new_product_group,
                new_sub_category: change.new_sub_category,
                updated_at: now
            });
        });
    });

    runUpdates();
    console.log(JSON.stringify({
        backupPath,
        updated: plan.changes.length
    }, null, 2));
}

main();
