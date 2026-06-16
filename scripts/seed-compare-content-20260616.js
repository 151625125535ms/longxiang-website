const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const db = new Database(path.join(ROOT, 'data', 'longxiang.db'));
const now = Date.now();

function mergeMissing(target, source) {
    Object.keys(source).forEach(function (key) {
        if (target[key] === undefined) {
            target[key] = source[key];
            return;
        }
        if (
            target[key] &&
            source[key] &&
            typeof target[key] === 'object' &&
            typeof source[key] === 'object' &&
            !Array.isArray(target[key]) &&
            !Array.isArray(source[key])
        ) {
            mergeMissing(target[key], source[key]);
        }
    });
    return target;
}

const body = {
    hero: {
        title: 'Product Comparison',
        titleAr: 'مقارنة المنتجات',
        subtitle: 'Review selected models side by side.',
        subtitleAr: 'راجع النماذج المحددة جنباً إلى جنب.',
        backgroundImage: '成品区/非晶立体卷.png',
        breadcrumb: [
            { label: 'Home', labelAr: 'الرئيسية', href: 'index.html' },
            { label: 'Products', labelAr: 'المنتجات', href: 'products.html' },
            { label: 'Product Comparison', labelAr: 'مقارنة المنتجات', current: true }
        ]
    },
    toolbar: {
        backLabel: 'Back to Products',
        backLabelAr: 'العودة إلى المنتجات',
        backHref: 'products.html',
        printLabel: 'Export PDF',
        printLabelAr: 'تصدير PDF'
    },
    emptyState: {
        text: 'Select products from the catalog to compare their specifications.',
        textAr: 'اختر المنتجات من القائمة لمقارنة المواصفات.',
        errorText: 'Unable to load comparison data.',
        errorTextAr: 'تعذر تحميل بيانات المقارنة.'
    },
    table: {
        specificationLabel: 'Specification',
        specificationLabelAr: 'المواصفة',
        imageLabel: 'Image',
        imageLabelAr: 'الصورة',
        categoryLabel: 'Category',
        categoryLabelAr: 'الفئة',
        capacitiesLabel: 'Capacities',
        capacitiesLabelAr: 'السعات',
        voltagesLabel: 'Voltages',
        voltagesLabelAr: 'الجهود',
        descriptionLabel: 'Description',
        descriptionLabelAr: 'الوصف'
    },
    seo: {
        title: 'Product Comparison | Henan Longxiang Electrical Co., Ltd.',
        titleAr: 'مقارنة المنتجات | Henan Longxiang Electrical Co., Ltd.',
        description: 'Compare selected Longxiang power equipment models side by side.',
        descriptionAr: 'قارن نماذج معدات الطاقة المختارة من Longxiang جنباً إلى جنب.',
        image: '成品区/非晶立体卷.png'
    }
};

const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get('compare');

if (row) {
    const current = JSON.parse(row.body_json || '{}');
    const next = mergeMissing(current, body);
    db.prepare(`
        UPDATE content_blocks
        SET title_en = COALESCE(NULLIF(title_en, ''), 'Product Comparison'),
            title_ar = COALESCE(NULLIF(title_ar, ''), 'مقارنة المنتجات'),
            body_json = @body_json,
            status = 'published',
            version = version + 1,
            updated_at = @now
        WHERE slug = 'compare'
    `).run({ body_json: JSON.stringify(next), now });
    console.log('updated compare content block: added missing fields');
} else {
    db.prepare(`
        INSERT INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            ('compare', 'Product Comparison', 'مقارنة المنتجات', @body_json, 'published', 55, 1, @now, @now)
    `).run({ body_json: JSON.stringify(body), now });
    console.log('inserted content block: compare');
}
