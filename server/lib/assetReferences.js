const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, resolveUploadDir, resolveUploadPublicPath } = require('./fileStore');

const ASSET_EXTENSIONS = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf'
};

function normalizeAssetPath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^https?:\/\/[^/]+\//i, '')
        .replace(/^(\.\.\/)+/, '')
        .replace(/^\/+/, '');
}

function isExternalPath(value) {
    return /^https?:\/\//i.test(String(value || '').trim()) || /^data:/i.test(String(value || '').trim()) || /^blob:/i.test(String(value || '').trim());
}

function looksLikeAssetPath(value) {
    const text = String(value || '').trim();
    if (!text || isExternalPath(text)) return false;
    const normalized = normalizeAssetPath(text).split(/[?#]/)[0];
    if (!normalized || normalized.indexOf(' ') !== -1) return false;
    if (/^(mailto:|tel:|#)/i.test(normalized)) return false;
    if (/^(uploads|assets)\//i.test(normalized)) return true;
    return /\.(jpe?g|png|webp|gif|svg|pdf)$/i.test(normalized);
}

function fileChecksum(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function mimeTypeFromPath(assetPath) {
    return ASSET_EXTENSIONS[path.extname(assetPath).toLowerCase()] || '';
}

function resolveLocalFilePath(assetPath) {
    const normalized = normalizeAssetPath(assetPath);
    const uploadPublicPath = resolveUploadPublicPath();
    if (normalized === uploadPublicPath || normalized.startsWith(uploadPublicPath + '/')) {
        const relativeUploadPath = normalized.slice(uploadPublicPath.length).replace(/^\/+/, '');
        return path.join(resolveUploadDir(), relativeUploadPath);
    }
    return path.join(PROJECT_ROOT, normalized);
}

function resolveAssetByPath(db, value) {
    const assetPath = normalizeAssetPath(value);
    if (!assetPath) return null;
    return db.prepare(`
        SELECT id, path, filename, original_name, mime_type, file_size,
            checksum, module, entity_type, entity_id, is_active, created_at
        FROM assets
        WHERE path = ? AND is_active = 1
        ORDER BY id DESC
        LIMIT 1
    `).get(assetPath) || null;
}

function resolveAssetIdByPath(db, value) {
    const asset = resolveAssetByPath(db, value);
    return asset ? asset.id : null;
}

function extractAssetPathReferences(value, currentPath, matches) {
    if (typeof value === 'string') {
        if (looksLikeAssetPath(value)) {
            matches.push({ asset_path: normalizeAssetPath(value), field_path: currentPath || 'body_json' });
        }
        return matches;
    }
    if (!value || typeof value !== 'object') return matches;
    if (Array.isArray(value)) {
        value.forEach(function (item, index) {
            extractAssetPathReferences(item, (currentPath || 'body_json') + '[' + index + ']', matches);
        });
        return matches;
    }
    Object.keys(value).forEach(function (key) {
        extractAssetPathReferences(value[key], currentPath ? currentPath + '.' + key : key, matches);
    });
    return matches;
}

function deleteAssetReferences(db, owner) {
    db.prepare(`
        DELETE FROM asset_references
        WHERE module = @module
            AND entity_type = @entity_type
            AND entity_id = @entity_id
    `).run({
        module: owner.module,
        entity_type: owner.entity_type,
        entity_id: owner.entity_id
    });
}

function replaceAssetReferences(db, owner, references) {
    const now = Date.now();
    deleteAssetReferences(db, owner);
    const insert = db.prepare(`
        INSERT INTO asset_references
            (asset_id, asset_path, module, entity_type, entity_id, field_path, title, created_at, updated_at)
        VALUES
            (@asset_id, @asset_path, @module, @entity_type, @entity_id, @field_path, @title, @created_at, @updated_at)
        ON CONFLICT(module, entity_type, entity_id, field_path, asset_id)
        DO UPDATE SET
            asset_path = excluded.asset_path,
            title = excluded.title,
            updated_at = excluded.updated_at
    `);
    const seen = new Set();
    references.forEach(function (reference) {
        if (!reference || !reference.asset_id || !reference.asset_path) return;
        const key = [owner.module, owner.entity_type, owner.entity_id, reference.field_path || '', reference.asset_id].join('|');
        if (seen.has(key)) return;
        seen.add(key);
        insert.run({
            asset_id: reference.asset_id,
            asset_path: normalizeAssetPath(reference.asset_path),
            module: owner.module,
            entity_type: owner.entity_type,
            entity_id: owner.entity_id,
            field_path: reference.field_path || 'image_path',
            title: reference.title || owner.title || '',
            created_at: now,
            updated_at: now
        });
    });
}

function syncProductAssetReferences(db, productId) {
    db.prepare(`
        UPDATE product_media
        SET asset_id = (
            SELECT id
            FROM assets
            WHERE assets.path = product_media.path AND assets.is_active = 1
            ORDER BY assets.id DESC
            LIMIT 1
        )
        WHERE product_id = ?
    `).run(productId);

    const rows = db.prepare(`
        SELECT
            pm.asset_id, pm.path, pm.is_cover, pm.sort_order,
            p.id AS product_id, p.name_en, p.name_ar, p.legacy_id, p.slug
        FROM product_media pm
        INNER JOIN products p ON p.id = pm.product_id
        WHERE pm.product_id = ? AND p.status != 'deleted'
        ORDER BY pm.is_cover DESC, pm.sort_order, pm.id
    `).all(productId);

    const title = rows.length
        ? (rows[0].name_en || rows[0].name_ar || rows[0].legacy_id || rows[0].slug || ('Product #' + productId))
        : ('Product #' + productId);

    replaceAssetReferences(db, {
        module: 'products',
        entity_type: 'product',
        entity_id: productId,
        title
    }, rows.map(function (row) {
        return {
            asset_id: row.asset_id,
            asset_path: row.path,
            field_path: row.is_cover ? 'cover_image' : 'media[' + row.sort_order + ']',
            title
        };
    }));
}

function syncCertificationAssetReference(db, certificationId) {
    const row = db.prepare(`
        SELECT id, image_path, name_en, name_ar, legacy_id, status
        FROM certifications
        WHERE id = ?
    `).get(certificationId);
    if (!row || row.status === 'deleted') {
        deleteAssetReferences(db, { module: 'certifications', entity_type: 'certification', entity_id: certificationId });
        return null;
    }

    const assetId = resolveAssetIdByPath(db, row.image_path);
    db.prepare('UPDATE certifications SET asset_id = ? WHERE id = ?').run(assetId, certificationId);
    const title = row.name_en || row.name_ar || row.legacy_id || ('Certification #' + row.id);
    replaceAssetReferences(db, {
        module: 'certifications',
        entity_type: 'certification',
        entity_id: row.id,
        title
    }, assetId ? [{ asset_id: assetId, asset_path: row.image_path, field_path: 'image_path', title }] : []);
    return assetId;
}

function parseBodyJson(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (err) {
        return {};
    }
}

function syncContentBlockAssetReferences(db, blockId) {
    const row = db.prepare(`
        SELECT id, slug, title_en, title_ar, body_json, status
        FROM content_blocks
        WHERE id = ?
    `).get(blockId);
    if (!row || row.status === 'deleted') {
        deleteAssetReferences(db, { module: 'content_blocks', entity_type: 'content_block', entity_id: blockId });
        return 0;
    }

    const title = row.title_en || row.title_ar || row.slug || ('Content block #' + row.id);
    const references = extractAssetPathReferences(parseBodyJson(row.body_json), 'body_json', [])
        .map(function (reference) {
            const assetId = resolveAssetIdByPath(db, reference.asset_path);
            return assetId ? {
                asset_id: assetId,
                asset_path: reference.asset_path,
                field_path: reference.field_path,
                title
            } : null;
        })
        .filter(Boolean);

    replaceAssetReferences(db, {
        module: 'content_blocks',
        entity_type: 'content_block',
        entity_id: row.id,
        title
    }, references);
    return references.length;
}

function referenceRowToUsage(row) {
    return {
        module: row.module,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        title: row.title || row.asset_path || '',
        field_path: row.field_path
    };
}

function findAssetReferences(db, assetOrPath) {
    const assetId = assetOrPath && typeof assetOrPath === 'object' ? assetOrPath.id : null;
    const assetPath = normalizeAssetPath(typeof assetOrPath === 'string' ? assetOrPath : assetOrPath && assetOrPath.path);
    if (!assetId && !assetPath) return [];
    return db.prepare(`
        SELECT module, entity_type, entity_id, field_path, title, asset_path
        FROM asset_references
        WHERE (@asset_id IS NOT NULL AND asset_id = @asset_id)
            OR (@asset_path != '' AND asset_path = @asset_path)
        ORDER BY module, entity_type, entity_id, field_path, id
    `).all({ asset_id: assetId || null, asset_path: assetPath }).map(referenceRowToUsage);
}

function collectJsonPathMatches(value, targetPath, currentPath, matches) {
    if (typeof value === 'string') {
        if (normalizeAssetPath(value) === targetPath) matches.push(currentPath || 'body_json');
        return;
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        value.forEach(function (item, index) {
            collectJsonPathMatches(item, targetPath, currentPath + '[' + index + ']', matches);
        });
        return;
    }
    Object.keys(value).forEach(function (key) {
        collectJsonPathMatches(value[key], targetPath, currentPath ? currentPath + '.' + key : key, matches);
    });
}

function findLegacyAssetUsage(db, assetOrPath) {
    const assetId = assetOrPath && typeof assetOrPath === 'object' ? assetOrPath.id : null;
    const targetPath = normalizeAssetPath(typeof assetOrPath === 'string' ? assetOrPath : assetOrPath && assetOrPath.path);
    if (!assetId && !targetPath) return [];

    const usage = [];
    db.prepare(`
        SELECT
            pm.id AS media_id, pm.product_id, pm.is_cover, pm.sort_order,
            p.name_en, p.name_ar, p.legacy_id, p.slug, p.status
        FROM product_media pm
        INNER JOIN products p ON p.id = pm.product_id
        WHERE (pm.path = @path OR (@asset_id IS NOT NULL AND pm.asset_id = @asset_id))
            AND p.status != 'deleted'
        ORDER BY pm.is_cover DESC, pm.sort_order, pm.id
    `).all({ path: targetPath, asset_id: assetId || null }).forEach(function (row) {
        usage.push({
            module: 'products',
            entity_type: 'product',
            entity_id: row.product_id,
            title: row.name_en || row.name_ar || row.legacy_id || row.slug || ('Product #' + row.product_id),
            field_path: row.is_cover ? 'cover_image' : 'media[' + row.sort_order + ']'
        });
    });

    db.prepare(`
        SELECT id, name_en, name_ar, legacy_id, status
        FROM certifications
        WHERE (image_path = @path OR (@asset_id IS NOT NULL AND asset_id = @asset_id))
            AND status != 'deleted'
        ORDER BY sort_order, id
    `).all({ path: targetPath, asset_id: assetId || null }).forEach(function (row) {
        usage.push({
            module: 'certifications',
            entity_type: 'certification',
            entity_id: row.id,
            title: row.name_en || row.name_ar || row.legacy_id || ('Certification #' + row.id),
            field_path: 'image_path'
        });
    });

    db.prepare(`
        SELECT id, slug, title_en, title_ar, body_json, status
        FROM content_blocks
        WHERE status != 'deleted'
        ORDER BY sort_order, id
    `).all().forEach(function (row) {
        const matches = [];
        try {
            collectJsonPathMatches(JSON.parse(row.body_json || '{}'), targetPath, 'body_json', matches);
        } catch (err) {
            if (String(row.body_json || '').indexOf(targetPath) !== -1) matches.push('body_json');
        }
        matches.forEach(function (fieldPath) {
            usage.push({
                module: 'content_blocks',
                entity_type: 'content_block',
                entity_id: row.id,
                title: row.title_en || row.title_ar || row.slug || ('Content block #' + row.id),
                field_path: fieldPath
            });
        });
    });

    return usage;
}

function mergeUsage(primary, fallback) {
    const merged = [];
    const seen = new Set();
    primary.concat(fallback).forEach(function (item) {
        const key = [item.module, item.entity_type, item.entity_id, item.field_path].join('|');
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(item);
    });
    return merged;
}

function findAssetUsage(db, assetOrPath) {
    return mergeUsage(findAssetReferences(db, assetOrPath), findLegacyAssetUsage(db, assetOrPath));
}

function createMissingAssetForPath(db, assetPath, moduleName) {
    const normalized = normalizeAssetPath(assetPath);
    if (!normalized || resolveAssetByPath(db, normalized)) return { created: false, skipped: true };
    const filePath = resolveLocalFilePath(normalized);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return { created: false, missing: true, filePath };
    }
    const stat = fs.statSync(filePath);
    const filename = path.basename(normalized);
    const now = Date.now();
    db.prepare(`
        INSERT INTO assets
            (path, filename, original_name, mime_type, file_size, checksum, module, entity_type, entity_id, is_active, created_at)
        VALUES
            (@path, @filename, @original_name, @mime_type, @file_size, @checksum, @module, @entity_type, NULL, 1, @created_at)
    `).run({
        path: normalized,
        filename,
        original_name: filename,
        mime_type: mimeTypeFromPath(normalized),
        file_size: stat.size,
        checksum: fileChecksum(filePath),
        module: moduleName || 'backfill',
        entity_type: 'asset_path',
        created_at: now
    });
    return { created: true };
}

function collectUsedAssetPaths(db) {
    const paths = [];
    db.prepare(`
        SELECT path, 'products' AS module
        FROM product_media
        WHERE COALESCE(NULLIF(TRIM(path), ''), '') != ''
    `).all().forEach(function (row) {
        if (looksLikeAssetPath(row.path)) paths.push({ path: normalizeAssetPath(row.path), module: row.module });
    });
    db.prepare(`
        SELECT image_path AS path, 'certifications' AS module
        FROM certifications
        WHERE status != 'deleted' AND COALESCE(NULLIF(TRIM(image_path), ''), '') != ''
    `).all().forEach(function (row) {
        if (looksLikeAssetPath(row.path)) paths.push({ path: normalizeAssetPath(row.path), module: row.module });
    });
    db.prepare(`
        SELECT body_json
        FROM content_blocks
        WHERE status != 'deleted'
    `).all().forEach(function (row) {
        extractAssetPathReferences(parseBodyJson(row.body_json), 'body_json', []).forEach(function (reference) {
            paths.push({ path: reference.asset_path, module: 'content_blocks' });
        });
    });
    const seen = new Set();
    return paths.filter(function (item) {
        if (!item.path || seen.has(item.path)) return false;
        seen.add(item.path);
        return true;
    });
}

function backfillAssetReferences(db, options) {
    const apply = !!(options && options.apply);
    const paths = collectUsedAssetPaths(db);
    const summary = {
        mode: apply ? 'apply' : 'dry-run',
        used_paths: paths.length,
        existing_assets: 0,
        missing_assets: 0,
        created_assets: 0,
        missing_files: [],
        product_media_rows: 0,
        certifications: 0,
        content_blocks: 0,
        asset_references: 0
    };

    paths.forEach(function (item) {
        if (resolveAssetByPath(db, item.path)) {
            summary.existing_assets += 1;
            return;
        }
        summary.missing_assets += 1;
        const result = apply ? createMissingAssetForPath(db, item.path, item.module) : { created: false };
        if (result.created) summary.created_assets += 1;
        if (result.missing) summary.missing_files.push({ path: item.path, file: result.filePath });
    });

    if (!apply) return summary;

    db.prepare(`
        UPDATE product_media
        SET asset_id = (
            SELECT id
            FROM assets
            WHERE assets.path = product_media.path AND assets.is_active = 1
            ORDER BY assets.id DESC
            LIMIT 1
        )
    `).run();
    summary.product_media_rows = db.prepare('SELECT COUNT(*) AS total FROM product_media WHERE asset_id IS NOT NULL').get().total;

    db.prepare(`
        UPDATE certifications
        SET asset_id = (
            SELECT id
            FROM assets
            WHERE assets.path = certifications.image_path AND assets.is_active = 1
            ORDER BY assets.id DESC
            LIMIT 1
        )
        WHERE status != 'deleted'
    `).run();

    db.prepare('DELETE FROM asset_references').run();
    db.prepare("SELECT id FROM products WHERE status != 'deleted'").all().forEach(function (row) {
        syncProductAssetReferences(db, row.id);
    });
    db.prepare("SELECT id FROM certifications WHERE status != 'deleted'").all().forEach(function (row) {
        syncCertificationAssetReference(db, row.id);
        summary.certifications += 1;
    });
    db.prepare("SELECT id FROM content_blocks WHERE status != 'deleted'").all().forEach(function (row) {
        summary.content_blocks += 1;
        summary.asset_references += syncContentBlockAssetReferences(db, row.id);
    });
    summary.asset_references = db.prepare('SELECT COUNT(*) AS total FROM asset_references').get().total;
    return summary;
}

module.exports = {
    normalizeAssetPath,
    looksLikeAssetPath,
    resolveAssetByPath,
    resolveAssetIdByPath,
    extractAssetPathReferences,
    deleteAssetReferences,
    replaceAssetReferences,
    syncProductAssetReferences,
    syncCertificationAssetReference,
    syncContentBlockAssetReferences,
    findAssetUsage,
    backfillAssetReferences
};