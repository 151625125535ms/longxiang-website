const CONTENT_BLOCK_SEEDS = [
    {
        slug: 'home',
        title_en: 'Home',
        sort_order: 10,
        body_json: {
            hero: {
                title: 'Henan Longxiang Electrical',
                subtitle: 'Energy-saving power equipment for industrial, utility, and renewable energy projects.',
                backgroundImage: 'longxiang-factory-gate.jpg',
                logo: 'longxiang-logo-symbol.png',
                logoAlt: 'Longxiang Electrical logo',
                actions: [
                    { label: 'View Products', href: 'products.html', className: 'hero-hex-btn primary' },
                    { label: 'Contact Us', href: 'contact.html', className: 'hero-hex-btn' }
                ]
            },
            proof: [
                { value: '40+', label: 'years of electrical equipment experience' },
                { value: '30+', label: 'patents and technical achievements' },
                { value: '100+', label: 'project applications' }
            ],
            products: {
                title: 'Products',
                text: 'Explore transformers, switchgear, and integrated power distribution solutions.',
                allProductsLabel: 'All Products',
                allProductsHref: 'products.html'
            },
            trust: {
                title: 'Trusted Manufacturing Capability',
                text: 'Longxiang combines manufacturing, quality control, and project delivery experience.',
                chips: [],
                cards: []
            },
            features: [
                { title: 'Energy Efficiency', text: 'Focused on low-loss, reliable power equipment.' },
                { title: 'Project Support', text: 'Suitable for industrial, grid, and renewable energy scenarios.' },
                { title: 'Quality Control', text: 'Standardized production and inspection processes.' }
            ],
            stats: [
                { value: '40+', count: 40, label: 'Years Experience' },
                { value: '30+', count: 30, label: 'Patents' },
                { value: '100+', count: 100, label: 'Projects' }
            ],
            cta: {
                title: 'Need a power distribution solution?',
                text: 'Tell us your voltage, capacity, and project scenario. Our team will help match the right equipment.',
                button: { label: 'Send Inquiry', href: 'contact.html' }
            },
            seo: {
                title: 'Henan Longxiang Electrical | Power Equipment Manufacturer',
                description: 'Longxiang Electrical manufactures energy-saving transformers, switchgear, and power distribution equipment.'
            }
        }
    },
    {
        slug: 'solutions',
        title_en: 'Solutions',
        sort_order: 20,
        body_json: {
            hero: {
                title: 'Solutions',
                subtitle: 'Power equipment solutions for industry, infrastructure, and new energy.'
            },
            anchors: [],
            overview: { title: 'Application-Oriented Solutions', text: 'Select equipment and service support by project scenario.', cards: [] },
            marketFit: { title: 'Project Fit', text: 'Designed for stable operation and practical deployment.', items: [] },
            sections: [],
            scenarios: { title: 'Scenarios', items: [] },
            credentials: { title: 'Credentials', text: '' },
            cta: { title: 'Discuss Your Project', text: 'Share your project requirements with us.', button: { label: 'Contact Us', href: 'contact.html' } },
            seo: { title: 'Solutions | Longxiang Electrical', description: 'Power equipment solutions from Longxiang Electrical.' }
        }
    },
    {
        slug: 'product-pages',
        title_en: 'Product Pages',
        sort_order: 60,
        body_json: {
            productsHero: {
                title: 'Products',
                subtitle: 'Browse Longxiang transformers, switchgear, and power distribution equipment.'
            },
            detailHero: {
                title: 'Product Details',
                subtitle: 'Review product information and request a quotation.'
            },
            detailLabels: {
                overview: 'Overview',
                specifications: 'Specifications',
                inquiry: 'Request a Quote',
                relatedProducts: 'Related Products'
            },
            notFound: {
                title: 'Product not found',
                text: 'Please return to the product list and choose another item.',
                button: { label: 'Back to Products', href: 'products.html' }
            },
            listingSupport: {
                title: 'Product Support',
                text: 'Filter by product category and contact us for model selection support.'
            },
            listingCta: {
                title: 'Need model selection help?',
                text: 'Send us your project parameters and application scenario.',
                button: { label: 'Contact Us', href: 'contact.html' }
            },
            detailSupport: {
                title: 'Technical Support',
                text: 'Our team can help confirm parameters, voltage levels, and delivery requirements.'
            },
            detailFaq: [],
            inquiryForm: {
                title: 'Product Inquiry',
                note: 'Leave your contact details and requirements.',
                submitLabel: 'Submit Inquiry'
            },
            seo: { title: 'Products | Longxiang Electrical', description: 'Product list of Longxiang Electrical.' },
            detailSeo: { title: 'Product Detail | Longxiang Electrical', description: 'Longxiang Electrical product details.' }
        }
    },
    {
        slug: 'global-shell',
        title_en: 'Global Shell',
        sort_order: 70,
        body_json: {
            navigation: {
                quickTitle: 'Quick Links',
                productsTitle: 'Products',
                cookieSettingsLabel: 'Cookie Settings',
                mainLinks: [
                    { label: 'Home', href: 'index.html', activePages: ['index.html'] },
                    { label: 'Products', href: 'products.html', activePages: ['products.html', 'product-detail.html'] },
                    { label: 'Applications', href: 'solutions.html', activePages: ['solutions.html'] },
                    { label: 'About Us', href: 'about.html', activePages: ['about.html'] },
                    { label: 'Contact', href: 'contact.html', activePages: ['contact.html'] }
                ],
                quickLinks: [
                    { label: 'About Us', href: 'about.html' },
                    { label: 'Contact Us', href: 'contact.html' },
                    { label: 'Certificates', href: 'certifications.html' }
                ],
                productLinks: [
                    { label: 'All Products', href: 'products.html' }
                ]
            },
            footer: {
                text: 'Henan Longxiang Electrical manufactures power equipment for industrial and energy projects.',
                copyright: '© Henan Longxiang Electrical Co., Ltd. All rights reserved.',
                icp: ''
            },
            inquiry: {
                title: 'Get a Quote',
                text: 'Send us your requirements and our team will respond quickly.',
                floatingLabel: 'Inquiry',
                hiddenName: 'Website visitor',
                productContext: 'General inquiry',
                messagePlaceholder: 'Tell us your voltage, capacity, quantity, and project location.',
                emailPlaceholder: 'Email',
                phonePlaceholder: 'Phone / WhatsApp',
                submitLabel: 'Submit',
                modalTitle: 'Request a Quote',
                modalText: 'Fill in your contact details and project requirements.',
                modalSubmitLabel: 'Submit Inquiry',
                generalInquiryLabel: 'General inquiry',
                productMessageTemplate: 'I would like to request a quotation for {product}.',
                productIdMessageTemplate: 'I would like to request a quotation for product ID {product}.',
                modalFields: [
                    { name: 'name', label: 'Name', type: 'text', required: true, row: 1 },
                    { name: 'email', label: 'Email', type: 'email', required: true, row: 1 },
                    { name: 'phone', label: 'Phone', type: 'text', row: 2 },
                    { name: 'company', label: 'Company', type: 'text', row: 2 },
                    { name: 'message', label: 'Message', type: 'textarea', required: true, rows: 5 }
                ]
            },
            cookieConsent: {},
            embedConsent: {},
            seoDefaults: {
                title: 'Henan Longxiang Electrical',
                description: 'Power equipment manufacturer.'
            }
        }
    },
    {
        slug: 'certifications',
        title_en: 'Certifications',
        sort_order: 80,
        body_json: {
            hero: { title: 'Certificates', subtitle: 'Quality, qualification, and technical certificates.' },
            intro: { title: 'Quality Credentials', text: 'Review Longxiang qualification materials.' },
            stats: [],
            toolbar: { searchPlaceholder: 'Search certificates', allLabel: 'All' },
            seo: { title: 'Certificates | Longxiang Electrical', description: 'Certificates and qualification materials.' }
        }
    },
    {
        slug: 'compare',
        title_en: 'Compare',
        sort_order: 90,
        body_json: {
            hero: { title: 'Product Comparison', subtitle: 'Compare selected products.' },
            toolbar: { backLabel: 'Back', printLabel: 'Print' },
            emptyState: { title: 'No products selected', text: 'Return to the product list and choose products to compare.' },
            table: { productLabel: 'Product', categoryLabel: 'Category' },
            seo: { title: 'Product Comparison | Longxiang Electrical', description: 'Compare Longxiang Electrical products.' }
        }
    },
    {
        slug: 'not-found',
        title_en: 'Not Found',
        sort_order: 100,
        body_json: {
            panel: {
                title: 'Page Not Found',
                text: 'The page you are looking for does not exist or has been moved.',
                buttons: [
                    { label: 'Back Home', href: 'index.html' },
                    { label: 'View Products', href: 'products.html' }
                ]
            },
            seo: { title: 'Page Not Found | Longxiang Electrical', description: 'The page was not found.' }
        }
    }
];

function ensureContentBlockSeeds(db) {
    if (!db) return { inserted: 0, checked: 0 };
    const now = Date.now();
    const insert = db.prepare(`
        INSERT OR IGNORE INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            (@slug, @title_en, @title_ar, @body_json, 'published', @sort_order, 1, @created_at, @updated_at)
    `);

    let inserted = 0;
    const run = db.transaction(function () {
        CONTENT_BLOCK_SEEDS.forEach(function (seed) {
            const result = insert.run({
                slug: seed.slug,
                title_en: seed.title_en,
                title_ar: seed.title_ar || '',
                body_json: JSON.stringify(seed.body_json || {}),
                sort_order: seed.sort_order || 0,
                created_at: now,
                updated_at: now
            });
            inserted += result.changes;
        });
    });

    run();
    return { inserted, checked: CONTENT_BLOCK_SEEDS.length };
}

module.exports = {
    CONTENT_BLOCK_SEEDS,
    ensureContentBlockSeeds
};
