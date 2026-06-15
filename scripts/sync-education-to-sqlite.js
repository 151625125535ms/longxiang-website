const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.join(__dirname, '..');
const dataPath = path.join(root, 'data', 'education.json');
const dbPath = process.env.DB_PATH
    ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(root, process.env.DB_PATH))
    : path.join(root, 'data', 'longxiang.db');

const content = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
content.updatedAt = new Date().toISOString();

const db = new Database(dbPath);
const result = db.prepare(
    "UPDATE content_blocks SET body_json = ?, updated_at = datetime('now') WHERE slug = 'education'"
).run(JSON.stringify(content));

if (!result.changes) {
    throw new Error("No content_blocks row found for slug 'education'. Run the database migration first.");
}

const talentTraining = (content.sections || []).find((section) => section.id === 'talent-training');
console.log(JSON.stringify({
    dbPath,
    updated: result.changes,
    talentTraining: talentTraining && {
        image: talentTraining.image,
        images: talentTraining.images
    }
}, null, 2));
