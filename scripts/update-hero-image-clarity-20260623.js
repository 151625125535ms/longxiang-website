const Database = require('better-sqlite3');

const db = new Database('data/longxiang.db');

const EDUCATION_HERO_IMAGE = 'assets/education/images/research-cooperation-office.webp';

function parseBody(row) {
    try {
        return row && row.body_json ? JSON.parse(row.body_json) : {};
    } catch (error) {
        throw new Error('content_blocks.education body_json is not valid JSON: ' + error.message);
    }
}

const row = db.prepare("SELECT id, body_json FROM content_blocks WHERE slug = 'education'").get();

if (!row) {
    db.close();
    throw new Error('content_blocks row not found for slug education');
}

const body = parseBody(row);
body.hero = body.hero || {};

const previous = body.hero.backgroundImage || '';
body.hero.backgroundImage = EDUCATION_HERO_IMAGE;

db.prepare(`
    UPDATE content_blocks
    SET body_json = ?, updated_at = ?
    WHERE slug = 'education'
`).run(JSON.stringify(body), Date.now());

db.close();

console.log(JSON.stringify({
    slug: 'education',
    field: 'hero.backgroundImage',
    previous,
    next: EDUCATION_HERO_IMAGE
}, null, 2));
