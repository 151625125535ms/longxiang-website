const fs = require('fs');
const path = require('path');
const { resolveDbPath } = require('../lib/db');

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function backup() {
    const dbPath = resolveDbPath();
    if (!fs.existsSync(dbPath)) {
        console.warn('SQLite database not found, backup skipped: ' + dbPath);
        return;
    }

    const backupPath = dbPath + '.bak.' + timestamp();
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(dbPath, backupPath);
    console.log('SQLite backup created: ' + backupPath);
}

if (require.main === module) {
    backup();
}

module.exports = { backup };
