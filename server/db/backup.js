const { resolveDbPath } = require('../lib/db');
const { createVerifiedSqliteBackup } = require('../lib/sqliteBackup');

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

async function backup(backupPathValue) {
    const dbPath = resolveDbPath();
    const backupPath = backupPathValue || dbPath + '.bak.' + timestamp();
    const result = await createVerifiedSqliteBackup({ sourcePath: dbPath, backupPath });
    console.log('SQLite backup created and verified: ' + result.backupPath);
    console.log('SQLite backup bytes: ' + result.sizeBytes);
    console.log('SQLite backup schema version: ' + result.summary.schemaVersion);
    return result;
}

if (require.main === module) {
    backup(process.argv[2]).catch(function (err) {
        console.error(err && err.stack ? err.stack : err);
        process.exitCode = 1;
    });
}

module.exports = { backup };
