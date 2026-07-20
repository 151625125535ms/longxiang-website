require('./lib/archived-legacy-writer-guard').assertArchivedLegacyWriterAllowed(__filename);

const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const db = new Database(path.join(ROOT, 'data', 'longxiang.db'));
const now = Date.now();

const defaults = {
    navigation: {
        quickTitle: 'Quick Links',
        quickTitleAr: 'روابط سريعة',
        productsTitle: 'Products',
        productsTitleAr: 'المنتجات',
        cookieSettingsLabel: 'Cookie Settings',
        cookieSettingsLabelAr: 'إعدادات ملفات تعريف الارتباط',
        mainLinks: [
            { href: 'index.html', label: 'Home', labelAr: 'الرئيسية', activePages: ['index.html'] },
            {
                href: 'products.html',
                label: 'Products',
                labelAr: 'المنتجات',
                activePages: ['products.html', 'product-detail.html', 'compare.html'],
                children: [
                    { href: 'products.html', search: '?group=transformer', label: 'Transformer', labelAr: 'المحولات' },
                    { href: 'products.html', search: '?group=new-energy-equipment', label: 'New Energy Equipment', labelAr: 'معدات الطاقة الجديدة' },
                    { href: 'products.html', search: '?group=new-energy-equipment&sub=energy-storage', label: 'Energy Storage', labelAr: 'أنظمة تخزين الطاقة' },
                    { href: 'products.html', search: '?group=new-energy-equipment&sub=ac', label: 'AC EV Charging Station', labelAr: 'محطة شحن تيار متردد' },
                    { href: 'products.html', search: '?group=new-energy-equipment&sub=dc', label: 'DC EV Charging Station', labelAr: 'محطة شحن تيار مستمر' },
                    { href: 'products.html', search: '?group=switchgear', label: 'Switchgear', labelAr: 'معدات المفاتيح' }
                ]
            },
            {
                href: 'solutions.html',
                label: 'Solutions',
                labelAr: 'الحلول',
                activePages: ['solutions.html'],
                children: [
                    { href: 'solutions.html', hash: '#engineering-epc', label: 'Engineering General Contracting', labelAr: 'المقاولات العامة للمشاريع الكهربائية' },
                    { href: 'solutions.html', hash: '#line-om', label: 'Line Operation & Maintenance', labelAr: 'تشغيل وصيانة الخطوط' },
                    { href: 'solutions.html', hash: '#wind-pv-ess-ev', label: 'C&I Wind+PV+ESS+EV Charging Solution', labelAr: 'حل الرياح والطاقة الشمسية والتخزين والشحن' },
                    { href: 'solutions.html', hash: '#smart-microgrid', label: 'C&I Smart Microgrid Solution', labelAr: 'حل الشبكة المصغرة الذكية' },
                    { href: 'solutions.html', hash: '#pv-solution', label: 'C&I PV Solution', labelAr: 'حل الطاقة الشمسية التجارية والصناعية' }
                ]
            },
            { href: 'education.html', label: 'Education', labelAr: 'التعليم', activePages: ['education.html'] },
            {
                href: 'about.html',
                label: 'About Us',
                labelAr: 'من نحن',
                activePages: ['about.html', 'certifications.html'],
                children: [
                    { href: 'about.html', label: 'About LongXiang', labelAr: 'عن LongXiang' },
                    { href: 'certifications.html', label: 'Certificates', labelAr: 'الشهادات' }
                ]
            },
            { href: 'contact.html', label: 'Contact', labelAr: 'اتصل بنا', activePages: ['contact.html'] }
        ],
        quickLinks: [
            { href: 'index.html', label: 'Home', labelAr: 'الرئيسية' },
            { href: 'products.html', label: 'Products', labelAr: 'المنتجات' },
            { href: 'solutions.html', label: 'Solutions', labelAr: 'الحلول' },
            { href: 'education.html', label: 'Education', labelAr: 'التعليم' },
            { href: 'about.html', label: 'About Us', labelAr: 'من نحن' },
            { href: 'contact.html', label: 'Contact', labelAr: 'اتصل بنا' }
        ],
        productLinks: [
            { href: 'products.html', search: '?group=transformer', label: 'Transformer', labelAr: 'المحولات' },
            { href: 'products.html', search: '?group=new-energy-equipment', label: 'New Energy Equipment', labelAr: 'معدات الطاقة الجديدة' },
            { href: 'products.html', search: '?group=new-energy-equipment&sub=energy-storage', label: 'Energy Storage', labelAr: 'أنظمة تخزين الطاقة' },
            { href: 'products.html', search: '?group=new-energy-equipment&sub=ac', label: 'AC EV Charging Station', labelAr: 'محطة شحن تيار متردد' },
            { href: 'products.html', search: '?group=new-energy-equipment&sub=dc', label: 'DC EV Charging Station', labelAr: 'محطة شحن تيار مستمر' },
            { href: 'products.html', search: '?group=switchgear', label: 'Switchgear', labelAr: 'معدات المفاتيح' }
        ]
    },
    footer: {
        text: 'Providing intelligent, low-carbon power equipment and cultivating excellent professional electrical talent since 2003.',
        textAr: 'نوفر معدات طاقة ذكية منخفضة الكربون ونساهم في تنمية الكفاءات الكهربائية المهنية منذ عام 2003.',
        copyright: '© 2026 Henan Longxiang Electric Co., Ltd. All Rights Reserved.',
        copyrightAr: '© 2026 Henan Longxiang Electric Co., Ltd. جميع الحقوق محفوظة.'
    },
    inquiry: {
        title: 'Request Quote',
        titleAr: 'طلب عرض سعر',
        text: 'Share your project requirements and our team will respond quickly.',
        textAr: 'أرسل متطلبات مشروعك وسيتواصل فريقنا معك بسرعة.',
        floatingLabel: 'Request Quote',
        floatingLabelAr: 'طلب عرض سعر',
        modalTitle: 'Request Quote',
        modalTitleAr: 'طلب عرض سعر',
        modalText: 'Send your requirements and we will contact you soon.',
        modalTextAr: 'أرسل متطلباتك وسنتواصل معك قريباً.',
        generalInquiryLabel: 'General inquiry',
        generalInquiryLabelAr: 'استفسار عام',
        productMessageTemplate: 'I am interested in {product}. Please send pricing and technical details.',
        productMessageTemplateAr: 'أرغب في طلب السعر والتفاصيل الفنية لهذا المنتج: {product}.',
        productIdMessageTemplate: 'I would like to request pricing and technical details for product: {product}.',
        productIdMessageTemplateAr: 'أرغب في طلب السعر والتفاصيل الفنية للمنتج: {product}.',
        hiddenName: 'Footer Quote Visitor',
        hiddenNameAr: 'زائر طلب عرض سعر من التذييل',
        productContext: 'Footer request quote',
        productContextAr: 'طلب عرض سعر من التذييل',
        messagePlaceholder: '* Message',
        messagePlaceholderAr: '* الرسالة',
        emailPlaceholder: '* E-mail',
        emailPlaceholderAr: '* البريد الإلكتروني',
        phonePlaceholder: 'Phone',
        phonePlaceholderAr: 'رقم الهاتف',
        submitLabel: 'SUBMIT',
        submitLabelAr: 'إرسال',
        modalSubmitLabel: 'Submit Message',
        modalSubmitLabelAr: 'إرسال الرسالة',
        modalFields: [
            { name: 'productContextDisplay', type: 'text', label: 'Interested Product', labelAr: 'المنتج المطلوب', readonly: true },
            { name: 'name', type: 'text', label: 'Full Name', labelAr: 'الاسم الكامل', required: true, row: 1 },
            { name: 'email', type: 'email', label: 'Email Address', labelAr: 'البريد الإلكتروني', required: true, row: 1 },
            { name: 'company', type: 'text', label: 'Company Name', labelAr: 'اسم الشركة', row: 2 },
            { name: 'phone', type: 'text', label: 'Phone', labelAr: 'رقم الهاتف', row: 2 },
            { name: 'country', type: 'text', label: 'Country', labelAr: 'الدولة', row: 3 },
            { name: 'productType', type: 'text', label: 'Product Type', labelAr: 'نوع المنتج', placeholder: 'Transformer / Switchgear / EV Charger', placeholderAr: 'محول / مفاتيح / شاحن', row: 3 },
            { name: 'quantityOrScale', type: 'text', label: 'Quantity or Project Scale', labelAr: 'الكمية أو حجم المشروع', row: 4 },
            { name: 'requiredVoltageOrCapacity', type: 'text', label: 'Required Voltage or Capacity', labelAr: 'الجهد أو السعة المطلوبة', row: 4 },
            {
                name: 'subject',
                type: 'select',
                label: 'Subject',
                labelAr: 'الموضوع',
                required: true,
                options: [
                    { value: 'quote', label: 'Request a Quote', labelAr: 'طلب عرض سعر' },
                    { value: 'technical', label: 'Technical Consultation', labelAr: 'استشارة فنية' },
                    { value: 'partnership', label: 'Business Partnership', labelAr: 'شراكة تجارية' },
                    { value: 'support', label: 'After-Sales Support', labelAr: 'دعم ما بعد البيع' },
                    { value: 'other', label: 'Other Inquiry', labelAr: 'استفسار آخر' }
                ]
            },
            { name: 'message', type: 'textarea', label: 'Message', labelAr: 'الرسالة', rows: 5, required: true }
        ]
    },
    cookieConsent: {
        title: 'Cookie settings',
        titleAr: 'إعدادات ملفات تعريف الارتباط',
        intro: 'We use necessary storage to run the site. Analytics, maps, and video are not loaded unless you opt in.',
        introAr: 'نستخدم التخزين الضروري لتشغيل الموقع. لا يتم تحميل التحليلات أو الخرائط أو الفيديو إلا بعد موافقتك.',
        necessary: 'Necessary',
        necessaryAr: 'ضروري',
        necessaryDesc: 'Required for language, security, and core site functions.',
        necessaryDescAr: 'مطلوب للغة والأمان ووظائف الموقع الأساسية.',
        analytics: 'Analytics',
        analyticsAr: 'التحليلات',
        analyticsDesc: 'Helps us understand site usage with Google Analytics.',
        analyticsDescAr: 'يساعدنا Google Analytics على فهم استخدام الموقع.',
        functional: 'Functional',
        functionalAr: 'وظيفي',
        functionalDesc: 'Allows YouTube videos and Google Maps embeds to load.',
        functionalDescAr: 'يسمح بتحميل فيديوهات YouTube وخرائط Google.',
        accept: 'Accept all',
        acceptAr: 'قبول الكل',
        reject: 'Reject all',
        rejectAr: 'رفض الكل',
        customize: 'Customize',
        customizeAr: 'تخصيص',
        save: 'Save settings',
        saveAr: 'حفظ الإعدادات',
        close: 'Close',
        closeAr: 'إغلاق'
    },
    embedConsent: {
        title: 'Functional consent required',
        titleAr: 'يتطلب هذا المحتوى موافقة وظيفية',
        intro: 'Maps and videos from third parties are blocked until you allow functional cookies.',
        introAr: 'يتم حظر الخرائط والفيديو من أطراف خارجية حتى تسمح بملفات تعريف الارتباط الوظيفية.',
        allow: 'Allow functional cookies',
        allowAr: 'السماح بملفات تعريف الارتباط الوظيفية'
    },
    seoDefaults: {
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

const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get('global-shell');

if (!row) {
    db.prepare(`
        INSERT INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            ('global-shell', 'Global Shell', 'الإطار العام', @body_json, 'published', 10, 1, @now, @now)
    `).run({ body_json: JSON.stringify(defaults), now });
    console.log('inserted content block: global-shell');
} else {
    const body = parseBody(row.body_json);
    const before = JSON.stringify(body);
    mergeMissing(body, defaults);
    const after = JSON.stringify(body);

    if (before === after) {
        console.log('skip global-shell content block: no missing fields');
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
        console.log('updated global-shell content block: added missing fields');
    }
}
