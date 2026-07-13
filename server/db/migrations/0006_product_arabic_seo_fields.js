'use strict';

const ARABIC_SEO_COLUMNS = [
    'seo_title_ar',
    'seo_description_ar',
    'seo_keywords_ar'
];

function hasTable(db, tableName) {
    return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
}

function hasColumn(db, tableName, columnName) {
    return db.prepare('PRAGMA table_info(' + tableName + ')').all().some(function (column) {
        return column.name === columnName;
    });
}

function up(db) {
    if (!hasTable(db, 'products')) return;
    ARABIC_SEO_COLUMNS.forEach(function (columnName) {
        if (hasColumn(db, 'products', columnName)) return;
        db.prepare('ALTER TABLE products ADD COLUMN ' + columnName + ' TEXT').run();
    });
}

module.exports = {
    version: 6,
    name: 'product_arabic_seo_fields',
    up
};
