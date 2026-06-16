const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

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
    resolveUploadDir,
    resolveUploadPublicPath,
    resolveBackupDir,
    ensureDirectory,
    timestamp
};
