const fs = require('fs');
const path = require('path');
const { getDb } = require('../lib/db');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const now = Date.now();

function readJson(relativePath, fallback) {
    const filePath = path.join(PROJECT_ROOT, relativePath);
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function asString(value) {
    return String(value == null ? '' : value).trim();
}

function insertOrIgnore(statement, values) {
    const result = statement.run(values);
    return result.changes > 0;
}

function getCategoryId(db, type, slug) {
    if (!slug) return null;
    const row = db.prepare('SELECT id FROM categories WHERE type = ? AND slug = ?').get(type, slug);
    return row ? row.id : null;
}

function getProductId(db, legacyId) {
    const row = db.prepare('SELECT id FROM products WHERE legacy_id = ?').get(legacyId);
    return row ? row.id : null;
}

function seedProductCategories(db, products) {
    const seen = new Map();
    let inserted = 0;
    let skipped = 0;
    let warned = 0;

    const insert = db.prepare(`
        INSERT OR IGNORE INTO categories
            (type, slug, name_en, name_ar, sort_order, is_active, created_at, updated_at)
        VALUES
            (@type, @slug, @name_en, @name_ar, @sort_order, @is_active, @created_at, @updated_at)
    `);

    products.forEach((product, index) => {
        const slug = asString(product.category);
        if (!slug) return;

        const nameEn = asString(product.categoryLabel) || slug;
        const nameAr = asString(product.categoryLabelAr);
        const previous = seen.get(slug);

        if (previous && (previous.nameEn !== nameEn || previous.nameAr !== nameAr)) {
            warned += 1;
            console.warn('WARNING product category label mismatch for slug "' + slug + '". Keeping first label.');
        }

        if (!previous) {
            seen.set(slug, { nameEn, nameAr });
        }

        const didInsert = insertOrIgnore(insert, {
            type: 'product',
            slug,
            name_en: seen.get(slug).nameEn,
            name_ar: seen.get(slug).nameAr,
            sort_order: index,
            is_active: 1,
            created_at: now,
            updated_at: now
        });

        if (didInsert) inserted += 1;
        else skipped += 1;
    });

    console.log('product categories: inserted ' + inserted + ', skipped ' + skipped + ', warned ' + warned);
}

function seedCertificationCategories(db) {
    const categories = [
        { slug: 'qualifications', name_en: 'Enterprise Qualifications' },
        { slug: 'patents', name_en: 'Patent Certificates' },
        { slug: 'software-copyrights', name_en: 'Software Copyrights' },
        { slug: 'test-reports-extra', name_en: 'Additional Test Reports' }
    ];

    let inserted = 0;
    let skipped = 0;
    const insert = db.prepare(`
        INSERT OR IGNORE INTO categories
            (type, slug, name_en, name_ar, sort_order, is_active, created_at, updated_at)
        VALUES
            (@type, @slug, @name_en, @name_ar, @sort_order, @is_active, @created_at, @updated_at)
    `);

    categories.forEach((category, index) => {
        const didInsert = insertOrIgnore(insert, {
            type: 'certification',
            slug: category.slug,
            name_en: category.name_en,
            name_ar: '',
            sort_order: index,
            is_active: 1,
            created_at: now,
            updated_at: now
        });

        if (didInsert) inserted += 1;
        else skipped += 1;
    });

    console.log('certification categories: inserted ' + inserted + ', skipped ' + skipped);
}

function migrateProducts(db, products) {
    let inserted = 0;
    let skipped = 0;
    const insert = db.prepare(`
        INSERT OR IGNORE INTO products
            (
                legacy_id, slug, category_id, product_group, sub_category, aliases_json,
                status, sort_order, featured, views, name_en, name_ar, short_desc_en,
                short_desc_ar, description_en, description_ar, seo_title, seo_description,
                seo_keywords, version, created_at, updated_at
            )
        VALUES
            (
                @legacy_id, @slug, @category_id, @product_group, @sub_category, @aliases_json,
                @status, @sort_order, @featured, @views, @name_en, @name_ar, @short_desc_en,
                @short_desc_ar, @description_en, @description_ar, @seo_title, @seo_description,
                @seo_keywords, @version, @created_at, @updated_at
            )
    `);

    products.forEach((product, index) => {
        const legacyId = asString(product.id);
        if (!legacyId) return;

        const didInsert = insertOrIgnore(insert, {
            legacy_id: legacyId,
            slug: legacyId,
            category_id: getCategoryId(db, 'product', asString(product.category)),
            product_group: asString(product.group),
            sub_category: asString(product.subCategory),
            aliases_json: JSON.stringify(Array.isArray(product.aliases) ? product.aliases : []),
            status: 'published',
            sort_order: index,
            featured: product.featured ? 1 : 0,
            views: 0,
            name_en: asString(product.name),
            name_ar: asString(product.nameAr),
            short_desc_en: asString(product.shortDesc),
            short_desc_ar: asString(product.shortDescAr),
            description_en: asString(product.description),
            description_ar: asString(product.descriptionAr),
            seo_title: asString(product.seoTitle),
            seo_description: asString(product.seoDescription),
            seo_keywords: asString(product.seoKeywords),
            version: 1,
            created_at: now,
            updated_at: now
        });

        if (didInsert) inserted += 1;
        else skipped += 1;
    });

    console.log('products: inserted ' + inserted + ', skipped ' + skipped);
}

function migrateProductMedia(db, products) {
    let inserted = 0;
    let skipped = 0;

    const exists = db.prepare(`
        SELECT id FROM product_media
        WHERE product_id = ? AND media_type = ? AND path = ? AND is_cover = ? AND sort_order = ?
    `);
    const insert = db.prepare(`
        INSERT INTO product_media
            (product_id, asset_id, media_type, path, is_cover, sort_order, created_at)
        VALUES
            (@product_id, @asset_id, @media_type, @path, @is_cover, @sort_order, @created_at)
    `);

    products.forEach((product) => {
        const imagePath = asString(product.image);
        if (!imagePath) return;

        const productId = getProductId(db, asString(product.id));
        if (!productId) return;

        if (exists.get(productId, 'image', imagePath, 1, 0)) {
            skipped += 1;
            return;
        }

        insert.run({
            product_id: productId,
            asset_id: null,
            media_type: 'image',
            path: imagePath,
            is_cover: 1,
            sort_order: 0,
            created_at: now
        });
        inserted += 1;
    });

    console.log('product_media: inserted ' + inserted + ', skipped ' + skipped);
}

function migrateProductSpecs(db, products) {
    let inserted = 0;
    let skipped = 0;

    const exists = db.prepare(`
        SELECT id FROM product_specs
        WHERE product_id = ? AND spec_group = ? AND spec_key = ? AND spec_value = ? AND COALESCE(unit, '') = ?
    `);
    const insert = db.prepare(`
        INSERT INTO product_specs
            (product_id, spec_group, spec_key, spec_value, unit, sort_order, created_at, updated_at)
        VALUES
            (@product_id, @spec_group, @spec_key, @spec_value, @unit, @sort_order, @created_at, @updated_at)
    `);

    function addSpec(productId, group, key, value, unit, sortOrder) {
        const specValue = asString(value);
        if (!specValue) return;
        if (exists.get(productId, group, key, specValue, unit || '')) {
            skipped += 1;
            return;
        }
        insert.run({
            product_id: productId,
            spec_group: group,
            spec_key: key,
            spec_value: specValue,
            unit: unit || '',
            sort_order: sortOrder,
            created_at: now,
            updated_at: now
        });
        inserted += 1;
    }

    products.forEach((product) => {
        const productId = getProductId(db, asString(product.id));
        if (!productId) return;

        (Array.isArray(product.capacities) ? product.capacities : []).forEach((value, index) => {
            addSpec(productId, 'capacity', 'Capacity', value, 'kVA', index);
        });

        (Array.isArray(product.voltages) ? product.voltages : []).forEach((value, index) => {
            addSpec(productId, 'voltage', 'Voltage', value, '', index);
        });

        (Array.isArray(product.specs) ? product.specs : []).forEach((spec, index) => {
            if (!Array.isArray(spec) || spec.length < 2) return;
            addSpec(productId, 'technical', asString(spec[0]), spec[1], '', index);
        });
    });

    console.log('product_specs: inserted ' + inserted + ', skipped ' + skipped);
}

function migrateCertifications(db, certifications) {
    let inserted = 0;
    let skipped = 0;
    const insert = db.prepare(`
        INSERT OR IGNORE INTO certifications
            (
                legacy_id, category_id, legacy_category, status, sort_order, name_en,
                name_ar, category_label_en, category_label_ar, image_path, source_type,
                pages, width, height, issuer_en, issuer_ar, expiry_date, description_en,
                description_ar, version, created_at, updated_at
            )
        VALUES
            (
                @legacy_id, @category_id, @legacy_category, @status, @sort_order, @name_en,
                @name_ar, @category_label_en, @category_label_ar, @image_path, @source_type,
                @pages, @width, @height, @issuer_en, @issuer_ar, @expiry_date, @description_en,
                @description_ar, @version, @created_at, @updated_at
            )
    `);

    certifications.forEach((cert, index) => {
        const legacyId = asString(cert.id);
        if (!legacyId) return;

        const didInsert = insertOrIgnore(insert, {
            legacy_id: legacyId,
            category_id: getCategoryId(db, 'certification', asString(cert.category)),
            legacy_category: asString(cert.category),
            status: 'published',
            sort_order: index,
            name_en: asString(cert.name),
            name_ar: asString(cert.nameAr),
            category_label_en: asString(cert.categoryLabel),
            category_label_ar: asString(cert.categoryLabelAr),
            image_path: asString(cert.image || cert.path),
            source_type: asString(cert.type),
            pages: cert.pages || 1,
            width: cert.width || null,
            height: cert.height || null,
            issuer_en: asString(cert.issuer),
            issuer_ar: asString(cert.issuerAr),
            expiry_date: asString(cert.expiryDate),
            description_en: asString(cert.description),
            description_ar: asString(cert.descriptionAr),
            version: 1,
            created_at: now,
            updated_at: now
        });

        if (didInsert) inserted += 1;
        else skipped += 1;
    });

    console.log('certifications: inserted ' + inserted + ', skipped ' + skipped);
}

function defaultContentBlocks(educationData) {
    return [
        {
            slug: 'company-overview',
            title_en: 'Company Overview',
            title_ar: '',
            body_json: {
                name: '',
                nameAr: '',
                nameCN: '',
                founded: '',
                stockCode: '',
                registeredCapital: '',
                registeredCapitalAr: '',
                factoryArea: '',
                factoryAreaAr: '',
                patents: '',
                researchPartners: '',
                description: '',
                descriptionAr: '',
                aboutIntro: '',
                aboutIntroAr: '',
                aboutDetail: '',
                aboutDetailAr: '',
                cover_image: '',
                stats: [],
                seo: { title: '', description: '', keywords: '' }
            }
        },
        {
            slug: 'about-us',
            title_en: 'About Us',
            title_ar: '',
            body_json: {
                hero: { title_en: '', title_ar: '', title_cn: '', subtitle_en: '', subtitle_ar: '', subtitle_cn: '', image: '' },
                sections: [{ title_en: '', title_ar: '', title_cn: '', body_en: '', body_ar: '', body_cn: '', image: '', layout: 'text-image', sort_order: 0 }],
                milestones: [{ year: '', title_en: '', title_ar: '', title_cn: '', description_en: '', description_ar: '', description_cn: '', sort_order: 0 }],
                seo: { title: '', description: '', keywords: '' }
            }
        },
        {
            slug: 'contact',
            title_en: 'Contact',
            title_ar: '',
            body_json: {
                address: '',
                addressAr: '',
                headquarters: '',
                headquartersAr: '',
                phone: '',
                email: '',
                officeHours: '',
                officeHoursAr: '',
                huaiyangBase: '',
                huaiyangBaseAr: '',
                whatsapp: '',
                whatsappQr: '',
                wechat: '',
                wechatQr: '',
                skype: '',
                line: '',
                lineQr: '',
                tiktok: '',
                instagram: '',
                youtube: '',
                googleMapsUrl: '',
                googleMapsEmbedUrl: '',
                googleMyMapsEmbedUrl: '',
                openStreetMapUrl: '',
                mapLocations: {},
                mapQr: '',
                seo: { title: '', description: '', keywords: '' }
            }
        },
        {
            slug: 'applications',
            title_en: 'Applications',
            title_ar: '',
            body_json: {
                hero: { title_en: 'Applications', title_ar: '', title_cn: '应用行业', subtitle_en: '', subtitle_ar: '', subtitle_cn: '', image: '' },
                industries: [{ name_en: '', name_ar: '', name_cn: '', summary_en: '', summary_ar: '', summary_cn: '', image: '', related_product_ids: [], sort_order: 0 }],
                seo: { title: '', description: '', keywords: '' }
            }
        },
        {
            slug: 'innovation',
            title_en: 'Technology Innovation',
            title_ar: '',
            body_json: {
                hero: { title_en: 'Technology Innovation', title_ar: '', title_cn: '科技创新', subtitle_en: '', subtitle_ar: '', subtitle_cn: '', image: '' },
                sections: [{ title_en: '', title_ar: '', title_cn: '', body_en: '', body_ar: '', body_cn: '', image: '', sort_order: 0 }],
                highlights: [{ label_en: '', label_ar: '', label_cn: '', value: '', sort_order: 0 }],
                related_certification_ids: [],
                seo: { title: '', description: '', keywords: '' }
            }
        },
        {
            slug: 'education',
            title_en: 'Education Cooperation',
            title_ar: '',
            body_json: {
                hero: { title_en: '', title_ar: '', title_cn: '', subtitle_en: '', subtitle_ar: '', subtitle_cn: '', image: '' },
                stats: [],
                sections: [],
                partners: [],
                cta: { title_en: '', title_ar: '', title_cn: '', text_en: '', text_ar: '', text_cn: '', button_text_en: '', button_text_ar: '', button_text_cn: '', href: 'contact.html' },
                seo: { title: '', description: '', keywords: '' },
                ...stripUpdatedAt(educationData)
            }
        },
        {
            slug: 'page-blocks',
            title_en: 'Page Blocks',
            title_ar: '',
            body_json: {
                blocks: [
                    { key: 'home-cta', title_en: '', title_ar: '', title_cn: '', text_en: '', text_ar: '', text_cn: '', image: '', href: 'contact.html', is_active: true, sort_order: 0 },
                    { key: 'footer', footerText: '', footerTextAr: '', is_active: true, sort_order: 1 }
                ]
            }
        }
    ];
}

function stripUpdatedAt(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const copy = { ...data };
    delete copy.updatedAt;
    return copy;
}

function seedContentBlocks(db, educationData) {
    let inserted = 0;
    let skipped = 0;
    const insert = db.prepare(`
        INSERT OR IGNORE INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            (@slug, @title_en, @title_ar, @body_json, @status, @sort_order, @version, @created_at, @updated_at)
    `);

    defaultContentBlocks(educationData).forEach((block, index) => {
        const didInsert = insertOrIgnore(insert, {
            slug: block.slug,
            title_en: block.title_en,
            title_ar: block.title_ar,
            body_json: JSON.stringify(block.body_json),
            status: 'published',
            sort_order: index,
            version: 1,
            created_at: now,
            updated_at: now
        });

        if (didInsert) inserted += 1;
        else skipped += 1;
    });

    console.log('content_blocks: inserted ' + inserted + ', skipped ' + skipped);
}

function migrateInquiries(db, inquiries) {
    let inserted = 0;
    let skipped = 0;
    const insert = db.prepare(`
        INSERT OR IGNORE INTO inquiries
            (
                legacy_id, name, email, company, phone, subject, message, product_context,
                status, is_read, notes, ip, user_agent, replied_at, deleted_at, created_at,
                updated_at
            )
        VALUES
            (
                @legacy_id, @name, @email, @company, @phone, @subject, @message, @product_context,
                @status, @is_read, @notes, @ip, @user_agent, @replied_at, @deleted_at, @created_at,
                @updated_at
            )
    `);

    inquiries.forEach((inquiry) => {
        const status = asString(inquiry.status) || 'new';
        const didInsert = insertOrIgnore(insert, {
            legacy_id: asString(inquiry.id),
            name: asString(inquiry.name),
            email: asString(inquiry.email),
            company: asString(inquiry.company),
            phone: asString(inquiry.phone),
            subject: asString(inquiry.subject),
            message: asString(inquiry.message),
            product_context: asString(inquiry.productContext),
            status,
            is_read: status !== 'new' ? 1 : 0,
            notes: asString(inquiry.notes),
            ip: asString(inquiry.ip),
            user_agent: asString(inquiry.userAgent),
            replied_at: inquiry.repliedAt ? new Date(inquiry.repliedAt).getTime() : null,
            deleted_at: null,
            created_at: inquiry.createdAt ? new Date(inquiry.createdAt).getTime() : now,
            updated_at: now
        });

        if (didInsert) inserted += 1;
        else skipped += 1;
    });

    console.log('inquiries: inserted ' + inserted + ', skipped ' + skipped);
}

function seedAdminSettings(db, company) {
    let inserted = 0;
    let skipped = 0;
    const insert = db.prepare(`
        INSERT OR IGNORE INTO admin_settings (key, value_json, updated_at)
        VALUES (@key, @value_json, @updated_at)
    `);

    [
        {
            key: 'modules',
            value_json: JSON.stringify({
                dashboard: true,
                website: true,
                products: true,
                content: true,
                certifications: true,
                inquiries: true,
                assets: true,
                settings: true
            })
        },
        {
            key: 'ga4TrackingId',
            value_json: JSON.stringify(company && company.ga4TrackingId ? company.ga4TrackingId : '')
        }
    ].forEach((setting) => {
        const didInsert = insertOrIgnore(insert, {
            key: setting.key,
            value_json: setting.value_json,
            updated_at: now
        });

        if (didInsert) inserted += 1;
        else skipped += 1;
    });

    console.log('admin_settings: inserted ' + inserted + ', skipped ' + skipped);
}

function migrate() {
    const db = getDb();
    const products = readJson('data/products.json', []);
    const certifications = readJson('data/certifications.json', []);
    const education = readJson('data/education.json', {});
    const inquiries = readJson('data/inquiries.json', []);
    const company = readJson('data/company.json', {});

    const run = db.transaction(() => {
        seedProductCategories(db, products);
        seedCertificationCategories(db);
        migrateProducts(db, products);
        migrateProductMedia(db, products);
        migrateProductSpecs(db, products);
        migrateCertifications(db, certifications);
        seedContentBlocks(db, education);
        migrateInquiries(db, inquiries);
        seedAdminSettings(db, company);
    });

    run();
}

if (require.main === module) {
    try {
        migrate();
    } catch (err) {
        console.error('Migration failed: ' + err.message);
        process.exit(1);
    }
}

module.exports = { migrate };
