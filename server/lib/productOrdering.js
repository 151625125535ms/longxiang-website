'use strict';

const crypto = require('crypto');

class ProductOrderingError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.name = 'ProductOrderingError';
        this.status = status;
        this.code = code;
        this.details = details || null;
    }
}

function productOrderRows(db) {
    return db.prepare(`
        SELECT
            p.id, p.legacy_id, p.slug, p.name_cn, p.name_en, p.model,
            p.status, p.sort_order, p.version, p.category_id,
            category.slug AS category_slug,
            category.name_en AS category_name_en,
            category.sort_order AS category_sort_order,
            parent.id AS parent_category_id,
            parent.slug AS parent_category_slug,
            parent.name_en AS parent_category_name_en,
            parent.sort_order AS parent_category_sort_order,
            COALESCE((
                SELECT pm.path
                FROM product_media pm
                WHERE pm.product_id = p.id AND pm.is_cover = 1
                ORDER BY pm.sort_order, pm.id
                LIMIT 1
            ), '') AS cover_image
        FROM products p
        LEFT JOIN categories category ON category.id = p.category_id
        LEFT JOIN categories parent ON parent.id = category.parent_id
        WHERE p.status != 'deleted'
        ORDER BY p.sort_order, p.id
    `).all();
}

function productOrderToken(rows) {
    const snapshot = rows.map(function (row) {
        return {
            id: Number(row.id),
            sort_order: Number(row.sort_order || 0),
            category_id: row.category_id == null ? null : Number(row.category_id)
        };
    });
    return crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

function readProductOrder(db) {
    const items = productOrderRows(db);
    return {
        items,
        orderToken: productOrderToken(items)
    };
}

function normalizeOrderedIds(value) {
    if (!Array.isArray(value)) {
        throw new ProductOrderingError(422, 'ORDER_VALIDATION_FAILED', '产品顺序必须是数组。');
    }
    const ids = value.map(function (id) { return Number(id); });
    if (ids.some(function (id) { return !Number.isSafeInteger(id) || id <= 0; })) {
        throw new ProductOrderingError(422, 'ORDER_VALIDATION_FAILED', '产品顺序包含无效 ID。');
    }
    if (new Set(ids).size !== ids.length) {
        throw new ProductOrderingError(422, 'ORDER_SCOPE_MISMATCH', '产品顺序包含重复项，请重新加载后再试。');
    }
    return ids;
}

function assertCompleteScope(currentRows, orderedIds) {
    const currentIds = currentRows.map(function (row) { return Number(row.id); }).sort(function (a, b) { return a - b; });
    const requestedIds = orderedIds.slice().sort(function (a, b) { return a - b; });
    const matches = currentIds.length === requestedIds.length && currentIds.every(function (id, index) {
        return id === requestedIds[index];
    });
    if (!matches) {
        throw new ProductOrderingError(
            422,
            'ORDER_SCOPE_MISMATCH',
            '产品集合已经变化，请重新加载完整列表后再保存。',
            { expectedCount: currentIds.length, receivedCount: requestedIds.length }
        );
    }
}

function reorderProducts(db, options) {
    options = options || {};
    const orderedIds = normalizeOrderedIds(options.orderedIds);
    const expectedOrderToken = String(options.expectedOrderToken || '').trim();
    if (!expectedOrderToken) {
        throw new ProductOrderingError(422, 'ORDER_TOKEN_REQUIRED', '缺少产品顺序版本，请重新加载后再保存。');
    }

    const run = db.transaction(function () {
        const beforeState = readProductOrder(db);
        if (beforeState.orderToken !== expectedOrderToken) {
            throw new ProductOrderingError(409, 'ORDER_CONFLICT', '产品顺序已被其他操作更新，请重新加载后再试。');
        }
        assertCompleteScope(beforeState.items, orderedIds);

        const previousById = new Map(beforeState.items.map(function (row) {
            return [Number(row.id), Number(row.sort_order || 0)];
        }));
        const update = db.prepare('UPDATE products SET sort_order = ? WHERE id = ? AND status != \'deleted\'');
        let changed = 0;
        orderedIds.forEach(function (id, index) {
            const sortOrder = index + 1;
            if (previousById.get(id) === sortOrder) return;
            const result = update.run(sortOrder, id);
            if (result.changes !== 1) {
                throw new ProductOrderingError(409, 'ORDER_CONFLICT', '产品集合在保存时发生变化，请重新加载后再试。');
            }
            changed += 1;
        });

        if (changed > 0 && typeof options.recordAudit === 'function') {
            options.recordAudit(
                beforeState.items.map(function (row) { return Number(row.id); }),
                orderedIds.slice()
            );
        }

        const afterState = readProductOrder(db);
        return {
            items: afterState.items,
            orderToken: afterState.orderToken,
            changed
        };
    });

    return run.immediate();
}

module.exports = {
    ProductOrderingError,
    readProductOrder,
    reorderProducts,
    productOrderToken
};
