const { getDb, resolveDbPath } = require('../server/lib/db');
const { repairProductMediaAssetLinks } = require('../server/lib/assetReferences');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const verify = args.has('--verify');

const db = getDb();
const run = apply
    ? db.transaction(function () {
        return repairProductMediaAssetLinks(db, { apply: true });
    })
    : function () {
        return repairProductMediaAssetLinks(db, { apply: false });
    };

const result = run();
result.db_path = resolveDbPath();

console.log(JSON.stringify(result, null, 2));

if (!apply && !verify) {
    console.log('Dry run only. Re-run with --apply to create missing product assets, link product_media.asset_id, and rebuild product asset_references.');
}

if (verify && !result.ok) {
    process.exitCode = 1;
}
