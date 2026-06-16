const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const db = new Database(path.join(ROOT, 'data', 'longxiang.db'));
const now = Date.now();

const defaults = {
    productsHero: {
        title: 'Products',
        titleAr: 'المنتجات',
        subtitle: 'Transformer, switchgear, and EV charging equipment for power distribution projects.',
        subtitleAr: 'تصفح معدات المحولات والشحن والمفاتيح الكهربائية.',
        backgroundImage: 'assets/hero/product.webp',
        breadcrumb: [
            { href: 'index.html', label: 'Home', labelAr: 'الرئيسية' },
            { label: 'Products', labelAr: 'المنتجات', current: true }
        ]
    },
    detailHero: {
        title: 'Product Details',
        titleAr: 'تفاصيل المنتج',
        subtitle: 'Detailed specifications and pricing information',
        subtitleAr: 'المواصفات ومعلومات الاستفسار',
        backgroundImage: 'assets/hero/product.webp',
        breadcrumb: [
            { href: 'index.html', label: 'Home', labelAr: 'الرئيسية' },
            { href: 'products.html', label: 'Products', labelAr: 'المنتجات' },
            { label: 'Product Details', labelAr: 'تفاصيل المنتج', current: true }
        ]
    },
    detailLabels: {
        loadingTitle: 'Loading product...',
        loadingTitleAr: 'جار تحميل المنتج...',
        loadingText: 'Please wait while we load the product details.',
        loadingTextAr: 'يرجى الانتظار قليلاً.',
        specsTitle: 'Product Parameter',
        specsTitleAr: 'معلمات المنتج',
        faqTitle: 'Product FAQ',
        faqTitleAr: 'أسئلة المنتج',
        supportLoading: 'Loading project support...',
        supportLoadingAr: 'جار تحميل دعم المشروع...',
        faqLoading: 'Loading product FAQ...',
        faqLoadingAr: 'جار تحميل أسئلة المنتج...',
        inquiryLoading: 'Loading inquiry form...',
        inquiryLoadingAr: 'جار تحميل نموذج الاستفسار...',
        defaultSubtitle: 'Product Details',
        defaultSubtitleAr: 'تفاصيل المنتج',
        titleSuffix: 'Henan Longxiang Electrical Co., Ltd.',
        titleSuffixAr: 'Henan Longxiang Electrical Co., Ltd.',
        schemaBrand: 'Henan Longxiang Electrical Co., Ltd.',
        schemaBrandAr: 'Henan Longxiang Electrical Co., Ltd.'
    },
    notFound: {
        seoTitle: 'Product Not Found | Henan Longxiang Electrical Co., Ltd.',
        seoTitleAr: 'المنتج غير موجود | Henan Longxiang Electrical Co., Ltd.',
        breadcrumbLabel: 'Not Found',
        breadcrumbLabelAr: 'غير موجود',
        title: 'Product Not Found',
        titleAr: 'المنتج غير موجود',
        subtitle: 'Please return to the product catalog',
        subtitleAr: 'يرجى العودة إلى قائمة المنتجات',
        heading: 'Product Not Found',
        headingAr: 'لم يتم العثور على المنتج',
        text: 'The requested product could not be found.',
        textAr: 'تعذر العثور على المنتج المطلوب.',
        backLabel: 'Back to product catalog',
        backLabelAr: 'العودة إلى قائمة المنتجات',
        backHref: 'products.html'
    },
    detailSeo: {
        title: 'Product Details | Henan Longxiang Electrical Co., Ltd.',
        titleAr: 'تفاصيل المنتج | Henan Longxiang Electrical Co., Ltd.',
        description: 'Product details, technical parameters, customization notes, and quotation request form for Longxiang transformers, switchgear, and EV charging equipment.',
        descriptionAr: 'تفاصيل المنتج والمعلمات الفنية وملاحظات التخصيص ونموذج طلب عرض السعر لمعدات Longxiang.',
        image: 'assets/hero/product.webp'
    },
    listingSupport: {
        title: 'Built for Project Selection',
        titleAr: 'مصممة لاختيار المعدات للمشروعات',
        text: 'Longxiang supports transformer, switchgear, and EV charger selection for industrial parks, solar and storage projects, charging stations, commercial buildings, and distribution networks in warm-climate and high-utilization environments.',
        textAr: 'تدعم Longxiang اختيار المحولات ومعدات المفاتيح وشواحن المركبات الكهربائية للمجمعات الصناعية ومشروعات الطاقة الشمسية والتخزين ومحطات الشحن والمباني التجارية وشبكات التوزيع.',
        items: [
            { title: 'Application Matching', titleAr: 'مطابقة التطبيق', text: 'Tell us the country, site type, grid voltage, load demand, and installation conditions.', textAr: 'أخبرنا بالدولة ونوع الموقع وجهد الشبكة وطلب الحمل وظروف التركيب.' },
            { title: 'Custom Specifications', titleAr: 'مواصفات مخصصة', text: 'Capacity, voltage level, cabinet configuration, and project requirements can be reviewed by engineers.', textAr: 'يمكن للمهندسين مراجعة السعة ومستوى الجهد وتكوين الخزائن ومتطلبات المشروع.' },
            { title: 'Catalogs Upon Request', titleAr: 'كتالوجات عند الطلب', text: 'Current product manuals are handled by sales consultation while English and Arabic catalog versions are prepared.', textAr: 'تتوفر كتيبات المنتجات عبر الاستشارة مع المبيعات أثناء تجهيز النسخ الإنجليزية والعربية.' },
            { title: 'Quotation Inputs', titleAr: 'بيانات عرض السعر', text: 'Product type, quantity or project scale, voltage or capacity, and target application help us respond accurately.', textAr: 'يساعد نوع المنتج والكمية أو حجم المشروع والجهد أو السعة والتطبيق المستهدف على الرد بدقة.' }
        ]
    },
    listingCta: {
        title: 'Need a Custom Solution?',
        titleAr: 'هل تحتاج إلى حل مخصص؟',
        text: 'Our engineering team can support equipment selection and project-specific requirements.',
        textAr: 'يمكن لفريقنا الهندسي دعم اختيار المعدات ومتطلبات المشروع الخاصة.',
        button: { label: 'Contact Our Engineers', labelAr: 'تواصل مع المهندسين', href: 'contact.html' }
    },
    detailSupport: {
        title: 'Project & Export Support',
        titleAr: 'دعم المشروعات والتصدير',
        items: [
            { title: 'Custom Specifications', titleAr: 'مواصفات مخصصة', text: 'Voltage, capacity, cabinet layout, and project configuration can be discussed with Longxiang engineers.', textAr: 'يمكن مناقشة الجهد والسعة وتخطيط الخزائن وتكوين المشروع مع مهندسي Longxiang.' },
            { title: 'Catalogs Upon Request', titleAr: 'كتالوجات عند الطلب', text: 'Product catalogs and technical documents are available through sales instead of public download at this stage.', textAr: 'تتوفر كتالوجات المنتجات والوثائق الفنية عبر المبيعات بدلاً من التحميل العام في هذه المرحلة.' },
            { title: 'Selection Guidance', titleAr: 'إرشاد الاختيار', text: 'Share load demand, installation environment, grid requirements, and application scenario for technical matching.', textAr: 'شارك طلب الحمل وبيئة التركيب ومتطلبات الشبكة وسيناريو التطبيق للمطابقة الفنية.' },
            { title: 'After-sales Support', titleAr: 'دعم ما بعد البيع', text: 'Email support, remote technical guidance, and spare parts consultation can be arranged for project needs.', textAr: 'يمكن ترتيب دعم البريد الإلكتروني والإرشاد الفني عن بعد واستشارة قطع الغيار حسب احتياجات المشروع.' }
        ]
    },
    detailFaq: [
        {
            question: 'Can Longxiang support custom voltage or capacity?',
            questionAr: 'هل يمكن لـ Longxiang دعم الجهد أو السعة المخصصة؟',
            answer: 'Yes. Custom specifications are available on request after engineers review the project requirements.',
            answerAr: 'نعم. تتوفر المواصفات المخصصة عند الطلب بعد مراجعة المهندسين لمتطلبات المشروع.'
        },
        {
            question: 'Can I request OEM or project-matched equipment?',
            questionAr: 'هل يمكنني طلب OEM أو معدات مطابقة للمشروع؟',
            answer: 'Project matching and OEM-style requirements can be discussed with the sales and engineering team.',
            answerAr: 'يمكن مناقشة مطابقة المشروع ومتطلبات OEM مع فريق المبيعات والهندسة.'
        },
        {
            question: 'Can these products be supplied for Middle East, Africa, or Southeast Asia projects?',
            questionAr: 'هل يمكن توريد هذه المنتجات لمشروعات الشرق الأوسط أو أفريقيا أو جنوب شرق آسيا؟',
            answer: 'Longxiang can discuss overseas project requirements and provide technical selection support. Final export documents and terms should be confirmed with sales.',
            answerAr: 'يمكن لـ Longxiang مناقشة متطلبات المشروعات الخارجية وتقديم دعم الاختيار الفني. يجب تأكيد مستندات وشروط التصدير النهائية مع المبيعات.'
        },
        {
            question: 'How do I get a quotation?',
            questionAr: 'كيف أحصل على عرض سعر؟',
            answer: 'Send the product type, country, quantity or project scale, and required voltage or capacity. Engineers will review the requirement before quotation.',
            answerAr: 'أرسل نوع المنتج والدولة والكمية أو حجم المشروع والجهد أو السعة المطلوبة. سيراجع المهندسون المتطلبات قبل عرض السعر.'
        }
    ],
    inquiryForm: {
        title: 'Send Inquiry',
        titleAr: 'إرسال استفسار',
        submitLabel: 'Submit Message',
        submitLabelAr: 'إرسال',
        productMessageTemplate: 'I would like to request pricing and technical details for: {name} ({id}).',
        productMessageTemplateAr: 'أرغب في طلب السعر والتفاصيل الفنية لهذا المنتج: {name} ({id}).',
        fields: [
            { name: 'name', type: 'text', label: 'Full Name', labelAr: 'الاسم الكامل', required: true },
            { name: 'email', type: 'email', label: 'Email Address', labelAr: 'البريد الإلكتروني', required: true },
            { name: 'company', type: 'text', label: 'Company Name', labelAr: 'اسم الشركة' },
            { name: 'phone', type: 'tel', label: 'Phone Number', labelAr: 'رقم الهاتف' },
            { name: 'country', type: 'text', label: 'Country', labelAr: 'الدولة' },
            { name: 'productType', type: 'text', label: 'Product Type', labelAr: 'نوع المنتج', placeholder: 'Transformer / Switchgear / EV Charger', placeholderAr: 'محول / مفاتيح / شاحن EV' },
            { name: 'quantityOrScale', type: 'text', label: 'Quantity or Project Scale', labelAr: 'الكمية أو حجم المشروع' },
            { name: 'requiredVoltageOrCapacity', type: 'text', label: 'Required Voltage or Capacity', labelAr: 'الجهد أو السعة المطلوبة' },
            {
                name: 'subject',
                type: 'select',
                label: 'Subject',
                labelAr: 'الموضوع',
                required: true,
                options: [
                    { value: 'quote', label: 'Request a Quote', labelAr: 'طلب عرض سعر' },
                    { value: 'technical', label: 'Technical Consultation', labelAr: 'استشارة فنية' },
                    { value: 'other', label: 'Other Inquiry', labelAr: 'استفسار آخر' }
                ]
            },
            { name: 'message', type: 'textarea', rows: 5, label: 'Message', labelAr: 'الرسالة', required: true, productMessage: true }
        ]
    },
    seo: {
        title: 'Products | Henan Longxiang Electrical Co., Ltd.',
        titleAr: 'المنتجات | Henan Longxiang Electrical Co., Ltd.',
        description: 'Explore Longxiang transformers, switchgear, EV chargers, and power distribution equipment for industrial parks, PV projects, charging stations, and utility applications.',
        descriptionAr: 'تصفح محولات Longxiang ومعدات المفاتيح وشواحن المركبات الكهربائية ومعدات توزيع الطاقة للمشروعات الصناعية والتجارية.',
        image: 'assets/hero/product.webp'
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

const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get('product-pages');

if (!row) {
    db.prepare(`
        INSERT INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            ('product-pages', 'Product Page Copy', 'صفحات المنتجات', @body_json, 'published', 20, 1, @now, @now)
    `).run({ body_json: JSON.stringify(defaults), now });
    console.log('inserted content block: product-pages');
} else {
    const body = parseBody(row.body_json);
    const before = JSON.stringify(body);
    mergeMissing(body, defaults);
    const after = JSON.stringify(body);

    if (before === after) {
        console.log('skip product-pages content block: no missing page fields');
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
        console.log('updated product-pages content block: added missing page fields');
    }
}
