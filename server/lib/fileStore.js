const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function resolvePath(value) {
    if (path.isAbsolute(value)) return value;
    return path.join(PROJECT_ROOT, value);
}

function resolveDataFile(envName, fallbackPath) {
    return resolvePath(process.env[envName] || fallbackPath);
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

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function ensureDirectory(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function ensureJsonFile(filePath, fallback, seedPath) {
    ensureDir(filePath);
    if (!fs.existsSync(filePath)) {
        if (seedPath && path.resolve(seedPath) !== path.resolve(filePath) && fs.existsSync(seedPath)) {
            const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
            fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), 'utf-8');
            return;
        }
        fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
    }
}

function readJson(filePath, fallback, seedPath) {
    ensureJsonFile(filePath, fallback, seedPath);
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
}

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function backupJson(filePath, backupName) {
    if (!fs.existsSync(filePath)) return;
    const backupDir = resolveBackupDir();
    fs.mkdirSync(backupDir, { recursive: true });
    const name = backupName || path.basename(filePath, '.json');
    const backupPath = path.join(backupDir, name + '.' + timestamp() + '.bak');
    fs.copyFileSync(filePath, backupPath);
}

function writeJsonAtomic(filePath, data, backupName) {
    ensureDir(filePath);
    const serialized = JSON.stringify(data, null, 2);
    if (typeof serialized !== 'string') {
        throw new Error('Data is not JSON serializable.');
    }
    if (fs.existsSync(filePath)) {
        JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    backupJson(filePath, backupName);
    const tmpPath = filePath + '.tmp-' + process.pid + '-' + Date.now();
    fs.writeFileSync(tmpPath, serialized, 'utf-8');
    fs.renameSync(tmpPath, filePath);
}

function writeJson(filePath, data, backupName) {
    writeJsonAtomic(filePath, data, backupName);
}

function updateJson(filePath, fallback, seedPath, updater, backupName) {
    const current = readJson(filePath, fallback, seedPath);
    const next = updater(current);
    writeJsonAtomic(filePath, next, backupName);
    return next;
}

function makeId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

module.exports = {
    PROJECT_ROOT,
    resolveDataFile,
    resolveUploadDir,
    resolveUploadPublicPath,
    resolveBackupDir,
    ensureJsonFile,
    ensureDirectory,
    readJson,
    writeJson,
    writeJsonAtomic,
    updateJson,
    makeId
};
