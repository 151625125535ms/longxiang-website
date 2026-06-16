const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const db = new Database(path.join(ROOT, 'data', 'longxiang.db'));
const now = Date.now();

const body = {
    hero: {
        title: 'Certificates & Qualification Archive',
        titleAr: 'أرشيف الشهادات والمؤهلات',
        subtitle: 'Verified test reports, enterprise qualifications, honors, patent certificates, and compliance materials for power equipment supplier review.',
        subtitleAr: 'تقارير اختبار موثقة، ومؤهلات مؤسسية، وتكريمات، وشهادات براءات اختراع، ومواد امتثال لمراجعة موردي معدات الطاقة.',
        backgroundImage: '5、厂区厂貌/厂区1.JPG'
    },
    intro: {
        kicker: 'Documented credibility',
        kickerAr: 'موثوقية مدعومة بالوثائق',
        title: 'Qualification materials for procurement and technical due diligence',
        titleAr: 'مواد تأهيل للمشتريات والمراجعة الفنية',
        text: "Browse Longxiang's certification archive by document type, search by certificate name, and open each record for a larger preview.",
        textAr: 'تصفح أرشيف شهادات Longxiang حسب نوع الوثيقة، وابحث باسم الشهادة، وافتح كل سجل لمعاينة أكبر.'
    },
    stats: [
        { key: 'total', value: '0', label: 'Total Records', labelAr: 'إجمالي السجلات' },
        { key: 'reports', value: '0', label: 'Test Reports', labelAr: 'تقارير اختبار' },
        { key: 'patents', value: '0', label: 'Patent Certificates', labelAr: 'شهادات براءات اختراع' },
        { key: 'qualifications', value: '0', label: 'Enterprise Qualifications', labelAr: 'مؤهلات مؤسسية' }
    ],
    toolbar: {
        searchLabel: 'Search',
        searchLabelAr: 'بحث',
        searchPlaceholder: 'Search by certificate name',
        searchPlaceholderAr: 'ابحث باسم الشهادة',
        loadingText: 'Loading certificate records...',
        loadingTextAr: 'جاري تحميل سجلات الشهادات...',
        loadMoreLabel: 'Load More',
        loadMoreLabelAr: 'تحميل المزيد'
    },
    seo: {
        title: 'Certificates | Henan Longxiang Electrical Co., Ltd.',
        titleAr: 'الشهادات | Henan Longxiang Electrical Co., Ltd.',
        description: 'Certificates and qualifications for Henan Longxiang Electrical.',
        descriptionAr: 'الشهادات والمؤهلات الخاصة بشركة Henan Longxiang Electrical.',
        image: '5、厂区厂貌/厂区1.JPG'
    }
};

const row = db.prepare('SELECT id FROM content_blocks WHERE slug = ?').get('certifications');

if (row) {
    console.log('skip existing content block: certifications');
} else {
    db.prepare(`
        INSERT INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            ('certifications', 'Certifications', 'الشهادات', @body_json, 'published', 50, 1, @now, @now)
    `).run({ body_json: JSON.stringify(body), now });
    console.log('inserted content block: certifications');
}
