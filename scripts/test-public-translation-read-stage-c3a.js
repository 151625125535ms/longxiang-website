'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { createVerifiedSqliteBackup } = require('../server/lib/sqliteBackup');
const { runMigrations } = require('../server/db/migrations');
const stageBMigration = require('../server/db/migrations/0007_translation_revisions');
const { loadLocaleRegistry } = require('../server/lib/localeRegistry');
const { analyzeTranslationBackfill, applyTranslationBackfill } = require('../server/lib/translationBackfill');
const { analyzeContentOverlayMigration, applyContentOverlayMigration } = require('../server/lib/contentOverlayMigration');
const {
    PublicTranslationReadError,
    resolvePublicTranslationReadSource,
    createPublicTranslationReadAdapter,
    createRuntimePublicTranslationReadAdapter
} = require('../server/lib/publicTranslationReadAdapter');
const { comparePublicTranslationSources, databaseFingerprint } = require('../server/lib/publicTranslationReadParity');
const {
    analyzeContentTranslationParityRepair,
    applyContentTranslationParityRepair,
    rollbackContentTranslationParityRepair
} = require('../server/lib/contentTranslationParityRepair');

const SOURCE_DB = path.join(__dirname, '..', 'data', 'longxiang.db');

function queryCounter(db) {
    let count = 0;
    const proxy = new Proxy(db, {
        get: function (target, property) {
            if (property === 'prepare') {
                return function (sql) {
                    count += 1;
                    return target.prepare(sql);
                };
            }
            const value = target[property];
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });
    return {
        db: proxy,
        count: function () { return count; },
        reset: function () { count = 0; }
    };
}

function prepareRevisionData(db, registry) {
    stageBMigration.up(db);
    runMigrations(db);
    const backfill = analyzeTranslationBackfill({ db, registry });
    assert.strictEqual(backfill.blockers.length, 0, JSON.stringify(backfill.blockers, null, 2));
    if (backfill.specCodes.length || backfill.revisions.length) {
        applyTranslationBackfill({
            db,
            registry,
            expectedPlanHash: backfill.planHash,
            actor: { username: 'stage-c3a-test' }
        });
    }
    const overlays = analyzeContentOverlayMigration({ db, registry });
    assert.strictEqual(overlays.blockers.length, 0, JSON.stringify(overlays.blockers, null, 2));
    if (overlays.blocks.length) {
        applyContentOverlayMigration({
            db,
            registry,
            expectedPlanHash: overlays.planHash,
            actor: { username: 'stage-c3a-test' }
        });
    }
}

function assertSourceSwitch(db, registry) {
    assert.strictEqual(resolvePublicTranslationReadSource(), 'legacy');
    assert.strictEqual(resolvePublicTranslationReadSource(''), 'legacy');
    assert.strictEqual(resolvePublicTranslationReadSource('legacy'), 'legacy');
    assert.strictEqual(resolvePublicTranslationReadSource('revision'), 'revision');
    assert.throws(function () {
        resolvePublicTranslationReadSource('unexpected');
    }, function (error) {
        return error instanceof PublicTranslationReadError
            && error.code === 'INVALID_PUBLIC_TRANSLATION_READ_SOURCE';
    });
    assert.strictEqual(createRuntimePublicTranslationReadAdapter({ db, registry, env: {} }).source, 'legacy');
    assert.strictEqual(createRuntimePublicTranslationReadAdapter({
        db,
        registry,
        env: { PUBLIC_TRANSLATION_READ_SOURCE: 'revision' }
    }).source, 'revision');
}

function assertMissingRevisionFailsClosed(db, registry) {
    const row = db.prepare(`
        SELECT id FROM product_translations
        WHERE revision_state = 'published' AND locale = 'ar'
        ORDER BY id LIMIT 1
    `).get();
    assert(row, 'missing published Arabic product revision fixture');
    db.prepare("UPDATE product_translations SET revision_state = 'draft' WHERE id = ?").run(row.id);
    try {
        assert.throws(function () {
            createPublicTranslationReadAdapter({ db, registry, source: 'revision' });
        }, function (error) {
            return error instanceof PublicTranslationReadError
                && error.code === 'REVISION_SOURCE_NOT_READY';
        });
    } finally {
        db.prepare("UPDATE product_translations SET revision_state = 'published' WHERE id = ?").run(row.id);
    }
}

function assertQueryBudgets(db, registry) {
    const counted = queryCounter(db);
    const reader = createPublicTranslationReadAdapter({ db: counted.db, registry, source: 'revision' });
    const sample = reader.readProducts()[0];
    const identifier = sample.slug || sample.id;

    counted.reset();
    const products = reader.readPresentationProducts('en');
    assert(products.length > 0);
    assert(counted.count() <= 9, 'revision presentation list exceeded query budget: ' + counted.count());

    counted.reset();
    assert(reader.readPresentationProduct(identifier, 'ar'));
    assert(counted.count() <= 11, 'revision presentation detail exceeded query budget: ' + counted.count());

    counted.reset();
    assert(reader.readLocalizedContentBlock('about-us', 'fr'));
    assert.strictEqual(counted.count(), 1, 'revision content read must use one query');
}

async function run() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'longxiang-stage-c3a-'));
    const dbPath = path.join(tempDir, 'stage-c3a.db');
    let db;
    try {
        await createVerifiedSqliteBackup({ sourcePath: SOURCE_DB, backupPath: dbPath });
        db = new Database(dbPath, { fileMustExist: true });
        db.pragma('foreign_keys = ON');
        const registry = loadLocaleRegistry();
        prepareRevisionData(db, registry);
        assertSourceSwitch(db, registry);
        assertMissingRevisionFailsClosed(db, registry);
        assertQueryBudgets(db, registry);

        const beforeRepair = comparePublicTranslationSources({ db, registry });
        assert(beforeRepair.blockers.some(function (blocker) {
            return blocker.name === 'ssr/static/ar/about.html';
        }), 'the local fixture must reproduce the Arabic About data parity blocker');
        [
            'ssr/static/fr/contact.html',
            'ssr/static/ru/contact.html'
        ].forEach(function (name) {
            assert(!beforeRepair.blockers.some(function (blocker) {
                return blocker.name === name;
            }), 'the presentation adapter must resolve the Contact parity blocker before data repair: ' + name);
        });
        const unrelatedDraft = db.prepare(`
            INSERT INTO content_block_translations
                (content_block_id, locale, revision_no, revision_state, base_revision_id,
                 title, schema_version, translation_json, base_structure_hash, version,
                 created_by, updated_by, created_at, updated_at, published_at)
            SELECT
                published.content_block_id, published.locale,
                (SELECT COALESCE(MAX(existing.revision_no), 0) + 1
                 FROM content_block_translations existing
                 WHERE existing.content_block_id = published.content_block_id AND existing.locale = published.locale),
                'draft', published.id, published.title, published.schema_version,
                published.translation_json, published.base_structure_hash, 1,
                'stage-c3a-test', 'stage-c3a-test', ?, ?, NULL
            FROM content_block_translations published
            JOIN content_blocks block ON block.id = published.content_block_id
            WHERE block.slug = 'about-us' AND published.locale = 'fr'
                AND published.revision_state = 'published'
            LIMIT 1
        `).run(Date.now(), Date.now());
        assert.strictEqual(unrelatedDraft.changes, 1, 'failed to create unrelated French draft fixture');
        const planWithUnrelatedDraft = analyzeContentTranslationParityRepair({ db, registry });
        assert(!planWithUnrelatedDraft.blockers.some(function (blocker) {
            return blocker.code === 'DRAFT_CONFLICT';
        }), 'an unrelated locale draft must not block the Arabic About repair');
        db.prepare('DELETE FROM content_block_translations WHERE id = ?').run(Number(unrelatedDraft.lastInsertRowid));
        const repairPlan = analyzeContentTranslationParityRepair({ db, registry });
        assert.strictEqual(repairPlan.blockers.length, 0, JSON.stringify(repairPlan.blockers, null, 2));
        assert.strictEqual(repairPlan.changes.length, 1);
        assert.strictEqual(analyzeContentTranslationParityRepair({ db, registry }).planHash, repairPlan.planHash);
        const repaired = applyContentTranslationParityRepair({
            db,
            registry,
            expectedPlanHash: repairPlan.planHash,
            actor: { username: 'stage-c3a-test' }
        });
        assert.strictEqual(repaired.after.changes.length, 0);
        rollbackContentTranslationParityRepair({
            db,
            receipt: repaired.receipt,
            actor: { username: 'stage-c3a-test' }
        });
        const restoredPlan = analyzeContentTranslationParityRepair({ db, registry });
        assert.strictEqual(restoredPlan.planHash, repairPlan.planHash, 'rollback must restore the same approved repair plan');
        applyContentTranslationParityRepair({
            db,
            registry,
            expectedPlanHash: restoredPlan.planHash,
            actor: { username: 'stage-c3a-test' }
        });

        const before = databaseFingerprint(db);
        db.pragma('query_only = ON');
        const parity = comparePublicTranslationSources({ db, registry });
        const after = databaseFingerprint(db);
        assert.strictEqual(after.hash, before.hash, 'read parity audit changed database state');
        assert.strictEqual(parity.summary.blockers, 0, JSON.stringify(parity.blockers.slice(0, 10), null, 2));
        process.stdout.write(JSON.stringify({
            ok: true,
            sourceDefault: 'legacy',
            schemaVersion: before.state.schemaVersion,
            parity: parity.summary,
            databaseUnchanged: before.hash === after.hash
        }, null, 2) + '\n');
    } finally {
        if (db) db.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

run().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
