'use strict';

const crypto = require('crypto');
const { stableJson } = require('./localeRegistry');
const { compactLocalizedTree, stripPrivateContentMetadata } = require('./publicContentBlocks');

const OVERLAY_VERSION = 1;
const CONTENT_SCHEMA_VERSION = 2;
const STABLE_ID_KEY = '_translationId';
const LOCALE_CODES = Object.freeze(['en', 'ar', 'fr', 'ru']);

const TRANSLATABLE_FIELDS = new Set([
    'aboutDetail', 'aboutIntro', 'accept', 'address', 'allLabel', 'allProductsLabel', 'allow', 'alt',
    'analytics', 'analyticsDesc', 'answer', 'backLabel', 'bestFor', 'body', 'breadcrumbLabel', 'bullets',
    'buttonText', 'capacitiesLabel', 'caption', 'categoryLabel', 'close', 'companyName', 'cookieSettingsLabel',
    'copyright', 'customize', 'defaultSubtitle', 'deliverables', 'description', 'descriptionLabel',
    'displayAddress', 'emailLabel', 'emailPlaceholder', 'errorText', 'eyebrow', 'factoryAddressLabel',
    'factoryArea', 'faqLoading', 'faqTitle', 'floatingLabel', 'footerText', 'functional', 'functionalDesc',
    'generalInquiryLabel', 'heading', 'headquarters', 'hiddenName', 'homeLabel', 'huaiyangBase', 'imageLabel',
    'indexLabel', 'infoTitle', 'inquiry', 'inquiryLoading', 'intro', 'items', 'kicker', 'label',
    'loadMoreLabel', 'loadingText', 'loadingTitle', 'logoAlt', 'mapLabel', 'mapSubLabel', 'mapTitle',
    'messagePlaceholder', 'meta', 'modalSubmitLabel', 'modalText', 'modalTitle', 'name', 'necessary',
    'necessaryDesc', 'note', 'officeHours', 'officeLabel', 'outcomes', 'overview', 'parameters',
    'phonePlaceholder', 'placeholder', 'printLabel', 'productContext', 'productIdMessageTemplate',
    'productLabel', 'productMessageTemplate', 'productName', 'productsLabel', 'productsTitle', 'question',
    'quickTitle', 'registeredCapital', 'reject', 'relatedProducts', 'relatedTitle', 'save', 'schemaBrand',
    'searchLabel', 'searchPlaceholder', 'seoTitle', 'socialTitle', 'specificationLabel', 'specifications',
    'specsTitle', 'strong', 'submitLabel', 'subtitle', 'summary', 'supportLoading', 'tagline', 'tags',
    'text', 'title', 'titleSuffix', 'voltagesLabel'
]);

const REPLACEABLE_ARRAY_FIELDS = new Set([
    'body', 'bullets', 'deliverables', 'fields', 'items', 'outcomes', 'parameters', 'tags'
]);
const stripTranslationMetadata = stripPrivateContentMetadata;

class ContentOverlayError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'ContentOverlayError';
        this.code = code;
        this.details = details || null;
    }
}

function plainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!plainObject(value)) return value;
    return Object.keys(value).reduce(function (result, key) {
        result[key] = clone(value[key]);
        return result;
    }, {});
}

function sha256(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizedToken(value) {
    return String(value || '').trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function languageMetadataKey(key) {
    const value = String(key || '');
    if (/Patch(?:En|Ar|Fr|Ru|Pt)$/i.test(value)) return true;
    if (/_patch_(?:en|ar|fr|ru|pt)$/i.test(value)) return true;
    if (/_(?:en|ar|fr|ru|pt|cn)$/i.test(value)) return true;
    return /(?:En|Ar|Fr|Ru|Pt|CN)$/.test(value);
}

function stableItemId(slug, path, item, index) {
    const identity = ['id', 'slug', 'key', 'href', 'hash'].map(function (key) {
        return item && item[key] != null ? String(item[key]).trim() : '';
    }).find(Boolean) || 'index-' + index;
    const readable = normalizedToken(identity).slice(0, 28) || 'item-' + index;
    const digest = sha256([slug, path.join('/'), identity, index].join('|')).slice(0, 10);
    return readable + '-' + digest;
}

function ensureStableArrayIds(bodyValue, slugValue) {
    const body = clone(bodyValue || {});
    const slug = normalizedToken(slugValue) || 'content';
    const assigned = [];
    const blockers = [];

    function visit(value, path, languageBranch) {
        if (Array.isArray(value)) {
            if (!languageBranch) {
                const seen = new Set();
                value.forEach(function (item, index) {
                    if (!plainObject(item)) return;
                    let id = String(item[STABLE_ID_KEY] || '').trim();
                    if (!id) {
                        id = stableItemId(slug, path, item, index);
                        item[STABLE_ID_KEY] = id;
                        assigned.push({ path: encodePath(path), index, id });
                    }
                    if (seen.has(id)) {
                        blockers.push({ code: 'DUPLICATE_STABLE_ID', path: encodePath(path), id });
                    }
                    seen.add(id);
                });
            }
            value.forEach(function (item, index) {
                visit(item, path.concat('[' + index + ']'), languageBranch);
            });
            return;
        }
        if (!plainObject(value)) return;
        Object.keys(value).forEach(function (key) {
            visit(value[key], path.concat(key), languageBranch || languageMetadataKey(key));
        });
    }

    visit(body, [], false);
    return { body, assigned, blockers };
}

function inheritableNeutralArrayMetadata(value) {
    return value === null || typeof value === 'number' || typeof value === 'boolean';
}

function inheritMissingNeutralArrayMetadata(baseItem, targetItem) {
    Object.keys(baseItem).forEach(function (key) {
        if (key === STABLE_ID_KEY || Object.prototype.hasOwnProperty.call(targetItem, key)) return;
        if (inheritableNeutralArrayMetadata(baseItem[key])) targetItem[key] = baseItem[key];
    });
}

function inheritLegacyArrayIds(baseValue, targetValue) {
    if (Array.isArray(baseValue) && Array.isArray(targetValue)) {
        const objectArrays = baseValue.length === targetValue.length
            && baseValue.every(plainObject)
            && targetValue.every(plainObject);
        if (objectArrays) {
            targetValue.forEach(function (item, index) {
                if (!item[STABLE_ID_KEY] && baseValue[index][STABLE_ID_KEY]) {
                    item[STABLE_ID_KEY] = baseValue[index][STABLE_ID_KEY];
                }
                inheritMissingNeutralArrayMetadata(baseValue[index], item);
                inheritLegacyArrayIds(baseValue[index], item);
            });
        }
        return targetValue;
    }
    if (!plainObject(baseValue) || !plainObject(targetValue)) return targetValue;
    Object.keys(targetValue).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(baseValue, key)) {
            inheritLegacyArrayIds(baseValue[key], targetValue[key]);
        }
    });
    return targetValue;
}

function escapeSegment(value) {
    return String(value).replace(/~/g, '~0').replace(/\//g, '~1');
}

function unescapeSegment(value) {
    return String(value).replace(/~1/g, '/').replace(/~0/g, '~');
}

function encodePath(segments) {
    return '/' + (segments || []).map(escapeSegment).join('/');
}

function decodePath(value) {
    const path = String(value || '');
    if (!path.startsWith('/')) throw new ContentOverlayError('INVALID_OVERLAY_PATH', 'Overlay paths must start with /.', { path });
    if (path === '/') return [];
    return path.slice(1).split('/').map(unescapeSegment);
}

function primitiveItemSelectors(items) {
    const occurrences = {};
    return (items || []).map(function (item) {
        const source = stableJson(item);
        const count = occurrences[source] || 0;
        occurrences[source] = count + 1;
        return '$' + sha256(source + '|' + count).slice(0, 14);
    });
}

function pathField(path) {
    for (let index = path.length - 1; index >= 0; index -= 1) {
        const segment = String(path[index] || '');
        if (!segment.startsWith('@') && !segment.startsWith('$') && !/^\[\d+\]$/.test(segment)) return segment;
    }
    return '';
}

function translatablePath(path, value) {
    if (typeof value !== 'string') return false;
    const field = pathField(path);
    if (!TRANSLATABLE_FIELDS.has(field)) return false;
    const text = value.trim();
    if (!text) return true;
    if (/^(?:https?:\/\/|mailto:|tel:|assets\/|uploads\/)/i.test(text)) return false;
    if (/\.(?:avif|gif|jpe?g|png|svg|webp|pdf)(?:\?.*)?$/i.test(text)) return false;
    return true;
}

function replacementAllowed(path, target) {
    const field = pathField(path);
    if (!REPLACEABLE_ARRAY_FIELDS.has(field) || !Array.isArray(target)) return false;
    return target.every(function (item) { return typeof item === 'string'; });
}

function sortedObject(value) {
    return Object.keys(value || {}).sort().reduce(function (result, key) {
        result[key] = value[key];
        return result;
    }, {});
}

function extractOverlay(baseValue, targetValue) {
    const values = {};
    const replacements = {};
    const allowedPaths = new Set();
    const replacementPaths = new Set();
    const blockers = [];

    function visit(base, target, path) {
        if (Array.isArray(base) || Array.isArray(target)) {
            if (!Array.isArray(base) || !Array.isArray(target) || base.length !== target.length) {
                const encoded = encodePath(path);
                if (replacementAllowed(path, target)) {
                    replacements[encoded] = clone(target);
                    replacementPaths.add(encoded);
                } else {
                    blockers.push({ code: 'UNSAFE_ARRAY_REPLACEMENT', path: encoded });
                }
                return;
            }

            const baseObjects = base.every(plainObject);
            const targetObjects = target.every(plainObject);
            if (baseObjects || targetObjects) {
                if (!baseObjects || !targetObjects) {
                    const encoded = encodePath(path);
                    if (replacementAllowed(path, target)) {
                        replacements[encoded] = clone(target);
                        replacementPaths.add(encoded);
                    } else {
                        blockers.push({ code: 'ARRAY_SHAPE_MISMATCH', path: encoded });
                    }
                    return;
                }
                const targetById = new Map();
                target.forEach(function (item) {
                    const id = String(item[STABLE_ID_KEY] || '').trim();
                    if (id) targetById.set(id, item);
                });
                base.forEach(function (item) {
                    const id = String(item[STABLE_ID_KEY] || '').trim();
                    if (!id || !targetById.has(id)) {
                        blockers.push({ code: 'ARRAY_ID_MISMATCH', path: encodePath(path), id: id || null });
                        return;
                    }
                    visit(item, targetById.get(id), path.concat('@' + id));
                });
                return;
            }

            const selectors = primitiveItemSelectors(base);
            base.forEach(function (item, index) {
                visit(item, target[index], path.concat(selectors[index]));
            });
            return;
        }

        if (plainObject(base) || plainObject(target)) {
            if (!plainObject(base) || !plainObject(target)) {
                blockers.push({ code: 'OBJECT_SHAPE_MISMATCH', path: encodePath(path) });
                return;
            }
            const keys = Array.from(new Set(Object.keys(base).concat(Object.keys(target)))).sort();
            keys.forEach(function (key) {
                if (key === STABLE_ID_KEY) return;
                if (!Object.prototype.hasOwnProperty.call(target, key)) return;
                visit(base[key], target[key], path.concat(key));
            });
            return;
        }

        const sample = target === undefined ? base : target;
        const encoded = encodePath(path);
        if (translatablePath(path, sample)) {
            allowedPaths.add(encoded);
            if (target !== undefined && stableJson(base) !== stableJson(target)) values[encoded] = target;
            return;
        }
        if (target !== undefined && stableJson(base) !== stableJson(target)) {
            blockers.push({ code: 'NON_TRANSLATABLE_DIFFERENCE', path: encoded, field: pathField(path) });
        }
    }

    visit(baseValue, targetValue, []);
    return {
        overlay: {
            overlayVersion: OVERLAY_VERSION,
            values: sortedObject(values),
            replacements: sortedObject(replacements)
        },
        allowedPaths,
        replacementPaths,
        blockers
    };
}

function projection(value, path) {
    if (Array.isArray(value)) {
        if (value.every(plainObject)) {
            return value.map(function (item) {
                return projection(item, path.concat('@' + String(item[STABLE_ID_KEY] || 'missing')));
            });
        }
        const selectors = primitiveItemSelectors(value);
        return value.map(function (item, index) {
            if (translatablePath(path.concat(selectors[index]), item)) return { item: selectors[index], type: 'text' };
            return projection(item, path.concat(selectors[index]));
        });
    }
    if (plainObject(value)) {
        return Object.keys(value).sort().reduce(function (result, key) {
            if (key === STABLE_ID_KEY) {
                result[key] = value[key];
            } else {
                result[key] = projection(value[key], path.concat(key));
            }
            return result;
        }, {});
    }
    if (translatablePath(path, value)) return '$text';
    if (value === null) return null;
    return { type: typeof value, value };
}

function structureHash(slug, neutralBody) {
    return sha256(stableJson({
        slug: String(slug || ''),
        overlayVersion: OVERLAY_VERSION,
        structure: projection(neutralBody, [])
    }));
}

function setOverlayValue(root, encodedPath, nextValue) {
    const segments = decodePath(encodedPath);
    if (!segments.length) throw new ContentOverlayError('INVALID_OVERLAY_PATH', 'The root object cannot be replaced by a scalar.', { path: encodedPath });
    let current = root;

    for (let index = 0; index < segments.length - 1; index += 1) {
        const segment = segments[index];
        if (Array.isArray(current)) {
            if (segment.startsWith('@')) {
                const id = segment.slice(1);
                current = current.find(function (item) { return plainObject(item) && String(item[STABLE_ID_KEY]) === id; });
            } else if (segment.startsWith('$')) {
                const selectors = primitiveItemSelectors(current);
                current = current[selectors.indexOf(segment)];
            } else {
                current = undefined;
            }
        } else if (plainObject(current)) {
            if (!Object.prototype.hasOwnProperty.call(current, segment)) current[segment] = {};
            current = current[segment];
        } else {
            current = undefined;
        }
        if (current === undefined) {
            throw new ContentOverlayError('OVERLAY_PATH_NOT_FOUND', 'Overlay path does not resolve in the base structure.', { path: encodedPath });
        }
    }

    const last = segments[segments.length - 1];
    if (Array.isArray(current)) {
        if (last.startsWith('@')) {
            const id = last.slice(1);
            const targetIndex = current.findIndex(function (item) { return plainObject(item) && String(item[STABLE_ID_KEY]) === id; });
            if (targetIndex < 0) throw new ContentOverlayError('OVERLAY_PATH_NOT_FOUND', 'Overlay array item does not exist.', { path: encodedPath });
            current[targetIndex] = clone(nextValue);
            return;
        }
        if (last.startsWith('$')) {
            const targetIndex = primitiveItemSelectors(current).indexOf(last);
            if (targetIndex < 0) throw new ContentOverlayError('OVERLAY_PATH_NOT_FOUND', 'Overlay text item does not exist.', { path: encodedPath });
            current[targetIndex] = clone(nextValue);
            return;
        }
    }
    if (!plainObject(current)) throw new ContentOverlayError('OVERLAY_PATH_NOT_FOUND', 'Overlay parent is not an object.', { path: encodedPath });
    current[last] = clone(nextValue);
}

function normalizeOverlay(overlayValue) {
    if (!plainObject(overlayValue)) throw new ContentOverlayError('INVALID_OVERLAY', 'translation_json must be an overlay object.');
    const overlayVersion = Number(overlayValue.overlayVersion);
    if (overlayVersion !== OVERLAY_VERSION) throw new ContentOverlayError('INVALID_OVERLAY_VERSION', 'Unsupported content overlay version.');
    if (!plainObject(overlayValue.values) || !plainObject(overlayValue.replacements)) {
        throw new ContentOverlayError('INVALID_OVERLAY', 'Content overlay values and replacements must be objects.');
    }
    return {
        overlayVersion,
        values: sortedObject(clone(overlayValue.values)),
        replacements: sortedObject(clone(overlayValue.replacements))
    };
}

function validateOverlay(overlayValue, schema) {
    const overlay = normalizeOverlay(overlayValue);
    const allowed = new Set(schema.allowedPaths || []);
    const replacements = new Set(schema.replacementPaths || []);
    Object.keys(overlay.values).forEach(function (path) {
        if (!allowed.has(path)) throw new ContentOverlayError('OVERLAY_PATH_NOT_ALLOWED', 'Overlay writes a field outside the slug/version schema.', { path });
        if (typeof overlay.values[path] !== 'string') throw new ContentOverlayError('INVALID_OVERLAY_VALUE', 'Overlay text values must be strings.', { path });
    });
    Object.keys(overlay.replacements).forEach(function (path) {
        if (!replacements.has(path)) throw new ContentOverlayError('OVERLAY_REPLACEMENT_NOT_ALLOWED', 'Overlay replacement is outside the slug/version schema.', { path });
        if (!Array.isArray(overlay.replacements[path])
            || !overlay.replacements[path].every(function (item) { return typeof item === 'string'; })) {
            throw new ContentOverlayError('INVALID_OVERLAY_REPLACEMENT', 'Overlay replacements must be text-only arrays.', { path });
        }
    });
    return overlay;
}

function applyOverlay(neutralBody, overlayValue, schema) {
    const overlay = validateOverlay(overlayValue, schema);
    const result = clone(neutralBody);
    Object.keys(overlay.replacements).sort(function (left, right) {
        return decodePath(left).length - decodePath(right).length;
    }).forEach(function (path) {
        setOverlayValue(result, path, overlay.replacements[path]);
    });
    Object.keys(overlay.values).forEach(function (path) {
        setOverlayValue(result, path, overlay.values[path]);
    });
    return result;
}

function buildContentOverlaySnapshot(options) {
    options = options || {};
    const slug = String(options.slug || '').trim();
    const contentVersion = Number(options.contentVersion || 1);
    const locales = Array.isArray(options.locales) && options.locales.length ? options.locales.slice() : LOCALE_CODES.slice();
    const prepared = ensureStableArrayIds(options.body || {}, slug);
    const neutralBody = compactLocalizedTree(prepared.body, 'en', locales);
    const extracts = {};
    const allowedPaths = new Set();
    const replacementPaths = new Set();
    const blockers = prepared.blockers.slice();

    locales.forEach(function (locale) {
        const target = compactLocalizedTree(prepared.body, locale, locales);
        inheritLegacyArrayIds(neutralBody, target);
        const extracted = extractOverlay(neutralBody, target);
        extracts[locale] = { target, overlay: extracted.overlay };
        extracted.allowedPaths.forEach(function (path) { allowedPaths.add(path); });
        extracted.replacementPaths.forEach(function (path) { replacementPaths.add(path); });
        extracted.blockers.forEach(function (blocker) { blockers.push({ ...blocker, locale }); });
    });

    const schema = {
        slug,
        contentVersion,
        overlayVersion: OVERLAY_VERSION,
        allowedPaths: Array.from(allowedPaths).sort(),
        replacementPaths: Array.from(replacementPaths).sort(),
        baseStructureHash: structureHash(slug, neutralBody)
    };

    const overlays = {};
    locales.forEach(function (locale) {
        try {
            overlays[locale] = validateOverlay(extracts[locale].overlay, schema);
            const rendered = stripTranslationMetadata(applyOverlay(neutralBody, overlays[locale], schema));
            const target = stripTranslationMetadata(extracts[locale].target);
            if (stableJson(rendered) !== stableJson(target)) {
                blockers.push({ code: 'OVERLAY_PARITY_MISMATCH', locale, slug });
            }
        } catch (error) {
            blockers.push({ code: error.code || 'OVERLAY_VALIDATION_FAILED', locale, slug, message: error.message, details: error.details || null });
        }
    });

    return {
        slug,
        contentVersion,
        bodyWithStableIds: prepared.body,
        assignedIds: prepared.assigned,
        neutralBody,
        schema,
        overlays,
        localizedTargets: Object.keys(extracts).reduce(function (result, locale) {
            result[locale] = extracts[locale].target;
            return result;
        }, {}),
        blockers
    };
}

function renderLocalizedContent(snapshot, locale) {
    const overlay = snapshot && snapshot.overlays && snapshot.overlays[locale];
    if (!overlay) throw new ContentOverlayError('LOCALE_OVERLAY_NOT_FOUND', 'Published locale overlay is missing.', { locale });
    return stripTranslationMetadata(applyOverlay(snapshot.neutralBody, overlay, snapshot.schema));
}

module.exports = {
    OVERLAY_VERSION,
    CONTENT_SCHEMA_VERSION,
    STABLE_ID_KEY,
    TRANSLATABLE_FIELDS,
    ContentOverlayError,
    ensureStableArrayIds,
    stripTranslationMetadata,
    inheritLegacyArrayIds,
    extractOverlay,
    structureHash,
    validateOverlay,
    applyOverlay,
    buildContentOverlaySnapshot,
    renderLocalizedContent
};
