require('./lib/archived-legacy-writer-guard').assertArchivedLegacyWriterAllowed(__filename);

const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const db = new Database(path.join(ROOT, 'data', 'longxiang.db'));
const now = Date.now();

function parseBody(value) {
    try {
        return JSON.parse(value || '{}');
    } catch (err) {
        return {};
    }
}

const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get('solutions');

if (!row) {
    console.log('skip missing content block: solutions');
    process.exit(0);
}

const body = parseBody(row.body_json);
body.hero = body.hero || {};

if (Array.isArray(body.hero.actions) && body.hero.actions.length) {
    console.log('skip solutions hero actions: already present');
    process.exit(0);
}

body.hero.actions = [
    { label: 'Explore Solutions', labelAr: 'استكشف الحلول', href: '#engineering-epc', className: 'btn btn-primary' },
    {
        label: 'Talk to an Engineer',
        labelAr: 'اطلب حلاً',
        inquiry: true,
        className: 'btn btn-secondary',
        productName: 'Integrated Smart Energy Solutions',
        productNameAr: 'حلول الطاقة الذكية المتكاملة'
    }
];

db.prepare(`
    UPDATE content_blocks
    SET body_json = @body_json,
        version = @version,
        updated_at = @now
    WHERE id = @id
`).run({
    id: row.id,
    body_json: JSON.stringify(body),
    version: (row.version || 1) + 1,
    now
});

console.log('updated solutions hero actions');
