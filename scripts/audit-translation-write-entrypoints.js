'use strict';

const fs = require('fs');
const path = require('path');
const {
    OPT_IN_FLAG,
    assertArchivedLegacyWriterAllowed
} = require('./lib/archived-legacy-writer-guard');

const projectRoot = path.resolve(__dirname, '..');
const allowlistPath = path.join(projectRoot, 'config', 'translation-write-allowlist.json');
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
const runtimeWriters = new Set(allowlist.runtimeCompatibilityWriters || []);
const lifecycleWriters = new Set(allowlist.contentLifecycleWriters || []);
const coreWriters = new Set(allowlist.translationCoreWriters || []);
const controlledWriters = new Set(allowlist.controlledMigrationWriters || []);
const schemaWriters = new Set(allowlist.schemaMigrationWriters || []);
const neutralContentWriters = new Set(allowlist.neutralContentWriters || []);
const maintenanceWriters = new Set(allowlist.legacyMaintenanceWriters || []);
const dynamicWriters = new Set(allowlist.dynamicTranslationWriters || []);
const categories = [runtimeWriters, lifecycleWriters, coreWriters, controlledWriters, schemaWriters, neutralContentWriters, maintenanceWriters, dynamicWriters];
const allowed = new Set(categories.flatMap(function (items) { return [...items]; }));
const scanRoots = ['server', 'scripts'];
const legacyFieldPattern = /\b(?:name_(?:en|ar|fr|ru)|short_desc_(?:en|ar|fr|ru)|description_(?:en|ar|fr|ru)|seo_title(?:_ar|_fr|_ru)?|seo_description(?:_ar|_fr|_ru)?|seo_keywords(?:_ar|_fr|_ru)?|title_(?:en|ar)|body_json)\b/i;
const legacyTableWritePattern = /\b(?:INSERT\s+INTO|UPDATE)\s+(?:products|categories|certifications|content_blocks)\b/i;
const revisionTableWritePattern = /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:product_translations|category_translations|certification_translations|content_block_translations|content_translation_schemas)\b/i;
const dynamicRevisionWritePattern = /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+\$\{config\.translationTable\}/i;

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
        const fragments = sqlFragments(source);
        const legacyWrite = fragments.some(function (sql) {
            return legacyTableWritePattern.test(sql) && legacyFieldPattern.test(sql);
        });
        const revisionWrite = fragments.some(function (sql) {
            return revisionTableWritePattern.test(sql) || dynamicRevisionWritePattern.test(sql);
        });
        if (legacyWrite || revisionWrite) {
            candidates.push({ relative, source, legacyWrite, revisionWrite });
        }
    });
});

const errors = [];
try {
    assertArchivedLegacyWriterAllowed('audit-probe.js', []);
    errors.push('Archived legacy writer guard did not reject an unapproved invocation.');
} catch (error) {
    if (!error || error.code !== 'ARCHIVED_LEGACY_WRITER_DISABLED') {
        errors.push('Archived legacy writer guard returned an unexpected error.');
    }
}
try {
    assertArchivedLegacyWriterAllowed('audit-probe.js', [OPT_IN_FLAG]);
} catch (error) {
    errors.push('Archived legacy writer guard rejected an explicit opt-in invocation.');
}
candidates.forEach(function (candidate) {
    if (!allowed.has(candidate.relative)) {
        errors.push('Unapproved legacy translation writer: ' + candidate.relative);
    }
    if (runtimeWriters.has(candidate.relative) && candidate.source.indexOf('syncLegacyTranslations(') === -1) {
        errors.push('Runtime compatibility writer does not sync revisions: ' + candidate.relative);
    }
    if (maintenanceWriters.has(candidate.relative)
        && candidate.source.indexOf('assertArchivedLegacyWriterAllowed(__filename)') === -1) {
        errors.push('Archived legacy writer is missing its explicit opt-in guard: ' + candidate.relative);
    }
});

categories.forEach(function (items, categoryIndex) {
    items.forEach(function (relative) {
        const duplicateCount = categories.filter(function (candidate, index) {
            return index !== categoryIndex && candidate.has(relative);
        }).length;
        if (duplicateCount) errors.push('Writer appears in multiple allowlist categories: ' + relative);
    });
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

lifecycleWriters.forEach(function (relative) {
    const source = fs.readFileSync(path.join(projectRoot, relative), 'utf8');
    const isLifecycleModule = relative === 'server/lib/contentBlockLifecycle.js';
    if (isLifecycleModule && source.indexOf('function updateContentBlock(') === -1) {
        errors.push('Content lifecycle module does not expose the governed writer: ' + relative);
    }
    if (!isLifecycleModule
        && source.indexOf('updateContentBlock(') === -1
        && source.indexOf('createContentBlock(') === -1) {
        errors.push('Content lifecycle caller does not use the governed writer: ' + relative);
    }
});

neutralContentWriters.forEach(function (relative) {
    const source = fs.readFileSync(path.join(projectRoot, relative), 'utf8');
    if (source.indexOf('updateContentBlock(') === -1) {
        errors.push('Neutral content writer does not use the governed lifecycle after Overlay activation: ' + relative);
    }
});

coreWriters.forEach(function (relative) {
    const source = fs.readFileSync(path.join(projectRoot, relative), 'utf8');
    if (source.indexOf('function createTranslationWriter(') === -1) {
        errors.push('Translation core writer marker is missing: ' + relative);
    }
});

controlledWriters.forEach(function (relative) {
    const source = fs.readFileSync(path.join(projectRoot, relative), 'utf8');
    if (source.indexOf('db.transaction(') === -1) {
        errors.push('Controlled migration writer is missing an atomic transaction: ' + relative);
    }
});

const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
Object.keys(packageJson.scripts || {}).forEach(function (name) {
    const command = String(packageJson.scripts[name] || '').replace(/\\/g, '/');
    maintenanceWriters.forEach(function (relative) {
        const syntaxOnly = command.includes('node --check ' + relative);
        if (command.includes(relative) && !syntaxOnly && !name.startsWith('legacy:')) {
            errors.push('Archived legacy writer is exposed as a normal npm command: ' + name + ' -> ' + relative);
        }
        if (command.includes(relative) && name.startsWith('legacy:') && !command.includes(OPT_IN_FLAG)) {
            errors.push('Archived legacy npm command is missing the explicit opt-in flag: ' + name + ' -> ' + relative);
        }
    });
});

if (errors.length) {
    console.error(JSON.stringify({ ok: false, errors, candidates: candidates.map(function (item) { return item.relative; }) }, null, 2));
    process.exitCode = 1;
} else {
    console.log(JSON.stringify({
        ok: true,
        runtimeCompatibilityWriters: candidates.filter(function (item) { return runtimeWriters.has(item.relative); }).map(function (item) { return item.relative; }),
        contentLifecycleWriters: [...lifecycleWriters],
        translationCoreWriters: [...coreWriters],
        controlledMigrationWriters: [...controlledWriters],
        schemaMigrationWriters: [...schemaWriters],
        neutralContentWriters: candidates.filter(function (item) { return neutralContentWriters.has(item.relative); }).map(function (item) { return item.relative; }),
        legacyMaintenanceWriters: candidates.filter(function (item) { return maintenanceWriters.has(item.relative); }).map(function (item) { return item.relative; }),
        dynamicTranslationWriters: [...dynamicWriters]
    }, null, 2));
}
