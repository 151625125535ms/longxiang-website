const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico']);
const DEFAULT_LIMIT = 20;
const LARGE_IMAGE_BYTES = 500 * 1024;
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'logs', 'backups']);

function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return (unit === 0 ? value : value.toFixed(value >= 10 ? 1 : 2)) + ' ' + units[unit];
}

function toRelative(filePath) {
    return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function walk(dir, files) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
        if (entry.isDirectory()) {
            if (!IGNORE_DIRS.has(entry.name)) walk(path.join(dir, entry.name), files);
            return;
        }
        if (!entry.isFile()) return;
        const ext = path.extname(entry.name).toLowerCase();
        if (!IMAGE_EXTENSIONS.has(ext)) return;
        const filePath = path.join(dir, entry.name);
        const stat = fs.statSync(filePath);
        files.push({ path: toRelative(filePath), ext, size: stat.size });
    });
}

function summarize(files) {
    const summary = { totalBytes: 0, byExt: {} };
    files.forEach(function (item) {
        summary.totalBytes += item.size;
        if (!summary.byExt[item.ext]) summary.byExt[item.ext] = { count: 0, size: 0 };
        summary.byExt[item.ext].count += 1;
        summary.byExt[item.ext].size += item.size;
    });
    return summary;
}

function printTable(title, rows) {
    console.log('\n' + title);
    if (!rows.length) {
        console.log('  无');
        return;
    }
    rows.forEach(function (row, index) {
        console.log(String(index + 1).padStart(2, ' ') + '. ' + formatBytes(row.size).padStart(9, ' ') + '  ' + row.path);
    });
}

function main() {
    const limitArg = Number(process.argv[2]);
    const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.floor(limitArg) : DEFAULT_LIMIT;
    const files = [];
    walk(ROOT, files);
    files.sort(function (a, b) { return b.size - a.size; });

    const summary = summarize(files);
    console.log('图片资源审计');
    console.log('文件数量: ' + files.length);
    console.log('总体积: ' + formatBytes(summary.totalBytes));
    console.log('\n按格式统计');
    Object.keys(summary.byExt).sort().forEach(function (ext) {
        const item = summary.byExt[ext];
        console.log('  ' + ext.padEnd(6, ' ') + String(item.count).padStart(4, ' ') + ' 个  ' + formatBytes(item.size));
    });

    printTable('最大图片 Top ' + limit, files.slice(0, limit));
    printTable('超过 ' + formatBytes(LARGE_IMAGE_BYTES) + ' 的 PNG/JPEG', files.filter(function (item) {
        return item.size >= LARGE_IMAGE_BYTES && ['.png', '.jpg', '.jpeg'].indexOf(item.ext) !== -1;
    }).slice(0, limit));
}

if (require.main === module) {
    main();
}
