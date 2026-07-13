const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const PRODUCT_GALLERY_THUMBNAIL_CACHE_SUBDIR = path.join('.cache', 'product-gallery');

function resolvePath(value) {
    if (path.isAbsolute(value)) return value;
    return path.join(PROJECT_ROOT, value);
}

function resolveUploadDir() {
    return resolvePath(process.env.UPLOAD_DIR || path.join(PROJECT_ROOT, 'uploads'));
}

function resolveUploadPublicPath() {
    return String(process.env.UPLOAD_PUBLIC_PATH || 'uploads').replace(/^\/+|\/+$/g, '');
}

function normalizePublicPath(publicPath) {
    const normalized = String(publicPath || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/[?#].*$/, '')
        .replace(/^\/+/, '');
    if (!normalized || normalized.indexOf('..') !== -1) return '';
    if (/^(?:https?:)?\/\//i.test(normalized) || /^(?:data|blob):/i.test(normalized)) return '';
    if (/[\u0000-\u001f\u007f]/.test(normalized)) return '';
    return normalized;
}

function resolvePublicFilePath(publicPath) {
    const normalized = normalizePublicPath(publicPath);
    if (!normalized) return '';

    const uploadPublicPath = normalizePublicPath(resolveUploadPublicPath());
    if (uploadPublicPath && (normalized === uploadPublicPath || normalized.startsWith(uploadPublicPath + '/'))) {
        const relativeUploadPath = normalized === uploadPublicPath
            ? ''
            : normalized.slice(uploadPublicPath.length + 1);
        const uploadDir = path.resolve(resolveUploadDir());
        const resolvedUploadFile = path.resolve(uploadDir, ...relativeUploadPath.split('/').filter(Boolean));
        const uploadRootWithSep = uploadDir.endsWith(path.sep) ? uploadDir : uploadDir + path.sep;
        if (resolvedUploadFile !== uploadDir && !resolvedUploadFile.startsWith(uploadRootWithSep)) return '';
        return resolvedUploadFile;
    }

    const root = path.resolve(PROJECT_ROOT);
    const resolved = path.resolve(root, ...normalized.split('/').filter(Boolean));
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
    if (resolved !== root && !resolved.startsWith(rootWithSep)) return '';
    return resolved;
}

function resolveProductGalleryThumbnailCacheDir() {
    return path.join(resolveUploadDir(), PRODUCT_GALLERY_THUMBNAIL_CACHE_SUBDIR);
}

function resolveBackupDir() {
    return resolvePath(process.env.BACKUP_DIR || path.join(PROJECT_ROOT, 'backups'));
}

function ensureDirectory(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

module.exports = {
    PROJECT_ROOT,
    PRODUCT_GALLERY_THUMBNAIL_CACHE_SUBDIR,
    resolveUploadDir,
    resolveUploadPublicPath,
    normalizePublicPath,
    resolvePublicFilePath,
    resolveProductGalleryThumbnailCacheDir,
    resolveBackupDir,
    ensureDirectory,
    timestamp
};
