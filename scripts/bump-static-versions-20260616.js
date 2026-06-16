const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const files = fs.readdirSync(ROOT)
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(ROOT, name))
    .concat(
        fs.readdirSync(path.join(ROOT, 'ar'))
            .filter((name) => name.endsWith('.html'))
            .map((name) => path.join(ROOT, 'ar', name))
    );

const replacements = [
    [/styles\.css\?v=[^"']+/g, 'styles.css?v=20260616-shell7'],
    [/main\.js\?v=[^"']+/g, 'main.js?v=20260616-shell7'],
    [/content-pages\.js\?v=[^"']+/g, 'content-pages.js?v=20260616-shell7'],
    [/education\.js\?v=[^"']+/g, 'education.js?v=20260616-shell7'],
    [/products-list\.js\?v=[^"']+/g, 'products-list.js?v=20260616-shell7'],
    [/product-detail\.js\?v=[^"']+/g, 'product-detail.js?v=20260616-shell7'],
    [/compare\.js\?v=[^"']+/g, 'compare.js?v=20260616-shell7']
];

let changed = 0;
files.forEach((file) => {
    const before = fs.readFileSync(file, 'utf8');
    let after = before;
    replacements.forEach(([pattern, value]) => {
        after = after.replace(pattern, value);
    });
    if (after !== before) {
        fs.writeFileSync(file, after);
        changed += 1;
    }
});

console.log('updated static asset versions in ' + changed + ' html files');
