'use strict';

const PRODUCT_COLUMNS = [
    'name_cn',
    'model'
];

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
    PRODUCT_COLUMNS.forEach(function (columnName) {
        addTextColumnIfMissing(db, 'products', columnName);
    });
}

module.exports = {
    version: 4,
    name: 'products_name_cn_model',
    up
};
