'use strict';

const fs = require('fs');
const path = require('path');
const {
    normalizeSourceExpected,
    sourceSnapshotHash
} = require('./lib/product-arabic-seo-source');
const { getProductFieldPatchPolicy } = require('./lib/product-field-patch-policies');
const { validateArabicSeoPatchPair } = require('./lib/product-arabic-seo-patch-pair');

const root = path.resolve(__dirname, '..');
const defaultForward = path.join(root, 'scripts', 'patches', 'product-arabic-seo-forward.json');
const defaultRollback = path.join(root, 'scripts', 'patches', 'product-arabic-seo-rollback.json');

function parseArgs(argv) {
    const args = {
        forward: defaultForward,
        rollback: defaultRollback,
        source: '',
        approval: '',
        report: ''
    };
    const valueOptions = new Set(Object.keys(args));
    for (let index = 2; index < argv.length; index += 1) {
        const arg = argv[index];
        if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
        const name = arg.slice(2);
        if (!valueOptions.has(name)) throw new Error(`Unknown option: ${arg}`);
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
        args[name] = path.resolve(value);
        index += 1;
    }
    return args;
}

function readPatchJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function text(value) {
    return value == null ? '' : String(value);
}

function unique(values) {
    return Array.from(new Set(values));
}

function numericTokens(value) {
    return unique(Array.from(text(value).matchAll(/\d+(?:\.\d+)?/g), (match) => match[0]));
}

function unitTokens(value) {
    return unique(Array.from(text(value).matchAll(/\b(kVA|kWh|MWh|kW|MW|kV|Vac|VAC|Hz|Ah|V|A|IP\d+[A-Z]?)\b/gi), (match) => match[0].toLowerCase()));
}

function targetText(product) {
    return Object.values(product.target || {}).map(text).join('\n');
}

function sourceText(product) {
    return Object.values(product.sourceExpected || {}).map(text).join('\n');
}

function setDifference(left, right) {
    const rightSet = new Set(right);
    return left.filter((value) => !rightSet.has(value));
}

function compareSourceProduct(item, sourceProduct, errors) {
    const prefix = `product ${item.row_id}`;
    if (!sourceProduct) {
        errors.push(`${prefix}: missing from source export.`);
        return;
    }
    ['slug', 'legacy_id', 'status'].forEach((field) => {
        if (text(item[field]) !== text(sourceProduct[field])) errors.push(`${prefix}: ${field} differs from source export.`);
    });
    if (Number(item.expectedVersion) !== Number(sourceProduct.version)) errors.push(`${prefix}: version differs from source export.`);
    const expectedSource = normalizeSourceExpected(sourceProduct);
    if (JSON.stringify(item.sourceExpected) !== JSON.stringify(expectedSource)) {
        errors.push(`${prefix}: sourceExpected differs from source export.`);
    }
    if (item.sourceSnapshotHash !== sourceSnapshotHash({
        row_id: sourceProduct.id,
        slug: sourceProduct.slug,
        legacy_id: sourceProduct.legacy_id,
        status: sourceProduct.status,
        expectedVersion: sourceProduct.version,
        sourceExpected: expectedSource
    })) {
        errors.push(`${prefix}: sourceSnapshotHash differs from source export.`);
    }
}

function auditPatches(forward, rollback, source) {
    const errors = [];
    const warnings = [];
    const products = Array.isArray(forward.products) ? forward.products : [];
    const rollbackProducts = Array.isArray(rollback.products) ? rollback.products : [];
    const policy = getProductFieldPatchPolicy('arabic-seo-v1');
    const fields = policy.allowedFields;

    if (!forward.meta || forward.meta.policy !== 'arabic-seo-v1' || forward.meta.operation !== 'forward') {
        errors.push('Forward patch metadata must use arabic-seo-v1 / forward.');
    }
    if (!rollback.meta || rollback.meta.policy !== 'arabic-seo-v1' || rollback.meta.operation !== 'rollback') {
        errors.push('Rollback patch metadata must use arabic-seo-v1 / rollback.');
    }
    validateArabicSeoPatchPair(forward, rollback).errors.forEach((message) => errors.push(message));
    if (!products.length) errors.push('Forward patch has no products.');
    if (products.length !== rollbackProducts.length) errors.push('Forward and rollback product counts differ.');

    const rowIds = products.map((product) => Number(product.row_id));
    const slugs = products.map((product) => text(product.slug));
    const legacyIds = products.map((product) => text(product.legacy_id));
    if (unique(rowIds).length !== rowIds.length) errors.push('Forward patch has duplicate row IDs.');
    if (unique(slugs).length !== slugs.length) errors.push('Forward patch has duplicate slugs.');
    if (unique(legacyIds).length !== legacyIds.length) errors.push('Forward patch has duplicate legacy IDs.');

    const rollbackByRow = new Map(rollbackProducts.map((product) => [Number(product.row_id), product]));
    const sourceByRow = source
        ? new Map((source.products || []).map((product) => [Number(product.id), product]))
        : new Map();
    const titles = new Map();
    const descriptions = new Map();
    const details = [];

    products.forEach((product) => {
        const prefix = `product ${product.row_id}`;
        const rollbackProduct = rollbackByRow.get(Number(product.row_id));
        fields.forEach((field) => {
            if (typeof product.expected?.[field] !== 'string') errors.push(`${prefix}: expected.${field} must be a string.`);
            if (typeof product.target?.[field] !== 'string') errors.push(`${prefix}: target.${field} must be a string.`);
            const fieldErrors = policy.validateChange({
                field,
                expected: text(product.expected?.[field]),
                target: text(product.target?.[field]),
                operation: 'forward'
            });
            fieldErrors.forEach((error) => errors.push(`${prefix} ${field}: ${error}`));
        });

        if (sourceSnapshotHash(product) !== text(product.sourceSnapshotHash).toLowerCase()) {
            errors.push(`${prefix}: sourceSnapshotHash does not match embedded source fields.`);
        }
        if (!rollbackProduct) {
            errors.push(`${prefix}: missing rollback product.`);
        } else {
            ['slug', 'legacy_id', 'status'].forEach((field) => {
                if (text(rollbackProduct[field]) !== text(product[field])) errors.push(`${prefix}: rollback ${field} mismatch.`);
            });
            fields.forEach((field) => {
                if (text(rollbackProduct.expected?.[field]) !== text(product.target?.[field])) {
                    errors.push(`${prefix}: rollback expected.${field} is not the forward target.`);
                }
                if (text(rollbackProduct.target?.[field]) !== text(product.expected?.[field])) {
                    errors.push(`${prefix}: rollback target.${field} is not the forward expected value.`);
                }
            });
        }

        const title = text(product.target?.seo_title_ar).trim();
        const description = text(product.target?.seo_description_ar).trim();
        if (titles.has(title)) errors.push(`${prefix}: duplicate title with product ${titles.get(title)}.`);
        else titles.set(title, product.row_id);
        if (descriptions.has(description)) errors.push(`${prefix}: duplicate description with product ${descriptions.get(description)}.`);
        else descriptions.set(description, product.row_id);

        const sourceNumbers = numericTokens(sourceText(product));
        const targetNumbers = numericTokens(targetText(product));
        const sourceUnits = unitTokens(sourceText(product));
        const targetUnits = unitTokens(targetText(product));
        const unknownNumbers = setDifference(targetNumbers, sourceNumbers);
        const unknownUnits = setDifference(targetUnits, sourceUnits);
        if (unknownNumbers.length) errors.push(`${prefix}: target contains unknown numeric tokens: ${unknownNumbers.join(', ')}.`);
        if (unknownUnits.length) errors.push(`${prefix}: target contains unknown unit/code tokens: ${unknownUnits.join(', ')}.`);

        if (source) compareSourceProduct(product, sourceByRow.get(Number(product.row_id)), errors);
        details.push({
            product,
            sourceNumbers,
            targetNumbers,
            sourceUnits,
            targetUnits,
            unknownNumbers,
            unknownUnits
        });
    });

    if (source) {
        const sourceIds = (source.products || []).map((product) => Number(product.id)).sort((a, b) => a - b);
        const patchIds = rowIds.slice().sort((a, b) => a - b);
        const missing = setDifference(sourceIds, patchIds);
        const extra = setDifference(patchIds, sourceIds);
        if (missing.length || extra.length) errors.push(`Source/patch product set differs. Missing=${missing.join(',')} Extra=${extra.join(',')}`);
    } else {
        warnings.push('No production source export supplied; embedded source snapshots were checked only for internal consistency.');
    }

    return { errors, warnings, details };
}

function buildApprovalMarkdown(forward, audit) {
    const lines = [
        '# 产品阿语 SEO 内容审批清单',
        '',
        `- 生成时间：${new Date().toISOString()}`,
        `- 产品数：${forward.products.length}`,
        `- 自动检查：${audit.errors.length ? `失败（${audit.errors.length} 项）` : '通过'}`,
        '- 独立阿语审查：待完成',
        '- 生产写入授权：未授权',
        '',
        '> 本文件仅用于内容审批，不代表已写入生产数据库。来源字段、状态或版本变化后，对应产品必须重新生成并重新审批。',
        ''
    ];

    audit.details.forEach((detail) => {
        const product = detail.product;
        const source = product.sourceExpected;
        const sourceSummary = text(source.description_ar).replace(/\s+/g, ' ').trim();
        lines.push(
            `## ${product.row_id}. ${product.slug}`,
            '',
            `- Legacy ID：${product.legacy_id}`,
            `- 状态：${product.status}`,
            `- 版本：${product.expectedVersion}`,
            `- 来源 SHA-256：\`${product.sourceSnapshotHash}\``,
            `- 当前阿语名称：${source.name_ar}`,
            `- 当前阿语简介：${source.short_desc_ar}`,
            `- 当前阿语详情摘要：${sourceSummary.slice(0, 300)}${sourceSummary.length > 300 ? '…' : ''}`,
            `- 拟写入 SEO 标题：${product.target.seo_title_ar}`,
            `- 拟写入 SEO 描述：${product.target.seo_description_ar}`,
            `- 拟写入 SEO 关键词：${product.target.seo_keywords_ar}`,
            `- 目标数字/单位：${detail.targetNumbers.concat(detail.targetUnits).join('、') || '无'}`,
            `- 来源外数字/单位：${detail.unknownNumbers.concat(detail.unknownUnits).join('、') || '无'}`,
            `- 自动规则：${detail.unknownNumbers.length || detail.unknownUnits.length ? '需修正' : '通过'}`,
            '- 独立阿语审查结论：待审查',
            '- 技术事实歧义：待审查窗口确认',
            ''
        );
    });
    return `${lines.join('\n')}\n`;
}

function buildReportMarkdown(forward, audit) {
    const lines = [
        '# 产品阿语 SEO 补丁审计',
        '',
        `- 产品数：${forward.products.length}`,
        `- 字段变化数：${forward.products.length * 3}`,
        `- Errors：${audit.errors.length}`,
        `- Warnings：${audit.warnings.length}`,
        ''
    ];
    if (audit.errors.length) lines.push('## Errors', '', ...audit.errors.map((error) => `- ${error}`), '');
    if (audit.warnings.length) lines.push('## Warnings', '', ...audit.warnings.map((warning) => `- ${warning}`), '');
    return `${lines.join('\n')}\n`;
}

function writeOptional(filePath, content) {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
}

function main(argv) {
    const args = parseArgs(argv || process.argv);
    const forward = readPatchJson(args.forward);
    const rollback = readPatchJson(args.rollback);
    const source = args.source ? readPatchJson(args.source) : null;
    const audit = auditPatches(forward, rollback, source);
    writeOptional(args.approval, buildApprovalMarkdown(forward, audit));
    writeOptional(args.report, buildReportMarkdown(forward, audit));
    if (audit.errors.length) {
        audit.errors.slice(0, 20).forEach((error) => console.error(`Error: ${error}`));
        console.error(`Arabic SEO audit failed with ${audit.errors.length} error(s).`);
        process.exitCode = 1;
        return audit;
    }
    audit.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
    console.log(`Arabic SEO audit passed for ${forward.products.length} products and ${forward.products.length * 3} fields.`);
    return audit;
}

if (require.main === module) main(process.argv);

module.exports = {
    auditPatches,
    buildApprovalMarkdown,
    buildReportMarkdown,
    main,
    parseArgs
};
