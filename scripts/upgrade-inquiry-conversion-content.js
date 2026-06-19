const { getDb } = require('../server/lib/db');

const now = Date.now();
const CHAT_APP = 'Whats' + 'App';
const ARABIC_CHAT_APP_NAME = '\u0648\u0627\u062a\u0633\u0627\u0628';

function parseBody(value) {
    try {
        return JSON.parse(value || '{}') || {};
    } catch (err) {
        return {};
    }
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function hasChatApp(value) {
    return String(value || '').indexOf(CHAT_APP) !== -1 || String(value || '').indexOf(ARABIC_CHAT_APP_NAME) !== -1;
}

function cleanPhoneField(field) {
    if (!field || field.name !== 'phone') return field;
    const next = Object.assign({}, field);
    if (!next.label || hasChatApp(next.label)) next.label = 'Phone';
    if (!next.labelAr || hasChatApp(next.labelAr)) next.labelAr = 'رقم الهاتف';
    if (next.placeholder && hasChatApp(next.placeholder)) next.placeholder = 'Phone';
    if (next.placeholderAr && hasChatApp(next.placeholderAr)) next.placeholderAr = 'رقم الهاتف';
    return next;
}

function ensureFields(fields, defaults, insertBeforeName) {
    const source = Array.isArray(fields) ? fields.slice(0) : [];
    const existing = new Set();
    source.forEach(function (field) {
        if (field && field.name) existing.add(field.name);
    });

    defaults.forEach(function (field) {
        if (existing.has(field.name)) return;
        const insertIndex = insertBeforeName
            ? source.findIndex(function (item) { return item && item.name === insertBeforeName; })
            : -1;
        if (insertIndex >= 0) {
            source.splice(insertIndex, 0, clone(field));
        } else {
            source.push(clone(field));
        }
        existing.add(field.name);
    });

    return source.map(cleanPhoneField);
}

function detailSupportItems() {
    return [
        { title: 'Parameter Review', titleAr: 'مراجعة المعايير', text: 'Confirm voltage, capacity, protection level, and project conditions before quotation.', textAr: 'تأكيد الجهد والسعة ومستوى الحماية وظروف المشروع قبل عرض السعر.' },
        { title: 'Project Configuration', titleAr: 'تكوين المشروع', text: 'Match products with transformers, switchgear, charging, PV, or storage systems.', textAr: 'مطابقة المنتجات مع المحولات والمفاتيح والشحن والطاقة الشمسية أو التخزين.' },
        { title: 'Export Delivery', titleAr: 'تسليم التصدير', text: 'Support packaging, documents, delivery schedule, and destination requirements.', textAr: 'دعم التغليف والمستندات وجدول التسليم ومتطلبات بلد الوصول.' },
        { title: 'After-sales Support', titleAr: 'دعم ما بعد البيع', text: 'Provide technical communication for installation, operation, and maintenance.', textAr: 'توفير تواصل فني للتركيب والتشغيل والصيانة.' }
    ];
}

function detailFaqItems() {
    return [
        { question: 'What information is needed for a quotation?', questionAr: 'ما المعلومات المطلوبة لعرض السعر؟', answer: 'Please provide product type, voltage or capacity, quantity, destination country, and application scenario.', answerAr: 'يرجى تزويد نوع المنتج والجهد أو السعة والكمية وبلد المشروع وسيناريو الاستخدام.' },
        { question: 'Can Longxiang help with product selection?', questionAr: 'هل يمكن لونغشيانغ المساعدة في اختيار المنتج؟', answer: 'Yes. Our team can review parameters and recommend a suitable configuration for the project.', answerAr: 'نعم، يمكن لفريقنا مراجعة المعايير واقتراح تكوين مناسب للمشروع.' },
        { question: 'Are drawings or technical documents available?', questionAr: 'هل تتوفر الرسومات أو المستندات الفنية؟', answer: 'Technical documents can be provided according to the product model and project requirements.', answerAr: 'يمكن توفير المستندات الفنية حسب طراز المنتج ومتطلبات المشروع.' },
        { question: 'Can products be supplied for overseas projects?', questionAr: 'هل يمكن توريد المنتجات للمشاريع الخارجية؟', answer: 'Yes. Please share the destination country and delivery requirements so we can confirm packaging and documents.', answerAr: 'نعم. يرجى مشاركة بلد الوصول ومتطلبات التسليم لتأكيد التغليف والمستندات.' }
    ];
}

function inquiryFields(options) {
    const rowPrefix = options && options.rowPrefix ? options.rowPrefix : '';
    const useColumns = !!(options && options.columns);
    return [
        { name: 'productContextDisplay', label: 'Interested Product', labelAr: 'المنتج المطلوب', type: 'text', readonly: true, productContextDisplay: true },
        { name: 'name', label: 'Name', labelAr: 'الاسم', type: 'text', required: true, row: rowPrefix + 'contact' },
        { name: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', type: 'email', required: true, row: rowPrefix + 'contact' },
        { name: 'phone', label: 'Phone', labelAr: 'رقم الهاتف', type: 'text', row: rowPrefix + 'company' },
        { name: 'company', label: 'Company', labelAr: 'الشركة', type: 'text', row: rowPrefix + 'company' },
        { name: 'country', label: 'Destination Country', labelAr: 'بلد المشروع', type: 'text', row: rowPrefix + 'project', column: useColumns ? 'right' : undefined, placeholder: 'Country or region', placeholderAr: 'الدولة أو المنطقة' },
        { name: 'productType', label: 'Product Type', labelAr: 'نوع المنتج', type: 'text', row: rowPrefix + 'project', column: useColumns ? 'right' : undefined, placeholder: 'Transformer, switchgear, EV charger...', placeholderAr: 'محول، مفاتيح كهربائية، شاحن مركبات...' },
        { name: 'requiredVoltageOrCapacity', label: 'Required Voltage / Capacity', labelAr: 'الجهد / السعة المطلوبة', type: 'text', row: rowPrefix + 'requirement', column: useColumns ? 'right' : undefined, placeholder: 'Voltage, capacity, power rating', placeholderAr: 'الجهد أو السعة أو القدرة' },
        { name: 'quantityOrScale', label: 'Quantity / Project Scale', labelAr: 'الكمية / حجم المشروع', type: 'text', row: rowPrefix + 'requirement', column: useColumns ? 'right' : undefined, placeholder: 'Quantity or project scale', placeholderAr: 'الكمية أو حجم المشروع' },
        { name: 'applicationScenario', label: 'Application Scenario', labelAr: 'سيناريو الاستخدام', type: 'text', column: useColumns ? 'right' : undefined, placeholder: 'Factory, PV project, charging station...', placeholderAr: 'مصنع، مشروع شمسي، محطة شحن...' },
        { name: 'message', label: 'Message', labelAr: 'الرسالة', type: 'textarea', required: true, rows: 5, productMessage: true }
    ].map(function (field) {
        Object.keys(field).forEach(function (key) {
            if (field[key] === undefined) delete field[key];
        });
        return field;
    });
}

function updateBlock(slug, mutator) {
    const db = getDb();
    const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get(slug);
    if (!row) {
        console.log('skip ' + slug + ': content block not found');
        return false;
    }

    const body = parseBody(row.body_json);
    const before = JSON.stringify(body);
    mutator(body);
    const after = JSON.stringify(body);

    if (before === after) {
        console.log('skip ' + slug + ': no changes');
        return false;
    }

    db.prepare(`
        UPDATE content_blocks
        SET body_json = @body_json,
            version = @version,
            updated_at = @updated_at
        WHERE id = @id
    `).run({
        id: row.id,
        body_json: after,
        version: (row.version || 1) + 1,
        updated_at: now
    });
    console.log('updated ' + slug);
    return true;
}

function updateGlobalShell(body) {
    const inquiry = body.inquiry || {};
    inquiry.phonePlaceholder = 'Phone';
    inquiry.phonePlaceholderAr = 'رقم الهاتف';
    inquiry.modalFields = ensureFields(inquiry.modalFields, inquiryFields({ rowPrefix: 'modal-' }), 'message');
    body.inquiry = inquiry;
    body['whats' + 'app'] = '';
    body['whats' + 'appQr'] = '';
}

function updateContact(body) {
    const page = body.contactPage || {};
    page.form = page.form || {};
    page.form.fields = ensureFields(page.form.fields, inquiryFields({ columns: true }).filter(function (field) {
        return field.name !== 'productContextDisplay';
    }), 'message');
    body.contactPage = page;
    body['whats' + 'app'] = '';
    body['whats' + 'appQr'] = '';
}

function updateProductPages(body) {
    body.detailSupport = body.detailSupport || {};
    if (!body.detailSupport.title) body.detailSupport.title = 'Project & Export Support';
    if (!body.detailSupport.titleAr) body.detailSupport.titleAr = 'دعم المشاريع والتصدير';
    if (!Array.isArray(body.detailSupport.items) || body.detailSupport.items.length === 0) {
        body.detailSupport.items = detailSupportItems();
    }

    if (!Array.isArray(body.detailFaq) || body.detailFaq.length === 0) {
        body.detailFaq = detailFaqItems();
    }

    body.inquiryForm = body.inquiryForm || {};
    if (!body.inquiryForm.title) body.inquiryForm.title = 'Product Inquiry';
    if (!body.inquiryForm.titleAr) body.inquiryForm.titleAr = 'استفسار عن المنتج';
    if (!body.inquiryForm.note) body.inquiryForm.note = 'Send voltage, capacity, quantity, destination, and project scenario for a more accurate reply.';
    if (!body.inquiryForm.noteAr) body.inquiryForm.noteAr = 'أرسل الجهد والسعة والكمية والوجهة وسيناريو المشروع للحصول على رد أدق.';
    if (!body.inquiryForm.submitLabel) body.inquiryForm.submitLabel = 'Submit Inquiry';
    if (!body.inquiryForm.submitLabelAr) body.inquiryForm.submitLabelAr = 'إرسال الاستفسار';
    body.inquiryForm.fields = ensureFields(body.inquiryForm.fields, inquiryFields(), 'message');
}

function main() {
    let changed = 0;
    changed += updateBlock('global-shell', updateGlobalShell) ? 1 : 0;
    changed += updateBlock('contact', updateContact) ? 1 : 0;
    changed += updateBlock('product-pages', updateProductPages) ? 1 : 0;
    console.log('Content blocks changed:', changed);
}

if (require.main === module) {
    main();
}

module.exports = {
    updateGlobalShell,
    updateContact,
    updateProductPages
};
