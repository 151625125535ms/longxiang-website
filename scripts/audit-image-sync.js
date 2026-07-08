const fs = require('fs');
const path = require('path');

const { getDb } = require('../server/lib/db');
const { PROJECT_ROOT, resolveUploadDir, resolveUploadPublicPath } = require('../server/lib/fileStore');
const { auditProductMediaAssetLinks } = require('../server/lib/assetReferences');

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const json = args.has('--json');

function tableExists(db, name) {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
    return !!row;
}

function walkFiles(root) {
    const files = [];
    if (!fs.existsSync(root)) return files;

    function walk(current) {
        fs.readdirSync(current, { withFileTypes: true }).forEach(function (entry) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                return;
            }
            if (entry.isFile()) files.push(fullPath);
        });
    }

    walk(root);
    return files;
}

function toPublicPath(uploadDir, uploadPublicPath, filePath) {
    const relative = path.relative(uploadDir, filePath).replace(/\\/g, '/');
    return uploadPublicPath + '/' + relative;
}

function fileExistsForPublicPath(uploadDir, uploadPublicPath, publicPath) {
    publicPath = String(publicPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!publicPath || !publicPath.startsWith(uploadPublicPath + '/')) return false;
    const relative = publicPath.slice(uploadPublicPath.length + 1);
    return fs.existsSync(path.join(uploadDir, relative));
}

function fileExistsForProjectPath(publicPath) {
    publicPath = String(publicPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!publicPath || publicPath.indexOf('..') !== -1 || /^(https?:)?\/\//i.test(publicPath)) return false;
    return fs.existsSync(path.join(PROJECT_ROOT, publicPath));
}

function pct(part, total) {
    if (!total) return '0.00%';
    return ((part / total) * 100).toFixed(2) + '%';
}

function audit() {
    const db = getDb();
    const uploadDir = resolveUploadDir();
    const uploadPublicPath = resolveUploadPublicPath();

    const result = {
        uploadDir,
        uploadPublicPath,
        missingProductCoverFiles: [],
        productMediaInvalidPaths: [],
        nonUploadProductMediaPaths: [],
        orphanUploadFiles: [],
        assetsEntityIdNull: 0,
        productMediaAssetIdNull: 0,
        productMediaTotal: 0,
        productMediaMissingAssetPaths: 0,
        productMediaAssetIdUpdates: 0,
        productAssetReferenceGaps: 0,
        staleProductAssetReferences: 0,
        productAssetReferences: 0,
        notes: []
    };

    if (!tableExists(db, 'product_media')) {
        result.notes.push('product_media table not found.');
        return result;
    }

    const coverRows = db.prepare(`
        SELECT
            pm.id AS media_id,
            pm.product_id,
            pm.path,
            p.legacy_id,
            p.slug,
            p.name_en
        FROM product_media pm
        LEFT JOIN products p ON p.id = pm.product_id
        WHERE pm.is_cover = 1
        ORDER BY pm.product_id, pm.id
    `).all();

    coverRows.forEach(function (row) {
        const publicPath = String(row.path || '').replace(/\\/g, '/').replace(/^\/+/, '');
        if (!publicPath || publicPath.indexOf('..') !== -1 || /^(https?:)?\/\//i.test(publicPath)) {
            result.productMediaInvalidPaths.push(row);
            return;
        }
        if (publicPath.startsWith(uploadPublicPath + '/')) {
            if (!fileExistsForPublicPath(uploadDir, uploadPublicPath, publicPath)) {
                result.missingProductCoverFiles.push(row);
            }
            return;
        }
        result.nonUploadProductMediaPaths.push(row);
        if (!fileExistsForProjectPath(publicPath)) {
            result.missingProductCoverFiles.push(row);
        }
    });

    const productMediaRows = db.prepare('SELECT id, path, asset_id FROM product_media').all();
    result.productMediaTotal = productMediaRows.length;
    result.productMediaAssetIdNull = productMediaRows.filter(function (row) { return row.asset_id == null; }).length;

    const referencedPaths = new Set();
    productMediaRows.forEach(function (row) {
        if (row.path) referencedPaths.add(String(row.path).replace(/\\/g, '/').replace(/^\/+/, ''));
    });

    if (tableExists(db, 'assets')) {
        const assetRows = db.prepare('SELECT id, path, entity_id FROM assets').all();
        result.assetsEntityIdNull = assetRows.filter(function (row) { return row.entity_id == null; }).length;
        assetRows.forEach(function (row) {
            if (row.path) referencedPaths.add(String(row.path).replace(/\\/g, '/').replace(/^\/+/, ''));
        });
    } else {
        result.notes.push('assets table not found.');
    }

    if (tableExists(db, 'assets') && tableExists(db, 'asset_references')) {
        const linkAudit = auditProductMediaAssetLinks(db);
        result.productMediaMissingAssetPaths = linkAudit.missing_asset_paths.length;
        result.productMediaAssetIdUpdates = linkAudit.product_media_asset_id_updates.length;
        result.productAssetReferenceGaps = linkAudit.product_asset_reference_gaps.length;
        result.staleProductAssetReferences = linkAudit.stale_product_asset_references.length;
        result.productAssetReferences = linkAudit.product_asset_references;
    } else if (!tableExists(db, 'asset_references')) {
        result.notes.push('asset_references table not found.');
    }

    walkFiles(uploadDir).forEach(function (filePath) {
        const publicPath = toPublicPath(uploadDir, uploadPublicPath, filePath);
        if (!referencedPaths.has(publicPath)) {
            result.orphanUploadFiles.push(publicPath);
        }
    });

    return result;
}

function printText(result) {
    console.log('Image sync audit');
    console.log('uploadDir: ' + result.uploadDir);
    console.log('uploadPublicPath: ' + result.uploadPublicPath);
    console.log('missing cover files: ' + result.missingProductCoverFiles.length);
    result.missingProductCoverFiles.slice(0, 20).forEach(function (row) {
        console.log('  - product=' + (row.legacy_id || row.slug || row.product_id) + ' media_id=' + row.media_id + ' path=' + row.path);
    });
    console.log('invalid product_media paths: ' + result.productMediaInvalidPaths.length);
    result.productMediaInvalidPaths.slice(0, 20).forEach(function (row) {
        console.log('  - product=' + (row.legacy_id || row.slug || row.product_id) + ' media_id=' + row.media_id + ' path=' + row.path);
    });
    console.log('non-upload product_media paths: ' + result.nonUploadProductMediaPaths.length);
    console.log('orphan upload files: ' + result.orphanUploadFiles.length);
    result.orphanUploadFiles.slice(0, 20).forEach(function (publicPath) {
        console.log('  - ' + publicPath);
    });
    console.log('assets.entity_id IS NULL: ' + result.assetsEntityIdNull);
    console.log(
        'product_media.asset_id IS NULL: ' + result.productMediaAssetIdNull +
        ' / ' + result.productMediaTotal + ' (' + pct(result.productMediaAssetIdNull, result.productMediaTotal) + ')'
    );
    console.log('product_media missing active asset paths: ' + result.productMediaMissingAssetPaths);
    console.log('product_media asset_id updates needed: ' + result.productMediaAssetIdUpdates);
    console.log('product asset_references missing: ' + result.productAssetReferenceGaps);
    console.log('stale product asset_references: ' + result.staleProductAssetReferences);
    console.log('product asset_references: ' + result.productAssetReferences);
    result.notes.forEach(function (note) {
        console.log('note: ' + note);
    });
}

const result = audit();
if (json) {
    console.log(JSON.stringify(result, null, 2));
} else {
    printText(result);
}

if (strict && (result.missingProductCoverFiles.length || result.productMediaInvalidPaths.length)) {
    process.exitCode = 1;
}
