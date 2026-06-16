const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const htmlFiles = fs.readdirSync(ROOT)
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(ROOT, name))
    .concat(
        fs.readdirSync(path.join(ROOT, 'ar'))
            .filter((name) => name.endsWith('.html'))
            .map((name) => path.join(ROOT, 'ar', name))
    );

const navSkeleton = `
    <nav class="navbar">
        <div class="container">
            <a href="index.html" class="nav-logo">
                <span class="nav-logo-text">LONG<span>XIANG</span></span>
            </a>
            <div class="nav-links" aria-live="polite"></div>
            <div class="hamburger"><span></span><span></span><span></span></div>
        </div>
    </nav>
    <div class="mobile-menu-overlay"></div>`;

const footerSkeleton = `
    <footer class="footer">
        <div class="container">
            <div class="footer-grid" aria-live="polite"></div>
            <div class="footer-bottom"><p></p></div>
        </div>
    </footer>`;

let changed = 0;

htmlFiles.forEach((file) => {
    const before = fs.readFileSync(file, 'utf8');
    let after = before
        .replace(/\s*<nav class="navbar">[\s\S]*?<div class="mobile-menu-overlay"><\/div>/, '\n' + navSkeleton)
        .replace(/\s*<footer class="footer">[\s\S]*?<\/footer>/, '\n' + footerSkeleton);
    if (after !== before) {
        fs.writeFileSync(file, after);
        changed += 1;
    }
});

console.log('rewrote shell skeletons in ' + changed + ' html files');
