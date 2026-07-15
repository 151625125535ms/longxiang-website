'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const allowlistPath = path.join(projectRoot, 'config', 'translation-write-allowlist.json');
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
const runtimeWriters = new Set(allowlist.runtimeCompatibilityWriters || []);
const neutralContentWriters = new Set(allowlist.neutralContentWriters || []);
const maintenanceWriters = new Set(allowlist.legacyMaintenanceWriters || []);
const dynamicWriters = new Set(allowlist.dynamicTranslationWriters || []);
const allowed = new Set([...runtimeWriters, ...neutralContentWriters, ...maintenanceWriters, ...dynamicWriters]);
const scanRoots = ['server', 'scripts'];
const legacyFieldPattern = /\b(?:name_(?:en|ar|fr|ru)|short_desc_(?:en|ar|fr|ru)|description_(?:en|ar|fr|ru)|seo_title(?:_ar|_fr|_ru)?|seo_description(?:_ar|_fr|_ru)?|seo_keywords(?:_ar|_fr|_ru)?|title_(?:en|ar)|body_json)\b/i;
const legacyTableWritePattern = /\b(?:INSERT\s+INTO|UPDATE)\s+(?:products|categories|certifications|content_blocks)\b/i;

function listJavaScriptFiles(root) {
    const output = [];
    fs.readdirSync(root, { withFileTypes: true }).forEach(function (entry) {
        const absolute = path.join(root, entry.name);
        if (entry.isDirectory()) {
            output.push(...listJavaScriptFiles(absolute));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            output.push(absolute);
        }
    });
    return output;
}

function sqlFragments(source) {
    const fragments = [];
    const patterns = [/`([\s\S]*?)`/g, /(?:prepare|exec)\(\s*'([^']*)'/g, /(?:prepare|exec)\(\s*"([^"]*)"/g];
    patterns.forEach(function (pattern) {
        let match;
        while ((match = pattern.exec(source)) !== null) fragments.push(match[1]);
    });
    return fragments;
}

function relativePath(absolute) {
    return path.relative(projectRoot, absolute).replace(/\\/g, '/');
}

const candidates = [];
scanRoots.forEach(function (scanRoot) {
    listJavaScriptFiles(path.join(projectRoot, scanRoot)).forEach(function (absolute) {
        const relative = relativePath(absolute);
        if (/^scripts\/test-/.test(relative)) return;
        const source = fs.readFileSync(absolute, 'utf8');
        if (sqlFragments(source).some(function (sql) {
            return legacyTableWritePattern.test(sql) && legacyFieldPattern.test(sql);
        })) {
            candidates.push({ relative, source });
        }
    });
});

const errors = [];
candidates.forEach(function (candidate) {
    if (!allowed.has(candidate.relative)) {
        errors.push('Unapproved legacy translation writer: ' + candidate.relative);
    }
    if (runtimeWriters.has(candidate.relative) && candidate.source.indexOf('syncLegacyTranslations(') === -1) {
        errors.push('Runtime compatibility writer does not sync revisions: ' + candidate.relative);
    }
});

[...allowed].forEach(function (relative) {
    if (!fs.existsSync(path.join(projectRoot, relative))) {
        errors.push('Allowlisted writer does not exist: ' + relative);
    }
});

dynamicWriters.forEach(function (relative) {
    const source = fs.readFileSync(path.join(projectRoot, relative), 'utf8');
    if (source.indexOf('TRANSLATION_WRITER_SYNC') === -1 || source.indexOf('publishLegacyWrite(') === -1) {
        errors.push('Dynamic translation writer does not sync revisions: ' + relative);
    }
});

if (errors.length) {
    console.error(JSON.stringify({ ok: false, errors, candidates: candidates.map(function (item) { return item.relative; }) }, null, 2));
    process.exitCode = 1;
} else {
    console.log(JSON.stringify({
        ok: true,
        runtimeCompatibilityWriters: candidates.filter(function (item) { return runtimeWriters.has(item.relative); }).map(function (item) { return item.relative; }),
        neutralContentWriters: candidates.filter(function (item) { return neutralContentWriters.has(item.relative); }).map(function (item) { return item.relative; }),
        legacyMaintenanceWriters: candidates.filter(function (item) { return maintenanceWriters.has(item.relative); }).map(function (item) { return item.relative; }),
        dynamicTranslationWriters: [...dynamicWriters]
    }, null, 2));
}
