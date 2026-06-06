const fs = require('fs');
const path = require('path');

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function ensureJsonFile(filePath, fallback) {
    ensureDir(filePath);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
    }
}

function readJson(filePath, fallback) {
    ensureJsonFile(filePath, fallback);
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
}

function writeJson(filePath, data) {
    ensureDir(filePath);
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
}

function makeId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

module.exports = {
    ensureJsonFile,
    readJson,
    writeJson,
    makeId
};
