const { getDb } = require('../server/lib/db');
const { backfillAssetReferences } = require('../server/lib/assetReferences');

const apply = process.argv.includes('--apply');
const db = getDb();

const run = db.transaction(function () {
    return backfillAssetReferences(db, { apply });
});

const result = run();
console.log(JSON.stringify(result, null, 2));

if (!apply) {
    console.log('Dry run only. Re-run with --apply to create missing asset records and rebuild references.');
}