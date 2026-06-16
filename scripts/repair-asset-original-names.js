const { getDb } = require('../server/lib/db');
const { normalizeUploadedFilename } = require('../server/lib/filenameEncoding');

const apply = process.argv.includes('--apply');
const db = getDb();

const rows = db.prepare(`
    SELECT id, original_name
    FROM assets
    WHERE original_name IS NOT NULL AND original_name != ''
    ORDER BY id
`).all();

const changes = rows
    .map(function (row) {
        const normalized = normalizeUploadedFilename(row.original_name);
        return normalized !== row.original_name
            ? { id: row.id, before: row.original_name, after: normalized }
            : null;
    })
    .filter(Boolean);

console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    scanned: rows.length,
    changes: changes.length,
    sample: changes.slice(0, 10)
}, null, 2));

if (apply && changes.length) {
    const update = db.prepare('UPDATE assets SET original_name = ? WHERE id = ?');
    const run = db.transaction(function () {
        changes.forEach(function (change) {
            update.run(change.after, change.id);
        });
    });
    run();
}
