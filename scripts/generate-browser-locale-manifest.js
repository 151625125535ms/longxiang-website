'use strict';

const fs = require('fs');
const path = require('path');
const { loadLocaleRegistry } = require('../server/lib/localeRegistry');
const { PAGE_SHELLS, allLocaleEntries, localizedStaticFile } = require('./i18n-page-model');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'js', 'locale-manifest.js');
const STAGE_A_ASSET_VERSION = '20260715-locale-api';
const STAGE_A_SCRIPTS = new Set(['main', 'content-pages', 'education', 'products-list', 'product-detail', 'compare']);

function serializedManifest(manifest) {
    return '(function (root) {\n'
        + "    'use strict';\n"
        + '    root.LONGXIANG_LOCALE_MANIFEST = ' + JSON.stringify(manifest, null, 4).replace(/^/gm, '    ').trimStart() + ';\n'
        + '}(window));\n';
}

function manifestScriptTag(hash) {
    return '<script src="/js/locale-manifest.js?v=' + hash + '"></script>';
}

function updatePublicShells(config, hash, checkOnly) {
    const expectedTag = manifestScriptTag(hash);
    const changed = [];
    allLocaleEntries(config).forEach(function (locale) {
        PAGE_SHELLS.forEach(function (page) {
            const relativePath = localizedStaticFile(page.file, locale);
            const filePath = path.join(PROJECT_ROOT, relativePath);
            if (!fs.existsSync(filePath)) return;
            const source = fs.readFileSync(filePath, 'utf8');
            const withoutOldTag = source.replace(/\s*<script\s+src=["']\/js\/locale-manifest\.js\?v=[^"']+["']><\/script>/i, '');
            const withManifest = withoutOldTag.replace(/(\s*<script\s+src=["'](?:\.\.\/)?js\/main\.js\?v=[^"']+["']><\/script>)/i, '\n    ' + expectedTag + '$1');
            const output = withManifest.replace(/(\bjs\/([a-z-]+)\.js\?v=)[^"']+/g, function (match, prefix, name) {
                return STAGE_A_SCRIPTS.has(name) ? prefix + STAGE_A_ASSET_VERSION : match;
            });
            if (output === source) {
                if (source.indexOf(expectedTag) === -1) throw new Error('Unable to insert locale manifest before main.js in ' + relativePath);
                return;
            }
            changed.push(relativePath);
            if (!checkOnly) fs.writeFileSync(filePath, output, 'utf8');
        });
    });
    return changed;
}

function run(options) {
    const settings = options || {};
    const registry = loadLocaleRegistry();
    const manifest = registry.browserManifest();
    const expected = serializedManifest(manifest);
    const config = registry.legacyConfig();
    const changedShells = updatePublicShells(config, manifest.hash, settings.check === true);
    const existing = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : '';
    if (settings.check === true) {
        if (existing !== expected) throw new Error('js/locale-manifest.js is not synchronized with config/locales.json');
        if (changedShells.length) throw new Error('Locale manifest script tags are stale: ' + changedShells.join(', '));
        return { hash: manifest.hash, changedShells: [] };
    }
    if (existing !== expected) fs.writeFileSync(OUTPUT_PATH, expected, 'utf8');
    return { hash: manifest.hash, changedShells };
}

if (require.main === module) {
    const result = run({ check: process.argv.indexOf('--check') !== -1 });
    console.log('Locale manifest ' + result.hash + '; updated shells: ' + result.changedShells.length);
}

module.exports = { OUTPUT_PATH, run, serializedManifest, updatePublicShells };
