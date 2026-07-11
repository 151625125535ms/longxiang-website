'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PUBLIC_COMPANY_IDENTITY: IDENTITY } = require('./companyIdentity');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SNAPSHOT_ROOT = path.join(PROJECT_ROOT, '.tmp');
const FORMAT_VERSION = 1;
const EXPECTED_PRODUCT_COUNT = 38;
const EXPECTED_SITEMAP_COUNT = 184;
const SUPPORTED_LOCALES = Object.freeze(['en', 'ar', 'fr', 'ru']);
const CONTENT_BLOCK_SLUGS = Object.freeze(['global-shell', 'home', 'about-us', 'solutions', 'contact', 'product-pages']);
const SNAPSHOT_DEFINITIONS = Object.freeze([
    ...CONTENT_BLOCK_SLUGS.map(function (slug) {
        return Object.freeze({ endpoint: '/api/content-blocks/' + slug, file: 'content-blocks/' + slug + '.json', type: 'json', slug });
    }),
    Object.freeze({ endpoint: '/api/company', file: 'company.json', type: 'json' }),
    Object.freeze({ endpoint: '/api/products', file: 'products.json', type: 'json' }),
    Object.freeze({ endpoint: '/api/product-categories', file: 'product-categories.json', type: 'json' }),
    Object.freeze({ endpoint: '/sitemap.xml', file: 'sitemap.xml', type: 'xml' })
]);

function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepClone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

function assertSnapshotDirectory(directory, options) {
    const resolvedRoot = fs.existsSync(SNAPSHOT_ROOT) ? fs.realpathSync(SNAPSHOT_ROOT) : path.resolve(SNAPSHOT_ROOT);
    const resolved = path.resolve(directory || '');
    if (path.dirname(resolved) !== resolvedRoot || !/^stage2c-public-snapshot-[A-Za-z0-9._-]+$/.test(path.basename(resolved))) {
        throw new Error('Snapshot directory must be a direct .tmp/stage2c-public-snapshot-* path.');
    }
    if (fs.existsSync(resolved)) {
        const stat = fs.lstatSync(resolved);
        if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Snapshot directory must be a real directory, not a symlink or file.');
        const real = fs.realpathSync(resolved);
        if (path.dirname(real) !== resolvedRoot) throw new Error('Snapshot directory escapes the real .tmp root.');
    } else if (!(options && options.allowMissing)) {
        throw new Error('Snapshot directory is missing: ' + resolved);
    }
    return resolved;
}

function readRegularFile(snapshotDirectory, relativePath) {
    if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('..') || relativePath.includes('\\')) {
        throw new Error('Invalid snapshot manifest file path: ' + relativePath);
    }
    const resolved = path.resolve(snapshotDirectory, relativePath);
    const prefix = snapshotDirectory + path.sep;
    if (!resolved.startsWith(prefix)) throw new Error('Snapshot file escapes snapshot directory: ' + relativePath);
    if (!fs.existsSync(resolved)) throw new Error('Snapshot file is missing: ' + relativePath);
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Snapshot entry is not a regular file: ' + relativePath);
    if (stat.size > 20 * 1024 * 1024) throw new Error('Snapshot file exceeds size limit: ' + relativePath);
    return fs.readFileSync(resolved);
}

function listSnapshotFiles(snapshotDirectory) {
    const files = [];
    function walk(directory, prefix) {
        fs.readdirSync(directory, { withFileTypes: true }).forEach(function (entry) {
            const relative = prefix ? prefix + '/' + entry.name : entry.name;
            const fullPath = path.join(directory, entry.name);
            const stat = fs.lstatSync(fullPath);
            if (stat.isSymbolicLink()) throw new Error('Snapshot contains a symlink: ' + relative);
            if (stat.isDirectory()) return walk(fullPath, relative);
            if (!stat.isFile()) throw new Error('Snapshot contains a non-regular entry: ' + relative);
            files.push(relative);
        });
    }
    walk(snapshotDirectory, '');
    return files.sort();
}

function parseJson(bytes, relativePath) {
    try { return JSON.parse(bytes.toString('utf8')); } catch (err) { throw new Error('Invalid JSON in ' + relativePath + ': ' + err.message); }
}

function sitemapLocations(xml) {
    return Array.from(String(xml || '').matchAll(/<loc>([\s\S]*?)<\/loc>/gi)).map(function (match) {
        return match[1].replace(/&amp;/g, '&').trim();
    });
}

function scanSensitiveValue(value, findings, currentPath) {
    if (Array.isArray(value)) {
        value.forEach(function (item, index) { scanSensitiveValue(item, findings, currentPath + '[' + index + ']'); });
        return;
    }
    if (isPlainObject(value)) {
        Object.keys(value).forEach(function (key) {
            const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            const forbiddenCredentialKeys = [
                'token', 'accesstoken', 'refreshtoken', 'idtoken', 'authorization', 'password', 'passwordhash',
                'session', 'sessioncookie', 'cookie', 'apikey', 'secret'
            ];
            const forbiddenPrivateDataKeys = [
                'admin', 'admins', 'administrator', 'administrators', 'inquiries', 'inquiryrecords',
                'customers', 'customerrecords', 'customername', 'customeremail', 'customerphone',
                'customermessage', 'ipaddress'
            ];
            const credentialPattern = normalized.endsWith('token') || normalized.startsWith('authorization') ||
                normalized.startsWith('password') || normalized.endsWith('apikey') || normalized.endsWith('secret') ||
                (/cookie/.test(normalized) && !normalized.startsWith('cookiesettings') && !normalized.startsWith('cookieconsent'));
            const privateDataPattern = /^(?:admin|administrator)/.test(normalized) ||
                ['users', 'userrecords', 'auditlog', 'auditlogs'].includes(normalized);
            if (/whatsapp/.test(normalized) || forbiddenCredentialKeys.includes(normalized) || forbiddenPrivateDataKeys.includes(normalized) || credentialPattern || privateDataPattern) {
                findings.push(currentPath + '.' + key + ': forbidden key');
            }
            const publicPhoneKey = ['phone', 'telephone', 'mobile', 'officephone', 'contactphone', 'phonenumber', 'hotline', 'companyphone', 'salesphone', 'internationalphone'].includes(normalized);
            if (publicPhoneKey && String(value[key] || '').trim() && !isPlainObject(value[key]) && !Array.isArray(value[key])) {
                findings.push(currentPath + '.' + key + ': public company phone value');
            }
            scanSensitiveValue(value[key], findings, currentPath + '.' + key);
        });
        return;
    }
    const text = String(value == null ? '' : value);
    const forbidden = [
        [/17513354200/, 'domestic phone'],
        [/hnlxdq2003@163\.com/i, 'domestic email'],
        [/\btel\s*:/i, 'telephone URI'],
        [/(?:\+|\b00)\d[\d\s().-]{7,}\d/, 'international telephone value'],
        [/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/, 'international telephone value'],
        [/100\s*million\s*rmb/i, 'legacy registered capital'],
        [/100\s*مليون\s*يوان\s*صيني/i, 'legacy Arabic registered capital'],
        [/wa\.me|api\.whatsapp|whatsapp/i, 'WhatsApp value']
    ];
    forbidden.forEach(function (rule) {
        if (rule[0].test(text)) findings.push(currentPath + ': ' + rule[1]);
    });
    if (/lxelec\.cn/i.test(text)) {
        const allowedChinaWebsitePath = currentPath === 'company.json.identity.chinaWebsite' ||
            currentPath === 'company.json.chinaWebsite' ||
            /^content-blocks\/global-shell\.json\.body\.navigation\.quickLinks\[\d+\]\.href$/.test(currentPath);
        if (text !== IDENTITY.chinaWebsite || !allowedChinaWebsitePath) findings.push(currentPath + ': China website is not an allowed ordinary link');
    }
}

function sensitiveFindings(dataByFile) {
    const findings = [];
    Object.keys(dataByFile).forEach(function (file) {
        scanSensitiveValue(dataByFile[file], findings, file);
    });
    return findings;
}

function validateCompany(company) {
    if (!isPlainObject(company) || !isPlainObject(company.identity)) throw new Error('company.json is missing identity.');
    Object.keys(IDENTITY).forEach(function (key) {
        if (company.identity[key] !== IDENTITY[key]) throw new Error('Company identity mismatch: ' + key);
    });
    if (company.email !== IDENTITY.globalSalesEmail) throw new Error('Company international email mismatch.');
    const topLevelFacts = {
        name: IDENTITY.legalName,
        registeredCapital: IDENTITY.registeredCapital,
        address: IDENTITY.headquarters,
        headquarters: IDENTITY.headquarters,
        huaiyangBase: IDENTITY.productionBase,
        globalWebsite: IDENTITY.globalWebsite,
        chinaWebsite: IDENTITY.chinaWebsite
    };
    Object.keys(topLevelFacts).forEach(function (key) {
        if (company[key] !== topLevelFacts[key]) throw new Error('Company public fact mismatch: ' + key);
    });
}

function validateContentBlocks(dataByFile) {
    const versions = {};
    CONTENT_BLOCK_SLUGS.forEach(function (slug) {
        const block = dataByFile['content-blocks/' + slug + '.json'];
        if (!isPlainObject(block) || block.slug !== slug || !Number.isInteger(Number(block.version)) || Number(block.version) <= 0 || !isPlainObject(block.body)) {
            throw new Error('Invalid published content block snapshot: ' + slug);
        }
        versions[slug] = Number(block.version);
    });
    const shell = dataByFile['content-blocks/global-shell.json'].body;
    if (!shell.navigation || !Array.isArray(shell.navigation.mainLinks) || !shell.navigation.mainLinks.length ||
            !Array.isArray(shell.navigation.quickLinks) || !Array.isArray(shell.navigation.productLinks) || !shell.footer || !shell.inquiry) {
        throw new Error('global-shell snapshot is incomplete.');
    }
    const chinaLinks = shell.navigation.quickLinks.filter(function (item) { return item && item.href === IDENTITY.chinaWebsite; });
    if (chinaLinks.length !== 1 || ['label', 'labelAr', 'labelFr', 'labelRu'].some(function (key) { return !String(chinaLinks[0][key] || '').trim(); })) {
        throw new Error('global-shell China website ordinary link is invalid.');
    }
    if (!String(shell.footer.text || '').trim() || !String(shell.footer.copyright || '').trim() || !String(shell.inquiry.title || '').trim()) {
        throw new Error('global-shell footer or inquiry content is incomplete.');
    }
    return versions;
}

function validateProducts(products) {
    if (!Array.isArray(products) || products.length !== EXPECTED_PRODUCT_COUNT) throw new Error('Expected 38 public products.');
    const direct = new Map();
    products.forEach(function (product, productIndex) {
        if (!isPlainObject(product) || !String(product.id || '').trim() || !String(product.slug || '').trim() || !String(product.name || '').trim() ||
                !String(product.group || '').trim() || !String(product.subCategory || '').trim() || !String(product.image || '').trim() ||
                !Array.isArray(product.aliases) || !Array.isArray(product.specs) || !Array.isArray(product.capacities) || !Array.isArray(product.voltages) ||
                ['nameAr', 'nameFr', 'nameRu', 'shortDesc', 'shortDescAr', 'shortDescFr', 'shortDescRu', 'description', 'descriptionAr', 'descriptionFr', 'descriptionRu'].some(function (key) { return typeof product[key] !== 'string'; })) {
            throw new Error('Invalid or incomplete public product entry.');
        }
        [product.id, product.slug].forEach(function (identifier) {
            if (direct.has(identifier) && direct.get(identifier) !== productIndex) throw new Error('Duplicate direct product identifier across products: ' + identifier);
            direct.set(identifier, productIndex);
        });
    });
}

function validateTaxonomy(payload) {
    const categories = payload && payload.ok === true ? payload.data : payload;
    if (!Array.isArray(categories) || !categories.length) throw new Error('Public product categories are invalid.');
    categories.forEach(function (group) {
        if (!group || !String(group.group || '').trim() || !String(group.label || '').trim() ||
                ['labelAr', 'labelFr', 'labelRu'].some(function (key) { return typeof group[key] !== 'string'; }) ||
                !Array.isArray(group.children) || !group.children.length) throw new Error('Invalid product taxonomy group.');
        group.children.forEach(function (child) {
            if (!child || !String(child.sub || '').trim() || !String(child.label || '').trim() ||
                    ['labelAr', 'labelFr', 'labelRu'].some(function (key) { return typeof child[key] !== 'string'; })) throw new Error('Invalid product taxonomy child.');
        });
    });
    return categories;
}

function validateSitemap(xml) {
    const locations = sitemapLocations(xml);
    if (locations.length !== EXPECTED_SITEMAP_COUNT) throw new Error('Expected 184 sitemap URLs, got ' + locations.length + '.');
    if (new Set(locations).size !== locations.length) throw new Error('Sitemap contains duplicate URLs.');
    const localeCounts = { en: 0, ar: 0, fr: 0, ru: 0 };
    locations.forEach(function (location) {
        const url = new URL(location);
        if (url.origin !== 'https://www.lxenelectric.com') throw new Error('Unexpected sitemap origin: ' + location);
        if (/\/pt(?:\/|$)/i.test(url.pathname)) throw new Error('Planned pt locale leaked into sitemap.');
        if (/\/(?:category|categories)(?:\/|$)/i.test(url.pathname)) throw new Error('Category URL leaked into sitemap.');
        if (url.search || url.hash || /lxelec\.cn/i.test(location)) throw new Error('Invalid sitemap URL: ' + location);
        const match = /^\/(ar|fr|ru)(?:\/|$)/.exec(url.pathname);
        localeCounts[match ? match[1] : 'en'] += 1;
    });
    Object.keys(localeCounts).forEach(function (locale) {
        if (localeCounts[locale] !== 46) throw new Error('Sitemap locale coverage mismatch for ' + locale + ': ' + localeCounts[locale]);
    });
    return locations;
}

function verifyManifestShape(manifest) {
    if (!isPlainObject(manifest) || manifest.formatVersion !== FORMAT_VERSION || manifest.snapshotType !== 'stage2c-public') throw new Error('Invalid stage2c snapshot manifest.');
    const expectedFiles = SNAPSHOT_DEFINITIONS.map(function (item) { return item.file; }).sort();
    const actualFiles = Object.keys(manifest.files || {}).sort();
    if (JSON.stringify(expectedFiles) !== JSON.stringify(actualFiles)) throw new Error('Manifest file allowlist mismatch.');
    const expectedEndpoints = SNAPSHOT_DEFINITIONS.map(function (item) { return item.endpoint; }).sort();
    const actualEndpoints = Array.isArray(manifest.endpoints) ? manifest.endpoints.slice().sort() : [];
    if (JSON.stringify(expectedEndpoints) !== JSON.stringify(actualEndpoints)) throw new Error('Manifest endpoint allowlist mismatch.');
    if (JSON.stringify(manifest.supportedLocales) !== JSON.stringify(SUPPORTED_LOCALES)) throw new Error('Supported locale manifest mismatch.');
    if (!manifest.plannedLocales || !manifest.plannedLocales.pt || manifest.plannedLocales.pt.includeInSitemap !== false) throw new Error('Planned pt locale manifest mismatch.');
    let source;
    try { source = new URL(manifest.sourceBase); } catch (err) { throw new Error('Manifest sourceBase is invalid.'); }
    const productionOrigin = source.protocol === 'https:' && ['www.lxenelectric.com', 'lxenelectric.com'].includes(source.hostname) && !source.port;
    const loopbackOrigin = source.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(source.hostname);
    if ((!productionOrigin && !loopbackOrigin) || source.origin !== manifest.sourceBase || source.username || source.password || source.pathname !== '/' || source.search || source.hash) {
        throw new Error('Manifest sourceBase is not an allowed origin.');
    }
    const capturedAt = new Date(manifest.capturedAt);
    if (!manifest.capturedAt || Number.isNaN(capturedAt.getTime()) || capturedAt.toISOString() !== manifest.capturedAt) throw new Error('Manifest capturedAt is not a canonical UTC timestamp.');
}

function loadVerifiedSnapshot(directory) {
    const snapshotDirectory = assertSnapshotDirectory(directory);
    const expectedDiskFiles = ['manifest.json'].concat(SNAPSHOT_DEFINITIONS.map(function (item) { return item.file; })).sort();
    const actualDiskFiles = listSnapshotFiles(snapshotDirectory);
    if (JSON.stringify(expectedDiskFiles) !== JSON.stringify(actualDiskFiles)) throw new Error('Snapshot directory contains missing or extra files.');
    const manifestBytes = readRegularFile(snapshotDirectory, 'manifest.json');
    const manifest = parseJson(manifestBytes, 'manifest.json');
    verifyManifestShape(manifest);
    const dataByFile = {};
    SNAPSHOT_DEFINITIONS.forEach(function (definition) {
        const metadata = manifest.files[definition.file];
        if (!isPlainObject(metadata) || metadata.endpoint !== definition.endpoint || metadata.type !== definition.type) throw new Error('Manifest metadata mismatch: ' + definition.file);
        const bytes = readRegularFile(snapshotDirectory, definition.file);
        if (metadata.bytes !== bytes.length || metadata.sha256 !== sha256(bytes)) throw new Error('Snapshot hash or size mismatch: ' + definition.file);
        dataByFile[definition.file] = definition.type === 'json' ? parseJson(bytes, definition.file) : bytes.toString('utf8');
    });

    const contentVersions = validateContentBlocks(dataByFile);
    validateCompany(dataByFile['company.json']);
    validateProducts(dataByFile['products.json']);
    const categories = validateTaxonomy(dataByFile['product-categories.json']);
    const locations = validateSitemap(dataByFile['sitemap.xml']);
    const findings = sensitiveFindings(dataByFile);
    if (findings.length) throw new Error('Sensitive or forbidden snapshot data: ' + findings.join('; '));
    if (JSON.stringify(manifest.contentVersions) !== JSON.stringify(contentVersions) || manifest.productCount !== EXPECTED_PRODUCT_COUNT || manifest.sitemapUrlCount !== EXPECTED_SITEMAP_COUNT) {
        throw new Error('Manifest counts or content versions do not match snapshot data.');
    }
    if (!manifest.sensitiveScan || manifest.sensitiveScan.passed !== true || manifest.sensitiveScan.findingCount !== 0) throw new Error('Manifest sensitive scan status is invalid.');

    return {
        directory: snapshotDirectory,
        manifest: deepClone(manifest),
        dataByFile: deepClone(dataByFile),
        report: {
            sourceBase: manifest.sourceBase,
            capturedAt: manifest.capturedAt,
            productCount: EXPECTED_PRODUCT_COUNT,
            sitemapUrlCount: locations.length,
            sensitiveFindingCount: 0,
            supportedLocales: SUPPORTED_LOCALES.slice(),
            plannedLocales: deepClone(manifest.plannedLocales),
            contentVersions,
            categoryGroupCount: categories.length
        }
    };
}

module.exports = {
    FORMAT_VERSION,
    SNAPSHOT_ROOT,
    SNAPSHOT_DEFINITIONS,
    CONTENT_BLOCK_SLUGS,
    SUPPORTED_LOCALES,
    IDENTITY,
    sha256,
    deepClone,
    assertSnapshotDirectory,
    sitemapLocations,
    sensitiveFindings,
    loadVerifiedSnapshot
};
