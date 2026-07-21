'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
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
    comparePublicTranslationSources,
    databaseFingerprint
} = require('../server/lib/publicTranslationReadParity');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = path.join(ROOT, 'data', 'longxiang.db');
const ADMIN_USERNAME = 'content-lifecycle-admin';
const ADMIN_PASSWORD = 'ContentLifecyclePassword-2026';

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function availablePort() {
    return new Promise(function (resolve, reject) {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', function () {
            const port = server.address().port;
            server.close(function () { resolve(port); });
        });
    });
}

function request(port, method, urlPath, body, token) {
    const rawBody = body == null ? '' : JSON.stringify(body);
    const headers = {};
    if (rawBody) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(rawBody);
    }
    if (token) headers.Authorization = 'Bearer ' + token;
    return new Promise(function (resolve, reject) {
        const req = http.request({ hostname: '127.0.0.1', port, method, path: urlPath, headers, timeout: 5000 }, function (res) {
            let raw = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) { raw += chunk; });
            res.on('end', function () {
                let parsed = raw;
                try { parsed = raw ? JSON.parse(raw) : null; } catch (error) {}
                resolve({ status: res.statusCode, body: parsed, raw });
            });
        });
        req.on('timeout', function () { req.destroy(new Error('request timeout')); });
        req.on('error', reject);
        if (rawBody) req.write(rawBody);
        req.end();
    });
}

async function waitForServer(port, child, output) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        if (child.exitCode != null) throw new Error('test server exited early:\n' + output.value);
        try {
            const response = await request(port, 'GET', '/api/health');
            if (response.status === 200) return;
        } catch (error) {}
        await new Promise(function (resolve) { setTimeout(resolve, 150); });
    }
    throw new Error('test server did not become ready:\n' + output.value);
}

function stopServer(child) {
    if (!child || child.exitCode != null) return Promise.resolve();
    return new Promise(function (resolve) {
        const timer = setTimeout(function () {
            if (child.exitCode == null) child.kill('SIGKILL');
            resolve();
        }, 3000);
        child.once('exit', function () {
            clearTimeout(timer);
            resolve();
        });
        child.kill();
    });
}

async function removeTemporaryDirectory(directory) {
    const resolved = path.resolve(directory);
    const temporaryRoot = path.resolve(os.tmpdir()) + path.sep;
    if (!resolved.startsWith(temporaryRoot) || !path.basename(resolved).startsWith('lx-content-lifecycle-')) {
        throw new Error('Refusing to remove an unexpected temporary directory: ' + resolved);
    }
    let lastError = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
            fs.rmSync(resolved, { recursive: true, force: true });
            return;
        } catch (error) {
            lastError = error;
            await new Promise(function (resolve) { setTimeout(resolve, 100); });
        }
    }
    throw lastError;
}

function data(response) {
    assert.ok(response.body && response.body.ok, response.raw);
    return response.body.data;
}

function publishedRows(db, contentBlockId) {
    return db.prepare(`
        SELECT id, locale, base_revision_id, title, translation_json, base_structure_hash
        FROM content_block_translations
        WHERE content_block_id = ? AND revision_state = 'published'
        ORDER BY locale
    `).all(contentBlockId);
}

function stateFingerprint(db, contentBlockId) {
    return JSON.stringify({
        block: db.prepare('SELECT * FROM content_blocks WHERE id = ?').get(contentBlockId),
        schemas: db.prepare('SELECT * FROM content_translation_schemas WHERE content_block_id = ? ORDER BY id').all(contentBlockId),
        revisions: db.prepare('SELECT * FROM content_block_translations WHERE content_block_id = ? ORDER BY id').all(contentBlockId),
        references: db.prepare("SELECT * FROM asset_references WHERE entity_type = 'content_block' AND entity_id = ? ORDER BY id").all(contentBlockId)
    });
}

async function main() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-content-lifecycle-'));
    const dbPath = path.join(directory, 'test.db');
    await createVerifiedSqliteBackup({ sourcePath: SOURCE_DB, backupPath: dbPath });
    const setup = new Database(dbPath, { fileMustExist: true });
    setup.pragma('foreign_keys = ON');
    stageBMigration.up(setup);
    runMigrations(setup);
    const registry = loadLocaleRegistry();
    const stageBPlan = analyzeTranslationBackfill({ db: setup, registry });
    if (stageBPlan.specCodes.length || stageBPlan.revisions.length) {
        assert.strictEqual(stageBPlan.blockers.length, 0, JSON.stringify(stageBPlan.blockers, null, 2));
        applyTranslationBackfill({
            db: setup,
            registry,
            expectedPlanHash: stageBPlan.planHash,
            actor: { username: 'content-lifecycle-fixture' }
        });
    }
    const overlayPlan = analyzeContentOverlayMigration({ db: setup, registry });
    if (overlayPlan.blocks.length) {
        assert.strictEqual(overlayPlan.blockers.length, 0, JSON.stringify(overlayPlan.blockers, null, 2));
        applyContentOverlayMigration({
            db: setup,
            registry,
            expectedPlanHash: overlayPlan.planHash,
            actor: { username: 'content-lifecycle-fixture' }
        });
    }
    const baselineParity = comparePublicTranslationSources({ db: setup, registry });
    const baselineBlockersByCheck = baselineParity.blockers.reduce(function (result, blocker) {
        result.set(blocker.name, (result.get(blocker.name) || 0) + 1);
        return result;
    }, new Map());
    setup.close();

    const port = await availablePort();
    const output = { value: '' };
    const child = childProcess.spawn(process.execPath, ['server/app.js'], {
        cwd: ROOT,
        env: Object.assign({}, process.env, {
            PORT: String(port),
            DB_PATH: dbPath,
            ADMIN_USERNAME,
            ADMIN_PASSWORD,
            JWT_SECRET: 'content-lifecycle-test-secret',
            PUBLIC_TRANSLATION_READ_SOURCE: 'revision'
        }),
        stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', function (chunk) { output.value += chunk.toString(); });
    child.stderr.on('data', function (chunk) { output.value += chunk.toString(); });
    let database = null;

    try {
        await waitForServer(port, child, output);
        const login = await request(port, 'POST', '/api/auth/login', { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
        assert.strictEqual(login.status, 200, login.raw);
        const token = login.body.token;

        let block = data(await request(port, 'GET', '/api/admin/content-blocks/about-us', null, token));
        const contentBlockId = block.id;
        database = new Database(dbPath);
        const initialPublished = publishedRows(database, contentBlockId);
        assert.deepStrictEqual(initialPublished.map(function (row) { return row.locale; }), ['ar', 'en', 'fr', 'ru']);

        const sameStructureBody = clone(block.body_json);
        sameStructureBody.hero.subtitle = 'Lifecycle English base update';
        const sameStructureSave = await request(port, 'PUT', '/api/admin/content-blocks/about-us', {
            version: block.version,
            body_json: sameStructureBody
        }, token);
        assert.strictEqual(sameStructureSave.status, 200, sameStructureSave.raw);
        block = data(sameStructureSave);
        const afterSameStructure = publishedRows(database, contentBlockId);
        assert.deepStrictEqual(
            afterSameStructure.map(function (row) { return row.id; }),
            initialPublished.map(function (row) { return row.id; }),
            'same-structure saves must reuse immutable published revisions'
        );
        assert.ok(database.prepare(`
            SELECT 1 FROM content_translation_schemas
            WHERE content_block_id = ? AND content_version = ?
        `).get(contentBlockId, block.version), 'same-structure save must create an active schema for the new base version');

        const beforeVisualFrench = publishedRows(database, contentBlockId);
        const visualFrenchBody = clone(block.body_json);
        visualFrenchBody.hero.titleFr = 'Titre enregistre depuis le module visuel';
        const visualFrenchSave = await request(port, 'PUT', '/api/admin/content-blocks/about-us', {
            version: block.version,
            body_json: visualFrenchBody
        }, token);
        assert.strictEqual(visualFrenchSave.status, 200, visualFrenchSave.raw);
        block = data(visualFrenchSave);
        assert.strictEqual(
            data(await request(port, 'GET', '/api/content-blocks/about-us?locale=fr')).body.hero.title,
            'Titre enregistre depuis le module visuel',
            'a visual-builder locale edit must update the corresponding published revision'
        );
        const afterVisualFrench = publishedRows(database, contentBlockId);
        afterVisualFrench.forEach(function (row) {
            const previous = beforeVisualFrench.find(function (item) { return item.locale === row.locale; });
            if (row.locale === 'fr') {
                assert.notStrictEqual(row.id, previous.id, 'the edited locale must receive a new immutable revision');
                assert.strictEqual(row.base_revision_id, previous.id, 'the edited locale revision must retain lineage');
            } else {
                assert.strictEqual(row.id, previous.id, 'unmodified locales must keep their published revisions');
            }
        });

        const translationPath = '/api/admin/translations/content_block/' + contentBlockId + '/fr';
        let translationState = data(await request(port, 'GET', translationPath, null, token));
        const previousFrenchTitle = data(await request(port, 'GET', '/api/content-blocks/about-us?locale=fr')).body.hero.title;
        const frenchOverlay = clone(translationState.published.values.translation_json);
        frenchOverlay.values['/hero/title'] = 'Titre du cycle de vie';
        const draftState = data(await request(port, 'PUT', translationPath, {
            version: 0,
            values: { translation_json: frenchOverlay }
        }, token));
        assert.strictEqual(
            data(await request(port, 'GET', '/api/content-blocks/about-us?locale=fr')).body.hero.title,
            previousFrenchTitle,
            'saving a content translation draft must not change public output'
        );
        translationState = data(await request(port, 'GET', translationPath, null, token));
        assert.strictEqual(translationState.draft.id, draftState.draft.id, 'content draft must survive a fresh API read');
        const publishedState = data(await request(port, 'POST', translationPath + '/publish', {
            draftVersion: translationState.draft.version,
            publishedRevisionId: translationState.published.id
        }, token));
        assert.strictEqual(
            data(await request(port, 'GET', '/api/content-blocks/about-us?locale=fr')).body.hero.title,
            'Titre du cycle de vie',
            'publishing a content draft must change revision public output'
        );
        const previousRevision = publishedState.history.find(function (revision) {
            return revision.id === translationState.published.id;
        });
        assert.ok(previousRevision, 'the previous published content revision must remain archived');
        const restoredState = data(await request(port, 'POST', translationPath + '/restore', {
            revisionId: previousRevision.id,
            publishedRevisionId: publishedState.published.id
        }, token));
        assert.strictEqual(restoredState.published.id, previousRevision.id);
        assert.strictEqual(
            data(await request(port, 'GET', '/api/content-blocks/about-us?locale=fr')).body.hero.title,
            previousFrenchTitle,
            'restoring a content revision must restore public output'
        );

        const arabicTranslationPath = '/api/admin/translations/content_block/' + contentBlockId + '/ar';
        let arabicState = data(await request(port, 'GET', arabicTranslationPath, null, token));
        const originalArabicBlockTitle = arabicState.published.values.title;
        const arabicDraft = data(await request(port, 'PUT', arabicTranslationPath, {
            version: 0,
            values: { title: 'عنوان دورة حياة المحتوى' }
        }, token));
        const arabicPublished = data(await request(port, 'POST', arabicTranslationPath + '/publish', {
            draftVersion: arabicDraft.draft.version,
            publishedRevisionId: arabicDraft.published.id
        }, token));
        block = data(await request(port, 'GET', '/api/admin/content-blocks/about-us', null, token));
        assert.strictEqual(block.title_ar, 'عنوان دورة حياة المحتوى', 'Arabic title publish must mirror the legacy public title');
        assert.ok(database.prepare(`
            SELECT 1 FROM content_translation_schemas
            WHERE content_block_id = ? AND content_version = ?
        `).get(contentBlockId, block.version), 'title publication must advance the active content schema');
        assert.strictEqual(
            data(await request(port, 'GET', '/api/content-blocks/about-us?locale=ar')).title,
            'عنوان دورة حياة المحتوى'
        );
        const archivedArabic = arabicPublished.history.find(function (revision) {
            return revision.id === arabicState.published.id;
        });
        arabicState = data(await request(port, 'POST', arabicTranslationPath + '/restore', {
            revisionId: archivedArabic.id,
            publishedRevisionId: arabicPublished.published.id
        }, token));
        block = data(await request(port, 'GET', '/api/admin/content-blocks/about-us', null, token));
        assert.strictEqual(block.title_ar, originalArabicBlockTitle, 'Arabic title restore must mirror the previous legacy title');
        assert.strictEqual(arabicState.published.id, archivedArabic.id);

        const invalidOverlay = clone(restoredState.published.values.translation_json);
        invalidOverlay.values['/not/allowed'] = 'invalid';
        let invalidDraft = data(await request(port, 'PUT', translationPath, {
            version: 0,
            values: { translation_json: invalidOverlay }
        }, token));
        const invalidPublish = await request(port, 'POST', translationPath + '/publish', {
            draftVersion: invalidDraft.draft.version,
            publishedRevisionId: invalidDraft.published.id
        }, token);
        assert.strictEqual(invalidPublish.status, 409, invalidPublish.raw);
        assert.strictEqual(invalidPublish.body.error.code, 'CONTENT_OVERLAY_REBASE_REQUIRED');
        invalidDraft = data(await request(port, 'GET', translationPath, null, token));
        await request(port, 'POST', translationPath + '/discard', { draftVersion: invalidDraft.draft.version }, token);

        const validDraft = data(await request(port, 'PUT', translationPath, {
            version: 0,
            values: { translation_json: restoredState.published.values.translation_json }
        }, token));
        block = data(await request(port, 'GET', '/api/admin/content-blocks/about-us', null, token));
        const blockedBody = clone(block.body_json);
        blockedBody.hero.lifecycleDraftBlocker = true;
        const blockedVersion = block.version;
        const blockedUpdate = await request(port, 'PUT', '/api/admin/content-blocks/about-us', {
            version: block.version,
            body_json: blockedBody
        }, token);
        assert.strictEqual(blockedUpdate.status, 409, blockedUpdate.raw);
        assert.strictEqual(blockedUpdate.body.error.code, 'CONTENT_OVERLAY_REBASE_REQUIRED');
        assert.strictEqual(
            data(await request(port, 'GET', '/api/admin/content-blocks/about-us', null, token)).version,
            blockedVersion,
            'a draft-blocked structure update must roll back the base row'
        );
        await request(port, 'POST', translationPath + '/discard', { draftVersion: validDraft.draft.version }, token);

        block = data(await request(port, 'GET', '/api/admin/content-blocks/about-us', null, token));
        const beforeStructureRows = publishedRows(database, contentBlockId);
        const structuredBody = clone(block.body_json);
        structuredBody.hero.lifecycleStableFlag = true;
        const structureSave = await request(port, 'PUT', '/api/admin/content-blocks/about-us', {
            version: block.version,
            body_json: structuredBody
        }, token);
        assert.strictEqual(structureSave.status, 200, structureSave.raw);
        block = data(structureSave);
        const afterStructureRows = publishedRows(database, contentBlockId);
        afterStructureRows.forEach(function (row) {
            const previous = beforeStructureRows.find(function (item) { return item.locale === row.locale; });
            assert.notStrictEqual(row.id, previous.id, 'structure changes must create a new immutable published revision');
            assert.strictEqual(row.base_revision_id, previous.id, 'rebuilt revisions must retain lineage');
        });

        const arabicMilestonesBefore = data(
            await request(port, 'GET', '/api/content-blocks/about-us?locale=ar')
        ).body.milestones.map(function (item) { return item.title; });
        const frenchMilestonesBefore = data(
            await request(port, 'GET', '/api/content-blocks/about-us?locale=fr')
        ).body.milestones.map(function (item) { return item.title; });
        const reorderedBody = clone(block.body_json);
        reorderedBody.milestones.reverse();
        const reorderSave = await request(port, 'PUT', '/api/admin/content-blocks/about-us', {
            version: block.version,
            body_json: reorderedBody
        }, token);
        assert.strictEqual(reorderSave.status, 200, reorderSave.raw);
        block = data(reorderSave);
        const arabicMilestonesAfter = data(
            await request(port, 'GET', '/api/content-blocks/about-us?locale=ar')
        ).body.milestones.map(function (item) { return item.title; });
        assert.deepStrictEqual(
            arabicMilestonesAfter,
            arabicMilestonesBefore.slice().reverse(),
            'stable array IDs must keep translated content attached to the same item after reordering'
        );
        const frenchMilestonesAfter = data(
            await request(port, 'GET', '/api/content-blocks/about-us?locale=fr')
        ).body.milestones.map(function (item) { return item.title; });
        assert.deepStrictEqual(
            frenchMilestonesAfter,
            frenchMilestonesBefore.slice().reverse(),
            'legacy index patches must not overwrite stable-ID French revisions after reordering'
        );

        const insertedBody = clone(block.body_json);
        insertedBody.milestones.unshift({
            date: 'Future',
            title: 'Lifecycle test milestone',
            text: 'A new item without a supplied stable ID.'
        });
        const insertedSave = await request(port, 'PUT', '/api/admin/content-blocks/about-us', {
            version: block.version,
            body_json: insertedBody
        }, token);
        assert.strictEqual(insertedSave.status, 200, insertedSave.raw);
        block = data(insertedSave);
        const frenchAfterInsert = data(
            await request(port, 'GET', '/api/content-blocks/about-us?locale=fr')
        ).body.milestones.map(function (item) { return item.title; });
        assert.deepStrictEqual(
            frenchAfterInsert,
            ['Lifecycle test milestone'].concat(frenchMilestonesAfter),
            'new stable-ID items must fall back without shifting existing French translations'
        );

        const deletedBody = clone(block.body_json);
        deletedBody.milestones.shift();
        const deletedSave = await request(port, 'PUT', '/api/admin/content-blocks/about-us', {
            version: block.version,
            body_json: deletedBody
        }, token);
        assert.strictEqual(deletedSave.status, 200, deletedSave.raw);
        block = data(deletedSave);
        assert.deepStrictEqual(
            data(await request(port, 'GET', '/api/content-blocks/about-us?locale=fr')).body.milestones.map(function (item) { return item.title; }),
            frenchMilestonesAfter,
            'deleting a stable-ID item must not shift existing French translations'
        );

        const unpublish = await request(port, 'POST', '/api/admin/content-blocks/batch', {
            action: 'unpublish',
            ids: [contentBlockId],
            versionMap: { [contentBlockId]: block.version }
        }, token);
        assert.strictEqual(unpublish.status, 200, unpublish.raw);
        block = data(await request(port, 'GET', '/api/admin/content-blocks/about-us', null, token));
        assert.strictEqual(block.status, 'draft');
        const publish = await request(port, 'POST', '/api/admin/content-blocks/batch', {
            action: 'publish',
            ids: [contentBlockId],
            versionMap: { [contentBlockId]: block.version }
        }, token);
        assert.strictEqual(publish.status, 200, publish.raw);
        block = data(await request(port, 'GET', '/api/admin/content-blocks/about-us', null, token));
        assert.strictEqual(block.status, 'published');

        const now = Date.now();
        const sourceAsset = database.prepare(`
            INSERT INTO assets (path, filename, mime_type, module, is_active, created_at)
            VALUES ('assets/lifecycle-source.webp', 'lifecycle-source.webp', 'image/webp', 'content_blocks', 1, ?)
        `).run(now);
        const targetAsset = database.prepare(`
            INSERT INTO assets (path, filename, mime_type, module, is_active, created_at)
            VALUES ('assets/lifecycle-target.webp', 'lifecycle-target.webp', 'image/webp', 'content_blocks', 1, ?)
        `).run(now);
        const assetBody = clone(block.body_json);
        assetBody.hero.backgroundImage = 'assets/lifecycle-source.webp';
        const assetSetup = await request(port, 'PUT', '/api/admin/content-blocks/about-us', {
            version: block.version,
            body_json: assetBody
        }, token);
        assert.strictEqual(assetSetup.status, 200, assetSetup.raw);
        const replaceResponse = await request(port, 'POST', '/api/admin/assets/' + Number(sourceAsset.lastInsertRowid) + '/replace', {
            target_asset_id: Number(targetAsset.lastInsertRowid),
            confirm: true
        }, token);
        assert.strictEqual(replaceResponse.status, 200, replaceResponse.raw);
        assert.strictEqual(data(replaceResponse).content_blocks, 1);
        block = data(await request(port, 'GET', '/api/admin/content-blocks/about-us', null, token));
        assert.strictEqual(block.body_json.hero.backgroundImage, 'assets/lifecycle-target.webp');
        assert.ok(database.prepare(`
            SELECT 1 FROM content_translation_schemas
            WHERE content_block_id = ? AND content_version = ?
        `).get(contentBlockId, block.version), 'asset replacement must leave an active content schema');
        assert.strictEqual(
            data(await request(port, 'GET', '/api/content-blocks/about-us?locale=fr')).body.hero.title,
            previousFrenchTitle,
            'asset replacement must preserve the published locale overlay'
        );

        const beforeRollback = stateFingerprint(database, contentBlockId);
        const { updateContentBlock } = require('../server/lib/contentBlockLifecycle');
        assert.throws(function () {
            updateContentBlock({
                db: database,
                contentBlockId,
                expectedVersion: block.version,
                next: { title_en: 'This transaction must roll back' },
                actor: { username: 'rollback-test' },
                afterWrite: function () { throw new Error('forced lifecycle rollback'); }
            });
        }, /forced lifecycle rollback/);
        assert.strictEqual(stateFingerprint(database, contentBlockId), beforeRollback, 'lifecycle callback failure must roll back all state');

        const parityFingerprintBefore = databaseFingerprint(database);
        const parity = comparePublicTranslationSources({ db: database, registry: loadLocaleRegistry() });
        const parityFingerprintAfter = databaseFingerprint(database);
        const currentBlockersByCheck = parity.blockers.reduce(function (result, blocker) {
            result.set(blocker.name, (result.get(blocker.name) || 0) + 1);
            return result;
        }, new Map());
        const newParityChecks = [...currentBlockersByCheck].filter(function (entry) {
            return entry[1] > (baselineBlockersByCheck.get(entry[0]) || 0);
        });
        assert.deepStrictEqual(newParityChecks, [], 'lifecycle writes must not introduce new legacy/revision parity checks');
        assert.ok(
            parity.summary.blockers <= baselineParity.summary.blockers,
            'lifecycle writes must not increase the existing parity blocker count'
        );
        assert.strictEqual(
            parityFingerprintAfter.hash,
            parityFingerprintBefore.hash,
            'legacy/revision parity analysis must not write the database'
        );

        const publishedFrenchBeforeCorruption = database.prepare(`
            SELECT * FROM content_block_translations
            WHERE content_block_id = ? AND locale = 'fr' AND revision_state = 'published'
        `).get(contentBlockId);
        const corruptPublished = database.transaction(function () {
            database.prepare("UPDATE content_block_translations SET revision_state = 'archived' WHERE id = ?")
                .run(publishedFrenchBeforeCorruption.id);
            const revisionNo = database.prepare(`
                SELECT COALESCE(MAX(revision_no), 0) + 1 AS value
                FROM content_block_translations WHERE content_block_id = ? AND locale = 'fr'
            `).get(contentBlockId).value;
            return Number(database.prepare(`
                INSERT INTO content_block_translations
                    (content_block_id, locale, revision_no, revision_state, base_revision_id,
                     title, schema_version, translation_json, base_structure_hash, version,
                     created_by, updated_by, created_at, updated_at, published_at)
                SELECT content_block_id, locale, ?, 'published', id,
                       title, schema_version, ?, base_structure_hash, 1,
                       'invalid-overlay-test', 'invalid-overlay-test', ?, ?, ?
                FROM content_block_translations WHERE id = ?
            `).run(
                revisionNo,
                JSON.stringify({ overlayVersion: 1, values: { '/not/allowed': 'invalid' }, replacements: {} }),
                Date.now(),
                Date.now(),
                Date.now(),
                publishedFrenchBeforeCorruption.id
            ).lastInsertRowid);
        }).immediate();
        let invalidPublished;
        try {
            invalidPublished = await request(port, 'GET', '/api/content-blocks/about-us?locale=fr');
        } catch (error) {
            await new Promise(function (resolve) { setTimeout(resolve, 200); });
            if (child.exitCode == null) {
                invalidPublished = await request(port, 'GET', '/api/content-blocks/about-us?locale=fr');
            } else {
                throw new Error(error.message + '\nTest server exit: ' + child.exitCode + '\nTest server output:\n' + output.value);
            }
        }
        assert.strictEqual(invalidPublished.status, 503, invalidPublished.raw);
        assert.strictEqual(invalidPublished.body.error.code, 'REVISION_SOURCE_NOT_READY');
        assert.strictEqual(invalidPublished.body.error.details, undefined, 'public errors must not expose internal overlay details');
        const { revisionReadiness } = require('../server/lib/publicTranslationReadAdapter');
        const invalidReadiness = revisionReadiness(database);
        assert.strictEqual(invalidReadiness.ready, false, 'restart readiness must reject an invalid published overlay');
        assert.ok(invalidReadiness.blockers.some(function (blocker) {
            return blocker.code === 'CONTENT_OVERLAY_REVISION_INVALID'
                && blocker.invalid.some(function (item) {
                    return item.entityId === contentBlockId
                        && item.locale === 'fr'
                        && item.cause === 'OVERLAY_PATH_NOT_ALLOWED';
                });
        }), 'readiness must report the invalid content block, locale and overlay cause');
        database.transaction(function () {
            database.prepare('DELETE FROM content_block_translations WHERE id = ?').run(corruptPublished);
            database.prepare("UPDATE content_block_translations SET revision_state = 'published' WHERE id = ?")
                .run(publishedFrenchBeforeCorruption.id);
        }).immediate();

        database.prepare(`
            DELETE FROM content_translation_schemas
            WHERE content_block_id = ? AND content_version = ?
        `).run(contentBlockId, block.version);
        let unavailable;
        try {
            unavailable = await request(port, 'GET', '/api/content-blocks/about-us?locale=fr');
        } catch (error) {
            await new Promise(function (resolve) { setTimeout(resolve, 200); });
            if (child.exitCode == null) {
                unavailable = await request(port, 'GET', '/api/content-blocks/about-us?locale=fr');
            } else {
                throw new Error(error.message + '\nTest server exit: ' + child.exitCode + '\nTest server output:\n' + output.value);
            }
        }
        assert.strictEqual(unavailable.status, 503, unavailable.raw);
        assert.strictEqual(unavailable.body.error.code, 'REVISION_SOURCE_NOT_READY');
        assert.notStrictEqual(unavailable.body.data, null, 'revision failure must not return a successful null payload');
        const readiness = revisionReadiness(database);
        assert.strictEqual(readiness.ready, false, 'restart readiness must detect the same missing active schema');
        assert.ok(readiness.blockers.some(function (blocker) { return blocker.code === 'CONTENT_OVERLAY_REVISION_MISSING'; }));

        database.close();
        database = null;
    } finally {
        await stopServer(child);
        if (database && database.open) database.close();
        await removeTemporaryDirectory(directory);
    }

    console.log('Stage A-C content block lifecycle tests passed.');
}

main().catch(function (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
