const { getDb } = require('../lib/db');

function scalar(db, sql, params) {
    const row = db.prepare(sql).get(params || {});
    return row ? row.count : 0;
}

function status() {
    const db = getDb();

    const productCategories = scalar(db, "SELECT COUNT(*) AS count FROM categories WHERE type = 'product'");
    const certificationCategories = scalar(db, "SELECT COUNT(*) AS count FROM categories WHERE type = 'certification'");
    const contentCategories = scalar(db, "SELECT COUNT(*) AS count FROM categories WHERE type = 'content'");
    const totalCategories = scalar(db, 'SELECT COUNT(*) AS count FROM categories');

    console.log('products: ' + scalar(db, 'SELECT COUNT(*) AS count FROM products') + ' rows');
    console.log('product_media: ' + scalar(db, 'SELECT COUNT(*) AS count FROM product_media') + ' rows');
    console.log('product_specs: ' + scalar(db, 'SELECT COUNT(*) AS count FROM product_specs') + ' rows');
    console.log(
        'categories: ' + totalCategories + ' rows (product: ' + productCategories +
        ', certification: ' + certificationCategories + ', content: ' + contentCategories + ')'
    );
    console.log('certifications: ' + scalar(db, 'SELECT COUNT(*) AS count FROM certifications') + ' rows');
    console.log('content_blocks: ' + scalar(db, 'SELECT COUNT(*) AS count FROM content_blocks') + ' rows');
    console.log('inquiries: ' + scalar(db, 'SELECT COUNT(*) AS count FROM inquiries') + ' rows');
    console.log('assets: ' + scalar(db, 'SELECT COUNT(*) AS count FROM assets') + ' rows');
    console.log('audit_logs: ' + scalar(db, 'SELECT COUNT(*) AS count FROM audit_logs') + ' rows');
    console.log('admin_settings: ' + scalar(db, 'SELECT COUNT(*) AS count FROM admin_settings') + ' rows');
}

if (require.main === module) {
    status();
}

module.exports = { status };
