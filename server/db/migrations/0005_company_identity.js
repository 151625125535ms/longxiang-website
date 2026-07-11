'use strict';

const IDENTITY = {
    legalName: 'Henan Longxiang Electric Co., Ltd.',
    brandName: 'Longxiang Electric',
    registeredCapital: 'RMB 69.552 million',
    headquarters: 'Xinzheng City, Zhengzhou City, Henan Province, P.R. China',
    productionBase: 'Huaiyang District, Zhoukou City, Henan Province, P.R. China',
    globalSalesEmail: 'henanlxgj@163.com',
    globalWebsite: 'https://www.lxenelectric.com/',
    chinaWebsite: 'https://www.lxelec.cn/'
};

const PRIVATE_CONTACT_KEYS = new Set([
    'phone',
    'telephone',
    'mobile',
    'officephone',
    'whatsapp',
    'wechat',
    'wechatqr',
    'line',
    'lineqr',
    'skype'
]);

function parseBody(value) {
    try {
        const parsed = JSON.parse(value || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
        return {};
    }
}

function replaceBrand(value) {
    if (typeof value === 'string') {
        return value
            .replace(/Longxiang Electrical/g, 'Longxiang Electric')
            .replace(/لونغشيانغ إلكتريكال/g, 'لونغشيانغ إلكتريك');
    }
    if (Array.isArray(value)) return value.map(replaceBrand);
    if (!value || typeof value !== 'object') return value;
    const output = {};
    Object.keys(value).forEach(function (key) {
        output[key] = replaceBrand(value[key]);
    });
    return output;
}

function stripPrivateContactFields(value) {
    if (Array.isArray(value)) return value.map(stripPrivateContactFields);
    if (!value || typeof value !== 'object') return value;
    const output = {};
    Object.keys(value).forEach(function (key) {
        const normalized = key.toLowerCase().replace(/[_-]/g, '');
        if (PRIVATE_CONTACT_KEYS.has(normalized)) return;
        output[key] = stripPrivateContactFields(value[key]);
    });
    return output;
}

function chinaWebsiteLink() {
    return {
        label: 'China Website / 中国官网',
        labelAr: 'الموقع الرسمي في الصين',
        labelFr: 'Site officiel en Chine',
        labelRu: 'Официальный сайт в Китае',
        href: IDENTITY.chinaWebsite
    };
}

function migrateBody(slug, source) {
    let body = replaceBrand(parseBody(source));

    if (slug === 'company-overview') {
        body.name = IDENTITY.legalName;
        body.registeredCapital = IDENTITY.registeredCapital;
    }

    if (slug === 'contact') {
        body = stripPrivateContactFields(body);
        Object.keys(body).forEach(function (key) {
            if (/^email(?:Ar|Fr|Ru|Pt|CN|Cn|_)/.test(key)) delete body[key];
        });
        body.email = IDENTITY.globalSalesEmail;
    }

    if (slug === 'global-shell') {
        body.navigation = body.navigation && typeof body.navigation === 'object'
            ? body.navigation
            : {};
        const links = Array.isArray(body.navigation.quickLinks)
            ? body.navigation.quickLinks.slice()
            : [];
        const index = links.findIndex(function (item) {
            return item && item.href === IDENTITY.chinaWebsite;
        });
        if (index === -1) links.push(chinaWebsiteLink());
        else links[index] = { ...links[index], ...chinaWebsiteLink() };
        body.navigation.quickLinks = links;
    }

    return body;
}

function up(db) {
    const now = Date.now();
    db.prepare(`
        INSERT INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            ('company-identity', 'Company Identity', '', @body_json, 'published', 5, 1, @now, @now)
        ON CONFLICT(slug) DO UPDATE SET
            body_json = excluded.body_json,
            status = 'published',
            version = content_blocks.version + 1,
            updated_at = excluded.updated_at
    `).run({ body_json: JSON.stringify(IDENTITY), now: now });

    const rows = db.prepare('SELECT slug, body_json FROM content_blocks WHERE slug <> ?').all('company-identity');
    const update = db.prepare(`
        UPDATE content_blocks
        SET body_json = ?, version = version + 1, updated_at = ?
        WHERE slug = ?
    `);
    rows.forEach(function (row) {
        const migrated = migrateBody(row.slug, row.body_json);
        const serialized = JSON.stringify(migrated);
        if (serialized !== row.body_json) update.run(serialized, now, row.slug);
    });
}

module.exports = {
    version: 5,
    name: 'company_identity',
    up
};
