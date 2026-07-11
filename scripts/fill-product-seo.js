const { getDb } = require('../server/lib/db');

const BRAND = 'Longxiang Electric';
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 158;

function cleanText(value) {
    return String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function truncateAtWord(value, maxLength) {
    const text = cleanText(value);
    if (text.length <= maxLength) return text;
    const sliced = text.slice(0, Math.max(0, maxLength)).trim();
    const lastSpace = sliced.lastIndexOf(' ');
    if (lastSpace > 40) return sliced.slice(0, lastSpace).trim();
    return sliced;
}

function sentenceCaseCategory(value) {
    return cleanText(value)
        .replace(/\s*&\s*/g, ' and ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildSeoTitle(product) {
    const name = cleanText(product.name_en || product.legacy_id || product.slug || 'Product');
    const candidates = [
        name + ' Manufacturer | Longxiang',
        name + ' | ' + BRAND,
        name + ' Supplier | Longxiang',
        name + ' | Longxiang'
    ];

    for (const candidate of candidates) {
        if (candidate.length <= MAX_TITLE_LENGTH) return candidate;
    }

    const suffix = ' | Longxiang';
    return truncateAtWord(name, MAX_TITLE_LENGTH - suffix.length) + suffix;
}

function buildSeoDescription(product) {
    const name = cleanText(product.name_en || product.legacy_id || product.slug || 'product');
    const category = sentenceCaseCategory(product.category_name_en || product.parent_name_en || 'power equipment');
    const shortDesc = cleanText(product.short_desc_en);

    if (shortDesc.length >= 70) {
        return truncateAtWord(
            BRAND + ' ' + name + ': ' + shortDesc + ' Contact us for project configuration and quotation support.',
            MAX_DESCRIPTION_LENGTH
        );
    }

    return truncateAtWord(
        BRAND + ' supplies ' + name + ' for ' + category.toLowerCase()
            + ' projects, with technical parameters, configuration support, and inquiry-ready service.',
        MAX_DESCRIPTION_LENGTH
    );
}

function buildSeoKeywords(product) {
    const parts = [
        cleanText(product.name_en),
        cleanText(product.category_name_en),
        cleanText(product.parent_name_en),
        cleanText(product.slug).replace(/-/g, ' '),
        cleanText(product.legacy_id).replace(/-/g, ' ')
    ].filter(Boolean);

    const unique = [];
    parts.forEach(function (part) {
        const lower = part.toLowerCase();
        if (!unique.some(function (item) { return item.toLowerCase() === lower; })) {
            unique.push(part);
        }
    });

    return unique.slice(0, 5).join(', ');
}

function readPublishedProducts(db) {
    return db.prepare(`
        SELECT
            p.id,
            p.legacy_id,
            p.slug,
            p.name_en,
            p.short_desc_en,
            p.seo_title,
            p.seo_description,
            p.seo_keywords,
            c.name_en AS category_name_en,
            parent.name_en AS parent_name_en
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE p.status = 'published'
        ORDER BY p.sort_order, p.id
    `).all();
}

function fillProductSeo(options) {
    const db = getDb();
    const dryRun = !!(options && options.dryRun);
    const force = !!(options && options.force);
    const rows = readPublishedProducts(db);
    const updates = [];

    rows.forEach(function (product) {
        const next = {
            seo_title: force || !cleanText(product.seo_title) ? buildSeoTitle(product) : cleanText(product.seo_title),
            seo_description: force || !cleanText(product.seo_description) ? buildSeoDescription(product) : cleanText(product.seo_description),
            seo_keywords: force || !cleanText(product.seo_keywords) ? buildSeoKeywords(product) : cleanText(product.seo_keywords)
        };

        if (
            next.seo_title !== cleanText(product.seo_title)
            || next.seo_description !== cleanText(product.seo_description)
            || next.seo_keywords !== cleanText(product.seo_keywords)
        ) {
            updates.push({
                id: product.id,
                legacy_id: product.legacy_id,
                name_en: product.name_en,
                next
            });
        }
    });

    if (!dryRun && updates.length) {
        const now = Date.now();
        const update = db.prepare(`
            UPDATE products
            SET
                seo_title = @seo_title,
                seo_description = @seo_description,
                seo_keywords = @seo_keywords,
                version = version + 1,
                updated_at = @updated_at
            WHERE id = @id
        `);
        const run = db.transaction(function () {
            updates.forEach(function (item) {
                update.run({
                    id: item.id,
                    seo_title: item.next.seo_title,
                    seo_description: item.next.seo_description,
                    seo_keywords: item.next.seo_keywords,
                    updated_at: now
                });
            });
        });
        run();
    }

    return {
        dryRun,
        force,
        published: rows.length,
        updated: updates.length,
        updates
    };
}

function main() {
    const args = new Set(process.argv.slice(2));
    const result = fillProductSeo({
        dryRun: args.has('--dry-run'),
        force: args.has('--force')
    });

    console.log('Published products:', result.published);
    console.log(result.dryRun ? 'Products that would be updated:' : 'Products updated:', result.updated);
    result.updates.slice(0, 12).forEach(function (item) {
        console.log('- ' + (item.legacy_id || item.id) + ': ' + item.next.seo_title);
    });
    if (result.updates.length > 12) {
        console.log('...and ' + (result.updates.length - 12) + ' more');
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    fillProductSeo,
    buildSeoTitle,
    buildSeoDescription,
    buildSeoKeywords
};
