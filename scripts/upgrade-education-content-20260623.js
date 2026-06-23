const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { syncContentBlockAssetReferences } = require('../server/lib/assetReferences');

const root = path.resolve(__dirname, '..');
const dbPath = path.join(root, 'data', 'longxiang.db');
const backupDir = path.join(root, 'data', 'backups');
const modeSectionIds = ['industry-college', 'talent-training', 'training-equipment', 'research-global'];
const apply = process.argv.includes('--apply');
const dryRun = process.argv.includes('--dry-run') || !apply;

function readEducationFallbackLabels() {
    const sourcePath = path.join(root, 'js', 'education.js');
    const source = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : '';

    function block(pattern) {
        const match = source.match(pattern);
        return match ? match[1] : '';
    }

    function extract(from, key) {
        if (!from) return '';
        const match = from.match(new RegExp(key + "\\s*:\\s*'([^']*)'"));
        return match ? match[1] : '';
    }

    const arabicBlock = block(/var labels = isArabic \? \{([\s\S]*?)\}\s*:\s*\{/);
    const englishBlock = block(/\}\s*:\s*\{([\s\S]*?)\};\s*return labels\[key\]/);
    return {
        fourModels: extract(englishBlock, 'fourModels') || 'Four cooperation models',
        introTitle: extract(englishBlock, 'introTitle') || 'Choose a cooperation path that can be shown, operated, and scaled.',
        introText: extract(englishBlock, 'introText') || 'Based on the school-enterprise cooperation document, Longxiang packages education cooperation into four buyer-friendly solutions: platform building, talent development, equipment delivery, and research plus international expansion.',
        fourModelsAr: extract(arabicBlock, 'fourModels') || '',
        introTitleAr: extract(arabicBlock, 'introTitle') || '',
        introTextAr: extract(arabicBlock, 'introText') || '',
        philosophyAr: extract(arabicBlock, 'philosophy') || ''
    };
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

function fillText(target, key, value, changes, label) {
    if (!target[key] && value) {
        target[key] = value;
        changes.push(label || key);
    }
}

function uniqueList(items) {
    const seen = new Set();
    const result = [];
    (items || []).forEach((item) => {
        const value = String(item || '').trim();
        if (!value || seen.has(value)) return;
        seen.add(value);
        result.push(value);
    });
    return result;
}

function upgradeBody(body) {
    const labels = readEducationFallbackLabels();
    const next = clone(body || {});
    const changes = [];
    next.hero = isObject(next.hero) ? next.hero : {};
    const originalHeroImage = next.hero.backgroundImage;

    fillText(next.hero, 'eyebrowAr', labels.fourModelsAr || next.hero.titleAr || next.hero.eyebrow, changes, 'hero.eyebrowAr');

    next.intro = isObject(next.intro) ? next.intro : {};
    fillText(next.intro, 'kicker', labels.fourModels, changes, 'intro.kicker');
    fillText(next.intro, 'kickerAr', labels.fourModelsAr || next.hero.eyebrowAr, changes, 'intro.kickerAr');
    fillText(next.intro, 'title', labels.introTitle, changes, 'intro.title');
    fillText(next.intro, 'titleAr', labels.introTitleAr || next.hero.titleAr, changes, 'intro.titleAr');
    fillText(next.intro, 'text', labels.introText, changes, 'intro.text');
    fillText(next.intro, 'textAr', labels.introTextAr || next.hero.subtitleAr, changes, 'intro.textAr');

    next.seo = isObject(next.seo) ? next.seo : {};
    fillText(next.seo, 'title', 'Education Cooperation | Henan Longxiang Electrical Co., Ltd.', changes, 'seo.title');
    fillText(next.seo, 'titleAr', (next.hero.titleAr || 'Education Cooperation') + ' | Henan Longxiang Electrical Co., Ltd.', changes, 'seo.titleAr');
    fillText(next.seo, 'description', next.hero.subtitle || 'Education cooperation programs from Longxiang for colleges, vocational groups, utilities, and overseas institutions.', changes, 'seo.description');
    fillText(next.seo, 'descriptionAr', next.hero.subtitleAr || next.hero.subtitle || 'Education cooperation programs from Longxiang.', changes, 'seo.descriptionAr');
    fillText(next.seo, 'image', next.hero.backgroundImage || '', changes, 'seo.image');
    fillText(next.seo, 'canonicalPath', 'education.html', changes, 'seo.canonicalPath');

    next.sections = Array.isArray(next.sections) ? next.sections : [];
    let gallery = next.sections.find((section) => section && section.id === 'gallery');
    if (!gallery) {
        gallery = { id: 'gallery', title: 'Proof in Real Scenarios', titleAr: '', summary: '', summaryAr: '', images: [] };
        next.sections.push(gallery);
        changes.push('sections.gallery');
    }
    const extras = [];
    next.sections.forEach((section) => {
        if (!section || !modeSectionIds.includes(section.id)) return;
        const images = uniqueList(section.images || []);
        if (images.length > 3) {
            extras.push(...images.slice(3));
            section.images = images.slice(0, 3);
            changes.push('sections.' + section.id + '.images');
        } else {
            section.images = images;
        }
    });
    const mergedGallery = uniqueList([...(gallery.images || []), ...extras]).slice(0, 9);
    if (JSON.stringify(gallery.images || []) !== JSON.stringify(mergedGallery)) {
        gallery.images = mergedGallery;
        changes.push('sections.gallery.images');
    }

    const philosophy = next.sections.find((section) => section && section.id === 'cooperation-philosophy');
    if (philosophy) {
        fillText(philosophy, 'title', 'Cooperation philosophy', changes, 'cooperation-philosophy.title');
        fillText(philosophy, 'titleAr', labels.philosophyAr || philosophy.summaryAr || philosophy.title, changes, 'cooperation-philosophy.titleAr');
    }

    if (originalHeroImage && next.hero.backgroundImage !== originalHeroImage) {
        throw new Error('Hero image changed unexpectedly.');
    }
    next.updatedAt = new Date().toISOString();
    return { body: next, changes: Array.from(new Set(changes)) };
}

function main() {
    if (!fs.existsSync(dbPath)) throw new Error('Database not found: ' + dbPath);
    const db = new Database(dbPath);
    const row = db.prepare('SELECT id, slug, title_en, body_json, version FROM content_blocks WHERE slug = ?').get('education');
    if (!row) throw new Error('content_blocks.education not found.');
    const current = JSON.parse(row.body_json || '{}');
    const result = upgradeBody(current);

    console.log(JSON.stringify({ dryRun, apply, version: row.version, changes: result.changes }, null, 2));
    if (dryRun) {
        db.close();
        return;
    }

    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, 'education-content-' + stamp + '.json');
    fs.writeFileSync(backupPath, JSON.stringify(current, null, 2), 'utf8');

    const now = Date.now();
    const tx = db.transaction(() => {
        db.prepare('UPDATE content_blocks SET body_json = ?, version = version + 1, updated_at = ? WHERE slug = \'education\'').run(JSON.stringify(result.body), now);
        syncContentBlockAssetReferences(db, row.id);
    });
    tx();
    db.close();
    console.log('Education content upgraded. Backup: ' + path.relative(root, backupPath));
}

main();
