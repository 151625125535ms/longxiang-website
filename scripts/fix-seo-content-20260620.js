const { getDb } = require('../server/lib/db');

const dryRun = process.argv.indexOf('--dry-run') !== -1;
const db = getDb();
const now = Date.now();
const changes = [];

const ar = {
    brand: '\u0644\u0648\u0646\u063a\u0634\u064a\u0627\u0646\u063a \u0644\u0644\u0645\u0639\u062f\u0627\u062a \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064a\u0629',
    certifications: '\u0627\u0644\u0634\u0647\u0627\u062f\u0627\u062a',
    certificationsDesc: '\u0634\u0647\u0627\u062f\u0627\u062a \u0627\u0644\u062c\u0648\u062f\u0629 \u0648\u0627\u0644\u0627\u0639\u062a\u0645\u0627\u062f\u0627\u062a \u0627\u0644\u0641\u0646\u064a\u0629 \u0645\u0646 \u0644\u0648\u0646\u063a\u0634\u064a\u0627\u0646\u063a.',
    applications: '\u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a',
    applicationsSubtitle: '\u062d\u0644\u0648\u0644 \u0645\u0639\u062f\u0627\u062a \u0627\u0644\u0637\u0627\u0642\u0629 \u0644\u0642\u0637\u0627\u0639\u0627\u062a \u0645\u062a\u0639\u062f\u062f\u0629',
    industryInfrastructure: '\u0627\u0644\u0635\u0646\u0627\u0639\u0629 \u0648\u0627\u0644\u0628\u0646\u064a\u0629 \u0627\u0644\u062a\u062d\u062a\u064a\u0629',
    industrySummary: '\u062a\u062f\u0639\u0645 \u0645\u0639\u062f\u0627\u062a \u0644\u0648\u0646\u063a\u0634\u064a\u0627\u0646\u063a \u0645\u0634\u0627\u0631\u064a\u0639 \u0627\u0644\u0635\u0646\u0627\u0639\u0629 \u0648\u0627\u0644\u0634\u0628\u0643\u0627\u062a \u0648\u0627\u0644\u0637\u0627\u0642\u0629.',
    innovation: '\u0627\u0644\u0627\u0628\u062a\u0643\u0627\u0631 \u0627\u0644\u062a\u0642\u0646\u064a',
    innovationSubtitle: '\u0627\u0644\u062a\u062d\u0633\u064a\u0646 \u0627\u0644\u0641\u0646\u064a \u0644\u0645\u0639\u062f\u0627\u062a \u0627\u0644\u0637\u0627\u0642\u0629',
    innovationBody: '\u062a\u0637\u0648\u064a\u0631 \u0645\u0639\u062f\u0627\u062a \u0637\u0627\u0642\u0629 \u0645\u0648\u062b\u0648\u0642\u0629 \u0648\u0645\u0648\u0641\u0631\u0629 \u0644\u0644\u0637\u0627\u0642\u0629.',
    technicalAchievements: '\u0625\u0646\u062c\u0627\u0632\u0627\u062a \u062a\u0642\u0646\u064a\u0629',
    contactUs: '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627',
    contactText: '\u0634\u0627\u0631\u0643 \u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0645\u0634\u0631\u0648\u0639\u0643 \u0645\u0639 \u0641\u0631\u064a\u0642 \u0644\u0648\u0646\u063a\u0634\u064a\u0627\u0646\u063a.',
    notFound: '\u0627\u0644\u0635\u0641\u062d\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629',
    notFoundText: '\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u062a\u064a \u062a\u0628\u062d\u062b \u0639\u0646\u0647\u0627 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629 \u0623\u0648 \u062a\u0645 \u0646\u0642\u0644\u0647\u0627.',
    backHome: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    viewProducts: '\u0639\u0631\u0636 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
    about: '\u0645\u0646 \u0646\u062d\u0646',
    companyOverview: '\u0646\u0628\u0630\u0629 \u0639\u0646 \u0627\u0644\u0634\u0631\u0643\u0629',
    compare: '\u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
    contact: '\u0627\u062a\u0635\u0644 \u0628\u0646\u0627',
    education: '\u0627\u0644\u062a\u0639\u0627\u0648\u0646 \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a',
    globalShell: '\u0627\u0644\u0625\u0637\u0627\u0631 \u0627\u0644\u0639\u0627\u0645 \u0644\u0644\u0645\u0648\u0642\u0639',
    home: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    pageBlocks: '\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0635\u0641\u062d\u0627\u062a',
    products: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
    solutions: '\u0627\u0644\u062d\u0644\u0648\u0644'
};

const titleArBySlug = {
    'about-us': ar.about,
    applications: ar.applications,
    certifications: ar.certifications,
    'company-overview': ar.companyOverview,
    compare: ar.compare,
    contact: ar.contact,
    education: ar.education,
    'global-shell': ar.globalShell,
    home: ar.home,
    innovation: ar.innovation,
    'not-found': ar.notFound,
    'page-blocks': ar.pageBlocks,
    'product-pages': ar.products,
    solutions: ar.solutions
};

const productSeo = {
    'amorphous-sbh15-m': ['S(B)H15-M Amorphous Oil Transformer | Longxiang', 'S(B)H15-M oil-immersed amorphous alloy distribution transformer for efficient power distribution with low loss and reliable operation.'],
    'amorphous-sbh21-m': ['S(B)H21-M Amorphous Oil Transformer | Longxiang', 'S(B)H21-M oil-immersed amorphous alloy distribution transformer for energy-saving distribution projects and stable grid operation.'],
    'amorphous-sbh25-m': ['S(B)H25-M Amorphous Oil Transformer | Longxiang', 'S(B)H25-M oil-immersed amorphous alloy distribution transformer with low-loss performance for industrial and utility applications.'],
    'grid-connected-pv-box': ['Grid-Connected PV Box | 10-60 kW Solar Distribution', 'Grid-connected PV box for 10-60 kW solar systems with metering, distribution, isolation, overload, short-circuit and surge protection.'],
    'pv-combiner-box': ['PV Combiner Box | Outdoor AC Combiner for Solar', 'PV AC combiner box for 100-250 kW string photovoltaic systems with breakers, surge protection, IP65 enclosure and wall-mounted installation.'],
    'grid-connected-pv-cabinet': ['Grid-Connected PV Cabinet | 100-800 kW Solar Cabinet', 'Grid-connected PV cabinet for 100-800 kW centralized solar systems, with AC690V, metering, RS485 Modbus, protection and IP30/IP65 options.']
};

function parseBody(value) {
    try { return JSON.parse(value || '{}'); } catch (err) { return {}; }
}

function empty(value) {
    return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

function setMissing(obj, key, value) {
    if (!obj || value == null || value === '') return;
    if (empty(obj[key])) obj[key] = value;
}

function setSeo(body, titleAr, descriptionAr) {
    if (!body.seo || typeof body.seo !== 'object') body.seo = {};
    if (titleAr) body.seo.titleAr = titleAr;
    if (descriptionAr) body.seo.descriptionAr = descriptionAr;
}

function localizedTitle(body, fallback) {
    return (body.hero && (body.hero.titleAr || body.hero.title_ar)) ||
        (body.productsHero && (body.productsHero.titleAr || body.productsHero.title_ar)) || fallback;
}

function localizedDescription(body, fallback) {
    return (body.hero && (body.hero.subtitleAr || body.hero.subtitle_ar)) ||
        (body.productsHero && (body.productsHero.subtitleAr || body.productsHero.subtitle_ar)) || fallback;
}

function updateContentBlock(slug, updater) {
    const row = db.prepare('SELECT id, title_ar, body_json, version FROM content_blocks WHERE slug = ?').get(slug);
    if (!row) {
        changes.push({ type: 'content_block_missing', slug });
        return;
    }
    const body = parseBody(row.body_json);
    const beforeBody = JSON.stringify(body);
    const nextTitleAr = titleArBySlug[slug] || row.title_ar || '';
    updater(body);
    const afterBody = JSON.stringify(body);
    const bodyChanged = beforeBody !== afterBody;
    const titleChanged = nextTitleAr && row.title_ar !== nextTitleAr;
    if (!bodyChanged && !titleChanged) return;
    changes.push({ type: 'content_block', slug, bodyChanged, titleChanged });
    if (!dryRun) {
        db.prepare('UPDATE content_blocks SET title_ar = @title_ar, body_json = @body_json, version = @version, updated_at = @updated_at WHERE id = @id').run({
            id: row.id,
            title_ar: titleChanged ? nextTitleAr : row.title_ar,
            body_json: afterBody,
            version: (row.version || 1) + 1,
            updated_at: now
        });
    }
}

function updateContentBlocks() {
    Object.keys(titleArBySlug).forEach(function (slug) {
        updateContentBlock(slug, function (body) {
            const title = localizedTitle(body, titleArBySlug[slug]);
            const desc = localizedDescription(body, '');
            if (slug === 'product-pages') setSeo(body, title + ' | ' + ar.brand, desc);
            else if (slug === 'solutions') setSeo(body, title + ' | ' + ar.brand, desc);
            else if (slug === 'certifications') {
                if (!body.hero) body.hero = {};
                setMissing(body.hero, 'titleAr', ar.certifications);
                setMissing(body.hero, 'subtitleAr', ar.certificationsDesc);
                setSeo(body, ar.certifications + ' | ' + ar.brand, ar.certificationsDesc);
            } else if (slug === 'compare') setSeo(body, title + ' | ' + ar.brand, desc);
            else if (slug === 'home') setSeo(body, localizedTitle(body, ar.home) + ' | ' + ar.brand, desc);
            else if (slug === 'not-found') {
                if (!body.panel) body.panel = {};
                setMissing(body.panel, 'titleAr', ar.notFound);
                setMissing(body.panel, 'textAr', ar.notFoundText);
                if (!Array.isArray(body.panel.actions)) {
                    body.panel.actions = [
                        { label: 'Back Home', labelAr: ar.backHome, href: 'index.html' },
                        { label: 'View Products', labelAr: ar.viewProducts, href: 'products.html' }
                    ];
                }
                setSeo(body, ar.notFound + ' | ' + ar.brand, ar.notFoundText);
            } else if (slug === 'about-us') {
                if (body.hero) {
                    setMissing(body.hero, 'title_ar', body.hero.titleAr || ar.about);
                    setMissing(body.hero, 'subtitle_ar', body.hero.subtitleAr || '');
                }
                if (body.sections && body.sections[0]) {
                    setMissing(body.sections[0], 'title_ar', body.snapshot && body.snapshot.titleAr);
                    setMissing(body.sections[0], 'body_ar', body.snapshot && body.snapshot.textAr);
                }
                setSeo(body, localizedTitle(body, ar.about) + ' | ' + ar.brand, localizedDescription(body, ''));
            } else if (slug === 'applications') {
                if (body.hero) {
                    setMissing(body.hero, 'title_ar', ar.applications);
                    setMissing(body.hero, 'subtitle_ar', ar.applicationsSubtitle);
                }
                if (body.industries && body.industries[0]) {
                    setMissing(body.industries[0], 'name_ar', ar.industryInfrastructure);
                    setMissing(body.industries[0], 'summary_ar', ar.industrySummary);
                }
                setSeo(body, ar.applications + ' | ' + ar.brand, ar.applicationsSubtitle);
            } else if (slug === 'innovation') {
                if (body.hero) {
                    setMissing(body.hero, 'title_ar', ar.innovation);
                    setMissing(body.hero, 'subtitle_ar', ar.innovationSubtitle);
                }
                if (body.sections && body.sections[0]) {
                    setMissing(body.sections[0], 'title_ar', ar.innovationSubtitle);
                    setMissing(body.sections[0], 'body_ar', ar.innovationBody);
                }
                if (body.highlights && body.highlights[0]) setMissing(body.highlights[0], 'label_ar', ar.technicalAchievements);
                setSeo(body, ar.innovation + ' | ' + ar.brand, ar.innovationSubtitle);
            } else if (slug === 'page-blocks') {
                if (body.blocks && body.blocks[0]) {
                    setMissing(body.blocks[0], 'title_ar', ar.contactUs);
                    setMissing(body.blocks[0], 'text_ar', ar.contactText);
                }
            }
        });
    });
}

function updateProducts() {
    const stmt = db.prepare('UPDATE products SET seo_title = @title, seo_description = @description, version = version + 1, updated_at = @updated_at WHERE slug = @slug AND status != \'deleted\' AND (COALESCE(seo_title, \'\') != @title OR COALESCE(seo_description, \'\') != @description)');
    Object.keys(productSeo).forEach(function (slug) {
        const product = db.prepare('SELECT id, seo_title, seo_description FROM products WHERE slug = ? AND status != \'deleted\'').get(slug);
        if (!product) {
            changes.push({ type: 'product_missing', slug });
            return;
        }
        const next = productSeo[slug];
        if (product.seo_title === next[0] && product.seo_description === next[1]) return;
        changes.push({ type: 'product_seo', slug, id: product.id, title: next[0] });
        if (!dryRun) stmt.run({ slug, title: next[0], description: next[1], updated_at: now });
    });
}

const run = db.transaction(function () {
    updateContentBlocks();
    updateProducts();
});

run();
console.log(JSON.stringify({ dryRun, changed: changes.length, changes }, null, 2));
