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
    const { readPublicCompanyView } = require('./publicCompanyView');
    const {
        createRuntimePublicTranslationReadAdapter,
        getRuntimePublicTranslationReadAdapter
    } = require('./publicTranslationReadAdapter');
    const db = options.db;
    const publicRead = options.publicRead || (db
        ? createRuntimePublicTranslationReadAdapter({ db, registry: options.registry, env: options.env })
        : getRuntimePublicTranslationReadAdapter());
    return freezeDataSource({
        readContentBlock: function (slug, locale) {
            const value = locale
                ? publicRead.readPresentationContentBlock(slug, locale.code || locale)
                : publicRead.readContentBlock(slug);
            return deepClone(value);
        },
        readCompany: function () { return deepClone(readPublicCompanyView(db)); },
        readProducts: function (locale) {
            return deepClone(locale ? publicRead.readPresentationProducts(locale.code || locale) : publicRead.readProducts());
        },
        readProduct: function (identifier, locale) {
            return deepClone(locale
                ? publicRead.readPresentationProduct(identifier, locale.code || locale)
                : publicRead.readProduct(identifier));
        },
        readProductCategories: function (locale) {
            return deepClone(locale
                ? publicRead.readPresentationProductCategories(locale.code || locale)
                : publicRead.readProductCategories());
        }
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
