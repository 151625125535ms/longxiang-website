(function () {
    'use strict';

    var modules = window.LongxiangAdminModules = window.LongxiangAdminModules || {};

    modules.translations = function createTranslationsModule(context) {
        context = context || {};
        var apiRequest = context.apiRequest;
        var unwrapDataResponse = context.unwrapDataResponse;
        var escapeHtml = context.escapeHtml;
        var showToast = context.showToast;
        var showConfirm = context.showConfirm;
        var markFormDirty = context.markFormDirty;
        var resetFormDirty = context.resetFormDirty;
        var confirmDiscardChanges = context.confirmDiscardChanges;
        var getCurrentView = context.getCurrentView;
        var locales = [];
        var entities = [];
        var activeType = 'product';
        var activeEntityId = '';
        var activeLocale = 'en';
        var currentState = null;
        var bound = false;
        var loadGeneration = 0;
        var editorDirty = false;
        var editorBusy = false;

        function required(name, value) {
            if (!value) throw new Error('翻译版本模块缺少依赖：' + name);
            return value;
        }

        required('apiRequest', apiRequest);
        required('unwrapDataResponse', unwrapDataResponse);
        required('escapeHtml', escapeHtml);
        required('showToast', showToast);
        required('showConfirm', showConfirm);
        required('markFormDirty', markFormDirty);
        required('resetFormDirty', resetFormDirty);
        required('confirmDiscardChanges', confirmDiscardChanges);
        required('getCurrentView', getCurrentView);

        function element(id) {
            return document.getElementById(id);
        }

        function localeByCode(code) {
            return locales.find(function (locale) { return locale.code === code; }) || null;
        }

        function contextSnapshot() {
            return activeType + ':' + activeEntityId + ':' + activeLocale;
        }

        function isCurrentContext(snapshot) {
            return snapshot === contextSnapshot() && getCurrentView() === 'translations';
        }

        function syncActionState() {
            var save = element('translation-save-draft');
            var publish = element('translation-publish-draft');
            var discard = element('translation-discard-draft');
            if (save) save.disabled = !currentState || editorBusy;
            if (publish) {
                publish.disabled = !currentState || !currentState.draft || editorDirty || editorBusy;
                publish.title = editorDirty ? '请先保存当前修改' : '';
            }
            if (discard) discard.disabled = editorBusy;
        }

        function setEditorBusy(value) {
            editorBusy = Boolean(value);
            document.querySelectorAll('#view-translations select, #translation-locale-tabs button, #translation-editor input, #translation-editor textarea, #translation-spec-fields input, #translation-history button').forEach(function (control) {
                control.disabled = editorBusy;
            });
            syncActionState();
        }

        function valueSource() {
            if (!currentState) return {};
            if (currentState.draft) return currentState.draft.values || {};
            if (currentState.published) return currentState.published.values || {};
            return {};
        }

        function renderLocaleTabs() {
            var host = element('translation-locale-tabs');
            if (!host) return;
            host.innerHTML = locales.map(function (locale) {
                var planned = locale.isPublic ? '' : '<span class="translation-locale-state">计划中</span>';
                return '<button type="button" class="translation-locale-tab' + (locale.code === activeLocale ? ' active' : '') + '" data-translation-locale="' + escapeHtml(locale.code) + '">' +
                    '<span>' + escapeHtml(locale.nativeLabel || locale.label || locale.code) + '</span>' + planned + '</button>';
            }).join('');
        }

        function renderEntityOptions() {
            var select = element('translation-entity');
            if (!select) return;
            select.innerHTML = entities.length
                ? entities.map(function (entity) {
                    return '<option value="' + escapeHtml(entity.id) + '">' + escapeHtml(entity.label || ('#' + entity.id)) + '</option>';
                }).join('')
                : '<option value="">暂无可编辑内容</option>';
            if (!entities.some(function (entity) { return String(entity.id) === String(activeEntityId); })) {
                activeEntityId = entities.length ? String(entities[0].id) : '';
            }
            select.value = activeEntityId;
        }

        function fieldControl(field, values, dir) {
            var value = values[field.key];
            if (field.type === 'json') {
                value = JSON.stringify(value && typeof value === 'object' ? value : {}, null, 2);
            }
            var requiredMark = field.required ? ' <span class="required">*</span>' : '';
            var control = field.type === 'textarea' || field.type === 'json'
                ? '<textarea id="translation-field-' + escapeHtml(field.key) + '" data-translation-field="' + escapeHtml(field.key) + '" data-field-type="' + escapeHtml(field.type) + '" dir="' + escapeHtml(field.type === 'json' ? 'ltr' : dir) + '" rows="' + (field.type === 'json' ? '12' : '5') + '">' + escapeHtml(value == null ? '' : value) + '</textarea>'
                : '<input id="translation-field-' + escapeHtml(field.key) + '" data-translation-field="' + escapeHtml(field.key) + '" data-field-type="' + escapeHtml(field.type || 'text') + '" dir="' + escapeHtml(dir) + '" value="' + escapeHtml(value == null ? '' : value) + '">';
            return '<div class="form-group"><label for="translation-field-' + escapeHtml(field.key) + '">' + escapeHtml(field.label || field.key) + requiredMark + '</label>' + control + '</div>';
        }

        function currentSpecValues() {
            if (!currentState) return [];
            if (currentState.draft) return currentState.draft.specValues || [];
            if (currentState.published) return currentState.published.specValues || [];
            return [];
        }

        function renderSpecs() {
            var host = element('translation-spec-fields');
            if (!host) return;
            if (!currentState || currentState.entityType !== 'product' || !currentState.specs.length) {
                host.innerHTML = '';
                host.hidden = true;
                return;
            }
            var translated = currentSpecValues();
            host.hidden = false;
            host.innerHTML = '<h3>规格翻译</h3><div class="translation-spec-list">' + currentState.specs.map(function (spec) {
                var value = translated.find(function (item) { return Number(item.productSpecId) === Number(spec.id); }) || {};
                return '<div class="translation-spec-row" data-product-spec-id="' + escapeHtml(spec.id) + '">' +
                    '<div class="translation-spec-source"><strong>' + escapeHtml(spec.specKey || spec.specCode) + '</strong><span>' + escapeHtml(spec.specCode) + '</span></div>' +
                    '<input data-spec-field="label" aria-label="规格名称" value="' + escapeHtml(value.label || '') + '" placeholder="当前语言名称">' +
                    '<input data-spec-field="valueText" aria-label="规格值" value="' + escapeHtml(value.valueText || '') + '" placeholder="当前语言值">' +
                    '</div>';
            }).join('') + '</div>';
        }

        function renderHistory() {
            var host = element('translation-history');
            if (!host) return;
            var history = currentState && currentState.history ? currentState.history : [];
            host.innerHTML = history.length ? history.map(function (revision) {
                return '<div class="translation-history-row"><div><strong>版本 ' + escapeHtml(revision.revisionNo) + '</strong><span>' + escapeHtml(revision.updatedBy || revision.createdBy || 'admin') + ' · ' + escapeHtml(new Date(revision.updatedAt).toLocaleString()) + '</span></div>' +
                    '<button type="button" class="btn btn-secondary btn-sm" data-restore-revision="' + escapeHtml(revision.id) + '">恢复</button></div>';
            }).join('') : '<p class="translation-empty">暂无历史发布版本。</p>';
        }

        function renderState() {
            var host = element('translation-editor');
            var status = element('translation-version-status');
            var save = element('translation-save-draft');
            var publish = element('translation-publish-draft');
            var discard = element('translation-discard-draft');
            if (!host || !status) return;
            if (!currentState) {
                host.innerHTML = '<p class="translation-empty">请选择可编辑内容。</p>';
                status.textContent = '';
                if (save) save.disabled = true;
                if (publish) publish.disabled = true;
                if (discard) discard.hidden = true;
                renderSpecs();
                renderHistory();
                editorDirty = false;
                setEditorBusy(false);
                return;
            }
            var locale = currentState.locale;
            var values = valueSource();
            var stateText = currentState.draft ? '有未发布草稿' : (currentState.published ? '已发布' : '尚未建立版本');
            status.innerHTML = '<strong>' + escapeHtml(currentState.entity.label) + '</strong><span>' + escapeHtml(locale.nativeLabel || locale.label || locale.code) + ' · ' + escapeHtml(stateText) + '</span>';
            host.innerHTML = (locale.isPublic ? '' : '<div class="translation-planned-notice">该语言处于 ' + escapeHtml(locale.state) + ' 状态。这里可以准备和审核内容，但不会进入前台、语言选择器或搜索引擎。</div>') +
                currentState.schema.map(function (field) { return fieldControl(field, values, locale.dir || 'ltr'); }).join('');
            if (save) save.disabled = false;
            if (publish) {
                publish.disabled = !currentState.draft;
                publish.textContent = locale.isPublic ? '发布草稿' : '发布内部版本（仍不公开）';
            }
            if (discard) discard.hidden = !currentState.draft;
            renderSpecs();
            renderHistory();
            editorDirty = false;
            resetFormDirty();
            setEditorBusy(false);
        }

        function collectValues() {
            var values = {};
            document.querySelectorAll('#translation-editor [data-translation-field]').forEach(function (field) {
                var key = field.getAttribute('data-translation-field');
                if (field.getAttribute('data-field-type') === 'json') {
                    try {
                        var parsed = JSON.parse(field.value || '{}');
                        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('JSON 必须是对象');
                        values[key] = parsed;
                    } catch (error) {
                        throw new Error('翻译内容 JSON 格式不正确：' + error.message);
                    }
                } else {
                    values[key] = field.value;
                }
            });
            return values;
        }

        function collectSpecValues() {
            if (!currentState || currentState.entityType !== 'product') return undefined;
            return Array.prototype.map.call(document.querySelectorAll('#translation-spec-fields [data-product-spec-id]'), function (row) {
                return {
                    productSpecId: Number(row.getAttribute('data-product-spec-id')),
                    label: row.querySelector('[data-spec-field="label"]').value,
                    valueText: row.querySelector('[data-spec-field="valueText"]').value
                };
            });
        }

        function loadState() {
            var generation = ++loadGeneration;
            var requestedType = activeType;
            var requestedEntityId = activeEntityId;
            var requestedLocale = activeLocale;
            if (!activeEntityId || !activeLocale) {
                currentState = null;
                renderState();
                return Promise.resolve();
            }
            element('translation-editor').innerHTML = '<p class="translation-empty">正在加载翻译版本...</p>';
            return apiRequest('/admin/translations/' + encodeURIComponent(activeType) + '/' + encodeURIComponent(activeEntityId) + '/' + encodeURIComponent(activeLocale))
                .then(function (response) {
                    if (generation !== loadGeneration || requestedType !== activeType
                        || requestedEntityId !== activeEntityId || requestedLocale !== activeLocale) return;
                    currentState = unwrapDataResponse(response);
                    renderLocaleTabs();
                    renderState();
                }).catch(function (error) {
                    if (generation !== loadGeneration) return;
                    currentState = null;
                    renderState();
                    showToast('加载翻译版本失败：' + error.message, 'error');
                });
        }

        function loadEntities() {
            var generation = ++loadGeneration;
            var requestedType = activeType;
            return apiRequest('/admin/translations/entities?type=' + encodeURIComponent(activeType)).then(function (response) {
                if (generation !== loadGeneration || requestedType !== activeType) return;
                var data = unwrapDataResponse(response) || {};
                entities = data.items || [];
                renderEntityOptions();
                return loadState();
            }).catch(function (error) {
                if (generation !== loadGeneration) return;
                entities = [];
                activeEntityId = '';
                renderEntityOptions();
                renderState();
                showToast('加载可翻译内容失败：' + error.message, 'error');
            });
        }

        function load() {
            bind();
            return apiRequest('/admin/translations/locales').then(function (response) {
                locales = unwrapDataResponse(response) || [];
                if (!localeByCode(activeLocale) && locales.length) activeLocale = locales[0].code;
                renderLocaleTabs();
                return loadEntities();
            }).catch(function (error) {
                showToast('加载语言配置失败：' + error.message, 'error');
            });
        }

        function saveDraft() {
            if (!currentState) return;
            var requestContext = contextSnapshot();
            var values;
            try {
                values = collectValues();
            } catch (error) {
                showToast(error.message, 'error');
                return;
            }
            setEditorBusy(true);
            apiRequest('/admin/translations/' + encodeURIComponent(activeType) + '/' + encodeURIComponent(activeEntityId) + '/' + encodeURIComponent(activeLocale), {
                method: 'PUT',
                body: {
                    version: currentState.draft ? currentState.draft.version : 0,
                    values: values,
                    specValues: collectSpecValues()
                }
            }).then(function (response) {
                if (!isCurrentContext(requestContext)) return;
                currentState = unwrapDataResponse(response);
                renderState();
                showToast('当前语言草稿已保存');
            }).catch(function (error) {
                if (!isCurrentContext(requestContext)) return;
                setEditorBusy(false);
                showToast('保存草稿失败：' + error.message, 'error');
            });
        }

        function publishDraft() {
            if (!currentState || !currentState.draft) return;
            if (editorDirty) {
                showToast('请先保存当前修改，再发布草稿。', 'error');
                return;
            }
            var requestContext = contextSnapshot();
            var locale = localeByCode(activeLocale);
            var message = locale && !locale.isPublic
                ? '这会发布内部翻译版本，但该语言仍保持计划中，不会出现在前台。'
                : '发布后会同步现有公开字段。确定继续吗？';
            showConfirm('发布翻译草稿', message).then(function (confirmed) {
                if (!confirmed || !isCurrentContext(requestContext)) return;
                setEditorBusy(true);
                return apiRequest('/admin/translations/' + encodeURIComponent(activeType) + '/' + encodeURIComponent(activeEntityId) + '/' + encodeURIComponent(activeLocale) + '/publish', {
                    method: 'POST',
                    body: {
                        draftVersion: currentState.draft.version,
                        publishedRevisionId: currentState.published ? currentState.published.id : null
                    }
                }).then(function (response) {
                    if (!isCurrentContext(requestContext)) return;
                    currentState = unwrapDataResponse(response);
                    renderState();
                    showToast(locale && !locale.isPublic ? '内部翻译版本已发布，前台仍未启用' : '翻译草稿已发布');
                }).catch(function (error) {
                    if (!isCurrentContext(requestContext)) return;
                    setEditorBusy(false);
                    showToast('发布失败：' + error.message, 'error');
                });
            });
        }

        function restoreRevision(revisionId) {
            if (!currentState) return;
            var requestContext = contextSnapshot();
            showConfirm('恢复历史版本', '当前已发布版本会归档，所选历史版本将重新发布。确定继续吗？').then(function (confirmed) {
                if (!confirmed || !isCurrentContext(requestContext)) return;
                setEditorBusy(true);
                return apiRequest('/admin/translations/' + encodeURIComponent(activeType) + '/' + encodeURIComponent(activeEntityId) + '/' + encodeURIComponent(activeLocale) + '/restore', {
                    method: 'POST',
                    body: {
                        revisionId: Number(revisionId),
                        publishedRevisionId: currentState.published ? currentState.published.id : null
                    }
                }).then(function (response) {
                    if (!isCurrentContext(requestContext)) return;
                    currentState = unwrapDataResponse(response);
                    renderState();
                    showToast('历史翻译版本已恢复');
                }).catch(function (error) {
                    if (!isCurrentContext(requestContext)) return;
                    setEditorBusy(false);
                    showToast('恢复失败：' + error.message, 'error');
                });
            });
        }

        function discardDraft() {
            if (!currentState || !currentState.draft) return;
            var requestContext = contextSnapshot();
            showConfirm('丢弃翻译草稿', '未发布的当前语言草稿将被删除，已发布内容不会改变。确定继续吗？').then(function (confirmed) {
                if (!confirmed || !isCurrentContext(requestContext)) return;
                setEditorBusy(true);
                return apiRequest('/admin/translations/' + encodeURIComponent(activeType) + '/' + encodeURIComponent(activeEntityId) + '/' + encodeURIComponent(activeLocale) + '/discard', {
                    method: 'POST',
                    body: { draftVersion: currentState.draft.version }
                }).then(function (response) {
                    if (!isCurrentContext(requestContext)) return;
                    currentState = unwrapDataResponse(response);
                    renderState();
                    showToast('翻译草稿已丢弃');
                }).catch(function (error) {
                    if (!isCurrentContext(requestContext)) return;
                    setEditorBusy(false);
                    showToast('丢弃草稿失败：' + error.message, 'error');
                });
            });
        }

        function bind() {
            if (bound) return;
            bound = true;
            var typeSelect = element('translation-entity-type');
            var entitySelect = element('translation-entity');
            typeSelect.addEventListener('change', function () {
                if (!confirmDiscardChanges()) {
                    typeSelect.value = activeType;
                    return;
                }
                activeType = typeSelect.value;
                activeEntityId = '';
                loadEntities();
            });
            entitySelect.addEventListener('change', function () {
                if (!confirmDiscardChanges()) {
                    entitySelect.value = activeEntityId;
                    return;
                }
                activeEntityId = entitySelect.value;
                loadState();
            });
            element('translation-locale-tabs').addEventListener('click', function (event) {
                var button = event.target.closest('[data-translation-locale]');
                if (!button) return;
                if (!confirmDiscardChanges()) return;
                activeLocale = button.getAttribute('data-translation-locale');
                renderLocaleTabs();
                loadState();
            });
            element('translation-save-draft').addEventListener('click', saveDraft);
            element('translation-publish-draft').addEventListener('click', publishDraft);
            element('translation-discard-draft').addEventListener('click', discardDraft);
            element('translation-history').addEventListener('click', function (event) {
                var button = event.target.closest('[data-restore-revision]');
                if (button) restoreRevision(button.getAttribute('data-restore-revision'));
            });
            element('view-translations').addEventListener('input', function (event) {
                if (event.target.matches('input, textarea, select')) {
                    editorDirty = true;
                    markFormDirty();
                    syncActionState();
                }
            });
        }

        return { load: load };
    };
})();
