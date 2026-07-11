'use strict';

const PUBLIC_COMPANY_IDENTITY = Object.freeze({
    legalName: 'Henan Longxiang Electric Co., Ltd.',
    brandName: 'Longxiang Electric',
    registeredCapital: 'RMB 69.552 million',
    headquarters: 'Xinzheng City, Zhengzhou City, Henan Province, P.R. China',
    productionBase: 'Huaiyang District, Zhoukou City, Henan Province, P.R. China',
    globalSalesEmail: 'henanlxgj@163.com',
    globalWebsite: 'https://www.lxenelectric.com/',
    chinaWebsite: 'https://www.lxelec.cn/'
});

const PRIVATE_CONTACT_KEYS = new Set([
    'email',
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

function parseJson(value, fallback) {
    try {
        return JSON.parse(value || '');
    } catch (err) {
        return fallback;
    }
}

function clonePublicValue(value) {
    if (Array.isArray(value)) return value.map(clonePublicValue);
    if (!value || typeof value !== 'object') return value;

    const output = {};
    Object.keys(value).forEach(function (key) {
        const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
        if (PRIVATE_CONTACT_KEYS.has(normalizedKey) || normalizedKey.startsWith('whatsapp')) return;
        output[key] = clonePublicValue(value[key]);
    });
    return output;
}

function canonicalIdentity(value) {
    void value;
    return { ...PUBLIC_COMPANY_IDENTITY };
}

function readCompanyIdentity(db) {
    const row = db.prepare('SELECT body_json FROM content_blocks WHERE slug = ? AND status = ?')
        .get('company-identity', 'published');
    return canonicalIdentity(row ? parseJson(row.body_json, {}) : {});
}

function sanitizePublicContact(value, identity) {
    const output = clonePublicValue(value && typeof value === 'object' ? value : {});
    Object.keys(output).forEach(function (key) {
        if (/^email(?:Ar|Fr|Ru|Pt|CN|Cn|_)/.test(key)) delete output[key];
    });
    output.email = identity.globalSalesEmail;
    return output;
}

function chinaWebsiteLink(identity) {
    return {
        label: 'China Website / 中国官网',
        labelAr: 'الموقع الرسمي في الصين',
        labelFr: 'Site officiel en Chine',
        labelRu: 'Официальный сайт в Китае',
        href: identity.chinaWebsite
    };
}

function ensureChinaWebsiteLink(value, identity) {
    const output = clonePublicValue(value && typeof value === 'object' ? value : {});
    output.navigation = output.navigation && typeof output.navigation === 'object'
        ? output.navigation
        : {};
    const links = Array.isArray(output.navigation.quickLinks)
        ? output.navigation.quickLinks.slice()
        : [];
    const expected = chinaWebsiteLink(identity);
    const existingIndex = links.findIndex(function (item) {
        return item && item.href === identity.chinaWebsite;
    });
    if (existingIndex === -1) links.push(expected);
    else links[existingIndex] = { ...links[existingIndex], ...expected };
    output.navigation.quickLinks = links;
    return output;
}

module.exports = {
    PUBLIC_COMPANY_IDENTITY,
    readCompanyIdentity,
    sanitizePublicContact,
    ensureChinaWebsiteLink
};
