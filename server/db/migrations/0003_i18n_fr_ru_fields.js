'use strict';

const TABLE_COLUMNS = {
    products: [
        'name_fr',
        'name_ru',
        'short_desc_fr',
        'short_desc_ru',
        'description_fr',
        'description_ru',
        'seo_title_fr',
        'seo_title_ru',
        'seo_description_fr',
        'seo_description_ru',
        'seo_keywords_fr',
        'seo_keywords_ru'
    ],
    categories: [
        'name_fr',
        'name_ru'
    ],
    certifications: [
        'name_fr',
        'name_ru',
        'category_label_fr',
        'category_label_ru',
        'issuer_fr',
        'issuer_ru',
        'description_fr',
        'description_ru'
    ]
};

function hasTable(db, tableName) {
    return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
}

function hasColumn(db, tableName, columnName) {
    return db.prepare('PRAGMA table_info(' + tableName + ')').all().some(function (column) {
        return column.name === columnName;
    });
}

function addTextColumnIfMissing(db, tableName, columnName) {
    if (!hasTable(db, tableName) || hasColumn(db, tableName, columnName)) return;
    db.prepare('ALTER TABLE ' + tableName + ' ADD COLUMN ' + columnName + ' TEXT').run();
}

function up(db) {
    Object.keys(TABLE_COLUMNS).forEach(function (tableName) {
        TABLE_COLUMNS[tableName].forEach(function (columnName) {
            addTextColumnIfMissing(db, tableName, columnName);
        });
    });
}

module.exports = {
    version: 3,
    name: 'i18n_fr_ru_fields',
    up
};
