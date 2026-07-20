require('./lib/archived-legacy-writer-guard').assertArchivedLegacyWriterAllowed(__filename);

const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const db = new Database(path.join(ROOT, 'data', 'longxiang.db'));
const now = Date.now();

const defaults = {
    products: {
        title: 'Products',
        titleAr: 'المنتجات',
        text: '',
        textAr: 'حلول معدات كهربائية متكاملة لشبكات التوزيع والطاقة.',
        allProductsLabel: 'All Products',
        allProductsLabelAr: 'كل المنتجات',
        allProductsHref: 'products.html',
        categories: [
            { group: 'transformer', label: 'Transformer', labelAr: 'المحولات', href: 'products.html?group=transformer', icon: '首页矢量图/变压器.png' },
            { group: 'new-energy-equipment', label: 'New Energy Equipment', labelAr: 'معدات الطاقة الجديدة', href: 'products.html?group=new-energy-equipment', icon: '首页矢量图/充电桩.png' },
            { group: 'switchgear', label: 'Switchgear', labelAr: 'معدات المفاتيح', href: 'products.html?group=switchgear', icon: '首页矢量图/成套电气.png' }
        ]
    },
    trust: {
        title: 'Manufacturing Capability for Project Buyers',
        titleAr: 'شركاء موثوقون في قطاع الطاقة',
        text: 'Longxiang supports power distribution projects with factory production, engineering selection, quality control, and after-sales consultation.',
        textAr: 'معداتنا تدعم البنية التحتية الحيوية ومشروعات الطاقة الصناعية.',
        chips: [
            { title: 'State Grid', titleAr: 'State Grid', text: 'Corporation of China', textAr: 'Corporation of China' },
            { title: 'China Southern', titleAr: 'China Southern', text: 'Power Grid', textAr: 'Power Grid' },
            { title: 'Chongqing', titleAr: 'Chongqing', text: 'Power Bureau', textAr: 'Power Bureau' },
            { title: 'Henan Electric', titleAr: 'Henan Electric', text: 'Power Company', textAr: 'Power Company' }
        ],
        cards: [
            {
                title: 'Transformer Manufacturing',
                titleAr: 'عميل مرافق الطاقة',
                text: 'Transformer product lines for distribution networks, industrial parks, commercial buildings, and renewable energy power access.',
                textAr: 'تعد Longxiang Electric مورداً موثوقاً للمحولات في مشروعاتنا منذ سنوات، وقد ساعدتنا محولاتها ذات السبيكة غير المتبلورة على خفض الفاقد وتحسين الاعتمادية.',
                meta: 'Oil immersed, dry type, combined, and special transformers',
                metaAr: 'مشروعات توزيع الكهرباء'
            },
            {
                title: 'Switchgear Configuration',
                titleAr: 'شريك هندسي',
                text: 'Switchgear and distribution equipment can be matched with transformer capacity, grid connection, and project layout requirements.',
                textAr: 'جودة المعدات وخدمة ما بعد البيع ممتازتان. قدم الفريق الفني دعماً واضحاً من اختيار المنتج حتى تسليم المشروع.',
                meta: 'High-voltage, medium-voltage, and low-voltage applications',
                metaAr: 'مشروعات صناعية'
            },
            {
                title: 'EV Charging Projects',
                titleAr: 'مالك مشروع طاقة',
                text: 'EV charging and smart energy equipment support charging stations, solar-storage-charging projects, and public infrastructure sites.',
                textAr: 'اخترنا Longxiang بفضل خبرتها في تقنية السبائك غير المتبلورة، وكانت نتائج كفاءة الطاقة أعلى من توقعاتنا.',
                meta: 'Equipment selection and remote technical guidance',
                metaAr: 'تحديث شبكة التوزيع'
            }
        ]
    },
    features: [
        {
            icon: '&#9889;',
            title: 'Energy Innovation',
            titleAr: 'ابتكار في الطاقة',
            text: 'Focused on amorphous alloy transformer technology and low-carbon electrical equipment.',
            textAr: 'تركيز على تقنيات محولات السبائك غير المتبلورة والمعدات الكهربائية منخفضة الكربون.'
        },
        {
            icon: '&#9878;',
            title: 'Listed Enterprise',
            titleAr: 'شركة مدرجة',
            text: 'NEEQ listed company, stock code 836070, with long-term governance and manufacturing discipline.',
            textAr: 'شركة مدرجة في NEEQ برمز السهم 836070، مع حوكمة طويلة الأمد وانضباط تصنيعي.'
        },
        {
            icon: '&#10003;',
            title: 'Quality Assured',
            titleAr: 'جودة موثوقة',
            text: 'Trusted power equipment supplier with patent certifications and modern testing capability.',
            textAr: 'مورد موثوق لمعدات الطاقة مع شهادات براءات وقدرات اختبار حديثة.'
        },
        {
            icon: '&#9711;',
            title: 'Lifecycle Service',
            titleAr: 'خدمة دورة الحياة',
            text: 'Engineering support from model selection through production, delivery, and after-sales service.',
            textAr: 'دعم هندسي من اختيار النموذج حتى الإنتاج والتسليم وخدمة ما بعد البيع.'
        }
    ],
    cta: {
        title: 'Ready to Power Your Next Project?',
        titleAr: 'هل تحتاج إلى حل مخصص؟',
        text: 'Send your country, product type, quantity or project scale, and required voltage or capacity.',
        textAr: 'تواصل مع فريقنا لمناقشة احتياجات مشروعك.',
        button: { label: 'Send Project Requirements', labelAr: 'اطلب عرض سعر', href: 'contact.html', className: 'btn btn-gold btn-lg' }
    },
    seo: {
        title: 'Transformer, Switchgear & EV Charger Manufacturer | Henan Longxiang Electric',
        titleAr: 'Henan Longxiang Electric Co., Ltd. | معدات نقل وتوزيع الطاقة',
        description: 'Henan Longxiang Electric manufactures transformers, switchgear, and EV charging equipment for power distribution projects in industrial, solar, charging, and utility applications.',
        descriptionAr: 'تصنع Henan Longxiang Electric المحولات ومعدات المفاتيح وحلول الطاقة منخفضة الكربون لمشروعات توزيع الطاقة.',
        image: '5、厂区厂貌/龙翔公司正门.jpg'
    }
};

function parseBody(value) {
    try {
        return JSON.parse(value || '{}');
    } catch (err) {
        return {};
    }
}

function mergeMissing(target, source) {
    Object.keys(source).forEach(function (key) {
        const value = source[key];
        const current = target[key];
        if (Array.isArray(value)) {
            if (!Array.isArray(current) || current.length === 0) target[key] = value;
            return;
        }
        if (value && typeof value === 'object') {
            if (!current || typeof current !== 'object' || Array.isArray(current)) target[key] = {};
            mergeMissing(target[key], value);
            return;
        }
        if (current == null || current === '') target[key] = value;
    });
}

const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get('home');

if (!row) {
    db.prepare(`
        INSERT INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            ('home', 'Home Page', 'الرئيسية', @body_json, 'published', 0, 1, @now, @now)
    `).run({ body_json: JSON.stringify(defaults), now });
    console.log('inserted content block: home');
} else {
    const body = parseBody(row.body_json);
    const before = JSON.stringify(body);
    mergeMissing(body, defaults);
    const after = JSON.stringify(body);

    if (before === after) {
        console.log('skip home content block: no missing page fields');
    } else {
        db.prepare(`
            UPDATE content_blocks
            SET body_json = @body_json,
                status = 'published',
                version = @version,
                updated_at = @now
            WHERE id = @id
        `).run({
            id: row.id,
            body_json: after,
            version: (row.version || 1) + 1,
            now
        });
        console.log('updated home content block: added missing page fields');
    }
}
