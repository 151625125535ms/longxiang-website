#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const defaultForwardPath = path.join(root, 'scripts', 'patches', 'stage3-product-search-copy-forward.json');
const defaultRollbackPath = path.join(root, 'scripts', 'patches', 'stage3-product-search-copy-rollback.json');
const fieldMap = {
    seo_title: 'seoTitle',
    seo_description: 'seoDescription',
    name_en: 'name',
    name_ar: 'nameAr',
    short_desc_ar: 'shortDescAr'
};
const naturalEnglishPattern = /\b(and|with|for|series|class|optional|power|generation|distribution|control|cooling|alloy|steel|core|transformer|switchgear|device|substation|project|specific|customized|single|phase|three|five|wire|built|fan|lithium|phosphate|integrated|charging|stack|air|liquid|indoor|outdoor|enclosure|compartment|circuit|breaker|door|open|below|residential|commercial|industrial|high|voltage|oil|immersed|free|fire|explosion|hazard|pollution|chemical|corrosion|vibration|efficient|efficiency|compact|box|type)\b/i;

function argValue(name, fallback) {
    const index = process.argv.indexOf(name);
    return index === -1 || index + 1 >= process.argv.length ? fallback : process.argv[index + 1];
}

function hasFlag(name) {
    return process.argv.includes(name);
}

function readPatchArtifact(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseSitemap(xml) {
    return Array.from(String(xml || '').matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1].trim());
}

function fail(errors, message) {
    errors.push(message);
}

function validatePatchPair(forward, rollback, errors) {
    if (forward.meta.policy !== 'search-copy-v1') fail(errors, 'forward policy mismatch');
    if (rollback.meta.policy !== 'search-copy-v1') fail(errors, 'rollback policy mismatch');
    if (forward.meta.operation !== 'forward') fail(errors, 'forward operation mismatch');
    if (rollback.meta.operation !== 'rollback') fail(errors, 'rollback operation mismatch');
    if (forward.products.length !== 35 || rollback.products.length !== 35) fail(errors, 'patch product count mismatch');
    forward.products.forEach((item, index) => {
        const inverse = rollback.products[index];
        if (!inverse || inverse.row_id !== item.row_id || inverse.slug !== item.slug) {
            fail(errors, 'rollback identity mismatch: ' + item.slug);
            return;
        }
        if (JSON.stringify(inverse.expected) !== JSON.stringify(item.target)) fail(errors, 'rollback expected mismatch: ' + item.slug);
        if (JSON.stringify(inverse.target) !== JSON.stringify(item.expected)) fail(errors, 'rollback target mismatch: ' + item.slug);
    });
}

async function main() {
    const baseUrl = String(argValue('--base', 'https://www.lxenelectric.com')).replace(/\/+$/, '');
    const state = argValue('--state', 'before');
    if (state !== 'before' && state !== 'after') throw new Error('--state must be before or after');
    const forwardPath = path.resolve(argValue('--forward', defaultForwardPath));
    const rollbackPath = path.resolve(argValue('--rollback', defaultRollbackPath));
    const skipPages = hasFlag('--skip-pages');
    const errors = [];
    const forward = readPatchArtifact(forwardPath);
    const rollback = readPatchArtifact(rollbackPath);
    validatePatchPair(forward, rollback, errors);

    const [productsResponse, sitemapResponse] = await Promise.all([
        fetch(baseUrl + '/api/products'),
        fetch(baseUrl + '/sitemap.xml')
    ]);
    if (!productsResponse.ok) throw new Error('products API returned ' + productsResponse.status);
    if (!sitemapResponse.ok) throw new Error('sitemap returned ' + sitemapResponse.status);
    const products = await productsResponse.json();
    const sitemapUrls = parseSitemap(await sitemapResponse.text());
    const productUrls = sitemapUrls.filter((url) => /^\/(?:ar\/|fr\/|ru\/)?products\/[^/?#]+\/?$/.test(new URL(url).pathname));
    if (products.length !== 38) fail(errors, 'public product count is ' + products.length + ', expected 38');
    if (sitemapUrls.length !== 184) fail(errors, 'sitemap count is ' + sitemapUrls.length + ', expected 184');
    if (productUrls.length !== 152) fail(errors, 'product detail count is ' + productUrls.length + ', expected 152');

    const productBySlug = new Map(products.map((product) => [product.slug, product]));
    forward.products.forEach((item) => {
        const product = productBySlug.get(item.slug);
        if (!product) {
            fail(errors, 'missing public product: ' + item.slug);
            return;
        }
        const expectedFields = state === 'before' ? item.expected : item.target;
        Object.keys(expectedFields).forEach((field) => {
            const publicField = fieldMap[field];
            if (String(product[publicField] == null ? '' : product[publicField]) !== expectedFields[field]) {
                fail(errors, item.slug + '.' + field + ' does not match ' + state + ' state');
            }
        });
        if (state === 'after' && item.target.short_desc_ar && naturalEnglishPattern.test(item.target.short_desc_ar)) {
            fail(errors, item.slug + '.short_desc_ar still contains English natural-language prose');
        }
    });

    if (state === 'after') {
        const titles = new Set();
        const descriptions = new Set();
        products.forEach((product) => {
            if (!product.seoTitle || product.seoTitle.length > 90 || /(\.\.\.|…)$/.test(product.seoTitle)) {
                fail(errors, product.slug + '.seoTitle failed final rules');
            }
            if (!product.seoDescription || product.seoDescription.length < 120 || product.seoDescription.length > 170 || /(\.\.\.|…)$/.test(product.seoDescription)) {
                fail(errors, product.slug + '.seoDescription failed final rules');
            }
            if (titles.has(product.seoTitle)) fail(errors, 'duplicate seoTitle: ' + product.seoTitle);
            if (descriptions.has(product.seoDescription)) fail(errors, 'duplicate seoDescription: ' + product.seoDescription);
            titles.add(product.seoTitle);
            descriptions.add(product.seoDescription);
        });
    }

    console.log('Stage 3 search copy audit state: ' + state);
    console.log('Products: ' + products.length + '/38');
    console.log('Sitemap URLs: ' + sitemapUrls.length + '/184');
    console.log('Product detail URLs: ' + productUrls.length + '/152');
    console.log('Patch products: ' + forward.products.length + '/35');
    console.log('State mismatches/errors: ' + errors.length);
    if (errors.length) {
        errors.slice(0, 100).forEach((error) => console.error(error));
        process.exit(1);
    }

    if (!skipPages) {
        const result = childProcess.spawnSync(process.execPath, [
            path.join(root, 'scripts', 'audit-product-detail-raw-seo.js'),
            '--base', baseUrl,
            '--expected-count', '152'
        ], { cwd: root, stdio: 'inherit' });
        if (result.status !== 0) process.exit(result.status || 1);
    }
}

main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
