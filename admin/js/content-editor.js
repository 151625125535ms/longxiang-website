(function () {
    'use strict';

    var API_BASE = '../api';
    var VIEW_TO_SLUG = {
        'content-company-overview': 'company-overview',
        'content-contact': 'contact',
        'content-about-us': 'about-us',
        'content-innovation': 'innovation',
        'content-applications': 'applications',
        'content-education': 'education',
        'content-page-blocks': 'page-blocks'
    };
    var VIEW_TITLES = {
        'content-company-overview': '企业概况',
        'content-contact': '联系我们',
        'content-about-us': '关于我们',
        'content-innovation': '科技创新',
        'content-applications': '应用行业',
        'content-education': '教育合作',
        'content-page-blocks': '页面区块'
    };
    var contentBlockCache = {};

    function getToken() {
        return localStorage.getItem('admin_token');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showMessage(message, type) {
        var container = document.getElementById('toast-container');
        if (!container) return;
        var toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'success');
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 3000);
    }

    function apiRequest(url, options) {
        options = options || {};
        var headers = options.headers || {};
        var token = getToken();
        if (token) headers.Authorization = 'Bearer ' + token;
        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        options.headers = headers;

        return fetch(API_BASE + url, options).then(function (res) {
            return res.text().then(function (text) {
                var data = text ? JSON.parse(text) : {};
                if (!res.ok) {
                    var err = new Error((data.error && data.error.message) || data.message || data.error || '请求失败');
                    err.status = res.status;
                    err.code = data.error && data.error.code;
                    throw err;
                }
                return data;
            });
        });
    }

    function isPlainObject(value) {
        return value != null && typeof value === 'object' && !Array.isArray(value);
    }

    function isEmptyValue(value) {
        if (value === '') return true;
        if (Array.isArray(value)) return value.length === 0;
        if (isPlainObject(value)) return Object.keys(value).length === 0;
        return false;
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value == null ? {} : value));
    }

    function getPath(obj, path) {
        var parts = path.split('.');
        var current = obj;
        for (var i = 0; i < parts.length; i++) {
            if (current == null) return undefined;
            current = current[parts[i]];
        }
        return current;
    }

    function setPath(obj, path, value) {
        var parts = path.split('.');
        var current = obj;
        for (var i = 0; i < parts.length - 1; i++) {
            if (!isPlainObject(current[parts[i]])) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    function mergePreservingUnknownFields(original, collected) {
        if (Array.isArray(collected)) {
            return collected.map(function (item, index) {
                return mergePreservingUnknownFields(Array.isArray(original) ? original[index] : undefined, item);
            }).filter(function (item) {
                return !isEmptyValue(item);
            });
        }
        if (!isPlainObject(collected)) return collected;

        var result = isPlainObject(original) ? clone(original) : {};
        Object.keys(collected).forEach(function (key) {
            var value = collected[key];
            var originalHasKey = isPlainObject(original) && Object.prototype.hasOwnProperty.call(original, key);
            if (!originalHasKey && isEmptyValue(value)) return;
            result[key] = mergePreservingUnknownFields(originalHasKey ? original[key] : undefined, value);
        });
        return result;
    }

    function field(label, key, type, help) {
        return { label: label, key: key, type: type || 'text', help: help || '' };
    }

    function seoFields() {
        return { label: 'SEO 设置', key: 'seo', type: 'group', help: '影响搜索结果标题、描述和关键词。', fields: [
            field('SEO 标题', 'title'),
            field('SEO 描述', 'description', 'textarea'),
            field('SEO 关键词', 'keywords')
        ] };
    }

    function heroFields(imageKey) {
        return { label: '页面首屏', key: 'hero', type: 'group', help: '影响页面顶部标题、说明和主图。', fields: [
            field('英文标题', 'title_en'),
            field('阿拉伯语标题', 'title_ar'),
            field('中文标题', 'title_cn'),
            field('英文副标题', 'subtitle_en', 'textarea'),
            field('阿拉伯语副标题', 'subtitle_ar', 'textarea'),
            field('中文副标题', 'subtitle_cn', 'textarea'),
            field('图片路径', imageKey || 'image')
        ] };
    }

    function getContentBlockSchema(viewName) {
        var commonSeo = seoFields();
        var schemas = {
            'content-company-overview': [
                field('公司英文名', 'name'),
                field('公司阿拉伯语名', 'nameAr'),
                field('公司中文名', 'nameCN'),
                field('成立年份', 'founded'),
                field('股票代码', 'stockCode'),
                field('注册资本', 'registeredCapital'),
                field('工厂面积', 'factoryArea'),
                field('专利数量', 'patents'),
                field('研究合作伙伴数量', 'researchPartners'),
                field('公司描述', 'description', 'textarea'),
                field('阿拉伯语公司描述', 'descriptionAr', 'textarea'),
                field('关于我们摘要', 'aboutIntro', 'textarea'),
                field('关于我们详情', 'aboutDetail', 'textarea'),
                field('封面图片路径', 'cover_image'),
                { label: '统计数字', key: 'stats', type: 'repeatable-array', help: '影响企业概况中的数字卡片。', itemLabel: '统计项', fields: [
                    field('英文标签', 'label_en'),
                    field('阿拉伯语标签', 'label_ar'),
                    field('数值', 'value')
                ] },
                commonSeo
            ],
            'content-contact': [
                field('地址', 'address'),
                field('阿拉伯语地址', 'addressAr'),
                field('总部地址', 'headquarters'),
                field('电话', 'phone'),
                field('邮箱', 'email'),
                field('办公时间', 'officeHours'),
                field('淮阳基地', 'huaiyangBase'),
                field('WhatsApp', 'whatsapp'),
                field('WhatsApp 二维码', 'whatsappQr'),
                field('微信', 'wechat'),
                field('微信二维码', 'wechatQr'),
                field('Skype', 'skype'),
                field('Line', 'line'),
                field('Line 二维码', 'lineQr'),
                field('TikTok', 'tiktok'),
                field('Instagram', 'instagram'),
                field('YouTube', 'youtube'),
                field('Google Maps 链接', 'googleMapsUrl'),
                field('Google Maps 嵌入链接', 'googleMapsEmbedUrl'),
                field('OpenStreetMap 链接', 'openStreetMapUrl'),
                { label: '地图位置', key: 'mapLocations', type: 'key-value-object', help: '保存为对象，用于地图多个位置。' },
                field('地图二维码', 'mapQr'),
                commonSeo
            ],
            'content-about-us': [
                heroFields(),
                { label: '内容段落', key: 'sections', type: 'repeatable-array', help: '影响关于我们页面主体段落。', itemLabel: '段落', fields: [
                    field('英文标题', 'title_en'),
                    field('阿拉伯语标题', 'title_ar'),
                    field('中文标题', 'title_cn'),
                    field('英文内容', 'body_en', 'textarea'),
                    field('阿拉伯语内容', 'body_ar', 'textarea'),
                    field('中文内容', 'body_cn', 'textarea'),
                    field('图片路径', 'image'),
                    field('布局', 'layout'),
                    field('排序', 'sort_order')
                ] },
                { label: '发展历程', key: 'milestones', type: 'repeatable-array', itemLabel: '历程', fields: [
                    field('年份', 'year'),
                    field('英文标题', 'title_en'),
                    field('阿拉伯语标题', 'title_ar'),
                    field('中文标题', 'title_cn'),
                    field('英文描述', 'description_en', 'textarea'),
                    field('阿拉伯语描述', 'description_ar', 'textarea'),
                    field('中文描述', 'description_cn', 'textarea'),
                    field('排序', 'sort_order')
                ] },
                commonSeo
            ],
            'content-applications': [
                heroFields(),
                { label: '行业应用', key: 'industries', type: 'repeatable-array', help: '影响应用行业页面卡片。', itemLabel: '行业', fields: [
                    field('英文名称', 'name_en'),
                    field('阿拉伯语名称', 'name_ar'),
                    field('中文名称', 'name_cn'),
                    field('英文摘要', 'summary_en', 'textarea'),
                    field('阿拉伯语摘要', 'summary_ar', 'textarea'),
                    field('中文摘要', 'summary_cn', 'textarea'),
                    field('图片路径', 'image'),
                    field('关联产品 ID', 'related_product_ids', 'id-list-string', '每行一个产品 ID，保存为字符串数组。'),
                    field('排序', 'sort_order')
                ] },
                commonSeo
            ],
            'content-innovation': [
                heroFields(),
                { label: '创新内容', key: 'sections', type: 'repeatable-array', itemLabel: '内容', fields: [
                    field('英文标题', 'title_en'),
                    field('阿拉伯语标题', 'title_ar'),
                    field('中文标题', 'title_cn'),
                    field('英文内容', 'body_en', 'textarea'),
                    field('阿拉伯语内容', 'body_ar', 'textarea'),
                    field('中文内容', 'body_cn', 'textarea'),
                    field('图片路径', 'image'),
                    field('排序', 'sort_order')
                ] },
                { label: '亮点数据', key: 'highlights', type: 'repeatable-array', itemLabel: '亮点', fields: [
                    field('英文标签', 'label_en'),
                    field('阿拉伯语标签', 'label_ar'),
                    field('中文标签', 'label_cn'),
                    field('数值', 'value'),
                    field('排序', 'sort_order')
                ] },
                field('关联证书 ID', 'related_certification_ids', 'id-list-string', '每行一个证书 ID，保存为字符串数组。'),
                commonSeo
            ],
            'content-page-blocks': [
                { label: '页面区块', key: 'blocks', type: 'repeatable-array', help: 'key 是系统识别，不建议修改。', itemLabel: '区块', fields: [
                    field('系统 key', 'key', 'readonly', '系统识别，不建议修改。'),
                    field('英文标题', 'title_en'),
                    field('阿拉伯语标题', 'title_ar'),
                    field('中文标题', 'title_cn'),
                    field('英文文字', 'text_en', 'textarea'),
                    field('阿拉伯语文字', 'text_ar', 'textarea'),
                    field('中文文字', 'text_cn', 'textarea'),
                    field('图片路径', 'image'),
                    field('跳转链接', 'href'),
                    field('页脚英文文字', 'footerText', 'textarea'),
                    field('页脚阿拉伯语文字', 'footerTextAr', 'textarea'),
                    field('启用', 'is_active', 'checkbox'),
                    field('排序', 'sort_order')
                ] }
            ],
            'content-education': [
                { label: '页面首屏', key: 'hero', type: 'group', help: '影响教育合作页面首屏。', fields: [
                    field('小标题', 'eyebrow'),
                    field('英文主标题', 'title', 'textarea'),
                    field('阿拉伯语主标题', 'titleAr', 'textarea'),
                    field('英文简介', 'subtitle', 'textarea'),
                    field('阿拉伯语简介', 'subtitleAr', 'textarea'),
                    field('背景图路径', 'backgroundImage')
                ] },
                { label: '核心数字', key: 'stats', type: 'repeatable-array', itemLabel: '数字', fields: [
                    field('系统 ID', 'id'),
                    field('数值', 'value'),
                    field('英文说明', 'label'),
                    field('阿拉伯语说明', 'labelAr')
                ] },
                { label: '合作板块', key: 'sections', type: 'repeatable-array', help: 'gallery 和 cooperation-philosophy 继续保留在这里。', itemLabel: '板块', fields: [
                    field('系统 ID', 'id', 'text', '系统识别，不建议修改。'),
                    field('板块编号', 'modeNumber'),
                    field('英文标题', 'title'),
                    field('阿拉伯语标题', 'titleAr'),
                    field('英文亮点', 'tagline'),
                    field('阿拉伯语亮点', 'taglineAr'),
                    field('英文摘要', 'summary', 'textarea'),
                    field('阿拉伯语摘要', 'summaryAr', 'textarea'),
                    field('英文段落', 'body', 'multiline-list'),
                    field('阿拉伯语段落', 'bodyAr', 'multiline-list'),
                    field('主图路径', 'image'),
                    field('图片列表', 'images', 'multiline-list'),
                    field('适合对象', 'bestFor', 'textarea'),
                    field('阿拉伯语适合对象', 'bestForAr', 'textarea'),
                    field('交付内容', 'deliverables', 'multiline-list'),
                    field('阿拉伯语交付内容', 'deliverablesAr', 'multiline-list'),
                    field('合作成果', 'outcomes', 'multiline-list'),
                    field('阿拉伯语合作成果', 'outcomesAr', 'multiline-list'),
                    { label: '说明卡片', key: 'cards', type: 'repeatable-array', itemLabel: '卡片', fields: [
                        field('英文标题', 'title'),
                        field('阿拉伯语标题', 'titleAr'),
                        field('英文说明', 'text', 'textarea'),
                        field('阿拉伯语说明', 'textAr', 'textarea')
                    ] }
                ] },
                { label: '联系引导', key: 'cta', type: 'group', fields: [
                    field('英文标题', 'title'),
                    field('阿拉伯语标题', 'titleAr'),
                    field('英文文字', 'text', 'textarea'),
                    field('阿拉伯语文字', 'textAr', 'textarea'),
                    field('英文按钮文字', 'buttonText'),
                    field('阿拉伯语按钮文字', 'buttonTextAr'),
                    field('链接', 'href')
                ] },
                commonSeo
            ]
        };
        return schemas[viewName] || [];
    }

    function valueToText(value, type) {
        if (type === 'multiline-list' || type === 'id-list-string') return Array.isArray(value) ? value.join('\n') : '';
        if (value == null) return '';
        return String(value);
    }

    function renderField(def, data) {
        var value = data && Object.prototype.hasOwnProperty.call(data, def.key) ? data[def.key] : undefined;
        var help = def.help ? '<p class="field-help">' + escapeHtml(def.help) + '</p>' : '';
        if (def.type === 'group') {
            return '<section class="content-editor-panel" data-group-field="' + escapeHtml(def.key) + '"><div class="content-panel-head"><h3>' + escapeHtml(def.label) + '</h3>' + (def.help ? '<p>' + escapeHtml(def.help) + '</p>' : '') + '</div>' +
                renderFields(def.fields || [], isPlainObject(value) ? value : {}) + '</section>';
        }
        if (def.type === 'repeatable-array') {
            var items = Array.isArray(value) ? value : [];
            return '<section class="content-editor-panel" data-array-field="' + escapeHtml(def.key) + '"><div class="content-panel-head"><div><h3>' + escapeHtml(def.label) + '</h3>' + (def.help ? '<p>' + escapeHtml(def.help) + '</p>' : '') + '</div><button type="button" class="btn btn-secondary btn-sm" data-content-action="add-item">新增</button></div><div class="content-repeat-list">' +
                items.map(function (item, index) { return renderArrayItem(def, item, index); }).join('') +
                '</div></section>';
        }
        if (def.type === 'key-value-object') {
            return '<div class="form-group"><label>' + escapeHtml(def.label) + '</label><textarea rows="5" data-content-key="' + escapeHtml(def.key) + '" data-content-type="key-value-object">' + escapeHtml(JSON.stringify(isPlainObject(value) ? value : {}, null, 2)) + '</textarea>' + help + '</div>';
        }
        if (def.type === 'checkbox') {
            return '<div class="form-group"><label class="checkbox-label"><input type="checkbox" data-content-key="' + escapeHtml(def.key) + '" data-content-type="checkbox"' + (value ? ' checked' : '') + '> ' + escapeHtml(def.label) + '</label>' + help + '</div>';
        }
        if (def.type === 'textarea' || def.type === 'multiline-list' || def.type === 'id-list-string') {
            return '<div class="form-group"><label>' + escapeHtml(def.label) + '</label><textarea rows="3" data-content-key="' + escapeHtml(def.key) + '" data-content-type="' + escapeHtml(def.type) + '"' + (def.type === 'readonly' ? ' readonly' : '') + '>' + escapeHtml(valueToText(value, def.type)) + '</textarea>' + help + '</div>';
        }
        return '<div class="form-group"><label>' + escapeHtml(def.label) + '</label><input type="text" data-content-key="' + escapeHtml(def.key) + '" data-content-type="' + escapeHtml(def.type || 'text') + '" value="' + escapeHtml(valueToText(value, def.type)) + '"' + (def.type === 'readonly' ? ' readonly' : '') + '>' + help + '</div>';
    }

    function renderArrayItem(def, item, index) {
        return '<div class="content-repeat-item" data-array-item><div class="content-repeat-head"><strong>' + escapeHtml(def.itemLabel || def.label) + ' ' + (index + 1) + '</strong><div><button type="button" class="btn btn-secondary btn-sm" data-content-action="move-up">上移</button><button type="button" class="btn btn-secondary btn-sm" data-content-action="move-down">下移</button><button type="button" class="btn btn-danger btn-sm" data-content-action="remove-item">删除</button></div></div>' +
            renderFields(def.fields || [], isPlainObject(item) ? item : {}) + '</div>';
    }

    function renderFields(fields, data) {
        return (fields || []).map(function (def) {
            return renderField(def, data || {});
        }).join('');
    }

    function renderContentEditor(viewName, bodyJson) {
        var editor = document.getElementById(viewName + '-editor');
        if (!editor) return;
        editor.innerHTML = renderFields(getContentBlockSchema(viewName), bodyJson || {});
    }

    function collectValue(el) {
        var type = el.getAttribute('data-content-type') || 'text';
        if (type === 'checkbox') return !!el.checked;
        if (type === 'multiline-list' || type === 'id-list-string') {
            return String(el.value || '').split(/\r?\n/).map(function (item) { return item.trim(); }).filter(Boolean);
        }
        if (type === 'key-value-object') {
            var text = String(el.value || '').trim();
            if (!text) return {};
            return JSON.parse(text);
        }
        return String(el.value || '').trim();
    }

    function collectFields(container, fields) {
        var result = {};
        fields.forEach(function (def) {
            if (def.type === 'group') {
                var groupPanel = findNearestGroupPanel(container, def.key);
                var group = collectFields(groupPanel || container, def.fields || []);
                if (!isEmptyValue(group)) result[def.key] = group;
                return;
            }
            if (def.type === 'repeatable-array') {
                var panel = findNearestArrayPanel(container, def.key);
                var list = panel ? panel.querySelector('.content-repeat-list') : null;
                var values = [];
                if (list) {
                    Array.prototype.forEach.call(list.children, function (item) {
                        if (item.hasAttribute('data-array-item')) values.push(collectFields(item, def.fields || []));
                    });
                }
                result[def.key] = values.filter(function (item) { return !isEmptyValue(item); });
                return;
            }
            var el = container.querySelector('[data-content-key="' + def.key + '"]');
            if (el) result[def.key] = collectValue(el);
        });
        return result;
    }

    function findNearestArrayPanel(container, key) {
        var panels = container.querySelectorAll('[data-array-field="' + key + '"]');
        return panels.length ? panels[0] : null;
    }

    function findNearestGroupPanel(container, key) {
        var panels = container.querySelectorAll('[data-group-field="' + key + '"]');
        return panels.length ? panels[0] : null;
    }

    function collectContentEditorData(viewName) {
        var editor = document.getElementById(viewName + '-editor');
        if (!editor) return {};
        return collectFields(editor, getContentBlockSchema(viewName));
    }

    function renderContentSummary(viewName, data, block) {
        var summary = document.getElementById(viewName + '-summary');
        if (!summary) return;
        var title = getPath(data, 'hero.title') || getPath(data, 'hero.title_en') || data.name || block.title_en || '未填写';
        var image = getPath(data, 'hero.backgroundImage') || getPath(data, 'hero.image') || data.cover_image || '';
        var listCount = 0;
        Object.keys(data || {}).forEach(function (key) {
            if (Array.isArray(data[key])) listCount += data[key].length;
        });
        var seo = data.seo || {};
        var seoCount = ['title', 'description', 'keywords'].filter(function (key) { return String(seo[key] || '').trim(); }).length;
        var updated = block.updated_at ? new Date(block.updated_at).toLocaleString('zh-CN') : '暂无';
        summary.innerHTML = '<div class="content-summary-card"><span>主标题</span><strong>' + escapeHtml(title) + '</strong></div>' +
            '<div class="content-summary-card"><span>主图片路径</span><strong>' + escapeHtml(image || '未填写') + '</strong></div>' +
            '<div class="content-summary-card"><span>列表项数量</span><strong>' + listCount + '</strong></div>' +
            '<div class="content-summary-card"><span>SEO 完整度</span><strong>' + seoCount + '/3</strong></div>' +
            '<div class="content-summary-card"><span>最后更新时间</span><strong>' + escapeHtml(updated) + '</strong></div>';
    }

    function loadContentBlock(viewName) {
        var slug = VIEW_TO_SLUG[viewName];
        if (!slug) return;
        var editor = document.getElementById(viewName + '-editor');
        if (editor) editor.innerHTML = '<div class="table-empty"><p>正在加载内容...</p></div>';
        apiRequest('/admin/content-blocks/' + encodeURIComponent(slug)).then(function (response) {
            var block = response.data;
            contentBlockCache[viewName] = block;
            document.getElementById(viewName + '-title-en').value = block.title_en || '';
            document.getElementById(viewName + '-title-ar').value = block.title_ar || '';
            document.getElementById(viewName + '-raw-json').textContent = JSON.stringify(block.body_json || {}, null, 2);
            renderContentEditor(viewName, block.body_json || {});
            renderContentSummary(viewName, block.body_json || {}, block);
        }).catch(function (err) {
            if (editor) editor.innerHTML = '<div class="table-empty"><p>加载失败，请稍后重试。</p></div>';
            showMessage('加载内容失败：' + err.message, 'error');
        });
    }

    function saveContentBlock(viewName) {
        var slug = VIEW_TO_SLUG[viewName];
        var block = contentBlockCache[viewName];
        if (!slug || !block) return;
        var status = document.getElementById(viewName + '-status');
        var collected;
        try {
            collected = collectContentEditorData(viewName);
        } catch (err) {
            showMessage('表单内容格式错误：' + err.message, 'error');
            return;
        }
        var merged = mergePreservingUnknownFields(block.body_json || {}, collected);
        if (status) status.textContent = '保存中...';
        apiRequest('/admin/content-blocks/' + encodeURIComponent(slug), {
            method: 'PUT',
            body: {
                title_en: document.getElementById(viewName + '-title-en').value,
                title_ar: document.getElementById(viewName + '-title-ar').value,
                version: block.version,
                body_json: merged
            }
        }).then(function (response) {
            contentBlockCache[viewName] = response.data;
            document.getElementById(viewName + '-raw-json').textContent = JSON.stringify(response.data.body_json || {}, null, 2);
            renderContentEditor(viewName, response.data.body_json || {});
            renderContentSummary(viewName, response.data.body_json || {}, response.data);
            if (status) status.textContent = '已保存';
            showMessage('内容已保存');
        }).catch(function (err) {
            if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
                showMessage('保存失败：内容已被其他人更新，请刷新后再编辑。', 'error');
            } else {
                showMessage('保存失败：' + err.message, 'error');
            }
            if (status) status.textContent = '保存失败';
        });
    }

    function handleEditorClick(e) {
        var target = e.target;
        if (!target || !target.getAttribute) return;
        var action = target.getAttribute('data-content-action');
        if (!action) return;
        e.preventDefault();
        var item = target.closest('[data-array-item]');
        if (action === 'remove-item') {
            if (!item) return;
            if (!window.confirm('删除后该内容不会在页面显示，确定删除吗？')) return;
            item.parentNode.removeChild(item);
            return;
        }
        if (action === 'move-up' && item && item.previousElementSibling) {
            item.parentNode.insertBefore(item, item.previousElementSibling);
            return;
        }
        if (action === 'move-down' && item && item.nextElementSibling) {
            item.parentNode.insertBefore(item.nextElementSibling, item);
            return;
        }
        if (action === 'add-item') {
            var panel = target.closest('[data-array-field]');
            if (!panel) return;
            var view = target.closest('[data-content-view]').getAttribute('data-content-view');
            var key = panel.getAttribute('data-array-field');
            var def = findArrayDef(getContentBlockSchema(view), key);
            var list = panel.querySelector('.content-repeat-list');
            if (def && list) list.insertAdjacentHTML('beforeend', renderArrayItem(def, {}, list.children.length));
        }
    }

    function findArrayDef(fields, key) {
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].type === 'repeatable-array' && fields[i].key === key) return fields[i];
            if (fields[i].fields) {
                var nested = findArrayDef(fields[i].fields, key);
                if (nested) return nested;
            }
        }
        return null;
    }

    function initContentBlocks() {
        Object.keys(VIEW_TO_SLUG).forEach(function (viewName) {
            var form = document.getElementById('form-' + viewName);
            if (form) {
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    saveContentBlock(viewName);
                });
                form.addEventListener('click', handleEditorClick);
            }
        });

        document.querySelectorAll('.sidebar-nav a[data-view]').forEach(function (link) {
            link.addEventListener('click', function () {
                var view = link.getAttribute('data-view');
                if (!VIEW_TO_SLUG[view]) return;
                setTimeout(function () {
                    var title = document.getElementById('header-title');
                    if (title) title.textContent = VIEW_TITLES[view] || '内容管理';
                    loadContentBlock(view);
                }, 0);
            });
        });
    }

    window.getContentBlockSchema = getContentBlockSchema;
    window.renderContentEditor = renderContentEditor;
    window.collectContentEditorData = collectContentEditorData;
    window.mergePreservingUnknownFields = mergePreservingUnknownFields;
    window.renderContentSummary = renderContentSummary;

    initContentBlocks();
}());
