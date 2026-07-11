'use strict';

const { deepClone, loadVerifiedSnapshot } = require('./stage2cPublicSnapshot');

const METHOD_NAMES = Object.freeze(['readContentBlock', 'readCompany', 'readProducts', 'readProduct', 'readProductCategories']);

function freezeDataSource(methods) {
    const source = {};
    METHOD_NAMES.forEach(function (name) {
        if (typeof methods[name] !== 'function') throw new Error('Public site data source is missing method: ' + name);
        source[name] = methods[name];
    });
    return Object.freeze(source);
}

function createRuntimePublicSiteDataSource(options) {
    options = options || {};
    const { readPublicContentBlock } = require('./publicContentBlocks');
    const { readPublicCompanyView } = require('./publicCompanyView');
    const { readPublicProducts, readPublicProduct } = require('./publicProducts');
    const { readPublicProductCategories } = require('./publicProductTaxonomy');
    const db = options.db;
    return freezeDataSource({
        readContentBlock: function (slug) { return deepClone(readPublicContentBlock(slug, db)); },
        readCompany: function () { return deepClone(readPublicCompanyView(db)); },
        readProducts: function () { return deepClone(readPublicProducts(db)); },
        readProduct: function (identifier) { return deepClone(readPublicProduct(identifier, db)); },
        readProductCategories: function () { return deepClone(readPublicProductCategories(db)); }
    });
}

function createSnapshotPublicSiteDataSource(snapshotDirectory) {
    const snapshot = loadVerifiedSnapshot(snapshotDirectory);
    const data = snapshot.dataByFile;
    const products = data['products.json'];
    const direct = new Map();
    const aliases = new Map();
    products.forEach(function (product) {
        direct.set(String(product.id), product);
        direct.set(String(product.slug), product);
    });
    products.forEach(function (product) {
        (Array.isArray(product.aliases) ? product.aliases : []).forEach(function (alias) {
            if (!direct.has(String(alias)) && !aliases.has(String(alias))) aliases.set(String(alias), product);
        });
    });
    const categoriesPayload = data['product-categories.json'];
    const categories = categoriesPayload && categoriesPayload.ok === true ? categoriesPayload.data : categoriesPayload;
    return freezeDataSource({
        readContentBlock: function (slug) {
            const value = data['content-blocks/' + String(slug || '') + '.json'];
            return value ? deepClone(value) : null;
        },
        readCompany: function () { return deepClone(data['company.json']); },
        readProducts: function () { return deepClone(products); },
        readProduct: function (identifier) {
            const key = String(identifier || '');
            return deepClone(direct.get(key) || aliases.get(key) || null);
        },
        readProductCategories: function () { return deepClone(categories); }
    });
}

module.exports = {
    METHOD_NAMES,
    createRuntimePublicSiteDataSource,
    createSnapshotPublicSiteDataSource
};
