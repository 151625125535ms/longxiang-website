'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.join(__dirname, '..', 'js', 'product-detail.js');
const outputPath = path.join(__dirname, '..', 'js', 'product-presentation-i18n.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const names = ['ARABIC_TEXT_FALLBACKS', 'ARABIC_SPEC_LABELS', 'SPEC_LABELS', 'SPEC_VALUE_TEXT', 'TEXT_FALLBACKS', 'INLINE_TEXT_FALLBACKS'];

function extractObject(name) {
    const marker = 'var ' + name + ' = ';
    const start = source.indexOf(marker);
    if (start < 0) throw new Error('Missing product i18n object: ' + name);
    const objectStart = source.indexOf('{', start + marker.length);
    let depth = 0;
    let quote = '';
    let escaped = false;
    for (let index = objectStart; index < source.length; index += 1) {
        const char = source[index];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = '';
            continue;
        }
        if (char === '"' || char === "'") { quote = char; continue; }
        if (char === '{') depth += 1;
        if (char === '}') {
            depth -= 1;
            if (depth === 0) return source.slice(objectStart, index + 1);
        }
    }
    throw new Error('Unterminated product i18n object: ' + name);
}

const values = {};
names.forEach(function (name) {
    values[name] = vm.runInNewContext('(' + extractObject(name) + ')', Object.create(null), { timeout: 1000 });
});

function extractFunction(name) {
    const marker = 'function ' + name + '(';
    const start = source.indexOf(marker);
    if (start < 0) throw new Error('Missing product presentation function: ' + name);
    const bodyStart = source.indexOf('{', start + marker.length);
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] === '}') {
            depth -= 1;
            if (depth === 0) return source.slice(start, index + 1);
        }
    }
    throw new Error('Unterminated product presentation function: ' + name);
}

const applicationContext = {
    productGroupKey: function (product) { return String(product && product.group || '').toLowerCase(); },
    text: function (en, ar) { return { en, ar }; }
};
vm.runInNewContext(extractFunction('inferApplicationItems'), applicationContext, { timeout: 1000 });
values.APPLICATION_ITEMS = {
    transformer: applicationContext.inferApplicationItems({ group: 'transformer' }),
    switchgear: applicationContext.inferApplicationItems({ group: 'switchgear' }),
    energy: applicationContext.inferApplicationItems({ group: 'new-energy' }),
    other: applicationContext.inferApplicationItems({ group: 'other' })
};

const payload = JSON.stringify(values, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
const output = '(function (root, factory) {\n' +
    "    'use strict';\n" +
    '    var data = factory();\n' +
    "    if (typeof module === 'object' && module.exports) module.exports = data;\n" +
    '    if (root) root.LongxiangProductPresentationI18n = data;\n' +
    "}(typeof window !== 'undefined' ? window : null, function () {\n" +
    "    'use strict';\n" +
    '    return ' + payload + ';\n' +
    '}));\n';
if (process.argv.includes('--check')) {
    const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
    if (existing !== output) throw new Error('Generated product presentation i18n is out of date');
    console.log('Product presentation i18n is up to date.');
} else {
    fs.writeFileSync(outputPath, output, 'utf8');
    console.log('Generated ' + path.relative(path.join(__dirname, '..'), outputPath));
}
