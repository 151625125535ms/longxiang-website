const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const dbPath = path.join(root, 'data', 'longxiang.db');
const modeSectionIds = ['industry-college', 'talent-training', 'training-equipment', 'research-global'];
const failures = [];

function fail(message) {
    failures.push(message);
}

function assert(condition, message) {
    if (!condition) fail(message);
}

function readText(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isReadableArabic(value) {
    return hasText(value) && /[\u0600-\u06FF]/.test(value) && !/[?]{2,}/.test(value) && !/[\u4E00-\u9FFF]/.test(value);
}

function collectAssetPaths(value, paths) {
    paths = paths || [];
    if (typeof value === 'string') {
        const normalized = value.trim().replace(/\\/g, '/');
        if (/^(assets|uploads)\//.test(normalized) && /\.(avif|webp|png|jpe?g|gif|svg|pdf)$/i.test(normalized)) {
            paths.push(normalized);
        }
        return paths;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => collectAssetPaths(item, paths));
        return paths;
    }
    if (isPlainObject(value)) {
        Object.keys(value).forEach((key) => collectAssetPaths(value[key], paths));
    }
    return paths;
}

function verifyDatabase() {
    assert(fs.existsSync(dbPath), 'data/longxiang.db is missing.');
    if (!fs.existsSync(dbPath)) return;

    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT id, body_json FROM content_blocks WHERE slug = ?').get('education');
    assert(row, 'content_blocks.education is missing.');
    if (!row) {
        db.close();
        return;
    }

    let body = null;
    try {
        body = JSON.parse(row.body_json);
    } catch (err) {
        fail('education body_json is not valid JSON: ' + err.message);
        db.close();
        return;
    }

    assert(body.hero && hasText(body.hero.backgroundImage), 'Education hero image is missing.');
    assert(body.hero && hasText(body.hero.eyebrowAr), 'hero.eyebrowAr is missing.');
    assert(body.hero && isReadableArabic(body.hero.eyebrowAr), 'hero.eyebrowAr is not readable Arabic.');

    assert(isPlainObject(body.intro), 'intro object is missing.');
    ['kicker', 'kickerAr', 'title', 'titleAr', 'text', 'textAr'].forEach((key) => {
        assert(body.intro && hasText(body.intro[key]), 'intro.' + key + ' is missing.');
    });
    ['kickerAr', 'titleAr', 'textAr'].forEach((key) => {
        assert(body.intro && isReadableArabic(body.intro[key]), 'intro.' + key + ' is not readable Arabic.');
    });

    assert(isPlainObject(body.seo), 'seo object is missing.');
    ['title', 'titleAr', 'description', 'descriptionAr', 'image', 'canonicalPath'].forEach((key) => {
        assert(body.seo && hasText(body.seo[key]), 'seo.' + key + ' is missing.');
    });
    ['titleAr', 'descriptionAr'].forEach((key) => {
        assert(body.seo && isReadableArabic(body.seo[key]), 'seo.' + key + ' is not readable Arabic.');
    });
    assert(body.seo && body.seo.canonicalPath === 'education.html', 'seo.canonicalPath should be education.html.');

    const sections = Array.isArray(body.sections) ? body.sections : [];
    modeSectionIds.forEach((id) => {
        const section = sections.find((item) => item && item.id === id);
        assert(section, 'section ' + id + ' is missing.');
        assert(section && Array.isArray(section.body) && section.body.length > 0, 'section ' + id + ' body is missing.');
        assert(section && Array.isArray(section.bodyAr) && section.bodyAr.length > 0, 'section ' + id + ' bodyAr is missing.');
        assert(section && Array.isArray(section.images) && section.images.length <= 3, 'section ' + id + ' has more than 3 proof images.');
    });

    const gallery = sections.find((item) => item && item.id === 'gallery');
    assert(gallery, 'gallery section is missing.');
    assert(gallery && Array.isArray(gallery.images) && gallery.images.length > 0 && gallery.images.length <= 9, 'gallery images should contain 1 to 9 items.');

    const philosophy = sections.find((item) => item && item.id === 'cooperation-philosophy');
    assert(philosophy && hasText(philosophy.title), 'cooperation philosophy title is missing.');
    assert(philosophy && hasText(philosophy.titleAr), 'cooperation philosophy titleAr is missing.');

    const assetPaths = Array.from(new Set(collectAssetPaths(body)));
    assetPaths.forEach((assetPath) => {
        const asset = db.prepare('SELECT id FROM assets WHERE path = ? AND is_active = 1').get(assetPath);
        assert(asset, 'asset table is missing active path: ' + assetPath);
        if (asset) {
            const ref = db.prepare('SELECT id FROM asset_references WHERE asset_id = ? AND entity_type = ? AND entity_id = ?').get(asset.id, 'content_block', row.id);
            assert(ref, 'asset_references missing content block reference for: ' + assetPath);
        }
    });
    db.close();
}

function verifySource() {
    const educationJs = readText('js/education.js');
    const adminJs = readText('admin/js/admin.js');
    const adminIndex = readText('admin/index.html');
    const contentBlocksJs = readText('server/routes/admin/content-blocks.js');

    assert(/education:\s*\{[\s\S]*?intro:\s*'object'/.test(contentBlocksJs), 'Education schema should allow intro object.');

    assert(educationJs.includes('applyEducationSeo'), 'education.js should apply SEO from content_blocks.');
    assert(educationJs.includes('if (!fallbackUrl) throw err;'), 'education.js should guard fetchJson when no fallback URL is provided.');
    assert(educationJs.includes('data.intro'), 'education.js should read intro from content data.');
    assert(educationJs.includes('education-hero-kicker'), 'education.js should render hero eyebrow.');
    assert(educationJs.includes('education-mode-body'), 'education.js should render section body paragraphs.');

    const modeFieldsStart = adminJs.indexOf('function visualEducationModeFields()');
    const modeFieldsEnd = adminJs.indexOf('function visualEducationCardFields()');
    const modeFields = modeFieldsStart >= 0 && modeFieldsEnd > modeFieldsStart ? adminJs.slice(modeFieldsStart, modeFieldsEnd) : '';
    assert(modeFields.includes("key: 'body'"), 'visualEducationModeFields should expose body list.');
    assert(/key:\s*'images'[\s\S]*type:\s*'image-grid'[\s\S]*maxItems:\s*3/.test(modeFields), 'visualEducationModeFields images should be image-grid maxItems 3.');

    const educationPageStart = adminJs.indexOf("key: 'education'");
    const contactPageStart = adminJs.indexOf("key: 'contact'", educationPageStart);
    const educationConfig = educationPageStart >= 0 && contactPageStart > educationPageStart ? adminJs.slice(educationPageStart, contactPageStart) : '';
    assert(educationConfig.includes("key: 'intro'"), 'Visual builder education page should include intro module.');
    assert(adminIndex.includes('data-visual-nav-page="education" data-visual-nav-module="intro"'), 'Admin visual navigation should include education intro module.');
    assert(educationConfig.includes("key: 'seo'"), 'Visual builder education page should include SEO module.');
    assert(adminIndex.includes('data-visual-nav-page="education" data-visual-nav-module="seo"'), 'Admin visual navigation should include education SEO module.');
    assert(educationConfig.includes("key: 'eyebrow'"), 'Visual builder education hero should expose eyebrow.');
    assert(/key:\s*'philosophy'[\s\S]*?fields:\s*\[[\s\S]*?key:\s*'title'/.test(educationConfig), 'Visual builder philosophy module should expose title.');
    assert(!adminJs.includes('Proof in Real Scenarios 妯″潡鐨勪節瀹牸'), 'image-grid help text should not be hard-coded to Proof in Real Scenarios.');
    assert(adminJs.includes('function educationImageGridField'), 'Legacy education editor should have an image-grid field helper.');
    assert(adminJs.includes("educationImageGridField('gallery.images'"), 'Legacy education gallery images should use visual image-grid controls.');
    assert(!adminJs.includes("educationListField('gallery.images'"), 'Legacy education gallery images should not use a manual path textarea.');
    assert(adminJs.includes('renderEducationVisualRedirect'), 'Legacy content-education editor should redirect to visual builder.');
}

verifyDatabase();
verifySource();

if (failures.length) {
    console.error('Education unified verification failed:');
    failures.forEach((message) => console.error('- ' + message));
    process.exit(1);
}

console.log('Education unified verification passed.');
