const { getDb } = require('../server/lib/db');

const dryRun = process.argv.indexOf('--dry-run') !== -1;
const db = getDb();
const now = Date.now();
const samples = {
    "grid-connected-pv-box": {
        "short_desc_en": "AC-side grid connection box for 10-60 kW PV systems, combining metering, distribution, protection and outdoor wall-mounted installation.",
        "short_desc_ar": "صندوق ربط على جانب التيار المتردد لأنظمة كهروضوئية بقدرة 10 إلى 60 كيلوواط، يجمع القياس والتوزيع والحماية والتركيب الجداري الخارجي.",
        "description_en": "Best fit:\nFor small and medium grid-connected PV projects below 100 kW that need one integrated AC-side box between the inverter and the grid or user side.\n\nWhat it does:\nThe grid-connected PV box collects AC output from the inverter, distributes it to the grid or load side, and reserves positions for energy metering and data collection. It integrates isolation, overload, short-circuit, surge grounding, over-voltage, under-voltage and voltage-loss protection.\n\nWhy buyers choose it:\n- 10 / 25 / 30 / 50 / 60 kW options cover common rooftop and small commercial PV projects.\n- Outdoor IP65 wall-mounted enclosure supports complex site conditions.\n- Optional cold-rolled steel, galvanized sheet or stainless steel enclosure helps match budget and environment.\n- Ventilation layout helps reduce internal temperature and extend component service life.\n- Reclosing and metering configuration supports stable grid-connected operation.\n\nBefore quotation:\nPlease confirm PV capacity, AC voltage, inverter output circuits, meter requirements, enclosure material, installation environment and destination country.",
        "description_ar": "الملاءمة الأفضل:\nيناسب مشروعات الطاقة الكهروضوئية الصغيرة والمتوسطة المتصلة بالشبكة بقدرة أقل من 100 كيلوواط، عندما يحتاج المشروع إلى صندوق متكامل على جانب التيار المتردد بين العاكس والشبكة أو جانب المستخدم.\n\nوظيفته:\nيجمع صندوق الربط الكهروضوئي خرج التيار المتردد من العاكس، ويوزعه إلى الشبكة أو جانب الحمل، ويوفر أماكن لتركيب عداد الطاقة وجهاز جمع البيانات. ويدمج وظائف العزل والحماية من الحمل الزائد والقصر والتأريض ضد الاندفاع وزيادة الجهد وانخفاضه وفقدان الجهد.\n\nلماذا يختاره العملاء:\n- خيارات 10 / 25 / 30 / 50 / 60 كيلوواط تغطي مشروعات الأسطح والمشروعات التجارية الصغيرة الشائعة.\n- صندوق خارجي جداري بدرجة حماية IP65 يناسب ظروف المواقع المعقدة.\n- يمكن اختيار فولاذ مدرفل على البارد أو صاج مجلفن أو فولاذ مقاوم للصدأ حسب البيئة والميزانية.\n- تصميم التهوية يساعد على خفض الحرارة الداخلية وإطالة عمر المكونات.\n- تكوين إعادة الغلق والقياس يدعم التشغيل المستقر عند الربط بالشبكة.\n\nقبل عرض السعر:\nيرجى تأكيد قدرة النظام الكهروضوئي، جهد التيار المتردد، عدد دوائر خرج العاكس، متطلبات العداد، مادة الصندوق، بيئة التركيب وبلد الوجهة.",
        "seo_title": "Grid-Connected PV Box | 10-60 kW AC Solar Box",
        "seo_description": "Grid-connected PV box for 10-60 kW solar projects, integrating AC distribution, metering, IP65 enclosure and electrical protection."
    },
    "amorphous-sbh21-m": {
        "short_desc_en": "Oil-immersed amorphous alloy distribution transformer for 10 kV-class networks, focused on low no-load loss and stable project operation.",
        "short_desc_ar": "محول توزيع مغمور بالزيت بقلب من السبيكة غير المتبلورة لشبكات فئة 10 كيلوفولت، يركز على تقليل فواقد اللاحمل واستقرار التشغيل.",
        "description_en": "Best fit:\nFor industrial parks, utilities and distribution rooms that need a low-loss oil-immersed transformer with amorphous alloy core technology.\n\nWhat it does:\nS(B)H21-M uses an amorphous alloy core to reduce no-load loss in long-running distribution networks. It is suitable for 10 kV-class systems and 30-2500 kVA project configurations, with ONAN cooling and sealed oil-immersed construction.\n\nWhy buyers choose it:\n- Lower no-load loss is useful for transformers operating continuously.\n- 30-2500 kVA range covers factories, buildings, parks and utility distribution.\n- Oil-immersed ONAN cooling supports stable operation and routine maintenance.\n- Separate S(B)H21-M series positioning makes model selection clearer than mixing it with S(B)H15-M or S(B)H25-M.\n- Can be coordinated with switchgear and project accessories for packaged delivery.\n\nBefore quotation:\nPlease provide capacity, primary and secondary voltage, frequency, quantity, installation altitude, ambient temperature, impedance or loss requirement, and whether test reports or drawings are needed.",
        "description_ar": "الملاءمة الأفضل:\nيناسب المناطق الصناعية والمرافق وغرف التوزيع التي تحتاج إلى محول مغمور بالزيت منخفض الفواقد يعتمد على قلب من السبيكة غير المتبلورة.\n\nوظيفته:\nيعتمد S(B)H21-M على قلب من السبيكة غير المتبلورة لتقليل فواقد اللاحمل في شبكات التوزيع التي تعمل لفترات طويلة. وهو مناسب لأنظمة فئة 10 كيلوفولت وتكوينات من 30 إلى 2500 كيلوفولت أمبير، مع تبريد ONAN وبنية مغمورة بالزيت ومحكمة.\n\nلماذا يختاره العملاء:\n- انخفاض فواقد اللاحمل مفيد للمحولات التي تعمل باستمرار.\n- مدى 30 إلى 2500 كيلوفولت أمبير يغطي المصانع والمباني والمجمعات وشبكات المرافق.\n- التبريد الزيتي ONAN يدعم التشغيل المستقر والصيانة الدورية.\n- فصل سلسلة S(B)H21-M يجعل اختيار النموذج أوضح من خلطها مع S(B)H15-M أو S(B)H25-M.\n- يمكن تنسيقها مع معدات المفاتيح وملحقات المشروع للتسليم كحزمة واحدة.\n\nقبل عرض السعر:\nيرجى توفير السعة، الجهد الابتدائي والثانوي، التردد، الكمية، ارتفاع موقع التركيب، درجة الحرارة المحيطة، متطلبات الممانعة أو الفواقد، وما إذا كانت تقارير الاختبار أو الرسومات مطلوبة.",
        "seo_title": "S(B)H21-M Amorphous Alloy Transformer | Longxiang",
        "seo_description": "S(B)H21-M oil-immersed amorphous alloy distribution transformer for 10 kV-class networks, low no-load loss and 30-2500 kVA projects."
    },
    "kyn28-12": {
        "short_desc_en": "Indoor 3.6-12 kV metal-clad withdrawable switchgear for distribution, protection, measurement and motor-starting applications.",
        "short_desc_ar": "معدات مفاتيح داخلية معدنية قابلة للسحب بجهد 3.6 إلى 12 كيلوفولت للتوزيع والحماية والقياس وتشغيل المحركات.",
        "description_en": "Best fit:\nFor medium-voltage distribution rooms in power plants, industrial facilities, mining enterprises, substations and motor-control projects.\n\nWhat it does:\nKYN28-12 is an indoor metal-clad withdrawable switchgear for 3.6-12 kV three-phase AC 50 Hz single-busbar or sectionalized single-busbar systems. It supports power receiving, distribution, control, protection, measurement and circuit monitoring.\n\nWhy buyers choose it:\n- Withdrawable design helps inspection and maintenance without redesigning the whole switchroom.\n- Rated voltage options cover 3 kV, 6 kV, 7.2 kV and 12 kV systems.\n- Rated current up to 3150 A supports demanding medium-voltage distribution projects.\n- Can be equipped with VD4 or VS1 vacuum circuit breakers according to project preference.\n- IP4X enclosure and IP2X protection when compartment doors are open improve site safety.\n\nBefore quotation:\nPlease confirm system voltage, rated current, short-circuit breaking current, busbar scheme, breaker brand preference, incoming/outgoing circuit quantity, protection relay requirements and project standard.",
        "description_ar": "الملاءمة الأفضل:\nيناسب غرف التوزيع متوسطة الجهد في محطات الطاقة والمنشآت الصناعية وشركات التعدين والمحطات الفرعية ومشروعات التحكم في المحركات.\n\nوظيفته:\nKYN28-12 هو جهاز مفاتيح داخلي معدني مغلف وقابل للسحب لأنظمة تيار متردد ثلاثية الطور 50 هرتز بجهد 3.6 إلى 12 كيلوفولت، مع قضيب توصيل مفرد أو قضيب مفرد مقسم. ويدعم استقبال الطاقة وتوزيعها والتحكم والحماية والقياس ومراقبة الدوائر.\n\nلماذا يختاره العملاء:\n- التصميم القابل للسحب يسهل الفحص والصيانة دون إعادة تصميم غرفة المفاتيح بالكامل.\n- خيارات الجهد تغطي أنظمة 3 و6 و7.2 و12 كيلوفولت.\n- تيار مقنن حتى 3150 أمبير يدعم مشروعات التوزيع متوسطة الجهد ذات المتطلبات العالية.\n- يمكن تجهيزه بقواطع فراغية VD4 أو VS1 حسب تفضيل المشروع.\n- درجة حماية IP4X للغلاف وIP2X عند فتح أبواب الحجرات تعزز السلامة في الموقع.\n\nقبل عرض السعر:\nيرجى تأكيد جهد النظام، التيار المقنن، تيار فصل القصر، مخطط قضبان التوصيل، تفضيل نوع القاطع، عدد دوائر الدخول والخروج، متطلبات مرحلات الحماية ومعيار المشروع.",
        "seo_title": "KYN28-12 Metal-Clad Withdrawable Switchgear",
        "seo_description": "KYN28-12 indoor metal-clad withdrawable switchgear for 3.6-12 kV distribution rooms, protection, measurement and motor control."
    }
};
const changes = [];

function changed(row, next) {
    return ['short_desc_en', 'short_desc_ar', 'description_en', 'description_ar', 'seo_title', 'seo_description']
        .some(function (key) { return String(row[key] || '') !== String(next[key] || ''); });
}

const update = db.prepare(
    'UPDATE products SET short_desc_en = @short_desc_en, short_desc_ar = @short_desc_ar, description_en = @description_en, description_ar = @description_ar, seo_title = @seo_title, seo_description = @seo_description, version = version + 1, updated_at = @updated_at WHERE id = @id'
);

const run = db.transaction(function () {
    Object.keys(samples).forEach(function (slug) {
        const row = db.prepare('SELECT id, slug, status, short_desc_en, short_desc_ar, description_en, description_ar, seo_title, seo_description FROM products WHERE slug = ?').get(slug);
        if (!row || row.status === 'deleted') {
            changes.push({ type: 'missing_or_deleted', slug });
            return;
        }
        const next = samples[slug];
        if (!changed(row, next)) return;
        changes.push({ type: 'sample_product_content', slug, id: row.id, seoTitle: next.seo_title });
        if (!dryRun) update.run(Object.assign({ id: row.id, updated_at: now }, next));
    });
});

run();
console.log(JSON.stringify({ dryRun, changed: changes.length, changes }, null, 2));
