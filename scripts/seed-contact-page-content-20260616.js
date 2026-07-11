const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const db = new Database(path.join(ROOT, 'data', 'longxiang.db'));
const now = Date.now();

const defaults = {
    hero: {
        title: 'Contact Us',
        titleAr: 'اتصل بنا',
        subtitle: 'Request quotes, technical consultation, and project support from Longxiang.',
        subtitleAr: 'اطلب عروض الأسعار والاستشارات الفنية ودعم المشروعات من Longxiang.',
        backgroundImage: 'assets/hero/contact.jpg'
    },
    contactPage: {
        companyName: 'Henan Longxiang Electric Co., Ltd.',
        companyNameAr: 'شركة Henan Longxiang Electric Co., Ltd.',
        infoTitle: 'Headquarters Information',
        infoTitleAr: 'معلومات المقر',
        officeLabel: 'Office',
        officeLabelAr: 'المكتب',
        emailLabel: 'Email',
        emailLabelAr: 'البريد الإلكتروني',
        factoryAddressLabel: 'Factory Address',
        factoryAddressLabelAr: 'عنوان المصنع',
        socialTitle: 'Social Media',
        socialTitleAr: 'وسائل التواصل',
        mapTitle: 'Longxiang factory locations map',
        mapTitleAr: 'خريطة مواقع مصانع Longxiang',
        form: {
            title: 'Contact Us',
            titleAr: 'اتصل بنا',
            note: '*Your information is protected and used only for Longxiang technical consultation and quotation follow-up.',
            noteAr: '*ستبقى معلوماتك محمية وتستخدم فقط للاستشارة الفنية ومتابعة عروض الأسعار من Longxiang.',
            footerText: '*Longxiang promises to collect the information from you only for the purpose of contacting you and helping you better understand us.',
            footerTextAr: 'سيراجع مهندسو Longxiang متطلباتك ويردون باختيار المنتج أو عرض السعر أو دعم المشروع.',
            submitLabel: 'Submit',
            submitLabelAr: 'إرسال',
            fields: [
                { name: 'name', type: 'text', column: 'left', required: true, label: 'Full Name', labelAr: 'الاسم الكامل', placeholder: 'Name', placeholderAr: 'الاسم' },
                { name: 'phone', type: 'tel', column: 'left', label: 'Phone Number', labelAr: 'رقم الهاتف', placeholder: 'Phone number', placeholderAr: 'رقم الهاتف' },
                { name: 'productType', type: 'text', column: 'left', label: 'Product Type', labelAr: 'نوع المنتج', placeholder: 'Transformer / Switchgear / EV Charger', placeholderAr: 'محول / مفاتيح / شاحن EV' },
                { name: 'quantityOrScale', type: 'text', column: 'left', label: 'Quantity or Project Scale', labelAr: 'الكمية أو حجم المشروع', placeholder: 'Quantity, site type, or project scale', placeholderAr: 'الكمية أو نوع الموقع أو حجم المشروع' },
                { name: 'message', type: 'textarea', column: 'left', required: true, label: 'Message', labelAr: 'الرسالة', placeholder: 'Message*', placeholderAr: 'الرسالة*', rows: 5 },
                { name: 'email', type: 'email', column: 'right', required: true, label: 'Email Address', labelAr: 'البريد الإلكتروني', placeholder: 'Email*', placeholderAr: 'البريد الإلكتروني*' },
                { name: 'company', type: 'text', column: 'right', label: 'Company Name', labelAr: 'اسم الشركة', placeholder: 'Company', placeholderAr: 'الشركة' },
                { name: 'country', type: 'text', column: 'right', label: 'Country', labelAr: 'الدولة', placeholder: 'Country / Region', placeholderAr: 'الدولة / المنطقة' },
                { name: 'requiredVoltageOrCapacity', type: 'text', column: 'right', label: 'Required Voltage or Capacity', labelAr: 'الجهد أو السعة المطلوبة', placeholder: 'Example: 10kV, 35kV, 630kVA', placeholderAr: 'مثال: 10kV, 35kV, 630kVA' },
                {
                    name: 'subject',
                    type: 'select',
                    column: 'right',
                    required: true,
                    label: 'Subject',
                    labelAr: 'الموضوع',
                    options: [
                        { value: '', label: 'Select a topic', labelAr: 'اختر الموضوع' },
                        { value: 'quote', label: 'Request a Quote', labelAr: 'طلب عرض سعر' },
                        { value: 'technical', label: 'Technical Consultation', labelAr: 'استشارة فنية' },
                        { value: 'partnership', label: 'Business Partnership', labelAr: 'شراكة تجارية' },
                        { value: 'support', label: 'After-Sales Support', labelAr: 'دعم ما بعد البيع' },
                        { value: 'other', label: 'Other Inquiry', labelAr: 'استفسار آخر' }
                    ]
                }
            ]
        },
        faq: {
            title: 'Buyer FAQ',
            titleAr: 'أسئلة المشترين',
            text: 'Quick answers for early-stage transformer, switchgear, and EV charger project inquiries.',
            textAr: 'إجابات سريعة لاستفسارات مشاريع المحولات ولوحات المفاتيح وشواحن المركبات الكهربائية.',
            items: [
                {
                    question: 'Can Longxiang customize voltage, capacity, or cabinet configuration?',
                    questionAr: 'هل يمكن تخصيص الجهد أو السعة أو تكوين اللوحات؟',
                    answer: 'Yes. Custom specifications are available on request after engineers review your voltage, capacity, application, and installation requirements.',
                    answerAr: 'نعم، يمكن مناقشة المواصفات الخاصة بعد مراجعة متطلبات الجهد والسعة والتطبيق وموقع التركيب.'
                },
                {
                    question: 'Do you support OEM or project-matched equipment?',
                    questionAr: 'هل تدعمون OEM أو معدات مطابقة للمشروع؟',
                    answer: 'OEM-style requirements and project-matched transformer, switchgear, and charging equipment can be discussed with the sales and engineering team.',
                    answerAr: 'يمكن مناقشة متطلبات OEM ومطابقة معدات المحولات ولوحات المفاتيح والشحن مع فريق المبيعات والهندسة.'
                },
                {
                    question: 'Can you discuss projects in the Middle East, Africa, or Southeast Asia?',
                    questionAr: 'هل يمكنكم مناقشة مشاريع في الشرق الأوسط أو أفريقيا أو جنوب شرق آسيا؟',
                    answer: 'Yes. Longxiang can review requirements for these regions, especially industrial parks, distribution networks, PV projects, and charging station scenarios.',
                    answerAr: 'نعم، يمكن مراجعة متطلبات هذه المناطق، خاصة المدن الصناعية وشبكات التوزيع ومشاريع الطاقة الشمسية ومحطات الشحن.'
                },
                {
                    question: 'Do you provide technical selection support?',
                    questionAr: 'هل تقدمون دعماً فنياً للاختيار؟',
                    answer: 'Yes. Share your country, product type, quantity or project scale, required voltage or capacity, and application scenario for technical review.',
                    answerAr: 'نعم، يرجى إرسال الدولة ونوع المنتج والكمية أو حجم المشروع والجهد أو السعة المطلوبة وسيناريو التطبيق للمراجعة الفنية.'
                },
                {
                    question: 'What warranty and after-sales support is available?',
                    questionAr: 'ما سياسة الضمان والدعم بعد البيع؟',
                    answer: 'Warranty terms are confirmed by project and product scope. Support can include email follow-up, remote technical guidance, and spare parts consultation.',
                    answerAr: 'يتم تأكيد شروط الضمان حسب نطاق المنتج والمشروع. يمكن توفير متابعة عبر البريد الإلكتروني وإرشاد فني عن بعد واستشارة قطع الغيار.'
                },
                {
                    question: 'How can I get a quotation?',
                    questionAr: 'كيف أحصل على عرض سعر؟',
                    answer: 'Submit the form with project requirements. A clear requirement helps the team provide product selection, technical feedback, and quotation follow-up.',
                    answerAr: 'أرسل متطلبات المشروع عبر النموذج. كلما كانت المتطلبات أوضح، كان من الأسهل تقديم اختيار المنتج والملاحظات الفنية ومتابعة عرض السعر.'
                },
                {
                    question: 'Can you provide English materials?',
                    questionAr: 'هل يمكن توفير مواد باللغة الإنجليزية؟',
                    answer: 'Product catalogs and technical documents are available upon request. Public downloads are limited while English and Arabic catalog versions are prepared.',
                    answerAr: 'تتوفر الكتالوجات والوثائق الفنية عند الطلب. التحميل العام محدود حالياً إلى حين تجهيز نسخ إنجليزية وعربية.'
                }
            ]
        }
    },
    seo: {
        title: 'Contact Us | Henan Longxiang Electric Co., Ltd.',
        titleAr: 'اتصل بنا | شركة Henan Longxiang Electric Co., Ltd.',
        description: 'Contact Henan Longxiang Electric for transformer, switchgear, EV charger quotes, technical selection, and power distribution project support.',
        descriptionAr: 'تواصل مع Henan Longxiang Electric لطلب عروض الأسعار والاستشارات الفنية ودعم المشروعات.',
        image: 'assets/hero/contact.jpg'
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

const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get('contact');

if (!row) {
    db.prepare(`
        INSERT INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            ('contact', 'Contact', 'اتصل بنا', @body_json, 'published', 40, 1, @now, @now)
    `).run({ body_json: JSON.stringify(defaults), now });
    console.log('inserted content block: contact');
} else {
    const body = parseBody(row.body_json);
    const before = JSON.stringify(body);
    mergeMissing(body, defaults);
    const after = JSON.stringify(body);

    if (before === after) {
        console.log('skip contact content block: no missing page fields');
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
        console.log('updated contact content block: added missing page fields');
    }
}
