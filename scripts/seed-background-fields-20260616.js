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

function updateBlock(slug, updater) {
    const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get(slug);
    if (!row) {
        console.log('skip missing content block: ' + slug);
        return;
    }
    const body = parseBody(row.body_json);
    const before = JSON.stringify(body);
    updater(body);
    const after = JSON.stringify(body);
    if (before === after) {
        console.log('skip content block: ' + slug + ' no missing background fields');
        return;
    }
    db.prepare(`
        UPDATE content_blocks
        SET body_json = @body_json,
            status = 'published',
            version = @version,
            updated_at = @now
        WHERE id = @id
    `).run({
        id: row.id,
        body_json: after,
        version: (row.version || 1) + 1,
        now
    });
    console.log('updated content block: ' + slug + ' background fields');
}

updateBlock('about-us', function (body) {
    body.cta = body.cta || {};
    if (!body.cta.backgroundImage) body.cta.backgroundImage = '5、厂区厂貌/厂区2.JPG';
});

updateBlock('education', function (body) {
    body.cta = body.cta || {};
    if (!body.cta.backgroundImage) body.cta.backgroundImage = 'assets/education/images/international-cooperation-leadership.jpeg';
});
