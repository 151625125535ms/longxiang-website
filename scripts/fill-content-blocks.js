'use strict';
/**
 * 一次性迁移脚本：将 company.json 数据填充至 content_blocks 表
 * 影响范围：company-overview / contact / page-blocks.footer
 * 不触碰：education / about-us / applications / innovation
 *
 * 运行前提：
 *   1. 在项目根目录执行（require 路径以此为基准）
 *   2. 服务可以不在线
 *   3. 确保 data/longxiang.db 可读写
 *
 * 用法：
 *   node scripts/fill-content-blocks.js
 *   node scripts/fill-content-blocks.js --dry-run   # 仅打印，不写入
 */

const path    = require('path');
const fs      = require('fs');
const Database = require('better-sqlite3');
const { insertAuditLog } = require('../server/routes/admin/helpers');

const DRY_RUN  = process.argv.includes('--dry-run');
const ROOT     = path.join(__dirname, '..');
const DB_PATH  = path.join(ROOT, 'data', 'longxiang.db');
const BAK_PATH = DB_PATH + '.bak-fill-' + new Date().toISOString().slice(0, 10);
const COMPANY  = require(path.join(ROOT, 'data', 'company.json'));

const FAKE_REQ = {
    user:    { username: 'migration:fill-content-blocks' },
    headers: { 'user-agent': 'fill-content-blocks-script/1.0' },
    socket:  { remoteAddress: '127.0.0.1' }
};

// ── 本地 schema 验证（第 3 点）─────────────────────────────────────

function validateCompanyOverview(body) {
    const errors = [];
    if (!Array.isArray(body.stats)) errors.push('company-overview.stats 必须是数组');
    return errors;
}

function validateContact(body) {
    const errors = [];
    if (body.mapLocations !== undefined && (typeof body.mapLocations !== 'object' || Array.isArray(body.mapLocations))) {
        errors.push('contact.mapLocations 必须是对象');
    }
    return errors;
}

function validatePageBlocks(body) {
    const errors = [];
    if (!Array.isArray(body.blocks)) {
        errors.push('page-blocks.blocks 必须是数组');
        return errors;
    }
    const keys = body.blocks.map(function (b) { return b.key; });
    if (!keys.includes('footer'))   errors.push('page-blocks.blocks 缺少 footer（必填 key）');
    if (!keys.includes('home-cta')) errors.push('page-blocks.blocks 缺少 home-cta（必填 key）');
    return errors;
}

function assertValid(errors, label) {
    if (errors.length) {
        throw new Error('[校验失败] ' + label + ':\n  ' + errors.join('\n  '));
    }
}

// ── 数据构建 ──────────────────────────────────────────────────────

function buildCompanyOverview(existing) {
    const s = COMPANY;
    return {
        ...existing,
        name:               s.name               || '',
        nameAr:             s.nameAr             || '',
        nameCN:             s.nameCN             || '',
        founded:            s.founded            || '',
        stockCode:          s.stockCode          || '',
        registeredCapital:  s.registeredCapital  || '',
        registeredCapitalAr: s.registeredCapitalAr || '',
        factoryArea:        s.factoryArea        || '',
        factoryAreaAr:      s.factoryAreaAr      || '',
        patents:            s.patents            || '',
        researchPartners:   s.researchPartners   || '',
        description:        s.description        || '',
        descriptionAr:      s.descriptionAr      || '',
        aboutIntro:         s.aboutIntro         || '',
        aboutIntroAr:       s.aboutIntroAr       || '',
        aboutDetail:        s.aboutDetail        || '',
        aboutDetailAr:      s.aboutDetailAr      || '',
        cover_image:        s.cover_image        || existing.cover_image || '',
        // stats 从标量字段构造，过滤掉空值
        stats: [
            { id: 'registered-capital', value: s.registeredCapital  || '', label: '注册资本',   labelAr: 'رأس المال المسجل' },
            { id: 'factory-area',       value: s.factoryArea        || '', label: '厂区面积',   labelAr: 'مساحة المصنع' },
            { id: 'patents',            value: s.patents            || '', label: '专利数量',   labelAr: 'براءات الاختراع' },
            { id: 'partners',           value: s.researchPartners   || '', label: '科研合作伙伴', labelAr: 'شركاء البحث العلمي' }
        ].filter(function (st) { return st.value; })
    };
}

function buildContact(existing) {
    const s = COMPANY;
    return {
        ...existing,
        address:              s.address              || '',
        addressAr:            s.addressAr            || '',
        headquarters:         s.headquarters         || '',
        headquartersAr:       s.headquartersAr       || '',
        phone:                s.phone                || '',
        email:                s.email                || '',
        officeHours:          s.officeHours          || '',
        officeHoursAr:        s.officeHoursAr        || '',
        huaiyangBase:         s.huaiyangBase         || '',
        huaiyangBaseAr:       s.huaiyangBaseAr       || '',
        whatsapp:             s.whatsapp             || '',
        whatsappQr:           s.whatsappQr           || '',
        wechat:               s.wechat               || '',
        wechatQr:             s.wechatQr             || '',
        skype:                s.skype                || '',
        line:                 s.line                 || '',
        lineQr:               s.lineQr               || '',
        tiktok:               s.tiktok               || '',
        instagram:            s.instagram            || '',
        youtube:              s.youtube              || '',
        googleMapsUrl:        s.googleMapsUrl        || '',
        googleMapsEmbedUrl:   s.googleMapsEmbedUrl   || '',
        googleMyMapsEmbedUrl: s.googleMyMapsEmbedUrl || '',
        openStreetMapUrl:     s.openStreetMapUrl      || '',
        mapLocations:         s.mapLocations         || {},
        mapQr:                s.mapQr                || ''
    };
}

function buildPageBlocks(existing) {
    const blocks = Array.isArray(existing.blocks) ? existing.blocks : [];
    return {
        ...existing,
        blocks: blocks.map(function (b) {
            if (b.key === 'footer') {
                return {
                    ...b,
                    footerText:   COMPANY.footerText   || b.footerText   || '',
                    footerTextAr: COMPANY.footerTextAr || b.footerTextAr || ''
                };
            }
            if (b.key === 'home-cta') {
                // 只在 href 完全为空时补默认值，不覆盖已有内容
                return { ...b, href: b.href || 'contact.html' };
            }
            return b;
        })
    };
}

// ── 主流程 ────────────────────────────────────────────────────────

if (!fs.existsSync(DB_PATH)) {
    console.error('数据库文件不存在：', DB_PATH);
    process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 第 4 点：WAL checkpoint 后再备份
if (!DRY_RUN) {
    db.pragma('wal_checkpoint(TRUNCATE)');
    if (!fs.existsSync(BAK_PATH)) {
        fs.copyFileSync(DB_PATH, BAK_PATH);
        console.log('✓ 备份 →', BAK_PATH);
    } else {
        console.log('  备份文件已存在，跳过：', BAK_PATH);
    }
} else {
    console.log('[dry-run] 跳过备份和写入');
}

function getBlock(slug) {
    const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get(slug);
    if (!row) throw new Error('找不到 slug：' + slug);
    return { id: row.id, version: row.version, body_json: JSON.parse(row.body_json) };
}

const migrate = db.transaction(function () {
    // ── company-overview ──────────────────────────────────────────
    (function () {
        const block    = getBlock('company-overview');
        const newBody  = buildCompanyOverview(block.body_json);
        assertValid(validateCompanyOverview(newBody), 'company-overview');

        if (DRY_RUN) {
            console.log('[dry-run] company-overview stats count:', newBody.stats.length);
            return;
        }

        const result = db.prepare(
            'UPDATE content_blocks SET body_json=@body, version=version+1, updated_at=@now WHERE slug=@slug AND version=@ver'
        ).run({ body: JSON.stringify(newBody), now: Date.now(), slug: 'company-overview', ver: block.version });

        // 第 1 点：检查是否真的更新了（version 冲突时 changes=0）
        if (result.changes !== 1) {
            throw new Error('company-overview version 冲突（changes=' + result.changes + '），事务回滚');
        }

        // 第 5 点：复用 insertAuditLog
        insertAuditLog(db, FAKE_REQ, 'content_block', block.id, 'fill_migration', block.body_json, newBody);
        console.log('✓ company-overview');
    })();

    // ── contact ───────────────────────────────────────────────────
    (function () {
        const block    = getBlock('contact');
        const newBody  = buildContact(block.body_json);
        assertValid(validateContact(newBody), 'contact');

        if (DRY_RUN) {
            console.log('[dry-run] contact.mapLocations keys:', Object.keys(newBody.mapLocations || {}));
            return;
        }

        const result = db.prepare(
            'UPDATE content_blocks SET body_json=@body, version=version+1, updated_at=@now WHERE slug=@slug AND version=@ver'
        ).run({ body: JSON.stringify(newBody), now: Date.now(), slug: 'contact', ver: block.version });

        if (result.changes !== 1) {
            throw new Error('contact version 冲突（changes=' + result.changes + '），事务回滚');
        }

        insertAuditLog(db, FAKE_REQ, 'content_block', block.id, 'fill_migration', block.body_json, newBody);
        console.log('✓ contact');
    })();

    // ── page-blocks ───────────────────────────────────────────────
    (function () {
        const block    = getBlock('page-blocks');
        const newBody  = buildPageBlocks(block.body_json);
        assertValid(validatePageBlocks(newBody), 'page-blocks');

        if (DRY_RUN) {
            console.log('[dry-run] page-blocks keys:', (newBody.blocks || []).map(function (b) { return b.key; }));
            return;
        }

        const result = db.prepare(
            'UPDATE content_blocks SET body_json=@body, version=version+1, updated_at=@now WHERE slug=@slug AND version=@ver'
        ).run({ body: JSON.stringify(newBody), now: Date.now(), slug: 'page-blocks', ver: block.version });

        if (result.changes !== 1) {
            throw new Error('page-blocks version 冲突（changes=' + result.changes + '），事务回滚');
        }

        insertAuditLog(db, FAKE_REQ, 'content_block', block.id, 'fill_migration', block.body_json, newBody);
        console.log('✓ page-blocks');
    })();
});

try {
    migrate();
    if (!DRY_RUN) {
        console.log('\n全部完成。验证：');
        console.log('  curl http://localhost:3000/api/company');
        console.log('  sqlite3 data/longxiang.db "SELECT slug,version FROM content_blocks WHERE slug IN (\'company-overview\',\'contact\',\'page-blocks\')"');
        console.log('  sqlite3 data/longxiang.db "SELECT action,performed_by,created_at FROM audit_logs WHERE action=\'fill_migration\'"');
    } else {
        console.log('\n[dry-run] 检查完成，无数据写入。');
    }
} catch (err) {
    console.error('\n迁移失败，事务已回滚：', err.message);
    process.exit(1);
} finally {
    db.close();
}
