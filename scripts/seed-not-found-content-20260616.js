const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const db = new Database(path.join(ROOT, 'data', 'longxiang.db'));
const now = Date.now();

const defaults = {
    panel: {
        code: '404',
        title: 'Page Not Found',
        titleAr: 'الصفحة غير موجودة',
        text: 'The page may have moved, or the address may be incorrect.',
        textAr: 'ربما تم نقل الصفحة أو أن العنوان غير صحيح.',
        actions: [
            { href: 'index.html', label: 'Back to Home', labelAr: 'العودة إلى الرئيسية', className: 'btn btn-primary' },
            { href: 'products.html', label: 'Browse Products', labelAr: 'تصفح المنتجات', className: 'btn btn-secondary' }
        ]
    },
    seo: {
        title: 'Page Not Found | Henan Longxiang Electric Co., Ltd.',
        titleAr: 'الصفحة غير موجودة | Henan Longxiang Electric Co., Ltd.',
        description: 'The page may have moved, or the address may be incorrect.',
        descriptionAr: 'ربما تم نقل الصفحة أو أن العنوان غير صحيح.'
    }
};

function parseBody(value) {
    try {
        return JSON.parse(value || '{}');
    } catch (err) {
        return {};
    }
}

function mergeMissing(target, source) {
    Object.keys(source).forEach(function (key) {
        const value = source[key];
        const current = target[key];
        if (Array.isArray(value)) {
            if (!Array.isArray(current) || current.length === 0) target[key] = value;
            return;
        }
        if (value && typeof value === 'object') {
            if (!current || typeof current !== 'object' || Array.isArray(current)) target[key] = {};
            mergeMissing(target[key], value);
            return;
        }
        if (current == null || current === '') target[key] = value;
    });
}

const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get('not-found');

if (!row) {
    db.prepare(`
        INSERT INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            ('not-found', 'Not Found Page', 'صفحة غير موجودة', @body_json, 'published', 90, 1, @now, @now)
    `).run({ body_json: JSON.stringify(defaults), now });
    console.log('inserted content block: not-found');
} else {
    const body = parseBody(row.body_json);
    const before = JSON.stringify(body);
    mergeMissing(body, defaults);
    const after = JSON.stringify(body);

    if (before === after) {
        console.log('skip not-found content block: no missing fields');
    } else {
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
        console.log('updated not-found content block: added missing fields');
    }
}
