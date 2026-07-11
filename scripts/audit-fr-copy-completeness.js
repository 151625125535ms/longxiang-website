const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const homeDir = process.env.USERPROFILE || os.homedir();
const stageDir = path.join(homeDir || root, 'Desktop', 'new', 'stage');
const defaultOutput = path.join(stageDir, 'fr-copy-gap-report.md');

const pages = [
    { path: '/fr/', label: 'Accueil' },
    { path: '/fr/products.html', label: 'Produits' },
    { path: '/fr/products/lxac-14kw', label: 'Detail produit' },
    { path: '/fr/about.html', label: 'A propos' },
    { path: '/fr/solutions.html', label: 'Solutions' },
    { path: '/fr/education.html', label: 'Education' },
    { path: '/fr/contact.html', label: 'Contact' },
    { path: '/fr/certifications.html', label: 'Certifications' },
    { path: '/fr/compare.html', label: 'Comparaison' },
];

const allowedEnglishPatterns = [
    /\bLongxiang\b/i,
    /\bHenan Longxiang Electric\b/i,
    /\bNEEQ\b/i,
    /\bEV\b/,
    /\bPV\b/,
    /\bEPC\b/,
    /\bO&M\b/,
    /\bOEM\b/,
    /\bAC\b/,
    /\bDC\b/,
    /\bIEC\b/,
    /\bGB\/T\b/,
    /\bISO\b/,
    /\bIP\d{2}\b/,
    /\bkV\b/i,
    /\bkVA\b/i,
    /\bkW\b/i,
    /\bHz\b/i,
    /\bV\b/,
    /\bLX[A-Z0-9-]+\b/,
    /\bS\([A-Z]\)[A-Z0-9-]+\b/,
    /\bZGS[A-Z0-9-]*\b/,
    /\bGCS\b/,
    /\bInstagram\b/,
    /\bYouTube\b/,
    /\bWhatsApp\b/,
];

const blockerPhrases = [
    'About Longxiang',
    'About Us',
    'Additional Test Reports',
    'Application Scenarios',
    'Best fit',
    'Build Power',
    'Buyer FAQ',
    'Can Longxiang',
    'Certificates',
    'Certificates & Qualification Archive',
    'Choose a cooperation',
    'Collaborative Talent Training',
    'Company founded',
    'Confirm',
    'Contact Us',
    'DISCUSS A PROJECT',
    'DISCUSS COOPERATION',
    'Education Cooperation',
    'Engineering General Contracting',
    'Enterprise Qualifications',
    'EXPLORE SOLUTIONS',
    'Four Core Major Directions',
    'Home',
    'Includes',
    'Industrial College',
    'Integrated Smart Energy',
    'Load More',
    'Manufacturing transformation',
    'MESSAGE',
    'Models',
    'Patent Certificates',
    'PHONE NUMBER',
    'Product FAQ',
    'Qualification materials',
    'Quality in every system',
    'REQUEST',
    'REQUEST DISTRIBUTION CONFIGURATION',
    'REQUEST O&M SUPPORT',
    'SEND PROJECT',
    'Software Copyrights',
    'Solutions by',
    'Submit Project Requirements',
    'Teaching Equipment',
    'Transformer Manufacturing',
    'Your information',
];

const warningPhrases = [
    'Air cooling',
    'Cooling',
    'Floor-mounted',
    'Input / Output Voltage',
    'Oil immersed',
    'Power Equipment',
    'Product Model',
    'Project',
    'Protection',
    'Silicon Steel',
    'Switchgear',
    'three-phase',
];

function parseArgs(argv) {
    const args = {
        base: 'https://www.lxenelectric.com',
        output: defaultOutput,
        json: '',
        failOnBlockers: false,
    };

    for (let index = 2; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--fail-on-blockers') {
            args.failOnBlockers = true;
            continue;
        }
        if (!arg.startsWith('--')) throw new Error('Unexpected argument: ' + arg);
        const eqIndex = arg.indexOf('=');
        const name = arg.slice(2, eqIndex === -1 ? undefined : eqIndex);
        const value = eqIndex === -1 ? argv[index + 1] : arg.slice(eqIndex + 1);
        if (!value || value.startsWith('--')) throw new Error('Missing value for --' + name);
        if (eqIndex === -1) index += 1;
        if (!Object.prototype.hasOwnProperty.call(args, name)) throw new Error('Unknown option: --' + name);
        args[name] = value;
    }

    args.base = String(args.base || '').replace(/\/+$/, '');
    args.output = path.resolve(args.output);
    args.json = args.json ? path.resolve(args.json) : '';
    return args;
}

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function excerpt(value, length) {
    const text = normalizeText(value);
    const limit = length || 220;
    return text.length > limit ? text.slice(0, limit - 3).trimEnd() + '...' : text;
}

function md(value) {
    return String(value == null ? '' : value)
        .replace(/\r?\n/g, '<br>')
        .replace(/\|/g, '\\|')
        .trim();
}

function stripAllowedEnglish(value) {
    let output = String(value || '');
    allowedEnglishPatterns.forEach((pattern) => {
        output = output.replace(pattern, ' ');
    });
    return output;
}

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPhrase(text, phrase) {
    const value = normalizeText(phrase);
    if (!value) return false;
    const isAllCapsPhrase = value === value.toUpperCase() && /[A-Z]/.test(value);
    const prefix = /^[A-Za-z0-9]/.test(value) ? '\\b' : '';
    const suffix = /[A-Za-z0-9]$/.test(value) ? '\\b' : '';
    const flags = isAllCapsPhrase ? '' : 'i';
    return new RegExp(prefix + escapeRegExp(value) + suffix, flags).test(normalizeText(text));
}

function phraseHits(text, phrases) {
    return phrases
        .filter((phrase) => containsPhrase(text, phrase))
        .map((phrase) => ({ phrase }));
}

function englishRunWarnings(text) {
    const stripped = stripAllowedEnglish(text);
    const pattern = /\b[A-Z][A-Za-z&+/-]*(?:\s+[A-Z][A-Za-z&+/-]*){2,}\b/g;
    const hits = [];
    let match;
    while ((match = pattern.exec(stripped)) !== null) {
        const phrase = normalizeText(match[0]);
        if (phrase.length >= 12 && !hits.some((item) => item.phrase === phrase)) hits.push({ phrase });
    }
    return hits.slice(0, 20);
}

async function inspectPage(page, base, item) {
    const url = base + item.path + (item.path.indexOf('?') === -1 ? '?' : '&') + 'frCopyAudit=' + Date.now();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(800);

    const data = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
            .map((el) => el.innerText.trim())
            .filter(Boolean)
            .slice(0, 24);
        const buttons = Array.from(document.querySelectorAll('a,button,label,input,textarea,select'))
            .map((el) => {
                const tag = el.tagName.toLowerCase();
                const textValue = el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || '';
                return {
                    tag,
                    text: textValue.trim(),
                    placeholder: el.getAttribute('placeholder') || '',
                    aria: el.getAttribute('aria-label') || '',
                };
            })
            .filter((entry) => entry.text || entry.placeholder || entry.aria)
            .slice(0, 120);
        const metaDescription = document.querySelector('meta[name="description"]');
        return {
            lang: document.documentElement.lang,
            title: document.title,
            description: metaDescription ? metaDescription.getAttribute('content') || '' : '',
            text,
            headings,
            controls: buttons,
        };
    });

    const allText = [
        data.title,
        data.description,
        data.text,
        data.headings.join(' '),
        data.controls.map((control) => [control.text, control.placeholder, control.aria].join(' ')).join(' '),
    ].join(' ');

    const blockers = phraseHits(allText, blockerPhrases);
    const warnings = phraseHits(allText, warningPhrases).concat(englishRunWarnings(allText));

    return {
        path: item.path,
        label: item.label,
        url,
        lang: data.lang,
        title: data.title,
        description: data.description,
        headings: data.headings,
        controls: data.controls,
        blockers,
        warnings,
        sample: excerpt(data.text, 500),
    };
}

function renderReport(results, args) {
    const blockerCount = results.reduce((sum, item) => sum + item.blockers.length, 0);
    const warningCount = results.reduce((sum, item) => sum + item.warnings.length, 0);
    const lines = [];

    lines.push('# 法语全站文案完整度审计报告', '');
    lines.push('- 生成时间：' + new Date().toISOString());
    lines.push('- 审计地址：' + args.base);
    lines.push('- 页面数量：' + results.length);
    lines.push('- blocker 数量：' + blockerCount);
    lines.push('- warning 数量：' + warningCount);
    lines.push('');
    lines.push('## 结论', '');
    if (blockerCount) {
        lines.push('当前法语页面仍存在非白名单英文残留，不能视为完整法语文案。');
    } else if (warningCount) {
        lines.push('当前未发现 blocker，但仍存在需要人工判断的英文技术词或长英文片段。');
    } else {
        lines.push('当前未发现配置内英文残留。仍建议人工抽查产品参数和证书官方名称。');
    }
    lines.push('');
    lines.push('## 页面汇总', '');
    lines.push('| 页面 | lang | title | blockers | warnings |');
    lines.push('| --- | --- | --- | ---: | ---: |');
    results.forEach((item) => {
        lines.push('| `' + item.path + '` | `' + md(item.lang) + '` | ' + md(item.title) + ' | ' + item.blockers.length + ' | ' + item.warnings.length + ' |');
    });

    lines.push('', '## Blockers', '');
    results.forEach((item) => {
        if (!item.blockers.length) return;
        lines.push('### ' + item.path, '');
        lines.push('| phrase |');
        lines.push('| --- |');
        item.blockers.forEach((hit) => lines.push('| ' + md(hit.phrase) + ' |'));
        lines.push('');
    });

    lines.push('', '## Warnings', '');
    results.forEach((item) => {
        if (!item.warnings.length) return;
        lines.push('### ' + item.path, '');
        lines.push('| phrase |');
        lines.push('| --- |');
        item.warnings.slice(0, 30).forEach((hit) => lines.push('| ' + md(hit.phrase) + ' |'));
        lines.push('');
    });

    lines.push('', '## 页面可见文本样本', '');
    results.forEach((item) => {
        lines.push('### ' + item.path, '');
        lines.push('- Title：' + md(item.title));
        lines.push('- Description：' + md(item.description || ''));
        lines.push('- Headings：' + md(item.headings.join(' / ')));
        lines.push('- Sample：' + md(item.sample));
        lines.push('');
    });

    lines.push('', '## 白名单规则', '');
    lines.push('允许保留品牌、型号、单位、标准、认证编号、EV/PV/EPC/O&M/OEM 等技术缩写。证书官方名称可以暂时保留英文，但页面标题、按钮、筛选器、FAQ、表单和说明段落不应回退英文。');
    lines.push('');
    return lines.join('\n');
}

async function main() {
    const args = parseArgs(process.argv);
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    if (args.json) fs.mkdirSync(path.dirname(args.json), { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const results = [];
    try {
        for (const item of pages) {
            results.push(await inspectPage(page, args.base, item));
        }
    } finally {
        await browser.close();
    }

    fs.writeFileSync(args.output, renderReport(results, args), 'utf8');
    if (args.json) {
        fs.writeFileSync(args.json, JSON.stringify({
            generatedAt: new Date().toISOString(),
            base: args.base,
            results,
        }, null, 2), 'utf8');
    }

    const blockerCount = results.reduce((sum, item) => sum + item.blockers.length, 0);
    const warningCount = results.reduce((sum, item) => sum + item.warnings.length, 0);
    console.log('French copy audit report: ' + args.output);
    console.log('Pages: ' + results.length + ', blockers: ' + blockerCount + ', warnings: ' + warningCount);
    if (args.failOnBlockers && blockerCount) process.exit(1);
}

main().catch((err) => {
    console.error('French copy audit failed: ' + err.message);
    process.exit(1);
});
