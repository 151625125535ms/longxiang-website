const express = require('express');
const { getDb } = require('../../lib/db');

const router = express.Router();
const LOW_ASSET_THRESHOLD = 5;

const EMPTY_PRODUCT_TEXT = "COALESCE(NULLIF(TRIM(%s), ''), '') = ''";

function emptyTextExpression(column) {
    return EMPTY_PRODUCT_TEXT.replace('%s', column);
}

function getCount(db, sql, params) {
    const row = db.prepare(sql).get(params || {});
    return row ? row.total : 0;
}

function getSchemaVersion(db) {
    const row = db
        .prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1')
        .get();
    return row ? row.version : null;
}

function normalizeCategory(row) {
    return {
        id: row.id,
        parentId: row.parent_id,
        slug: row.slug,
        name: row.name_en || row.name_ar || row.slug,
        nameEn: row.name_en,
        nameAr: row.name_ar,
        isActive: row.is_active !== 0,
        directProductCount: row.direct_product_count || 0,
        productCount: row.direct_product_count || 0,
        childCount: 0,
        children: []
    };
}

function getProductCategorySummary(db) {
    const rows = db.prepare(`
        SELECT
            c.id,
            c.parent_id,
            c.slug,
            c.name_en,
            c.name_ar,
            c.is_active,
            c.sort_order,
            parent.sort_order AS parent_sort_order,
            (
                SELECT COUNT(*)
                FROM products p
                WHERE p.category_id = c.id AND p.status != 'deleted'
            ) AS direct_product_count
        FROM categories c
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE c.type = 'product'
        ORDER BY
            COALESCE(parent.sort_order, c.sort_order),
            CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
            c.sort_order,
            c.id
    `).all();

    const byId = new Map();
    const parents = [];

    rows.forEach(function (row) {
        const item = normalizeCategory(row);
        byId.set(item.id, item);
    });

    rows.forEach(function (row) {
        const item = byId.get(row.id);
        if (item.parentId && byId.has(item.parentId)) {
            byId.get(item.parentId).children.push(item);
        } else {
            parents.push(item);
        }
    });

    parents.forEach(function (parent) {
        parent.childCount = parent.children.length;
        parent.productCount = parent.directProductCount + parent.children.reduce(function (total, child) {
            child.childCount = child.children.length;
            return total + child.productCount;
        }, 0);
    });

    const children = rows.filter(function (row) { return row.parent_id != null; });
    const inactive = rows.filter(function (row) { return row.is_active === 0; });
    const emptyChildren = Array.from(byId.values()).filter(function (item) {
        return item.parentId != null && item.productCount === 0;
    });
    const emptyParents = parents.filter(function (item) {
        return item.childCount === 0 || item.productCount === 0;
    });

    return {
        total: rows.length,
        parents: parents.length,
        children: children.length,
        active: rows.length - inactive.length,
        inactive: inactive.length,
        emptyChildren: emptyChildren.length,
        emptyParents: emptyParents.length,
        tree: parents
    };
}

function getRecentContent(db) {
    return db.prepare(`
        SELECT id, slug, title_en, title_ar, status, updated_at
        FROM content_blocks
        ORDER BY updated_at DESC, id DESC
        LIMIT 5
    `).all();
}

function getRecentInquiries(db) {
    return db.prepare(`
        SELECT id, name, email, subject, status, is_read, created_at, updated_at
        FROM inquiries
        WHERE status != 'deleted'
        ORDER BY created_at DESC, id DESC
        LIMIT 6
    `).all();
}

function getRecentAssets(db) {
    return db.prepare(`
        SELECT id, path, filename, original_name, mime_type, file_size, module, created_at
        FROM assets
        ORDER BY created_at DESC, id DESC
        LIMIT 5
    `).all();
}

function getRecentProducts(db) {
    return db.prepare(`
        SELECT id, name_en, name_ar, status, featured, updated_at
        FROM products
        WHERE status != 'deleted'
        ORDER BY updated_at DESC, id DESC
        LIMIT 5
    `).all();
}

function getRecentActivity(db) {
    return db.prepare(`
        SELECT id, entity_type, entity_id, action, performed_by, created_at
        FROM audit_logs
        ORDER BY created_at DESC, id DESC
        LIMIT 8
    `).all();
}

function addTodo(todos, condition, item) {
    if (condition) todos.push(item);
}

function buildTodos(stats) {
    const todos = [];

    addTodo(todos, stats.inquiries.unread > 0, {
        key: 'unread-inquiries',
        label: '未读询盘',
        count: stats.inquiries.unread,
        severity: 'high',
        meta: '需要优先查看并跟进',
        targetView: 'inquiries',
        filter: { unread: true }
    });

    addTodo(todos, stats.inquiries.new > 0, {
        key: 'new-inquiries',
        label: '新询盘',
        count: stats.inquiries.new,
        severity: 'high',
        meta: '筛选新询盘记录',
        targetView: 'inquiries',
        filter: { status: 'new' }
    });

    addTodo(todos, stats.products.draft > 0, {
        key: 'draft-products',
        label: '草稿产品',
        count: stats.products.draft,
        severity: 'medium',
        meta: '补全后可发布到前台',
        targetView: 'products',
        filter: { status: 'draft' }
    });

    addTodo(todos, stats.products.missingSeo > 0, {
        key: 'missing-product-seo',
        label: '缺 SEO 产品',
        count: stats.products.missingSeo,
        severity: 'high',
        meta: '已发布产品需要补齐 SEO 标题和描述',
        targetView: 'products',
        filter: { status: 'published', issue: 'missing_seo' }
    });

    addTodo(todos, stats.products.missingPublicUrl > 0, {
        key: 'missing-product-public-url',
        label: '未进 Sitemap 产品',
        count: stats.products.missingPublicUrl,
        severity: 'high',
        meta: '检查产品公开 ID、分类状态和父分类状态',
        targetView: 'products',
        filter: { status: 'published', issue: 'missing_public_url' }
    });

    addTodo(todos, stats.products.missingArabic > 0, {
        key: 'missing-product-arabic',
        label: '缺阿语内容产品',
        count: stats.products.missingArabic,
        severity: 'high',
        meta: '外贸阿语页面需要名称、简介和详情内容',
        targetView: 'products',
        filter: { status: 'published', issue: 'missing_arabic' }
    });

    addTodo(todos, stats.products.missingCover > 0, {
        key: 'missing-product-cover',
        label: '缺封面图产品',
        count: stats.products.missingCover,
        severity: 'medium',
        meta: '补齐封面图，避免列表和详情页展示空白',
        targetView: 'products',
        filter: { status: 'published', issue: 'missing_cover' }
    });

    addTodo(todos, stats.products.missingSpecs > 0, {
        key: 'missing-product-specs',
        label: '缺产品参数',
        count: stats.products.missingSpecs,
        severity: 'medium',
        meta: '补齐技术参数，提升选型和询盘转化',
        targetView: 'products',
        filter: { status: 'published', issue: 'missing_specs' }
    });

    addTodo(todos, stats.contentBlocks.draft > 0, {
        key: 'draft-content',
        label: '草稿内容',
        count: stats.contentBlocks.draft,
        severity: 'medium',
        meta: '进入可视化管理确认内容',
        targetView: 'visual-builder'
    });

    addTodo(todos, stats.certifications.draft > 0, {
        key: 'draft-certifications',
        label: '草稿证书',
        count: stats.certifications.draft,
        severity: 'medium',
        meta: '补全证书信息后发布',
        targetView: 'cert-qualifications'
    });

    addTodo(todos, stats.categories.product.inactive > 0, {
        key: 'inactive-categories',
        label: '停用分类',
        count: stats.categories.product.inactive,
        severity: 'medium',
        meta: '确认是否影响前台产品筛选',
        targetView: 'categories'
    });

    addTodo(todos, stats.categories.product.emptyChildren > 0, {
        key: 'empty-child-categories',
        label: '空子分类',
        count: stats.categories.product.emptyChildren,
        severity: 'low',
        meta: '检查分类是否需要补产品或隐藏',
        targetView: 'categories'
    });

    addTodo(todos, stats.assets.total < LOW_ASSET_THRESHOLD, {
        key: 'low-assets',
        label: '资源库偏少',
        count: stats.assets.total,
        severity: 'low',
        meta: '建议补充常用图片素材',
        targetView: 'assets'
    });

    return todos;
}

router.get('/', function (req, res, next) {
    try {
        const db = getDb();
        const productCategories = getProductCategorySummary(db);
        const recentInquiries = getRecentInquiries(db);
        const recentContent = getRecentContent(db);
        const recentAssets = getRecentAssets(db);
        const recentProducts = getRecentProducts(db);
        const recentActivity = getRecentActivity(db);
        const schemaVersion = getSchemaVersion(db);
        const missingSeo = getCount(db, "SELECT COUNT(*) AS total FROM products WHERE status = 'published' AND (COALESCE(NULLIF(TRIM(seo_title), ''), '') = '' OR COALESCE(NULLIF(TRIM(seo_description), ''), '') = '')");
        const missingPublicUrl = getCount(db, `
            SELECT COUNT(*) AS total
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN categories parent ON parent.id = c.parent_id
            WHERE p.status = 'published'
                AND (
                    p.category_id IS NULL
                    OR c.id IS NULL
                    OR COALESCE(c.type, '') != 'product'
                    OR c.is_active != 1
                    OR (c.parent_id IS NOT NULL AND COALESCE(parent.is_active, 0) != 1)
                    OR COALESCE(NULLIF(TRIM(p.slug), ''), NULLIF(TRIM(p.legacy_id), ''), '') = ''
                )
        `);
        const missingArabic = getCount(db, `
            SELECT COUNT(*) AS total
            FROM products p
            WHERE p.status = 'published'
                AND (${emptyTextExpression('p.name_ar')} OR ${emptyTextExpression('p.short_desc_ar')} OR ${emptyTextExpression('p.description_ar')})
        `);
        const missingCover = getCount(db, `
            SELECT COUNT(*) AS total
            FROM products p
            WHERE p.status = 'published'
                AND NOT EXISTS (
                    SELECT 1
                    FROM product_media cover
                    WHERE cover.product_id = p.id
                        AND cover.is_cover = 1
                        AND COALESCE(NULLIF(TRIM(cover.path), ''), '') != ''
                )
        `);
        const missingSpecs = getCount(db, `
            SELECT COUNT(*) AS total
            FROM products p
            WHERE p.status = 'published'
                AND NOT EXISTS (
                    SELECT 1
                    FROM product_specs ps
                    WHERE ps.product_id = p.id
                        AND ps.spec_group = 'technical'
                        AND COALESCE(NULLIF(TRIM(ps.spec_key), ''), NULLIF(TRIM(ps.spec_value), ''), '') != ''
                )
        `);

        const data = {
            products: {
                total: getCount(db, "SELECT COUNT(*) AS total FROM products WHERE status != 'deleted'"),
                published: getCount(db, "SELECT COUNT(*) AS total FROM products WHERE status = 'published'"),
                draft: getCount(db, "SELECT COUNT(*) AS total FROM products WHERE status = 'draft'"),
                featured: getCount(db, "SELECT COUNT(*) AS total FROM products WHERE featured = 1 AND status != 'deleted'"),
                missingSeo,
                missingSeoTitle: getCount(db, "SELECT COUNT(*) AS total FROM products WHERE status = 'published' AND COALESCE(NULLIF(TRIM(seo_title), ''), '') = ''"),
                missingSeoDescription: getCount(db, "SELECT COUNT(*) AS total FROM products WHERE status = 'published' AND COALESCE(NULLIF(TRIM(seo_description), ''), '') = ''"),
                missingPublicUrl,
                missingArabic,
                missingCover,
                missingSpecs,
                qualityIssueTotal: missingSeo + missingPublicUrl + missingArabic + missingCover + missingSpecs,
                recent: recentProducts
            },
            categories: {
                product: productCategories
            },
            certifications: {
                total: getCount(db, "SELECT COUNT(*) AS total FROM certifications WHERE status != 'deleted'"),
                published: getCount(db, "SELECT COUNT(*) AS total FROM certifications WHERE status = 'published'"),
                draft: getCount(db, "SELECT COUNT(*) AS total FROM certifications WHERE status = 'draft'")
            },
            inquiries: {
                total: getCount(db, "SELECT COUNT(*) AS total FROM inquiries WHERE status != 'deleted'"),
                new: getCount(db, "SELECT COUNT(*) AS total FROM inquiries WHERE status = 'new'"),
                unread: getCount(db, "SELECT COUNT(*) AS total FROM inquiries WHERE is_read = 0 AND status != 'deleted'"),
                recent: recentInquiries
            },
            contentBlocks: {
                total: getCount(db, 'SELECT COUNT(*) AS total FROM content_blocks'),
                published: getCount(db, "SELECT COUNT(*) AS total FROM content_blocks WHERE status = 'published'"),
                draft: getCount(db, "SELECT COUNT(*) AS total FROM content_blocks WHERE status = 'draft'"),
                recent: recentContent
            },
            assets: {
                total: getCount(db, 'SELECT COUNT(*) AS total FROM assets'),
                images: getCount(db, "SELECT COUNT(*) AS total FROM assets WHERE mime_type LIKE 'image/%'"),
                files: getCount(db, "SELECT COUNT(*) AS total FROM assets WHERE mime_type NOT LIKE 'image/%' OR mime_type IS NULL OR mime_type = ''"),
                recent: recentAssets
            },
            system: {
                sqliteAvailable: true,
                schemaVersion,
                publicApiSource: 'sqlite'
            },
            recentInquiries,
            recentContent: recentContent[0] || null,
            recentAssets,
            recentProducts,
            recentActivity
        };

        data.todos = buildTodos(data);
        data.summary = {
            todoTotal: data.todos.length,
            highTodoTotal: data.todos.filter(function (todo) { return todo.severity === 'high'; }).length,
            lastUpdatedAt: Date.now(),
            lastContentUpdatedAt: data.recentContent ? data.recentContent.updated_at : null
        };

        res.json({ ok: true, data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
