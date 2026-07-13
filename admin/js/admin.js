(function () {
    'use strict';

    var adminRoot = window.LongxiangAdmin = window.LongxiangAdmin || {};
    var isLoginShell = !!document.getElementById('login-page');
    var isAdminShell = !!document.getElementById('admin-page');
    var fallbackCore = {
        escapeHtml: function (value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },
        getToken: function () {
            return localStorage.getItem('admin_token');
        },
        setToken: function (token) {
            localStorage.setItem('admin_token', token);
        },
        removeToken: function () {
            localStorage.removeItem('admin_token');
        },
        getUsername: function () {
            return localStorage.getItem('admin_username') || 'admin';
        },
        setUsername: function (name) {
            localStorage.setItem('admin_username', name);
        }
    };
    var fallbackApi = {
        API_BASE: '/api',
        apiRequest: function (url, options) {
            options = options || {};
            var headers = options.headers || {};
            var token = adminCore.getToken();
            if (token) headers.Authorization = 'Bearer ' + token;

            if (options.body && !(options.body instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(options.body);
            }
            options.headers = headers;

            return fetch(fallbackApi.API_BASE + url, options).then(function (res) {
                if (res.status === 401 || res.status === 403) {
                    adminCore.removeToken();
                    window.location.href = 'login.html';
                    return Promise.reject(new Error('登录已失效，请重新登录'));
                }

                return res.text().then(function (text) {
                    var data = text ? JSON.parse(text) : {};
                    if (!res.ok) {
                        var message = data.message || (data.error && data.error.message) || data.error || '请求失败';
                        var err = new Error(message);
                        err.status = res.status;
                        err.code = data.error && data.error.code;
                        err.data = data;
                        err.details = data && data.data;
                        throw err;
                    }
                    return data;
                });
            });
        },
        unwrapDataResponse: function (response) {
            if (response && response.ok && response.data !== undefined) return response.data;
            return response;
        },
        unwrapListResponse: function (response) {
            if (response && response.ok && response.data && response.data.items) return response.data.items;
            if (response && response.ok && Array.isArray(response.data)) return response.data;
            if (response && response.items) return response.items;
            if (Array.isArray(response)) return response;
            return [];
        }
    };
    var fallbackUi = {
        showToast: function (message, type) {
            type = type || 'success';
            var container = document.getElementById('toast-container');
            if (!container) return;

            var toast = document.createElement('div');
            toast.className = 'toast ' + type;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(function () {
                toast.style.animation = 'toastOut 0.3s ease forwards';
                setTimeout(function () {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 300);
            }, 3000);
        },
        trapFocus: function (modalEl, onEscape) {
            if (!modalEl) return;
            this.releaseFocusTrap(modalEl);
            var selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

            function getFocusable() {
                return Array.prototype.slice.call(modalEl.querySelectorAll(selector)).filter(function (el) {
                    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
                });
            }

            function onKeydown(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    if (onEscape) onEscape();
                    return;
                }
                if (e.key !== 'Tab') return;
                var focusable = getFocusable();
                if (!focusable.length) return;
                var first = focusable[0];
                var last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }

            modalEl.__focusTrapHandler = onKeydown;
            modalEl.addEventListener('keydown', onKeydown);
            setTimeout(function () {
                var focusable = getFocusable();
                if (focusable.length) focusable[0].focus();
            }, 0);
        },
        releaseFocusTrap: function (modalEl) {
            if (modalEl && modalEl.__focusTrapHandler) {
                modalEl.removeEventListener('keydown', modalEl.__focusTrapHandler);
                modalEl.__focusTrapHandler = null;
            }
        }
    };
    var missingAdminModules = isAdminShell && (!adminRoot.core || !adminRoot.api || !adminRoot.ui);
    if (missingAdminModules) {
        console.error('Longxiang admin modules failed to load. Check admin-core.js, admin-api.js and admin-ui.js load order.');
        return;
    }

    var adminCore = adminRoot.core || (isLoginShell ? fallbackCore : null);
    var adminApi = adminRoot.api || (isLoginShell ? fallbackApi : null);
    var adminUi = adminRoot.ui || (isLoginShell ? fallbackUi : null);
    if (!adminCore || !adminApi || !adminUi) {
        console.error('Longxiang admin runtime is not available.');
        return;
    }

    if (isLoginShell) {
        adminRoot.core = adminCore;
        adminRoot.api = adminApi;
        adminRoot.ui = adminUi;
    }

    var API_BASE = adminApi.API_BASE;
    var CATEGORIES = [
        { value: 'oil-immersed', group: 'transformer', subCategory: 'oil-immersed', label: 'Oil Immersed Transformer', labelAr: 'محول مغمور بالزيت' },
        { value: 'dry-type', group: 'transformer', subCategory: 'dry-type', label: 'Dry Type Transformer', labelAr: 'محول جاف' },
        { value: 'combined', group: 'transformer', subCategory: 'combined', label: 'Combined Transformer', labelAr: 'محول مدمج' },
        { value: 'special', group: 'transformer', subCategory: 'special', label: 'Special Transformer', labelAr: 'محول خاص' },
        { value: 'ac', group: 'ev-charger', subCategory: 'ac', label: 'AC EV Charging Station', labelAr: 'محطة شحن تيار متردد' },
        { value: 'dc', group: 'ev-charger', subCategory: 'dc', label: 'DC EV Charging Station', labelAr: 'محطة شحن تيار مستمر' },
        { value: 'high-voltage', group: 'switchgear', subCategory: 'high-voltage', label: 'High-Voltage Switchgear', labelAr: 'معدات مفاتيح الجهد العالي' },
        { value: 'medium-low-voltage', group: 'switchgear', subCategory: 'medium-low-voltage', label: 'Medium&Low Voltage Switchgear', labelAr: 'معدات مفاتيح الجهد المتوسط والمنخفض' },
        { value: 'energy-storage', group: 'energy-storage', subCategory: 'energy-storage', label: 'Energy Storage System', labelAr: 'نظام تخزين الطاقة' }
    ];
    var STATUS_LABELS = { new: '新询盘', read: '已读', replied: '已回复', closed: '已关闭' };
    var STATUS_BADGES = { new: 'badge-gold', read: 'badge-blue', replied: 'badge-green', closed: 'badge-navy' };
    var ADMIN_PRODUCT_NAME_CN = {
        'anti-short-amorphous': '抗短路油浸式非晶合金铁芯配电变压器',
        'amorphous-veg-oil': '非晶合金（植物油）高过载配电变压器',
        'aluminum': '油浸式电力变压器（铝）',
        'single-phase-dry': '单相干式非晶合金铁心配电变压器',
        '3phase-3limb': '三相三柱干式非晶合金变压器',
        '3phase-5limb': '三相五柱干式非晶合金变压器',
        'traction': '牵引矿用隔爆型变压器',
        'wind-power': 'ZGSBH15 风力发电用组合式变压器（植物油）',
        'pv-combined': 'ZGS13 光伏发电用组合式变压器',
        'gcs': 'GCS 低压抽出式开关柜',
        'LXAC-7kW': '7kW 交流充电桩（无屏版）',
        'LXAC-7kW-display': '7kW 交流充电桩（带屏版）',
        'LXAC-14kW': '14kW 双枪交流充电桩',
        'LXDC-20-30-40kW': '20kW / 30kW / 40kW 小功率直流充电桩',
        'LXDC-120-400kW': '120kW-400kW 直流充电桩',
        'LXDC480-1280kW': '480kW-1280kW 直流充电堆',
        'portable-storage-1kw-3kwh': '1kW / 3kWh 便携式储能系统',
        'portable-storage-3kw-5kwh': '3kW / 5kWh 便携式储能系统',
        'TS-MES-115K12L': '高倍率液冷储能柜',
        'TS-LES-920K100L': '高倍率液冷储能集装箱',
        'ZGSBH15-PV': 'ZGSBH15 光伏用非晶合金组合式变压器',
        'ZGS13-WIND': 'ZGS13 风力发电用组合式变压器',
        'compact-cooling-box': '节能散热紧凑型箱式变压器',
        'box-type-substation': '箱式变电站',
        'GGD': 'GGD 低压固定式成套开关柜',
        'KYN28-12': 'KYN28-12 户内金属铠装移开式开关柜',
        'KYN-12': 'KYN-12 户内干燥空气金属铠装移开式开关柜',
        'LXWZ': 'LXWZ 高压无功补偿成套装置',
        'silicon-scb-dry': 'SC(B)13 / SC(B)14 / SC(B)18 硅钢叠片干式变压器',
        'silicon-smrl-wound-core': 'S13 / S20 / S22-M.RL 油浸式立体卷铁芯配电变压器',
        'silicon-smrl-anti-short': 'S13 / S20 / S22-M.RL 抗短路立体卷铁芯变压器',
        'silicon-sm-oil-power': 'S13 / S20 / S22-M 油浸式电力变压器',
        'silicon-s13-vegetable-oil-high-overload': 'S13-M 植物油高过载配电变压器',
        'amorphous-scbh-dry': 'SC(B)H15 / SC(B)H17 / SC(B)H19 干式非晶合金铁芯变压器',
        'amorphous-dgh-furnace': 'DGH 系列干式非晶合金电炉变压器',
        'amorphous-sbh-mrl-wound-core': 'S(B)H21-M.RL 油浸式非晶合金立体卷铁芯变压器',
        'amorphous-sbh15-m': 'S(B)H15-M 油浸式非晶合金配电变压器',
        'amorphous-sbh21-m': 'S(B)H21-M 油浸式非晶合金配电变压器',
        'amorphous-sbh25-m': 'S(B)H25-M 油浸式非晶合金配电变压器'
    };
    var ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    var ICON_DELETE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
    var ICON_VIEW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

    function getToken() {
        return adminCore.getToken();
    }

    function setToken(token) {
        adminCore.setToken(token);
    }

    function removeToken() {
        adminCore.removeToken();
    }

    function getUsername() {
        return adminCore.getUsername();
    }

    function setUsername(name) {
        adminCore.setUsername(name);
    }

    function escapeHtml(value) {
        return adminCore.escapeHtml(value);
    }

    function adminProductNameCn(product) {
        if (!product) return '';
        var keys = [product.legacy_id, product.slug, product.id];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i] == null ? '' : String(keys[i]);
            if (Object.prototype.hasOwnProperty.call(ADMIN_PRODUCT_NAME_CN, key)) {
                return ADMIN_PRODUCT_NAME_CN[key];
            }
        }
        return '';
    }

    function apiRequest(url, options) {
        return adminApi.apiRequest(url, options);
    }

    function unwrapDataResponse(response) {
        return adminApi.unwrapDataResponse(response);
    }

    function unwrapListResponse(response) {
        return adminApi.unwrapListResponse(response);
    }

    function showToast(message, type) {
        adminUi.showToast(message, type);
    }

    function trapFocus(modalEl, onEscape) {
        adminUi.trapFocus(modalEl, onEscape);
    }

    function releaseFocusTrap(modalEl) {
        adminUi.releaseFocusTrap(modalEl);
    }

    function showConfirm(title, message) {
        return new Promise(function (resolve) {
            var overlay = document.getElementById('confirm-overlay');
            var titleEl = document.getElementById('confirm-title');
            var msgEl = document.getElementById('confirm-message');
            var btnOk = document.getElementById('confirm-ok');
            var btnCancel = document.getElementById('confirm-cancel');
            var triggerEl = document.activeElement;

            titleEl.textContent = title;
            msgEl.textContent = message;
            msgEl.classList.toggle('confirm-message-long', String(message || '').indexOf('\n') !== -1);
            overlay.classList.add('show');
            trapFocus(overlay, onCancel);

            function cleanup() {
                overlay.classList.remove('show');
                releaseFocusTrap(overlay);
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
                if (triggerEl && triggerEl.focus) triggerEl.focus();
            }

            function onOk() {
                cleanup();
                resolve(true);
            }

            function onCancel() {
                cleanup();
                resolve(false);
            }

            btnOk.addEventListener('click', onOk);
            btnCancel.addEventListener('click', onCancel);
        });
    }

    if (document.getElementById('login-page')) {
        initLogin();
        return;
    }

    if (document.getElementById('admin-page')) {
        initAdmin();
    }

    function initLogin() {
        var token = getToken();
        if (token) {
            fetch(API_BASE + '/auth/verify', { headers: { Authorization: 'Bearer ' + token } })
                .then(function (res) {
                    if (res.ok) window.location.href = 'index.html';
                    else removeToken();
                })
                .catch(removeToken);
        }

        var form = document.getElementById('login-form');
        var errorEl = document.getElementById('login-error');
        var btnLogin = document.getElementById('btn-login');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var username = document.getElementById('login-username').value.trim();
            var password = document.getElementById('login-password').value;

            if (!username || !password) {
                errorEl.textContent = '请输入用户名和密码';
                errorEl.classList.add('show');
                return;
            }

            errorEl.classList.remove('show');
            btnLogin.disabled = true;
            btnLogin.textContent = '登录中...';

            fetch(API_BASE + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            }).then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok) throw new Error(data.message || data.error || '登录失败');
                    return data;
                });
            }).then(function (data) {
                setToken(data.token);
                setUsername(data.username);
                window.location.href = 'index.html';
            }).catch(function (err) {
                errorEl.textContent = err.message;
                errorEl.classList.add('show');
                btnLogin.disabled = false;
                btnLogin.textContent = '登录';
            });
        });
    }

    function initAdmin() {
        var token = getToken();
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        fetch(API_BASE + '/auth/verify', { headers: { Authorization: 'Bearer ' + token } })
            .then(function (res) {
                if (!res.ok) {
                    removeToken();
                    window.location.href = 'login.html';
                }
            })
            .catch(function () {
                removeToken();
                window.location.href = 'login.html';
            });

        var inquiries = [];
        var certifications = [];
        var certificationCategoryMap = {};
        var certificationViewRows = {};
        var certsByView = {};
        var activeCertByView = {};
        var openedCertification = null;
        var contentBlockCache = {};
        var trashedProducts = [];
        var trashedCerts = [];
        var educationContent = null;
        var productCategories = [];
        var editingInquiryId = null;
        var openedInquiry = null;
        var activeInquiryId = null;
        var editingCertificationId = null;
        var uploadedCertificationPath = '';
        var currentView = 'dashboard';
        var inquiryPage = 1;
        var inquiryMeta = { page: 1, pageSize: 20, total: 0 };
        var inquirySearchTimer = null;
        var inquiryUnreadOnly = false;
        var inquiryModule = null;
        var productModule = null;
        var certPageByView = {};
        var certMetaByView = {};
        var certSearchTimers = {};
        var auditLogPage = 1;
        var auditLogMeta = { page: 1, pageSize: 20, total: 0 };
        var auditRows = [];
        var activeAuditLogId = null;
        var assetPage = 1;
        var assetMeta = { page: 1, pageSize: 20, total: 0 };
        var assetRows = [];
        var assetViewMode = 'grid';
        var selectedAssetIds = {};
        var activeAssetId = null;
        var assetUploading = false;
        var assetDuplicateOpen = false;
        var assetSearchTimer = null;
        var assetPickerTimer = null;
        var assetPickerState = {
            open: false,
            page: 1,
            pageSize: 24,
            total: 0,
            rows: [],
            selectedId: null,
            selectedAsset: null,
            type: 'image',
            module: 'assets',
            entityType: '',
            entityId: '',
            title: '选择资源',
            subtitle: '从资源库选择图片，或上传新图片后直接使用。',
            onSelect: null
        };
        var activeTrashTab = 'trash-products';
        var activeCategoryId = null;
        var collapsedCategoryParents = {};
        var formDirty = false;
        var menuVisibilitySettings = null;
        var dashboardDataCache = null;
        var dirtyMessage = '当前有未保存的修改，是否确认离开？离开后修改将丢失。';
        var activeModalTrigger = null;
        var suppressHashChange = false;
        var NAV_GROUP_STORAGE_KEY = 'admin-nav-groups';
        var VIEW_META = {
            dashboard: { title: '控制台', group: 'overview', groupLabel: '概况', breadcrumb: '概况 › 控制台', description: '查看网站后台关键数据与最近动态。' },
            products: { title: '产品列表', group: 'products', groupLabel: '产品', breadcrumb: '产品 › 产品列表', description: '管理产品资料、状态、分类与首页推荐。' },
            categories: { title: '分类管理', group: 'products', groupLabel: '产品', breadcrumb: '产品 › 分类管理', description: '维护产品分类名称、排序与展示状态。' },
            inquiries: { title: '询盘列表', group: 'inquiries', groupLabel: '询盘', breadcrumb: '询盘 › 询盘列表', description: '查看客户询盘并进行状态跟进或批量处理。' },
            'visual-builder': { title: '可视化管理', group: 'visual', groupLabel: '可视化管理', breadcrumb: '可视化管理', description: '左侧预览真实前台页面，右侧按当前子模块编辑中文字段。' },
            'content-home': { title: '首页', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 首页', description: '维护首页 Hero、统计、CTA 等内容块。' },
            'content-solutions': { title: '解决方案', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 解决方案', description: '维护解决方案页面内容块。' },
            'content-company-overview': { title: '企业概况', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 企业概况', description: '维护公开网站企业概况内容块。' },
            'content-contact': { title: '联系我们', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 联系我们', description: '维护联系页展示内容与联系信息。' },
            'content-about': { title: '关于我们', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 关于我们', description: '维护关于我们页面的核心内容。' },
            'content-product-pages': { title: '产品页面', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 产品页面', description: '维护产品列表、产品详情、FAQ 与询盘表单文案。' },
            'content-global-shell': { title: '全站壳层', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 全站壳层', description: '维护导航、页脚、全站默认 SEO 和通用询盘文案。' },
            'content-technology': { title: '科技创新', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 科技创新', description: '维护科技创新页面内容块。' },
            'content-industries': { title: '应用行业', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 应用行业', description: '维护应用行业页面内容块。' },
            'content-education': { title: '教育合作', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 教育合作', description: '维护教育合作页面内容块。' },
            'content-page-blocks': { title: '页面区块', group: 'content', groupLabel: '内容', breadcrumb: '内容 › 页面区块', description: '维护公开网站页面级区块配置。' },
            'cert-qualifications': { title: '企业资质', group: 'certificates', groupLabel: '证书', breadcrumb: '证书 › 企业资质', description: '管理企业资质证书资料与展示状态。' },
            'cert-patents': { title: '专利证书', group: 'certificates', groupLabel: '证书', breadcrumb: '证书 › 专利证书', description: '管理专利证书资料与展示状态。' },
            'cert-software': { title: '软著', group: 'certificates', groupLabel: '证书', breadcrumb: '证书 › 软著', description: '管理软件著作权资料与展示状态。' },
            'cert-test-reports': { title: '检测报告', group: 'certificates', groupLabel: '证书', breadcrumb: '证书 › 检测报告', description: '管理检测报告资料与展示状态。' },
            assets: { title: '资源库', group: 'resources', groupLabel: '资源', breadcrumb: '资源 › 资源库', description: '管理已上传图片和文件资源。' },
            'audit-logs': { title: '审计日志', group: 'system', groupLabel: '系统', breadcrumb: '系统 › 审计日志', description: '查看后台关键操作记录。' },
            'settings-modules': { title: '菜单显示设置', group: 'system', groupLabel: '系统', breadcrumb: '系统 › 菜单显示', description: '控制后台左侧菜单和控制台快捷入口是否显示，不影响数据、接口和前台页面。' },
            'system-status': { title: '系统状态', group: 'system', groupLabel: '系统', breadcrumb: '系统 › 系统状态', description: '查看服务、存储和运行状态。' },
            trash: { title: '回收站', group: 'system', groupLabel: '系统', breadcrumb: '系统 › 回收站', description: '恢复或永久删除已移入回收站的内容。' }
        };

        var visualBuilderState = {
            initialized: false,
            activePage: 'home',
            activeModule: 'hero',
            activeLanguage: 'default',
            blocks: {},
            activeAssetField: null,
            assetsLoaded: false
        };

        var VISUAL_BUILDER_LANGUAGES = [
            { key: 'default', code: 'en', suffix: '', label: '英文/默认', shortLabel: '英', previewLabel: '英文页面', fieldLabel: '英文/默认' },
            { key: 'fr', code: 'fr', suffix: 'Fr', label: '法语', shortLabel: '法', previewLabel: '法语页面', fieldLabel: '法语', dir: 'ltr' },
            { key: 'ru', code: 'ru', suffix: 'Ru', label: '俄语', shortLabel: '俄', previewLabel: '俄语页面', fieldLabel: '俄语', dir: 'ltr' },
            { key: 'ar', code: 'ar', suffix: 'Ar', label: '阿拉伯语', shortLabel: '阿', previewLabel: '阿语页面', fieldLabel: '阿语', dir: 'rtl' }
        ];

        function visualSolutionFeatureFields(imageCount) {
            var fields = [
                { key: 'indexLabel', label: '方案编号', type: 'text' },
                { key: 'title', label: '方案标题', type: 'text' },
                { key: 'text', label: '方案说明', type: 'textarea' },
                { key: 'bullets', label: '要点列表（每行一项）', type: 'list' },
                { key: 'button.label', label: '按钮文字', type: 'text' },
                { key: 'button.href', label: '按钮链接', type: 'url' },
                { key: 'button.productName', label: '询盘产品名', type: 'text' }
            ];
            for (var i = 0; i < imageCount; i += 1) {
                fields.push({ key: 'images.' + i + '.src', label: '展示图片 ' + (i + 1), type: 'asset', localized: false });
                fields.push({ key: 'images.' + i + '.alt', label: '图片说明 ' + (i + 1), type: 'text' });
            }
            return fields;
        }

        function visualSolutionCardFields() {
            return [
                { key: 'title', label: '卡片标题', type: 'text' },
                { key: 'text', label: '卡片说明', type: 'textarea' },
                { key: 'image.src', label: '卡片图片', type: 'asset', localized: false },
                { key: 'image.alt', label: '图片说明', type: 'text' }
            ];
        }


        function visualEducationModeFields() {
            return [
                { key: 'modeNumber', label: '板块编号', type: 'text', localized: false },
                { key: 'title', label: '板块标题', type: 'text', required: true },
                { key: 'tagline', label: '一句话亮点', type: 'text' },
                { key: 'summary', label: '详细说明', type: 'textarea' },
                { key: 'body', label: '补充段落（每行一段）', type: 'list' },
                { key: 'bestFor', label: '适合对象', type: 'textarea' },
                { key: 'deliverables', label: '交付内容（每行一项）', type: 'list' },
                { key: 'outcomes', label: '合作成果（每行一项）', type: 'list' },
                { key: 'image', label: '主图', type: 'asset', localized: false },
                { key: 'images', label: '证明图片', type: 'image-grid', localized: false, maxItems: 3, help: '用于当前合作方向左侧证明图，最多 3 张，支持本地上传和从资源库选择。' }
            ];
        }

        function visualEducationCardFields() {
            return [
                { key: 'title', label: '卡片标题', type: 'text' },
                { key: 'text', label: '卡片说明', type: 'textarea' }
            ];
        }

        var VISUAL_BUILDER_PAGES = [
            {
                key: 'home',
                label: '首页',
                slug: 'home',
                previewUrl: '../index.html',
                modules: [
                    { key: 'hero', label: '首屏', path: 'hero', previewSelector: '.hero-hex', fields: [
                        { key: 'title', label: '主标题', type: 'text', required: true },
                        { key: 'subtitle', label: '副标题', type: 'textarea' },
                        { key: 'backgroundImage', label: '背景图', type: 'asset' },
                        { key: 'logo', label: '品牌图', type: 'asset' }
                    ] },
                    { key: 'heroActions', label: '首屏按钮', path: 'hero.actions', previewSelector: '.hero-hex-actions, .hero-hex-buttons, .hero-hex', array: true, itemLabel: '按钮', fields: [
                        { key: 'label', label: '按钮文字', type: 'text' },
                        { key: 'href', label: '按钮链接', type: 'url' },
                        { key: 'className', label: '按钮样式', type: 'text' }
                    ] },
                    { key: 'advantages', label: '企业优势', path: 'features', previewSelector: '[data-home-features], #why-choose', array: true, itemLabel: '优势', fields: [
                        { key: 'title', label: '标题', type: 'text' },
                        { key: 'text', label: '说明', type: 'textarea' },
                        { key: 'icon', label: '图标/符号', type: 'text' }
                    ] },
                    { key: 'products', label: '产品推荐', path: 'products', previewSelector: '[data-home-products], #products', fields: [
                        { key: 'title', label: '模块标题', type: 'text' },
                        { key: 'text', label: '模块说明', type: 'textarea' },
                        { key: 'allProductsLabel', label: '按钮文字', type: 'text' },
                        { key: 'allProductsHref', label: '按钮链接', type: 'url' }
                    ] },
                    { key: 'applications', label: '应用行业', path: 'applications', previewSelector: '[data-home-applications], #applications', fields: [
                        { key: 'title', label: '模块标题', type: 'text' },
                        { key: 'text', label: '模块说明', type: 'textarea' },
                        { key: 'button.label', label: '按钮文字', type: 'text' },
                        { key: 'button.href', label: '按钮链接', type: 'url' },
                        { key: 'enabled', label: '前台显示', type: 'toggle' }
                    ] },
                    { key: 'news', label: '新闻动态', path: 'news', previewSelector: '[data-home-news], #news', fields: [
                        { key: 'title', label: '模块标题', type: 'text' },
                        { key: 'text', label: '模块说明', type: 'textarea' },
                        { key: 'button.label', label: '按钮文字', type: 'text' },
                        { key: 'button.href', label: '按钮链接', type: 'url' },
                        { key: 'enabled', label: '前台显示', type: 'toggle' }
                    ] },
                    { key: 'cta', label: '底部 CTA', path: 'cta', previewSelector: '[data-home-cta], .cta-section', fields: [
                        { key: 'title', label: '标题', type: 'text' },
                        { key: 'text', label: '说明', type: 'textarea' },
                        { key: 'button.label', label: '按钮文字', type: 'text' },
                        { key: 'button.href', label: '按钮链接', type: 'url' }
                    ] }
                ]
            },
            {
                key: 'about',
                label: '关于我们',
                slug: 'about-us',
                previewUrl: '../about.html',
                modules: [
                    { key: 'hero', label: '页面头图', path: 'hero', previewSelector: '.about-page-hero, .page-hero', fields: [
                        { key: 'kicker', label: '栏目小标题', type: 'text' },
                        { key: 'title', label: '页面标题', type: 'text' },
                        { key: 'subtitle', label: '页面说明', type: 'textarea' },
                        { key: 'image', label: '头图', type: 'asset' },
                        { key: 'backgroundImage', label: '背景图', type: 'asset' }
                    ] },
                    { key: 'snapshot', label: '公司简介', path: 'snapshot', previewSelector: '.about-snapshot-section', fields: [
                        { key: 'kicker', label: '小标题', type: 'text' },
                        { key: 'title', label: '标题', type: 'text' },
                        { key: 'text', label: '简介', type: 'textarea' },
                        { key: 'video.poster', label: '展示图', type: 'asset' }
                    ] },
                    { key: 'history', label: '发展历程', path: 'milestones', previewSelector: '.about-history-section', array: true, itemLabel: '历程', fields: [
                        { key: 'date', label: '年份/日期', type: 'text' },
                        { key: 'title', label: '标题', type: 'text' },
                        { key: 'text', label: '说明', type: 'textarea' }
                    ] },
                    { key: 'honors', label: '荣誉资质', path: 'quality', previewSelector: '.about-quality-section', fields: [
                        { key: 'kicker', label: '小标题', type: 'text' },
                        { key: 'title', label: '标题', type: 'text' },
                        { key: 'text', label: '说明', type: 'textarea' },
                        { key: 'image', label: '展示图', type: 'asset' }
                    ] },
                    { key: 'capability', label: '项目全流程能力', path: 'capability', previewSelector: '.about-capability-section', fields: [
                        { key: 'kicker', label: '小标题', type: 'text' },
                        { key: 'title', label: '模块标题', type: 'textarea' },
                        { key: 'text', label: '模块说明', type: 'textarea' }
                    ], children: [
                        { key: 'capabilityCards', label: '能力卡片', path: 'capability.cards', previewSelector: '.about-capability-grid', array: true, allowStructureChanges: false, structureLockHelp: '当前顺序与多语言内容绑定，如需调整请走结构迁移流程。', itemLabel: '能力卡片', fields: [
                            { key: 'title', label: '卡片标题', type: 'text' },
                            { key: 'text', label: '卡片说明', type: 'textarea' },
                            { key: 'image.src', label: '卡片图片', type: 'asset', localized: false, syncDimensions: true },
                            { key: 'image.alt', label: '图片说明', type: 'text' }
                        ] }
                    ] },
                    { key: 'factory', label: '真实生产场景', path: 'factory', previewSelector: '.about-factory-section', fields: [
                        { key: 'kicker', label: '小标题', type: 'text' },
                        { key: 'title', label: '模块标题', type: 'textarea' },
                        { key: 'text', label: '模块说明', type: 'textarea' }
                    ], children: [
                        { key: 'factoryImages', label: '工厂图片', path: 'factory.images', previewSelector: '.about-factory-grid', array: true, allowStructureChanges: false, structureLockHelp: '当前顺序与多语言内容绑定，如需调整请走结构迁移流程；第一张图片为重点大图。', itemLabel: '工厂图片', fields: [
                            { key: 'caption', label: '图片标题', type: 'text' },
                            { key: 'image.src', label: '工厂图片', type: 'asset', localized: false, syncDimensions: true },
                            { key: 'image.alt', label: '图片说明', type: 'text' }
                        ] }
                    ] }
                ]
            },
            {
                key: 'products',
                label: '产品中心',
                slug: 'product-pages',
                previewUrl: '../products.html',
                modules: [
                    { key: 'hero', label: '页面标题', path: 'productsHero', previewSelector: '.page-hero', fields: [
                        { key: 'title', label: '页面标题', type: 'text' },
                        { key: 'subtitle', label: '页面说明', type: 'textarea' },
                        { key: 'backgroundImage', label: '背景图', type: 'asset' }
                    ] },
                    { key: 'intro', label: '说明文案', path: 'listingSupport', previewSelector: '[data-product-listing-support]', fields: [
                        { key: 'title', label: '标题', type: 'text' },
                        { key: 'text', label: '说明', type: 'textarea' }
                    ] },
                    { key: 'settings', label: '列表展示设置', path: 'listingCta', previewSelector: '[data-product-listing-cta]', fields: [
                        { key: 'title', label: '引导标题', type: 'text' },
                        { key: 'text', label: '引导说明', type: 'textarea' },
                        { key: 'button.label', label: '按钮文字', type: 'text' },
                        { key: 'button.href', label: '按钮链接', type: 'url' }
                    ] },
                    { key: 'detail', label: '详情页公共文案', path: '', previewUrl: '../product-detail.html', previewSelector: '.product-detail-section, [data-product-detail-support], [data-product-detail-inquiry]', fields: [
                        { key: 'detailHero.title', label: '详情页标题', type: 'text' },
                        { key: 'detailHero.subtitle', label: '详情页说明', type: 'textarea' },
                        { key: 'detailSupport.title', label: '技术支持标题', type: 'text' },
                        { key: 'detailSupport.text', label: '技术支持说明', type: 'textarea' },
                        { key: 'inquiryForm.title', label: '询盘表单标题', type: 'text' },
                        { key: 'inquiryForm.note', label: '询盘表单说明', type: 'textarea' },
                        { key: 'inquiryForm.submitLabel', label: '提交按钮文字', type: 'text' }
                    ], children: [
                        { key: 'detailFaqItems', label: '详情 FAQ', path: 'detailFaq', previewSelector: '[data-product-detail-faq]', array: true, itemLabel: 'FAQ', fields: [
                            { key: 'question', label: '问题', type: 'text' },
                            { key: 'answer', label: '答案', type: 'textarea' }
                        ] }
                    ] }
                ]
            },
            {
                key: 'solutions',
                label: '解决方案',
                slug: 'solutions',
                previewUrl: '../solutions.html',
                modules: [
                    { key: 'hero', label: '页面头图', path: 'hero', previewSelector: '.solutions-hero, .page-hero', fields: [
                        { key: 'title', label: '页面标题', type: 'text' },
                        { key: 'subtitle', label: '页面说明', type: 'textarea' },
                        { key: 'backgroundImage', label: '背景图片', type: 'asset', localized: false }
                    ], children: [
                        { key: 'heroActions', label: '头图按钮', path: 'hero.actions', previewSelector: '.solutions-hero-actions, .solutions-hero', array: true, itemLabel: '按钮', fields: [
                            { key: 'label', label: '按钮文字', type: 'text' },
                            { key: 'href', label: '按钮链接/锚点', type: 'url' },
                            { key: 'productName', label: '询盘产品名', type: 'text' },
                            { key: 'className', label: '按钮样式', type: 'text', localized: false }
                        ] },
                        { key: 'anchors', label: '锚点导航', path: 'anchors', previewSelector: '.solutions-anchor-bar', array: true, itemLabel: '导航项', fields: [
                            { key: 'label', label: '显示名称', type: 'text' },
                            { key: 'href', label: '跳转锚点', type: 'text', localized: false }
                        ] }
                    ] },
                    { key: 'overview', label: '方案总览', path: 'overview', previewSelector: '.solutions-overview', fields: [
                        { key: 'title', label: '模块标题', type: 'text' },
                        { key: 'text', label: '模块说明', type: 'textarea' }
                    ], children: [
                        { key: 'overviewCards', label: '总览卡片', path: 'overview.cards', previewSelector: '.solutions-overview-grid', array: true, itemLabel: '总览卡片', fields: [
                            { key: 'number', label: '序号', type: 'text', localized: false },
                            { key: 'title', label: '卡片标题', type: 'text' },
                            { key: 'text', label: '卡片说明', type: 'textarea' },
                            { key: 'items', label: '卡片要点（每行一项）', type: 'list' }
                        ] }
                    ] },
                    { key: 'marketFit', label: '市场适配', path: 'marketFit', previewSelector: '.market-fit-section', fields: [
                        { key: 'title', label: '模块标题', type: 'text' },
                        { key: 'text', label: '模块说明', type: 'textarea' }
                    ], children: [
                        { key: 'marketItems', label: '市场条目', path: 'marketFit.items', previewSelector: '.market-fit-section .export-support-grid', array: true, itemLabel: '市场条目', fields: [
                            { key: 'title', label: '条目标题', type: 'text' },
                            { key: 'text', label: '条目说明', type: 'textarea' }
                        ] }
                    ] },
                    { key: 'engineeringEpc', label: 'EPC 工程总承包', path: 'sections.0', sectionId: 'engineering-epc', previewSelector: '#engineering-epc', fields: visualSolutionFeatureFields(3), children: [
                        { key: 'epcCases', label: 'EPC 案例卡片', path: 'sections.1.cards', sectionTitle: 'Representative General Contracting References', sectionPath: 'cards', previewSelector: '#engineering-epc + .section, .solution-system-map', array: true, itemLabel: '案例卡片', fields: visualSolutionCardFields() }
                    ] },
                    { key: 'lineOm', label: '线路运维', path: 'sections.2', sectionId: 'line-om', previewSelector: '#line-om', fields: visualSolutionFeatureFields(2), children: [
                        { key: 'lineOmRecords', label: '运维案例卡片', path: 'sections.3.cards', sectionTitle: 'Operation Coverage and Service Records', sectionPath: 'cards', previewSelector: '#line-om + .section, .solution-system-map', array: true, itemLabel: '案例卡片', fields: visualSolutionCardFields() }
                    ] },
                    { key: 'powerDistribution', label: '变配电集成', path: 'sections.4', sectionId: 'power-distribution', previewSelector: '#power-distribution', fields: visualSolutionFeatureFields(3) },
                    { key: 'pvSolution', label: '工商业光伏', path: 'sections.5', sectionId: 'pv-solution', previewSelector: '#pv-solution', fields: visualSolutionFeatureFields(2) },
                    { key: 'storageCharging', label: '风光储充', path: 'sections.6', sectionId: 'wind-pv-ess-ev', previewSelector: '#wind-pv-ess-ev', fields: visualSolutionFeatureFields(4), children: [
                        { key: 'energyTopology', label: '系统拓扑卡片', path: 'sections.7.cards', sectionTitle: 'Energy Flow and System Topology', sectionPath: 'cards', previewSelector: '#wind-pv-ess-ev + .section, .solution-system-map', array: true, itemLabel: '拓扑卡片', fields: visualSolutionCardFields() }
                    ] },
                    { key: 'smartMicrogrid', label: '智能微电网', path: 'sections.8', sectionId: 'smart-microgrid', previewSelector: '#smart-microgrid', fields: visualSolutionFeatureFields(3) },
                    { key: 'evChargingStation', label: '充电站建设', path: 'sections.9', sectionId: 'ev-charging-station', previewSelector: '#ev-charging-station', fields: visualSolutionFeatureFields(4) },
                    { key: 'scenarios', label: '应用场景', path: 'scenarios', previewSelector: '.solution-scenarios', fields: [
                        { key: 'title', label: '模块标题', type: 'text' },
                        { key: 'text', label: '模块说明', type: 'textarea' }
                    ], children: [
                        { key: 'scenarioCards', label: '场景卡片', path: 'scenarios.cards', previewSelector: '.solution-scenario-grid', array: true, itemLabel: '场景卡片', fields: visualSolutionCardFields() }
                    ] },
                    { key: 'credentials', label: '资质能力', path: 'credentials', previewSelector: '.solution-credibility', fields: [
                        { key: 'title', label: '模块标题', type: 'text' },
                        { key: 'text', label: '模块说明', type: 'textarea' }
                    ], children: [
                        { key: 'credentialItems', label: '资质图片', path: 'credentials.items', previewSelector: '.solution-credential-strip', array: true, itemLabel: '资质图片', fields: [
                            { key: 'label', label: '资质名称', type: 'text' },
                            { key: 'image.src', label: '资质图片', type: 'asset', localized: false },
                            { key: 'image.alt', label: '图片说明', type: 'text' }
                        ] }
                    ] },
                    { key: 'cta', label: '询盘 CTA', path: 'cta', previewSelector: '.solutions-cta', fields: [
                        { key: 'title', label: '标题', type: 'text' },
                        { key: 'text', label: '说明', type: 'textarea' },
                        { key: 'parameters', label: '询盘参数（每行一项）', type: 'list' },
                        { key: 'button.label', label: '按钮文字', type: 'text' },
                        { key: 'button.href', label: '按钮链接', type: 'url' },
                        { key: 'button.productName', label: '询盘产品名', type: 'text' }
                    ] },
                    { key: 'seo', label: 'SEO', path: 'seo', fields: [
                        { key: 'title', label: 'SEO 标题', type: 'text' },
                        { key: 'description', label: 'SEO 描述', type: 'textarea' },
                        { key: 'image', label: '分享图片', type: 'asset', localized: false },
                        { key: 'canonicalPath', label: '规范路径', type: 'text', localized: false }
                    ] }
                ]
            },
            {
                key: 'education',
                label: '教育合作',
                slug: 'education',
                previewUrl: '../education.html',
                modules: [
                    {
                        key: 'hero',
                        label: '页面首屏',
                        path: 'hero',
                        previewSelector: '.education-page-hero',
                        fields: [
                            { key: 'eyebrow', label: '小标题', type: 'text' },
                            { key: 'title', label: '主标题', type: 'textarea', required: true },
                            { key: 'subtitle', label: '简介', type: 'textarea' },
                            { key: 'backgroundImage', label: '背景图', type: 'asset', localized: false }
                        ]
                    },
                    {
                        key: 'stats',
                        label: '核心数字',
                        path: 'stats',
                        previewSelector: '#education-proof',
                        array: true,
                        itemLabel: '数字',
                        fields: [
                            { key: 'id', label: '内部标识', type: 'text', localized: false },
                            { key: 'value', label: '数字', type: 'text', localized: false },
                            { key: 'label', label: '说明文字', type: 'text' }
                        ]
                    },
                    {
                        key: 'intro',
                        label: '合作模式引导',
                        path: 'intro',
                        previewSelector: '#cooperation-models',
                        fields: [
                            { key: 'kicker', label: '小标题', type: 'text' },
                            { key: 'title', label: '引导标题', type: 'textarea' },
                            { key: 'text', label: '引导说明', type: 'textarea' }
                        ]
                    },

                    {
                        key: 'industryCollege',
                        label: '产业学院合作',
                        sectionId: 'industry-college',
                        previewSelector: '#industry-college',
                        fields: visualEducationModeFields(),
                        children: [
                            {
                                key: 'industryCollegeCards',
                                label: '说明卡片',
                                sectionId: 'industry-college',
                                sectionPath: 'cards',
                                previewSelector: '#industry-college .education-offer-grid',
                                array: true,
                                itemLabel: '说明卡片',
                                fields: visualEducationCardFields()
                            }
                        ]
                    },
                    {
                        key: 'talentTraining',
                        label: '人才培养合作',
                        sectionId: 'talent-training',
                        previewSelector: '#talent-training',
                        fields: visualEducationModeFields(),
                        children: [
                            {
                                key: 'talentTrainingCards',
                                label: '说明卡片',
                                sectionId: 'talent-training',
                                sectionPath: 'cards',
                                previewSelector: '#talent-training .education-offer-grid',
                                array: true,
                                itemLabel: '说明卡片',
                                fields: visualEducationCardFields()
                            }
                        ]
                    },
                    {
                        key: 'trainingEquipment',
                        label: '实训设备与场景',
                        sectionId: 'training-equipment',
                        previewSelector: '#training-equipment',
                        fields: visualEducationModeFields(),
                        children: [
                            {
                                key: 'trainingEquipmentCards',
                                label: '说明卡片',
                                sectionId: 'training-equipment',
                                sectionPath: 'cards',
                                previewSelector: '#training-equipment .education-offer-grid',
                                array: true,
                                itemLabel: '说明卡片',
                                fields: visualEducationCardFields()
                            }
                        ]
                    },
                    {
                        key: 'researchGlobal',
                        label: '科研与国际合作',
                        sectionId: 'research-global',
                        previewSelector: '#research-global',
                        fields: visualEducationModeFields(),
                        children: [
                            {
                                key: 'researchGlobalCards',
                                label: '说明卡片',
                                sectionId: 'research-global',
                                sectionPath: 'cards',
                                previewSelector: '#research-global .education-offer-grid',
                                array: true,
                                itemLabel: '说明卡片',
                                fields: visualEducationCardFields()
                            }
                        ]
                    },
                    {
                        key: 'gallery',
                        label: '图片资料',
                        sectionId: 'gallery',
                        previewSelector: '#education-gallery',
                        fields: [
                            { key: 'title', label: '标题', type: 'text' },
                            { key: 'summary', label: '说明文字', type: 'textarea' },
                            { key: 'images', label: '图片资料', type: 'image-grid', localized: false, maxItems: 9 }
                        ]
                    },
                    {
                        key: 'philosophy',
                        label: '合作理念',
                        sectionId: 'cooperation-philosophy',
                        previewSelector: '#cooperation-philosophy',
                        fields: [
                            { key: 'title', label: '理念小标题', type: 'text' },
                            { key: 'summary', label: '理念标题', type: 'text' },
                            { key: 'body', label: '段落内容（每行一段）', type: 'list' }
                        ]
                    },
                    {
                        key: 'cta',
                        label: '底部 CTA',
                        path: 'cta',
                        previewSelector: '#education-contact',
                        fields: [
                            { key: 'title', label: '标题', type: 'text' },
                            { key: 'text', label: '说明文字', type: 'textarea' },
                            { key: 'buttonText', label: '按钮文字', type: 'text' },
                            { key: 'href', label: '按钮跳转链接', type: 'url', localized: false },
                            { key: 'backgroundImage', label: '背景图', type: 'asset', localized: false }
                        ]
                    },
                    {
                        key: 'seo',
                        label: 'SEO',
                        path: 'seo',
                        fields: [
                            { key: 'title', label: 'SEO 标题', type: 'text' },
                            { key: 'description', label: 'SEO 描述', type: 'textarea' },
                            { key: 'image', label: '分享图', type: 'asset', localized: false },
                            { key: 'canonicalPath', label: '规范路径', type: 'text', localized: false }
                        ]
                    }
                ]
            },
            {
                key: 'contact',
                label: '联系我们',
                slug: 'contact',
                previewUrl: '../contact.html',
                modules: [
                    { key: 'hero', label: '页面头图', path: 'hero', previewSelector: '.page-hero', fields: [
                        { key: 'title', label: '页面标题', type: 'text' },
                        { key: 'subtitle', label: '页面说明', type: 'textarea' },
                        { key: 'backgroundImage', label: '背景图', type: 'asset' }
                    ] },
                    { key: 'contactInfo', label: '联系方式', path: '', previewSelector: '.contact-primary-section, .contact-info-card', fields: [
                        { key: 'phone', label: '电话', type: 'text' },
                        { key: 'email', label: '邮箱', type: 'email', localized: false },
                        { key: 'instagram', label: 'Instagram URL', type: 'url', localized: false },
                        { key: 'youtube', label: 'YouTube URL', type: 'url', localized: false },
                        { key: 'address', label: '地址', type: 'textarea' },
                        { key: 'headquarters', label: '总部地址', type: 'textarea' },
                        { key: 'officeHours', label: '办公时间', type: 'text' }
                    ] },
                    { key: 'map', label: '地图信息', path: '', previewSelector: '.contact-location-panel, .contact-map-frame', fields: [
                        { key: 'googleMapsEmbedUrl', label: 'Google 地图嵌入链接', type: 'url' },
                        { key: 'openStreetMapUrl', label: 'OpenStreetMap 链接', type: 'url' },
                        { key: 'mapQr', label: '地图二维码', type: 'asset' }
                    ] },
                    { key: 'form', label: '表单说明', path: 'contactPage.form', previewSelector: '.contact-form-section', fields: [
                        { key: 'title', label: '表单标题', type: 'text' },
                        { key: 'note', label: '表单说明', type: 'textarea' },
                        { key: 'submitLabel', label: '提交按钮文字', type: 'text' }
                    ] },
                    { key: 'faq', label: '常见问题', path: 'contactPage.faq', previewSelector: '.faq-block', fields: [
                        { key: 'title', label: 'FAQ 标题', type: 'text' },
                        { key: 'text', label: 'FAQ 说明', type: 'textarea' }
                    ], children: [
                        { key: 'contactFaqItems', label: 'FAQ 条目', path: 'contactPage.faq.items', previewSelector: '.faq-block', array: true, itemLabel: 'FAQ', fields: [
                            { key: 'question', label: '问题', type: 'text' },
                            { key: 'answer', label: '答案', type: 'textarea' }
                        ] }
                    ] }
                ]
            },
            {
                key: 'global',
                label: '全站公共',
                slug: 'global-shell',
                previewUrl: '../index.html',
                modules: [
                    { key: 'navigation', label: '导航', path: 'navigation.mainLinks', previewSelector: '.navbar', array: true, itemLabel: '导航项', fields: [
                        { key: 'label', label: '显示名称', type: 'text' },
                        { key: 'href', label: '链接', type: 'url' }
                    ] },
                    { key: 'contactBar', label: '顶部联系栏', path: 'navigation.contactBar', previewSelector: '.header-contact-bar, .navbar', fields: [
                        { key: 'enabled', label: '启用顶部联系栏', type: 'toggle', localized: false },
                        { key: 'showEmail', label: '显示邮箱', type: 'toggle', localized: false },
                        { key: 'showInstagram', label: '显示 Instagram', type: 'toggle', localized: false },
                        { key: 'showYouTube', label: '显示 YouTube', type: 'toggle', localized: false }
                    ] },
                    { key: 'footer', label: '底部信息', path: 'footer', previewSelector: 'footer, .footer', fields: [
                        { key: 'text', label: '公司简介', type: 'textarea' },
                        { key: 'copyright', label: '版权信息', type: 'text' }
                    ] },
                    { key: 'icp', label: '备案信息', path: 'footer', previewSelector: '.footer-bottom, footer', fields: [
                        { key: 'icp', label: '备案号', type: 'text' }
                    ] },
                    { key: 'floating', label: '浮动联系入口', path: 'inquiry', previewSelector: '.floating-inquiry, #inquiry-modal, footer', fields: [
                        { key: 'floatingLabel', label: '浮动按钮文字', type: 'text' },
                        { key: 'title', label: '询盘标题', type: 'text' },
                        { key: 'text', label: '询盘说明', type: 'textarea' },
                        { key: 'submitLabel', label: '提交按钮文字', type: 'text' }
                    ] },
                    { key: 'seo', label: 'SEO 默认值', path: 'seoDefaults', fields: [
                        { key: 'title', label: '默认标题', type: 'text' },
                        { key: 'description', label: '默认描述', type: 'textarea' }
                    ] }
                ]
            }
        ];

        var usernameEl = document.getElementById('sidebar-username');
        var avatarEl = document.getElementById('sidebar-avatar');
        if (usernameEl) usernameEl.textContent = getUsername();
        if (avatarEl) avatarEl.textContent = getUsername().charAt(0).toUpperCase();

        bindNavigation();
        bindHeaderActions();
        bindDirtyTracking();
        bindDashboardActions();
        bindProductEvents();
        bindInquiryEvents();
        bindCompanyEvents();
        bindCertificationEvents();
        bindCategoryEvents();
        bindEducationEvents();
        bindContentBlockEvents();
        bindVisualBuilderEvents();
        bindSystemSettingsEvents();
        bindTrashEvents();
        bindAssetsEvents();
        bindAssetPickerEvents();
        loadMenuVisibilitySettings({ silent: true });
        loadProductCategories();
        loadCertificationCategories();
        bindHashRouting();
        switchView(initialViewFromHash(), { skipDirtyCheck: true });

        function getInquiryModule() {
            if (!inquiryModule) {
                var inquiryFactory = window.LongxiangAdminModules && window.LongxiangAdminModules.inquiries;
                if (!inquiryFactory) throw new Error('询盘模块未加载');

                inquiryModule = inquiryFactory({
                    apiRequest: apiRequest,
                    unwrapDataResponse: unwrapDataResponse,
                    unwrapListResponse: unwrapListResponse,
                    escapeHtml: escapeHtml,
                    showToast: showToast,
                    showConfirm: showConfirm,
                    skeletonRows: skeletonRows,
                    emptyRow: emptyRow,
                    clearErrorBanner: clearErrorBanner,
                    showErrorBanner: showErrorBanner,
                    bindRangeCheckboxes: bindRangeCheckboxes,
                    syncBatchBarFocus: syncBatchBarFocus,
                    bindModalClose: bindModalClose,
                    showModal: showModal,
                    closeModal: closeModal,
                    formatDate: formatDate,
                    resetFormDirty: resetFormDirty,
                    confirmDiscardChanges: confirmDiscardChanges,
                    renderPagination: window.renderPagination,
                    getCurrentView: function () { return currentView; },
                    setActiveModalTrigger: function (element) { activeModalTrigger = element; },
                    getActiveElement: function () { return document.activeElement; },
                    getInquiries: function () { return inquiries; },
                    setInquiries: function (value) { inquiries = Array.isArray(value) ? value : []; },
                    getInquiryPage: function () { return inquiryPage; },
                    setInquiryPage: function (value) { inquiryPage = value; },
                    getInquiryMeta: function () { return inquiryMeta; },
                    setInquiryMeta: function (value) { inquiryMeta = value || { page: inquiryPage, pageSize: 20, total: 0 }; },
                    getInquirySearchTimer: function () { return inquirySearchTimer; },
                    setInquirySearchTimer: function (value) { inquirySearchTimer = value; },
                    getInquiryUnreadOnly: function () { return inquiryUnreadOnly; },
                    setInquiryUnreadOnly: function (value) { inquiryUnreadOnly = !!value; },
                    getEditingInquiryId: function () { return editingInquiryId; },
                    setEditingInquiryId: function (value) { editingInquiryId = value; },
                    getOpenedInquiry: function () { return openedInquiry; },
                    setOpenedInquiry: function (value) { openedInquiry = value; },
                    getActiveInquiryId: function () { return activeInquiryId; },
                    setActiveInquiryId: function (value) { activeInquiryId = value; },
                    STATUS_LABELS: STATUS_LABELS,
                    STATUS_BADGES: STATUS_BADGES,
                    ICON_VIEW: ICON_VIEW,
                    ICON_DELETE: ICON_DELETE
                });
            }
            return inquiryModule;
        }


        function getProductModule() {
            if (!productModule) {
                var productFactory = window.LongxiangAdminModules && window.LongxiangAdminModules.products;
                if (!productFactory) throw new Error('产品模块未加载');

                productModule = productFactory({
                    apiRequest: apiRequest,
                    unwrapDataResponse: unwrapDataResponse,
                    unwrapListResponse: unwrapListResponse,
                    escapeHtml: escapeHtml,
                    showToast: showToast,
                    showConfirm: showConfirm,
                    skeletonRows: skeletonRows,
                    emptyRow: emptyRow,
                    clearErrorBanner: clearErrorBanner,
                    showErrorBanner: showErrorBanner,
                    formatDate: formatDate,
                    bindModalClose: bindModalClose,
                    showModal: showModal,
                    closeModal: closeModal,
                    switchView: switchView,
                    resetFormDirty: resetFormDirty,
                    markFormDirty: markFormDirty,
                    showDraftRecovery: showDraftRecovery,
                    draftKey: draftKey,
                    restoreFormDraft: restoreFormDraft,
                    collectFormDraft: collectFormDraft,
                    safeSessionRemove: safeSessionRemove,
                    safeSessionSet: safeSessionSet,
                    showConflictNotice: showConflictNotice,
                    adminProductNameCn: adminProductNameCn,
                    assetPreviewSrc: assetPreviewSrc,
                    uploadAdminAssetFile: uploadAdminAssetFile,
                    openAssetPicker: openAssetPicker,
                    loadProductCategories: loadProductCategories,
                    populateProductCategorySelects: populateProductCategorySelects,
                    buildVersionMap: buildVersionMap,
                    runBatchAction: runBatchAction,
                    batchActionLabel: batchActionLabel,
                    setActiveModalTrigger: function (element) { activeModalTrigger = element; },
                    getActiveElement: function () { return document.activeElement; },
                    ICON_VIEW: ICON_VIEW,
                    ICON_EDIT: ICON_EDIT,
                    ICON_DELETE: ICON_DELETE
                });
            }
            return productModule;
        }

        function bindNavigation() {
            initNavGroups();

            document.querySelectorAll('.sidebar-nav a[data-view]').forEach(function (link) {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (link.getAttribute('data-visual-nav-page')) {
                        if (!selectVisualModule(link.getAttribute('data-visual-nav-page'), link.getAttribute('data-visual-nav-module'))) return;
                        if (switchView('visual-builder', { skipDirtyCheck: true })) closeMobileSidebar();
                        return;
                    }
                    if (switchView(link.getAttribute('data-view'))) closeMobileSidebar();
                });
            });

            document.querySelectorAll('[data-visual-page-toggle]').forEach(function (button) {
                button.addEventListener('click', function () {
                    var pageEl = button.closest('.visual-nav-page');
                    var wasExpanded = button.getAttribute('aria-expanded') === 'true';
                    button.setAttribute('aria-expanded', wasExpanded ? 'false' : 'true');
                    if (pageEl) pageEl.classList.toggle('is-collapsed', wasExpanded);
                    if (!wasExpanded) {
                        var page = visualPageByKey(button.getAttribute('data-visual-page-toggle'));
                        var module = page && page.modules && page.modules[0];
                        if (module && selectVisualModule(page.key, module.key)) switchView('visual-builder', { skipDirtyCheck: true });
                    }
                });
            });

            var logoutLink = document.getElementById('nav-logout');
            if (logoutLink) {
                logoutLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    removeToken();
                    localStorage.removeItem('admin_username');
                    window.location.href = 'login.html';
                });
            }

            var mobileMenuBtn = document.getElementById('mobile-menu-btn');
            var sidebar = document.getElementById('sidebar');
            var sidebarOverlay = document.getElementById('sidebar-overlay');
            if (mobileMenuBtn) {
                mobileMenuBtn.addEventListener('click', function () {
                    sidebar.classList.toggle('open');
                    sidebarOverlay.classList.toggle('show');
                });
            }
            if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

            function closeMobileSidebar() {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('show');
            }
        }

        function bindHeaderActions() {
            var addProduct = document.getElementById('header-add-product');
            if (addProduct) {
                addProduct.addEventListener('click', function () {
                    if (!isMenuVisible('products')) {
                        showToast('产品入口已在菜单显示设置中隐藏', 'error');
                        return;
                    }
                    if (!switchView('products')) return;
                    setTimeout(function () { openProductModal(null); }, 50);
                });
            }

            var newInquiries = document.getElementById('header-new-inquiries');
            if (newInquiries) {
                newInquiries.addEventListener('click', function () {
                    if (!isMenuVisible('inquiries')) {
                        showToast('询盘入口已在菜单显示设置中隐藏', 'error');
                        return;
                    }
                    if (!switchView('inquiries')) return;
                    setInquiryUnreadFilter(true);
                });
            }

            var assetsButton = document.getElementById('header-assets');
            if (assetsButton) assetsButton.addEventListener('click', function () {
                if (!isMenuVisible('assets')) {
                    showToast('资源库入口已在菜单显示设置中隐藏', 'error');
                    return;
                }
                switchView('assets');
            });

            var refreshButton = document.getElementById('header-refresh');
            if (refreshButton) refreshButton.addEventListener('click', reloadCurrentView);
        }

        function bindDirtyTracking() {
            document.addEventListener('input', function (e) {
                if (isDirtyTrackedField(e.target)) markFormDirty();
            });
            document.addEventListener('change', function (e) {
                if (isDirtyTrackedField(e.target)) markFormDirty();
            });
            window.addEventListener('beforeunload', function (e) {
                if (!formDirty) return;
                e.preventDefault();
                e.returnValue = dirtyMessage;
                return dirtyMessage;
            });
        }

        function bindHashRouting() {
            window.addEventListener('hashchange', function () {
                if (suppressHashChange) {
                    suppressHashChange = false;
                    return;
                }
                var view = initialViewFromHash();
                if (view === currentView) return;
                if (formDirty && !window.confirm(dirtyMessage)) {
                    suppressHashChange = true;
                    history.pushState(null, '', '#' + currentView);
                    return;
                }
                resetFormDirty();
                switchView(view, { skipDirtyCheck: true, skipHash: true });
            });
        }

        function initialViewFromHash() {
            var raw = (window.location.hash || '').replace(/^#/, '').split('?')[0];
            return VIEW_META[raw] ? raw : 'dashboard';
        }

        function isDirtyTrackedField(target) {
            if (!target || !target.matches || !target.matches('input, textarea, select')) return false;
            return !!target.closest('.modal-overlay, .content-block-form, .visual-builder-root, #company-form, #module-settings-form');
        }

        function markFormDirty() {
            formDirty = true;
        }

        function resetFormDirty() {
            formDirty = false;
        }

        function confirmDiscardChanges() {
            if (!formDirty) return true;
            if (!window.confirm(dirtyMessage)) return false;
            resetFormDirty();
            return true;
        }

        function showConflictNotice(message, reloadFn) {
            var host = document.querySelector('.modal-overlay.show .modal-body') || document.querySelector('.view-section.active');
            if (!host) {
                showToast(message, 'error');
                return;
            }
            var existing = host.querySelector('.conflict-banner');
            if (existing) existing.parentNode.removeChild(existing);
            var banner = document.createElement('div');
            banner.className = 'conflict-banner';
            banner.setAttribute('role', 'alert');
            banner.innerHTML = '<span>' + escapeHtml(message) + '</span><button type="button" class="btn btn-secondary btn-sm">重新加载</button>';
            banner.querySelector('button').addEventListener('click', function () {
                resetFormDirty();
                if (reloadFn) reloadFn();
                else reloadCurrentView();
            });
            host.insertBefore(banner, host.firstChild);
            showToast(message, 'error');
        }

        function draftKey(type, idOrView) {
            if (type === 'content') return 'draft-' + idOrView;
            return 'draft-' + type + '-' + (idOrView || 'new');
        }

        function safeSessionSet(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
            } catch (err) {
                showToast('浏览器未能保存本地草稿', 'error');
            }
        }

        function safeSessionGet(key) {
            try {
                var raw = sessionStorage.getItem(key);
                return raw ? JSON.parse(raw) : null;
            } catch (err) {
                return null;
            }
        }

        function safeSessionRemove(key) {
            try {
                sessionStorage.removeItem(key);
            } catch (err) {}
        }

        function collectFormDraft(formId) {
            var form = document.getElementById(formId);
            var draft = {};
            if (!form) return draft;
            form.querySelectorAll('input, textarea, select').forEach(function (field) {
                if (!field.id || field.type === 'file') return;
                draft[field.id] = field.type === 'checkbox' ? field.checked : field.value;
            });
            return draft;
        }

        function restoreFormDraft(formId, draft) {
            var form = document.getElementById(formId);
            if (!form || !draft) return;
            Object.keys(draft).forEach(function (id) {
                var field = document.getElementById(id);
                if (!field) return;
                if (field.type === 'checkbox') field.checked = !!draft[id];
                else field.value = draft[id] == null ? '' : draft[id];
            });
            if (formId === 'product-form') {
                setProductCoverPath(draft['field-cover-image'] || getProductUploadedImagePath() || '');
                if (getProductUploadedImagePath()) showImagePreview('../' + getProductUploadedImagePath());
            }
            if (formId === 'certification-form') uploadedCertificationPath = (draft['cert-image'] || uploadedCertificationPath || '');
            markFormDirty();
        }

        function setProductCoverPath(path) {
            return getProductModule().setProductCoverPath(path);
        }

        function getProductUploadPath(response) {
            return getProductModule().getProductUploadPath(response);
        }

        function getProductUploadedImagePath() {
            return getProductModule().getUploadedImagePath();
        }

        function assetPreviewSrc(path) {
            path = String(path || '').trim();
            if (!path) return '';
            if (/^(https?:)?\/\//i.test(path) || path.charAt(0) === '/' || /^data:/i.test(path) || /^blob:/i.test(path)) return path;
            return '../' + path.replace(/^\/+/, '');
        }

        function uploadAdminAssetFile(file, context) {
            var formData = new FormData();
            formData.append('file', file);
            context = context || {};
            Object.keys(context).forEach(function (key) {
                if (context[key] != null && context[key] !== '') formData.append(key, context[key]);
            });
            return fetch(API_BASE + '/admin/assets/upload', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + getToken() },
                body: formData
            }).then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok) {
                        var message = data.message || (data.error && data.error.message) || data.error || 'Upload failed';
                        throw new Error(message);
                    }
                    return data;
                });
            });
        }

        function setProductSubmitDisabled(disabled) {
            return getProductModule().setProductSubmitDisabled(disabled);
        }

        function showDraftRecovery(host, key, restoreFn) {
            var draft = safeSessionGet(key);
            if (!host || !draft) return;
            var existing = host.querySelector('.draft-recovery-banner');
            if (existing) existing.parentNode.removeChild(existing);
            var banner = document.createElement('div');
            banner.className = 'draft-recovery-banner';
            banner.innerHTML = '<span>发现未保存草稿，是否恢复？</span><div class="draft-recovery-actions"><button type="button" class="btn btn-primary btn-sm" data-draft-restore>恢复</button><button type="button" class="btn btn-secondary btn-sm" data-draft-ignore>忽略</button></div>';
            banner.querySelector('[data-draft-restore]').addEventListener('click', function () {
                restoreFn(draft);
                safeSessionRemove(key);
                banner.remove();
                showToast('草稿已恢复');
            });
            banner.querySelector('[data-draft-ignore]').addEventListener('click', function () {
                safeSessionRemove(key);
                banner.remove();
            });
            host.insertBefore(banner, host.firstChild);
        }

        function reloadCurrentView() {
            var view = currentView;
            if (view === 'dashboard') loadDashboard();
            else if (view === 'products') loadProducts();
            else if (view === 'categories') {
                loadProductCategoriesView();
                loadProductCategories();
            } else if (view === 'inquiries') loadInquiries();
            else if (view === 'cert-qualifications' || view === 'cert-patents' || view === 'cert-software' || view === 'cert-test-reports') loadCertView(view);
            else if (view === 'visual-builder') loadVisualBuilder();
            else if (isContentBlockView(view)) loadContentBlock(view);
            else if (view === 'trash') loadTrash();
            else if (view === 'assets') loadAssets();
            else if (view === 'system-status') loadSystemStatus();
            else if (view === 'settings-modules') loadModuleSettings();
            else if (view === 'audit-logs') loadAuditLogs();
        }

        function initNavGroups() {
            var storedState = readNavGroupState();
            var hasStoredState = storedState && Object.keys(storedState).length > 0;

            document.querySelectorAll('.nav-group').forEach(function (groupEl) {
                var group = groupEl.getAttribute('data-group');
                var toggle = groupEl.querySelector('.nav-group-toggle');
                if (!group || !toggle) return;

                var expanded = hasStoredState ? storedState[group] !== false : groupContainsView(groupEl, currentView);
                setNavGroupExpanded(groupEl, expanded, false);

                toggle.addEventListener('click', function () {
                    setNavGroupExpanded(groupEl, toggle.getAttribute('aria-expanded') !== 'true', true);
                });
            });

            if (!hasStoredState) saveNavGroupState();
        }

        function groupContainsView(groupEl, view) {
            return !!groupEl.querySelector('a[data-view="' + view + '"]');
        }

        function setNavGroupExpanded(groupEl, expanded, persist) {
            var toggle = groupEl && groupEl.querySelector('.nav-group-toggle');
            if (!toggle) return;
            toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            if (persist) saveNavGroupState();
        }

        function readNavGroupState() {
            try {
                return JSON.parse(localStorage.getItem(NAV_GROUP_STORAGE_KEY) || '{}') || {};
            } catch (err) {
                return {};
            }
        }

        function saveNavGroupState() {
            var state = {};
            document.querySelectorAll('.nav-group').forEach(function (groupEl) {
                var group = groupEl.getAttribute('data-group');
                var toggle = groupEl.querySelector('.nav-group-toggle');
                if (group && toggle) state[group] = toggle.getAttribute('aria-expanded') === 'true';
            });
            try {
                localStorage.setItem(NAV_GROUP_STORAGE_KEY, JSON.stringify(state));
            } catch (err) {}
        }

        function isProtectedMenuKey(key) {
            return key === 'dashboard' || key === 'settings';
        }

        function defaultMenuVisibilitySettings() {
            return moduleKeys().reduce(function (result, key) {
                result[key] = true;
                return result;
            }, {});
        }

        function hasOwn(obj, key) {
            return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
        }

        function normalizeVisibilityValue(value) {
            return !(value === false || value === 0 || value === '0' || value === 'false');
        }

        function normalizeMenuVisibilitySettings(data) {
            var normalized = defaultMenuVisibilitySettings();
            data = data || {};
            moduleKeys().forEach(function (key) {
                if (hasOwn(data, key)) normalized[key] = normalizeVisibilityValue(data[key]);
            });
            if (!hasOwn(data, 'visual') && hasOwn(data, 'content')) {
                normalized.visual = normalizeVisibilityValue(data.content);
            }
            Object.keys(normalized).forEach(function (key) {
                if (isProtectedMenuKey(key)) normalized[key] = true;
            });
            return normalized;
        }

        function setElementVisible(el, visible) {
            if (!el) return;
            el.hidden = !visible;
            el.setAttribute('aria-hidden', visible ? 'false' : 'true');
        }

        function menuKeyForView(view) {
            if (!view) return '';
            if (view === 'dashboard') return 'dashboard';
            if (view === 'products' || view === 'categories') return 'products';
            if (view === 'visual-builder') return 'visual';
            if (view === 'inquiries') return 'inquiries';
            if (view === 'assets') return 'assets';
            if (view.indexOf('cert-') === 0) return 'certifications';
            if (view === 'audit-logs' || view === 'settings-modules' || view === 'system-status' || view === 'trash') return 'settings';
            return '';
        }

        function dashboardActionMenuKey(action, targetView) {
            if (action === 'todo') return menuKeyForView(targetView);
            if (action === 'add-product' || action === 'view-products' || action === 'view-product-drafts' || action === 'view-categories') return 'products';
            if (action === 'view-inquiries' || action === 'view-unread-inquiries' || action === 'view-new-inquiries') return 'inquiries';
            if (action === 'view-assets') return 'assets';
            if (action === 'view-certifications') return 'certifications';
            if (action === 'view-visual-builder' || action === 'open-visual') return 'visual';
            if (action === 'view-system-status') return 'settings';
            return '';
        }

        function isMenuVisible(key) {
            if (!key || isProtectedMenuKey(key)) return true;
            var settings = menuVisibilitySettings || defaultMenuVisibilitySettings();
            return settings[key] !== false;
        }

        function isDashboardActionVisible(action, targetView) {
            return isMenuVisible(dashboardActionMenuKey(action, targetView));
        }

        function syncDashboardEntryVisibility() {
            var dashboard = document.getElementById('view-dashboard');
            if (!dashboard) return;
            dashboard.querySelectorAll('[data-action]').forEach(function (el) {
                setElementVisible(el, isDashboardActionVisible(el.getAttribute('data-action'), el.getAttribute('data-target-view') || ''));
            });
            dashboard.querySelectorAll('[data-dashboard-action]').forEach(function (el) {
                setElementVisible(el, isDashboardActionVisible(el.getAttribute('data-dashboard-action'), el.getAttribute('data-target-view') || ''));
            });
        }

        function applyMenuVisibilitySettings(settings) {
            menuVisibilitySettings = normalizeMenuVisibilitySettings(settings);
            var groupMap = {
                overview: 'dashboard',
                products: 'products',
                visual: 'visual',
                certificates: 'certifications',
                inquiries: 'inquiries',
                resources: 'assets',
                system: 'settings'
            };

            document.querySelectorAll('.nav-group').forEach(function (groupEl) {
                var group = groupEl.getAttribute('data-group');
                if (!hasOwn(groupMap, group)) return;
                setElementVisible(groupEl, isMenuVisible(groupMap[group]));
            });

            setElementVisible(document.getElementById('header-add-product'), isMenuVisible('products'));
            setElementVisible(document.getElementById('header-new-inquiries'), isMenuVisible('inquiries'));
            setElementVisible(document.getElementById('header-assets'), isMenuVisible('assets'));
            syncDashboardEntryVisibility();

            if (currentView === 'dashboard' && dashboardDataCache) {
                renderDashboard(dashboardDataCache);
            }
        }

        function expandNavGroupForView(view) {
            var meta = VIEW_META[view];
            if (!meta || !meta.group) return;
            var groupEl = document.querySelector('.nav-group[data-group="' + meta.group + '"]');
            if (groupEl) setNavGroupExpanded(groupEl, true, true);
        }

        function updateHeaderMeta(view) {
            var meta = VIEW_META[view] || { title: view || '', breadcrumb: view || '', description: '' };
            var titleEl = document.getElementById('header-title');
            var breadcrumbEl = document.getElementById('admin-breadcrumb-current');
            var descriptionEl = document.getElementById('admin-header-description');
            if (titleEl) titleEl.textContent = meta.title || '';
            if (breadcrumbEl) breadcrumbEl.textContent = meta.breadcrumb || meta.title || '';
            if (descriptionEl) descriptionEl.textContent = meta.description || '';
        }

        function switchView(view, options) {
            options = options || {};
            if (view !== currentView && !options.skipDirtyCheck && !confirmDiscardChanges()) return false;
            currentView = view;
            document.querySelectorAll('.sidebar-nav a[data-view]').forEach(function (link) {
                var isVisualLink = !!link.getAttribute('data-visual-nav-page');
                var active = isVisualLink
                    ? view === 'visual-builder' &&
                        link.getAttribute('data-visual-nav-page') === visualBuilderState.activePage &&
                        link.getAttribute('data-visual-nav-module') === visualBuilderState.activeModule
                    : link.getAttribute('data-view') === view;
                link.classList.toggle('active', active);
            });
            document.querySelectorAll('.view-section').forEach(function (section) { section.classList.remove('active'); });

            var activeView = document.getElementById('view-' + view);
            if (activeView) activeView.classList.add('active');

            expandNavGroupForView(view);
            updateHeaderMeta(view);
            syncVisualNavActive();

            if (view === 'dashboard') loadDashboard();
            if (view === 'products') loadProducts();
            if (view === 'categories') loadProductCategoriesView();
            if (view === 'inquiries') loadInquiries();
            if (view === 'cert-qualifications') loadCertView(view);
            if (view === 'cert-patents') loadCertView(view);
            if (view === 'cert-software') loadCertView(view);
            if (view === 'cert-test-reports') loadCertView(view);
            if (view === 'visual-builder') loadVisualBuilder();
            if (view === 'content-home') loadContentBlock(view);
            if (view === 'content-solutions') loadContentBlock(view);
            if (view === 'content-company-overview') loadContentBlock(view);
            if (view === 'content-contact') loadContentBlock(view);
            if (view === 'content-about') loadContentBlock(view);
            if (view === 'content-product-pages') loadContentBlock(view);
            if (view === 'content-global-shell') loadContentBlock(view);
            if (view === 'content-technology') loadContentBlock(view);
            if (view === 'content-industries') loadContentBlock(view);
            if (view === 'content-education') loadContentBlock(view);
            if (view === 'content-page-blocks') loadContentBlock(view);
            if (view === 'trash') loadTrash();
            if (view === 'assets') {
                assetPage = 1;
                loadAssets();
            }
            if (view === 'system-status') loadSystemStatus();
            if (view === 'settings-modules') loadModuleSettings();
            if (view === 'audit-logs') {
                auditLogPage = 1;
                loadAuditLogs();
            }
            if (!options.skipHash && window.location.hash !== '#' + view) {
                history.pushState(null, '', '#' + view);
            }
            return true;
        }

        function loadDashboard() {
            renderDashboardLoading();
            apiRequest('/admin/dashboard').then(function (response) {
                var data = unwrapDataResponse(response) || {};
                renderDashboard(data);
            }).catch(function (err) {
                showToast('加载控制台失败：' + err.message, 'error');
                renderDashboardError(err);
            });
        }

        function renderDashboardLoading() {
            setHtml('dashboard-kpis', '<div class="dashboard-loading-line">正在加载核心指标...</div>');
            setHtml('dashboard-todos', [0, 1, 2].map(function () {
                return '<button class="pending-card pending-card-loading" type="button" disabled><span>加载中...</span></button>';
            }).join(''));
            setHtml('dashboard-category-health', '<div class="dashboard-loading-line">正在加载分类结构...</div>');
        }

        function renderDashboardError(err) {
            var message = err && err.message ? err.message : '控制台数据暂时不可用';
            var errorHtml = '<div class="dashboard-empty-state"><strong>加载失败</strong><span>' + escapeHtml(message) + '</span></div>';
            setHtml('dashboard-kpis', '');
            setHtml('dashboard-todos', errorHtml);
            setHtml('dashboard-category-health', errorHtml);
        }

        function renderDashboard(data) {
            data = data || {};
            dashboardDataCache = data;
            renderDashboardKpis(data);
            renderDashboardTodos(data);
            renderDashboardCategoryHealth(data);
            syncDashboardEntryVisibility();
        }

        function renderDashboardKpis(data) {
            var productStats = data.products || {};
            var inquiryStats = data.inquiries || {};
            var categoryStats = data.categories && data.categories.product ? data.categories.product : {};
            var contentStats = data.contentBlocks || {};
            var certStats = data.certifications || {};
            var assetStats = data.assets || {};
            var latestContent = firstItem(contentStats.recent);
            var cards = [
                {
                    label: '产品',
                    value: asNumber(productStats.total),
                    meta: '已发布 ' + asNumber(productStats.published) + ' · 草稿 ' + asNumber(productStats.draft) + ' · 推荐 ' + asNumber(productStats.featured) + ' · 待补项 ' + asNumber(productStats.qualityIssueTotal),
                    icon: 'products',
                    tone: asNumber(productStats.qualityIssueTotal) > 0 ? 'gold' : 'blue',
                    action: 'view-products',
                    key: 'products'
                },
                {
                    label: '询盘',
                    value: asNumber(inquiryStats.unread),
                    meta: '新询盘 ' + asNumber(inquiryStats.new) + ' · 总数 ' + asNumber(inquiryStats.total),
                    icon: 'inquiries',
                    tone: 'danger',
                    action: 'view-unread-inquiries',
                    key: 'inquiries'
                },
                {
                    label: '分类',
                    value: asNumber(categoryStats.total),
                    meta: '父类 ' + asNumber(categoryStats.parents) + ' · 子类 ' + asNumber(categoryStats.children) + ' · 停用 ' + asNumber(categoryStats.inactive),
                    icon: 'categories',
                    tone: 'green',
                    action: 'view-categories',
                    key: 'products'
                },
                {
                    label: '内容',
                    value: asNumber(contentStats.total),
                    meta: '已发布 ' + asNumber(contentStats.published) + ' · 草稿 ' + asNumber(contentStats.draft) + ' · 更新 ' + (latestContent ? shortDate(latestContent.updated_at) : '暂无'),
                    icon: 'content',
                    tone: 'gold',
                    action: 'view-visual-builder',
                    key: 'visual'
                },
                {
                    label: '证书',
                    value: asNumber(certStats.total),
                    meta: '已发布 ' + asNumber(certStats.published) + ' · 草稿 ' + asNumber(certStats.draft),
                    icon: 'certifications',
                    tone: 'navy',
                    action: 'view-certifications',
                    key: 'certifications'
                },
                {
                    label: '资源',
                    value: asNumber(assetStats.total),
                    meta: '图片 ' + asNumber(assetStats.images) + ' · 文件 ' + asNumber(assetStats.files),
                    icon: 'assets',
                    tone: 'blue',
                    action: 'view-assets',
                    key: 'assets'
                }
            ];

            cards = cards.filter(function (card) { return isMenuVisible(card.key); });
            if (!cards.length) {
                setHtml('dashboard-kpis', '<div class="dashboard-empty-state"><strong>快捷指标已隐藏</strong><span>可在菜单显示设置中重新显示入口。</span></div>');
                return;
            }

            setHtml('dashboard-kpis', cards.map(function (card) {
                return '<button class="dashboard-kpi-card tone-' + escapeHtml(card.tone) + '" type="button" data-dashboard-action="' + escapeHtml(card.action) + '">' +
                    '<span class="dashboard-kpi-icon">' + dashboardIcon(card.icon) + '</span>' +
                    '<span class="dashboard-kpi-label">' + escapeHtml(card.label) + '</span>' +
                    '<strong>' + escapeHtml(card.value) + '</strong>' +
                    '<em>' + escapeHtml(card.meta) + '</em>' +
                '</button>';
            }).join(''));
        }

        function renderDashboardTodos(data) {
            var container = document.getElementById('dashboard-todos');
            if (!container) return;
            var todos = Array.isArray(data.todos) ? data.todos.slice() : [];
            todos = todos.filter(function (todo) {
                return isMenuVisible(menuKeyForView(todo.targetView || ''));
            });
            if (!todos.length) {
                container.innerHTML = '<div class="dashboard-empty-state"><strong>当前无待处理事项</strong><span>产品、内容、询盘和资源状态正常。</span></div>';
                return;
            }
            container.innerHTML = todos.map(function (todo) {
                var attrs = ' data-dashboard-action="todo" data-target-view="' + escapeHtml(todo.targetView || '') + '"';
                if (todo.filter && todo.filter.status) attrs += ' data-filter-status="' + escapeHtml(todo.filter.status) + '"';
                if (todo.filter && todo.filter.issue) attrs += ' data-filter-issue="' + escapeHtml(todo.filter.issue) + '"';
                if (todo.filter && todo.filter.unread) attrs += ' data-filter-unread="true"';
                return '<button class="pending-card severity-' + escapeHtml(todo.severity || 'low') + '" type="button"' + attrs + '>' +
                    '<span class="pending-card-label">' + escapeHtml(todo.label || '待处理') + '</span>' +
                    '<span class="pending-card-value">' + escapeHtml(asNumber(todo.count)) + '</span>' +
                    '<span class="pending-card-meta">' + escapeHtml(todo.meta || '点击进入对应模块') + '</span>' +
                '</button>';
            }).join('');
        }

        function renderDashboardCategoryHealth(data) {
            if (!isMenuVisible('products')) {
                setHtml('dashboard-category-health', '<div class="dashboard-empty-state"><strong>产品入口已隐藏</strong><span>可在菜单显示设置中重新显示分类管理入口。</span></div>');
                return;
            }
            var categoryStats = data.categories && data.categories.product ? data.categories.product : {};
            var tree = Array.isArray(categoryStats.tree) ? categoryStats.tree : [];
            if (!tree.length) {
                setHtml('dashboard-category-health', '<div class="dashboard-empty-state"><strong>暂无产品分类</strong><span>进入分类管理创建父类和子类。</span></div>');
                return;
            }
            var maxProducts = Math.max.apply(null, tree.map(function (item) { return asNumber(item.productCount); }).concat([1]));
            setHtml('dashboard-category-health',
                '<div class="dashboard-health-summary">' +
                    '<span>父类 <strong>' + escapeHtml(asNumber(categoryStats.parents)) + '</strong></span>' +
                    '<span>子类 <strong>' + escapeHtml(asNumber(categoryStats.children)) + '</strong></span>' +
                    '<span>空子类 <strong>' + escapeHtml(asNumber(categoryStats.emptyChildren)) + '</strong></span>' +
                '</div>' +
                tree.map(function (parent) {
                    var productCount = asNumber(parent.productCount);
                    var percent = Math.max(4, Math.round(productCount / maxProducts * 100));
                    var inactive = parent.isActive === false ? '<span class="dashboard-status-badge warning">停用</span>' : '';
                    return '<button class="dashboard-health-row" type="button" data-dashboard-action="view-categories">' +
                        '<span class="dashboard-health-row-main"><strong>' + escapeHtml(parent.name || parent.slug || '未命名分类') + '</strong><em>' + escapeHtml(asNumber(parent.childCount)) + ' 个子类 · ' + escapeHtml(productCount) + ' 件产品</em></span>' +
                        inactive +
                        '<span class="dashboard-progress"><span style="width:' + escapeHtml(percent) + '%"></span></span>' +
                    '</button>';
                }).join('')
            );
        }

        function bindDashboardActions() {
            document.querySelectorAll('#view-dashboard [data-action]').forEach(function (el) {
                el.addEventListener('click', function () {
                    performDashboardAction(el.getAttribute('data-action'), el);
                });
                el.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') el.click();
                });
            });
            var dashboard = document.getElementById('view-dashboard');
            if (dashboard) {
                dashboard.addEventListener('click', function (e) {
                    var actionEl = e.target.closest('[data-dashboard-action]');
                    if (!actionEl || !dashboard.contains(actionEl)) return;
                    performDashboardAction(actionEl.getAttribute('data-dashboard-action'), actionEl);
                });
            }
        }

        function performDashboardAction(action, el) {
            if (!action) return;
            var targetView = el ? (el.getAttribute('data-target-view') || '') : '';
            if (!isDashboardActionVisible(action, targetView)) {
                showToast('该入口已在菜单显示设置中隐藏', 'error');
                return;
            }
            if (action === 'todo') {
                openDashboardTodo(el);
            } else if (action === 'add-product') {
                if (!switchView('products')) return;
                setTimeout(function () {
                    var btn = document.getElementById('btn-add-product');
                    if (btn) btn.click();
                }, 50);
            } else if (action === 'view-products') {
                switchView('products');
            } else if (action === 'view-product-drafts') {
                if (!switchView('products')) return;
                setProductStatusFilter('draft');
            } else if (action === 'view-categories') {
                switchView('categories');
            } else if (action === 'view-inquiries') {
                switchView('inquiries');
            } else if (action === 'view-unread-inquiries') {
                if (!switchView('inquiries')) return;
                setInquiryStatusFilter('', true);
            } else if (action === 'view-new-inquiries') {
                if (!switchView('inquiries')) return;
                setInquiryStatusFilter('new', false);
            } else if (action === 'view-assets') {
                switchView('assets');
            } else if (action === 'view-certifications') {
                switchView('cert-qualifications');
            } else if (action === 'view-system-status') {
                switchView('system-status');
            } else if (action === 'view-visual-builder') {
                openVisualDashboardTarget('home', 'hero');
            } else if (action === 'open-visual') {
                openVisualDashboardTarget(el.getAttribute('data-visual-page'), el.getAttribute('data-visual-module'));
            }
        }

        function openDashboardTodo(el) {
            var targetView = el.getAttribute('data-target-view');
            var status = el.getAttribute('data-filter-status') || '';
            var issue = el.getAttribute('data-filter-issue') || '';
            var unread = el.getAttribute('data-filter-unread') === 'true';
            if (targetView === 'products') {
                if (!switchView('products')) return;
                setProductStatusFilter(status, issue);
            } else if (targetView === 'inquiries') {
                if (!switchView('inquiries')) return;
                setInquiryStatusFilter(status, unread);
            } else if (targetView === 'visual-builder') {
                openVisualDashboardTarget('home', 'hero');
            } else if (targetView) {
                switchView(targetView);
            }
        }

        function setInquiryStatusFilter(status, unreadOnly) {
            var statusFilter = document.getElementById('inquiry-status-filter');
            if (statusFilter) statusFilter.value = status || '';
            setInquiryUnreadFilter(!!unreadOnly);
        }

        function openVisualDashboardTarget(pageKey, moduleKey) {
            var page = visualPageByKey(pageKey || 'home') || visualPageByKey('home');
            if (!page) return;
            var module = visualModuleByKey(page, moduleKey) || (page.modules && page.modules[0]);
            if (!module) return;
            if (selectVisualModule(page.key, module.key, { skipDirtyCheck: true })) {
                switchView('visual-builder', { skipDirtyCheck: true });
            }
        }

        function setHtml(id, html) {
            var el = document.getElementById(id);
            if (el) el.innerHTML = html;
        }

        function asNumber(value) {
            var parsed = parseInt(value, 10);
            return isNaN(parsed) ? 0 : parsed;
        }

        function firstItem(list) {
            return Array.isArray(list) && list.length ? list[0] : null;
        }

        function shortDate(value) {
            if (!value) return '—';
            var date = new Date(value);
            if (isNaN(date.getTime())) return '—';
            return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        }

        function shortTime(value) {
            if (!value) return '—';
            var date = new Date(value);
            if (isNaN(date.getTime())) return '—';
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        function dashboardIcon(name) {
            var icons = {
                products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>',
                inquiries: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
                categories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 6v12"/></svg>',
                content: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 8h8M8 12h5M12 18v3"/></svg>',
                certifications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h12v18l-6-3-6 3V3z"/><path d="M9 8h6M9 12h6"/></svg>',
                assets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'
            };
            return icons[name] || icons.products;
        }

        function setText(id, value) {
            var el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        var EMPTY_STATE_ICON = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5"/></svg>';

        function emptyRow(colspan, message) {
            return '<tr class="table-empty-row"><td colspan="' + colspan + '"><div class="empty-state">' + EMPTY_STATE_ICON + '<p>' + escapeHtml(message || '暂无数据') + '</p></div></td></tr>';
        }

        function skeletonRows(cols, count) {
            var result = '';
            for (var j = 0; j < (count || 3); j++) {
                result += '<tr class="skeleton-row"><td colspan="' + cols + '"><div class="skeleton-line"></div></td></tr>';
            }
            return result;
        }

        function clearErrorBanner(viewId) {
            var view = document.getElementById(viewId);
            if (!view) return;
            var existing = view.querySelector('.error-banner');
            if (existing) existing.remove();
        }

        function showErrorBanner(viewId, message, retryFn) {
            var view = document.getElementById(viewId);
            if (!view) return;
            clearErrorBanner(viewId);
            var banner = document.createElement('div');
            banner.className = 'error-banner';
            banner.setAttribute('role', 'alert');
            banner.innerHTML = '<span>' + escapeHtml(message || '数据加载失败，请稍后重试') + '</span><button type="button" class="btn btn-secondary btn-sm">重试</button>';
            banner.querySelector('button').addEventListener('click', function () {
                clearErrorBanner(viewId);
                if (retryFn) retryFn();
            });
            var toolbar = view.querySelector('.table-toolbar');
            if (toolbar && toolbar.parentNode) toolbar.parentNode.insertBefore(banner, toolbar.nextSibling);
            else view.insertBefore(banner, view.firstChild);
        }

        function bindRangeCheckboxes(selector, updateFn) {
            var checkboxes = Array.prototype.slice.call(document.querySelectorAll(selector));
            var lastCheckedIndex = -1;
            checkboxes.forEach(function (checkbox, index) {
                checkbox.addEventListener('click', function (e) {
                    if (e.shiftKey && lastCheckedIndex >= 0) {
                        var from = Math.min(lastCheckedIndex, index);
                        var to = Math.max(lastCheckedIndex, index);
                        for (var i = from; i <= to; i++) checkboxes[i].checked = checkbox.checked;
                    }
                    lastCheckedIndex = index;
                    if (updateFn) updateFn();
                });
                checkbox.addEventListener('change', function () {
                    if (updateFn) updateFn();
                });
            });
        }

        function syncBatchBarFocus(bar, selectedCount, fallbackSelector) {
            if (!bar) return;
            var wasVisible = bar.dataset.visible === 'true';
            bar.style.display = selectedCount ? '' : 'none';
            bar.dataset.visible = selectedCount ? 'true' : 'false';
            if (selectedCount && !wasVisible) {
                var firstButton = bar.querySelector('button');
                if (firstButton) firstButton.focus();
            }
            if (!selectedCount && wasVisible && fallbackSelector) {
                var fallback = document.querySelector(fallbackSelector);
                if (fallback) fallback.focus();
            }
        }

        function loadProducts() {
            return getProductModule().loadProducts();
        }

        function renderProductsPagination(metaOverride) {
            return getProductModule().renderProductsPagination(metaOverride);
        }

        function updateProductClearFilters() {
            return getProductModule().updateProductClearFilters();
        }

        function updateProductsResultCount(totalOverride) {
            return getProductModule().updateProductsResultCount(totalOverride);
        }

        function syncProductStatusTabs() {
            return getProductModule().syncProductStatusTabs();
        }

        function setProductStatusFilter(status, issue) {
            return getProductModule().setProductStatusFilter(status, issue);
        }

        function renderProductSeoBadges(product) {
            return getProductModule().renderProductSeoBadges(product);
        }

        function renderProductsTable() {
            return getProductModule().renderProductsTable();
        }

        function productValueIsTrue(value) {
            return getProductModule().productValueIsTrue(value);
        }

        function compactText(value, maxLength) {
            return getProductModule().compactText(value, maxLength);
        }

        function findProductById(productId) {
            return getProductModule().findProductById(productId);
        }

        function buildVersionMap(ids, list) {
            var versionMap = {};
            ids.forEach(function (id) {
                for (var i = 0; i < list.length; i++) {
                    if (String(list[i].id) === String(id)) {
                        versionMap[String(id)] = list[i].version;
                        break;
                    }
                }
            });
            return versionMap;
        }

        function runBatchAction(endpoint, action, ids, versionMap, requireConfirm, confirmMessage) {
            function request() {
                var body = {
                    action: action,
                    ids: ids,
                    versionMap: versionMap
                };
                if (requireConfirm) body.payload = { confirm: true };
                return apiRequest(endpoint, { method: 'POST', body: body }).catch(function (err) {
                    if (err.status === 409 || err.code === 'BATCH_FAILED') {
                        showToast('部分数据版本已变更，请刷新后重试', 'error');
                        return Promise.reject(err);
                    }
                    showToast('批量操作失败：' + err.message, 'error');
                    return Promise.reject(err);
                });
            }

            if (requireConfirm) {
                return showConfirm('确认批量操作', confirmMessage || '确定执行这个批量操作吗？').then(function (ok) {
                    if (!ok) return Promise.reject(new Error('cancelled'));
                    return request();
                });
            }
            return request();
        }

        function batchActionLabel(action) {
            var labels = {
                publish: '发布',
                draft: '下架',
                soft_delete: '删除',
                hard_delete: '永久删除'
            };
            return labels[action] || action;
        }

        function bindProductBatchButton(id, action) {
            return getProductModule().bindProductBatchButton(id, action);
        }

        function getSelectedProductIds() {
            return getProductModule().getSelectedProductIds();
        }

        function updateProductBatchBar() {
            return getProductModule().updateProductBatchBar();
        }

        function clearProductSelection() {
            return getProductModule().clearProductSelection();
        }

        function batchProductAction(action) {
            return getProductModule().batchProductAction(action);
        }

        function loadProductCategories(callback) {
            apiRequest('/admin/categories?type=product').then(function (response) {
                productCategories = unwrapListResponse(response);
                populateProductCategorySelects();
                if (callback) callback();
            }).catch(function (err) {
                productCategories = [];
                populateProductCategorySelects();
                if (callback) callback(err);
            });
        }

        function categoryDisplayName(category) {
            if (!category) return '';
            return category.name_en || category.slug || ('#' + category.id);
        }

        function categoryParentId(category) {
            return category && category.parent_id != null ? String(category.parent_id) : '';
        }

        function buildProductCategoryTree() {
            var parents = [];
            var childrenByParent = {};
            var orphanChildren = [];

            productCategories.forEach(function (category) {
                var parentId = categoryParentId(category);
                if (!parentId) {
                    parents.push({ category: category, children: [] });
                    return;
                }
                if (!childrenByParent[parentId]) childrenByParent[parentId] = [];
                childrenByParent[parentId].push(category);
            });

            parents.forEach(function (parent) {
                var id = String(parent.category.id);
                parent.children = childrenByParent[id] || [];
                delete childrenByParent[id];
            });

            Object.keys(childrenByParent).forEach(function (parentId) {
                orphanChildren = orphanChildren.concat(childrenByParent[parentId]);
            });

            if (orphanChildren.length) {
                parents.push({
                    category: { id: '__orphans', name_en: '未归属分类', slug: 'uncategorized' },
                    children: orphanChildren
                });
            }

            return parents;
        }

        function populateCategoryParentSelect(selectedParentId, editingId) {
            var select = document.getElementById('cat-parent-id');
            if (!select) return;
            var options = '<option value="">设为顶级父类</option>';
            productCategories.forEach(function (category) {
                if (String(category.id) === String(editingId || '')) return;
                if (category.parent_id != null) return;
                var childCount = parseInt(category.child_count || 0, 10);
                var label = categoryDisplayName(category) + (childCount ? '（' + childCount + ' 个子类）' : '');
                options += '<option value="' + escapeHtml(category.id) + '">' + escapeHtml(label) + '</option>';
            });
            select.innerHTML = options;
            select.value = selectedParentId == null ? '' : String(selectedParentId);
        }

        function populateProductCategorySelects() {
            var filter = document.getElementById('product-category-filter');
            var field = document.getElementById('field-category');
            var filterValue = filter ? filter.value : '';
            var fieldValue = field ? field.value : '';
            var filterOptions = '<option value="">全部分类</option>';
            var fieldOptions = '<option value="">选择分类</option>';
            var tree = buildProductCategoryTree();
            var hasChildren = tree.some(function (parent) { return parent.children.length; });

            if (hasChildren) {
                tree.forEach(function (parent) {
                    if (!parent.children.length) return;
                    var parentLabel = categoryDisplayName(parent.category);
                    filterOptions += '<optgroup label="' + escapeHtml(parentLabel) + '">';
                    fieldOptions += '<optgroup label="' + escapeHtml(parentLabel) + '">';
                    parent.children.forEach(function (category) {
                        var value = category.id;
                        var label = categoryDisplayName(category);
                        var option = '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>';
                        filterOptions += option;
                        fieldOptions += option;
                    });
                    filterOptions += '</optgroup>';
                    fieldOptions += '</optgroup>';
                });
            } else {
                productCategories.forEach(function (category) {
                    var value = category.id;
                    var label = categoryDisplayName(category);
                    var option = '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>';
                    filterOptions += option;
                    fieldOptions += option;
                });
            }

            if (filter) {
                filter.innerHTML = filterOptions;
                filter.value = filterValue;
            }
            if (field) {
                field.innerHTML = fieldOptions;
                field.value = fieldValue;
            }
        }

        function loadProductCategoriesView() {
            var tbody = document.getElementById('categories-tbody');
            if (!tbody) return;
            tbody.innerHTML = skeletonRows(5, 4);
            loadProductCategories(function (err) {
                if (err) {
                    tbody.innerHTML = '<tr><td colspan="5" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
                    showToast('加载分类失败：' + err.message, 'error');
                    return;
                }
                renderProductCategoriesTable();
            });
        }

        function renderProductCategoriesTable() {
            var tbody = document.getElementById('categories-tbody');
            if (!tbody) return;
            if (!productCategories.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="table-empty"><p>暂无分类</p></td></tr>';
                activeCategoryId = null;
                renderCategoryDetail(null);
                return;
            }
            if (!activeCategoryId || !findProductCategory(activeCategoryId)) activeCategoryId = productCategories[0].id;

            var tree = buildProductCategoryTree();
            var rows = [];

            tree.forEach(function (parent) {
                var category = parent.category;
                var active = category.is_active !== 0;
                var selected = String(activeCategoryId) === String(category.id);
                var hasChildren = parent.children.length > 0;
                var collapsed = hasChildren && collapsedCategoryParents[String(category.id)] === true;
                var childLabel = hasChildren ? parent.children.length + ' 个子类' : '顶级父类';
                rows.push(
                    '<tr class="category-parent-row ' + (selected ? 'row-active' : '') + (collapsed ? ' is-collapsed' : '') + '" data-category-row="' + escapeHtml(category.id) + '" data-category-level="parent">' +
                        '<td><div class="category-name-wrap category-name-parent">' +
                            (hasChildren
                                ? '<button type="button" class="category-tree-toggle" data-toggle-category="' + escapeHtml(category.id) + '" aria-label="' + (collapsed ? '展开子类' : '折叠子类') + '" aria-expanded="' + (collapsed ? 'false' : 'true') + '"></button>'
                                : '<span class="category-tree-spacer"></span>') +
                            '<div><strong>' + escapeHtml(categoryDisplayName(category)) + '</strong><small>' + escapeHtml(childLabel) + '</small></div>' +
                        '</div></td>' +
                        '<td class="cell-muted">' + escapeHtml(category.slug || '') + '</td>' +
                        '<td>' + escapeHtml(category.sort_order || 0) + '</td>' +
                        '<td><span class="badge ' + (active ? 'badge-green' : 'badge-navy') + '">' + (active ? '启用' : '停用') + '</span></td>' +
                        '<td><div class="actions-cell"><button class="btn btn-icon btn-icon-edit" aria-label="编辑分类" data-edit-category="' + escapeHtml(category.id) + '">' + ICON_EDIT + '</button><button class="btn btn-icon btn-icon-delete" aria-label="删除分类" data-delete-category="' + escapeHtml(category.id) + '">' + ICON_DELETE + '</button></div></td>' +
                    '</tr>'
                );

                if (collapsed) return;
                parent.children.forEach(function (child) {
                    var childActive = child.is_active !== 0;
                    var childSelected = String(activeCategoryId) === String(child.id);
                    rows.push(
                        '<tr class="category-child-row ' + (childSelected ? 'row-active' : '') + '" data-category-row="' + escapeHtml(child.id) + '" data-category-level="child" data-category-parent="' + escapeHtml(category.id) + '">' +
                            '<td><div class="category-name-wrap category-name-child"><span class="category-tree-branch"></span><div><strong>' + escapeHtml(categoryDisplayName(child)) + '</strong><small>归属：' + escapeHtml(categoryDisplayName(category)) + '</small></div></div></td>' +
                            '<td class="cell-muted">' + escapeHtml(child.slug || '') + '</td>' +
                            '<td>' + escapeHtml(child.sort_order || 0) + '</td>' +
                            '<td><span class="badge ' + (childActive ? 'badge-green' : 'badge-navy') + '">' + (childActive ? '启用' : '停用') + '</span></td>' +
                            '<td><div class="actions-cell"><button class="btn btn-icon btn-icon-edit" aria-label="编辑分类" data-edit-category="' + escapeHtml(child.id) + '">' + ICON_EDIT + '</button><button class="btn btn-icon btn-icon-delete" aria-label="删除分类" data-delete-category="' + escapeHtml(child.id) + '">' + ICON_DELETE + '</button></div></td>' +
                        '</tr>'
                    );
                });
            });

            tbody.innerHTML = rows.join('');

            tbody.querySelectorAll('[data-category-row]').forEach(function (row) {
                row.addEventListener('click', function (event) {
                    if (event.target && event.target.closest && event.target.closest('button')) return;
                    selectCategory(row.getAttribute('data-category-row'));
                });
            });
            tbody.querySelectorAll('[data-toggle-category]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = String(btn.getAttribute('data-toggle-category'));
                    collapsedCategoryParents[id] = !collapsedCategoryParents[id];
                    renderProductCategoriesTable();
                });
            });
            tbody.querySelectorAll('[data-edit-category]').forEach(function (btn) {
                btn.addEventListener('click', function () { openCategoryModal(btn.getAttribute('data-edit-category')); });
            });
            tbody.querySelectorAll('[data-delete-category]').forEach(function (btn) {
                btn.addEventListener('click', function () { deleteCategory(btn.getAttribute('data-delete-category')); });
            });
            renderCategoryDetail(findProductCategory(activeCategoryId));
        }

        function selectCategory(id) {
            activeCategoryId = id;
            document.querySelectorAll('[data-category-row]').forEach(function (row) {
                row.classList.toggle('row-active', String(row.getAttribute('data-category-row')) === String(id));
            });
            renderCategoryDetail(findProductCategory(id));
        }

        function renderCategoryDetail(category) {
            var panel = document.getElementById('category-detail');
            if (!panel) return;
            if (!category) {
                panel.className = 'category-detail-empty';
                panel.innerHTML = '选择一个分类查看产品归属和展示状态';
                return;
            }
            var active = category.is_active !== 0;
            var childCount = parseInt(category.child_count || 0, 10);
            var productCount = parseInt(category.product_count || 0, 10);
            var roleLabel = category.parent_id == null ? '顶级父类' : '子类';
            var parentLabel = category.parent_id == null ? '无' : (category.parent_name_en || category.parent_slug || category.parent_id);
            panel.className = 'category-detail-content';
            panel.innerHTML =
                '<div class="category-detail-head"><strong>' + escapeHtml(category.name_en || '未命名分类') + '</strong><span class="badge ' + (active ? 'badge-green' : 'badge-navy') + '">' + (active ? '启用' : '停用') + '</span></div>' +
                '<dl class="category-detail-meta">' +
                    '<div><dt>Slug</dt><dd>' + escapeHtml(category.slug || '—') + '</dd></div>' +
                    '<div><dt>层级类型</dt><dd>' + escapeHtml(roleLabel) + '</dd></div>' +
                    '<div><dt>父级分类</dt><dd>' + escapeHtml(parentLabel) + '</dd></div>' +
                    '<div><dt>子类数量</dt><dd>' + escapeHtml(childCount) + '</dd></div>' +
                    '<div><dt>关联产品</dt><dd>' + escapeHtml(productCount) + '</dd></div>' +
                    '<div><dt>排序</dt><dd>' + escapeHtml(category.sort_order || 0) + '</dd></div>' +
                '</dl>' +
                '<div class="category-impact-note">' + (category.parent_id == null ? '父类用于产品体系分组，产品编辑时请选择它下面的子类。' : '产品编辑器会通过分组下拉选择该子类，不需要手动填写分类 ID。') + '</div>' +
                '<div class="category-detail-actions"><button class="btn btn-primary btn-sm" type="button" data-edit-category="' + escapeHtml(category.id) + '">编辑分类</button></div>';
            panel.querySelectorAll('[data-edit-category]').forEach(function (btn) {
                btn.addEventListener('click', function () { openCategoryModal(btn.getAttribute('data-edit-category')); });
            });
        }

        function bindCategoryEvents() {
            var addBtn = document.getElementById('btn-add-category');
            if (addBtn) addBtn.addEventListener('click', function () { openCategoryModal(null); });
            bindModalClose('category-modal', ['category-modal-close', 'category-modal-cancel']);
            var submitBtn = document.getElementById('category-modal-submit');
            if (submitBtn) submitBtn.addEventListener('click', saveCategoryModal);
            var form = document.getElementById('category-form');
            if (form) {
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    saveCategoryModal();
                });
            }
        }

        function findProductCategory(id) {
            for (var i = 0; i < productCategories.length; i++) {
                if (String(productCategories[i].id) === String(id)) return productCategories[i];
            }
            return null;
        }

        function openCategoryModal(id) {
            activeModalTrigger = document.activeElement;
            resetFormDirty();
            var form = document.getElementById('category-form');
            var title = document.getElementById('category-modal-title');
            var slug = document.getElementById('cat-slug');
            var activeGroup = document.getElementById('cat-active-group');
            form.reset();
            document.getElementById('cat-editing-id').value = id || '';
            document.getElementById('cat-sort-order').value = '0';
            slug.disabled = !!id;
            populateCategoryParentSelect('', id);

            if (id) {
                var category = findProductCategory(id);
                title.textContent = '编辑分类';
                activeGroup.style.display = '';
                if (category) {
                    slug.value = category.slug || '';
                    document.getElementById('cat-name-en').value = category.name_en || '';
                    document.getElementById('cat-name-ar').value = category.name_ar || '';
                    document.getElementById('cat-name-fr').value = category.name_fr || '';
                    document.getElementById('cat-name-ru').value = category.name_ru || '';
                    document.getElementById('cat-sort-order').value = category.sort_order || 0;
                    document.getElementById('cat-is-active').checked = category.is_active !== 0;
                    populateCategoryParentSelect(category.parent_id, id);
                }
            } else {
                title.textContent = '新增分类';
                activeGroup.style.display = 'none';
                document.getElementById('cat-is-active').checked = true;
            }
            showModal('category-modal');
        }

        function saveCategoryModal() {
            var id = document.getElementById('cat-editing-id').value;
            var slug = document.getElementById('cat-slug').value.trim();
            var nameEn = document.getElementById('cat-name-en').value.trim();
            var nameAr = document.getElementById('cat-name-ar').value.trim();
            var nameFr = document.getElementById('cat-name-fr').value.trim();
            var nameRu = document.getElementById('cat-name-ru').value.trim();
            var sortOrder = parseInt(document.getElementById('cat-sort-order').value, 10);
            var parentId = document.getElementById('cat-parent-id').value || null;
            if (!nameEn && !nameAr) {
                showToast('请填写分类名称', 'error');
                return;
            }
            if (isNaN(sortOrder)) sortOrder = 0;

            var payload = id ? {
                name_en: nameEn || nameAr,
                name_ar: nameAr,
                name_fr: nameFr,
                name_ru: nameRu,
                parent_id: parentId,
                sort_order: sortOrder,
                is_active: document.getElementById('cat-is-active').checked
            } : {
                type: 'product',
                slug: slug,
                name_en: nameEn || nameAr,
                name_ar: nameAr,
                name_fr: nameFr,
                name_ru: nameRu,
                parent_id: parentId,
                sort_order: sortOrder
            };

            var request = id
                ? apiRequest('/admin/categories/' + encodeURIComponent(id), { method: 'PUT', body: payload })
                : apiRequest('/admin/categories', { method: 'POST', body: payload });

            request.then(function () {
                showToast('分类已保存');
                resetFormDirty();
                closeModal('category-modal', true);
                loadProductCategoriesView();
                loadProductCategories();
            }).catch(function (err) {
                showToast('保存分类失败：' + err.message, 'error');
            });
        }

        function deleteCategory(id) {
            showConfirm('删除分类', '确定删除这个分类吗？分类下不能有产品。').then(function (ok) {
                if (!ok) return;
                apiRequest('/admin/categories/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () {
                    showToast('分类已删除');
                    loadProductCategoriesView();
                    loadProductCategories();
                }).catch(function (err) {
                    if (err.status === 409 || err.code === 'BATCH_FAILED') {
                        showToast('该分类下还有产品，无法删除', 'error');
                        return;
                    }
                    showToast('删除分类失败：' + err.message, 'error');
                });
            });
        }

        function bindProductEvents() {
            return getProductModule().bindProductEvents();
        }

        function openProductModal(productId) {
            return getProductModule().openProductModal(productId);
        }

        function fillProductForm(product) {
            return getProductModule().fillProductForm(product);
        }

        function setFieldValue(id, value) {
            return getProductModule().setFieldValue(id, value);
        }

        function getFieldValue(id) {
            return getProductModule().getFieldValue(id);
        }

        function syncProductFeaturedSwitch() {
            return getProductModule().syncProductFeaturedSwitch();
        }

        function renderProductSpecs(specs) {
            return getProductModule().renderProductSpecs(specs);
        }

        function renderProductGallery(product) {
            return getProductModule().renderProductGallery(product);
        }

        function addProductGalleryPath(path) {
            return getProductModule().addProductGalleryPath(path);
        }

        function uploadProductGalleryFiles() {
            return getProductModule().uploadProductGalleryFiles();
        }

        function openProductGalleryAssetPicker() {
            return getProductModule().openProductGalleryAssetPicker();
        }

        function renderProductCertifications(product) {
            return getProductModule().renderProductCertifications(product);
        }

        function uploadProductImage() {
            return getProductModule().uploadProductImage.call(this);
        }

        function openProductAssetPicker() {
            return getProductModule().openProductAssetPicker();
        }

        function clearProductCoverImage() {
            return getProductModule().clearProductCoverImage();
        }

        function showImagePreview(src) {
            return getProductModule().showImagePreview(src);
        }

        function addSpecRow(key, value) {
            return getProductModule().addSpecRow(key, value);
        }

        function getSpecsFromForm() {
            return getProductModule().getSpecsFromForm();
        }

        function showFieldError(fieldId, message) {
            return getProductModule().showFieldError(fieldId, message);
        }

        function clearFieldError(fieldId) {
            return getProductModule().clearFieldError(fieldId);
        }

        function saveProduct(e) {
            return getProductModule().saveProduct(e);
        }

        function splitList(value) {
            return value.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
        }

        function deleteProduct(productId) {
            return getProductModule().deleteProduct(productId);
        }

        function resetProductModalState() {
            return getProductModule().resetModalState();
        }

        function loadInquiries() {
            return getInquiryModule().loadInquiries();
        }

        function renderInquiriesPagination(metaOverride) {
            return getInquiryModule().renderInquiriesPagination(metaOverride);
        }

        function renderInquiriesTable() {
            return getInquiryModule().renderInquiriesTable();
        }

        function findInquiryInList(id) {
            return getInquiryModule().findInquiryInList(id);
        }

        function bindInquiryEvents() {
            return getInquiryModule().bindInquiryEvents();
        }

        function setInquiryUnreadFilter(unreadOnly) {
            return getInquiryModule().setInquiryUnreadFilter(unreadOnly);
        }

        function bindInquiryBatchButton(id, action) {
            return getInquiryModule().bindInquiryBatchButton(id, action);
        }

        function getSelectedInquiryIds() {
            return getInquiryModule().getSelectedInquiryIds();
        }

        function updateInquiryBatchBar() {
            return getInquiryModule().updateInquiryBatchBar();
        }

        function clearInquirySelection() {
            return getInquiryModule().clearInquirySelection();
        }

        function inquiryBatchLabel(action) {
            return getInquiryModule().inquiryBatchLabel(action);
        }

        function batchInquiryAction(action) {
            return getInquiryModule().batchInquiryAction(action);
        }

        function replyByEmail() {
            return getInquiryModule().replyByEmail();
        }

        function openInquiryModal(id) {
            return getInquiryModule().openInquiryModal(id);
        }

        function renderInquiryModalDetail(item) {
            return getInquiryModule().renderInquiryModalDetail(item);
        }

        function getInquiryListIndex(id) {
            return getInquiryModule().getInquiryListIndex(id);
        }

        function updateInquiryModalNav() {
            return getInquiryModule().updateInquiryModalNav();
        }

        function openAdjacentInquiry(direction) {
            return getInquiryModule().openAdjacentInquiry(direction);
        }

        function detailItem(label, value) {
            return getInquiryModule().detailItem(label, value);
        }

        function saveInquiryStatus() {
            return getInquiryModule().saveInquiryStatus();
        }

        function deleteInquiry(id) {
            return getInquiryModule().deleteInquiry(id);
        }

        function resetInquiryModalState() {
            return getInquiryModule().resetModalState();
        }

        function bindCompanyEvents() {
            var form = document.getElementById('company-form');
            if (!form) return;
            form.querySelectorAll('.form-tab-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var tab = btn.getAttribute('data-tab');
                    form.querySelectorAll('.form-tab-btn').forEach(function (b) { b.classList.remove('active'); });
                    form.querySelectorAll('.form-tab-panel').forEach(function (p) { p.classList.remove('active'); });
                    btn.classList.add('active');
                    document.getElementById('tab-' + tab).classList.add('active');
                });
            });
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var data = {};
                form.querySelectorAll('input, textarea').forEach(function (input) {
                    var key = input.id.replace('company-', '');
                    data[key] = input.type === 'number' ? Number(input.value || 0) : input.value;
                });
                var btn = document.getElementById('btn-save-company');
                btn.disabled = true;
                btn.textContent = '保存中...';
                apiRequest('/company', { method: 'PUT', body: data }).then(function () {
                    showToast('公司信息已保存');
                }).catch(function (err) {
                    showToast('保存公司信息失败：' + err.message, 'error');
                }).finally(function () {
                    btn.disabled = false;
                    btn.textContent = '保存公司信息';
                });
            });
        }

        function loadCompany() {
            apiRequest('/company').then(function (data) {
                Object.keys(data).forEach(function (key) {
                    var field = document.getElementById('company-' + key);
                    if (field) field.value = data[key];
                });
            }).catch(function (err) { showToast('加载公司信息失败：' + err.message, 'error'); });
        }

        function bindCertificationEvents() {
            bindCertAddButton('cert-qualifications');
            bindCertAddButton('cert-patents');
            bindCertAddButton('cert-software');
            bindCertAddButton('cert-test-reports');
            bindCertBatchEvents('cert-qualifications');
            bindCertBatchEvents('cert-patents');
            bindCertBatchEvents('cert-software');
            bindCertBatchEvents('cert-test-reports');
            bindCertFilterEvents('cert-qualifications');
            bindCertFilterEvents('cert-patents');
            bindCertFilterEvents('cert-software');
            bindCertFilterEvents('cert-test-reports');
            document.querySelectorAll('[data-cert-tab]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    switchView(btn.getAttribute('data-cert-tab'));
                });
            });
            bindModalClose('certification-modal', ['certification-modal-close', 'certification-cancel']);
            var form = document.getElementById('certification-form');
            if (form) form.addEventListener('submit', saveCertification);
            var certFile = document.getElementById('cert-file');
            if (certFile) certFile.addEventListener('change', uploadCertificationFile);
            var certImage = document.getElementById('cert-image');
            if (certImage) certImage.addEventListener('input', function () { renderCertificationPreview(certImage.value); });
            var selectCertAsset = document.getElementById('btn-cert-select-asset');
            if (selectCertAsset) selectCertAsset.addEventListener('click', openCertificationAssetPicker);
            var clearCertImage = document.getElementById('btn-cert-clear-image');
            if (clearCertImage) clearCertImage.addEventListener('click', clearCertificationImage);
        }

        function bindCertAddButton(viewName) {
            var suffix = certViewSuffix(viewName);
            var btn = document.getElementById('btn-add-cert-' + suffix);
            if (btn) btn.addEventListener('click', function () { openCertificationModal(null, viewName); });
        }

        function bindCertBatchEvents(viewName) {
            var suffix = certViewSuffix(viewName);
            var selectAll = document.querySelector('.cert-select-all[data-view="' + viewName + '"]');
            if (selectAll) {
                selectAll.addEventListener('change', function () {
                    document.querySelectorAll('.cert-row-check[data-view="' + viewName + '"]').forEach(function (checkbox) {
                        checkbox.checked = selectAll.checked;
                    });
                    updateCertBatchBar(viewName);
                });
            }
            bindCertBatchButton('btn-batch-publish-cert-' + suffix, viewName, 'publish');
            bindCertBatchButton('btn-batch-delete-cert-' + suffix, viewName, 'soft_delete');
            bindCertBatchButton('btn-batch-hard-delete-cert-' + suffix, viewName, 'hard_delete');
        }

        function bindCertBatchButton(id, viewName, action) {
            var btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', function () { batchCertAction(viewName, action); });
        }

        function bindCertFilterEvents(viewName) {
            var suffix = certViewSuffix(viewName);
            var search = document.getElementById('cert-search-' + suffix);
            var status = document.getElementById('cert-status-filter-' + suffix);
            if (search) {
                search.addEventListener('input', function () {
                    clearTimeout(certSearchTimers[viewName]);
                    certSearchTimers[viewName] = setTimeout(function () {
                        certPageByView[viewName] = 1;
                        loadCertView(viewName);
                    }, 250);
                });
            }
            if (status) {
                status.addEventListener('change', function () {
                    certPageByView[viewName] = 1;
                    loadCertView(viewName);
                });
            }
        }

        function getSelectedCertIds(viewName) {
            var ids = [];
            document.querySelectorAll('.cert-row-check[data-view="' + viewName + '"]:checked').forEach(function (checkbox) {
                var id = parseInt(checkbox.getAttribute('data-id'), 10);
                if (!isNaN(id)) ids.push(id);
            });
            return ids;
        }

        function updateCertBatchBar(viewName) {
            var suffix = certViewSuffix(viewName);
            var selected = document.querySelectorAll('.cert-row-check[data-view="' + viewName + '"]:checked');
            var all = document.querySelectorAll('.cert-row-check[data-view="' + viewName + '"]');
            var bar = document.getElementById('cert-batch-bar-' + suffix);
            var count = document.getElementById('cert-batch-count-' + suffix);
            var selectAll = document.querySelector('.cert-select-all[data-view="' + viewName + '"]');
            if (count) count.textContent = '已选 ' + selected.length + ' 条';
            if (bar) bar.style.display = selected.length ? '' : 'none';
            if (selectAll) {
                selectAll.checked = all.length > 0 && selected.length === all.length;
                selectAll.indeterminate = selected.length > 0 && selected.length < all.length;
            }
        }

        function batchCertAction(viewName, action) {
            var ids = getSelectedCertIds(viewName);
            if (!ids.length) {
                showToast('请先选择证书', 'error');
                return;
            }
            var requireConfirm = action === 'hard_delete';
            var message = '确定永久删除这 ' + ids.length + ' 条证书吗？此操作不可恢复。';
            runBatchAction('/admin/certifications/batch', action, ids, buildVersionMap(ids, certsByView[viewName] || []), requireConfirm, message).then(function () {
                showToast('已对 ' + ids.length + ' 条证书执行：' + batchActionLabel(action));
                loadCertView(viewName);
            }).catch(function (err) {
                if (err && err.message === 'cancelled') return;
            });
        }

        function loadCertificationCategories() {
            apiRequest('/admin/categories?type=certification').then(function (response) {
                var rows = unwrapListResponse(response);
                certificationCategoryMap = {};
                rows.forEach(function (category) {
                    certificationCategoryMap[category.slug] = category.id;
                });
            }).catch(function (err) {
                certificationCategoryMap = {};
                showToast('加载证书分类失败：' + err.message, 'error');
            });
        }

        function certViewSlug(viewName) {
            var map = {
                'cert-qualifications': 'qualifications',
                'cert-patents': 'patents',
                'cert-software': 'software-copyrights',
                'cert-test-reports': 'test-reports-extra'
            };
            return map[viewName] || '';
        }

        function certViewSuffix(viewName) {
            var map = {
                'cert-qualifications': 'qualifications',
                'cert-patents': 'patents',
                'cert-software': 'software',
                'cert-test-reports': 'test-reports'
            };
            return map[viewName] || '';
        }

        function loadCertView(viewName) {
            var suffix = certViewSuffix(viewName);
            var slug = certViewSlug(viewName);
            var tbody = document.getElementById('cert-tbody-' + suffix);
            if (!tbody) return;
            tbody.innerHTML = skeletonRows(6, 4);
            clearErrorBanner('view-' + viewName);
            updateCertBatchBar(viewName);
            if (!certPageByView[viewName]) certPageByView[viewName] = 1;
            if (!certMetaByView[viewName]) certMetaByView[viewName] = { page: certPageByView[viewName], pageSize: 20, total: 0 };

            function requestRows() {
                var categoryId = certificationCategoryMap[slug];
                if (!categoryId) {
                    tbody.innerHTML = emptyRow(6, '未找到证书分类');
                    renderCertificationDetail(viewName, null);
                    renderCertPagination(viewName, { page: 1, pageSize: 20, total: 0 });
                    return;
                }
                var searchVal = ((document.getElementById('cert-search-' + suffix) || {}).value || '').trim();
                var statusVal = (document.getElementById('cert-status-filter-' + suffix) || {}).value || '';
                var meta = certMetaByView[viewName] || { pageSize: 20 };
                var url = '/admin/certifications?page=' + encodeURIComponent(certPageByView[viewName] || 1) +
                    '&pageSize=' + encodeURIComponent(meta.pageSize || 20) +
                    '&category=' + encodeURIComponent(categoryId);
                if (searchVal) url += '&q=' + encodeURIComponent(searchVal);
                if (statusVal) url += '&status=' + encodeURIComponent(statusVal);
                apiRequest(url).then(function (response) {
                    var rows = unwrapListResponse(response);
                    certMetaByView[viewName] = response && response.meta ? response.meta : { page: certPageByView[viewName] || 1, pageSize: meta.pageSize || 20, total: rows.length };
                    certificationViewRows[viewName] = rows;
                    certifications = rows;
                    renderCertificationsTable(viewName, rows);
                    renderCertPagination(viewName);
                }).catch(function (err) {
                    tbody.innerHTML = emptyRow(6, '加载失败，请刷新重试');
                    renderCertificationDetail(viewName, null);
                    showErrorBanner('view-' + viewName, '证书数据加载失败，请稍后重试', function () { loadCertView(viewName); });
                    renderCertPagination(viewName, { page: 1, pageSize: meta.pageSize || 20, total: 0 });
                    showToast('加载证书失败：' + err.message, 'error');
                });
            }

            if (certificationCategoryMap[slug]) {
                requestRows();
            } else {
                apiRequest('/admin/categories?type=certification').then(function (response) {
                    var rows = unwrapListResponse(response);
                    certificationCategoryMap = {};
                    rows.forEach(function (category) {
                        certificationCategoryMap[category.slug] = category.id;
                    });
                    requestRows();
                }).catch(function (err) {
                    tbody.innerHTML = emptyRow(6, '加载失败，请刷新重试');
                    renderCertificationDetail(viewName, null);
                    showErrorBanner('view-' + viewName, '证书分类加载失败，请稍后重试', function () { loadCertView(viewName); });
                    renderCertPagination(viewName, { page: 1, pageSize: 20, total: 0 });
                    showToast('加载证书分类失败：' + err.message, 'error');
                });
            }
        }

        function renderCertPagination(viewName, metaOverride) {
            var suffix = certViewSuffix(viewName);
            var pagination = document.getElementById('cert-pagination-' + suffix);
            if (!window.renderPagination || !pagination) return;
            window.renderPagination(pagination, metaOverride || certMetaByView[viewName], function (nextPage) {
                certPageByView[viewName] = nextPage;
                loadCertView(viewName);
            });
        }

        function loadCertifications() {
            loadCertView(currentView);
        }

        function renderCertificationsTable(viewName, rows) {
            var suffix = certViewSuffix(viewName);
            var tbody = document.getElementById('cert-tbody-' + suffix);
            if (!tbody) return;
            rows = rows || [];
            certsByView[viewName] = rows;
            certificationViewRows[viewName] = rows;
            if (!rows.length) {
                tbody.innerHTML = emptyRow(6, '暂无证书');
                activeCertByView[viewName] = null;
                renderCertificationDetail(viewName, null);
                updateCertBatchBar(viewName);
                return;
            }
            if (!activeCertByView[viewName] || !findCertificationInView(activeCertByView[viewName], viewName)) {
                activeCertByView[viewName] = rows[0].id;
            }
            tbody.innerHTML = rows.map(function (item) {
                var status = item.status || 'draft';
                var statusMeta = certificationStatusMeta(status);
                var active = String(activeCertByView[viewName]) === String(item.id);
                return '<tr class="' + (active ? 'row-active' : '') + '" data-cert-row="' + escapeHtml(item.id) + '" data-cert-view="' + escapeHtml(viewName) + '">' +
                    '<td><input type="checkbox" class="cert-row-check" data-id="' + escapeHtml(item.id) + '" data-version="' + escapeHtml(item.version) + '" data-view="' + escapeHtml(viewName) + '"></td>' +
                    '<td>' + renderCertificationThumb(item) + '</td>' +
                    '<td><div class="cert-title-cell"><strong title="' + escapeHtml(certificationTitle(item)) + '">' + escapeHtml(certificationTitle(item)) + '</strong><span>ID #' + escapeHtml(item.id) + ' · ' + escapeHtml(formatDate(item.updated_at || item.created_at)) + '</span></div></td>' +
                    '<td>' + escapeHtml(item.category_name_en || certViewTitle(viewName)) + '</td>' +
                    '<td><span class="badge ' + statusMeta.className + '">' + statusMeta.label + '</span></td>' +
                    '<td><div class="actions-cell"><button class="btn btn-icon btn-icon-view" aria-label="查看证书" data-cert-view="' + escapeHtml(viewName) + '" data-view-cert="' + escapeHtml(item.id) + '">' + ICON_VIEW + '</button><button class="btn btn-icon btn-icon-edit" aria-label="编辑证书" data-cert-view="' + escapeHtml(viewName) + '" data-edit-cert="' + escapeHtml(item.id) + '">' + ICON_EDIT + '</button><button class="btn btn-icon btn-icon-delete" aria-label="删除证书" data-cert-view="' + escapeHtml(viewName) + '" data-delete-cert="' + escapeHtml(item.id) + '">' + ICON_DELETE + '</button></div></td>' +
                    '</tr>';
            }).join('');
            tbody.querySelectorAll('[data-cert-row]').forEach(function (row) {
                row.addEventListener('click', function (event) {
                    if (event.target && event.target.closest && event.target.closest('button, input')) return;
                    openCertificationDetail(row.getAttribute('data-cert-row'), row.getAttribute('data-cert-view'));
                });
            });
            tbody.querySelectorAll('[data-view-cert]').forEach(function (btn) {
                btn.addEventListener('click', function () { openCertificationDetail(btn.getAttribute('data-view-cert'), btn.getAttribute('data-cert-view')); });
            });
            tbody.querySelectorAll('[data-edit-cert]').forEach(function (btn) {
                btn.addEventListener('click', function () { openCertificationModal(btn.getAttribute('data-edit-cert'), btn.getAttribute('data-cert-view')); });
            });
            tbody.querySelectorAll('[data-delete-cert]').forEach(function (btn) {
                btn.addEventListener('click', function () { deleteCertification(btn.getAttribute('data-delete-cert'), btn.getAttribute('data-cert-view')); });
            });
            tbody.querySelectorAll('.cert-row-check').forEach(function (checkbox) {
                checkbox.addEventListener('change', function () { updateCertBatchBar(viewName); });
            });
            updateCertBatchBar(viewName);
            openCertificationDetail(activeCertByView[viewName], viewName);
        }

        function certViewTitle(viewName) {
            var map = {
                'cert-qualifications': '企业资质',
                'cert-patents': '专利证书',
                'cert-software': '软著',
                'cert-test-reports': '检测报告'
            };
            return map[viewName] || '证书';
        }

        function certificationTitle(item) {
            return (item && (item.name_en || item.name_ar || item.legacy_id)) || '未命名证书';
        }

        function certificationStatusMeta(status) {
            if (status === 'published') return { className: 'badge-green', label: '已发布' };
            if (status === 'deleted') return { className: 'badge-navy', label: '已删除' };
            return { className: 'badge-gold', label: '草稿' };
        }

        function certificationIsImagePath(path) {
            return /\.(jpe?g|png|webp|gif|svg)$/i.test(String(path || '').trim());
        }

        function renderCertificationThumb(item) {
            var path = item && item.image_path ? String(item.image_path) : '';
            if (path && certificationIsImagePath(path)) {
                return '<div class="cert-thumb"><img src="../' + escapeHtml(path) + '" alt=""></div>';
            }
            return '<div class="cert-thumb cert-thumb-file"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg></div>';
        }

        function openCertificationDetail(id, viewName) {
            viewName = viewName || currentView;
            if (!id) {
                renderCertificationDetail(viewName, null);
                return;
            }
            activeCertByView[viewName] = id;
            document.querySelectorAll('[data-cert-row][data-cert-view="' + viewName + '"]').forEach(function (row) {
                row.classList.toggle('row-active', String(row.getAttribute('data-cert-row')) === String(id));
            });
            renderCertificationDetail(viewName, findCertificationInView(id, viewName));
            apiRequest('/admin/certifications/' + encodeURIComponent(id)).then(function (response) {
                var detail = unwrapDataResponse(response) || {};
                openedCertification = detail;
                renderCertificationDetail(viewName, detail);
            }).catch(function (err) {
                showToast('加载证书详情失败：' + err.message, 'error');
            });
        }

        function renderCertificationDetail(viewName, item) {
            var suffix = certViewSuffix(viewName);
            var panel = document.getElementById('cert-detail-' + suffix);
            if (!panel) return;
            if (!item) {
                panel.className = 'cert-detail-empty';
                panel.innerHTML = '选择一条证书查看预览和发布信息';
                return;
            }
            panel.className = 'cert-detail-content';
            var path = item.image_path || '';
            var statusMeta = certificationStatusMeta(item.status || 'draft');
            var preview = path && certificationIsImagePath(path)
                ? '<img src="../' + escapeHtml(path) + '" alt="' + escapeHtml(certificationTitle(item)) + '预览">'
                : '<div class="cert-detail-file">' + renderCertificationThumb(item) + '<span>' + escapeHtml(path || '未设置文件路径') + '</span></div>';
            panel.innerHTML =
                '<div class="cert-detail-preview">' + preview + '</div>' +
                '<div class="cert-detail-head"><strong>' + escapeHtml(certificationTitle(item)) + '</strong><span class="badge ' + statusMeta.className + '">' + statusMeta.label + '</span></div>' +
                '<dl class="cert-detail-meta">' +
                    '<div><dt>类型</dt><dd>' + escapeHtml(item.category_name_en || certViewTitle(viewName)) + '</dd></div>' +
                    '<div><dt>发证机构</dt><dd>' + escapeHtml(item.issuer_en || '未填写') + '</dd></div>' +
                    '<div><dt>有效期</dt><dd>' + escapeHtml(item.expiry_date || '未填写') + '</dd></div>' +
                    '<div><dt>文件路径</dt><dd title="' + escapeHtml(path) + '">' + escapeHtml(path || '未设置') + '</dd></div>' +
                    '<div><dt>更新时间</dt><dd>' + escapeHtml(formatDate(item.updated_at || item.created_at)) + '</dd></div>' +
                '</dl>' +
                '<div class="cert-detail-note"><span>说明</span><p>' + escapeHtml(item.description_en || '暂无说明') + '</p></div>' +
                '<div class="cert-detail-actions"><button class="btn btn-secondary btn-sm" type="button" data-copy-cert-path="' + escapeHtml(path) + '">复制路径</button><button class="btn btn-primary btn-sm" type="button" data-cert-view="' + escapeHtml(viewName) + '" data-edit-cert="' + escapeHtml(item.id) + '">编辑证书</button></div>';
            panel.querySelectorAll('[data-copy-cert-path]').forEach(function (btn) {
                btn.addEventListener('click', function () { copyAssetPath(btn.getAttribute('data-copy-cert-path') || ''); });
            });
            panel.querySelectorAll('[data-edit-cert]').forEach(function (btn) {
                btn.addEventListener('click', function () { openCertificationModal(btn.getAttribute('data-edit-cert'), btn.getAttribute('data-cert-view')); });
            });
        }

        function findCertificationInView(id, viewName) {
            var rows = certificationViewRows[viewName] || [];
            for (var i = 0; i < rows.length; i++) {
                if (String(rows[i].id) === String(id)) return rows[i];
            }
            return null;
        }

        function openCertificationModal(id, viewName) {
            activeModalTrigger = document.activeElement;
            resetFormDirty();
            viewName = viewName || currentView;
            editingCertificationId = id;
            openedCertification = null;
            uploadedCertificationPath = '';
            document.getElementById('certification-form').reset();
            document.getElementById('cert-editing-id').value = id || '';
            document.getElementById('cert-editing-version').value = '';
            document.getElementById('cert-category-id').value = certificationCategoryMap[certViewSlug(viewName)] || '';
            document.getElementById('certification-modal-title').textContent = id ? '编辑证书' : '新增证书';
            var subtitle = document.getElementById('certification-modal-subtitle');
            if (subtitle) subtitle.textContent = certViewTitle(viewName) + ' · 上传证书图片并维护展示信息';
            var certFile = document.getElementById('cert-file');
            if (certFile) certFile.value = '';
            renderCertificationPreview('');
            if (id) {
                var item = findCertificationInView(id, viewName);
                if (item) {
                    document.getElementById('cert-name').value = item.name_en || '';
                    document.getElementById('cert-name-fr').value = item.name_fr || '';
                    document.getElementById('cert-name-ru').value = item.name_ru || '';
                    document.getElementById('cert-image').value = item.image_path || '';
                    document.getElementById('cert-editing-version').value = item.version || '';
                    uploadedCertificationPath = item.image_path || '';
                    renderCertificationPreview(uploadedCertificationPath);
                }
                apiRequest('/admin/certifications/' + encodeURIComponent(id)).then(function (response) {
                    var detail = unwrapDataResponse(response) || {};
                    openedCertification = detail;
                    document.getElementById('cert-name').value = detail.name_en || '';
                    document.getElementById('cert-name-fr').value = detail.name_fr || '';
                    document.getElementById('cert-name-ru').value = detail.name_ru || '';
                    document.getElementById('cert-issuer').value = detail.issuer_en || '';
                    document.getElementById('cert-issuer-fr').value = detail.issuer_fr || '';
                    document.getElementById('cert-issuer-ru').value = detail.issuer_ru || '';
                    document.getElementById('cert-expiryDate').value = detail.expiry_date || '';
                    document.getElementById('cert-image').value = detail.image_path || '';
                    document.getElementById('cert-description').value = detail.description_en || '';
                    document.getElementById('cert-description-fr').value = detail.description_fr || '';
                    document.getElementById('cert-description-ru').value = detail.description_ru || '';
                    if (!document.getElementById('cert-editing-version').value) {
                        document.getElementById('cert-editing-version').value = detail.version || '';
                    }
                    uploadedCertificationPath = detail.image_path || '';
                    renderCertificationPreview(uploadedCertificationPath);
                    showDraftRecovery(document.querySelector('#certification-modal .modal-body'), draftKey('cert', id), function (draft) {
                        restoreFormDraft('certification-form', draft);
                        renderCertificationPreview(document.getElementById('cert-image').value || uploadedCertificationPath);
                    });
                }).catch(function (err) { showToast('加载证书详情失败：' + err.message, 'error'); });
            }
            showModal('certification-modal');
            if (!id) {
                showDraftRecovery(document.querySelector('#certification-modal .modal-body'), draftKey('cert', 'new'), function (draft) {
                    restoreFormDraft('certification-form', draft);
                    renderCertificationPreview(document.getElementById('cert-image').value || uploadedCertificationPath);
                });
            }
        }

        function renderCertificationPreview(pathOrSrc) {
            var preview = document.getElementById('cert-preview');
            if (!preview) return;
            var value = String(pathOrSrc || '').trim();
            if (!value) {
                preview.innerHTML = '<span>暂无预览</span>';
                preview.classList.remove('has-image');
                return;
            }
            var src = value.indexOf('blob:') === 0 || /^https?:\/\//i.test(value) ? value : '../' + value;
            if (value.indexOf('blob:') === 0 || certificationIsImagePath(value)) {
                preview.innerHTML = '<img src="' + escapeHtml(src) + '" alt="证书预览">';
                preview.classList.add('has-image');
            } else {
                preview.innerHTML = '<span>' + escapeHtml(value) + '</span>';
                preview.classList.remove('has-image');
            }
        }

        function uploadCertificationFile() {
            var file = this.files[0];
            if (!file) return;
            renderCertificationPreview(URL.createObjectURL(file));
            uploadAdminAssetFile(file, {
                module: 'certifications',
                entity_type: 'certification',
                entity_id: editingCertificationId || ''
            })
                .then(function (data) {
                    if (data.error) throw new Error(data.error);
                    var path = getProductUploadPath(data);
                    uploadedCertificationPath = path;
                    document.getElementById('cert-image').value = path;
                    renderCertificationPreview(path);
                    markFormDirty();
                    showToast('证书文件上传成功');
                })
                .catch(function (err) { showToast('证书文件上传失败：' + err.message, 'error'); });
        }

        function openCertificationAssetPicker() {
            openAssetPicker({
                title: '选择证书图片',
                subtitle: '从资源库复用已有证书图片，或上传新图片后直接回填。',
                module: 'certifications',
                entityType: 'certification',
                entityId: editingCertificationId || '',
                onSelect: function (asset) {
                    var path = asset && asset.path ? asset.path : '';
                    if (!path) return;
                    uploadedCertificationPath = path;
                    document.getElementById('cert-image').value = path;
                    renderCertificationPreview(path);
                    markFormDirty();
                    showToast('已选择证书图片');
                }
            });
        }

        function clearCertificationImage() {
            uploadedCertificationPath = '';
            var field = document.getElementById('cert-image');
            if (field) field.value = '';
            var certFile = document.getElementById('cert-file');
            if (certFile) certFile.value = '';
            renderCertificationPreview('');
            markFormDirty();
        }

        function saveCertification(e) {
            e.preventDefault();
            var imagePath = document.getElementById('cert-image').value.trim() || uploadedCertificationPath;
            var payload = {
                name_en: document.getElementById('cert-name').value.trim(),
                name_fr: document.getElementById('cert-name-fr').value.trim(),
                name_ru: document.getElementById('cert-name-ru').value.trim(),
                issuer_en: document.getElementById('cert-issuer').value.trim(),
                issuer_fr: document.getElementById('cert-issuer-fr').value.trim(),
                issuer_ru: document.getElementById('cert-issuer-ru').value.trim(),
                expiry_date: document.getElementById('cert-expiryDate').value.trim(),
                image_path: imagePath,
                description_en: document.getElementById('cert-description').value.trim(),
                description_fr: document.getElementById('cert-description-fr').value.trim(),
                description_ru: document.getElementById('cert-description-ru').value.trim(),
                category_id: parseInt(document.getElementById('cert-category-id').value, 10),
                status: 'published'
            };
            if (!payload.name_en && !imagePath) {
                showToast('请填写证书名称或先上传证书文件', 'error');
                return;
            }
            if (editingCertificationId) payload.version = document.getElementById('cert-editing-version').value;
            var request = editingCertificationId
                ? apiRequest('/admin/certifications/' + encodeURIComponent(editingCertificationId), { method: 'PUT', body: payload })
                : apiRequest('/admin/certifications', { method: 'POST', body: payload });
            request.then(function () {
                showToast('证书已保存');
                resetFormDirty();
                safeSessionRemove(draftKey('cert', editingCertificationId || 'new'));
                closeModal('certification-modal', true);
                loadCertView(currentView);
            }).catch(function (err) {
                if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
                    safeSessionSet(draftKey('cert', editingCertificationId || 'new'), collectFormDraft('certification-form'));
                    showConflictNotice('内容已被他人修改，请重新加载后再编辑', function () { loadCertView(currentView); });
                    return;
                }
                showToast('保存证书失败：' + err.message, 'error');
            });
        }

        function deleteCertification(id, viewName) {
            showConfirm('删除证书', '确定删除这个证书吗？').then(function (ok) {
                if (!ok) return;
                apiRequest('/admin/certifications/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () {
                    showToast('证书已删除');
                    loadCertView(viewName || currentView);
                }).catch(function (err) { showToast('删除失败：' + err.message, 'error'); });
            });
        }

        function contentBlockSlug(viewName) {
            var map = {
                'content-home': 'home',
                'content-solutions': 'solutions',
                'content-company-overview': 'company-overview',
                'content-contact': 'contact',
                'content-about': 'about-us',
                'content-product-pages': 'product-pages',
                'content-global-shell': 'global-shell',
                'content-technology': 'innovation',
                'content-industries': 'applications',
                'content-education': 'education',
                'content-page-blocks': 'page-blocks'
            };
            return map[viewName] || '';
        }

        function isContentBlockView(viewName) {
            return !!contentBlockSlug(viewName);
        }

        var CONTENT_BLOCK_FORMS = {
            'content-company-overview': {
                fields: [
                    ['name', '公司名称'], ['nameAr', '公司名称（阿语）'], ['nameCN', '公司名称（中文）'],
                    ['founded', '成立时间'], ['stockCode', '股票代码'], ['registeredCapital', '注册资本'],
                    ['registeredCapitalAr', '注册资本（阿语）'], ['factoryArea', '厂区面积'], ['factoryAreaAr', '厂区面积（阿语）'],
                    ['patents', '专利数量'], ['researchPartners', '科研伙伴'], ['cover_image', '封面图路径']
                ],
                textareas: [
                    ['description', '简介'], ['descriptionAr', '简介（阿语）'],
                    ['aboutIntro', '关于简介'], ['aboutIntroAr', '关于简介（阿语）'],
                    ['aboutDetail', '关于详情'], ['aboutDetailAr', '关于详情（阿语）']
                ],
                arrays: [
                    { key: 'stats', label: '统计数据', fields: [['value', '数值'], ['label', '标签'], ['labelAr', '标签（阿语）']] }
                ],
                seo: true
            },
            'content-contact': {
                fields: [
                    ['address', '地址'], ['addressAr', '地址（阿语）'], ['headquarters', '总部'], ['headquartersAr', '总部（阿语）'],
                    ['phone', '电话'], ['email', '邮箱'], ['officeHours', '办公时间'], ['officeHoursAr', '办公时间（阿语）'],
                    ['huaiyangBase', '淮阳基地'], ['huaiyangBaseAr', '淮阳基地（阿语）'],
                    ['wechat', '微信'], ['wechatQr', '微信二维码'],
                    ['skype', 'Skype'], ['line', 'Line'], ['lineQr', 'Line 二维码'], ['tiktok', 'TikTok'],
                    ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['googleMapsUrl', 'Google Maps URL'],
                    ['googleMapsEmbedUrl', 'Google Maps Embed URL'], ['googleMyMapsEmbedUrl', 'Google My Maps Embed URL'],
                    ['openStreetMapUrl', 'OpenStreetMap URL'], ['mapQr', '地图二维码']
                ],
                objects: [['mapLocations', '地图位置']],
                seo: true
            },
            'content-education': {
                groups: [
                    { key: 'hero', label: 'Hero', fields: [['eyebrow', 'Eyebrow'], ['title', '标题'], ['titleAr', '标题（阿语）'], ['subtitle', '副标题'], ['subtitleAr', '副标题（阿语）'], ['backgroundImage', '背景图']] },
                    { key: 'cta', label: 'CTA', fields: [['title', '标题'], ['titleAr', '标题（阿语）'], ['text', '正文'], ['textAr', '正文（阿语）'], ['buttonText', '按钮'], ['buttonTextAr', '按钮（阿语）'], ['href', '链接']] }
                ],
                arrays: [
                    { key: 'stats', label: '统计数据', fields: [['value', '数值'], ['label', '标签'], ['labelAr', '标签（阿语）']] },
                    { key: 'sections', label: '合作板块', fields: [['id', 'ID'], ['modeNumber', '序号'], ['title', '标题'], ['titleAr', '标题（阿语）'], ['tagline', '标语'], ['taglineAr', '标语（阿语）'], ['summary', '摘要'], ['summaryAr', '摘要（阿语）'], ['image', '图片'], ['images', '证明图片'], ['bestFor', '适合对象'], ['bestForAr', '适合对象（阿语）']] }
                ]
            },
            'content-page-blocks': {
                blocks: [
                    { key: 'footer', label: '页脚', fields: [['footerText', '页脚文本'], ['footerTextAr', '页脚文本（阿语）'], ['is_active', '启用']] },
                    { key: 'home-cta', label: '首页 CTA', fields: [['title_en', '标题（英文）'], ['title_ar', '标题（阿语）'], ['title_cn', '标题（中文）'], ['text_en', '正文（英文）'], ['text_ar', '正文（阿语）'], ['text_cn', '正文（中文）'], ['image', '图片'], ['href', '链接'], ['is_active', '启用']] }
                ]
            },
            'content-about': {
                groups: [
                    { key: 'hero', label: 'Hero', fields: [['title_en', '标题（英文）'], ['title_ar', '标题（阿语）'], ['title_cn', '标题（中文）'], ['subtitle_en', '副标题（英文）'], ['subtitle_ar', '副标题（阿语）'], ['subtitle_cn', '副标题（中文）'], ['image', '图片']] }
                ],
                arrays: [
                    { key: 'sections', label: '内容段落', fields: [['title_en', '标题（英文）'], ['title_ar', '标题（阿语）'], ['title_cn', '标题（中文）'], ['body_en', '正文（英文）'], ['body_ar', '正文（阿语）'], ['body_cn', '正文（中文）'], ['image', '图片'], ['layout', '布局']] },
                    { key: 'milestones', label: '里程碑', fields: [['year', '年份'], ['title_en', '标题（英文）'], ['title_ar', '标题（阿语）'], ['title_cn', '标题（中文）'], ['description_en', '描述（英文）'], ['description_ar', '描述（阿语）'], ['description_cn', '描述（中文）']] }
                ],
                seo: true
            },
            'content-industries': {
                groups: [
                    { key: 'hero', label: 'Hero', fields: [['title_en', '标题（英文）'], ['title_ar', '标题（阿语）'], ['title_cn', '标题（中文）'], ['subtitle_en', '副标题（英文）'], ['subtitle_ar', '副标题（阿语）'], ['subtitle_cn', '副标题（中文）'], ['image', '图片']] }
                ],
                arrays: [
                    { key: 'industries', label: '行业', fields: [['name_en', '名称（英文）'], ['name_ar', '名称（阿语）'], ['name_cn', '名称（中文）'], ['summary_en', '摘要（英文）'], ['summary_ar', '摘要（阿语）'], ['summary_cn', '摘要（中文）'], ['image', '图片'], ['related_product_ids', '关联产品']] }
                ],
                seo: true
            },
            'content-technology': {
                groups: [
                    { key: 'hero', label: 'Hero', fields: [['title_en', '标题（英文）'], ['title_ar', '标题（阿语）'], ['title_cn', '标题（中文）'], ['subtitle_en', '副标题（英文）'], ['subtitle_ar', '副标题（阿语）'], ['subtitle_cn', '副标题（中文）'], ['image', '图片']] }
                ],
                arrays: [
                    { key: 'sections', label: '技术板块', fields: [['title_en', '标题（英文）'], ['title_ar', '标题（阿语）'], ['title_cn', '标题（中文）'], ['body_en', '正文（英文）'], ['body_ar', '正文（阿语）'], ['body_cn', '正文（中文）'], ['image', '图片']] },
                    { key: 'highlights', label: '亮点指标', fields: [['label_en', '标签（英文）'], ['label_ar', '标签（阿语）'], ['label_cn', '标签（中文）'], ['value', '数值']] }
                ],
                fields: [['related_certification_ids', '关联证书']],
                seo: true
            }
        };

        var CONTENT_VIEW_TITLES = {
            'content-home': '首页',
            'content-solutions': '解决方案',
            'content-company-overview': '企业概况',
            'content-contact': '联系我们',
            'content-about': '关于我们',
            'content-product-pages': '产品页面',
            'content-global-shell': '全站壳层',
            'content-technology': '科技创新',
            'content-industries': '应用行业',
            'content-education': '教育合作',
            'content-page-blocks': '页面区块'
        };

        var FIELD_LABELS = {
            title: '标题',
            title_en: '标题（英文）',
            title_ar: '标题（阿语）',
            title_cn: '标题（中文）',
            subtitle: '副标题',
            subtitle_en: '副标题（英文）',
            subtitle_ar: '副标题（阿语）',
            subtitle_cn: '副标题（中文）',
            text: '正文',
            text_en: '正文（英文）',
            text_ar: '正文（阿语）',
            text_cn: '正文（中文）',
            body: '正文',
            body_en: '正文（英文）',
            body_ar: '正文（阿语）',
            body_cn: '正文（中文）',
            description: '描述',
            description_en: '描述（英文）',
            description_ar: '描述（阿语）',
            description_cn: '描述（中文）',
            summary: '摘要',
            summary_en: '摘要（英文）',
            summary_ar: '摘要（阿语）',
            summary_cn: '摘要（中文）',
            image: '图片',
            backgroundImage: '背景图片',
            cover_image: '封面图',
            mapLocations: '地图位置',
            related_product_ids: '关联产品',
            related_certification_ids: '关联证书',
            href: '链接',
            is_active: '启用状态',
            status: '状态',
            sort_order: '排序',
            value: '数值',
            label: '标签',
            labelAr: '标签（阿语）',
            key: '区块标识'
        };

        function getPathValue(obj, path) {
            return path.split('.').reduce(function (current, key) {
                return current && current[key] !== undefined ? current[key] : '';
            }, obj || {});
        }

        function hasPathValue(obj, path) {
            var current = obj || {};
            var parts = String(path || '').split('.').filter(Boolean);
            for (var i = 0; i < parts.length; i += 1) {
                var key = parts[i];
                if (!current || current[key] === undefined) return false;
                current = current[key];
            }
            return true;
        }

        function isPathIndex(key) {
            return /^\d+$/.test(String(key || ''));
        }

        function setPathValue(obj, path, value) {
            var parts = path.split('.');
            var current = obj;
            parts.forEach(function (key, index) {
                var targetKey = Array.isArray(current) && isPathIndex(key) ? Number(key) : key;
                if (index === parts.length - 1) {
                    current[targetKey] = value;
                    return;
                }
                var nextKey = parts[index + 1];
                var shouldBeArray = isPathIndex(nextKey);
                var nextValue = current[targetKey];
                if (shouldBeArray) {
                    if (!Array.isArray(nextValue)) current[targetKey] = [];
                } else if (!nextValue || typeof nextValue !== 'object' || Array.isArray(nextValue)) {
                    current[targetKey] = {};
                }
                current = current[targetKey];
            });
        }

        function cloneBody(value) {
            try {
                return JSON.parse(JSON.stringify(value || {}));
            } catch (err) {
                return {};
            }
        }

        function fieldInputValue(field) {
            if (!field) return '';
            if (field.type === 'checkbox') return !!field.checked;
            return field.value;
        }

        function fieldLastKey(path) {
            var parts = String(path || '').split('.');
            return parts[parts.length - 1] || path;
        }

        function humanizeFieldLabel(path, label) {
            if (label) return label;
            var key = fieldLastKey(path);
            if (FIELD_LABELS[key]) return FIELD_LABELS[key];
            return String(key)
                .replace(/_/g, ' ')
                .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                .replace(/\b\w/g, function (char) { return char.toUpperCase(); });
        }

        function shouldUseTextarea(path) {
            return /body|summary|description|subtitle|text|note|answer|message|content|footer|intro|placeholder|address/i.test(fieldLastKey(path));
        }

        function isImageLikeField(path) {
            return /(^|\.)(image|backgroundImage|cover_image|thumbnail|preview|logo|icon|qr|mapQr|wechatQr)$/i.test(path);
        }

        function isImageListField(path) {
            return /(^|\.)(images|galleryImages)$/i.test(path);
        }

        function isPrimitiveList(value) {
            return Array.isArray(value) && value.every(function (item) {
                return item == null || typeof item !== 'object';
            });
        }

        function isRelationField(path) {
            return /related_(product|certification)_ids$/.test(path);
        }

        function inputTypeForPath(path) {
            var key = fieldLastKey(path).toLowerCase();
            if (/email/.test(key)) return 'email';
            if (/phone|tel/.test(key)) return 'tel';
            if (/url|href/.test(key)) return 'url';
            if (/sort|order|year|count|number|patents|partners|value|zoom|lat|lng|longitude|latitude/.test(key)) return 'number';
            return 'text';
        }

        function renderFieldHint(path, value) {
            var text = String(value == null ? '' : value);
            if (/title|subtitle|summary|description|text|body/i.test(fieldLastKey(path))) {
                var max = /title/i.test(fieldLastKey(path)) ? 60 : 120;
                if (/body|description|text/i.test(fieldLastKey(path))) max = 500;
                return '<small class="cms-field-hint">' + text.length + ' / ' + max + '</small>';
            }
            if (isImageLikeField(path)) {
                return '<small class="cms-field-hint">建议使用 JPG / PNG / WebP，并保持前台展示比例。</small>';
            }
            if (isRelationField(path)) {
                return '<small class="cms-field-hint">选择项会保存为现有接口需要的关联数组。</small>';
            }
            return '';
        }

        function normalizeStructuredValue(path, value) {
            if (typeof value === 'boolean') return value;
            if (/related_(product|certification)_ids$/.test(path)) {
                var invalidItems = [];
                var ids = String(value || '').split(',').map(function (item) {
                    var raw = item.trim();
                    if (!raw) return null;
                    var parsed = parseInt(raw, 10);
                    if (!Number.isFinite(parsed)) invalidItems.push(raw);
                    return Number.isFinite(parsed) ? parsed : null;
                }).filter(function (item) { return item != null; });
                if (invalidItems.length) {
                    showToast('关联 ID 已忽略非数字项：' + invalidItems.join(', '), 'error');
                }
                return ids;
            }
            if (path === 'is_active' || /\.is_active$/.test(path)) {
                return value === true || value === 'true' || value === '1';
            }
            if (/sort|order|year|count|number|patents|partners|value|zoom|lat|lng|longitude|latitude/i.test(fieldLastKey(path))) {
                var parsed = Number(value);
                if (value !== '' && Number.isFinite(parsed)) return parsed;
            }
            return String(value == null ? '' : value).trim();
        }

        function renderField(path, label, value, textarea) {
            var id = 'cms-field-' + path.replace(/[^a-zA-Z0-9_-]/g, '-');
            var resolvedLabel = humanizeFieldLabel(path, label);
            var valueText = Array.isArray(value) ? value.join(', ') : (value == null ? '' : String(value));
            if (path === 'is_active' || /\.is_active$/.test(path)) {
                return '<label class="cms-toggle-field"><input type="checkbox" data-cms-field="' + escapeHtml(path) + '"' + (value !== false ? ' checked' : '') + '><span><strong>' + escapeHtml(resolvedLabel) + '</strong><small>' + (value === false ? '当前停用' : '当前启用') + '</small></span></label>';
            }
            if (isRelationField(path)) {
                var chips = Array.isArray(value) ? value : String(valueText || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean);
                return '<div class="form-group cms-field cms-relation-field"><label for="' + escapeHtml(id) + '">' + escapeHtml(resolvedLabel) + '</label><input id="' + escapeHtml(id) + '" data-cms-field="' + escapeHtml(path) + '" type="text" value="' + escapeHtml(valueText) + '" placeholder="搜索并选择关联项"><div class="cms-chip-row">' + chips.map(function (item) { return '<span class="cms-chip">' + escapeHtml(item) + '</span>'; }).join('') + '</div>' + renderFieldHint(path, valueText) + '</div>';
            }
            if (isImageLikeField(path)) {
                var preview = valueText ? '<img src="../' + escapeHtml(valueText) + '" alt="' + escapeHtml(resolvedLabel) + '预览">' : '<span class="cms-image-empty">暂无图片</span>';
                return '<div class="form-group cms-field cms-image-field"><label for="' + escapeHtml(id) + '">' + escapeHtml(resolvedLabel) + '</label><div class="cms-image-card"><div class="cms-image-preview">' + preview + '</div><div class="cms-image-controls"><input id="' + escapeHtml(id) + '" data-cms-field="' + escapeHtml(path) + '" type="text" value="' + escapeHtml(valueText) + '" placeholder="从资源库选择或粘贴资源路径"><div class="asset-field-actions cms-image-actions"><button type="button" class="btn btn-secondary btn-sm cms-asset-shortcut" data-cms-select-asset="' + escapeHtml(id) + '">从资源库选择</button><button type="button" class="btn btn-secondary btn-sm cms-clear-asset" data-cms-clear-asset="' + escapeHtml(id) + '">清空</button></div></div></div>' + renderFieldHint(path, valueText) + '</div>';
            }
            if (textarea) {
                return '<div class="form-group cms-field"><label for="' + escapeHtml(id) + '">' + escapeHtml(resolvedLabel) + '</label><textarea id="' + escapeHtml(id) + '" data-cms-field="' + escapeHtml(path) + '" rows="4">' + escapeHtml(valueText) + '</textarea>' + renderFieldHint(path, valueText) + '</div>';
            }
            return '<div class="form-group cms-field"><label for="' + escapeHtml(id) + '">' + escapeHtml(resolvedLabel) + '</label><input id="' + escapeHtml(id) + '" data-cms-field="' + escapeHtml(path) + '" type="' + inputTypeForPath(path) + '" value="' + escapeHtml(valueText) + '">' + renderFieldHint(path, valueText) + '</div>';
        }

        function renderListField(path, label, value) {
            var id = 'cms-list-' + path.replace(/[^a-zA-Z0-9_-]/g, '-');
            var list = Array.isArray(value) ? value : [];
            var listText = list.join('\n');
            var imageActions = isImageListField(path)
                ? '<div class="asset-field-actions cms-image-actions"><button type="button" class="btn btn-secondary btn-sm cms-asset-shortcut" data-cms-select-list-asset="' + escapeHtml(id) + '">从资源库添加</button><button type="button" class="btn btn-secondary btn-sm cms-clear-asset" data-cms-clear-list-asset="' + escapeHtml(id) + '">清空</button></div>'
                : '';
            var hint = isImageListField(path) ? '每行一张图片；可从资源库追加，保存时仍写回原数组结构。' : '每行一项，保存时仍写回原数组结构。';
            return '<div class="form-group cms-field"><label for="' + escapeHtml(id) + '">' + escapeHtml(humanizeFieldLabel(path, label)) + '</label><textarea id="' + escapeHtml(id) + '" data-cms-list="' + escapeHtml(path) + '" rows="4">' + escapeHtml(listText) + '</textarea>' + imageActions + '<small class="cms-field-hint">' + escapeHtml(hint) + '</small></div>';
        }

        function renderObjectEditor(path, label, value) {
            var objectValue = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
            var keys = Object.keys(objectValue);
            if (!keys.length) {
                return '<fieldset class="cms-fieldset cms-object-fieldset"><legend>' + escapeHtml(humanizeFieldLabel(path, label)) + '</legend><p class="cms-empty-note">暂无可编辑字段。</p></fieldset>';
            }
            return '<fieldset class="cms-fieldset cms-object-fieldset"><legend>' + escapeHtml(humanizeFieldLabel(path, label)) + '</legend><div class="cms-field-grid">' + keys.map(function (key) {
                var childPath = path ? path + '.' + key : key;
                return renderGenericValue(childPath, humanizeFieldLabel(childPath), objectValue[key]);
            }).join('') + '</div></fieldset>';
        }

        function renderGenericArray(path, label, items, explicitFields) {
            var arrayItems = Array.isArray(items) ? items : [];
            var fieldNames = explicitFields ? explicitFields.map(function (field) { return field[0]; }) : [];
            if (!fieldNames.length) {
                arrayItems.forEach(function (item) {
                    if (item && typeof item === 'object' && !Array.isArray(item)) {
                        Object.keys(item).forEach(function (key) {
                            if (fieldNames.indexOf(key) === -1) fieldNames.push(key);
                        });
                    }
                });
            }
            if (!fieldNames.length && arrayItems.length && typeof arrayItems[0] !== 'object') {
                return renderListField(path, label, arrayItems);
            }
            var explicitMap = {};
            (explicitFields || []).forEach(function (field) { explicitMap[field[0]] = field; });
            var fieldConfigs = fieldNames.map(function (fieldName) {
                return explicitMap[fieldName] || [fieldName, humanizeFieldLabel(fieldName)];
            });
            return '<fieldset class="cms-fieldset" data-cms-array="' + escapeHtml(path) + '"><legend>' + escapeHtml(humanizeFieldLabel(path, label)) + '<span class="cms-count-badge">共 ' + arrayItems.length + ' 项</span></legend>' +
                '<div class="cms-array-items">' + arrayItems.map(function (item, index) {
                    var cardTitle = item && (item.title_cn || item.title_en || item.title || item.name_cn || item.name_en || item.label || item.year || item.key) || ('项目 ' + (index + 1));
                    return '<details class="cms-array-item" data-cms-array-item="' + index + '" open><summary class="cms-array-summary"><span>' + escapeHtml(cardTitle) + '</span><span class="cms-array-summary-actions"><button type="button" class="btn btn-secondary btn-sm cms-move-up">上移</button><button type="button" class="btn btn-secondary btn-sm cms-move-down">下移</button><button type="button" class="btn btn-danger btn-sm cms-remove-item">删除</button></span></summary><div class="cms-array-body">' +
                        renderFieldsWithLanguageTabs(path + '.' + index, fieldConfigs, function (fieldName) {
                            return item && item[fieldName] !== undefined ? item[fieldName] : '';
                        }) + '</div></details>';
                }).join('') + '</div><button type="button" class="btn btn-secondary cms-add-item" data-cms-add="' + escapeHtml(path) + '">新增' + escapeHtml(humanizeFieldLabel(path, label)) + '</button></fieldset>';
        }

        function renderGenericValue(path, label, value) {
            if (Array.isArray(value)) return renderGenericArray(path, label, value);
            if (value && typeof value === 'object') return renderObjectEditor(path, label, value);
            return renderField(path, label, value, shouldUseTextarea(path));
        }

        function renderConfiguredField(path, label, value, forceTextarea) {
            if (isPrimitiveList(value)) return renderListField(path, label, value);
            if (Array.isArray(value) || (value && typeof value === 'object')) {
                return renderGenericValue(path, label, value);
            }
            return renderField(path, label, value, !!forceTextarea || shouldUseTextarea(path));
        }

        function parseLanguageFieldName(name) {
            var text = String(name || '');
            var match = text.match(/^(.*)_(cn|zh|en|ar)$/i);
            if (match) {
                return { base: match[1], lang: match[2].toLowerCase() === 'zh' ? 'cn' : match[2].toLowerCase() };
            }
            match = text.match(/^(.*)(CN|En|AR|Ar)$/);
            if (match) return { base: match[1], lang: match[2].toLowerCase() };
            return { base: text, lang: null };
        }

        function stripLanguageLabel(label) {
            return String(label || '').replace(/（[^）]+）/g, '').replace(/\s*\([^)]*\)\s*/g, '').trim();
        }

        function renderLocalizedFieldSet(uid, label, fields) {
            var langLabels = { cn: '简体中文', en: 'English', ar: 'العربية' };
            var order = { cn: 0, en: 1, ar: 2 };
            fields.sort(function (a, b) {
                return (order[a.lang] == null ? 10 : order[a.lang]) - (order[b.lang] == null ? 10 : order[b.lang]);
            });
            var active = fields[0] ? fields[0].lang : 'cn';
            var tabs = fields.map(function (field) {
                return '<button type="button" class="cms-lang-tab' + (field.lang === active ? ' active' : '') + '" data-cms-lang="' + escapeHtml(field.lang) + '">' + escapeHtml(langLabels[field.lang] || field.lang) + '</button>';
            }).join('');
            var panels = fields.map(function (field) {
                return '<div class="cms-lang-panel' + (field.lang === active ? ' active' : '') + '" data-cms-lang-panel="' + escapeHtml(field.lang) + '">' +
                    renderConfiguredField(field.path, field.label, field.value, field.forceTextarea) +
                    '</div>';
            }).join('');
            return '<div class="cms-lang-set" id="' + escapeHtml(uid) + '"><div class="cms-lang-set-title">' + escapeHtml(label) + '</div><div class="cms-lang-tabs" role="tablist">' + tabs + '</div>' + panels + '</div>';
        }

        function renderFieldsWithLanguageTabs(basePath, fields, valueGetter) {
            var parsed = fields.map(function (field) {
                return {
                    name: field[0],
                    label: field[1],
                    forceTextarea: !!field[2],
                    parsed: parseLanguageFieldName(field[0])
                };
            });
            var used = {};
            var html = '';
            parsed.forEach(function (field, index) {
                if (used[index]) return;
                var siblings = parsed.map(function (candidate, candidateIndex) {
                    return { field: candidate, index: candidateIndex };
                }).filter(function (candidate) {
                    return candidate.field.parsed.base === field.parsed.base;
                });
                var hasLanguageVariant = siblings.some(function (candidate) { return candidate.field.parsed.lang; });
                if (hasLanguageVariant && siblings.length > 1) {
                    siblings.forEach(function (candidate) { used[candidate.index] = true; });
                    var tabFields = siblings.map(function (candidate) {
                        var name = candidate.field.name;
                        var lang = candidate.field.parsed.lang || 'en';
                        var fullPath = basePath ? basePath + '.' + name : name;
                        return {
                            lang: lang,
                            path: fullPath,
                            label: candidate.field.label,
                            value: valueGetter(name),
                            forceTextarea: candidate.field.forceTextarea
                        };
                    });
                    var uid = 'cms-lang-' + (basePath ? basePath + '-' : '') + field.parsed.base;
                    html += renderLocalizedFieldSet(uid.replace(/[^a-zA-Z0-9_-]/g, '-'), stripLanguageLabel(field.label) || humanizeFieldLabel(field.parsed.base), tabFields);
                    return;
                }
                used[index] = true;
                var fullPath = basePath ? basePath + '.' + field.name : field.name;
                html += renderConfiguredField(fullPath, field.label, valueGetter(field.name), field.forceTextarea);
            });
            return html;
        }

        function renderGroup(group, body) {
            return '<fieldset class="cms-fieldset"><legend>' + escapeHtml(group.label) + '</legend>' +
                '<div class="cms-field-grid">' + renderFieldsWithLanguageTabs(group.key, group.fields, function (fieldName) {
                    return getPathValue(body, group.key + '.' + fieldName);
                }) + '</div></fieldset>';
        }

        function renderArrayEditor(arrayConfig, body) {
            var items = Array.isArray(body[arrayConfig.key]) ? body[arrayConfig.key] : [];
            return renderGenericArray(arrayConfig.key, arrayConfig.label, items, arrayConfig.fields);
        }

        function renderEducationVisualRedirect(form) {
            form.innerHTML = '<div class="content-editor-panel visual-redirect-panel">' +
                '<div class="content-editor-panel-head"><h3>教育合作已统一到可视化管理</h3><p>请在“可视化管理 > 教育合作”维护页面字段、阿拉伯语内容和图片资源，旧内容模块不再提供路径列表编辑。</p></div>' +
                '<button type="button" class="btn btn-primary" data-education-visual-redirect>打开教育合作可视化管理</button>' +
            '</div>';
        }

        function renderContentBlockForm(viewName, block) {
            var config = CONTENT_BLOCK_FORMS[viewName] || {};
            var form = document.getElementById('form-' + viewName);
            if (!form) return;
            if (viewName === 'content-education') {
                renderEducationVisualRedirect(form);
                return;
            }
            var body = block.body_json || {};
            var summary = contentBlockSummary(block);
            var handled = {};
            var panels = [];

            function markHandled(path) {
                if (!path) return;
                handled[String(path).split('.')[0]] = true;
            }

            function addPanel(label, bodyHtml) {
                if (!bodyHtml) return;
                panels.push({ label: label, html: bodyHtml });
            }

            addPanel('基础信息',
                '<fieldset class="cms-fieldset"><legend>基础信息</legend>' +
                '<div class="form-group cms-field"><label for="' + escapeHtml(viewName) + '-title-en">后台标题（英文）</label><input type="text" id="' + escapeHtml(viewName) + '-title-en" value="' + escapeHtml(block.title_en || '') + '"></div>' +
                '<div class="cms-status-row"><span class="status-badge badge-green">' + escapeHtml(block.status || 'published') + '</span><span>内容摘要：' + escapeHtml(summary) + '</span></div>' +
                '</fieldset>'
            );

            var simpleFieldConfigs = [];
            (config.fields || []).forEach(function (field) {
                markHandled(field[0]);
                simpleFieldConfigs.push([field[0], field[1], false]);
            });
            (config.textareas || []).forEach(function (field) {
                markHandled(field[0]);
                simpleFieldConfigs.push([field[0], field[1], true]);
            });
            var simpleFields = renderFieldsWithLanguageTabs('', simpleFieldConfigs, function (fieldName) {
                return getPathValue(body, fieldName);
            });
            if (simpleFields) addPanel('基础字段', '<fieldset class="cms-fieldset"><legend>基础字段</legend><div class="cms-field-grid">' + simpleFields + '</div></fieldset>');
            (config.objects || []).forEach(function (field) {
                markHandled(field[0]);
                addPanel(field[1], renderObjectEditor(field[0], field[1], getPathValue(body, field[0])));
            });
            (config.groups || []).forEach(function (group) {
                markHandled(group.key);
                addPanel(group.label, renderGroup(group, body));
            });
            (config.arrays || []).forEach(function (arrayConfig) {
                markHandled(arrayConfig.key);
                addPanel(arrayConfig.label, renderArrayEditor(arrayConfig, body));
            });
            if (config.blocks) {
                markHandled('blocks');
                addPanel('页面区块', renderReservedBlocks(config.blocks, body));
            }
            if (config.seo) {
                markHandled('seo');
                addPanel('SEO 设置', '<fieldset class="cms-fieldset"><legend>SEO 设置</legend>' +
                    renderField('seo.title', 'SEO 标题', getPathValue(body, 'seo.title'), false) +
                    renderField('seo.description', 'SEO 描述', getPathValue(body, 'seo.description'), true) +
                    renderField('seo.keywords', 'SEO 关键词', getPathValue(body, 'seo.keywords'), false) +
                    '</fieldset>');
            }

            Object.keys(body || {}).forEach(function (key) {
                if (handled[key]) return;
                addPanel(humanizeFieldLabel(key), renderGenericValue(key, humanizeFieldLabel(key), body[key]));
            });

            var nav = panels.map(function (panel, index) {
                return '<a href="#cms-panel-' + escapeHtml(viewName) + '-' + index + '">' + escapeHtml(panel.label) + '</a>';
            }).join('');
            var mainPanels = panels.map(function (panel, index) {
                return '<div class="cms-panel" id="cms-panel-' + escapeHtml(viewName) + '-' + index + '">' + panel.html + '</div>';
            }).join('');
            var statusText = block.updated_at ? '已加载：' + formatDate(block.updated_at) : '已加载';
            var html = '<div class="content-editor-toolbar"><div><strong>' + escapeHtml(CONTENT_VIEW_TITLES[viewName] || '内容管理') + '</strong><span>' + escapeHtml(summary) + '</span></div><div class="content-editor-actions"><button type="button" class="btn btn-secondary cms-reload">重新加载</button><button type="submit" class="btn btn-primary">保存更改</button></div></div>' +
                '<div class="content-editor-shell">' +
                '<aside class="cms-module-nav" aria-label="内容模块导航"><h3>内容模块</h3>' + nav + '</aside>' +
                '<div class="cms-editor-main"><div class="cms-impact-banner">当前修改会影响前台 ' + escapeHtml(CONTENT_VIEW_TITLES[viewName] || '内容') + ' 相关展示区域。所有字段均通过可视化控件编辑，保存时保持原有数据结构。</div>' + mainPanels + '</div>' +
                '<aside class="cms-side-panel"><section><h3>保存状态</h3><p id="' + escapeHtml(viewName) + '-status">' + escapeHtml(statusText) + '</p><p>版本：v' + escapeHtml(block.version || '1') + '</p></section><section><h3>编辑提示</h3><ul><li>图片建议先从资源库确认尺寸。</li><li>多语言字段保存后会同步到对应前台页面。</li><li>危险操作会进行二次确认。</li></ul></section><section><h3>快捷操作</h3><button type="button" class="btn btn-secondary btn-sm cms-reload">重新加载</button><button type="button" class="btn btn-secondary btn-sm cms-asset-shortcut" data-action="view-assets">打开资源库</button></section></aside>' +
                '</div>';
            form.innerHTML = html;
        }

        function contentBlockSummary(block) {
            var body = (block && block.body_json) || {};
            var candidates = [
                body.title_zh,
                body.title_cn,
                body.title,
                body.content_zh,
                body.content_cn,
                body.description,
                body.hero && (body.hero.title || body.hero.title_cn),
                block && block.title_en
            ];
            for (var i = 0; i < candidates.length; i++) {
                var value = String(candidates[i] == null ? '' : candidates[i]).trim();
                if (value) return value.slice(0, 40);
            }
            return '—';
        }

        function renderReservedBlocks(blockConfigs, body) {
            var blocks = Array.isArray(body.blocks) ? body.blocks : [];
            return '<fieldset class="cms-fieldset"><legend>系统区块</legend>' + blockConfigs.map(function (blockConfig) {
                var item = blocks.filter(function (block) { return block.key === blockConfig.key; })[0] || { key: blockConfig.key };
                return '<div class="cms-array-item" data-cms-block="' + escapeHtml(blockConfig.key) + '"><h4>' + escapeHtml(blockConfig.label) + '</h4>' + blockConfig.fields.map(function (field) {
                    return renderField('blocks.' + blockConfig.key + '.' + field[0], field[1], item[field[0]], /text|title/.test(field[0]));
                }).join('') + '</div>';
            }).join('') + '</fieldset>';
        }

        function collectContentBlockBody(viewName) {
            var cached = contentBlockCache[viewName] || {};
            var form = document.getElementById('form-' + viewName);
            var body = cloneBody(cached.body_json || {});
            if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('内容结构无效，请重新加载后再试');

            if (!form) return body;

            form.querySelectorAll('[data-cms-list]').forEach(function (field) {
                var path = field.getAttribute('data-cms-list');
                var items = String(field.value || '').split(/\r?\n/).map(function (item) { return item.trim(); }).filter(Boolean);
                setPathValue(body, path, items);
            });

            form.querySelectorAll('[data-cms-field]').forEach(function (field) {
                if (field.closest('[data-cms-array-item]') || field.closest('[data-cms-block]')) return;
                var path = field.getAttribute('data-cms-field');
                setPathValue(body, path, normalizeStructuredValue(path, fieldInputValue(field)));
            });

            form.querySelectorAll('[data-cms-array]').forEach(function (arrayEl) {
                var key = arrayEl.getAttribute('data-cms-array');
                var existingItems = getPathValue(body, key);
                if (!Array.isArray(existingItems)) existingItems = [];
                var items = [];
                arrayEl.querySelectorAll('[data-cms-array-item]').forEach(function (itemEl, index) {
                    var originalIndex = parseInt(itemEl.getAttribute('data-cms-array-item'), 10);
                    var originalItem = existingItems[Number.isFinite(originalIndex) ? originalIndex : index];
                    var item = originalItem && typeof originalItem === 'object' && !Array.isArray(originalItem) ? cloneBody(originalItem) : {};
                    itemEl.querySelectorAll('[data-cms-field]').forEach(function (field) {
                        var fieldPath = field.getAttribute('data-cms-field');
                        var prefix = key + '.' + itemEl.getAttribute('data-cms-array-item') + '.';
                        var relativePath = fieldPath.indexOf(prefix) === 0 ? fieldPath.slice(prefix.length) : fieldLastKey(fieldPath);
                        setPathValue(item, relativePath, normalizeStructuredValue(relativePath, fieldInputValue(field)));
                    });
                    item.sort_order = index;
                    if (Object.keys(item).some(function (keyName) { return keyName === 'sort_order' ? false : item[keyName] !== '' && !(Array.isArray(item[keyName]) && !item[keyName].length); })) {
                        items.push(item);
                    }
                });
                setPathValue(body, key, items);
            });

            var blockEls = form.querySelectorAll('[data-cms-block]');
            if (blockEls.length) {
                var existingBlocks = Array.isArray(body.blocks) ? body.blocks : [];
                var nextBlocks = existingBlocks.filter(function (block) {
                    return block && block.key && block.key !== 'footer' && block.key !== 'home-cta';
                });
                blockEls.forEach(function (blockEl, index) {
                    var item = { key: blockEl.getAttribute('data-cms-block'), sort_order: index };
                    blockEl.querySelectorAll('[data-cms-field]').forEach(function (field) {
                        var parts = field.getAttribute('data-cms-field').split('.');
                        var key = parts.slice(2).join('.');
                        item[key] = normalizeStructuredValue(key, fieldInputValue(field));
                    });
                    nextBlocks.push(item);
                });
                body.blocks = nextBlocks;
            }

            return body;
        }

        function validateJsonFields(root) {
            var valid = true;
            root.querySelectorAll('textarea.json-field').forEach(function (field) {
                clearJsonFieldError(field);
                try {
                    var parsed = JSON.parse(field.value || '{}');
                    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                        throw new Error('JSON 必须是对象');
                    }
                } catch (err) {
                    setJsonFieldError(field, err);
                    valid = false;
                }
            });
            if (!valid) {
                var first = root.querySelector('textarea.json-field[aria-invalid="true"]');
                if (first) {
                    var parentDetails = first.closest('details');
                    while (parentDetails) {
                        parentDetails.open = true;
                        parentDetails = parentDetails.parentElement ? parentDetails.parentElement.closest('details') : null;
                    }
                    first.focus();
                }
            }
            return valid;
        }

        function setJsonFieldError(field, err) {
            if (!field) return;
            field.classList.add('input-error');
            field.setAttribute('aria-invalid', 'true');
            var msg = field.parentNode.querySelector('.json-error');
            if (!msg) return;
            msg.hidden = false;
            msg.textContent = 'JSON 解析失败：' + (err && err.message ? err.message : '格式无效');
        }

        function clearJsonFieldError(field) {
            if (!field) return;
            field.classList.remove('input-error');
            field.removeAttribute('aria-invalid');
            var msg = field.parentNode.querySelector('.json-error');
            if (msg) {
                msg.hidden = true;
                msg.textContent = '';
            }
        }

        function warnMissingCertificationIds(slug, body) {
            if (slug !== 'innovation' || !Array.isArray(body.related_certification_ids) || !body.related_certification_ids.length) {
                return Promise.resolve();
            }
            return apiRequest('/admin/certifications?page=1&pageSize=100').then(function (response) {
                var rows = unwrapListResponse(response);
                var existing = {};
                rows.forEach(function (row) { existing[row.id] = true; });
                var missing = body.related_certification_ids.filter(function (id) { return !existing[id]; });
                if (missing.length) {
                    showToast('以下证书 ID 暂未找到：' + missing.join(', '), 'error');
                }
            }).catch(function () {
                showToast('证书 ID 存在性检查失败，已继续保存', 'error');
            });
        }

        function mutateContentArray(viewName, arrayKey, action, index) {
            var block = contentBlockCache[viewName];
            if (!block) return;
            markFormDirty();
            var body = block.body_json || {};
            var items = Array.isArray(body[arrayKey]) ? body[arrayKey].slice() : [];
            if (action === 'add') items.push({});
            if (action === 'remove') items.splice(index, 1);
            if (action === 'up' && index > 0) {
                var prev = items[index - 1];
                items[index - 1] = items[index];
                items[index] = prev;
            }
            if (action === 'down' && index < items.length - 1) {
                var next = items[index + 1];
                items[index + 1] = items[index];
                items[index] = next;
            }
            body[arrayKey] = items;
            block.body_json = body;
            renderContentBlockForm(viewName, block);
        }

        function updateCmsAssetField(input, path) {
            if (!input) return;
            input.value = path || '';
            var card = input.closest ? input.closest('.cms-image-card') : null;
            var preview = card ? card.querySelector('.cms-image-preview') : null;
            if (preview) {
                preview.innerHTML = path
                    ? '<img src="' + escapeHtml(assetPreviewSrc(path)) + '" alt="图片预览">'
                    : '<span class="cms-image-empty">暂无图片</span>';
            }
            markFormDirty();
        }

        function openContentAssetPicker(viewName, inputId) {
            var input = document.getElementById(inputId);
            if (!input) return;
            var block = contentBlockCache[viewName] || {};
            openAssetPicker({
                title: '选择内容图片',
                subtitle: '选择后会自动回填当前内容字段，不需要手动复制路径。',
                module: 'content_blocks',
                entityType: 'content_block',
                entityId: block.id || '',
                onSelect: function (asset) {
                    var path = asset && asset.path ? asset.path : '';
                    updateCmsAssetField(input, path);
                    showToast('已回填内容图片');
                }
            });
        }


        function updateCmsAssetListField(input, path, clear) {
            if (!input) return;
            if (clear) {
                input.value = '';
                markFormDirty();
                return;
            }
            path = String(path || '').trim();
            if (!path) return;
            var rows = String(input.value || '').split(/\r?\n/).map(function (item) { return item.trim(); }).filter(Boolean);
            if (rows.indexOf(path) === -1) rows.push(path);
            input.value = rows.join('\n');
            markFormDirty();
        }

        function openContentAssetListPicker(viewName, inputId) {
            var input = document.getElementById(inputId);
            if (!input) return;
            var block = contentBlockCache[viewName] || {};
            openAssetPicker({
                title: '添加内容图片',
                subtitle: '选择后会追加到当前图片列表，不需要手动复制路径。',
                module: 'content_blocks',
                entityType: 'content_block',
                entityId: block.id || '',
                onSelect: function (asset) {
                    updateCmsAssetListField(input, asset && asset.path ? asset.path : '', false);
                    showToast('已追加到图片列表');
                }
            });
        }
        function bindContentBlockEvents() {
            var views = [
                'content-home',
                'content-solutions',
                'content-company-overview',
                'content-contact',
                'content-about',
                'content-product-pages',
                'content-global-shell',
                'content-technology',
                'content-industries',
                'content-education',
                'content-page-blocks'
            ];
            views.forEach(function (viewName) {
                var form = document.getElementById('form-' + viewName);
                if (form) {
                    form.addEventListener('submit', function (e) {
                        e.preventDefault();
                        saveContentBlock(viewName);
                    });
                    form.addEventListener('click', function (e) {
                        var target = e.target;
                        var educationRedirect = target.closest('[data-education-visual-redirect]');
                        if (educationRedirect) {
                            e.preventDefault();
                            openVisualDashboardTarget('education', 'hero');
                            return;
                        }
                        var langTab = target.closest('.cms-lang-tab');
                        if (langTab) {
                            var set = langTab.closest('.cms-lang-set');
                            var lang = langTab.getAttribute('data-cms-lang');
                            if (set && lang) {
                                set.querySelectorAll('.cms-lang-tab').forEach(function (tab) {
                                    tab.classList.toggle('active', tab === langTab);
                                });
                                set.querySelectorAll('.cms-lang-panel').forEach(function (panel) {
                                    panel.classList.toggle('active', panel.getAttribute('data-cms-lang-panel') === lang);
                                });
                            }
                            return;
                        }
                        var selectAsset = target.closest('[data-cms-select-asset]');
                        if (selectAsset) {
                            openContentAssetPicker(viewName, selectAsset.getAttribute('data-cms-select-asset'));
                            return;
                        }
                        var clearAsset = target.closest('[data-cms-clear-asset]');
                        if (clearAsset) {
                            updateCmsAssetField(document.getElementById(clearAsset.getAttribute('data-cms-clear-asset')), '');
                            return;
                        }
                        var selectListAsset = target.closest('[data-cms-select-list-asset]');
                        if (selectListAsset) {
                            openContentAssetListPicker(viewName, selectListAsset.getAttribute('data-cms-select-list-asset'));
                            return;
                        }
                        var clearListAsset = target.closest('[data-cms-clear-list-asset]');
                        if (clearListAsset) {
                            updateCmsAssetListField(document.getElementById(clearListAsset.getAttribute('data-cms-clear-list-asset')), '', true);
                            return;
                        }
                        if (target.classList.contains('cms-reload')) {
                            if (!confirmDiscardChanges()) return;
                            loadContentBlock(viewName);
                            return;
                        }
                        if (target.classList.contains('cms-add-item')) {
                            mutateContentArray(viewName, target.getAttribute('data-cms-add'), 'add', 0);
                            return;
                        }
                        var itemEl = target.closest('[data-cms-array-item]');
                        var arrayEl = target.closest('[data-cms-array]');
                        if (!itemEl || !arrayEl) return;
                        var index = parseInt(itemEl.getAttribute('data-cms-array-item'), 10);
                        var arrayKey = arrayEl.getAttribute('data-cms-array');
                        if (target.classList.contains('cms-remove-item')) mutateContentArray(viewName, arrayKey, 'remove', index);
                        if (target.classList.contains('cms-move-up')) mutateContentArray(viewName, arrayKey, 'up', index);
                        if (target.classList.contains('cms-move-down')) mutateContentArray(viewName, arrayKey, 'down', index);
                    });
                }
            });
        }

        function loadContentBlock(viewName) {
            var slug = contentBlockSlug(viewName);
            if (!slug) return;
            var statusEl = document.getElementById(viewName + '-status');
            if (statusEl) statusEl.textContent = '加载中...';
            apiRequest('/admin/content-blocks/' + encodeURIComponent(slug)).then(function (response) {
                var block = unwrapDataResponse(response) || {};
                contentBlockCache[viewName] = block;
                var titleEl = document.getElementById(viewName + '-title-en');
                var bodyEl = document.getElementById(viewName + '-body-json');
                if (titleEl) titleEl.value = block.title_en || '';
                if (bodyEl) bodyEl.value = JSON.stringify(block.body_json || {}, null, 2);
                renderContentBlockForm(viewName, block);
                showDraftRecovery(document.getElementById('view-' + viewName), draftKey('content', viewName), function (draft) {
                    block.body_json = draft;
                    contentBlockCache[viewName] = block;
                    renderContentBlockForm(viewName, block);
                    markFormDirty();
                });
                if (statusEl) statusEl.textContent = block.updated_at ? ('已加载：' + formatDate(block.updated_at)) : '已加载';
            }).catch(function (err) {
                if (statusEl) statusEl.textContent = '加载失败';
                showToast('加载内容块失败：' + err.message, 'error');
            });
        }

        function collectContentBlockBodyRaw(viewName) {
            return collectContentBlockBody(viewName);
        }

        function saveContentBlock(viewName) {
            var slug = contentBlockSlug(viewName);
            if (!slug) return;
            var cached = contentBlockCache[viewName] || {};
            var titleEl = document.getElementById(viewName + '-title-en');
            var statusEl = document.getElementById(viewName + '-status');
            var parsed = null;

            try {
                parsed = collectContentBlockBody(viewName);
            } catch (err) {
                showToast(err.message || '内容结构无效，请检查表单后重试', 'error');
                return;
            }

            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                showToast('内容结构无效，请检查表单后重试', 'error');
                return;
            }

            if (statusEl) statusEl.textContent = '保存中...';
            warnMissingCertificationIds(slug, parsed).then(function () {
                return apiRequest('/admin/content-blocks/' + encodeURIComponent(slug), {
                method: 'PUT',
                body: {
                    title_en: titleEl ? titleEl.value.trim() : '',
                    body_json: parsed,
                    version: cached.version
                }
                });
            }).then(function (response) {
                var block = unwrapDataResponse(response) || {};
                contentBlockCache[viewName] = block;
                if (statusEl) statusEl.textContent = '已保存：' + formatDate(block.updated_at);
                safeSessionRemove(draftKey('content', viewName));
                resetFormDirty();
                showToast('内容已保存');
            }).catch(function (err) {
                if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
                    try {
                        safeSessionSet(draftKey('content', viewName), collectContentBlockBodyRaw(viewName));
                    } catch (draftErr) {}
                    showConflictNotice('内容已被他人修改，请重新加载后再编辑', function () { loadContentBlock(viewName); });
                    if (statusEl) statusEl.textContent = '版本冲突';
                    return;
                }
                if (statusEl) statusEl.textContent = '保存失败';
                showToast('保存内容失败：' + err.message, 'error');
            });
        }

        function visualPageByKey(pageKey) {
            return VISUAL_BUILDER_PAGES.filter(function (page) { return page.key === pageKey; })[0] || VISUAL_BUILDER_PAGES[0];
        }

        function visualFindModuleByKey(modules, moduleKey) {
            for (var i = 0; i < (modules || []).length; i += 1) {
                var module = modules[i];
                if (module && module.key === moduleKey) return module;
                var child = visualFindModuleByKey(module && module.children ? module.children : [], moduleKey);
                if (child) return child;
            }
            return null;
        }

        function visualModuleByKey(page, moduleKey) {
            var modules = page && page.modules ? page.modules : [];
            return visualFindModuleByKey(modules, moduleKey) || modules[0];
        }

        function visualLanguageByKey(languageKey) {
            return VISUAL_BUILDER_LANGUAGES.filter(function (language) { return language.key === languageKey; })[0] || VISUAL_BUILDER_LANGUAGES[0];
        }

        function visualActiveLanguage() {
            return visualLanguageByKey(visualBuilderState.activeLanguage);
        }

        function visualIsDefaultLanguage() {
            return visualActiveLanguage().key === 'default';
        }

        function visualIsArabicLanguage() {
            return visualActiveLanguage().key === 'ar';
        }

        function visualLanguageSuffix() {
            return visualActiveLanguage().suffix || '';
        }

        function visualLanguageCode() {
            return visualActiveLanguage().code || 'en';
        }

        function visualLanguageDir() {
            return visualActiveLanguage().dir || 'ltr';
        }

        function visualFieldSupportsLanguage(field) {
            if (!field) return false;
            if (field.localized === true) return true;
            if (field.localized === false) return false;
            if (field.type === 'textarea' || field.type === 'list') return true;
            if (field.type !== 'text') return false;
            var key = fieldLastKey(field.key).toLowerCase();
            if (/^(href|url|email|phone|tel|class|classname|icon|image|logo|backgroundimage|mapqr|icp|date|year)$/.test(key)) return false;
            if (/url|href|email|phone|tel|class|image|logo|background|icon|qr|map|icp|date|year|sort|order|count|number|value|zoom|lat|lng|longitude|latitude/i.test(key)) return false;
            return true;
        }

        function visualLanguageFieldKey(field) {
            var key = field && field.key ? field.key : '';
            var suffix = visualLanguageSuffix();
            if (visualIsDefaultLanguage() || !suffix || !visualFieldSupportsLanguage(field)) return key;
            if (field.localizedKeyByLanguage && field.localizedKeyByLanguage[visualActiveLanguage().key]) {
                return field.localizedKeyByLanguage[visualActiveLanguage().key];
            }
            if (field[visualActiveLanguage().key + 'Key']) return field[visualActiveLanguage().key + 'Key'];
            var parts = key.split('.');
            var last = parts.pop();
            parts.push(last + suffix);
            return parts.join('.');
        }

        function visualLanguageFieldLabel(field, path) {
            var label = (field && field.label) || path;
            if (!visualIsDefaultLanguage() && visualFieldSupportsLanguage(field)) {
                return label + '（' + (visualActiveLanguage().fieldLabel || visualActiveLanguage().label) + '）';
            }
            return label;
        }

        function visualArrayItemTitle(item, module, index) {
            if (!item) return (module.itemLabel || '项目') + ' ' + (index + 1);
            var suffix = visualLanguageSuffix();
            var keys = suffix ? ['title' + suffix, 'label' + suffix, 'title', 'label', 'year', 'date', 'value', 'href'] : ['title', 'label', 'year', 'date', 'value', 'href'];
            for (var i = 0; i < keys.length; i += 1) {
                if (item[keys[i]]) return item[keys[i]];
            }
            return (module.itemLabel || '项目') + ' ' + (index + 1);
        }

        function cacheCurrentVisualDraft() {
            var page = visualPageByKey(visualBuilderState.activePage);
            var module = visualModuleByKey(page, visualBuilderState.activeModule);
            if (!page || !module || !visualBuilderState.blocks[page.slug]) return;
            visualBuilderState.blocks[page.slug].body_json = collectVisualBody(page, module);
        }

        function renderVisualLanguageSwitch() {
            return '<div class="visual-language-switcher" role="group" aria-label="编辑语言">' +
                VISUAL_BUILDER_LANGUAGES.map(function (language) {
                    return '<button type="button" class="visual-language-btn" data-visual-language="' + escapeHtml(language.key) + '" aria-pressed="false"><span>' + escapeHtml(language.shortLabel) + '</span>' + escapeHtml(language.label) + '</button>';
                }).join('') +
            '</div>';
        }

        function syncVisualLanguageSwitch() {
            document.querySelectorAll('[data-visual-language]').forEach(function (button) {
                var active = button.getAttribute('data-visual-language') === visualBuilderState.activeLanguage;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }

        function selectVisualModule(pageKey, moduleKey, options) {
            options = options || {};
            var page = visualPageByKey(pageKey);
            var module = visualModuleByKey(page, moduleKey);
            if (!page || !module) return false;
            var sameTarget = visualBuilderState.activePage === page.key && visualBuilderState.activeModule === module.key;
            if (!sameTarget && !options.skipDirtyCheck && !confirmDiscardChanges()) return false;
            visualBuilderState.activePage = page.key;
            visualBuilderState.activeModule = module.key;
            syncVisualNavActive();
            if (currentView === 'visual-builder') loadVisualBuilder();
            return true;
        }

        function syncVisualNavActive() {
            document.querySelectorAll('[data-visual-nav-page]').forEach(function (link) {
                var active = link.getAttribute('data-visual-nav-page') === visualBuilderState.activePage &&
                    link.getAttribute('data-visual-nav-module') === visualBuilderState.activeModule;
                link.classList.toggle('active', active && currentView === 'visual-builder');
            });
            document.querySelectorAll('.visual-nav-page').forEach(function (pageEl) {
                var pageKey = pageEl.querySelector('[data-visual-page-toggle]');
                var activePage = pageKey && pageKey.getAttribute('data-visual-page-toggle') === visualBuilderState.activePage;
                pageEl.classList.toggle('active', activePage && currentView === 'visual-builder');
                if (activePage && currentView === 'visual-builder') {
                    pageEl.classList.remove('is-collapsed');
                    pageKey.setAttribute('aria-expanded', 'true');
                }
            });
        }

        function visualModulePath(module, body, options) {
            options = options || {};
            if (!module) return '';
            if ((module.sectionId || module.sectionTitle) && body) {
                if (!Array.isArray(body.sections)) {
                    if (!options.createMissing) return module.path || '';
                    body.sections = [];
                }
                var sectionIndex = -1;
                body.sections.forEach(function (section, index) {
                    if (sectionIndex !== -1 || !section) return;
                    if (module.sectionId && section.id === module.sectionId) sectionIndex = index;
                    if (sectionIndex === -1 && module.sectionTitle && section.title === module.sectionTitle) sectionIndex = index;
                });
                if (sectionIndex === -1 && options.createMissing) {
                    body.sections.push({
                        id: module.sectionId || '',
                        title: module.sectionTitle || ''
                    });
                    sectionIndex = body.sections.length - 1;
                }
                if (sectionIndex !== -1) {
                    return 'sections.' + sectionIndex + (module.sectionPath ? '.' + module.sectionPath : '');
                }
            }
            return module.path || '';
        }

        function visualPath(module, key, body, options) {
            var basePath = visualModulePath(module, body, options);
            if (!basePath) return key;
            if (!key) return basePath;
            return basePath + '.' + key;
        }

        function visualUsesPatchFields() {
            var key = visualActiveLanguage().key;
            return key === 'fr' || key === 'ru';
        }

        function visualCanChangeArrayStructure(module) {
            return !!module && module.allowStructureChanges !== false && !visualUsesPatchFields();
        }

        function visualPatchSuffix() {
            return 'Patch' + visualLanguageSuffix();
        }

        function visualPatchCollectionKey(baseKey) {
            return String(baseKey || '') + visualPatchSuffix();
        }

        function visualPathParent(path) {
            var parts = String(path || '').split('.').filter(Boolean);
            parts.pop();
            return parts.join('.');
        }

        function visualPathLast(path) {
            var parts = String(path || '').split('.').filter(Boolean);
            return parts[parts.length - 1] || '';
        }

        function visualJoinPath() {
            return Array.prototype.slice.call(arguments).filter(Boolean).join('.');
        }

        function visualSectionTargetKey(module, body) {
            if (!module || !(module.sectionId || module.sectionTitle || /^sections\./.test(String(module.path || '')))) return '';
            if (module.sectionId) return module.sectionId;
            var modulePath = visualModulePath(module, body, { createMissing: false }) || module.path || '';
            var match = /^sections\.(\d+)/.exec(modulePath);
            return match ? 'index_' + match[1] : '';
        }

        function visualSectionPatchBasePath(module, body) {
            var targetKey = visualSectionTargetKey(module, body);
            if (!targetKey) return '';
            var basePath = visualJoinPath(visualPatchCollectionKey('sections'), targetKey);
            var sectionPathParent = visualPathParent(module.sectionPath || '');
            return visualJoinPath(basePath, sectionPathParent);
        }

        function visualLocalizedFieldKey(field) {
            return visualLanguageFieldKey(field);
        }

        function visualLocalizedModuleFieldPath(module, field, body) {
            var fieldKey = visualLocalizedFieldKey(field);
            if (!visualUsesPatchFields() || !visualFieldSupportsLanguage(field)) {
                return visualPath(module, fieldKey, body, { createMissing: true });
            }
            var sectionPatchBase = visualSectionPatchBasePath(module, body);
            if (sectionPatchBase) return visualJoinPath(sectionPatchBase, fieldKey);
            return visualPath(module, fieldKey, body, { createMissing: true });
        }

        function visualLocalizedArrayFieldPath(module, field, body, index) {
            var fieldKey = visualLocalizedFieldKey(field);
            var arrayPath = visualModulePath(module, body, { createMissing: true });
            if (!visualUsesPatchFields() || !visualFieldSupportsLanguage(field)) {
                return visualJoinPath(arrayPath, String(index), fieldKey);
            }
            var arrayKey = visualPathLast(arrayPath);
            var patchKey = visualPatchCollectionKey(arrayKey);
            var sectionPatchBase = visualSectionPatchBasePath(module, body);
            if (sectionPatchBase) {
                return visualJoinPath(sectionPatchBase, patchKey, 'index_' + index, fieldKey);
            }
            return visualJoinPath(visualPathParent(arrayPath), patchKey, 'index_' + index, fieldKey);
        }

        function visualFirstPathValue(body, paths) {
            for (var i = 0; i < paths.length; i += 1) {
                if (hasPathValue(body, paths[i])) return getPathValue(body, paths[i]);
            }
            return '';
        }

        function visualFieldId(path) {
            return 'visual-field-' + String(path || '').replace(/[^a-zA-Z0-9_-]/g, '-');
        }

        function visualAssetSrc(path) {
            path = String(path || '').trim();
            if (!path) return '';
            if (/^(https?:)?\/\//i.test(path) || path.charAt(0) === '/' || /^data:/i.test(path)) return path;
            return '../' + path.replace(/^\/+/, '');
        }

        function visualFieldValue(block, module, field) {
            var body = block && block.body_json ? block.body_json : {};
            var primaryPath = visualLocalizedModuleFieldPath(module, field, body);
            var legacyPath = visualPath(module, visualLanguageFieldKey(field), body);
            return visualFirstPathValue(body, [primaryPath, legacyPath]);
        }

        function visualNewArrayItem(module) {
            var item = {};
            (module.fields || []).forEach(function (field) {
                setPathValue(item, visualLanguageFieldKey(field), field.type === 'toggle' ? true : ((field.type === 'list' || field.type === 'image-grid') ? [] : ''));
            });
            return item;
        }

        function visualNormalizeImageList(value, maxItems) {
            var items = [];
            if (Array.isArray(value)) {
                items = value;
            } else if (typeof value === 'string') {
                var text = value.trim();
                if (text.charAt(0) === '[') {
                    try {
                        var parsed = JSON.parse(text);
                        if (Array.isArray(parsed)) items = parsed;
                    } catch (err) {
                        items = [];
                    }
                }
                if (!items.length && text) items = text.split(/\r?\n/);
            }
            items = items.map(function (item) {
                return String(item == null ? '' : item).trim();
            }).filter(Boolean);
            maxItems = parseInt(maxItems, 10) || 9;
            return maxItems > 0 ? items.slice(0, maxItems) : items;
        }

        function renderVisualImageGridTiles(fieldId, images, maxItems) {
            var tiles = images.map(function (path, index) {
                var preview = path
                    ? '<img src="' + escapeHtml(visualAssetSrc(path)) + '" alt="图片资料 ' + escapeHtml(index + 1) + '">'
                    : '<span>未选择图片</span>';
                return '<article class="visual-image-tile visual-image-tile-filled" data-visual-image-index="' + index + '">' +
                    '<div class="visual-image-tile-preview">' + preview + '</div>' +
                    '<div class="visual-image-tile-meta"><strong>图片 ' + (index + 1) + '</strong><span title="' + escapeHtml(path) + '">' + escapeHtml(path || '未选择') + '</span></div>' +
                    '<div class="visual-image-tile-actions">' +
                        '<button type="button" class="btn btn-secondary btn-sm" title="从资源库选择图片替换当前图片" data-visual-image-action="select" data-visual-image-field="' + escapeHtml(fieldId) + '" data-visual-image-index="' + index + '">资源库替换</button>' +
                        '<button type="button" class="btn btn-secondary btn-sm" title="从本地上传新图片替换当前图片" data-visual-image-action="upload" data-visual-image-field="' + escapeHtml(fieldId) + '" data-visual-image-index="' + index + '">上传替换</button>' +
                        '<button type="button" class="btn btn-secondary btn-sm visual-image-order-btn" title="上移" data-visual-image-action="up" data-visual-image-field="' + escapeHtml(fieldId) + '" data-visual-image-index="' + index + '"' + (index <= 0 ? ' disabled' : '') + '>上移</button>' +
                        '<button type="button" class="btn btn-secondary btn-sm visual-image-order-btn" title="下移" data-visual-image-action="down" data-visual-image-field="' + escapeHtml(fieldId) + '" data-visual-image-index="' + index + '"' + (index >= images.length - 1 ? ' disabled' : '') + '>下移</button>' +
                        '<button type="button" class="btn btn-danger btn-sm" title="从当前图片资料中删除" data-visual-image-action="remove" data-visual-image-field="' + escapeHtml(fieldId) + '" data-visual-image-index="' + index + '">删除</button>' +
                    '</div>' +
                '</article>';
            });
            if (images.length < maxItems) {
                tiles.push('<button type="button" class="visual-image-tile visual-image-tile-add" data-visual-image-action="select" data-visual-image-field="' + escapeHtml(fieldId) + '" data-visual-image-index="' + images.length + '">' +
                    '<span>+</span><strong>添加图片</strong><small>从资源库选择，或在弹窗中本地上传</small>' +
                '</button>');
            }
            return tiles.join('');
        }

        function renderVisualImageGridField(field, path, value) {
            var id = visualFieldId(path);
            var label = visualLanguageFieldLabel(field, path);
            var maxItems = parseInt(field.maxItems, 10) || 9;
            var images = visualNormalizeImageList(value, maxItems);
            var help = field.help || ('最多可选择 ' + maxItems + ' 张图片，支持资源库选择、本地上传、预览、删除和排序。');
            return '<div class="visual-field visual-image-grid-field">' +
                '<label>' + escapeHtml(label) + '</label>' +
                '<div class="visual-image-grid-card" data-visual-image-grid-card="' + escapeHtml(id) + '">' +
                    '<div class="visual-image-grid-head"><span>已选择 <strong data-visual-image-count="' + escapeHtml(id) + '">' + images.length + '</strong> / ' + maxItems + ' 张</span><button type="button" class="btn btn-secondary btn-sm" title="' + (images.length >= maxItems ? '已达到数量上限，请先删除一张后再新增；已有图片仍可单独替换。' : '从本地上传并新增一张图片') + '" data-visual-image-action="upload" data-visual-image-field="' + escapeHtml(id) + '" data-visual-image-index="' + images.length + '"' + (images.length >= maxItems ? ' disabled' : '') + '>' + (images.length >= maxItems ? '已达上限' : '本地上传新增') + '</button></div>' +
                    '<input type="hidden" id="' + escapeHtml(id) + '" data-visual-field="' + escapeHtml(path) + '" data-visual-field-type="image-grid" data-visual-image-grid-max="' + maxItems + '" value="' + escapeHtml(JSON.stringify(images)) + '">' +
                    '<div class="visual-image-grid" data-visual-image-grid="' + escapeHtml(id) + '">' + renderVisualImageGridTiles(id, images, maxItems) + '</div>' +
                    '<small class="visual-image-grid-help">' + escapeHtml(help) + '</small>' +
                '</div>' +
            '</div>';
        }

        function getVisualImageGridInput(fieldId) {
            return document.getElementById(fieldId);
        }

        function getVisualImageGridItems(fieldId) {
            var input = getVisualImageGridInput(fieldId);
            if (!input) return [];
            return visualNormalizeImageList(input.value, input.getAttribute('data-visual-image-grid-max'));
        }

        function setVisualImageGridItems(fieldId, items) {
            var input = getVisualImageGridInput(fieldId);
            if (!input) return;
            var maxItems = parseInt(input.getAttribute('data-visual-image-grid-max'), 10) || 9;
            var images = visualNormalizeImageList(items, maxItems);
            input.value = JSON.stringify(images);
            var grid = document.querySelector('[data-visual-image-grid="' + fieldId + '"]');
            if (grid) grid.innerHTML = renderVisualImageGridTiles(fieldId, images, maxItems);
            var count = document.querySelector('[data-visual-image-count="' + fieldId + '"]');
            if (count) count.textContent = images.length;
            var uploadBtn = document.querySelector('[data-visual-image-grid-card="' + fieldId + '"] .visual-image-grid-head [data-visual-image-action="upload"]');
            if (uploadBtn) {
                uploadBtn.disabled = images.length >= maxItems;
                uploadBtn.setAttribute('data-visual-image-index', images.length);
            }
            markFormDirty();
        }

        function updateVisualImageGridItem(fieldId, index, path) {
            var input = getVisualImageGridInput(fieldId);
            if (!input) return;
            var maxItems = parseInt(input.getAttribute('data-visual-image-grid-max'), 10) || 9;
            var images = getVisualImageGridItems(fieldId);
            index = parseInt(index, 10);
            if (!Number.isFinite(index) || index < 0) index = images.length;
            if (index >= maxItems) {
                showToast('图片资料最多只能上传 ' + maxItems + ' 张', 'error');
                return;
            }
            if (path) images[index] = path;
            setVisualImageGridItems(fieldId, images);
        }

        function removeVisualImageGridItem(fieldId, index) {
            var images = getVisualImageGridItems(fieldId);
            index = parseInt(index, 10);
            if (!Number.isFinite(index) || index < 0 || index >= images.length) return;
            images.splice(index, 1);
            setVisualImageGridItems(fieldId, images);
        }

        function moveVisualImageGridItem(fieldId, index, direction) {
            var images = getVisualImageGridItems(fieldId);
            index = parseInt(index, 10);
            var nextIndex = direction === 'up' ? index - 1 : index + 1;
            if (!Number.isFinite(index) || nextIndex < 0 || nextIndex >= images.length) return;
            var current = images[index];
            images[index] = images[nextIndex];
            images[nextIndex] = current;
            setVisualImageGridItems(fieldId, images);
        }

        function openVisualImageGridAssetPicker(fieldId, index) {
            openAssetPicker({
                title: '选择教育合作图片',
                subtitle: '从资源库选择图片，或在弹窗中本地上传后直接使用。',
                module: 'visual_builder',
                entityType: 'content_block',
                entityId: 'education',
                onSelect: function (asset) {
                    updateVisualImageGridItem(fieldId, index, asset && asset.path ? asset.path : '');
                    showToast('已选择图片资料');
                }
            });
        }

        function uploadVisualImageGridFile(fieldId, index, file) {
            if (!file) return;
            uploadAdminAssetFile(file, {
                module: 'visual_builder',
                entity_type: 'content_block',
                entity_id: 'education'
            }).then(function (response) {
                var asset = unwrapDataResponse(response) || response;
                updateVisualImageGridItem(fieldId, index, asset && asset.path ? asset.path : '');
                showToast(asset && asset.reused ? '资源库已有相同图片，已直接使用' : '图片已上传并加入资源库');
            }).catch(function (err) {
                showToast('上传失败：' + err.message, 'error');
            });
        }

        function openVisualImageGridUpload(fieldId, index) {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/png,image/webp,image/gif';
            input.addEventListener('change', function () {
                uploadVisualImageGridFile(fieldId, index, input.files && input.files[0]);
            });
            input.click();
        }
        function renderVisualField(field, path, value) {
            var id = visualFieldId(path);
            var label = visualLanguageFieldLabel(field, path);
            var valueText = Array.isArray(value) ? value.join('\n') : (value == null ? '' : String(value));
            var languageAttrs = !visualIsDefaultLanguage() && visualFieldSupportsLanguage(field)
                ? ' lang="' + escapeHtml(visualLanguageCode()) + '"' + (visualLanguageDir() === 'rtl' ? ' dir="rtl"' : '')
                : '';
            if (field.type === 'toggle') {
                return '<label class="visual-switch-field"><input type="checkbox" data-visual-field="' + escapeHtml(path) + '"' + (value !== false ? ' checked' : '') + '><span></span><strong>' + escapeHtml(label) + '</strong></label>';
            }
            if (field.type === 'asset') {
                var preview = valueText
                    ? '<img src="' + escapeHtml(visualAssetSrc(valueText)) + '" alt="' + escapeHtml(label) + '预览">'
                    : '<span>未选择图片</span>';
                var dimensionAttrs = field.syncDimensions
                    ? ' data-visual-sync-dimensions="true" data-visual-dimension-state="idle"'
                    : '';
                var dimensionStatus = field.syncDimensions
                    ? '<small class="visual-asset-dimension-status" data-visual-dimension-status="' + escapeHtml(id) + '">更换图片时会自动读取并保存天然宽高。</small>'
                    : '';
                return '<div class="visual-field visual-asset-field">' +
                    '<label>' + escapeHtml(label) + '</label>' +
                    '<div class="visual-asset-card" data-visual-asset-card="' + escapeHtml(id) + '">' +
                        '<div class="visual-asset-preview">' + preview + '</div>' +
                        '<input type="hidden" id="' + escapeHtml(id) + '" data-visual-field="' + escapeHtml(path) + '" value="' + escapeHtml(valueText) + '"' + dimensionAttrs + '>' +
                        '<div class="visual-asset-actions">' +
                            '<button type="button" class="btn btn-secondary btn-sm" data-visual-select-asset="' + escapeHtml(id) + '">选择图片</button>' +
                            '<button type="button" class="btn btn-secondary btn-sm" data-visual-clear-asset="' + escapeHtml(id) + '">清除</button>' +
                        '</div>' +
                        '<small class="visual-asset-path">' + escapeHtml(valueText || '图片会从资源库选择') + '</small>' +
                        dimensionStatus +
                    '</div>' +
                '</div>';
            }
            if (field.type === 'list') {
                return '<div class="visual-field"><label for="' + escapeHtml(id) + '">' + escapeHtml(label) + '</label><textarea id="' + escapeHtml(id) + '" data-visual-field="' + escapeHtml(path) + '" data-visual-field-type="list" rows="6"' + languageAttrs + '>' + escapeHtml(valueText) + '</textarea><small>每行填写一项，保存后会自动转换为前台列表。</small></div>';
            }
            if (field.type === 'image-grid') {
                return renderVisualImageGridField(field, path, value);
            }
            if (field.type === 'textarea') {
                return '<div class="visual-field"><label for="' + escapeHtml(id) + '">' + escapeHtml(label) + '</label><textarea id="' + escapeHtml(id) + '" data-visual-field="' + escapeHtml(path) + '" rows="4"' + languageAttrs + '>' + escapeHtml(valueText) + '</textarea></div>';
            }
            var type = field.type === 'email' ? 'email' : (field.type === 'url' ? 'url' : 'text');
            return '<div class="visual-field"><label for="' + escapeHtml(id) + '">' + escapeHtml(label) + '</label><input id="' + escapeHtml(id) + '" data-visual-field="' + escapeHtml(path) + '" type="' + escapeHtml(type) + '" value="' + escapeHtml(valueText) + '"' + languageAttrs + '></div>';
        }

        function renderVisualArrayEditor(page, module, block) {
            var body = block && block.body_json ? block.body_json : {};
            var arrayPath = visualModulePath(module, body, { createMissing: true });
            var items = getPathValue(body, arrayPath);
            if (!Array.isArray(items)) items = [];
            var canChangeStructure = visualCanChangeArrayStructure(module);
            var structureLockHelp = module.allowStructureChanges === false
                ? (module.structureLockHelp || '当前列表结构与多语言内容绑定，暂不允许新增、删除或排序。')
                : '当前语言只编辑已有项目的本地化字段，不调整数组结构。';
            var structureAction = canChangeStructure
                ? '<button type="button" class="btn btn-secondary btn-sm" data-visual-array-action="add" data-page="' + escapeHtml(page.key) + '" data-module="' + escapeHtml(module.key) + '">新增' + escapeHtml(module.itemLabel || '项目') + '</button>'
                : '<small>' + escapeHtml(structureLockHelp) + '</small>';
            return '<div class="visual-array-editor" data-visual-array="' + escapeHtml(arrayPath) + '">' +
                '<div class="visual-array-head"><span>共 ' + items.length + ' 项</span>' + structureAction + '</div>' +
                '<div class="visual-array-list">' + items.map(function (item, index) {
                    var title = visualArrayItemTitle(item, module, index);
                    var itemActions = canChangeStructure
                        ? '<span>' +
                            '<button type="button" class="btn btn-secondary btn-sm" data-visual-array-action="up" data-page="' + escapeHtml(page.key) + '" data-module="' + escapeHtml(module.key) + '" data-index="' + index + '">上移</button>' +
                            '<button type="button" class="btn btn-secondary btn-sm" data-visual-array-action="down" data-page="' + escapeHtml(page.key) + '" data-module="' + escapeHtml(module.key) + '" data-index="' + index + '">下移</button>' +
                            '<button type="button" class="btn btn-danger btn-sm" data-visual-array-action="remove" data-page="' + escapeHtml(page.key) + '" data-module="' + escapeHtml(module.key) + '" data-index="' + index + '">删除</button>' +
                        '</span>'
                        : '<span><small>结构锁定</small></span>';
                    return '<details class="visual-array-item" open data-visual-array-item="' + index + '">' +
                        '<summary><strong>' + escapeHtml(title) + '</strong>' + itemActions + '</summary>' +
                        '<div class="visual-array-body">' + (module.fields || []).map(function (field) {
                            var fieldPath = visualLocalizedArrayFieldPath(module, field, body, index);
                            var legacyFieldPath = arrayPath + '.' + index + '.' + visualLanguageFieldKey(field);
                            return renderVisualField(field, fieldPath, visualFirstPathValue(body, [fieldPath, legacyFieldPath]));
                        }).join('') + '</div>' +
                    '</details>';
                }).join('') + '</div>' +
            '</div>';
        }

        function renderVisualModuleFields(page, module, block) {
            if (module.array) return renderVisualArrayEditor(page, module, block);
            return '<div class="visual-field-grid">' + (module.fields || []).map(function (field) {
                var blockBody = block && block.body_json ? block.body_json : {};
                var path = visualLocalizedModuleFieldPath(module, field, blockBody);
                var legacyPath = visualPath(module, visualLanguageFieldKey(field), blockBody, { createMissing: true });
                return renderVisualField(field, path, visualFirstPathValue(blockBody, [path, legacyPath]));
            }).join('') + '</div>';
        }

        function renderVisualSubmodule(page, module, block, isPrimary) {
            var hasFields = module.array || (module.fields && module.fields.length);
            if (!hasFields) return '';
            return '<section class="visual-submodule-section' + (isPrimary ? ' is-primary' : '') + '">' +
                '<h4>' + escapeHtml(module.label) + '</h4>' +
                renderVisualModuleFields(page, module, block) +
            '</section>';
        }

        function renderVisualModuleEditor(page, module, block) {
            if (!block) {
                return '<div class="visual-empty-panel">正在加载内容块...</div>';
            }
            var header = '<div class="visual-editor-header"><div><span>' + escapeHtml(page.label) + '</span><h3>' + escapeHtml(module.label) + '</h3></div><button type="button" class="btn btn-primary" data-visual-save>保存修改</button></div>';
            var sections = [];
            sections.push(renderVisualSubmodule(page, module, block, true));
            (module.children || []).forEach(function (child) {
                sections.push(renderVisualSubmodule(page, child, block, false));
            });
            var body = module.children && module.children.length
                ? '<div class="visual-composite-editor">' + sections.join('') + '</div>'
                : renderVisualModuleFields(page, module, block);
            var language = visualActiveLanguage();
            var languageNote = !visualIsDefaultLanguage() ? '<span>图片、链接、开关为所有语言共用字段</span>' : '';
            var meta = '<div class="visual-editor-meta"><span>数据源：' + escapeHtml(block.slug || page.slug) + '</span><span>编辑语言：' + escapeHtml(language.label) + '</span><span>版本：v' + escapeHtml(block.version || 1) + '</span><span id="visual-save-status">' + (block.updated_at ? '已加载：' + escapeHtml(formatDate(block.updated_at)) : '已加载') + '</span>' + languageNote + '</div>';
            return header + meta + body;
        }

        function renderVisualTree() {
            return VISUAL_BUILDER_PAGES.map(function (page) {
                var activePage = page.key === visualBuilderState.activePage;
                return '<div class="visual-tree-page' + (activePage ? ' active' : '') + '">' +
                    '<button type="button" class="visual-tree-page-btn" data-visual-page="' + escapeHtml(page.key) + '">' + escapeHtml(page.label) + '</button>' +
                    '<div class="visual-tree-modules">' + (page.modules || []).map(function (module) {
                        var activeModule = activePage && module.key === visualBuilderState.activeModule;
                        return '<button type="button" class="visual-tree-module' + (activeModule ? ' active' : '') + '" data-visual-page="' + escapeHtml(page.key) + '" data-visual-module="' + escapeHtml(module.key) + '">' + escapeHtml(module.label) + '</button>';
                    }).join('') + '</div>' +
                '</div>';
            }).join('');
        }

        function renderVisualBuilderShell() {
            var root = document.getElementById('visual-builder-root');
            if (!root) return;
            root.innerHTML =
                '<div class="visual-builder-shell">' +
                    '<main class="visual-preview-panel">' +
                        '<div class="visual-preview-toolbar"><div><strong id="visual-preview-title"></strong><span id="visual-preview-subtitle"></span></div><div class="visual-preview-actions">' + renderVisualLanguageSwitch() + '<button type="button" class="btn btn-secondary btn-sm" data-visual-refresh-preview>刷新预览</button></div></div>' +
                        '<div class="visual-preview-note" id="visual-preview-note">选择左侧可视化模块后，预览会自动定位到对应区块。</div>' +
                        '<div class="visual-preview-frame-wrap"><iframe id="visual-preview-frame" title="前台页面预览"></iframe></div>' +
                    '</main>' +
                    '<aside class="visual-editor-panel"><div id="visual-editor-content" class="visual-editor-content"></div></aside>' +
                '</div>' +
                '<div class="visual-asset-picker" id="visual-asset-picker" hidden><div class="visual-asset-picker-head"><div><strong>选择图片</strong><span>从资源库选择一张图片用于当前字段</span></div><button type="button" class="modal-close" data-visual-close-assets>×</button></div><div class="visual-asset-picker-grid" id="visual-asset-picker-grid"><div class="content-editor-loading">正在加载资源...</div></div></div>';
            visualBuilderState.initialized = true;
        }

        function renderVisualBuilder() {
            var page = visualPageByKey(visualBuilderState.activePage);
            var module = visualModuleByKey(page, visualBuilderState.activeModule);
            if (!module) return;
            visualBuilderState.activeModule = module.key;
            var block = visualBuilderState.blocks[page.slug];
            var editor = document.getElementById('visual-editor-content');
            var title = document.getElementById('visual-preview-title');
            var subtitle = document.getElementById('visual-preview-subtitle');
            var language = visualActiveLanguage();
            if (editor) editor.innerHTML = renderVisualModuleEditor(page, module, block);
            if (title) title.textContent = page.label + ' / ' + module.label + ' / ' + language.label;
            if (subtitle) subtitle.textContent = '当前编辑' + language.label + '字段；修改会保存到 ' + page.slug + ' 内容块，并同步影响对应前台页面。';
            syncVisualNavActive();
            syncVisualLanguageSwitch();
            refreshVisualPreview(false);
        }

        function visualLanguageFromPath(pathname) {
            var normalized = String(pathname || '').replace(/\\/g, '/');
            for (var i = 0; i < VISUAL_BUILDER_LANGUAGES.length; i += 1) {
                var language = VISUAL_BUILDER_LANGUAGES[i];
                if (!language.code || language.key === 'default') continue;
                if (new RegExp('(^|/)' + language.code + '(/|$)').test(normalized)) return language.key;
            }
            return 'default';
        }

        function visualPreviewUrl(page, module) {
            var baseUrl = (module && module.previewUrl) || (page && page.previewUrl) || '../index.html';
            var language = visualActiveLanguage();
            if (language.key === 'default') return baseUrl;
            var hash = '';
            var query = '';
            var path = baseUrl;
            var hashIndex = path.indexOf('#');
            if (hashIndex !== -1) {
                hash = path.slice(hashIndex);
                path = path.slice(0, hashIndex);
            }
            var queryIndex = path.indexOf('?');
            if (queryIndex !== -1) {
                query = path.slice(queryIndex);
                path = path.slice(0, queryIndex);
            }
            if (/^(https?:)?\/\//i.test(path)) return baseUrl;
            path = path.replace(/^(\.\.\/)?(ar|fr|ru)\//i, '');
            path = path.replace(/^\.\.\//, '');
            path = '../' + language.code + '/' + path;
            return path + query + hash;
        }

        function syncVisualLanguageFromPreview(frame) {
            try {
                var pathname = frame.contentWindow && frame.contentWindow.location && frame.contentWindow.location.pathname;
                if (!pathname) return false;
                var nextLanguage = visualLanguageFromPath(pathname);
                if (nextLanguage === visualBuilderState.activeLanguage) return false;
                cacheCurrentVisualDraft();
                visualBuilderState.activeLanguage = nextLanguage;
                renderVisualBuilder();
                return true;
            } catch (err) {
                return false;
            }
        }

        function setVisualPreviewNote(message, tone) {
            var note = document.getElementById('visual-preview-note');
            if (!note) return;
            note.textContent = message || '';
            note.classList.toggle('warning', tone === 'warning');
        }

        function refreshVisualPreview(force) {
            var page = visualPageByKey(visualBuilderState.activePage);
            var module = visualModuleByKey(page, visualBuilderState.activeModule);
            var frame = document.getElementById('visual-preview-frame');
            if (!frame || !page) return;
            var baseUrl = visualPreviewUrl(page, module);
            var src = baseUrl + (baseUrl.indexOf('?') === -1 ? '?' : '&') + 'visualPreview=' + Date.now();
            var currentUrl = frame.getAttribute('data-visual-url');
            frame.onload = function () {
                if (syncVisualLanguageFromPreview(frame)) return;
                scrollVisualPreviewToModule(module);
            };
            if (force || currentUrl !== baseUrl) {
                frame.setAttribute('data-visual-page', page.key);
                frame.setAttribute('data-visual-language', visualBuilderState.activeLanguage);
                frame.setAttribute('data-visual-url', baseUrl);
                frame.setAttribute('src', src);
            } else {
                scrollVisualPreviewToModule(module);
            }
        }

        function scrollVisualPreviewToModule(module) {
            var frame = document.getElementById('visual-preview-frame');
            if (!frame || !module) return;
            if (!module.previewSelector) {
                setVisualPreviewNote('当前模块没有可定位的前台区块，可直接在右侧编辑字段。');
                return;
            }
            try {
                var doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
                if (!doc) {
                    setVisualPreviewNote('预览页面暂未加载完成。', 'warning');
                    return;
                }
                var style = doc.getElementById('visual-preview-highlight-style');
                if (!style) {
                    style = doc.createElement('style');
                    style.id = 'visual-preview-highlight-style';
                    style.textContent = '.visual-preview-highlight{outline:3px solid #0b66d8!important;box-shadow:0 0 0 8px rgba(11,102,216,.16)!important;transition:outline .2s ease,box-shadow .2s ease;}';
                    doc.head.appendChild(style);
                }
                var target = doc.querySelector(module.previewSelector);
                if (!target) {
                    setVisualPreviewNote('当前模块暂无可定位预览区域，字段仍可正常编辑。', 'warning');
                    return;
                }
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.classList.add('visual-preview-highlight');
                setVisualPreviewNote('已定位到“' + module.label + '”对应的前台区块。');
                setTimeout(function () {
                    target.classList.remove('visual-preview-highlight');
                }, 1800);
            } catch (err) {
                setVisualPreviewNote('预览页面无法定位该模块，字段仍可正常编辑。', 'warning');
            }
        }

        function loadVisualBuilder() {
            if (!visualBuilderState.initialized) renderVisualBuilderShell();
            var page = visualPageByKey(visualBuilderState.activePage);
            if (!page) return;
            if (visualBuilderState.blocks[page.slug]) {
                renderVisualBuilder();
                return;
            }
            var editor = document.getElementById('visual-editor-content');
            if (editor) editor.innerHTML = '<div class="content-editor-loading">正在加载内容块...</div>';
            apiRequest('/admin/content-blocks/' + encodeURIComponent(page.slug)).then(function (response) {
                visualBuilderState.blocks[page.slug] = unwrapDataResponse(response) || {};
                renderVisualBuilder();
            }).catch(function (err) {
                if (editor) editor.innerHTML = '<div class="visual-empty-panel">加载失败：' + escapeHtml(err.message) + '</div>';
                showToast('加载可视化内容失败：' + err.message, 'error');
            });
        }

        function visualArrayModules(module) {
            var modules = [];
            if (!module) return modules;
            if (module.array) modules.push(module);
            (module.children || []).forEach(function (child) {
                modules = modules.concat(visualArrayModules(child));
            });
            return modules;
        }

        function visualAssetDimensionBlocker() {
            var root = document.getElementById('visual-editor-content');
            if (!root) return null;
            return root.querySelector(
                '[data-visual-sync-dimensions="true"][data-visual-dimension-state="pending"], ' +
                '[data-visual-sync-dimensions="true"][data-visual-dimension-state="error"]'
            );
        }

        function syncVisualSaveAvailability() {
            var saveBtn = document.querySelector('[data-visual-save]');
            if (!saveBtn) return;
            saveBtn.disabled = saveBtn.getAttribute('data-visual-saving') === 'true' || !!visualAssetDimensionBlocker();
        }

        function collectVisualBody(page, module) {
            var block = visualBuilderState.blocks[page.slug] || {};
            var body = cloneBody(block.body_json || {});
            var root = document.getElementById('visual-editor-content');
            if (!root) return body;
            root.querySelectorAll('[data-visual-field]').forEach(function (field) {
                var path = field.getAttribute('data-visual-field');
                var value = field.type === 'checkbox' ? field.checked : field.value;
                if (field.getAttribute('data-visual-field-type') === 'list') {
                    setPathValue(body, path, String(value || '').split(/\r?\n/).map(function (item) { return item.trim(); }).filter(Boolean));
                    return;
                }
                if (field.getAttribute('data-visual-field-type') === 'image-grid') {
                    setPathValue(body, path, visualNormalizeImageList(value, field.getAttribute('data-visual-image-grid-max')));
                    return;
                }
                setPathValue(body, path, normalizeStructuredValue(path, value));
            });
            visualArrayModules(module).forEach(function (arrayModule) {
                var arrayPath = visualModulePath(arrayModule, body, { createMissing: true });
                var items = getPathValue(body, arrayPath);
                if (Array.isArray(items)) {
                    items.forEach(function (item, index) { item.sort_order = index; });
                }
            });
            return body;
        }

        function saveVisualBuilder() {
            var page = visualPageByKey(visualBuilderState.activePage);
            var module = visualModuleByKey(page, visualBuilderState.activeModule);
            var block = visualBuilderState.blocks[page.slug] || {};
            if (!page || !module || !block.version) return;
            var statusEl = document.getElementById('visual-save-status');
            var saveBtn = document.querySelector('[data-visual-save]');
            var dimensionBlocker = visualAssetDimensionBlocker();
            if (dimensionBlocker) {
                var dimensionState = dimensionBlocker.getAttribute('data-visual-dimension-state');
                var dimensionMessage = dimensionState === 'pending'
                    ? '图片尺寸仍在读取，请稍候再保存。'
                    : '图片尺寸读取失败，请重新选择或清除该图片后再保存。';
                if (statusEl) statusEl.textContent = dimensionMessage;
                showToast(dimensionMessage, 'error');
                syncVisualSaveAvailability();
                return;
            }
            var body = collectVisualBody(page, module);
            if (statusEl) statusEl.textContent = '保存中...';
            if (saveBtn) {
                saveBtn.setAttribute('data-visual-saving', 'true');
                saveBtn.disabled = true;
            }
            apiRequest('/admin/content-blocks/' + encodeURIComponent(page.slug), {
                method: 'PUT',
                body: {
                    title_en: block.title_en || page.label,
                    body_json: body,
                    version: block.version
                }
            }).then(function (response) {
                visualBuilderState.blocks[page.slug] = unwrapDataResponse(response) || {};
                resetFormDirty();
                renderVisualBuilder();
                refreshVisualPreview(true);
                showToast('可视化内容已保存');
            }).catch(function (err) {
                if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
                    showConflictNotice('内容已被他人修改，请重新加载后再编辑', function () {
                        delete visualBuilderState.blocks[page.slug];
                        loadVisualBuilder();
                    });
                    return;
                }
                if (statusEl) statusEl.textContent = '保存失败';
                showToast('保存可视化内容失败：' + err.message, 'error');
            }).finally(function () {
                if (saveBtn) saveBtn.removeAttribute('data-visual-saving');
                syncVisualSaveAvailability();
            });
        }

        function mutateVisualArray(pageKey, moduleKey, action, index) {
            var page = visualPageByKey(pageKey);
            var module = visualModuleByKey(page, moduleKey);
            if (!page || !module) return;
            var block = visualBuilderState.blocks[page.slug];
            if (!block) return;
            if (!visualCanChangeArrayStructure(module)) {
                showToast(module.allowStructureChanges === false
                    ? '当前列表结构与多语言内容绑定，不能新增、删除或排序。'
                    : '法语/俄语模式只维护已有项目的本地化内容，不能调整数组结构。', 'error');
                return;
            }
            var body = collectVisualBody(page, module);
            var arrayPath = visualModulePath(module, body, { createMissing: true });
            var items = getPathValue(body, arrayPath);
            if (!Array.isArray(items)) items = [];
            if (action === 'add') items.push(visualNewArrayItem(module));
            if (action === 'remove' && index >= 0) items.splice(index, 1);
            if (action === 'up' && index > 0) {
                var prev = items[index - 1];
                items[index - 1] = items[index];
                items[index] = prev;
            }
            if (action === 'down' && index < items.length - 1) {
                var next = items[index + 1];
                items[index + 1] = items[index];
                items[index] = next;
            }
            setPathValue(body, arrayPath, items);
            block.body_json = body;
            visualBuilderState.blocks[page.slug] = block;
            markFormDirty();
            renderVisualBuilder();
        }

        function applyVisualAssetFieldValue(input, path) {
            if (!input) return;
            var fieldId = input.id;
            input.value = path || '';
            var card = document.querySelector('[data-visual-asset-card="' + fieldId + '"]');
            if (card) {
                var preview = card.querySelector('.visual-asset-preview');
                var pathEl = card.querySelector('.visual-asset-path');
                if (preview) {
                    preview.innerHTML = path ? '<img src="' + escapeHtml(visualAssetSrc(path)) + '" alt="图片预览">' : '<span>未选择图片</span>';
                }
                if (pathEl) pathEl.textContent = path || '图片会从资源库选择';
            }
        }

        function setVisualAssetDimensionState(input, state, message) {
            if (!input) return;
            input.setAttribute('data-visual-dimension-state', state || 'idle');
            var status = document.querySelector('[data-visual-dimension-status="' + input.id + '"]');
            if (status) status.textContent = message || '';
            syncVisualSaveAvailability();
        }

        function visualSynchronizedAssetPaths(input) {
            var srcPath = input ? input.getAttribute('data-visual-field') : '';
            if (visualPathLast(srcPath) !== 'src') return { src: '', width: '', height: '' };
            var imagePath = visualPathParent(srcPath);
            return {
                src: srcPath,
                width: visualJoinPath(imagePath, 'width'),
                height: visualJoinPath(imagePath, 'height')
            };
        }

        function updateVisualSynchronizedAssetBody(input, path, width, height) {
            var page = visualPageByKey(visualBuilderState.activePage);
            var block = page ? visualBuilderState.blocks[page.slug] : null;
            if (!block || !block.body_json) return false;
            var paths = visualSynchronizedAssetPaths(input);
            if (!paths.src || !paths.width || !paths.height) return false;
            setPathValue(block.body_json, paths.src, path || '');
            setPathValue(block.body_json, paths.width, width);
            setPathValue(block.body_json, paths.height, height);
            return true;
        }

        function updateVisualAssetField(fieldId, path) {
            var input = document.getElementById(fieldId);
            if (!input) return Promise.resolve(false);
            path = String(path || '').trim();
            if (input.getAttribute('data-visual-sync-dimensions') !== 'true') {
                applyVisualAssetFieldValue(input, path);
                markFormDirty();
                return Promise.resolve(true);
            }

            var requestId = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
            input.setAttribute('data-visual-dimension-request', requestId);
            if (!path) {
                if (!updateVisualSynchronizedAssetBody(input, '', null, null)) {
                    setVisualAssetDimensionState(input, 'error', '无法更新图片字段，请刷新后重试。');
                    showToast('无法更新图片字段，请刷新后重试。', 'error');
                    return Promise.resolve(false);
                }
                applyVisualAssetFieldValue(input, '');
                setVisualAssetDimensionState(input, 'ready', '图片及天然宽高已清除。');
                markFormDirty();
                return Promise.resolve(true);
            }

            setVisualAssetDimensionState(input, 'pending', '正在读取图片天然宽高，请稍候...');
            return new Promise(function (resolve) {
                var image = new Image();
                image.onload = function () {
                    if (document.getElementById(fieldId) !== input || input.getAttribute('data-visual-dimension-request') !== requestId) {
                        resolve(false);
                        return;
                    }
                    var width = Number(image.naturalWidth || 0);
                    var height = Number(image.naturalHeight || 0);
                    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0 ||
                        !updateVisualSynchronizedAssetBody(input, path, width, height)) {
                        setVisualAssetDimensionState(input, 'error', '无法读取图片天然宽高，请重新选择或清除。');
                        showToast('无法读取图片天然宽高，请重新选择或清除。', 'error');
                        resolve(false);
                        return;
                    }
                    applyVisualAssetFieldValue(input, path);
                    setVisualAssetDimensionState(input, 'ready', '已读取天然尺寸：' + width + ' × ' + height + ' px');
                    markFormDirty();
                    resolve(true);
                };
                image.onerror = function () {
                    if (document.getElementById(fieldId) !== input || input.getAttribute('data-visual-dimension-request') !== requestId) {
                        resolve(false);
                        return;
                    }
                    setVisualAssetDimensionState(input, 'error', '图片加载失败，已保留原图片和尺寸。');
                    showToast('图片加载失败，已保留原图片和尺寸。', 'error');
                    resolve(false);
                };
                image.src = visualAssetSrc(path);
            });
        }

        function finishVisualAssetSelection(fieldId, path) {
            updateVisualAssetField(fieldId, path).then(function (updated) {
                if (updated && path) showToast('已选择可视化图片');
            });
        }

        function openVisualAssetPicker(fieldId) {
            visualBuilderState.activeAssetField = fieldId;
            var picker = document.getElementById('visual-asset-picker');
            if (picker) picker.hidden = false;
            loadVisualAssetOptions();
        }

        function closeVisualAssetPicker() {
            var picker = document.getElementById('visual-asset-picker');
            if (picker) picker.hidden = true;
            visualBuilderState.activeAssetField = null;
        }

        function loadVisualAssetOptions() {
            var grid = document.getElementById('visual-asset-picker-grid');
            if (!grid) return;
            grid.innerHTML = '<div class="content-editor-loading">正在加载资源...</div>';
            apiRequest('/admin/assets?type=image&page=1&pageSize=48').then(function (response) {
                var rows = unwrapListResponse(response);
                if (!rows.length) {
                    grid.innerHTML = '<div class="visual-empty-panel">资源库暂无图片，请先到资源库上传。</div>';
                    return;
                }
                grid.innerHTML = rows.map(function (asset) {
                    return '<button type="button" class="visual-asset-option" data-visual-pick-asset="' + escapeHtml(asset.path || '') + '">' +
                        '<span>' + (asset.path ? '<img src="' + escapeHtml(visualAssetSrc(asset.path)) + '" alt="' + escapeHtml(asset.original_name || asset.filename || '图片') + '">' : '') + '</span>' +
                        '<strong>' + escapeHtml(asset.original_name || asset.filename || '未命名图片') + '</strong>' +
                    '</button>';
                }).join('');
            }).catch(function (err) {
                grid.innerHTML = '<div class="visual-empty-panel">资源加载失败：' + escapeHtml(err.message) + '</div>';
            });
        }

        function bindVisualBuilderEvents() {
            var root = document.getElementById('visual-builder-root');
            if (!root) return;
            root.addEventListener('click', function (e) {
                var languageBtn = e.target.closest('[data-visual-language]');
                if (languageBtn) {
                    var languageKey = languageBtn.getAttribute('data-visual-language');
                    if (languageKey && languageKey !== visualBuilderState.activeLanguage) {
                        cacheCurrentVisualDraft();
                        visualBuilderState.activeLanguage = visualLanguageByKey(languageKey).key;
                        renderVisualBuilder();
                    }
                    return;
                }
                var pageBtn = e.target.closest('[data-visual-page]');
                var moduleBtn = e.target.closest('[data-visual-module]');
                if (pageBtn && !moduleBtn) {
                    if (!confirmDiscardChanges()) return;
                    var pageKey = pageBtn.getAttribute('data-visual-page');
                    var page = visualPageByKey(pageKey);
                    visualBuilderState.activePage = page.key;
                    visualBuilderState.activeModule = page.modules[0] ? page.modules[0].key : '';
                    loadVisualBuilder();
                    return;
                }
                if (moduleBtn) {
                    if (!confirmDiscardChanges()) return;
                    visualBuilderState.activePage = moduleBtn.getAttribute('data-visual-page');
                    visualBuilderState.activeModule = moduleBtn.getAttribute('data-visual-module');
                    renderVisualBuilder();
                    return;
                }
                if (e.target.closest('[data-visual-save]')) {
                    saveVisualBuilder();
                    return;
                }
                if (e.target.closest('[data-visual-refresh-preview]')) {
                    refreshVisualPreview(true);
                    return;
                }
                var arrayBtn = e.target.closest('[data-visual-array-action]');
                if (arrayBtn) {
                    mutateVisualArray(
                        arrayBtn.getAttribute('data-page'),
                        arrayBtn.getAttribute('data-module'),
                        arrayBtn.getAttribute('data-visual-array-action'),
                        parseInt(arrayBtn.getAttribute('data-index'), 10)
                    );
                    return;
                }
                var selectAsset = e.target.closest('[data-visual-select-asset]');
                if (selectAsset) {
                    (function (fieldId) {
                        openAssetPicker({
                            title: '选择可视化图片',
                            subtitle: '选择后会自动回填当前可视化字段并更新预览。',
                            module: 'visual_builder',
                            entityType: 'content_block',
                            entityId: '',
                            onSelect: function (asset) {
                                finishVisualAssetSelection(fieldId, asset && asset.path ? asset.path : '');
                            }
                        });
                    })(selectAsset.getAttribute('data-visual-select-asset'));
                    return;
                }
                var clearAsset = e.target.closest('[data-visual-clear-asset]');
                if (clearAsset) {
                    finishVisualAssetSelection(clearAsset.getAttribute('data-visual-clear-asset'), '');
                    return;
                }
                var imageGridAction = e.target.closest('[data-visual-image-action]');
                if (imageGridAction) {
                    var imageGridField = imageGridAction.getAttribute('data-visual-image-field');
                    var imageGridIndex = parseInt(imageGridAction.getAttribute('data-visual-image-index'), 10);
                    var action = imageGridAction.getAttribute('data-visual-image-action');
                    if (action === 'select') openVisualImageGridAssetPicker(imageGridField, imageGridIndex);
                    if (action === 'upload') openVisualImageGridUpload(imageGridField, imageGridIndex);
                    if (action === 'remove') removeVisualImageGridItem(imageGridField, imageGridIndex);
                    if (action === 'up' || action === 'down') moveVisualImageGridItem(imageGridField, imageGridIndex, action);
                    return;
                }                var pickedAsset = e.target.closest('[data-visual-pick-asset]');
                if (pickedAsset && visualBuilderState.activeAssetField) {
                    finishVisualAssetSelection(visualBuilderState.activeAssetField, pickedAsset.getAttribute('data-visual-pick-asset'));
                    closeVisualAssetPicker();
                    return;
                }
                if (e.target.closest('[data-visual-close-assets]')) {
                    closeVisualAssetPicker();
                }
            });
        }

        function bindSystemSettingsEvents() {
            var refreshSystem = document.getElementById('btn-refresh-system-status');
            if (refreshSystem) refreshSystem.addEventListener('click', loadSystemStatus);

            var moduleForm = document.getElementById('module-settings-form');
            if (moduleForm) {
                moduleForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    saveModuleSettings();
                });
                moduleForm.querySelectorAll('[data-module-key]').forEach(function (input) {
                    input.addEventListener('change', syncModuleSettingsView);
                });
            }

            var auditFilter = document.getElementById('audit-entity-filter');
            if (auditFilter) {
                auditFilter.addEventListener('change', function () {
                    auditLogPage = 1;
                    loadAuditLogs();
                });
            }
            var auditFilterBtn = document.getElementById('btn-filter-audit-logs');
            if (auditFilterBtn) {
                auditFilterBtn.addEventListener('click', function () {
                    auditLogPage = 1;
                    loadAuditLogs();
                });
            }
            var auditPrev = document.getElementById('btn-audit-prev');
            if (auditPrev) {
                auditPrev.addEventListener('click', function () {
                    if (auditLogPage <= 1) return;
                    auditLogPage -= 1;
                    loadAuditLogs();
                });
            }
            var auditNext = document.getElementById('btn-audit-next');
            if (auditNext) {
                auditNext.addEventListener('click', function () {
                    var totalPages = Math.max(1, Math.ceil((auditLogMeta.total || 0) / (auditLogMeta.pageSize || 20)));
                    if (auditLogPage >= totalPages) return;
                    auditLogPage += 1;
                    loadAuditLogs();
                });
            }
        }

        function bindTrashEvents() {
            var refreshBtn = document.getElementById('btn-refresh-trash');
            if (refreshBtn) refreshBtn.addEventListener('click', loadTrash);

            document.querySelectorAll('[data-trash-tab]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    setTrashTab(btn.getAttribute('data-trash-tab'));
                });
            });

            var trashProductSelectAll = document.getElementById('trash-product-select-all');
            if (trashProductSelectAll) {
                trashProductSelectAll.addEventListener('change', function () {
                    document.querySelectorAll('.trash-product-check').forEach(function (cb) {
                        cb.checked = trashProductSelectAll.checked;
                    });
                    updateTrashProductBatchBar();
                });
            }

            var trashCertSelectAll = document.getElementById('trash-cert-select-all');
            if (trashCertSelectAll) {
                trashCertSelectAll.addEventListener('change', function () {
                    document.querySelectorAll('.trash-cert-check').forEach(function (cb) {
                        cb.checked = trashCertSelectAll.checked;
                    });
                    updateTrashCertBatchBar();
                });
            }

            var restoreProductsBtn = document.getElementById('btn-trash-restore-products');
            if (restoreProductsBtn) restoreProductsBtn.addEventListener('click', function () { trashBatchProducts('publish'); });
            var hardDeleteProductsBtn = document.getElementById('btn-trash-hard-delete-products');
            if (hardDeleteProductsBtn) hardDeleteProductsBtn.addEventListener('click', function () { trashBatchProducts('hard_delete'); });
            var restoreCertsBtn = document.getElementById('btn-trash-restore-certs');
            if (restoreCertsBtn) restoreCertsBtn.addEventListener('click', function () { trashBatchCerts('publish'); });
            var hardDeleteCertsBtn = document.getElementById('btn-trash-hard-delete-certs');
            if (hardDeleteCertsBtn) hardDeleteCertsBtn.addEventListener('click', function () { trashBatchCerts('hard_delete'); });
        }

        function setTrashTab(tabId) {
            activeTrashTab = tabId === 'trash-certs' ? 'trash-certs' : 'trash-products';
            document.querySelectorAll('[data-trash-tab]').forEach(function (btn) {
                var isActive = btn.getAttribute('data-trash-tab') === activeTrashTab;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            ['trash-products', 'trash-certs'].forEach(function (id) {
                var panel = document.getElementById(id);
                if (panel) panel.classList.toggle('active', id === activeTrashTab);
            });
        }

        function bindAssetsEvents() {
            var refreshBtn = document.getElementById('btn-refresh-assets');
            if (refreshBtn) refreshBtn.addEventListener('click', function () {
                assetPage = 1;
                loadAssets();
            });

            var uploadBtn = document.getElementById('btn-upload-assets');
            var uploadInput = document.getElementById('asset-upload-input');
            var dropzone = document.getElementById('asset-dropzone');
            if (uploadBtn && uploadInput) uploadBtn.addEventListener('click', function () { uploadInput.click(); });
            if (uploadInput) {
                uploadInput.addEventListener('change', function () {
                    uploadAssetFiles(Array.prototype.slice.call(uploadInput.files || []));
                    uploadInput.value = '';
                });
            }
            if (dropzone) {
                dropzone.addEventListener('click', function (event) {
                    if (event.target && event.target.id === 'asset-upload-input') return;
                    if (uploadInput) uploadInput.click();
                });
                ['dragenter', 'dragover'].forEach(function (eventName) {
                    dropzone.addEventListener(eventName, function (event) {
                        event.preventDefault();
                        dropzone.classList.add('is-dragover');
                    });
                });
                ['dragleave', 'drop'].forEach(function (eventName) {
                    dropzone.addEventListener(eventName, function (event) {
                        event.preventDefault();
                        dropzone.classList.remove('is-dragover');
                    });
                });
                dropzone.addEventListener('drop', function (event) {
                    uploadAssetFiles(Array.prototype.slice.call((event.dataTransfer && event.dataTransfer.files) || []));
                });
            }

            document.querySelectorAll('[data-asset-view-mode]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    setAssetViewMode(btn.getAttribute('data-asset-view-mode') || 'grid');
                });
            });

            var assetSearch = document.getElementById('asset-search');
            if (assetSearch) {
                assetSearch.addEventListener('input', function () {
                    clearTimeout(assetSearchTimer);
                    assetSearchTimer = setTimeout(function () {
                        assetPage = 1;
                        loadAssets();
                    }, 250);
                    updateAssetClearFilters();
                });
            }

            var assetType = document.getElementById('asset-type-filter');
            var assetUsage = document.getElementById('asset-usage-filter');
            var assetActive = document.getElementById('asset-active-filter');
            [assetType, assetUsage, assetActive].forEach(function (field) {
                if (!field) return;
                field.addEventListener('change', function () {
                    assetPage = 1;
                    updateAssetClearFilters();
                    loadAssets();
                });
            });

            var duplicateBtn = document.getElementById('btn-show-asset-duplicates');
            if (duplicateBtn) {
                duplicateBtn.addEventListener('click', function () {
                    assetDuplicateOpen = !assetDuplicateOpen;
                    renderAssetDuplicatesPanel(null);
                    if (assetDuplicateOpen) loadAssetDuplicates();
                });
            }

            var clearAssetFilters = document.getElementById('btn-clear-asset-filters');
            if (clearAssetFilters) {
                clearAssetFilters.addEventListener('click', function () {
                    if (assetSearch) assetSearch.value = '';
                    if (assetType) assetType.value = '';
                    if (assetUsage) assetUsage.value = '';
                    if (assetActive) assetActive.value = '1';
                    assetPage = 1;
                    updateAssetClearFilters();
                    loadAssets();
                });
            }

            var prevBtn = document.getElementById('btn-assets-prev');
            if (prevBtn) prevBtn.addEventListener('click', function () {
                if (assetPage <= 1) return;
                assetPage -= 1;
                loadAssets();
            });

            var nextBtn = document.getElementById('btn-assets-next');
            if (nextBtn) nextBtn.addEventListener('click', function () {
                var totalPages = Math.max(1, Math.ceil((assetMeta.total || 0) / (assetMeta.pageSize || 20)));
                if (assetPage >= totalPages) return;
                assetPage += 1;
                loadAssets();
            });

            var assetSelectAll = document.getElementById('asset-select-all');
            if (assetSelectAll) {
                assetSelectAll.addEventListener('change', function () {
                    assetRows.forEach(function (asset) {
                        if (asset && asset.id != null) selectedAssetIds[String(asset.id)] = assetSelectAll.checked;
                    });
                    syncAssetSelection();
                });
            }
            var copySelected = document.getElementById('btn-copy-selected-asset');
            if (copySelected) copySelected.addEventListener('click', copyFirstSelectedAssetPath);
            var clearSelection = document.getElementById('btn-clear-asset-selection');
            if (clearSelection) clearSelection.addEventListener('click', clearAssetSelection);
            var deleteSelected = document.getElementById('btn-delete-selected-assets');
            if (deleteSelected) deleteSelected.addEventListener('click', deleteSelectedAssets);
        }

        function updateAssetClearFilters() {
            var btn = document.getElementById('btn-clear-asset-filters');
            if (!btn) return;
            var searchVal = ((document.getElementById('asset-search') || {}).value || '').trim();
            var typeVal = (document.getElementById('asset-type-filter') || {}).value || '';
            var usageVal = (document.getElementById('asset-usage-filter') || {}).value || '';
            var activeVal = (document.getElementById('asset-active-filter') || {}).value || '1';
            btn.style.display = searchVal || typeVal || usageVal || activeVal !== '1' ? '' : 'none';
        }

        function setAssetViewMode(mode) {
            assetViewMode = mode === 'list' ? 'list' : 'grid';
            var grid = document.getElementById('assets-grid');
            var list = document.getElementById('assets-list-panel');
            if (grid) grid.style.display = assetViewMode === 'grid' ? '' : 'none';
            if (list) list.style.display = assetViewMode === 'list' ? '' : 'none';
            document.querySelectorAll('[data-asset-view-mode]').forEach(function (btn) {
                btn.classList.toggle('active', btn.getAttribute('data-asset-view-mode') === assetViewMode);
            });
        }

        function formatFileSize(bytes) {
            if (bytes == null || isNaN(bytes)) return '—';
            if (bytes === 0) return '0 B';

            var units = ['B', 'KB', 'MB', 'GB'];
            var i = 0;
            var size = Number(bytes);
            while (size >= 1024 && i < units.length - 1) {
                size /= 1024;
                i++;
            }
            return (i === 0 ? size : size.toFixed(1)) + ' ' + units[i];
        }


        function assetUsageModuleLabel(moduleName) {
            var labels = {
                products: '产品',
                certifications: '证书',
                content_blocks: '内容模块',
                visual_builder: '可视化管理',
                education: '教育合作',
                assets: '资源库'
            };
            return labels[moduleName] || moduleName || '未知模块';
        }

        function assetUsageLocationText(item) {
            if (!item) return '未知位置';
            var parts = [assetUsageModuleLabel(item.module)];
            if (item.entity_type) parts.push(item.entity_type);
            if (item.entity_id != null && item.entity_id !== '') parts.push('#' + item.entity_id);
            if (item.field_path) parts.push(item.field_path);
            return parts.join(' · ');
        }

        function renderAssetUsageList(items, total) {
            items = Array.isArray(items) ? items : [];
            total = Number(total || items.length || 0);
            if (!total && !items.length) {
                return '<div class="asset-usage-empty">当前未发现后台引用。</div>';
            }
            var shown = items.slice(0, 20);
            var listHtml = shown.map(function (item) {
                var title = item.title || item.entity_type || '未命名内容';
                return '<div class="asset-usage-item"><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(assetUsageLocationText(item)) + '</span></div>';
            }).join('');
            var more = total > shown.length ? '<small class="asset-usage-more">还有 ' + escapeHtml(total - shown.length) + ' 个引用位置未显示。</small>' : '';
            return '<div class="asset-usage-list">' + listHtml + '</div>' + more;
        }

        function formatAssetUsageMessage(items, total) {
            items = Array.isArray(items) ? items : [];
            total = Number(total || items.length || 0);
            var lines = items.slice(0, 8).map(function (item, index) {
                return (index + 1) + '. ' + (item.title || item.entity_type || '未命名内容') + '（' + assetUsageLocationText(item) + '）';
            });
            if (total > lines.length) lines.push('还有 ' + (total - lines.length) + ' 个引用位置未显示。');
            return '该资源正在被 ' + total + ' 个位置使用，不能直接移出资源库。\n\n' + lines.join('\n') + '\n\n请先替换这些引用后再删除。';
        }



        function formatAssetReplaceMessage(target, items, total) {
            items = Array.isArray(items) ? items : [];
            total = Number(total || items.length || 0);
            var targetName = target && (target.original_name || target.filename || target.path || ('资源 #' + target.id)) || '目标资源';
            var lines = items.slice(0, 8).map(function (item, index) {
                return (index + 1) + '. ' + (item.title || item.entity_type || '未命名内容') + '：' + assetUsageLocationText(item);
            });
            if (total > lines.length) lines.push('还有 ' + (total - lines.length) + ' 个引用位置未显示。');
            return '将把当前资源的 ' + total + ' 个引用位置替换为：' + targetName + '\n\n' + lines.join('\n') + '\n\n确认后会同步更新产品、证书、内容模块和可视化页面中的图片引用。';
        }
        function refreshAssetUsageDetail(assetId, hostId) {
            var host = document.getElementById(hostId);
            if (!assetId || !host) return;
            apiRequest('/admin/assets/' + encodeURIComponent(assetId) + '/usage').then(function (response) {
                if (String(activeAssetId) !== String(assetId)) return;
                var data = unwrapDataResponse(response) || {};
                var items = data.items || [];
                var total = data.usage_count || items.length;
                var nextHost = document.getElementById(hostId);
                if (nextHost) nextHost.innerHTML = renderAssetUsageList(items, total);
                var countEl = document.querySelector('[data-asset-usage-count="' + String(assetId).replace(/"/g, '') + '"]');
                if (countEl) countEl.textContent = total > 0 ? '已使用 ' + total + ' 处' : '未使用';
            }).catch(function () {
                var nextHost = document.getElementById(hostId);
                if (nextHost) nextHost.innerHTML = '<div class="asset-usage-empty">使用位置加载失败，请刷新后重试。</div>';
            });
        }
        function openAssetPicker(options) {
            options = options || {};
            assetPickerState.open = true;
            assetPickerState.page = 1;
            assetPickerState.pageSize = options.pageSize || 24;
            assetPickerState.total = 0;
            assetPickerState.rows = [];
            assetPickerState.selectedId = null;
            assetPickerState.selectedAsset = null;
            assetPickerState.type = options.type || 'image';
            assetPickerState.module = options.module || 'assets';
            assetPickerState.entityType = options.entityType || '';
            assetPickerState.entityId = options.entityId || '';
            assetPickerState.title = options.title || '选择资源';
            assetPickerState.subtitle = options.subtitle || '从资源库选择图片，或上传新图片后直接使用。';
            assetPickerState.onSelect = typeof options.onSelect === 'function' ? options.onSelect : null;
            assetPickerState.trigger = document.activeElement;

            var title = document.getElementById('asset-picker-title');
            var subtitle = document.getElementById('asset-picker-subtitle');
            var search = document.getElementById('asset-picker-search');
            var moduleFilter = document.getElementById('asset-picker-module');
            var usageFilter = document.getElementById('asset-picker-usage');
            if (title) title.textContent = assetPickerState.title;
            if (subtitle) subtitle.textContent = assetPickerState.subtitle;
            if (search) search.value = '';
            if (moduleFilter) moduleFilter.value = '';
            if (usageFilter) usageFilter.value = '';

            var modal = document.getElementById('asset-picker-modal');
            if (modal) {
                modal.classList.add('show');
                trapFocus(modal, closeAssetPicker);
            }
            loadAssetPickerAssets();
        }

        function closeAssetPicker() {
            var modal = document.getElementById('asset-picker-modal');
            if (modal) {
                releaseFocusTrap(modal);
                modal.classList.remove('show');
            }
            if (assetPickerState.trigger && assetPickerState.trigger.focus) assetPickerState.trigger.focus();
            assetPickerState.open = false;
            assetPickerState.onSelect = null;
            assetPickerState.trigger = null;
        }

        function assetPickerFilterValues() {
            return {
                q: ((document.getElementById('asset-picker-search') || {}).value || '').trim(),
                module: (document.getElementById('asset-picker-module') || {}).value || '',
                usage: (document.getElementById('asset-picker-usage') || {}).value || ''
            };
        }

        function loadAssetPickerAssets() {
            var grid = document.getElementById('asset-picker-grid');
            if (!grid) return;
            grid.innerHTML = '<div class="asset-empty-state">正在加载资源...</div>';
            renderAssetPickerDetail(assetPickerState.selectedAsset);
            var filters = assetPickerFilterValues();
            var url = '/admin/assets?page=' + encodeURIComponent(assetPickerState.page) +
                '&pageSize=' + encodeURIComponent(assetPickerState.pageSize) +
                '&include_usage=1';
            if (assetPickerState.type) url += '&type=' + encodeURIComponent(assetPickerState.type);
            if (filters.q) url += '&q=' + encodeURIComponent(filters.q);
            if (filters.module) url += '&module=' + encodeURIComponent(filters.module);
            if (filters.usage) url += '&usage_status=' + encodeURIComponent(filters.usage);
            apiRequest(url).then(function (response) {
                var rows = unwrapListResponse(response);
                assetPickerState.rows = rows;
                assetPickerState.total = response && response.meta ? response.meta.total : rows.length;
                if (assetPickerState.selectedId && !assetPickerState.selectedAsset && !findAssetPickerRow(assetPickerState.selectedId)) {
                    assetPickerState.selectedId = null;
                    assetPickerState.selectedAsset = null;
                }
                renderAssetPickerGrid();
                renderAssetPickerPagination(response && response.meta ? response.meta : null);
                renderAssetPickerDetail(assetPickerState.selectedAsset);
            }).catch(function (err) {
                grid.innerHTML = '<div class="asset-empty-state">资源加载失败：' + escapeHtml(err.message) + '</div>';
                renderAssetPickerPagination({ page: 1, pageSize: assetPickerState.pageSize, total: 0 });
            });
        }

        function findAssetPickerRow(id) {
            for (var i = 0; i < assetPickerState.rows.length; i++) {
                if (String(assetPickerState.rows[i].id) === String(id)) return assetPickerState.rows[i];
            }
            return null;
        }

        function renderAssetPickerGrid() {
            var grid = document.getElementById('asset-picker-grid');
            if (!grid) return;
            if (!assetPickerState.rows.length) {
                grid.innerHTML = '<div class="asset-empty-state">暂无可选择资源</div>';
                return;
            }
            grid.innerHTML = assetPickerState.rows.map(function (asset) {
                var id = asset.id == null ? '' : String(asset.id);
                var path = asset.path || '';
                var name = asset.original_name || asset.filename || '未命名资源';
                var usageText = asset.usage_count > 0 ? '已使用 ' + asset.usage_count + ' 处' : '未使用';
                var preview = assetIsImage(asset) && path
                    ? '<img src="' + escapeHtml(assetPreviewSrc(path)) + '" alt="">'
                    : '<div class="asset-file-icon">' + assetFileIcon(asset) + '</div>';
                return '<button type="button" class="asset-picker-card ' + (String(assetPickerState.selectedId) === id ? 'is-selected' : '') + '" data-asset-picker-id="' + escapeHtml(id) + '">' +
                    '<span class="asset-picker-thumb">' + preview + '</span>' +
                    '<strong title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</strong>' +
                    '<small>' + escapeHtml(asset.module || '未绑定来源') + ' · ' + escapeHtml(usageText) + '</small>' +
                '</button>';
            }).join('');
            grid.querySelectorAll('[data-asset-picker-id]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    selectAssetPickerRow(btn.getAttribute('data-asset-picker-id'));
                });
            });
        }

        function selectAssetPickerRow(id) {
            var asset = findAssetPickerRow(id);
            if (!asset) return;
            assetPickerState.selectedId = asset.id;
            assetPickerState.selectedAsset = asset;
            renderAssetPickerGrid();
            renderAssetPickerDetail(asset);
            var confirm = document.getElementById('asset-picker-confirm');
            if (confirm) confirm.disabled = false;
        }

        function renderAssetPickerDetail(asset) {
            var detail = document.getElementById('asset-picker-detail');
            var confirm = document.getElementById('asset-picker-confirm');
            if (confirm) confirm.disabled = !asset;
            if (!detail) return;
            if (!asset) {
                detail.innerHTML = '<div class="asset-detail-empty">请选择一个资源</div>';
                return;
            }
            var path = asset.path || '';
            var name = asset.original_name || asset.filename || '未命名资源';
            var source = asset.module ? asset.module + (asset.entity_type ? '/' + asset.entity_type : '') : '未绑定来源';
            var usage = asset.usage_count > 0 ? '已使用 ' + asset.usage_count + ' 处' : '未使用';
            var preview = assetIsImage(asset) && path
                ? '<img src="' + escapeHtml(assetPreviewSrc(path)) + '" alt="">'
                : '<div class="asset-file-icon asset-file-icon-large">' + assetFileIcon(asset) + '</div>';
            detail.innerHTML = '<div class="asset-detail-preview">' + preview + '</div>' +
                '<h4>' + escapeHtml(name) + '</h4>' +
                '<dl>' +
                    '<div><dt>路径</dt><dd title="' + escapeHtml(path) + '">' + escapeHtml(path || '-') + '</dd></div>' +
                    '<div><dt>类型</dt><dd>' + escapeHtml(asset.mime_type || assetTypeLabel(asset)) + '</dd></div>' +
                    '<div><dt>大小</dt><dd>' + escapeHtml(formatFileSize(asset.file_size)) + '</dd></div>' +
                    '<div><dt>来源</dt><dd>' + escapeHtml(source) + '</dd></div>' +
                    '<div><dt>状态</dt><dd>' + escapeHtml(usage) + '</dd></div>' +
                    '<div><dt>上传时间</dt><dd>' + escapeHtml(formatDate(asset.created_at)) + '</dd></div>' +
                '</dl>' +
                '<section class="asset-usage-section"><h5>使用位置</h5>' + renderAssetUsageList(asset.usage || [], asset.usage_count || 0) + '</section>';
        }

        function renderAssetPickerPagination(meta) {
            meta = meta || { page: assetPickerState.page, pageSize: assetPickerState.pageSize, total: assetPickerState.total };
            assetPickerState.page = meta.page || assetPickerState.page;
            assetPickerState.pageSize = meta.pageSize || assetPickerState.pageSize;
            assetPickerState.total = meta.total || 0;
            var totalPages = Math.max(1, Math.ceil((assetPickerState.total || 0) / (assetPickerState.pageSize || 24)));
            var pageInfo = document.getElementById('asset-picker-page-info');
            var prev = document.getElementById('asset-picker-prev');
            var next = document.getElementById('asset-picker-next');
            if (pageInfo) pageInfo.textContent = '第 ' + assetPickerState.page + ' 页，共 ' + assetPickerState.total + ' 条';
            if (prev) prev.disabled = assetPickerState.page <= 1;
            if (next) next.disabled = assetPickerState.page >= totalPages;
        }



        function logAssetSelection(asset) {
            if (!asset || !asset.id) return;
            apiRequest('/admin/assets/' + encodeURIComponent(asset.id) + '/select-log', {
                method: 'POST',
                body: {
                    module: assetPickerState.module || 'assets',
                    entity_type: assetPickerState.entityType || '',
                    entity_id: assetPickerState.entityId || '',
                    source: 'asset_picker'
                }
            }).catch(function () {});
        }
        function confirmAssetPickerSelection() {
            if (!assetPickerState.selectedAsset || !assetPickerState.onSelect) return;
            logAssetSelection(assetPickerState.selectedAsset);
            assetPickerState.onSelect(assetPickerState.selectedAsset);
            closeAssetPicker();
        }

        function uploadAssetFromPicker(file) {
            if (!file) return;
            uploadAdminAssetFile(file, {
                module: assetPickerState.module || 'assets',
                entity_type: assetPickerState.entityType || '',
                entity_id: assetPickerState.entityId || ''
            }).then(function (response) {
                var asset = unwrapDataResponse(response) || response;
                assetPickerState.selectedId = asset.id || null;
                assetPickerState.selectedAsset = asset;
                renderAssetPickerDetail(asset);
                showToast(asset.reused ? '资源库已有相同图片，已直接选中' : '图片已上传并选中');
                assetPickerState.page = 1;
                loadAssetPickerAssets();
            }).catch(function (err) {
                showToast('上传失败：' + err.message, 'error');
            });
        }

        function bindAssetPickerEvents() {
            var modal = document.getElementById('asset-picker-modal');
            if (modal) {
                modal.addEventListener('click', function (event) {
                    if (event.target === modal) closeAssetPicker();
                });
            }
            var closeBtn = document.getElementById('asset-picker-close');
            if (closeBtn) closeBtn.addEventListener('click', closeAssetPicker);
            var cancelBtn = document.getElementById('asset-picker-cancel');
            if (cancelBtn) cancelBtn.addEventListener('click', closeAssetPicker);
            var confirmBtn = document.getElementById('asset-picker-confirm');
            if (confirmBtn) confirmBtn.addEventListener('click', confirmAssetPickerSelection);
            var prev = document.getElementById('asset-picker-prev');
            if (prev) prev.addEventListener('click', function () {
                if (assetPickerState.page <= 1) return;
                assetPickerState.page -= 1;
                loadAssetPickerAssets();
            });
            var next = document.getElementById('asset-picker-next');
            if (next) next.addEventListener('click', function () {
                var totalPages = Math.max(1, Math.ceil((assetPickerState.total || 0) / (assetPickerState.pageSize || 24)));
                if (assetPickerState.page >= totalPages) return;
                assetPickerState.page += 1;
                loadAssetPickerAssets();
            });
            var search = document.getElementById('asset-picker-search');
            if (search) search.addEventListener('input', function () {
                clearTimeout(assetPickerTimer);
                assetPickerTimer = setTimeout(function () {
                    assetPickerState.page = 1;
                    loadAssetPickerAssets();
                }, 250);
            });
            ['asset-picker-module', 'asset-picker-usage'].forEach(function (id) {
                var field = document.getElementById(id);
                if (field) field.addEventListener('change', function () {
                    assetPickerState.page = 1;
                    loadAssetPickerAssets();
                });
            });
            var uploadBtn = document.getElementById('asset-picker-upload-btn');
            var uploadInput = document.getElementById('asset-picker-upload-input');
            if (uploadBtn && uploadInput) uploadBtn.addEventListener('click', function () { uploadInput.click(); });
            if (uploadInput) uploadInput.addEventListener('change', function () {
                uploadAssetFromPicker(uploadInput.files && uploadInput.files[0]);
                uploadInput.value = '';
            });
        }



        function renderAssetGovernance(data) {
            var grid = document.getElementById('asset-governance-grid');
            if (!grid) return;
            data = data || {};
            var cards = [
                { label: '资源总数', value: data.total == null ? '—' : data.total, hint: '正常 ' + (data.images || 0) + ' 张图片 / ' + (data.files || 0) + ' 个文件' },
                { label: '未使用', value: data.unused == null ? '—' : data.unused, hint: '可通过使用状态筛选进入清理列表' },
                { label: '重复资源', value: data.duplicate_groups == null ? '—' : data.duplicate_groups, hint: (data.duplicate_assets || 0) + ' 个资源存在重复文件特征' },
                { label: '大图建议', value: data.large_images ? data.large_images.length : '—', hint: '总大小 ' + formatFileSize(data.total_size || 0) + '，已移出 ' + (data.inactive || 0) + ' 个' }
            ];
            grid.innerHTML = cards.map(function (card) {
                return '<article><span>' + escapeHtml(card.label) + '</span><strong>' + escapeHtml(card.value) + '</strong><small>' + escapeHtml(card.hint) + '</small></article>';
            }).join('');
        }

        function loadAssetGovernance() {
            apiRequest('/admin/assets/governance').then(function (response) {
                renderAssetGovernance(unwrapDataResponse(response) || {});
            }).catch(function () {
                renderAssetGovernance(null);
            });
        }

        function renderAssetDuplicatesPanel(groups) {
            var panel = document.getElementById('asset-duplicates-panel');
            var btn = document.getElementById('btn-show-asset-duplicates');
            if (!panel) return;
            if (btn) btn.classList.toggle('active', assetDuplicateOpen);
            panel.hidden = !assetDuplicateOpen;
            if (!assetDuplicateOpen) return;
            if (!groups) {
                panel.innerHTML = '<div class="asset-empty-state">正在检查重复资源...</div>';
                return;
            }
            if (!groups.length) {
                panel.innerHTML = '<div class="asset-empty-state">未发现重复资源。</div>';
                return;
            }
            panel.innerHTML = groups.map(function (group, index) {
                var assets = Array.isArray(group.assets) ? group.assets : [];
                var assetButtons = assets.map(function (asset) {
                    var label = asset.original_name || asset.filename || asset.path || ('资源 #' + asset.id);
                    return '<button type="button" data-asset-duplicate-focus="' + escapeHtml(asset.id) + '">' + escapeHtml(label) + '<br><small>' + escapeHtml(asset.path || '') + '</small></button>';
                }).join('');
                return '<section class="asset-duplicate-group"><strong>重复组 ' + escapeHtml(index + 1) + '：' + escapeHtml(group.count || assets.length) + ' 个资源</strong><div class="asset-duplicate-meta">类型 ' + escapeHtml(group.mime_type || '未知') + ' · 单个 ' + escapeHtml(formatFileSize(group.file_size)) + '</div><div class="asset-duplicate-assets">' + assetButtons + '</div></section>';
            }).join('');
            panel.querySelectorAll('[data-asset-duplicate-focus]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    setActiveAsset(btn.getAttribute('data-asset-duplicate-focus'));
                });
            });
        }

        function loadAssetDuplicates() {
            apiRequest('/admin/assets/duplicates').then(function (response) {
                renderAssetDuplicatesPanel(unwrapListResponse(response));
            }).catch(function (err) {
                var panel = document.getElementById('asset-duplicates-panel');
                if (panel) panel.innerHTML = '<div class="asset-empty-state">重复资源检查失败：' + escapeHtml(err.message) + '</div>';
            });
        }
        function loadAssets() {
            var tbody = document.getElementById('assets-tbody');
            var grid = document.getElementById('assets-grid');
            if (!tbody && !grid) return;

            if (tbody) tbody.innerHTML = skeletonRows(8, 5);
            if (grid) grid.innerHTML = '<div class="asset-skeleton-card"></div><div class="asset-skeleton-card"></div><div class="asset-skeleton-card"></div>';
            clearErrorBanner('view-assets');
            var pagination = document.getElementById('assets-pagination');
            if (pagination) pagination.style.display = 'none';
            var searchVal = ((document.getElementById('asset-search') || {}).value || '').trim();
            var typeVal = (document.getElementById('asset-type-filter') || {}).value || '';
            var usageVal = (document.getElementById('asset-usage-filter') || {}).value || '';
            var activeVal = (document.getElementById('asset-active-filter') || {}).value || '1';
            var url = '/admin/assets?page=' + encodeURIComponent(assetPage) + '&pageSize=20&include_usage=1';
            if (searchVal) url += '&q=' + encodeURIComponent(searchVal);
            if (typeVal) url += '&type=' + encodeURIComponent(typeVal);
            if (usageVal) url += '&usage_status=' + encodeURIComponent(usageVal);
            if (activeVal !== '') url += '&is_active=' + encodeURIComponent(activeVal);
            loadAssetGovernance();
            updateAssetClearFilters();

            apiRequest(url).then(function (response) {
                var rows = unwrapListResponse(response);
                assetMeta = response && response.meta ? response.meta : { page: assetPage, pageSize: 20, total: rows.length };
                renderAssetsTable(rows);
            }).catch(function (err) {
                if (tbody) tbody.innerHTML = emptyRow(8, '加载失败，请刷新重试');
                if (grid) grid.innerHTML = '<div class="asset-empty-state">加载失败，请刷新重试</div>';
                showErrorBanner('view-assets', '资源库数据加载失败，请稍后重试', loadAssets);
                showToast('加载资源库失败：' + err.message, 'error');
            });
        }

        function renderAssetsTable(rows) {
            var tbody = document.getElementById('assets-tbody');
            var grid = document.getElementById('assets-grid');
            assetRows = Array.isArray(rows) ? rows : [];
            selectedAssetIds = {};
            setAssetViewMode(assetViewMode);

            if (!assetRows.length) {
                if (tbody) tbody.innerHTML = emptyRow(8, '暂无资源记录');
                if (grid) grid.innerHTML = '<div class="asset-empty-state">暂无资源记录</div>';
                activeAssetId = null;
                renderAssetDetail(null);
                syncAssetSelection();
                renderAssetsPagination();
                return;
            }

            if (!activeAssetId || !findAssetById(activeAssetId)) activeAssetId = assetRows[0].id;
            if (grid) grid.innerHTML = assetRows.map(renderAssetCard).join('');
            if (tbody) tbody.innerHTML = assetRows.map(renderAssetListRow).join('');
            bindRenderedAssetEvents();
            renderAssetDetail(findAssetById(activeAssetId));
            syncAssetSelection();
            renderAssetsPagination();
        }

        function renderAssetCard(asset) {
            var id = asset.id == null ? '' : String(asset.id);
            var selected = !!selectedAssetIds[id];
            var active = String(activeAssetId) === id;
            var path = asset.path || '';
            var name = asset.original_name || asset.filename || '未命名资源';
            var size = formatFileSize(asset.file_size);
            var usageText = asset.usage_count > 0 ? '已使用 ' + asset.usage_count + ' 处' : '未使用';
            var preview = assetIsImage(asset) && path
                ? '<img src="../' + escapeHtml(path) + '" alt="">'
                : '<div class="asset-file-icon">' + assetFileIcon(asset) + '</div>';
            return '<article class="asset-card ' + (active ? 'is-active ' : '') + (selected ? 'is-selected' : '') + '" data-asset-card="' + escapeHtml(id) + '">' +
                '<label class="asset-card-check"><input type="checkbox" class="asset-row-check" data-asset-check="' + escapeHtml(id) + '"' + (selected ? ' checked' : '') + '><span></span></label>' +
                '<div class="asset-card-preview">' + preview + '</div>' +
                '<div class="asset-card-body"><strong title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</strong><span>' + escapeHtml(size) + ' · ' + escapeHtml(assetTypeLabel(asset)) + ' · ' + escapeHtml(usageText) + '</span></div>' +
                '</article>';
        }

        function renderAssetListRow(asset) {
            var id = asset.id == null ? '' : String(asset.id);
            var selected = !!selectedAssetIds[id];
            var name = asset.original_name || asset.filename || '未命名资源';
            var rawPath = asset.path || '';
            var source = asset.module ? asset.module + (asset.entity_type ? '/' + asset.entity_type : '') : '—';
            var usage = asset.usage_count > 0 ? '已使用 ' + asset.usage_count + ' 处' : '未使用';
            return '<tr class="' + (String(activeAssetId) === id ? 'row-active' : '') + '" data-asset-row="' + escapeHtml(id) + '">' +
                '<td><input type="checkbox" class="asset-row-check" data-asset-check="' + escapeHtml(id) + '"' + (selected ? ' checked' : '') + '></td>' +
                '<td class="product-name-text">' + escapeHtml(name) + '</td>' +
                '<td class="cell-muted asset-path-cell" title="' + escapeHtml(rawPath || '—') + '">' + escapeHtml(rawPath || '—') + '</td>' +
                '<td class="cell-muted">' + escapeHtml(asset.mime_type || '—') + '</td>' +
                '<td class="cell-muted">' + escapeHtml(formatFileSize(asset.file_size)) + '</td>' +
                '<td class="cell-muted">' + escapeHtml(source) + ' · ' + escapeHtml(usage) + '</td>' +
                '<td class="cell-muted">' + escapeHtml(formatDate(asset.created_at)) + '</td>' +
                '<td><div class="asset-actions"><button class="btn btn-secondary btn-sm" data-copy-asset="' + escapeHtml(rawPath) + '">复制路径</button><button class="btn btn-icon btn-icon-delete" aria-label="删除资源" data-delete-asset="' + escapeHtml(id) + '">' + ICON_DELETE + '</button></div></td>' +
                '</tr>';
        }

        function bindRenderedAssetEvents() {
            document.querySelectorAll('[data-asset-card], [data-asset-row]').forEach(function (el) {
                el.addEventListener('click', function (event) {
                    if (event.target && event.target.closest && event.target.closest('button, input, label')) return;
                    setActiveAsset(el.getAttribute('data-asset-card') || el.getAttribute('data-asset-row'));
                });
            });
            document.querySelectorAll('[data-asset-check]').forEach(function (checkbox) {
                checkbox.addEventListener('change', function () {
                    selectedAssetIds[String(checkbox.getAttribute('data-asset-check'))] = checkbox.checked;
                    syncAssetSelection();
                });
            });
            document.querySelectorAll('[data-copy-asset]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    copyAssetPath(btn.getAttribute('data-copy-asset') || '');
                });
            });
            document.querySelectorAll('[data-delete-asset]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    deleteAsset(btn.getAttribute('data-delete-asset'));
                });
            });
        }

        function setActiveAsset(id) {
            activeAssetId = id;
            document.querySelectorAll('[data-asset-card], [data-asset-row]').forEach(function (el) {
                var itemId = el.getAttribute('data-asset-card') || el.getAttribute('data-asset-row');
                el.classList.toggle('is-active', String(itemId) === String(activeAssetId));
                el.classList.toggle('row-active', String(itemId) === String(activeAssetId));
            });
            renderAssetDetail(findAssetById(activeAssetId));
        }



        function renderAssetInspection(data) {
            if (!data) return '<div class="asset-inspection-note">正在读取图片尺寸和文件状态...</div>';
            var sizeText = data.width && data.height ? (data.width + ' x ' + data.height + ' px') : '未读取到尺寸';
            var existsText = data.exists ? '文件存在' : '文件不存在';
            var suggestions = Array.isArray(data.suggestions) && data.suggestions.length
                ? '<div class="asset-inspection-list">' + data.suggestions.map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join('') + '</div>'
                : '<div class="asset-inspection-note">暂无压缩或尺寸风险。</div>';
            return '<strong>图片与文件检查</strong><div class="asset-inspection-note">' + escapeHtml(existsText) + ' · ' + escapeHtml(sizeText) + ' · ' + escapeHtml(formatFileSize(data.file_size)) + '</div>' + suggestions;
        }

        function refreshAssetInspection(assetId, hostId) {
            var host = document.getElementById(hostId);
            if (!assetId || !host) return;
            apiRequest('/admin/assets/' + encodeURIComponent(assetId) + '/inspection').then(function (response) {
                var nextHost = document.getElementById(hostId);
                if (nextHost) nextHost.innerHTML = renderAssetInspection(unwrapDataResponse(response) || {});
            }).catch(function () {
                var nextHost = document.getElementById(hostId);
                if (nextHost) nextHost.innerHTML = '<div class="asset-inspection-note">文件检查失败，请刷新后重试。</div>';
            });
        }
        function renderAssetDetail(asset) {
            var container = document.getElementById('asset-detail');
            if (!container) return;
            if (!asset) {
                container.className = 'asset-detail-empty';
                container.innerHTML = '选择一个资源查看详情';
                return;
            }
            container.className = 'asset-detail-content';
            var path = asset.path || '';
            var name = asset.original_name || asset.filename || '未命名资源';
            var preview = assetIsImage(asset) && path
                ? '<img src="../' + escapeHtml(path) + '" alt="">'
                : '<div class="asset-file-icon asset-file-icon-large">' + assetFileIcon(asset) + '</div>';
            var source = asset.module ? asset.module + (asset.entity_type ? '/' + asset.entity_type : '') : '未绑定模块';
            var usage = asset.usage_count > 0 ? '已使用 ' + asset.usage_count + ' 处' : '未使用';
            var activeText = asset.is_active === 0 ? '已移出' : '正常';
            var usageHostId = 'asset-usage-detail-' + String(asset.id || 'active');
            var inspectionHostId = 'asset-inspection-detail-' + String(asset.id || 'active');
            var actionHtml = asset.is_active === 0
                ? '<button class="btn btn-primary btn-sm" type="button" data-restore-asset="' + escapeHtml(asset.id) + '">恢复资源</button>'
                : '<button class="btn btn-secondary btn-sm" type="button" data-replace-asset="' + escapeHtml(asset.id) + '">替换引用</button><button class="btn btn-icon btn-icon-delete" type="button" aria-label="删除资源" data-delete-asset="' + escapeHtml(asset.id) + '">' + ICON_DELETE + '</button>';
            container.innerHTML = '<div class="asset-detail-preview">' + preview + '</div>' +
                '<h4>' + escapeHtml(name) + '</h4>' +
                '<dl>' +
                    '<div><dt>路径</dt><dd title="' + escapeHtml(path) + '">' + escapeHtml(path || '—') + '</dd></div>' +
                    '<div><dt>类型</dt><dd>' + escapeHtml(asset.mime_type || '—') + '</dd></div>' +
                    '<div><dt>大小</dt><dd>' + escapeHtml(formatFileSize(asset.file_size)) + '</dd></div>' +
                    '<div><dt>来源</dt><dd>' + escapeHtml(source) + '</dd></div>' +
                    '<div><dt>资源状态</dt><dd>' + escapeHtml(activeText) + '</dd></div>' +
                    '<div><dt>使用状态</dt><dd data-asset-usage-count="' + escapeHtml(asset.id) + '">' + escapeHtml(usage) + '</dd></div>' +
                    '<div><dt>上传时间</dt><dd>' + escapeHtml(formatDate(asset.created_at)) + '</dd></div>' +
                '</dl>' +
                '<section class="asset-inspection-section" id="' + escapeHtml(inspectionHostId) + '">' + renderAssetInspection(null) + '</section>' +
                '<section class="asset-usage-section"><h5>使用位置</h5><div id="' + escapeHtml(usageHostId) + '">' + renderAssetUsageList(asset.usage || [], asset.usage_count || 0) + '</div></section>' +
                '<div class="asset-detail-actions"><button class="btn btn-secondary btn-sm" type="button" data-copy-asset="' + escapeHtml(path) + '">复制路径</button>' + actionHtml + '</div>';
            refreshAssetUsageDetail(asset.id, usageHostId);
            refreshAssetInspection(asset.id, inspectionHostId);
            container.querySelectorAll('[data-copy-asset]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    copyAssetPath(btn.getAttribute('data-copy-asset') || '');
                });
            });
            container.querySelectorAll('[data-delete-asset]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    deleteAsset(btn.getAttribute('data-delete-asset'));
                });
            });
            container.querySelectorAll('[data-restore-asset]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    restoreAsset(btn.getAttribute('data-restore-asset'));
                });
            });
            container.querySelectorAll('[data-replace-asset]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    openReplaceAssetPicker(btn.getAttribute('data-replace-asset'));
                });
            });
        }

        function assetIsImage(asset) {
            var mime = String((asset && asset.mime_type) || '').toLowerCase();
            var path = String((asset && asset.path) || '').toLowerCase();
            return mime.indexOf('image/') === 0 || /\.(jpe?g|png|webp|gif|svg)$/.test(path);
        }

        function assetTypeLabel(asset) {
            return assetIsImage(asset) ? '图片' : '文档';
        }

        function assetFileIcon() {
            return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>';
        }

        function findAssetById(id) {
            for (var i = 0; i < assetRows.length; i++) {
                if (String(assetRows[i].id) === String(id)) return assetRows[i];
            }
            return null;
        }

        function selectedAssets() {
            return assetRows.filter(function (asset) {
                return asset && asset.id != null && selectedAssetIds[String(asset.id)];
            });
        }

        function syncAssetSelection() {
            document.querySelectorAll('[data-asset-check]').forEach(function (checkbox) {
                var id = String(checkbox.getAttribute('data-asset-check'));
                checkbox.checked = !!selectedAssetIds[id];
            });
            document.querySelectorAll('[data-asset-card], [data-asset-row]').forEach(function (el) {
                var id = String(el.getAttribute('data-asset-card') || el.getAttribute('data-asset-row'));
                el.classList.toggle('is-selected', !!selectedAssetIds[id]);
            });
            var selected = selectedAssets();
            var bar = document.getElementById('asset-batch-bar');
            var count = document.getElementById('asset-batch-count');
            var selectAll = document.getElementById('asset-select-all');
            if (bar) bar.style.display = selected.length ? '' : 'none';
            if (count) count.textContent = '已选 ' + selected.length + ' 个文件';
            if (selectAll) {
                selectAll.checked = assetRows.length > 0 && selected.length === assetRows.length;
                selectAll.indeterminate = selected.length > 0 && selected.length < assetRows.length;
            }
        }

        function clearAssetSelection() {
            selectedAssetIds = {};
            syncAssetSelection();
        }

        function copyFirstSelectedAssetPath() {
            var selected = selectedAssets();
            if (!selected.length) return;
            copyAssetPath(selected[0].path || '');
        }

        function deleteSelectedAssets() {
            var selected = selectedAssets();
            if (!selected.length) return;
            showConfirm('移出资源库', '确定移出已选的 ' + selected.length + ' 个资源吗？文件本身不会从服务器删除。').then(function (ok) {
                if (!ok) return;
                Promise.all(selected.map(function (asset) {
                    return apiRequest('/admin/assets/' + encodeURIComponent(asset.id), { method: 'DELETE' });
                })).then(function () {
                    showToast('已移出 ' + selected.length + ' 个资源');
                    clearAssetSelection();
                    loadAssets();
                }).catch(function (err) {
                    showToast('批量操作失败：' + err.message, 'error');
                });
            });
        }

        function uploadAssetFiles(files) {
            if (assetUploading || !files || !files.length) return;
            var images = files.filter(function (file) { return /^image\/(jpeg|png|webp|gif)$/.test(file.type || ''); });
            if (!images.length) {
                showToast('请选择 JPG、PNG、WebP 或 GIF 图片。', 'error');
                return;
            }
            if (images.length !== files.length) showToast('已跳过不支持的文件类型', 'error');
            assetUploading = true;
            var dropzone = document.getElementById('asset-dropzone');
            if (dropzone) dropzone.classList.add('is-uploading');
            Promise.all(images.map(uploadSingleAssetFile)).then(function () {
                showToast('图片已上传到资源库');
                assetPage = 1;
                if (assetDuplicateOpen) loadAssetDuplicates();
                loadAssets();
            }).catch(function (err) {
                showToast('上传失败：' + err.message, 'error');
            }).finally(function () {
                assetUploading = false;
                if (dropzone) dropzone.classList.remove('is-uploading');
            });
        }

        function uploadSingleAssetFile(file) {
            return uploadAdminAssetFile(file, {
                module: 'assets',
                entity_type: 'resource'
            });
        }

        function copyAssetPath(assetUrl) {
            if (!assetUrl) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(assetUrl).then(function () {
                    showToast('路径已复制');
                }).catch(function () {
                    window.prompt('复制资源路径', assetUrl);
                });
            } else {
                window.prompt('复制资源路径', assetUrl);
            }
        }

        function renderAssetsPagination() {
            var pagination = document.getElementById('assets-pagination');
            var pageInfo = document.getElementById('assets-page-info');
            var prevBtn = document.getElementById('btn-assets-prev');
            var nextBtn = document.getElementById('btn-assets-next');
            var total = assetMeta.total || 0;
            var pageSize = assetMeta.pageSize || 20;
            var totalPages = Math.max(1, Math.ceil(total / pageSize));

            if (assetPage > totalPages) assetPage = totalPages;
            if (pagination) pagination.style.display = total > pageSize ? '' : 'none';
            if (pageInfo) pageInfo.textContent = '第 ' + assetPage + ' 页，共 ' + total + ' 条';
            if (prevBtn) prevBtn.disabled = assetPage <= 1;
            if (nextBtn) nextBtn.disabled = assetPage >= totalPages;
        }



        function restoreAsset(id) {
            showConfirm('恢复资源', '确定将这个资源恢复到资源库吗？恢复后可重新被选择和复用。').then(function (ok) {
                if (!ok) return;
                apiRequest('/admin/assets/' + encodeURIComponent(id) + '/restore', { method: 'POST' }).then(function () {
                    showToast('资源已恢复');
                    loadAssets();
                }).catch(function (err) {
                    showToast('恢复失败：' + err.message, 'error');
                });
            });
        }

        function openReplaceAssetPicker(sourceId) {
            var source = findAssetById(sourceId);
            if (!source) return;
            openAssetPicker({
                title: '选择替换资源',
                subtitle: '选择后会把当前资源的所有引用替换为新资源，执行前会再次确认影响范围。',
                module: 'assets',
                entityType: 'replace',
                entityId: source.id,
                type: assetIsImage(source) ? 'image' : '',
                onSelect: function (target) {
                    if (!target || String(target.id) === String(source.id)) {
                        showToast('请选择一个不同的目标资源', 'error');
                        return;
                    }
                    var usage = source.usage || [];
                    var total = source.usage_count || usage.length;
                    var message = formatAssetReplaceMessage(target, usage, total);
                    showConfirm('替换所有引用', message).then(function (ok) {
                        if (!ok) return;
                        apiRequest('/admin/assets/' + encodeURIComponent(source.id) + '/replace', {
                            method: 'POST',
                            body: { target_asset_id: target.id, confirm: true }
                        }).then(function () {
                            showToast('资源引用已替换');
                            assetPage = 1;
                            loadAssets();
                        }).catch(function (err) {
                            showToast('替换失败：' + err.message, 'error');
                        });
                    });
                }
            });
        }
        function deleteAsset(id) {
            showConfirm('删除资源', '确定删除这条资源记录吗？文件本身不会从服务器删除，仅移出资源库。').then(function (ok) {
                if (!ok) return;

                apiRequest('/admin/assets/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () {
                    showToast('资源已移出资源库');
                    if (assetDuplicateOpen) loadAssetDuplicates();
                    loadAssets();
                }).catch(function (err) {
                    if (err.code === 'RESOURCE_IN_USE') {
                        var details = err.details || {};
                        var usage = details.usage || details.items || [];
                        var total = details.usage_count || usage.length;
                        var active = findAssetById(id);
                        if (active) {
                            active.usage = usage;
                            active.usage_count = total;
                            if (String(activeAssetId) === String(id)) renderAssetDetail(active);
                        }
                        showConfirm('资源正在使用，无法删除', formatAssetUsageMessage(usage, total));
                        return;
                    }
                    showToast('删除失败：' + err.message, 'error');
                });
            });
        }

        function loadTrash() {
            setTrashTab(activeTrashTab);
            var productsTbody = document.getElementById('trash-products-tbody');
            var certsTbody = document.getElementById('trash-certs-tbody');
            if (productsTbody) productsTbody.innerHTML = skeletonRows(5, 4);
            if (certsTbody) certsTbody.innerHTML = skeletonRows(5, 4);
            updateTrashProductBatchBar();
            updateTrashCertBatchBar();

            apiRequest('/admin/products?status=deleted&page=1&pageSize=100').then(function (response) {
                trashedProducts = unwrapListResponse(response);
                renderTrashProductsTable();
            }).catch(function (err) {
                if (productsTbody) productsTbody.innerHTML = emptyRow(5, '加载失败，请刷新重试');
                showToast('加载已删除产品失败：' + err.message, 'error');
            });

            apiRequest('/admin/certifications?status=deleted&page=1&pageSize=100').then(function (response) {
                trashedCerts = unwrapListResponse(response);
                renderTrashCertsTable();
            }).catch(function (err) {
                if (certsTbody) certsTbody.innerHTML = emptyRow(5, '加载失败，请刷新重试');
                showToast('加载已删除证书失败：' + err.message, 'error');
            });
        }

        function restoreSingleProduct(id, version) {
            var versionMap = {};
            versionMap[String(id)] = version;
            apiRequest('/admin/products/batch', {
                method: 'POST',
                body: { action: 'publish', ids: [id], versionMap: versionMap }
            }).then(function () {
                showToast('产品已恢复');
                loadTrash();
            }).catch(function (err) {
                if (err.status === 409 || err.code === 'BATCH_FAILED') {
                    showToast('部分数据版本已变更，请刷新后重试', 'error');
                    return;
                }
                showToast('恢复失败：' + err.message, 'error');
            });
        }

        function restoreSingleCert(id, version) {
            var versionMap = {};
            versionMap[String(id)] = version;
            apiRequest('/admin/certifications/batch', {
                method: 'POST',
                body: { action: 'publish', ids: [id], versionMap: versionMap }
            }).then(function () {
                showToast('证书已恢复');
                loadTrash();
            }).catch(function (err) {
                if (err.status === 409 || err.code === 'BATCH_FAILED') {
                    showToast('部分数据版本已变更，请刷新后重试', 'error');
                    return;
                }
                showToast('恢复失败：' + err.message, 'error');
            });
        }

        function renderTrashProductsTable() {
            var tbody = document.getElementById('trash-products-tbody');
            if (!tbody) return;
            if (!trashedProducts.length) {
                tbody.innerHTML = emptyRow(5, '回收站为空');
                updateTrashProductBatchBar();
                return;
            }

            tbody.innerHTML = trashedProducts.map(function (product) {
                var name = product.name_en || product.name || '';
                var categoryName = product.category_name_en || product.category || '—';
                var cover = product.cover_image || product.image || '';
                var thumb = cover
                    ? '<img class="product-thumb" src="../' + escapeHtml(cover) + '" alt="">'
                    : '<div class="product-thumb" style="background:#eef1f5;border:1px solid #d8dee8;"></div>';
                return '<tr>' +
                    '<td><input type="checkbox" class="trash-product-check" data-id="' + escapeHtml(product.id) + '" data-version="' + escapeHtml(product.version) + '"></td>' +
                    '<td><div class="product-name-cell">' + thumb + '<div><div class="product-name-text">' + escapeHtml(name) + '</div><div class="product-id-text">' + escapeHtml(product.legacy_id || product.slug || product.id) + '</div></div></div></td>' +
                    '<td><span class="badge badge-blue">' + escapeHtml(categoryName) + '</span></td>' +
                    '<td><span class="badge badge-navy">已删除</span></td>' +
                    '<td><button class="btn btn-secondary btn-sm" data-trash-restore-product="' + escapeHtml(product.id) + '" data-version="' + escapeHtml(product.version) + '">恢复</button></td>' +
                    '</tr>';
            }).join('');

            tbody.querySelectorAll('[data-trash-restore-product]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = parseInt(btn.getAttribute('data-trash-restore-product'), 10);
                    var version = parseInt(btn.getAttribute('data-version'), 10);
                    restoreSingleProduct(id, version);
                });
            });
            bindRangeCheckboxes('.trash-product-check', updateTrashProductBatchBar);
            updateTrashProductBatchBar();
        }

        function renderTrashCertsTable() {
            var tbody = document.getElementById('trash-certs-tbody');
            if (!tbody) return;
            if (!trashedCerts.length) {
                tbody.innerHTML = emptyRow(5, '回收站为空');
                updateTrashCertBatchBar();
                return;
            }

            tbody.innerHTML = trashedCerts.map(function (item) {
                return '<tr>' +
                    '<td><input type="checkbox" class="trash-cert-check" data-id="' + escapeHtml(item.id) + '" data-version="' + escapeHtml(item.version) + '"></td>' +
                    '<td>' + escapeHtml(item.name_en || '') + '</td>' +
                    '<td><span class="badge badge-blue">' + escapeHtml(item.category_name_en || '—') + '</span></td>' +
                    '<td><span class="badge badge-navy">已删除</span></td>' +
                    '<td><button class="btn btn-secondary btn-sm" data-trash-restore-cert="' + escapeHtml(item.id) + '" data-version="' + escapeHtml(item.version) + '">恢复</button></td>' +
                    '</tr>';
            }).join('');

            tbody.querySelectorAll('[data-trash-restore-cert]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = parseInt(btn.getAttribute('data-trash-restore-cert'), 10);
                    var version = parseInt(btn.getAttribute('data-version'), 10);
                    restoreSingleCert(id, version);
                });
            });
            bindRangeCheckboxes('.trash-cert-check', updateTrashCertBatchBar);
            updateTrashCertBatchBar();
        }

        function updateTrashProductBatchBar() {
            var selected = document.querySelectorAll('.trash-product-check:checked');
            var all = document.querySelectorAll('.trash-product-check');
            var bar = document.getElementById('trash-product-batch-bar');
            var count = document.getElementById('trash-product-batch-count');
            var selectAll = document.getElementById('trash-product-select-all');
            if (count) count.textContent = '已选 ' + selected.length + ' 条';
            syncBatchBarFocus(bar, selected.length, '.trash-product-check');
            if (selectAll) {
                selectAll.checked = all.length > 0 && selected.length === all.length;
                selectAll.indeterminate = selected.length > 0 && selected.length < all.length;
            }
        }

        function updateTrashCertBatchBar() {
            var selected = document.querySelectorAll('.trash-cert-check:checked');
            var all = document.querySelectorAll('.trash-cert-check');
            var bar = document.getElementById('trash-cert-batch-bar');
            var count = document.getElementById('trash-cert-batch-count');
            var selectAll = document.getElementById('trash-cert-select-all');
            if (count) count.textContent = '已选 ' + selected.length + ' 条';
            syncBatchBarFocus(bar, selected.length, '.trash-cert-check');
            if (selectAll) {
                selectAll.checked = all.length > 0 && selected.length === all.length;
                selectAll.indeterminate = selected.length > 0 && selected.length < all.length;
            }
        }

        function selectedTrashIds(selector) {
            var ids = [];
            document.querySelectorAll(selector).forEach(function (cb) {
                var id = parseInt(cb.getAttribute('data-id'), 10);
                if (!isNaN(id)) ids.push(id);
            });
            return ids;
        }

        function trashBatchProducts(action) {
            var ids = selectedTrashIds('.trash-product-check:checked');
            if (!ids.length) {
                showToast('请先选择产品', 'error');
                return;
            }
            var requireConfirm = action === 'hard_delete';
            var message = '确定永久删除这 ' + ids.length + ' 条产品吗？此操作不可恢复。';
            var label = action === 'publish' ? '恢复' : '永久删除';
            runBatchAction('/admin/products/batch', action, ids, buildVersionMap(ids, trashedProducts), requireConfirm, message).then(function () {
                showToast('已对 ' + ids.length + ' 条产品执行：' + label);
                loadTrash();
            }).catch(function (err) {
                if (err && err.message === 'cancelled') return;
            });
        }

        function trashBatchCerts(action) {
            var ids = selectedTrashIds('.trash-cert-check:checked');
            if (!ids.length) {
                showToast('请先选择证书', 'error');
                return;
            }
            var requireConfirm = action === 'hard_delete';
            var message = '确定永久删除这 ' + ids.length + ' 条证书吗？此操作不可恢复。';
            var label = action === 'publish' ? '恢复' : '永久删除';
            runBatchAction('/admin/certifications/batch', action, ids, buildVersionMap(ids, trashedCerts), requireConfirm, message).then(function () {
                showToast('已对 ' + ids.length + ' 条证书执行：' + label);
                loadTrash();
            }).catch(function (err) {
                if (err && err.message === 'cancelled') return;
            });
        }

        function yesNo(value) {
            return value ? '是' : '否';
        }

        function loadSystemStatus() {
            var ids = [
                'system-sqlite-enabled',
                'system-sqlite-available',
                'system-schema-version',
                'system-public-source',
                'system-count-products',
                'system-count-certifications',
                'system-count-inquiries',
                'system-count-content-blocks',
                'system-count-assets',
                'system-env-node',
                'system-env-port',
                'system-api-state',
                'system-db-state',
                'system-source-state',
                'system-runtime-state',
                'system-last-check',
                'system-status-summary'
            ];
            ids.forEach(function (id) { setText(id, '—'); });
            apiRequest('/admin/system/status').then(function (response) {
                var data = unwrapDataResponse(response) || {};
                var sqlite = data.sqlite || {};
                var counts = data.counts || {};
                var env = data.env || {};
                var dbOk = !!sqlite.enabled && !!sqlite.available;
                var source = data.publicApiSource || '—';
                setText('system-sqlite-enabled', yesNo(sqlite.enabled));
                setText('system-sqlite-available', yesNo(sqlite.available));
                setText('system-schema-version', sqlite.schemaVersion == null ? '—' : sqlite.schemaVersion);
                setText('system-public-source', source);
                setText('system-count-products', counts.products == null ? 0 : counts.products);
                setText('system-count-certifications', counts.certifications == null ? 0 : counts.certifications);
                setText('system-count-inquiries', counts.inquiries == null ? 0 : counts.inquiries);
                setText('system-count-content-blocks', counts.contentBlocks == null ? 0 : counts.contentBlocks);
                setText('system-count-assets', counts.assets == null ? 0 : counts.assets);
                setText('system-env-node', env.nodeEnv || '—');
                setText('system-env-port', env.port || '—');
                setText('system-api-state', source === 'sqlite' ? '已连接主数据源' : '使用备用内容源');
                setText('system-db-state', dbOk ? '正常' : '异常');
                setText('system-source-state', source === 'sqlite' ? '数据库' : source);
                setText('system-runtime-state', env.nodeEnv || 'development');
                setText('system-last-check', '最后检查：' + formatDate(Date.now()));
                setText('system-status-summary', dbOk ? '系统核心数据源可用，后台内容会从当前数据库读取。' : '数据库状态异常，请检查服务连接和迁移状态。');

                var sourceEl = document.getElementById('system-public-source');
                if (sourceEl) {
                    sourceEl.style.color = data.publicApiSource === 'json' ? '#b42318' : '';
                }
                var dbState = document.getElementById('system-db-state');
                if (dbState) dbState.className = dbOk ? 'text-ok' : 'text-danger';
                var summary = document.getElementById('system-status-summary');
                if (summary) summary.classList.toggle('is-warning', !dbOk || source === 'json');
            }).catch(function (err) {
                showToast('加载系统状态失败：' + err.message, 'error');
            });
        }

        function moduleKeys() {
            return ['dashboard', 'products', 'visual', 'certifications', 'inquiries', 'assets', 'settings'];
        }

        function syncModuleSettingsView() {
            var enabled = 0;
            var disabled = 0;
            moduleKeys().forEach(function (key) {
                var input = document.getElementById('module-' + key);
                var card = input && input.closest ? input.closest('.module-toggle-card') : null;
                var state = document.querySelector('[data-module-state="' + key + '"]');
                if (input && isProtectedMenuKey(key)) {
                    input.checked = true;
                    input.disabled = true;
                }
                var isOn = !!(input && input.checked);
                if (isOn) enabled += 1;
                else disabled += 1;
                if (card) card.classList.toggle('is-on', isOn);
                if (card) card.classList.toggle('is-locked', isProtectedMenuKey(key));
                if (state) state.textContent = isOn ? '已显示' : '已隐藏';
            });
            var enabledEl = document.getElementById('module-enabled-count');
            var disabledEl = document.getElementById('module-disabled-count');
            var totalEl = document.getElementById('module-total-count');
            if (enabledEl) enabledEl.textContent = enabled;
            if (disabledEl) disabledEl.textContent = disabled;
            if (totalEl) totalEl.textContent = moduleKeys().length;
        }

        function loadMenuVisibilitySettings(options) {
            options = options || {};
            var statusEl = document.getElementById('module-settings-status');
            if (statusEl && !options.silent) statusEl.textContent = '加载中...';
            apiRequest('/admin/settings/modules').then(function (response) {
                var data = normalizeMenuVisibilitySettings(unwrapDataResponse(response) || {});
                moduleKeys().forEach(function (key) {
                    var input = document.getElementById('module-' + key);
                    if (input) input.checked = !!data[key];
                });
                applyMenuVisibilitySettings(data);
                syncModuleSettingsView();
                if (statusEl) statusEl.textContent = '已加载';
            }).catch(function (err) {
                if (statusEl) statusEl.textContent = '加载失败';
                showToast('加载菜单显示设置失败：' + err.message, 'error');
            });
        }

        function loadModuleSettings() {
            loadMenuVisibilitySettings();
        }

        function saveModuleSettings() {
            var body = {};
            var statusEl = document.getElementById('module-settings-status');
            moduleKeys().forEach(function (key) {
                var input = document.getElementById('module-' + key);
                if (input) body[key] = isProtectedMenuKey(key) ? true : !!input.checked;
            });
            if (statusEl) statusEl.textContent = '保存中...';
            apiRequest('/admin/settings/modules', {
                method: 'PUT',
                body: body
            }).then(function (response) {
                var data = normalizeMenuVisibilitySettings(unwrapDataResponse(response) || {});
                moduleKeys().forEach(function (key) {
                    var input = document.getElementById('module-' + key);
                    if (input) input.checked = !!data[key];
                });
                applyMenuVisibilitySettings(data);
                syncModuleSettingsView();
                if (statusEl) statusEl.textContent = '已保存';
                showToast('菜单显示设置已保存');
                resetFormDirty();
            }).catch(function (err) {
                if (statusEl) statusEl.textContent = '保存失败';
                showToast('保存菜单显示设置失败：' + err.message, 'error');
            });
        }

        function auditActionLabel(action) {
            var labels = {
                create: '新增',
                update: '修改',
                delete: '删除',
                soft_delete: '软删除',
                hard_delete: '永久删除',
                publish: '发布',
                unpublish: '取消发布',
                mark_read: '标记已读',
                close: '关闭'
            };
            return labels[action] || action || '—';
        }

        function loadAuditLogs() {
            var tbody = document.getElementById('audit-logs-tbody');
            if (!tbody) return;
            tbody.innerHTML = skeletonRows(6, 5);
            var entityFilter = document.getElementById('audit-entity-filter');
            var entityType = entityFilter ? entityFilter.value : '';
            var url = '/admin/audit-logs?page=' + encodeURIComponent(auditLogPage) + '&pageSize=20';
            if (entityType) url += '&entity_type=' + encodeURIComponent(entityType);

            apiRequest(url).then(function (response) {
                var rows = unwrapListResponse(response);
                auditLogMeta = response && response.meta ? response.meta : { page: auditLogPage, pageSize: 20, total: rows.length };
                renderAuditLogs(rows);
            }).catch(function (err) {
                tbody.innerHTML = emptyRow(6, '加载失败，请刷新重试');
                renderAuditLogDetail(null);
                showToast('加载审计日志失败：' + err.message, 'error');
            });
        }

        function renderAuditLogs(rows) {
            var tbody = document.getElementById('audit-logs-tbody');
            if (!tbody) return;
            auditRows = rows || [];
            if (!auditRows.length) {
                tbody.innerHTML = emptyRow(6, '暂无审计日志');
                activeAuditLogId = null;
                renderAuditLogDetail(null);
                renderAuditPagination();
                return;
            }
            auditRows.forEach(function (row, index) {
                row.__auditKey = row.id == null ? 'row-' + index : String(row.id);
            });
            if (!activeAuditLogId || !findAuditLogByKey(activeAuditLogId)) activeAuditLogId = auditRows[0].__auditKey;
            tbody.innerHTML = auditRows.map(function (row) {
                var active = String(row.__auditKey) === String(activeAuditLogId);
                return '<tr class="' + (active ? 'row-active' : '') + '" data-audit-row="' + escapeHtml(row.__auditKey) + '">' +
                    '<td>' + escapeHtml(formatDate(row.created_at)) + '</td>' +
                    '<td>' + escapeHtml(auditEntityLabel(row.entity_type)) + '</td>' +
                    '<td>' + escapeHtml(row.entity_id || '—') + '</td>' +
                    '<td><span class="badge badge-blue">' + escapeHtml(auditActionLabel(row.action)) + '</span></td>' +
                    '<td>' + escapeHtml(row.performed_by || '—') + '</td>' +
                    '<td class="cell-muted">' + escapeHtml(row.ip || '—') + '</td>' +
                    '</tr>';
            }).join('');
            tbody.querySelectorAll('[data-audit-row]').forEach(function (row) {
                row.addEventListener('click', function () {
                    selectAuditLog(row.getAttribute('data-audit-row'));
                });
            });
            renderAuditLogDetail(findAuditLogByKey(activeAuditLogId));
            renderAuditPagination();
        }

        function auditEntityLabel(type) {
            var labels = {
                product: '产品',
                certification: '证书',
                content_block: '内容块',
                inquiry: '询盘',
                settings: '设置',
                category: '分类'
            };
            return labels[type] || type || '—';
        }

        function findAuditLogByKey(key) {
            for (var i = 0; i < auditRows.length; i++) {
                if (String(auditRows[i].__auditKey) === String(key)) return auditRows[i];
            }
            return null;
        }

        function selectAuditLog(key) {
            activeAuditLogId = key;
            document.querySelectorAll('[data-audit-row]').forEach(function (row) {
                row.classList.toggle('row-active', String(row.getAttribute('data-audit-row')) === String(key));
            });
            renderAuditLogDetail(findAuditLogByKey(key));
        }

        function parseAuditPayload(value) {
            if (!value) return null;
            if (typeof value === 'object') return value;
            try {
                return JSON.parse(value);
            } catch (err) {
                return null;
            }
        }

        function auditValueText(value) {
            if (value == null || value === '') return '未设置';
            if (typeof value === 'boolean') return value ? '是' : '否';
            if (typeof value === 'object') {
                var text = Array.isArray(value) ? value.join(', ') : Object.keys(value).map(function (key) {
                    return key + ': ' + auditValueText(value[key]);
                }).join('；');
                return text.length > 120 ? text.slice(0, 120) + '...' : text;
            }
            var raw = String(value);
            return raw.length > 120 ? raw.slice(0, 120) + '...' : raw;
        }

        function auditChangeItems(beforeValue, afterValue) {
            var beforeObj = beforeValue && typeof beforeValue === 'object' && !Array.isArray(beforeValue) ? beforeValue : {};
            var afterObj = afterValue && typeof afterValue === 'object' && !Array.isArray(afterValue) ? afterValue : {};
            var keys = {};
            Object.keys(beforeObj).forEach(function (key) { keys[key] = true; });
            Object.keys(afterObj).forEach(function (key) { keys[key] = true; });
            return Object.keys(keys).filter(function (key) {
                return JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key]);
            }).slice(0, 8).map(function (key) {
                return { key: key, before: auditValueText(beforeObj[key]), after: auditValueText(afterObj[key]) };
            });
        }

        function renderAuditLogDetail(row) {
            var panel = document.getElementById('audit-log-detail');
            if (!panel) return;
            if (!row) {
                panel.className = 'audit-detail-empty';
                panel.innerHTML = '选择一条日志查看变更内容';
                return;
            }
            panel.className = 'audit-detail-content';
            var beforeValue = parseAuditPayload(row.before_json);
            var afterValue = parseAuditPayload(row.after_json);
            var changes = auditChangeItems(beforeValue, afterValue);
            var changesHtml = changes.length ? changes.map(function (item) {
                return '<div class="audit-change-item"><strong>' + escapeHtml(item.key) + '</strong><span>' + escapeHtml(item.before) + '</span><b>' + escapeHtml(item.after) + '</b></div>';
            }).join('') : '<div class="audit-change-empty">未发现字段差异，可能是状态批量操作或记录保留了完整快照。</div>';
            panel.innerHTML =
                '<div class="audit-detail-head"><strong>' + escapeHtml(auditEntityLabel(row.entity_type)) + ' #' + escapeHtml(row.entity_id || '—') + '</strong><span class="badge badge-blue">' + escapeHtml(auditActionLabel(row.action)) + '</span></div>' +
                '<dl class="audit-detail-meta">' +
                    '<div><dt>操作时间</dt><dd>' + escapeHtml(formatDate(row.created_at)) + '</dd></div>' +
                    '<div><dt>操作人</dt><dd>' + escapeHtml(row.performed_by || '—') + '</dd></div>' +
                    '<div><dt>IP 地址</dt><dd>' + escapeHtml(row.ip || '—') + '</dd></div>' +
                    '<div><dt>请求编号</dt><dd>' + escapeHtml(row.request_id || '—') + '</dd></div>' +
                '</dl>' +
                '<div class="audit-change-list"><div class="audit-change-heading"><span>字段</span><span>变更前</span><span>变更后</span></div>' + changesHtml + '</div>' +
                '<div class="audit-user-agent"><span>客户端</span><p>' + escapeHtml(row.user_agent || '—') + '</p></div>';
        }

        function renderAuditPagination() {
            var pageInfo = document.getElementById('audit-page-info');
            var prev = document.getElementById('btn-audit-prev');
            var next = document.getElementById('btn-audit-next');
            var total = auditLogMeta.total || 0;
            var pageSize = auditLogMeta.pageSize || 20;
            var totalPages = Math.max(1, Math.ceil(total / pageSize));
            if (auditLogPage > totalPages) auditLogPage = totalPages;
            if (pageInfo) pageInfo.textContent = '第 ' + auditLogPage + ' 页，共 ' + total + ' 条';
            if (prev) prev.disabled = auditLogPage <= 1;
            if (next) next.disabled = auditLogPage >= totalPages;
        }

        function bindEducationEvents() {
            var form = document.getElementById('education-form');
            if (form) form.addEventListener('submit', saveEducation);
            var imageInput = document.getElementById('education-image');
            if (imageInput) imageInput.addEventListener('change', uploadEducationImage);
            var editor = document.getElementById('education-editor');
            if (editor) {
                editor.addEventListener('click', function (e) {
                    var imageGridAction = e.target.closest('[data-visual-image-action]');
                    if (imageGridAction && editor.contains(imageGridAction)) {
                        e.preventDefault();
                        var imageGridField = imageGridAction.getAttribute('data-visual-image-field');
                        var imageGridIndex = parseInt(imageGridAction.getAttribute('data-visual-image-index'), 10);
                        var imageAction = imageGridAction.getAttribute('data-visual-image-action');
                        if (imageAction === 'select') openVisualImageGridAssetPicker(imageGridField, imageGridIndex);
                        if (imageAction === 'upload') openVisualImageGridUpload(imageGridField, imageGridIndex);
                        if (imageAction === 'remove') removeVisualImageGridItem(imageGridField, imageGridIndex);
                        if (imageAction === 'up' || imageAction === 'down') moveVisualImageGridItem(imageGridField, imageGridIndex, imageAction);
                        return;
                    }
                    var action = e.target.getAttribute('data-education-action');
                    if (!action) return;
                    e.preventDefault();
                    handleEducationAction(action, e.target);
                });
            }
        }

        function loadEducation() {
            var editor = document.getElementById('education-editor');
            if (editor) editor.innerHTML = '<div class="table-empty"><p>正在加载教育合作内容...</p></div>';
            apiRequest('/education').then(function (data) {
                educationContent = data;
                renderEducationEditor(data);
            }).catch(function (err) {
                if (editor) editor.innerHTML = '<div class="table-empty"><p>加载失败，请稍后重试。</p></div>';
                showToast('加载教育合作内容失败：' + err.message, 'error');
            });
        }

        function saveEducation(e) {
            e.preventDefault();
            var btn = document.getElementById('btn-save-education');
            try {
                var payload = collectEducationForm();
            } catch (err) {
                showToast(err.message, 'error');
                return;
            }
            if (btn) {
                btn.disabled = true;
                btn.textContent = '正在保存...';
            }
            apiRequest('/admin/content-blocks/education').then(function (response) {
                var block = unwrapDataResponse(response) || {};
                return apiRequest('/admin/content-blocks/education', {
                    method: 'PUT',
                    body: {
                        title_en: block.title_en || '',
                        body_json: payload,
                        version: block.version
                    }
                });
            }).then(function (response) {
                var block = unwrapDataResponse(response) || {};
                educationContent = block.body_json || payload;
                renderEducationEditor(educationContent);
                showToast('已保存，可刷新前台页面查看效果');
            }).catch(function (err) {
                showToast('保存教育合作内容失败：' + translateEducationError(err.message), 'error');
            }).finally(function () {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '保存修改';
                }
            });
        }

        function uploadEducationImage() {
            var file = this.files[0];
            if (!file) return;
            var formData = new FormData();
            formData.append('image', file);
            fetch(API_BASE + '/education/upload', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + getToken() },
                body: formData
            }).then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.error) throw new Error(data.error);
                    var pathInput = document.getElementById('education-upload-path');
                    if (pathInput) pathInput.value = data.path;
                    applyEducationUploadedPath(data.path);
                    showToast('图片已上传，并已填入所选位置');
                })
                .catch(function (err) { showToast('图片上传失败：' + translateEducationError(err.message), 'error'); });
        }

        function translateEducationError(message) {
            var text = String(message || '');
            if (text.indexOf('hero.title is required') !== -1) return '页面顶部主标题不能为空。';
            if (text.indexOf('No file uploaded') !== -1) return '请选择要上传的图片。';
            if (text.indexOf('Only jpeg') !== -1) return '只能上传 jpeg、jpg、png 或 webp 图片。';
            return text || '请检查填写内容后重试。';
        }

        function educationField(name, label, value, type, help, required) {
            type = type || 'text';
            var requiredMark = required ? ' <span class="required">*</span>' : '';
            var helpHtml = help ? '<p class="field-help">' + escapeHtml(help) + '</p>' : '';
            if (type === 'textarea') {
                return '<div class="form-group"><label>' + label + requiredMark + '</label><textarea data-edu-field="' + name + '" rows="3">' + escapeHtml(value || '') + '</textarea>' + helpHtml + '</div>';
            }
            return '<div class="form-group"><label>' + label + requiredMark + '</label><input type="' + type + '" data-edu-field="' + name + '" value="' + escapeHtml(value || '') + '">' + helpHtml + '</div>';
        }

        function educationListField(name, label, value, help) {
            return educationField(name, label, listToText(value), 'textarea', help || '每行填写一条内容，保存后会按列表显示。');
        }

        function educationImageGridField(name, label, value, maxItems, help) {
            var id = 'education-image-grid-' + String(name || '').replace(/[^a-zA-Z0-9_-]/g, '-');
            var limit = maxItems || 9;
            var images = visualNormalizeImageList(value, limit);
            var helpText = help || ('最多可选择 ' + limit + ' 张图片，支持资源库选择、本地上传、预览、删除和排序。');
            return '<div class="form-group education-image-grid-field visual-image-grid-field">' +
                '<label>' + escapeHtml(label) + '</label>' +
                '<div class="visual-image-grid-card" data-visual-image-grid-card="' + escapeHtml(id) + '">' +
                    '<div class="visual-image-grid-head"><span>已选择 <strong data-visual-image-count="' + escapeHtml(id) + '">' + images.length + '</strong> / ' + limit + ' 张</span><button type="button" class="btn btn-secondary btn-sm" title="' + (images.length >= limit ? '已达到数量上限，请先删除一张后再新增；已有图片仍可单独替换。' : '从本地上传并新增一张图片') + '" data-visual-image-action="upload" data-visual-image-field="' + escapeHtml(id) + '" data-visual-image-index="' + images.length + '"' + (images.length >= limit ? ' disabled' : '') + '>' + (images.length >= limit ? '已达上限' : '本地上传新增') + '</button></div>' +
                    '<input type="hidden" id="' + escapeHtml(id) + '" data-edu-field="' + escapeHtml(name) + '" data-visual-field-type="image-grid" data-visual-image-grid-max="' + limit + '" value="' + escapeHtml(JSON.stringify(images)) + '">' +
                    '<div class="visual-image-grid" data-visual-image-grid="' + escapeHtml(id) + '">' + renderVisualImageGridTiles(id, images, limit) + '</div>' +
                    '<small class="visual-image-grid-help">' + escapeHtml(helpText) + '</small>' +
                '</div>' +
            '</div>';
        }

        function educationImageGridValue(container, name, maxItems) {
            var el = container.querySelector('[data-edu-field="' + name + '"]');
            return el ? visualNormalizeImageList(el.value, maxItems || el.getAttribute('data-visual-image-grid-max') || 9) : [];
        }

        function appendEducationImageGridValue(container, name, path) {
            var el = container.querySelector('[data-edu-field="' + name + '"]');
            if (!el || !path) return false;
            var maxItems = parseInt(el.getAttribute('data-visual-image-grid-max'), 10) || 9;
            var images = visualNormalizeImageList(el.value, maxItems);
            if (images.length >= maxItems) {
                showToast('图片资料最多只能上传 ' + maxItems + ' 张', 'error');
                return true;
            }
            images.push(path);
            setVisualImageGridItems(el.id, images);
            return true;
        }

        function listToText(value) {
            return Array.isArray(value) ? value.join('\n') : (value || '');
        }

        function textToList(value) {
            return String(value || '').split(/\r?\n/).map(function (item) { return item.trim(); }).filter(Boolean);
        }

        function findEducationSection(id) {
            return (educationContent && educationContent.sections || []).filter(function (section) {
                return section.id === id;
            })[0] || null;
        }

        function editableEducationSections(data) {
            return (data.sections || []).filter(function (section) {
                return section.id !== 'gallery' && section.id !== 'cooperation-philosophy';
            });
        }

        function renderEducationEditor(data) {
            var editor = document.getElementById('education-editor');
            if (!editor) return;
            var hero = data.hero || {};
            var stats = data.stats || [];
            var sections = editableEducationSections(data);
            var gallery = findEducationSectionFrom(data, 'gallery') || {};
            var philosophy = findEducationSectionFrom(data, 'cooperation-philosophy') || {};
            var cta = data.cta || {};

            editor.innerHTML =
                '<div class="education-guide">' +
                    '<strong>填写顺序：看说明、填内容、保存并查看</strong>' +
                    '<span>每个模块只影响前台教育合作页面的一个区域。普通维护只需填写中文界面里的常用字段，阿拉伯语内容放在“更多语言内容”中。</span>' +
                '</div>' +
                '<div class="education-panel education-panel-blue">' +
                    educationPanelTitle('▣', '页面顶部展示', '管理访客第一眼看到的标题、简介和背景图。', '影响页面位置：教育合作页面最上方首屏。') +
                    '<div class="form-row">' +
                        educationField('hero.eyebrow', '小标题', hero.eyebrow, 'text', '示例：School-Enterprise Cooperation') +
                        educationField('hero.backgroundImage', '背景图路径', hero.backgroundImage, 'text', '示例：assets/education/images/longxiang-electrical-college-hero.png') +
                    '</div>' +
                    educationField('hero.title', '主标题', hero.title, 'textarea', '请填写页面顶部的大标题，否则前台首屏会缺少标题。', true) +
                    educationField('hero.subtitle', '简介', hero.subtitle, 'textarea', '简要说明教育合作能力，建议 1 到 2 句话。') +
                    educationLanguageDetails(
                        educationField('hero.titleAr', '阿拉伯语主标题', hero.titleAr) +
                        educationField('hero.subtitleAr', '阿拉伯语简介', hero.subtitleAr, 'textarea')
                    ) +
                '</div>' +
                '<div class="education-panel education-panel-gold">' +
                    educationPanelTitle('№', '核心数字', '管理页面上的实力数字和成果数字。', '影响页面位置：页面顶部下方的数字卡片区域。') +
                    '<div class="education-panel-head"><h3>数字卡片</h3><button type="button" class="btn btn-secondary" data-education-action="add-stat">新增数字</button></div>' +
                    '<div id="education-stats">' + stats.map(renderEducationStat).join('') + '</div>' +
                '</div>' +
                '<div class="education-panel education-panel-green">' +
                    educationPanelTitle('☰', '合作内容', '管理每一个合作方案板块，例如产业学院、人才培养、教学设备、国际合作。', '影响页面位置：页面主体内容，每个板块是一段完整介绍。') +
                    '<div class="education-panel-head"><h3>合作板块</h3><button type="button" class="btn btn-secondary" data-education-action="add-section">新增合作板块</button></div>' +
                    '<div id="education-sections">' + sections.map(renderEducationSection).join('') + '</div>' +
                '</div>' +
                '<div class="education-panel education-panel-purple">' +
                    educationPanelTitle('▧', '图片资料', '管理页面里的证明图片和现场图片。', '影响页面位置：集中展示学校、培训、合作现场等图片的区域。') +
                    educationField('gallery.title', '图片资料标题', gallery.title, 'text', '示例：Proof in Real Scenarios') +
                    educationField('gallery.summary', '图片资料说明', gallery.summary, 'textarea', '说明这些图片展示了哪些合作现场或证明材料。') +
                    educationImageGridField('gallery.images', '图片资料', gallery.images, 9, '最多 9 张。可从资源库选择或本地上传，保存后会自动更新前台九宫格。') +
                    educationLanguageDetails(
                        educationField('gallery.titleAr', '阿拉伯语图片资料标题', gallery.titleAr) +
                        educationField('gallery.summaryAr', '阿拉伯语图片资料说明', gallery.summaryAr, 'textarea')
                    ) +
                '</div>' +
                '<div class="education-panel education-panel-navy">' +
                    educationPanelTitle('¶', '合作理念', '管理页面底部偏总结性的理念文字。', '影响页面位置：合作理念总结区域。') +
                    educationField('philosophy.summary', '理念标题', philosophy.summary, 'text', '示例：Industry empowers education, education feeds industry.') +
                    educationListField('philosophy.body', '段落内容', philosophy.body, '每行代表一段，后台保存后前台会显示为多段文字。') +
                    educationLanguageDetails(
                        educationField('philosophy.summaryAr', '阿拉伯语理念标题', philosophy.summaryAr) +
                        educationListField('philosophy.bodyAr', '阿拉伯语段落内容', philosophy.bodyAr)
                    ) +
                '</div>' +
                '<div class="education-panel education-panel-red">' +
                    educationPanelTitle('☎', '联系引导', '管理引导客户联系公司的最后一段话。', '影响页面位置：页面底部联系咨询区域。') +
                    '<div class="form-row">' +
                        educationField('cta.title', '标题', cta.title, 'text', '示例：Start a Cooperation Plan for Your School') +
                        educationField('cta.href', '按钮跳转位置', cta.href || 'contact.html', 'text', '默认 contact.html，表示跳转到联系页面。') +
                    '</div>' +
                    educationField('cta.text', '说明文字', cta.text, 'textarea', '说明客户联系前可以准备哪些合作需求。') +
                    educationField('cta.buttonText', '按钮文字', cta.buttonText, 'text', '示例：Discuss Cooperation') +
                    educationLanguageDetails(
                        educationField('cta.titleAr', '阿拉伯语标题', cta.titleAr) +
                        educationField('cta.textAr', '阿拉伯语说明文字', cta.textAr, 'textarea') +
                        educationField('cta.buttonTextAr', '阿拉伯语按钮文字', cta.buttonTextAr)
                    ) +
                '</div>';

            refreshEducationUploadTargets();
        }

        function educationPanelTitle(icon, title, description, location) {
            return '<div class="education-module-head">' +
                '<span class="education-module-icon">' + icon + '</span>' +
                '<div><h3>' + title + '</h3><p>' + description + '</p><small>' + location + '</small></div>' +
                '</div>' +
                '<ol class="education-steps"><li>看说明</li><li>填内容</li><li>保存并查看</li></ol>';
        }

        function educationLanguageDetails(content) {
            return '<details class="education-advanced"><summary>更多语言内容（默认可不改）</summary>' +
                '<div class="education-advanced-body">' + content + '</div></details>';
        }

        function findEducationSectionFrom(data, id) {
            return (data.sections || []).filter(function (section) { return section.id === id; })[0] || null;
        }

        function renderEducationStat(stat, index) {
            return '<div class="education-repeat-item" data-edu-stat>' +
                '<div class="education-repeat-head"><strong>数字 ' + (index + 1) + '</strong><button type="button" class="btn btn-danger" data-education-action="remove-item">删除数字</button></div>' +
                '<div class="form-row-3">' +
                    educationField('stat.id', '内部标识', stat.id || ('stat-' + (index + 1)), 'text', '用于系统识别，建议使用英文或拼音，例如 industry-experience。') +
                    educationField('stat.value', '数字', stat.value, 'text', '示例：20+、2016、4。') +
                    educationField('stat.label', '说明文字', stat.label, 'text', '说明这个数字代表什么。') +
                '</div>' +
                educationLanguageDetails(educationField('stat.labelAr', '阿拉伯语说明文字', stat.labelAr)) +
                '</div>';
        }

        function renderEducationSection(section, index) {
            return '<div class="education-repeat-item" data-edu-section>' +
                '<div class="education-repeat-head"><strong>' + escapeHtml(section.title || ('合作板块 ' + (index + 1))) + '</strong><button type="button" class="btn btn-danger" data-education-action="remove-item">删除板块</button></div>' +
                '<div class="form-row-3">' +
                    educationField('section.id', '内部标识', section.id || ('section-' + (index + 1)), 'text', '用于锚点和系统识别，建议使用英文或拼音。') +
                    educationField('section.modeNumber', '板块编号', section.modeNumber || String(index + 1).padStart(2, '0'), 'text', '示例：01、02、03。') +
                    educationField('section.image', '主图路径', section.image, 'text', '上传图片后可选择“设为某个合作板块主图”自动填入。') +
                '</div>' +
                educationField('section.title', '板块标题', section.title, 'text', '示例：Co-built Industrial College') +
                educationField('section.tagline', '一句话亮点', section.tagline, 'text', '用一句话说明这个合作方案最突出的价值。') +
                educationField('section.summary', '详细说明', section.summary, 'textarea', '介绍这个合作板块的主要内容。') +
                educationListField('section.body', '补充段落', section.body, '每行代表一段，用于保留原有详细资料。') +
                educationField('section.bestFor', '适合对象', section.bestFor, 'textarea', '说明哪些学校、机构或项目适合这个合作方案。') +
                '<div class="form-row">' +
                    educationListField('section.deliverables', '交付内容', section.deliverables, '每行一条，说明龙翔可以提供什么。') +
                    educationListField('section.outcomes', '合作成果', section.outcomes, '每行一条，说明合作后能形成什么成果。') +
                '</div>' +
                educationListField('section.images', '证明图片', section.images, '每行一个图片路径；上传图片后可选择“加入某个合作板块证明图片”自动追加。') +
                educationLanguageDetails(
                    educationField('section.titleAr', '阿拉伯语板块标题', section.titleAr) +
                    educationField('section.taglineAr', '阿拉伯语一句话亮点', section.taglineAr) +
                    educationField('section.summaryAr', '阿拉伯语详细说明', section.summaryAr, 'textarea') +
                    educationListField('section.bodyAr', '阿拉伯语补充段落', section.bodyAr) +
                    educationField('section.bestForAr', '阿拉伯语适合对象', section.bestForAr, 'textarea') +
                    '<div class="form-row">' +
                        educationListField('section.deliverablesAr', '阿拉伯语交付内容', section.deliverablesAr) +
                        educationListField('section.outcomesAr', '阿拉伯语合作成果', section.outcomesAr) +
                    '</div>'
                ) +
                '<div class="education-panel-head"><h4>说明卡片</h4><button type="button" class="btn btn-secondary" data-education-action="add-card">新增说明卡片</button></div>' +
                '<div data-edu-cards>' + (section.cards || []).map(renderEducationCard).join('') + '</div>' +
                '</div>';
        }

        function renderEducationCard(card, index) {
            return '<div class="education-card-editor" data-edu-card>' +
                '<div class="education-repeat-head"><strong>说明卡片 ' + (index + 1) + '</strong><button type="button" class="btn btn-danger" data-education-action="remove-item">删除卡片</button></div>' +
                educationField('card.title', '卡片标题', card.title, 'text', '示例：Four Core Major Directions') +
                educationField('card.text', '卡片说明', card.text, 'textarea', '简短说明这个卡片要表达的重点。') +
                educationLanguageDetails(
                    educationField('card.titleAr', '阿拉伯语卡片标题', card.titleAr) +
                    educationField('card.textAr', '阿拉伯语卡片说明', card.textAr, 'textarea')
                ) +
                '</div>';
        }

        function handleEducationAction(action, target) {
            if (action === 'remove-item') {
                var item = target.closest('[data-edu-stat], [data-edu-section], [data-edu-card]');
                if (!item) return;
                var title = '删除内容';
                var message = '删除后该内容将不会在页面显示，是否继续？';
                if (item.hasAttribute('data-edu-stat')) {
                    title = '删除数字';
                    message = '删除后该数字卡片将不会在页面显示，是否继续？';
                } else if (item.hasAttribute('data-edu-section')) {
                    title = '删除合作板块';
                    message = '删除后该合作板块将不会在页面显示，是否继续？';
                } else if (item.hasAttribute('data-edu-card')) {
                    title = '删除说明卡片';
                    message = '删除后该说明卡片将不会在页面显示，是否继续？';
                }
                showConfirm(title, message).then(function (ok) {
                    if (!ok) return;
                    item.parentNode.removeChild(item);
                    refreshEducationUploadTargets();
                });
            }
            if (action === 'add-stat') {
                document.getElementById('education-stats').insertAdjacentHTML('beforeend', renderEducationStat({}, document.querySelectorAll('[data-edu-stat]').length));
                showToast('已新增数字，请填写数字和说明文字');
            }
            if (action === 'add-section') {
                document.getElementById('education-sections').insertAdjacentHTML('beforeend', renderEducationSection({}, document.querySelectorAll('[data-edu-section]').length));
                refreshEducationUploadTargets();
                showToast('已新增合作板块，请填写标题、说明和图片');
            }
            if (action === 'add-card') {
                var cards = target.closest('[data-edu-section]').querySelector('[data-edu-cards]');
                cards.insertAdjacentHTML('beforeend', renderEducationCard({}, cards.querySelectorAll('[data-edu-card]').length));
                showToast('已新增说明卡片');
            }
        }

        function fieldValue(container, name) {
            var el = container.querySelector('[data-edu-field="' + name + '"]');
            return el ? el.value.trim() : '';
        }

        function collectEducationForm() {
            var editor = document.getElementById('education-editor');
            if (!editor) throw new Error('教育合作编辑器尚未加载完成，请刷新后重试。');
            var payload = {
                hero: {
                    eyebrow: fieldValue(editor, 'hero.eyebrow'),
                    title: fieldValue(editor, 'hero.title'),
                    titleAr: fieldValue(editor, 'hero.titleAr'),
                    subtitle: fieldValue(editor, 'hero.subtitle'),
                    subtitleAr: fieldValue(editor, 'hero.subtitleAr'),
                    backgroundImage: fieldValue(editor, 'hero.backgroundImage')
                },
                stats: [],
                sections: [],
                gallery: {
                    title: fieldValue(editor, 'gallery.title'),
                    titleAr: fieldValue(editor, 'gallery.titleAr'),
                    summary: fieldValue(editor, 'gallery.summary'),
                    summaryAr: fieldValue(editor, 'gallery.summaryAr'),
                    images: educationImageGridValue(editor, 'gallery.images', 9)
                },
                philosophy: {
                    summary: fieldValue(editor, 'philosophy.summary'),
                    summaryAr: fieldValue(editor, 'philosophy.summaryAr'),
                    body: textToList(fieldValue(editor, 'philosophy.body')),
                    bodyAr: textToList(fieldValue(editor, 'philosophy.bodyAr'))
                },
                cta: {
                    title: fieldValue(editor, 'cta.title'),
                    titleAr: fieldValue(editor, 'cta.titleAr'),
                    text: fieldValue(editor, 'cta.text'),
                    textAr: fieldValue(editor, 'cta.textAr'),
                    buttonText: fieldValue(editor, 'cta.buttonText'),
                    buttonTextAr: fieldValue(editor, 'cta.buttonTextAr'),
                    href: fieldValue(editor, 'cta.href') || 'contact.html'
                }
            };
            editor.querySelectorAll('[data-edu-stat]').forEach(function (item) {
                payload.stats.push({
                    id: fieldValue(item, 'stat.id'),
                    value: fieldValue(item, 'stat.value'),
                    label: fieldValue(item, 'stat.label'),
                    labelAr: fieldValue(item, 'stat.labelAr')
                });
            });
            editor.querySelectorAll('[data-edu-section]').forEach(function (item) {
                var section = {
                    id: fieldValue(item, 'section.id'),
                    modeNumber: fieldValue(item, 'section.modeNumber'),
                    title: fieldValue(item, 'section.title'),
                    titleAr: fieldValue(item, 'section.titleAr'),
                    tagline: fieldValue(item, 'section.tagline'),
                    taglineAr: fieldValue(item, 'section.taglineAr'),
                    summary: fieldValue(item, 'section.summary'),
                    summaryAr: fieldValue(item, 'section.summaryAr'),
                    body: textToList(fieldValue(item, 'section.body')),
                    bodyAr: textToList(fieldValue(item, 'section.bodyAr')),
                    image: fieldValue(item, 'section.image'),
                    images: textToList(fieldValue(item, 'section.images')),
                    bestFor: fieldValue(item, 'section.bestFor'),
                    bestForAr: fieldValue(item, 'section.bestForAr'),
                    deliverables: textToList(fieldValue(item, 'section.deliverables')),
                    deliverablesAr: textToList(fieldValue(item, 'section.deliverablesAr')),
                    outcomes: textToList(fieldValue(item, 'section.outcomes')),
                    outcomesAr: textToList(fieldValue(item, 'section.outcomesAr')),
                    cards: []
                };
                item.querySelectorAll('[data-edu-card]').forEach(function (cardEl) {
                    section.cards.push({
                        title: fieldValue(cardEl, 'card.title'),
                        titleAr: fieldValue(cardEl, 'card.titleAr'),
                        text: fieldValue(cardEl, 'card.text'),
                        textAr: fieldValue(cardEl, 'card.textAr')
                    });
                });
                payload.sections.push(section);
            });
            if (!payload.hero.title) throw new Error('请填写主标题，否则页面顶部会缺少标题。');
            if (payload.gallery) {
                payload.sections.push({
                    id: 'gallery',
                    title: payload.gallery.title || '',
                    titleAr: payload.gallery.titleAr || '',
                    summary: payload.gallery.summary || '',
                    summaryAr: payload.gallery.summaryAr || '',
                    images: Array.isArray(payload.gallery.images) ? payload.gallery.images : [],
                    body: [],
                    bodyAr: [],
                    cards: []
                });
                delete payload.gallery;
            }
            if (payload.philosophy) {
                payload.sections.push({
                    id: 'cooperation-philosophy',
                    title: payload.philosophy.title || '',
                    titleAr: payload.philosophy.titleAr || '',
                    summary: payload.philosophy.summary || '',
                    summaryAr: payload.philosophy.summaryAr || '',
                    body: Array.isArray(payload.philosophy.body) ? payload.philosophy.body : [],
                    bodyAr: Array.isArray(payload.philosophy.bodyAr) ? payload.philosophy.bodyAr : [],
                    images: [],
                    cards: []
                });
                delete payload.philosophy;
            }
            return payload;
        }

        function refreshEducationUploadTargets() {
            var select = document.getElementById('education-upload-target');
            if (!select) return;
            var current = select.value;
            var options = [
                '<option value="hero.backgroundImage">设为页面顶部背景图</option>',
                '<option value="gallery.images">加入图片资料</option>'
            ];
            document.querySelectorAll('[data-edu-section]').forEach(function (section, index) {
                var title = fieldValue(section, 'section.title') || ('合作板块 ' + (index + 1));
                options.push('<option value="section.' + index + '.image">设为“' + escapeHtml(title) + '”主图</option>');
                options.push('<option value="section.' + index + '.images">加入“' + escapeHtml(title) + '”证明图片</option>');
            });
            select.innerHTML = options.join('');
            select.value = current && select.querySelector('option[value="' + current + '"]') ? current : 'hero.backgroundImage';
        }

        function appendLineValue(el, value) {
            if (!el) return;
            el.value = (el.value.trim() ? el.value.trim() + '\n' : '') + value;
        }

        function applyEducationUploadedPath(path) {
            var select = document.getElementById('education-upload-target');
            var target = select ? select.value : 'hero.backgroundImage';
            var editor = document.getElementById('education-editor');
            if (!editor) return;
            if (target === 'hero.backgroundImage') {
                var hero = editor.querySelector('[data-edu-field="hero.backgroundImage"]');
                if (hero) hero.value = path;
            } else if (target === 'gallery.images') {
                if (!appendEducationImageGridValue(editor, 'gallery.images', path)) {
                    appendLineValue(editor.querySelector('[data-edu-field="gallery.images"]'), path);
                }
            } else if (/^section\.(\d+)\.image$/.test(target)) {
                var imageMatch = target.match(/^section\.(\d+)\.image$/);
                var section = editor.querySelectorAll('[data-edu-section]')[Number(imageMatch[1])];
                if (section) section.querySelector('[data-edu-field="section.image"]').value = path;
            } else if (/^section\.(\d+)\.images$/.test(target)) {
                var listMatch = target.match(/^section\.(\d+)\.images$/);
                var listSection = editor.querySelectorAll('[data-edu-section]')[Number(listMatch[1])];
                if (listSection) appendLineValue(listSection.querySelector('[data-edu-field="section.images"]'), path);
            }
        }

        function bindModalClose(modalId, buttonIds) {
            buttonIds.forEach(function (id) {
                var btn = document.getElementById(id);
                if (btn) btn.addEventListener('click', function () { closeModal(modalId); });
            });
            var modal = document.getElementById(modalId);
            if (modal) {
                modal.addEventListener('click', function (e) {
                    if (e.target === modal) closeModal(modalId);
                });
            }
        }

        function showModal(modalId) {
            var modal = document.getElementById(modalId);
            if (!modal) return;
            modal.classList.add('show');
            trapFocus(modal, function () { closeModal(modalId); });
        }

        function closeModal(modalId, force) {
            if (!force && !confirmDiscardChanges()) return false;
            var modal = document.getElementById(modalId);
            if (modal) {
                releaseFocusTrap(modal);
                modal.classList.remove('show');
            }
            if (modalId === 'product-modal') resetProductModalState();
            if (modalId === 'certification-modal') editingCertificationId = null;
            if (modalId === 'inquiry-modal') resetInquiryModalState();
            if (activeModalTrigger && activeModalTrigger.focus) activeModalTrigger.focus();
            activeModalTrigger = null;
            return true;
        }

        function formatDate(value) {
            if (!value) return '-';
            var date = new Date(value);
            if (isNaN(date.getTime())) return value;
            return date.toLocaleString('zh-CN', { hour12: false });
        }
    }
})();
