'use strict';

const path = require('path');
const { loadVerifiedSnapshot } = require('../server/lib/stage2cPublicSnapshot');

function optionValue(argv, name) {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : '';
}

function verifyPublicSnapshot(directory) {
    return loadVerifiedSnapshot(directory).report;
}

function main() {
    const directory = optionValue(process.argv.slice(2), '--dir');
    if (!directory) throw new Error('Usage: node scripts/verify-stage2c-public-snapshot.js --dir .tmp/stage2c-public-snapshot-*');
    const report = verifyPublicSnapshot(path.resolve(directory));
    console.log(JSON.stringify({ ok: true, ...report }, null, 2));
}

if (require.main === module) {
    try { main(); } catch (err) { console.error(err.message); process.exit(1); }
}

module.exports = { verifyPublicSnapshot };
