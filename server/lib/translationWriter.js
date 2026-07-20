'use strict';

const { loadLocaleRegistry, normalizeCode, stableJson } = require('./localeRegistry');
const {
    overlayLifecycleAvailable,
    overlayLifecycleInitialized,
    validateContentBlockRevision,
    advanceContentBlockLegacyTitle,
    ContentBlockLifecycleError
} = require('./contentBlockLifecycle');

class TranslationError extends Error {
    constructor(code, message, status) {
        super(message);
        this.name = 'TranslationError';
        this.code = code;
        this.status = status || 422;
    }
}

const ENTITY_CONFIG = Object.freeze({
    product: {
        baseTable: 'products',
        translationTable: 'product_translations',
        foreignKey: 'product_id',
        fields: ['name', 'short_description', 'description', 'seo_title', 'seo_description', 'seo_keywords'],
        required: ['name'],
        versionedBase: true,
        schema: [
            { key: 'name', label: '名称', type: 'text', required: true },
            { key: 'short_description', label: '简短描述', type: 'textarea' },
            { key: 'description', label: '详细描述', type: 'textarea' },
            { key: 'seo_title', label: 'SEO 标题', type: 'text' },
            { key: 'seo_description', label: 'SEO 描述', type: 'textarea' },
            { key: 'seo_keywords', label: 'SEO 关键词', type: 'textarea' }
        ],
        legacyColumns: {
            en: { name: 'name_en', short_description: 'short_desc_en', description: 'description_en', seo_title: 'seo_title', seo_description: 'seo_description', seo_keywords: 'seo_keywords' },
            ar: { name: 'name_ar', short_description: 'short_desc_ar', description: 'description_ar', seo_title: 'seo_title_ar', seo_description: 'seo_description_ar', seo_keywords: 'seo_keywords_ar' },
            fr: { name: 'name_fr', short_description: 'short_desc_fr', description: 'description_fr', seo_title: 'seo_title_fr', seo_description: 'seo_description_fr', seo_keywords: 'seo_keywords_fr' },
            ru: { name: 'name_ru', short_description: 'short_desc_ru', description: 'description_ru', seo_title: 'seo_title_ru', seo_description: 'seo_description_ru', seo_keywords: 'seo_keywords_ru' }
        }
    },
    category: {
        baseTable: 'categories',
        translationTable: 'category_translations',
        foreignKey: 'category_id',
        fields: ['name'],
        required: ['name'],
        versionedBase: false,
        schema: [{ key: 'name', label: '分类名称', type: 'text', required: true }],
        legacyColumns: {
            en: { name: 'name_en' },
            ar: { name: 'name_ar' },
            fr: { name: 'name_fr' },
            ru: { name: 'name_ru' }
        }
    },
    certification: {
        baseTable: 'certifications',
        translationTable: 'certification_translations',
        foreignKey: 'certification_id',
        fields: ['name', 'category_label', 'issuer', 'description'],
        required: ['name'],
        versionedBase: true,
        schema: [
            { key: 'name', label: '证书名称', type: 'text', required: true },
            { key: 'category_label', label: '分类标签', type: 'text' },
            { key: 'issuer', label: '签发机构', type: 'text' },
            { key: 'description', label: '证书描述', type: 'textarea' }
        ],
        legacyColumns: {
            en: { name: 'name_en', category_label: 'category_label_en', issuer: 'issuer_en', description: 'description_en' },
            ar: { name: 'name_ar', category_label: 'category_label_ar', issuer: 'issuer_ar', description: 'description_ar' },
            fr: { name: 'name_fr', category_label: 'category_label_fr', issuer: 'issuer_fr', description: 'description_fr' },
            ru: { name: 'name_ru', category_label: 'category_label_ru', issuer: 'issuer_ru', description: 'description_ru' }
        }
    },
    content_block: {
        baseTable: 'content_blocks',
        translationTable: 'content_block_translations',
        foreignKey: 'content_block_id',
        fields: ['title', 'schema_version', 'translation_json', 'base_structure_hash'],
        editableFields: ['title', 'translation_json'],
        required: [],
        versionedBase: true,
        schema: [
            { key: 'title', label: '内容标题', type: 'text' },
            { key: 'translation_json', label: '翻译内容 JSON', type: 'json' }
        ],
        defaults: { title: '', schema_version: 1, translation_json: {}, base_structure_hash: '' },
        legacyColumns: {
            en: { title: 'title_en' },
            ar: { title: 'title_ar' },
            fr: {},
            ru: {}
        }
    }
});

function assertEntityType(entityType) {
    const config = ENTITY_CONFIG[entityType];
    if (!config) throw new TranslationError('INVALID_ENTITY_TYPE', 'Unsupported translation entity type.', 422);
    return config;
}

function text(value) {
    return value == null ? '' : String(value).trim();
}

function integer(value, fallback) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : fallback;
}

function nullableId(value) {
    if (value == null || value === '') return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseJsonObject(value) {
    if (value == null || value === '') return {};
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(String(value));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (error) {}
    throw new TranslationError('VALIDATION_ERROR', 'translation_json must be an object.', 422);
}

function normalizeFieldValue(field, value) {
    if (field === 'schema_version') return Math.max(1, integer(value, 1));
    if (field === 'translation_json') return parseJsonObject(value);
    return text(value);
}

function normalizedValues(config, source) {
    const defaults = config.defaults || {};
    return config.fields.reduce(function (result, field) {
        const value = source && Object.prototype.hasOwnProperty.call(source, field)
            ? source[field]
            : defaults[field];
        result[field] = normalizeFieldValue(field, value);
        return result;
    }, {});
}

function mergeEditableValues(config, base, incoming) {
    const allowed = new Set(config.editableFields || config.fields);
    const result = normalizedValues(config, base || {});
    Object.keys(incoming || {}).forEach(function (field) {
        if (!allowed.has(field)) {
            throw new TranslationError('VALIDATION_ERROR', 'Unsupported translation field: ' + field, 422);
        }
        result[field] = normalizeFieldValue(field, incoming[field]);
    });
    return result;
}

function storedValue(field, value) {
    return field === 'translation_json' ? stableJson(parseJsonObject(value)) : value;
}

function displayValue(field, value) {
    return field === 'translation_json' ? parseJsonObject(value) : (value == null ? '' : value);
}

function valuesEqual(config, left, right) {
    return stableJson(normalizedValues(config, left || {})) === stableJson(normalizedValues(config, right || {}));
}

function actorName(actor) {
    return text(actor && actor.username) || 'admin';
}

function immediate(db, callback) {
    if (db.inTransaction) return callback();
    return db.transaction(callback).immediate();
}

function createTranslationWriter(options) {
    const db = options && options.db;
    if (!db) throw new Error('createTranslationWriter requires db');
    const registry = options.registry || loadLocaleRegistry();

    function localeEntry(localeValue) {
        const locale = normalizeCode(localeValue);
        const entry = registry.get(locale);
        if (!entry) throw new TranslationError('INVALID_LOCALE', 'Unknown locale.', 422);
        return entry;
    }

    function entityRow(config, entityId) {
        const id = integer(entityId, null);
        const row = id == null ? null : db.prepare('SELECT * FROM ' + config.baseTable + ' WHERE id = ?').get(id);
        if (!row || row.status === 'deleted') {
            throw new TranslationError('NOT_FOUND', 'Translation entity not found.', 404);
        }
        return row;
    }

    function revisionRow(config, entityId, locale, state) {
        return db.prepare(`
            SELECT * FROM ${config.translationTable}
            WHERE ${config.foreignKey} = ? AND locale = ? AND revision_state = ?
            LIMIT 1
        `).get(entityId, locale, state) || null;
    }

    function revisionById(config, entityId, locale, revisionId) {
        return db.prepare(`
            SELECT * FROM ${config.translationTable}
            WHERE id = ? AND ${config.foreignKey} = ? AND locale = ?
            LIMIT 1
        `).get(revisionId, entityId, locale) || null;
    }

    function nextRevisionNo(config, entityId, locale) {
        return Number(db.prepare(`
            SELECT COALESCE(MAX(revision_no), 0) + 1 AS next_revision
            FROM ${config.translationTable}
            WHERE ${config.foreignKey} = ? AND locale = ?
        `).get(entityId, locale).next_revision);
    }

    function valuesFromRevision(config, row) {
        if (!row) return null;
        return config.fields.reduce(function (values, field) {
            values[field] = displayValue(field, row[field]);
            return values;
        }, {});
    }

    function legacyValues(config, row, locale, fallbackValues) {
        const mapping = config.legacyColumns[locale];
        const fallback = normalizedValues(config, fallbackValues || {});
        if (!mapping) return fallback;
        const result = { ...fallback };
        config.fields.forEach(function (field) {
            if (Object.prototype.hasOwnProperty.call(mapping, field)) {
                result[field] = normalizeFieldValue(field, row[mapping[field]]);
            }
        });
        return normalizedValues(config, result);
    }

    function productSpecs(productId) {
        return db.prepare(`
            SELECT id, spec_code, spec_group, spec_key, spec_value, unit, sort_order
            FROM product_specs
            WHERE product_id = ? AND spec_group != 'archived'
            ORDER BY sort_order, id
        `).all(productId).map(function (row) {
            return {
                id: row.id,
                specCode: row.spec_code || '',
                specGroup: row.spec_group || 'technical',
                specKey: row.spec_key || '',
                specValue: row.spec_value || '',
                unit: row.unit || '',
                sortOrder: Number(row.sort_order || 0)
            };
        });
    }

    function specValues(revisionId) {
        if (!revisionId) return [];
        return db.prepare(`
            SELECT value.product_spec_id, spec.spec_code, value.label, value.value_text
            FROM product_spec_translation_values value
            JOIN product_specs spec ON spec.id = value.product_spec_id
            WHERE value.product_translation_id = ?
            ORDER BY spec.sort_order, spec.id
        `).all(revisionId).map(function (row) {
            return {
                productSpecId: row.product_spec_id,
                specCode: row.spec_code || '',
                label: row.label || '',
                valueText: row.value_text || ''
            };
        });
    }

    function normalizeSpecValues(productId, values) {
        if (!Array.isArray(values)) {
            throw new TranslationError('VALIDATION_ERROR', 'specValues must be an array.', 422);
        }
        const specs = productSpecs(productId);
        const byId = new Map(specs.map(function (spec) { return [Number(spec.id), spec]; }));
        const seen = new Set();
        return values.map(function (value) {
            const productSpecId = integer(value && value.productSpecId, null);
            const spec = byId.get(productSpecId);
            if (!spec || !spec.specCode) {
                throw new TranslationError('SPEC_CODE_REQUIRED', 'Every translated specification requires a stable spec_code.', 422);
            }
            if (seen.has(productSpecId)) {
                throw new TranslationError('VALIDATION_ERROR', 'Duplicate translated specification.', 422);
            }
            seen.add(productSpecId);
            return {
                productSpecId,
                specCode: spec.specCode,
                label: text(value.label),
                valueText: text(value.valueText)
            };
        });
    }

    function replaceSpecValues(revisionId, productId, values) {
        const normalized = normalizeSpecValues(productId, values);
        db.prepare('DELETE FROM product_spec_translation_values WHERE product_translation_id = ?').run(revisionId);
        const insert = db.prepare(`
            INSERT INTO product_spec_translation_values
                (product_translation_id, product_spec_id, label, value_text)
            VALUES (?, ?, ?, ?)
        `);
        normalized.forEach(function (value) {
            insert.run(revisionId, value.productSpecId, value.label, value.valueText);
        });
    }

    function copySpecValues(sourceRevisionId, targetRevisionId) {
        if (!sourceRevisionId) return;
        db.prepare(`
            INSERT INTO product_spec_translation_values
                (product_translation_id, product_spec_id, label, value_text)
            SELECT ?, product_spec_id, label, value_text
            FROM product_spec_translation_values
            WHERE product_translation_id = ?
        `).run(targetRevisionId, sourceRevisionId);
    }

    function englishSpecValues(productId) {
        return productSpecs(productId).map(function (spec) {
            if (!spec.specCode) {
                throw new TranslationError('SPEC_CODE_REQUIRED', 'Every product specification requires a stable spec_code.', 422);
            }
            return {
                productSpecId: spec.id,
                specCode: spec.specCode,
                label: spec.specKey,
                valueText: spec.specValue
            };
        });
    }

    function compatibleSpecValues(productId, revisionId) {
        const existing = new Map(specValues(revisionId).map(function (item) {
            return [Number(item.productSpecId), item];
        }));
        return productSpecs(productId).map(function (spec) {
            const translated = existing.get(Number(spec.id));
            if (translated && text(translated.label) && text(translated.valueText)) return translated;
            return {
                productSpecId: spec.id,
                specCode: spec.specCode,
                label: spec.specKey,
                valueText: spec.specValue
            };
        });
    }

    function mapRevision(config, row) {
        if (!row) return null;
        const revision = {
            id: row.id,
            revisionNo: row.revision_no,
            state: row.revision_state,
            baseRevisionId: row.base_revision_id || null,
            version: row.version,
            values: valuesFromRevision(config, row),
            createdBy: row.created_by || '',
            updatedBy: row.updated_by || '',
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            publishedAt: row.published_at || null
        };
        if (config === ENTITY_CONFIG.product) revision.specValues = specValues(row.id);
        return revision;
    }

    function getState(input) {
        const config = assertEntityType(input.entityType);
        const entry = localeEntry(input.locale);
        const row = entityRow(config, input.entityId);
        const revisions = db.prepare(`
            SELECT * FROM ${config.translationTable}
            WHERE ${config.foreignKey} = ? AND locale = ?
            ORDER BY revision_no DESC
        `).all(row.id, entry.code);
        const published = revisions.find(function (revision) { return revision.revision_state === 'published'; }) || null;
        const draft = revisions.find(function (revision) { return revision.revision_state === 'draft'; }) || null;
        const mappedPublished = mapRevision(config, published);
        const mappedDraft = mapRevision(config, draft);
        if (mappedDraft) {
            mappedDraft.isStale = (mappedDraft.baseRevisionId || null) !== (mappedPublished ? mappedPublished.id : null);
        }
        return {
            entityType: input.entityType,
            entity: {
                id: row.id,
                label: row.name_en || row.title_en || row.slug || row.legacy_id || ('#' + row.id),
                status: row.status == null ? (Number(row.is_active) === 1 ? 'active' : 'inactive') : row.status
            },
            locale: {
                code: entry.code,
                label: entry.label,
                nativeLabel: entry.nativeLabel,
                dir: entry.dir,
                state: entry.state,
                isPublic: entry.isPublic
            },
            schema: config.schema,
            published: mappedPublished,
            draft: mappedDraft,
            history: revisions.filter(function (revision) { return revision.revision_state === 'archived'; }).map(function (revision) {
                return mapRevision(config, revision);
            }),
            specs: config === ENTITY_CONFIG.product ? productSpecs(row.id) : []
        };
    }

    function insertRevision(config, entityId, locale, state, values, metadata) {
        const fields = config.fields;
        const columns = [config.foreignKey, 'locale', 'revision_no', 'revision_state', 'base_revision_id']
            .concat(fields)
            .concat(['version', 'created_by', 'updated_by', 'created_at', 'updated_at', 'published_at']);
        const parameters = columns.map(function (column) { return '@' + column; }).join(', ');
        const data = {
            [config.foreignKey]: entityId,
            locale,
            revision_no: metadata.revisionNo,
            revision_state: state,
            base_revision_id: metadata.baseRevisionId || null,
            version: 1,
            created_by: metadata.username,
            updated_by: metadata.username,
            created_at: metadata.now,
            updated_at: metadata.now,
            published_at: state === 'published' ? metadata.now : null
        };
        fields.forEach(function (field) { data[field] = storedValue(field, values[field]); });
        const result = db.prepare(`
            INSERT INTO ${config.translationTable} (${columns.join(', ')})
            VALUES (${parameters})
        `).run(data);
        return Number(result.lastInsertRowid);
    }

    function audit(actor, entityType, entityId, locale, action, before, after) {
        const actorValue = actor || {};
        db.prepare(`
            INSERT INTO audit_logs
                (entity_type, entity_id, action, performed_by, request_id, before_json, after_json, ip, user_agent, created_at)
            VALUES
                (@entity_type, @entity_id, @action, @performed_by, @request_id, @before_json, @after_json, @ip, @user_agent, @created_at)
        `).run({
            entity_type: 'translation_' + entityType,
            entity_id: String(entityId) + ':' + locale,
            action,
            performed_by: actorName(actorValue),
            request_id: text(actorValue.requestId) || null,
            before_json: before ? JSON.stringify(before) : null,
            after_json: after ? JSON.stringify(after) : null,
            ip: text(actorValue.ip),
            user_agent: text(actorValue.userAgent),
            created_at: Date.now()
        });
    }

    function validatePublish(config, values, entityId, revisionId) {
        const missing = config.required.filter(function (field) { return !text(values[field]); });
        if (missing.length) {
            throw new TranslationError('VALIDATION_ERROR', 'Required translation fields are empty: ' + missing.join(', '), 422);
        }
        if (config === ENTITY_CONFIG.content_block && overlayLifecycleAvailable(db)) {
            const revision = db.prepare('SELECT * FROM content_block_translations WHERE id = ? AND content_block_id = ?').get(revisionId, entityId);
            validateContentBlockRevision({ db, registry, contentBlockId: entityId, revision });
            return;
        }
        if (config !== ENTITY_CONFIG.product) return;
        const specs = productSpecs(entityId);
        const translatedById = new Map(specValues(revisionId).map(function (item) {
            return [Number(item.productSpecId), item];
        }));
        const missingSpecs = specs.filter(function (spec) {
            const translated = translatedById.get(Number(spec.id));
            return !translated || !text(translated.label) || !text(translated.valueText);
        });
        if (missingSpecs.length) {
            throw new TranslationError(
                'SPEC_TRANSLATION_INCOMPLETE',
                'Every active product specification requires a translated label and value before publishing.',
                422
            );
        }
    }

    function mirrorLegacy(config, entityId, locale, values, now) {
        if (config === ENTITY_CONFIG.content_block && overlayLifecycleAvailable(db)) {
            return advanceContentBlockLegacyTitle({
                db,
                registry,
                contentBlockId: entityId,
                locale,
                title: values.title
            });
        }
        const mapping = config.legacyColumns[locale];
        if (!mapping || !Object.keys(mapping).length) return false;
        const assignments = Object.keys(mapping).map(function (field) {
            return mapping[field] + ' = @' + field;
        });
        const data = { id: entityId, updated_at: now };
        Object.keys(mapping).forEach(function (field) { data[field] = storedValue(field, values[field]); });
        if (config.versionedBase) assignments.push('version = COALESCE(version, 0) + 1');
        assignments.push('updated_at = @updated_at');
        db.prepare(`UPDATE ${config.baseTable} SET ${assignments.join(', ')} WHERE id = @id`).run(data);
        return true;
    }

    function assertLegacyContentWriteAllowed(config, base) {
        if (config !== ENTITY_CONFIG.content_block || !overlayLifecycleInitialized(db)) return;
        throw new ContentBlockLifecycleError(
            'CONTENT_OVERLAY_REBASE_REQUIRED',
            'Legacy content writes must use the content block lifecycle after Overlay activation.',
            409
        );
    }

    function saveDraft(input) {
        const config = assertEntityType(input.entityType);
        const entry = localeEntry(input.locale);
        const entityId = integer(input.entityId, null);
        return immediate(db, function () {
            const base = entityRow(config, entityId);
            const draft = revisionRow(config, base.id, entry.code, 'draft');
            const published = revisionRow(config, base.id, entry.code, 'published');
            const expectedVersion = integer(input.expectedVersion, 0);
            if (draft && expectedVersion !== Number(draft.version)) {
                throw new TranslationError('VERSION_CONFLICT', 'Translation draft version conflict.', 409);
            }
            if (!draft && expectedVersion !== 0) {
                throw new TranslationError('VERSION_CONFLICT', 'Translation draft version conflict.', 409);
            }
            const sourceValues = draft
                ? valuesFromRevision(config, draft)
                : (published ? valuesFromRevision(config, published) : legacyValues(config, base, entry.code));
            const values = mergeEditableValues(config, sourceValues, input.values || {});
            const now = Date.now();
            const username = actorName(input.actor);
            let draftId;
            if (draft) {
                const assignments = config.fields.map(function (field) { return field + ' = @' + field; });
                const data = { id: draft.id, updated_by: username, updated_at: now };
                config.fields.forEach(function (field) { data[field] = storedValue(field, values[field]); });
                db.prepare(`
                    UPDATE ${config.translationTable}
                    SET ${assignments.join(', ')}, version = version + 1, updated_by = @updated_by, updated_at = @updated_at
                    WHERE id = @id AND revision_state = 'draft'
                `).run(data);
                draftId = draft.id;
            } else {
                draftId = insertRevision(config, base.id, entry.code, 'draft', values, {
                    revisionNo: nextRevisionNo(config, base.id, entry.code),
                    baseRevisionId: published ? published.id : null,
                    username,
                    now
                });
                if (config === ENTITY_CONFIG.product && published && input.specValues === undefined) {
                    copySpecValues(published.id, draftId);
                }
            }
            if (config === ENTITY_CONFIG.product && input.specValues !== undefined) {
                replaceSpecValues(draftId, base.id, input.specValues);
            }
            audit(input.actor, input.entityType, base.id, entry.code, 'save_draft', draft ? mapRevision(config, draft) : null, { id: draftId, values });
            return getState({ entityType: input.entityType, entityId: base.id, locale: entry.code });
        });
    }

    function assertPublishedExpectation(actual, expected) {
        const expectedId = nullableId(expected);
        const actualId = actual ? Number(actual.id) : null;
        if (actualId !== expectedId) {
            throw new TranslationError('PUBLISHED_VERSION_CONFLICT', 'Published translation changed; reload the draft before publishing.', 409);
        }
    }

    function publishDraft(input) {
        const config = assertEntityType(input.entityType);
        const entry = localeEntry(input.locale);
        const entityId = integer(input.entityId, null);
        return immediate(db, function () {
            const base = entityRow(config, entityId);
            const draft = revisionRow(config, base.id, entry.code, 'draft');
            const published = revisionRow(config, base.id, entry.code, 'published');
            if (!draft) throw new TranslationError('NOT_FOUND', 'Translation draft not found.', 404);
            if (integer(input.expectedDraftVersion, null) !== Number(draft.version)) {
                throw new TranslationError('VERSION_CONFLICT', 'Translation draft version conflict.', 409);
            }
            assertPublishedExpectation(published, input.expectedPublishedRevisionId);
            if ((draft.base_revision_id || null) !== (published ? published.id : null)) {
                throw new TranslationError('PUBLISHED_VERSION_CONFLICT', 'Published translation changed; reload the draft before publishing.', 409);
            }
            const values = valuesFromRevision(config, draft);
            validatePublish(config, values, base.id, draft.id);
            const before = published ? mapRevision(config, published) : null;
            const now = Date.now();
            const username = actorName(input.actor);
            if (published) {
                db.prepare(`
                    UPDATE ${config.translationTable}
                    SET revision_state = 'archived', version = version + 1, updated_by = ?, updated_at = ?
                    WHERE id = ? AND revision_state = 'published'
                `).run(username, now, published.id);
            }
            db.prepare(`
                UPDATE ${config.translationTable}
                SET revision_state = 'published', version = version + 1, updated_by = ?, updated_at = ?, published_at = ?
                WHERE id = ? AND revision_state = 'draft'
            `).run(username, now, now, draft.id);
            mirrorLegacy(config, base.id, entry.code, values, now);
            const after = revisionById(config, base.id, entry.code, draft.id);
            audit(input.actor, input.entityType, base.id, entry.code, 'publish', before, mapRevision(config, after));
            return getState({ entityType: input.entityType, entityId: base.id, locale: entry.code });
        });
    }

    function restoreRevision(input) {
        const config = assertEntityType(input.entityType);
        const entry = localeEntry(input.locale);
        const entityId = integer(input.entityId, null);
        return immediate(db, function () {
            const base = entityRow(config, entityId);
            const published = revisionRow(config, base.id, entry.code, 'published');
            assertPublishedExpectation(published, input.expectedPublishedRevisionId);
            const target = revisionById(config, base.id, entry.code, integer(input.revisionId, null));
            if (!target || target.revision_state !== 'archived') {
                throw new TranslationError('NOT_FOUND', 'Archived translation revision not found.', 404);
            }
            const values = valuesFromRevision(config, target);
            validatePublish(config, values, base.id, target.id);
            const now = Date.now();
            const username = actorName(input.actor);
            if (published) {
                db.prepare(`
                    UPDATE ${config.translationTable}
                    SET revision_state = 'archived', version = version + 1, updated_by = ?, updated_at = ?
                    WHERE id = ? AND revision_state = 'published'
                `).run(username, now, published.id);
            }
            db.prepare(`
                UPDATE ${config.translationTable}
                SET revision_state = 'published', version = version + 1, updated_by = ?, updated_at = ?, published_at = ?
                WHERE id = ? AND revision_state = 'archived'
            `).run(username, now, now, target.id);
            mirrorLegacy(config, base.id, entry.code, values, now);
            const after = revisionById(config, base.id, entry.code, target.id);
            audit(input.actor, input.entityType, base.id, entry.code, 'restore', published ? mapRevision(config, published) : null, mapRevision(config, after));
            return getState({ entityType: input.entityType, entityId: base.id, locale: entry.code });
        });
    }

    function syncLegacyPublished(input) {
        const config = assertEntityType(input.entityType);
        const entityId = integer(input.entityId, null);
        return immediate(db, function () {
            const base = entityRow(config, entityId);
            assertLegacyContentWriteAllowed(config, base);
            const locales = Array.isArray(input.locales) && input.locales.length
                ? input.locales.map(function (locale) { return localeEntry(locale).code; })
                : registry.publicEntries.map(function (entry) { return entry.code; });
            let changed = 0;
            locales.forEach(function (locale) {
                const current = revisionRow(config, base.id, locale, 'published');
                const draft = revisionRow(config, base.id, locale, 'draft');
                const currentValues = current ? valuesFromRevision(config, current) : null;
                const values = legacyValues(config, base, locale, currentValues);
                let desiredSpecs = [];
                if (config === ENTITY_CONFIG.product) {
                    desiredSpecs = locale === 'en' || !current
                        ? englishSpecValues(base.id)
                        : compatibleSpecValues(base.id, current.id);
                }
                const sameValues = current && valuesEqual(config, currentValues, values);
                const sameSpecs = config !== ENTITY_CONFIG.product || stableJson(specValues(current && current.id)) === stableJson(desiredSpecs);
                if (sameValues && sameSpecs) return;
                if (draft) {
                    throw new TranslationError('DRAFT_CONFLICT', 'Discard or publish the existing draft before importing legacy content.', 409);
                }
                const now = Date.now();
                const username = actorName(input.actor);
                if (current) {
                    db.prepare(`
                        UPDATE ${config.translationTable}
                        SET revision_state = 'archived', version = version + 1, updated_by = ?, updated_at = ?
                        WHERE id = ? AND revision_state = 'published'
                    `).run(username, now, current.id);
                }
                const revisionId = insertRevision(config, base.id, locale, 'published', values, {
                    revisionNo: nextRevisionNo(config, base.id, locale),
                    baseRevisionId: null,
                    username,
                    now
                });
                if (config === ENTITY_CONFIG.product && desiredSpecs.length) {
                    replaceSpecValues(revisionId, base.id, desiredSpecs);
                }
                audit(input.actor, input.entityType, base.id, locale, 'sync_legacy', current ? mapRevision(config, current) : null, mapRevision(config, revisionById(config, base.id, locale, revisionId)));
                changed += 1;
            });
            return { entityType: input.entityType, entityId: base.id, changed, checked: locales.length };
        });
    }

    function publishLegacyWrite(input) {
        const config = assertEntityType(input.entityType);
        const entityId = integer(input.entityId, null);
        return immediate(db, function () {
            const base = entityRow(config, entityId);
            assertLegacyContentWriteAllowed(config, base);
            const locales = Array.isArray(input.locales) && input.locales.length
                ? input.locales.map(function (locale) { return localeEntry(locale).code; })
                : registry.publicEntries.map(function (entry) { return entry.code; });
            let changed = 0;
            locales.forEach(function (locale) {
                const published = revisionRow(config, base.id, locale, 'published');
                const publishedValues = published ? valuesFromRevision(config, published) : null;
                const values = legacyValues(config, base, locale, publishedValues);
                let desiredSpecs = [];
                if (config === ENTITY_CONFIG.product) {
                    desiredSpecs = locale === 'en' || !published
                        ? englishSpecValues(base.id)
                        : compatibleSpecValues(base.id, published.id);
                }
                const sameValues = published && valuesEqual(config, publishedValues, values);
                const sameSpecs = config !== ENTITY_CONFIG.product
                    || stableJson(specValues(published && published.id)) === stableJson(desiredSpecs);
                if (sameValues && sameSpecs) return;
                if (revisionRow(config, base.id, locale, 'draft')) {
                    throw new TranslationError('DRAFT_CONFLICT', 'Discard or publish the existing draft before saving the legacy form.', 409);
                }
                const now = Date.now();
                const username = actorName(input.actor);
                const draftId = insertRevision(config, base.id, locale, 'draft', values, {
                    revisionNo: nextRevisionNo(config, base.id, locale),
                    baseRevisionId: published ? published.id : null,
                    username,
                    now
                });
                if (config === ENTITY_CONFIG.product && desiredSpecs.length) {
                    replaceSpecValues(draftId, base.id, desiredSpecs);
                }
                validatePublish(config, values, base.id, draftId);
                if (published) {
                    db.prepare(`
                        UPDATE ${config.translationTable}
                        SET revision_state = 'archived', version = version + 1, updated_by = ?, updated_at = ?
                        WHERE id = ? AND revision_state = 'published'
                    `).run(username, now, published.id);
                }
                db.prepare(`
                    UPDATE ${config.translationTable}
                    SET revision_state = 'published', version = version + 1, updated_by = ?, updated_at = ?, published_at = ?
                    WHERE id = ? AND revision_state = 'draft'
                `).run(username, now, now, draftId);
                const after = revisionById(config, base.id, locale, draftId);
                audit(input.actor, input.entityType, base.id, locale, 'legacy_save_publish', published ? mapRevision(config, published) : null, mapRevision(config, after));
                changed += 1;
            });
            return { entityType: input.entityType, entityId: base.id, changed, checked: locales.length };
        });
    }

    function discardDraft(input) {
        const config = assertEntityType(input.entityType);
        const entry = localeEntry(input.locale);
        const entityId = integer(input.entityId, null);
        return immediate(db, function () {
            const base = entityRow(config, entityId);
            const draft = revisionRow(config, base.id, entry.code, 'draft');
            if (!draft) throw new TranslationError('NOT_FOUND', 'Translation draft not found.', 404);
            if (integer(input.expectedDraftVersion, null) !== Number(draft.version)) {
                throw new TranslationError('VERSION_CONFLICT', 'Translation draft version conflict.', 409);
            }
            const before = mapRevision(config, draft);
            const deleted = db.prepare(`
                DELETE FROM ${config.translationTable}
                WHERE id = ? AND revision_state = 'draft' AND version = ?
            `).run(draft.id, draft.version);
            if (deleted.changes !== 1) {
                throw new TranslationError('VERSION_CONFLICT', 'Translation draft changed before it could be discarded.', 409);
            }
            audit(input.actor, input.entityType, base.id, entry.code, 'discard_draft', before, null);
            return getState({ entityType: input.entityType, entityId: base.id, locale: entry.code });
        });
    }

    function inspectLegacy(input) {
        const config = assertEntityType(input.entityType);
        const entry = localeEntry(input.locale);
        const base = entityRow(config, input.entityId);
        const published = revisionRow(config, base.id, entry.code, 'published');
        const publishedValues = published ? valuesFromRevision(config, published) : null;
        const legacy = legacyValues(config, base, entry.code, publishedValues);
        return {
            entityType: input.entityType,
            entityId: base.id,
            locale: entry.code,
            hasPublished: Boolean(published),
            publishedRevisionId: published ? published.id : null,
            matches: Boolean(published && valuesEqual(config, publishedValues, legacy)),
            legacyValues: legacy,
            publishedValues
        };
    }

    function listEntities(input) {
        const config = assertEntityType(input.entityType);
        const rows = db.prepare('SELECT * FROM ' + config.baseTable + ' ORDER BY id').all();
        return rows.filter(function (row) { return row.status !== 'deleted'; }).map(function (row) {
            return {
                id: row.id,
                label: row.name_en || row.title_en || row.slug || row.legacy_id || ('#' + row.id),
                status: row.status == null ? (Number(row.is_active) === 1 ? 'active' : 'inactive') : row.status
            };
        });
    }

    function getEntitySchema(entityType) {
        const config = assertEntityType(entityType);
        return config.schema.map(function (field) { return { ...field }; });
    }

    return Object.freeze({
        getState,
        saveDraft,
        publishDraft,
        restoreRevision,
        discardDraft,
        syncLegacyPublished,
        publishLegacyWrite,
        inspectLegacy,
        listEntities,
        getEntitySchema
    });
}

module.exports = {
    ENTITY_CONFIG,
    TranslationError,
    createTranslationWriter
};
