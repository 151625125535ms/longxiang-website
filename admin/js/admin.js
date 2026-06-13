(function () {
    'use strict';

    var API_BASE = '/api';
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
    var ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    var ICON_DELETE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
    var ICON_VIEW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

    function getToken() {
        return localStorage.getItem('admin_token');
    }

    function setToken(token) {
        localStorage.setItem('admin_token', token);
    }

    function removeToken() {
        localStorage.removeItem('admin_token');
    }

    function getUsername() {
        return localStorage.getItem('admin_username') || 'admin';
    }

    function setUsername(name) {
        localStorage.setItem('admin_username', name);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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
            if (res.status === 401 || res.status === 403) {
                removeToken();
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
                    throw err;
                }
                return data;
            });
        });
    }

    function unwrapDataResponse(response) {
        if (response && response.ok && response.data !== undefined) return response.data;
        return response;
    }

    function unwrapListResponse(response) {
        if (response && response.ok && response.data && response.data.items) return response.data.items;
        if (response && response.ok && Array.isArray(response.data)) return response.data;
        if (response && response.items) return response.items;
        if (Array.isArray(response)) return response;
        return [];
    }

    function showToast(message, type) {
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
    }

    function showConfirm(title, message) {
        return new Promise(function (resolve) {
            var overlay = document.getElementById('confirm-overlay');
            var titleEl = document.getElementById('confirm-title');
            var msgEl = document.getElementById('confirm-message');
            var btnOk = document.getElementById('confirm-ok');
            var btnCancel = document.getElementById('confirm-cancel');

            titleEl.textContent = title;
            msgEl.textContent = message;
            overlay.classList.add('show');

            function cleanup() {
                overlay.classList.remove('show');
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
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

        var products = [];
        var inquiries = [];
        var certifications = [];
        var certificationCategoryMap = {};
        var certificationViewRows = {};
        var certsByView = {};
        var contentBlockCache = {};
        var trashedProducts = [];
        var trashedCerts = [];
        var educationContent = null;
        var editingProductId = null;
        var editingProductVersion = null;
        var uploadedImagePath = '';
        var productCategories = [];
        var productSearchTimer = null;
        var editingInquiryId = null;
        var openedInquiry = null;
        var editingCertificationId = null;
        var uploadedCertificationPath = '';
        var currentView = 'dashboard';
        var productPage = 1;
        var productMeta = { page: 1, pageSize: 20, total: 0 };
        var inquiryPage = 1;
        var inquiryMeta = { page: 1, pageSize: 20, total: 0 };
        var inquirySearchTimer = null;
        var inquiryUnreadOnly = false;
        var certPageByView = {};
        var certMetaByView = {};
        var certSearchTimers = {};
        var auditLogPage = 1;
        var auditLogMeta = { page: 1, pageSize: 20, total: 0 };
        var assetPage = 1;
        var assetMeta = { page: 1, pageSize: 20, total: 0 };

        var usernameEl = document.getElementById('sidebar-username');
        var avatarEl = document.getElementById('sidebar-avatar');
        if (usernameEl) usernameEl.textContent = getUsername();
        if (avatarEl) avatarEl.textContent = getUsername().charAt(0).toUpperCase();

        bindNavigation();
        bindDashboardActions();
        bindProductEvents();
        bindInquiryEvents();
        bindCompanyEvents();
        bindCertificationEvents();
        bindCategoryEvents();
        bindEducationEvents();
        bindContentBlockEvents();
        bindSystemSettingsEvents();
        bindTrashEvents();
        bindAssetsEvents();
        loadProductCategories();
        loadCertificationCategories();
        switchView('dashboard');

        function bindNavigation() {
            document.querySelectorAll('.sidebar-nav a[data-view]').forEach(function (link) {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    switchView(link.getAttribute('data-view'));
                    closeMobileSidebar();
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

        function switchView(view) {
            currentView = view;
            document.querySelectorAll('.sidebar-nav a[data-view]').forEach(function (link) {
                link.classList.toggle('active', link.getAttribute('data-view') === view);
            });
            document.querySelectorAll('.view-section').forEach(function (section) { section.classList.remove('active'); });

            var activeView = document.getElementById('view-' + view);
            if (activeView) activeView.classList.add('active');

            var titles = {
                dashboard: '控制台',
                products: '产品管理',
                inquiries: '询盘管理',
                company: '公司信息',
                certifications: '证书管理',
                categories: '分类管理',
                'content-company-overview': '企业概况',
                'content-contact': '联系我们',
                'content-about': '关于我们',
                'content-technology': '科技创新',
                'content-industries': '应用行业',
                'content-education': '教育合作',
                'content-page-blocks': '页面区块',
                'cert-qualifications': '企业资质',
                'cert-patents': '专利证书',
                'cert-software': '软著',
                'cert-test-reports': '检测报告',
                trash: '回收站',
                assets: '资源库',
                'system-status': '系统状态',
                'settings-modules': '模块开关',
                'audit-logs': '审计日志'
            };
            document.getElementById('header-title').textContent = titles[view] || (view === 'education' ? '教育合作内容管理' : '');

            if (view === 'dashboard') loadDashboard();
            if (view === 'products') loadProducts();
            if (view === 'categories') loadProductCategoriesView();
            if (view === 'inquiries') loadInquiries();
            if (view === 'cert-qualifications') loadCertView(view);
            if (view === 'cert-patents') loadCertView(view);
            if (view === 'cert-software') loadCertView(view);
            if (view === 'cert-test-reports') loadCertView(view);
            if (view === 'content-company-overview') loadContentBlock(view);
            if (view === 'content-contact') loadContentBlock(view);
            if (view === 'content-about') loadContentBlock(view);
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
        }

        function loadDashboard() {
            ['stat-total', 'stat-featured', 'stat-categories', 'stat-inquiries', 'stat-new-inquiries'].forEach(function (id) { setText(id, '—'); });
            apiRequest('/admin/dashboard').then(function (response) {
                var data = unwrapDataResponse(response) || {};
                inquiries = data.recentInquiries || [];
                renderDashboard(data);
            }).catch(function (err) {
                showToast('加载控制台失败：' + err.message, 'error');
            });
        }

        function renderDashboard(data) {
            data = data || {};
            var productStats = data.products || {};
            var inquiryStats = data.inquiries || {};

            setText('stat-total', productStats.total || 0);
            setText('stat-featured', '—');
            setText('stat-categories', '—');
            setText('stat-inquiries', inquiryStats.total || 0);
            setText('stat-new-inquiries', inquiryStats.new || 0);

            var catGrid = document.getElementById('category-stats');
            if (catGrid) {
                catGrid.innerHTML = '<div class="category-stat-card"><span class="badge badge-navy">—</span><div><div class="category-stat-count">—</div><div class="category-stat-label">分类统计待接入</div></div></div>';
            }

            renderRecentInquiries();
        }

        function renderRecentInquiries() {
            var container = document.getElementById('recent-inquiries-list');
            if (!container) return;

            var sorted = inquiries.slice().sort(function (a, b) {
                return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0);
            }).slice(0, 6);

            if (!sorted.length) {
                container.innerHTML = '<p class="recent-inquiries-empty">暂无询盘记录</p>';
                return;
            }

            container.innerHTML = sorted.map(function (item) {
                var isNew = item.status === 'new';
                var name = escapeHtml(item.name || '—');
                var subject = escapeHtml(item.subject || item.product || '（无主题）');
                var createdAt = item.created_at || item.createdAt;
                var date = createdAt ? new Date(createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
                var status = escapeHtml(STATUS_LABELS[item.status] || item.status || '');
                return '<div class="recent-inquiry-item" data-id="' + escapeHtml(item.id) + '" role="button" tabindex="0" aria-label="查看询盘：' + name + '">' +
                    '<div class="recent-inquiry-dot' + (isNew ? ' new' : '') + '"></div>' +
                    '<div class="recent-inquiry-info">' +
                        '<div class="recent-inquiry-name">' + name + '</div>' +
                        '<div class="recent-inquiry-subject">' + subject + (status ? ' · ' + status : '') + '</div>' +
                    '</div>' +
                    '<div class="recent-inquiry-time">' + date + '</div>' +
                    '</div>';
            }).join('');

            container.querySelectorAll('.recent-inquiry-item').forEach(function (el) {
                el.addEventListener('click', function () {
                    var id = el.getAttribute('data-id');
                    if (id) openInquiryModal(id);
                });
                el.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') el.click();
                });
            });
        }

        function bindDashboardActions() {
            document.querySelectorAll('[data-action]').forEach(function (el) {
                el.addEventListener('click', function () {
                    var action = el.getAttribute('data-action');
                    if (action === 'add-product') {
                        switchView('products');
                        setTimeout(function () {
                            var btn = document.getElementById('btn-add-product');
                            if (btn) btn.click();
                        }, 50);
                    } else if (action === 'view-inquiries') {
                        switchView('inquiries');
                    } else if (action === 'view-products') {
                        switchView('products');
                    } else if (action === 'view-company') {
                        switchView('content-company-overview');
                    }
                });
                el.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') el.click();
                });
            });
        }

        function setText(id, value) {
            var el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        function skeletonRows(cols, count) {
            var widths = ['70%', '50%', '45%', '60%', '35%', '55%'];
            var cells = '';
            for (var i = 0; i < cols; i++) {
                cells += '<td><div class="skeleton" style="width:' + widths[i % widths.length] + '"></div></td>';
            }
            var result = '';
            for (var j = 0; j < count; j++) {
                result += '<tr class="skeleton-row">' + cells + '</tr>';
            }
            return result;
        }

        function loadProducts() {
            document.getElementById('products-tbody').innerHTML = skeletonRows(6, 5);
            updateProductBatchBar();
            var searchVal = ((document.getElementById('product-search') || {}).value || '').trim();
            var catVal = (document.getElementById('product-category-filter') || {}).value || '';
            var statusVal = (document.getElementById('product-status-filter') || {}).value || '';
            var featuredVal = (document.getElementById('product-featured-filter') || {}).value || '';
            var url = '/admin/products?page=' + encodeURIComponent(productPage) + '&pageSize=' + encodeURIComponent(productMeta.pageSize || 20);
            if (searchVal) url += '&q=' + encodeURIComponent(searchVal);
            if (catVal) url += '&category=' + encodeURIComponent(catVal);
            if (statusVal) url += '&status=' + encodeURIComponent(statusVal);
            if (featuredVal !== '') url += '&featured=' + encodeURIComponent(featuredVal);
            updateProductClearFilters();

            apiRequest(url).then(function (response) {
                products = unwrapListResponse(response);
                productMeta = response && response.meta ? response.meta : { page: productPage, pageSize: productMeta.pageSize || 20, total: products.length };
                renderProductsTable();
                renderProductsPagination();
            }).catch(function (err) {
                document.getElementById('products-tbody').innerHTML = '<tr><td colspan="6" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
                renderProductsPagination({ page: 1, pageSize: productMeta.pageSize || 20, total: 0 });
                showToast('加载产品失败：' + err.message, 'error');
            });
        }

        function renderProductsPagination(metaOverride) {
            var pagination = document.getElementById('products-pagination');
            if (!window.renderPagination || !pagination) return;
            window.renderPagination(pagination, metaOverride || productMeta, function (nextPage) {
                productPage = nextPage;
                loadProducts();
            });
        }

        function updateProductClearFilters() {
            var btn = document.getElementById('product-clear-filters');
            if (!btn) return;
            var hasFilters = [
                ((document.getElementById('product-search') || {}).value || '').trim(),
                (document.getElementById('product-category-filter') || {}).value || '',
                (document.getElementById('product-status-filter') || {}).value || '',
                (document.getElementById('product-featured-filter') || {}).value || ''
            ].some(Boolean);
            btn.style.display = hasFilters ? '' : 'none';
        }

        function renderProductsTable() {
            var tbody = document.getElementById('products-tbody');
            if (!tbody) return;

            if (!products.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="table-empty"><p>' + (products.length ? '无匹配产品' : '暂无产品') + '</p></td></tr>';
                updateProductBatchBar();
                return;
            }

            tbody.innerHTML = products.map(function (product) {
                var productId = product.id;
                var displayId = product.legacy_id || product.slug || product.id;
                var name = product.name_en || product.name || '';
                var categoryName = product.category_name_en || product.category || '—';
                var status = product.status || 'draft';
                var statusClass = status === 'published' ? 'badge-green' : (status === 'deleted' ? 'badge-navy' : 'badge-gold');
                var statusLabel = status === 'published' ? '已发布' : (status === 'deleted' ? '已删除' : '草稿');
                var cover = product.cover_image || product.image || '';
                var thumb = cover
                    ? '<img class="product-thumb" src="../' + escapeHtml(cover) + '" alt="">'
                    : '<div class="product-thumb" style="background:#eef1f5;border:1px solid #d8dee8;"></div>';
                return '<tr>' +
                    '<td><input type="checkbox" class="product-row-check" data-id="' + escapeHtml(productId) + '" data-version="' + escapeHtml(product.version) + '"></td>' +
                    '<td><div class="product-name-cell">' + thumb + '<div><div class="product-name-text">' + escapeHtml(name) + '</div><div class="product-id-text">' + escapeHtml(displayId) + '</div></div></div></td>' +
                    '<td><span class="badge badge-blue">' + escapeHtml(categoryName) + '</span></td>' +
                    '<td><span class="badge ' + statusClass + '">' + statusLabel + '</span></td>' +
                    '<td class="cell-muted">' + escapeHtml(product.short_desc_en || product.shortDesc || '') + '</td>' +
                    '<td><div class="actions-cell"><button class="btn btn-icon btn-icon-edit" aria-label="编辑产品" data-edit-product="' + escapeHtml(productId) + '">' + ICON_EDIT + '</button><button class="btn btn-icon btn-icon-delete" aria-label="删除产品" data-delete-product="' + escapeHtml(productId) + '">' + ICON_DELETE + '</button></div></td>' +
                    '</tr>';
            }).join('');

            tbody.querySelectorAll('[data-edit-product]').forEach(function (btn) {
                btn.addEventListener('click', function () { openProductModal(btn.getAttribute('data-edit-product')); });
            });
            tbody.querySelectorAll('[data-delete-product]').forEach(function (btn) {
                btn.addEventListener('click', function () { deleteProduct(btn.getAttribute('data-delete-product')); });
            });
            tbody.querySelectorAll('.product-row-check').forEach(function (checkbox) {
                checkbox.addEventListener('change', updateProductBatchBar);
            });
            updateProductBatchBar();
        }

        function findProductById(productId) {
            for (var i = 0; i < products.length; i++) {
                if (String(products[i].id) === String(productId)) return products[i];
            }
            return null;
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
            var btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', function () { batchProductAction(action); });
        }

        function getSelectedProductIds() {
            var ids = [];
            document.querySelectorAll('.product-row-check:checked').forEach(function (checkbox) {
                var id = parseInt(checkbox.getAttribute('data-id'), 10);
                if (!isNaN(id)) ids.push(id);
            });
            return ids;
        }

        function updateProductBatchBar() {
            var selected = document.querySelectorAll('.product-row-check:checked');
            var all = document.querySelectorAll('.product-row-check');
            var bar = document.getElementById('product-batch-bar');
            var count = document.getElementById('product-batch-count');
            var selectAll = document.getElementById('product-select-all');
            if (count) count.textContent = '已选 ' + selected.length + ' 条';
            if (bar) bar.style.display = selected.length ? '' : 'none';
            if (selectAll) {
                selectAll.checked = all.length > 0 && selected.length === all.length;
                selectAll.indeterminate = selected.length > 0 && selected.length < all.length;
            }
        }

        function batchProductAction(action) {
            var ids = getSelectedProductIds();
            if (!ids.length) {
                showToast('请先选择产品', 'error');
                return;
            }
            var requireConfirm = action === 'hard_delete';
            var message = '确定永久删除这 ' + ids.length + ' 条产品吗？此操作不可恢复，将同时删除规格和媒体数据。';
            runBatchAction('/admin/products/batch', action, ids, buildVersionMap(ids, products), requireConfirm, message).then(function () {
                showToast('已对 ' + ids.length + ' 条产品执行：' + batchActionLabel(action));
                loadProducts();
                var bar = document.getElementById('product-batch-bar');
                if (bar) bar.style.display = 'none';
            }).catch(function (err) {
                if (err && err.message === 'cancelled') return;
            });
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

        function populateProductCategorySelects() {
            var filter = document.getElementById('product-category-filter');
            var field = document.getElementById('field-category');
            var filterValue = filter ? filter.value : '';
            var fieldValue = field ? field.value : '';
            var filterOptions = '<option value="">全部分类</option>';
            var fieldOptions = '<option value="">选择分类</option>';

            productCategories.forEach(function (category) {
                var value = category.id;
                var label = category.name_en || category.slug || ('#' + category.id);
                var option = '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>';
                filterOptions += option;
                fieldOptions += option;
            });

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
                return;
            }

            tbody.innerHTML = productCategories.map(function (category) {
                var active = category.is_active !== 0;
                return '<tr>' +
                    '<td>' + escapeHtml(category.name_en || '—') + '</td>' +
                    '<td class="cell-muted">' + escapeHtml(category.slug || '') + '</td>' +
                    '<td>' + escapeHtml(category.sort_order || 0) + '</td>' +
                    '<td><span class="badge ' + (active ? 'badge-green' : 'badge-navy') + '">' + (active ? '启用' : '停用') + '</span></td>' +
                    '<td><div class="actions-cell"><button class="btn btn-icon btn-icon-edit" aria-label="编辑分类" data-edit-category="' + escapeHtml(category.id) + '">' + ICON_EDIT + '</button><button class="btn btn-icon btn-icon-delete" aria-label="删除分类" data-delete-category="' + escapeHtml(category.id) + '">' + ICON_DELETE + '</button></div></td>' +
                    '</tr>';
            }).join('');

            tbody.querySelectorAll('[data-edit-category]').forEach(function (btn) {
                btn.addEventListener('click', function () { openCategoryModal(btn.getAttribute('data-edit-category')); });
            });
            tbody.querySelectorAll('[data-delete-category]').forEach(function (btn) {
                btn.addEventListener('click', function () { deleteCategory(btn.getAttribute('data-delete-category')); });
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
            var form = document.getElementById('category-form');
            var title = document.getElementById('category-modal-title');
            var slug = document.getElementById('cat-slug');
            var activeGroup = document.getElementById('cat-active-group');
            form.reset();
            document.getElementById('cat-editing-id').value = id || '';
            document.getElementById('cat-sort-order').value = '0';
            slug.disabled = !!id;

            if (id) {
                var category = findProductCategory(id);
                title.textContent = '编辑分类';
                activeGroup.style.display = '';
                if (category) {
                    slug.value = category.slug || '';
                    document.getElementById('cat-name-en').value = category.name_en || '';
                    document.getElementById('cat-name-ar').value = category.name_ar || '';
                    document.getElementById('cat-sort-order').value = category.sort_order || 0;
                    document.getElementById('cat-is-active').checked = category.is_active !== 0;
                }
            } else {
                title.textContent = '新增分类';
                activeGroup.style.display = 'none';
                document.getElementById('cat-is-active').checked = true;
            }
            document.getElementById('category-modal').classList.add('show');
        }

        function saveCategoryModal() {
            var id = document.getElementById('cat-editing-id').value;
            var slug = document.getElementById('cat-slug').value.trim();
            var nameEn = document.getElementById('cat-name-en').value.trim();
            var nameAr = document.getElementById('cat-name-ar').value.trim();
            var sortOrder = parseInt(document.getElementById('cat-sort-order').value, 10);
            if (!nameEn) {
                showToast('请填写英文名称', 'error');
                return;
            }
            if (!id && !slug) {
                showToast('请填写 Slug', 'error');
                return;
            }
            if (isNaN(sortOrder)) sortOrder = 0;

            var payload = id ? {
                name_en: nameEn,
                name_ar: nameAr,
                sort_order: sortOrder,
                is_active: document.getElementById('cat-is-active').checked
            } : {
                type: 'product',
                slug: slug,
                name_en: nameEn,
                name_ar: nameAr,
                sort_order: sortOrder
            };

            var request = id
                ? apiRequest('/admin/categories/' + encodeURIComponent(id), { method: 'PUT', body: payload })
                : apiRequest('/admin/categories', { method: 'POST', body: payload });

            request.then(function () {
                showToast('分类已保存');
                closeModal('category-modal');
                loadProductCategoriesView();
                loadProductCategories();
            }).catch(function (err) {
                if (err.status === 422) {
                    showToast('Slug 已存在，请换一个', 'error');
                    return;
                }
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
            var btnAddProduct = document.getElementById('btn-add-product');
            if (btnAddProduct) btnAddProduct.addEventListener('click', function () { openProductModal(null); });

            var productSearch = document.getElementById('product-search');
            if (productSearch) productSearch.addEventListener('input', function () {
                clearTimeout(productSearchTimer);
                productSearchTimer = setTimeout(function () {
                    productPage = 1;
                    loadProducts();
                }, 250);
            });
            ['product-category-filter', 'product-status-filter', 'product-featured-filter'].forEach(function (id) {
                var filter = document.getElementById(id);
                if (filter) {
                    filter.addEventListener('change', function () {
                        productPage = 1;
                        loadProducts();
                    });
                }
            });
            var clearProductFilters = document.getElementById('product-clear-filters');
            if (clearProductFilters) {
                clearProductFilters.addEventListener('click', function () {
                    ['product-search', 'product-category-filter', 'product-status-filter', 'product-featured-filter'].forEach(function (id) {
                        var field = document.getElementById(id);
                        if (field) field.value = '';
                    });
                    productPage = 1;
                    loadProducts();
                });
            }

            var productSelectAll = document.getElementById('product-select-all');
            if (productSelectAll) {
                productSelectAll.addEventListener('change', function () {
                    document.querySelectorAll('.product-row-check').forEach(function (checkbox) {
                        checkbox.checked = productSelectAll.checked;
                    });
                    updateProductBatchBar();
                });
            }
            bindProductBatchButton('btn-batch-publish-products', 'publish');
            bindProductBatchButton('btn-batch-draft-products', 'draft');
            bindProductBatchButton('btn-batch-delete-products', 'soft_delete');
            bindProductBatchButton('btn-batch-hard-delete-products', 'hard_delete');

            bindModalClose('product-modal', ['modal-close', 'modal-cancel']);

            var imageInput = document.getElementById('field-image');
            if (imageInput) imageInput.addEventListener('change', uploadProductImage);

            var btnAddSpec = document.getElementById('btn-add-spec');
            if (btnAddSpec) btnAddSpec.addEventListener('click', function () { addSpecRow('', ''); });

            var form = document.getElementById('product-form');
            if (form) form.addEventListener('submit', saveProduct);

            [['field-id','input'],['field-name','input'],['field-category','change']].forEach(function (pair) {
                var el = document.getElementById(pair[0]);
                if (el) el.addEventListener(pair[1], function () { clearFieldError(pair[0]); });
            });
        }

        function openProductModal(productId) {
            editingProductId = productId;
            editingProductVersion = null;
            uploadedImagePath = '';
            var modal = document.getElementById('product-modal');
            var title = document.getElementById('modal-title');
            var form = document.getElementById('product-form');
            form.reset();
            document.getElementById('image-preview').style.display = 'none';
            document.getElementById('image-preview').innerHTML = '';
            document.getElementById('upload-area').style.display = '';
            document.getElementById('field-id').disabled = !!productId;
            populateProductCategorySelects();

            if (productId) {
                title.textContent = '编辑产品';
                var listed = findProductById(productId);
                editingProductVersion = listed ? listed.version : null;
                apiRequest('/admin/products/' + encodeURIComponent(productId)).then(function (response) {
                    var product = unwrapDataResponse(response) || {};
                    if (editingProductVersion == null) editingProductVersion = product.version;
                    fillProductForm(product);
                }).catch(function (err) { showToast('加载产品失败：' + err.message, 'error'); });
            } else {
                title.textContent = '新增产品';
            }
            modal.classList.add('show');
        }

        function fillProductForm(product) {
            var fields = {
                'field-id': product.legacy_id || product.slug || product.id || '',
                'field-name': product.name_en || '',
                'field-nameAr': product.name_ar || '',
                'field-shortDesc': product.short_desc_en || '',
                'field-shortDescAr': product.short_desc_ar || '',
                'field-description': product.description_en || '',
                'field-descriptionAr': product.description_ar || ''
            };
            Object.keys(fields).forEach(function (id) {
                var field = document.getElementById(id);
                if (field) field.value = fields[id];
            });
            var categoryField = document.getElementById('field-category');
            if (categoryField) categoryField.value = product.category_id || '';
            document.getElementById('field-featured').checked = !!product.featured;
            uploadedImagePath = product.cover_image || '';
            if (uploadedImagePath) showImagePreview('../' + uploadedImagePath);
        }

        function uploadProductImage() {
            var file = this.files[0];
            if (!file) return;
            showImagePreview(URL.createObjectURL(file));

            var formData = new FormData();
            formData.append('image', file);
            fetch(API_BASE + '/products/upload', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + getToken() },
                body: formData
            }).then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.error) throw new Error(data.error);
                    uploadedImagePath = data.path;
                    showToast('图片上传成功');
                })
                .catch(function (err) { showToast('图片上传失败：' + err.message, 'error'); });
        }

        function showImagePreview(src) {
            var preview = document.getElementById('image-preview');
            var uploadArea = document.getElementById('upload-area');
            uploadArea.style.display = 'none';
            preview.style.display = '';
            preview.innerHTML = '<img src="' + src + '" alt="Preview"><span class="remove-image" id="remove-image">&times;</span>';
            document.getElementById('remove-image').addEventListener('click', function () {
                uploadedImagePath = '';
                preview.innerHTML = '';
                preview.style.display = 'none';
                uploadArea.style.display = '';
                document.getElementById('field-image').value = '';
            });
        }

        function addSpecRow(key, value) {
            var row = document.createElement('div');
            row.className = 'spec-row';
            row.innerHTML = '<input type="text" class="spec-key" placeholder="参数名" value="' + escapeHtml(key) + '"><input type="text" class="spec-value" placeholder="参数值" value="' + escapeHtml(value) + '"><button type="button" class="btn-remove-spec">×</button>';
            row.querySelector('.btn-remove-spec').addEventListener('click', function () { row.remove(); });
            document.getElementById('specs-list').appendChild(row);
        }

        function getSpecsFromForm() {
            var specs = [];
            document.querySelectorAll('#specs-list .spec-row').forEach(function (row) {
                var key = row.querySelector('.spec-key').value.trim();
                var value = row.querySelector('.spec-value').value.trim();
                if (key || value) specs.push([key, value]);
            });
            return specs;
        }

        function showFieldError(fieldId, message) {
            var field = document.getElementById(fieldId);
            if (!field) return;
            field.classList.add('input-error');
            field.setAttribute('aria-invalid', 'true');
            var existing = field.parentNode.querySelector('.field-error-msg');
            if (!existing) {
                existing = document.createElement('span');
                existing.className = 'field-error-msg';
                existing.setAttribute('role', 'alert');
                field.parentNode.appendChild(existing);
            }
            existing.textContent = message;
        }

        function clearFieldError(fieldId) {
            var field = document.getElementById(fieldId);
            if (!field) return;
            field.classList.remove('input-error');
            field.removeAttribute('aria-invalid');
            var msg = field.parentNode.querySelector('.field-error-msg');
            if (msg) msg.parentNode.removeChild(msg);
        }

        function saveProduct(e) {
            e.preventDefault();
            var id = document.getElementById('field-id').value.trim();
            var name = document.getElementById('field-name').value.trim();
            var category = document.getElementById('field-category').value;

            ['field-id', 'field-name', 'field-category'].forEach(clearFieldError);
            var valid = true;
            if (!id) { showFieldError('field-id', '请填写产品 ID'); valid = false; }
            if (!name) { showFieldError('field-name', '请填写英文名称'); valid = false; }
            if (!category) { showFieldError('field-category', '请选择分类'); valid = false; }
            if (!valid) return;

            var payload = {
                legacy_id: id,
                name_en: name,
                name_ar: document.getElementById('field-nameAr').value.trim(),
                category_id: parseInt(category, 10),
                short_desc_en: document.getElementById('field-shortDesc').value.trim(),
                short_desc_ar: document.getElementById('field-shortDescAr').value.trim(),
                description_en: document.getElementById('field-description').value.trim(),
                description_ar: document.getElementById('field-descriptionAr').value.trim(),
                featured: document.getElementById('field-featured').checked
            };
            if (editingProductId) payload.version = editingProductVersion;

            var wasEditing = !!editingProductId;
            var request = editingProductId
                ? apiRequest('/admin/products/' + encodeURIComponent(editingProductId), { method: 'PUT', body: payload })
                : apiRequest('/admin/products', { method: 'POST', body: payload });

            request.then(function (response) {
                var saved = unwrapDataResponse(response) || {};
                if (!editingProductId && saved.id) editingProductId = saved.id;
                showToast(wasEditing ? '产品已更新' : '产品已新增');
                closeModal('product-modal');
                loadProducts();
            }).catch(function (err) {
                if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
                    showToast('数据已被其他操作修改，请刷新后重试', 'error');
                    return;
                }
                showToast('保存产品失败：' + err.message, 'error');
            });
        }

        function splitList(value) {
            return value.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
        }

        function deleteProduct(productId) {
            var product = findProductById(productId);
            showConfirm('删除产品', '确定删除 "' + (product ? (product.name_en || product.name || productId) : productId) + '" 吗？').then(function (ok) {
                if (!ok) return;
                apiRequest('/admin/products/' + encodeURIComponent(productId), { method: 'DELETE' }).then(function () {
                    showToast('产品已删除');
                    loadProducts();
                }).catch(function (err) { showToast('删除失败：' + err.message, 'error'); });
            });
        }

        function loadInquiries() {
            document.getElementById('inquiries-tbody').innerHTML = skeletonRows(7, 5);
            updateInquiryBatchBar();
            var status = document.getElementById('inquiry-status-filter').value;
            var searchVal = ((document.getElementById('inquiry-search') || {}).value || '').trim();
            var url = '/admin/inquiries?page=' + encodeURIComponent(inquiryPage) + '&pageSize=' + encodeURIComponent(inquiryMeta.pageSize || 20);
            if (status) url += '&status=' + encodeURIComponent(status);
            if (searchVal) url += '&q=' + encodeURIComponent(searchVal);
            if (inquiryUnreadOnly) url += '&unread=true';
            apiRequest(url).then(function (response) {
                inquiries = unwrapListResponse(response);
                inquiryMeta = response && response.meta ? response.meta : { page: inquiryPage, pageSize: inquiryMeta.pageSize || 20, total: inquiries.length };
                renderInquiriesTable();
                renderInquiriesPagination();
            }).catch(function (err) {
                document.getElementById('inquiries-tbody').innerHTML = '<tr><td colspan="7" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
                renderInquiriesPagination({ page: 1, pageSize: inquiryMeta.pageSize || 20, total: 0 });
                showToast('加载询盘失败：' + err.message, 'error');
            });
        }

        function renderInquiriesPagination(metaOverride) {
            var pagination = document.getElementById('inquiries-pagination');
            if (!window.renderPagination || !pagination) return;
            window.renderPagination(pagination, metaOverride || inquiryMeta, function (nextPage) {
                inquiryPage = nextPage;
                loadInquiries();
            });
        }

        function renderInquiriesTable() {
            var tbody = document.getElementById('inquiries-tbody');
            if (!inquiries.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><p>暂无询盘</p></td></tr>';
                updateInquiryBatchBar();
                return;
            }
            tbody.innerHTML = inquiries.map(function (item) {
                var rowClass = item.is_read === 0 ? ' class="row-unread"' : '';
                return '<tr' + rowClass + '>' +
                    '<td><input type="checkbox" class="inquiry-select" data-id="' + escapeHtml(item.id) + '"></td>' +
                    '<td><div class="product-name-text">' + escapeHtml(item.name) + '</div><div class="product-id-text">' + escapeHtml(item.email) + '</div></td>' +
                    '<td>' + escapeHtml(item.company || '-') + '</td>' +
                    '<td>' + escapeHtml(item.subject || '-') + '</td>' +
                    '<td>' + formatDate(item.created_at) + '</td>' +
                    '<td><span class="badge ' + (STATUS_BADGES[item.status] || 'badge-blue') + '">' + (STATUS_LABELS[item.status] || item.status) + '</span></td>' +
                    '<td><div class="actions-cell"><button class="btn btn-icon btn-icon-view" aria-label="查看询盘" data-view-inquiry="' + escapeHtml(item.id) + '">' + ICON_VIEW + '</button><button class="btn btn-icon btn-icon-delete" aria-label="删除询盘" data-delete-inquiry="' + escapeHtml(item.id) + '">' + ICON_DELETE + '</button></div></td>' +
                    '</tr>';
            }).join('');
            tbody.querySelectorAll('[data-view-inquiry]').forEach(function (btn) {
                btn.addEventListener('click', function () { openInquiryModal(btn.getAttribute('data-view-inquiry')); });
            });
            tbody.querySelectorAll('[data-delete-inquiry]').forEach(function (btn) {
                btn.addEventListener('click', function () { deleteInquiry(btn.getAttribute('data-delete-inquiry')); });
            });
            tbody.querySelectorAll('.inquiry-select').forEach(function (checkbox) {
                checkbox.addEventListener('change', updateInquiryBatchBar);
            });
            updateInquiryBatchBar();
        }

        function bindInquiryEvents() {
            var filter = document.getElementById('inquiry-status-filter');
            if (filter) filter.addEventListener('change', function () {
                inquiryPage = 1;
                loadInquiries();
            });
            var search = document.getElementById('inquiry-search');
            if (search) search.addEventListener('input', function () {
                clearTimeout(inquirySearchTimer);
                inquirySearchTimer = setTimeout(function () {
                    inquiryPage = 1;
                    loadInquiries();
                }, 250);
            });
            var unreadFilter = document.getElementById('inquiry-unread-filter');
            if (unreadFilter) {
                unreadFilter.querySelectorAll('[data-unread]').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        unreadFilter.querySelectorAll('[data-unread]').forEach(function (item) { item.classList.remove('active'); });
                        btn.classList.add('active');
                        inquiryUnreadOnly = btn.getAttribute('data-unread') === 'true';
                        inquiryPage = 1;
                        loadInquiries();
                    });
                });
            }
            var selectAll = document.getElementById('inquiry-select-all');
            if (selectAll) {
                selectAll.addEventListener('change', function () {
                    document.querySelectorAll('.inquiry-select').forEach(function (checkbox) {
                        checkbox.checked = selectAll.checked;
                    });
                    updateInquiryBatchBar();
                });
            }
            bindInquiryBatchButton('btn-batch-read-inquiries', 'mark_read');
            bindInquiryBatchButton('btn-batch-close-inquiries', 'close');
            bindInquiryBatchButton('btn-batch-delete-inquiries', 'soft_delete');
            var clearSelection = document.getElementById('btn-clear-inquiry-selection');
            if (clearSelection) clearSelection.addEventListener('click', clearInquirySelection);
            bindModalClose('inquiry-modal', ['inquiry-modal-close', 'inquiry-cancel']);
            var save = document.getElementById('inquiry-save');
            if (save) save.addEventListener('click', saveInquiryStatus);
            var reply = document.getElementById('inquiry-reply');
            if (reply) reply.addEventListener('click', replyByEmail);
        }

        function bindInquiryBatchButton(id, action) {
            var btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', function () { batchInquiryAction(action); });
        }

        function getSelectedInquiryIds() {
            var ids = [];
            document.querySelectorAll('.inquiry-select:checked').forEach(function (checkbox) {
                var id = parseInt(checkbox.getAttribute('data-id'), 10);
                if (!isNaN(id)) ids.push(id);
            });
            return ids;
        }

        function updateInquiryBatchBar() {
            var selected = document.querySelectorAll('.inquiry-select:checked');
            var all = document.querySelectorAll('.inquiry-select');
            var bar = document.getElementById('inquiry-batch-bar');
            var count = document.getElementById('inquiry-batch-count');
            var selectAll = document.getElementById('inquiry-select-all');
            if (count) count.textContent = '已选 ' + selected.length + ' 条';
            if (bar) bar.style.display = selected.length ? '' : 'none';
            if (selectAll) {
                selectAll.checked = all.length > 0 && selected.length === all.length;
                selectAll.indeterminate = selected.length > 0 && selected.length < all.length;
            }
        }

        function clearInquirySelection() {
            document.querySelectorAll('.inquiry-select').forEach(function (checkbox) {
                checkbox.checked = false;
            });
            updateInquiryBatchBar();
        }

        function inquiryBatchLabel(action) {
            var labels = {
                mark_read: '标记已读',
                close: '关闭',
                soft_delete: '删除'
            };
            return labels[action] || action;
        }

        function batchInquiryAction(action) {
            var ids = getSelectedInquiryIds();
            if (!ids.length) {
                showToast('请先选择询盘', 'error');
                return;
            }
            apiRequest('/admin/inquiries/batch', {
                method: 'POST',
                body: { ids: ids, action: action }
            }).then(function () {
                showToast('已' + inquiryBatchLabel(action) + ' ' + ids.length + ' 条询盘');
                clearInquirySelection();
                loadInquiries();
            }).catch(function (err) {
                showToast('批量操作失败：' + err.message, 'error');
            });
        }

        function replyByEmail() {
            if (!openedInquiry || !openedInquiry.email) return;
            var subject = 'Re: ' + (openedInquiry.subject || 'Your Inquiry');
            var body = 'Dear ' + (openedInquiry.name || '') + ',\n\n\n\n---\nOriginal message:\n' + (openedInquiry.message || '');
            window.open(
                'https://mail.google.com/mail/?view=cm' +
                '&to=' + encodeURIComponent(openedInquiry.email) +
                '&su=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(body)
            );
            if (openedInquiry.status !== 'replied' && openedInquiry.status !== 'closed') {
                var currentNotes = document.getElementById('inquiry-notes').value;
                apiRequest('/admin/inquiries/' + encodeURIComponent(openedInquiry.id), {
                    method: 'PUT',
                    body: { status: 'replied', is_read: 1, notes: currentNotes }
                }).then(function () {
                    openedInquiry.status = 'replied';
                    document.getElementById('inquiry-status').value = 'replied';
                    showToast('状态已更新为已回复');
                    loadInquiries();
                }).catch(function (err) { showToast('状态更新失败：' + err.message, 'error'); });
            }
        }

        function openInquiryModal(id) {
            editingInquiryId = id;
            openedInquiry = null;
            apiRequest('/admin/inquiries/' + encodeURIComponent(id)).then(function (response) {
                var item = unwrapDataResponse(response) || {};
                openedInquiry = item;
                document.getElementById('inquiry-detail').innerHTML =
                    detailItem('客户姓名', item.name) +
                    detailItem('邮箱', item.email) +
                    detailItem('公司', item.company || '-') +
                    detailItem('电话', item.phone || '-') +
                    detailItem('主题', item.subject || '-') +
                    detailItem('产品上下文', item.product_context || '-') +
                    detailItem('提交时间', formatDate(item.created_at)) +
                    detailItem('IP 地址', item.ip || '-') +
                    '<div class="detail-item detail-full"><strong>消息内容</strong><p>' + escapeHtml(item.message || '') + '</p></div>';
                document.getElementById('inquiry-status').value = item.status || 'new';
                document.getElementById('inquiry-notes').value = item.notes || '';
                document.getElementById('inquiry-modal').classList.add('show');
            }).catch(function (err) { showToast('加载询盘详情失败：' + err.message, 'error'); });
        }

        function detailItem(label, value) {
            return '<div class="detail-item"><strong>' + label + '</strong><span>' + escapeHtml(value) + '</span></div>';
        }

        function saveInquiryStatus() {
            if (!editingInquiryId) return;
            apiRequest('/admin/inquiries/' + encodeURIComponent(editingInquiryId), {
                method: 'PUT',
                body: {
                    status: document.getElementById('inquiry-status').value,
                    is_read: 1,
                    notes: document.getElementById('inquiry-notes').value
                }
            }).then(function () {
                showToast('询盘状态已保存');
                closeModal('inquiry-modal');
                loadInquiries();
            }).catch(function (err) {
                if (err.status === 422) {
                    showToast('状态不能降级', 'error');
                    return;
                }
                showToast('保存失败：' + err.message, 'error');
            });
        }

        function deleteInquiry(id) {
            showConfirm('删除询盘', '确定删除这条询盘吗？').then(function (ok) {
                if (!ok) return;
                apiRequest('/admin/inquiries/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () {
                    showToast('询盘已删除');
                    loadInquiries();
                }).catch(function (err) { showToast('删除失败：' + err.message, 'error'); });
            });
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
            bindModalClose('certification-modal', ['certification-modal-close', 'certification-cancel']);
            var form = document.getElementById('certification-form');
            if (form) form.addEventListener('submit', saveCertification);
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
            updateCertBatchBar(viewName);
            if (!certPageByView[viewName]) certPageByView[viewName] = 1;
            if (!certMetaByView[viewName]) certMetaByView[viewName] = { page: certPageByView[viewName], pageSize: 20, total: 0 };

            function requestRows() {
                var categoryId = certificationCategoryMap[slug];
                if (!categoryId) {
                    tbody.innerHTML = '<tr><td colspan="6" class="table-empty"><p>未找到证书分类</p></td></tr>';
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
                    tbody.innerHTML = '<tr><td colspan="6" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
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
                    tbody.innerHTML = '<tr><td colspan="6" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
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
                tbody.innerHTML = '<tr><td colspan="6" class="table-empty"><p>暂无证书</p></td></tr>';
                updateCertBatchBar(viewName);
                return;
            }
            tbody.innerHTML = rows.map(function (item) {
                var status = item.status || 'draft';
                var statusClass = status === 'published' ? 'badge-green' : (status === 'deleted' ? 'badge-navy' : 'badge-gold');
                var statusLabel = status === 'published' ? '已发布' : (status === 'deleted' ? '已删除' : '草稿');
                return '<tr><td><input type="checkbox" class="cert-row-check" data-id="' + escapeHtml(item.id) + '" data-version="' + escapeHtml(item.version) + '" data-view="' + escapeHtml(viewName) + '"></td><td>' + escapeHtml(item.name_en || '') + '</td><td>' + escapeHtml(item.category_name_en || '-') + '</td><td class="cell-muted">' + escapeHtml(item.image_path || '未设置') + '</td><td><span class="badge ' + statusClass + '">' + statusLabel + '</span></td><td><div class="actions-cell"><button class="btn btn-icon btn-icon-edit" aria-label="编辑证书" data-cert-view="' + escapeHtml(viewName) + '" data-edit-cert="' + escapeHtml(item.id) + '">' + ICON_EDIT + '</button><button class="btn btn-icon btn-icon-delete" aria-label="删除证书" data-cert-view="' + escapeHtml(viewName) + '" data-delete-cert="' + escapeHtml(item.id) + '">' + ICON_DELETE + '</button></div></td></tr>';
            }).join('');
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
        }

        function findCertificationInView(id, viewName) {
            var rows = certificationViewRows[viewName] || [];
            for (var i = 0; i < rows.length; i++) {
                if (String(rows[i].id) === String(id)) return rows[i];
            }
            return null;
        }

        function openCertificationModal(id, viewName) {
            viewName = viewName || currentView;
            editingCertificationId = id;
            uploadedCertificationPath = '';
            document.getElementById('certification-form').reset();
            document.getElementById('cert-editing-id').value = id || '';
            document.getElementById('cert-editing-version').value = '';
            document.getElementById('cert-category-id').value = certificationCategoryMap[certViewSlug(viewName)] || '';
            document.getElementById('certification-modal-title').textContent = id ? '编辑证书' : '新增证书';
            if (id) {
                var item = findCertificationInView(id, viewName);
                if (item) {
                    document.getElementById('cert-name').value = item.name_en || '';
                    document.getElementById('cert-image').value = item.image_path || '';
                    document.getElementById('cert-editing-version').value = item.version || '';
                    uploadedCertificationPath = item.image_path || '';
                }
                apiRequest('/admin/certifications/' + encodeURIComponent(id)).then(function (response) {
                    var detail = unwrapDataResponse(response) || {};
                    document.getElementById('cert-name').value = detail.name_en || '';
                    document.getElementById('cert-issuer').value = detail.issuer_en || '';
                    document.getElementById('cert-expiryDate').value = detail.expiry_date || '';
                    document.getElementById('cert-image').value = detail.image_path || '';
                    document.getElementById('cert-description').value = detail.description_en || '';
                    if (!document.getElementById('cert-editing-version').value) {
                        document.getElementById('cert-editing-version').value = detail.version || '';
                    }
                    uploadedCertificationPath = detail.image_path || '';
                }).catch(function (err) { showToast('加载证书详情失败：' + err.message, 'error'); });
            }
            document.getElementById('certification-modal').classList.add('show');
        }

        function uploadCertificationFile() {
            var file = this.files[0];
            if (!file) return;
            var formData = new FormData();
            formData.append('file', file);
            fetch(API_BASE + '/certifications/upload', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + getToken() },
                body: formData
            }).then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.error) throw new Error(data.error);
                    uploadedCertificationPath = data.path;
                    document.getElementById('cert-image').value = data.path;
                    showToast('证书文件上传成功');
                })
                .catch(function (err) { showToast('证书文件上传失败：' + err.message, 'error'); });
        }

        function saveCertification(e) {
            e.preventDefault();
            var payload = {
                name_en: document.getElementById('cert-name').value.trim(),
                issuer_en: document.getElementById('cert-issuer').value.trim(),
                expiry_date: document.getElementById('cert-expiryDate').value.trim(),
                image_path: document.getElementById('cert-image').value.trim() || uploadedCertificationPath,
                description_en: document.getElementById('cert-description').value.trim(),
                category_id: parseInt(document.getElementById('cert-category-id').value, 10),
                status: 'published'
            };
            if (!payload.name_en) {
                showToast('请填写证书名称', 'error');
                return;
            }
            if (editingCertificationId) payload.version = document.getElementById('cert-editing-version').value;
            var request = editingCertificationId
                ? apiRequest('/admin/certifications/' + encodeURIComponent(editingCertificationId), { method: 'PUT', body: payload })
                : apiRequest('/admin/certifications', { method: 'POST', body: payload });
            request.then(function () {
                showToast('证书已保存');
                closeModal('certification-modal');
                loadCertView(currentView);
            }).catch(function (err) {
                if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
                    showToast('数据已被其他操作修改，请刷新后重试', 'error');
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
                'content-company-overview': 'company-overview',
                'content-contact': 'contact',
                'content-about': 'about-us',
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
                    ['whatsapp', 'WhatsApp'], ['whatsappQr', 'WhatsApp 二维码'], ['wechat', '微信'], ['wechatQr', '微信二维码'],
                    ['skype', 'Skype'], ['line', 'Line'], ['lineQr', 'Line 二维码'], ['tiktok', 'TikTok'],
                    ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['googleMapsUrl', 'Google Maps URL'],
                    ['googleMapsEmbedUrl', 'Google Maps Embed URL'], ['googleMyMapsEmbedUrl', 'Google My Maps Embed URL'],
                    ['openStreetMapUrl', 'OpenStreetMap URL'], ['mapQr', '地图二维码']
                ],
                jsonTextareas: [['mapLocations', '地图位置 JSON']],
                seo: true
            },
            'content-education': {
                groups: [
                    { key: 'hero', label: 'Hero', fields: [['eyebrow', 'Eyebrow'], ['title', '标题'], ['titleAr', '标题（阿语）'], ['subtitle', '副标题'], ['subtitleAr', '副标题（阿语）'], ['backgroundImage', '背景图']] },
                    { key: 'cta', label: 'CTA', fields: [['title', '标题'], ['titleAr', '标题（阿语）'], ['text', '正文'], ['textAr', '正文（阿语）'], ['buttonText', '按钮'], ['buttonTextAr', '按钮（阿语）'], ['href', '链接']] }
                ],
                arrays: [
                    { key: 'stats', label: '统计数据', fields: [['value', '数值'], ['label', '标签'], ['labelAr', '标签（阿语）']] },
                    { key: 'sections', label: '合作板块', fields: [['id', 'ID'], ['modeNumber', '序号'], ['title', '标题'], ['titleAr', '标题（阿语）'], ['tagline', '标语'], ['taglineAr', '标语（阿语）'], ['summary', '摘要'], ['summaryAr', '摘要（阿语）'], ['image', '图片'], ['bestFor', '适合对象'], ['bestForAr', '适合对象（阿语）']] }
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
                    { key: 'industries', label: '行业', fields: [['name_en', '名称（英文）'], ['name_ar', '名称（阿语）'], ['name_cn', '名称（中文）'], ['summary_en', '摘要（英文）'], ['summary_ar', '摘要（阿语）'], ['summary_cn', '摘要（中文）'], ['image', '图片'], ['related_product_ids', '关联产品 ID（逗号分隔）']] }
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
                fields: [['related_certification_ids', '关联证书 ID（逗号分隔）']],
                seo: true
            }
        };

        function getPathValue(obj, path) {
            return path.split('.').reduce(function (current, key) {
                return current && current[key] !== undefined ? current[key] : '';
            }, obj || {});
        }

        function setPathValue(obj, path, value) {
            var parts = path.split('.');
            var current = obj;
            parts.forEach(function (key, index) {
                if (index === parts.length - 1) {
                    current[key] = value;
                    return;
                }
                if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) current[key] = {};
                current = current[key];
            });
        }

        function normalizeStructuredValue(path, value) {
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
            return String(value == null ? '' : value).trim();
        }

        function renderField(path, label, value, textarea) {
            var id = 'cms-field-' + path.replace(/[^a-zA-Z0-9_-]/g, '-');
            var tag = textarea ? 'textarea' : 'input';
            var valueText = Array.isArray(value) ? value.join(', ') : (value == null ? '' : String(value));
            if (path === 'is_active' || /\.is_active$/.test(path)) {
                return '<label class="form-group cms-field"><span>' + escapeHtml(label) + '</span><select data-cms-field="' + escapeHtml(path) + '"><option value="true"' + (value !== false ? ' selected' : '') + '>启用</option><option value="false"' + (value === false ? ' selected' : '') + '>停用</option></select></label>';
            }
            if (textarea) {
                return '<label class="form-group cms-field"><span>' + escapeHtml(label) + '</span><textarea id="' + escapeHtml(id) + '" data-cms-field="' + escapeHtml(path) + '" rows="4">' + escapeHtml(valueText) + '</textarea></label>';
            }
            return '<label class="form-group cms-field"><span>' + escapeHtml(label) + '</span><input id="' + escapeHtml(id) + '" data-cms-field="' + escapeHtml(path) + '" type="text" value="' + escapeHtml(valueText) + '"></label>';
        }

        function renderGroup(group, body) {
            return '<fieldset class="cms-fieldset"><legend>' + escapeHtml(group.label) + '</legend>' +
                group.fields.map(function (field) {
                    return renderField(group.key + '.' + field[0], field[1], getPathValue(body, group.key + '.' + field[0]), /body|summary|subtitle|text/.test(field[0]));
                }).join('') + '</fieldset>';
        }

        function renderArrayEditor(arrayConfig, body) {
            var items = Array.isArray(body[arrayConfig.key]) ? body[arrayConfig.key] : [];
            return '<fieldset class="cms-fieldset" data-cms-array="' + escapeHtml(arrayConfig.key) + '"><legend>' + escapeHtml(arrayConfig.label) + '</legend>' +
                '<div class="cms-array-items">' + items.map(function (item, index) {
                    return '<div class="cms-array-item" data-cms-array-item="' + index + '">' +
                        '<div class="cms-array-actions"><button type="button" class="btn btn-secondary btn-sm cms-move-up">上移</button><button type="button" class="btn btn-secondary btn-sm cms-move-down">下移</button><button type="button" class="btn btn-danger btn-sm cms-remove-item">删除</button></div>' +
                        arrayConfig.fields.map(function (field) {
                            return renderField(arrayConfig.key + '.' + index + '.' + field[0], field[1], item ? item[field[0]] : '', /body|summary|description|text/.test(field[0]));
                        }).join('') + '</div>';
                }).join('') + '</div><button type="button" class="btn btn-secondary cms-add-item" data-cms-add="' + escapeHtml(arrayConfig.key) + '">新增</button></fieldset>';
        }

        function renderContentBlockForm(viewName, block) {
            var config = CONTENT_BLOCK_FORMS[viewName] || {};
            var form = document.getElementById('form-' + viewName);
            if (!form) return;
            var body = block.body_json || {};
            var html = '<div class="form-group"><label>标题（英文）</label><input type="text" id="' + escapeHtml(viewName) + '-title-en" value="' + escapeHtml(block.title_en || '') + '"></div>';
            (config.fields || []).forEach(function (field) {
                html += renderField(field[0], field[1], getPathValue(body, field[0]), false);
            });
            (config.textareas || []).forEach(function (field) {
                html += renderField(field[0], field[1], getPathValue(body, field[0]), true);
            });
            (config.jsonTextareas || []).forEach(function (field) {
                html += renderField(field[0], field[1], JSON.stringify(getPathValue(body, field[0]) || {}, null, 2), true);
            });
            (config.groups || []).forEach(function (group) { html += renderGroup(group, body); });
            (config.arrays || []).forEach(function (arrayConfig) { html += renderArrayEditor(arrayConfig, body); });
            if (config.blocks) html += renderReservedBlocks(config.blocks, body);
            if (config.seo) {
                html += '<fieldset class="cms-fieldset"><legend>SEO</legend>' +
                    renderField('seo.title', 'SEO 标题', getPathValue(body, 'seo.title'), false) +
                    renderField('seo.description', 'SEO 描述', getPathValue(body, 'seo.description'), true) +
                    renderField('seo.keywords', 'SEO 关键词', getPathValue(body, 'seo.keywords'), false) +
                    '</fieldset>';
            }
            html += '<details class="cms-advanced"><summary>高级 JSON</summary><textarea id="' + escapeHtml(viewName) + '-body-json" rows="12">' + escapeHtml(JSON.stringify(body, null, 2)) + '</textarea></details>';
            html += '<div class="form-actions"><button type="submit" class="btn btn-primary">保存</button><button type="button" class="btn btn-secondary cms-reload">重新加载</button><span class="form-status" id="' + escapeHtml(viewName) + '-status">' + (block.updated_at ? '已加载：' + formatDate(block.updated_at) : '已加载') + '</span></div>';
            form.innerHTML = html;
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
            var bodyEl = document.getElementById(viewName + '-body-json');
            var body = {};
            try {
                body = bodyEl ? JSON.parse(bodyEl.value || '{}') : { ...(cached.body_json || {}) };
            } catch (err) {
                throw new Error('高级 JSON 格式无效');
            }
            if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('高级 JSON 格式无效');

            var form = document.getElementById('form-' + viewName);
            if (!form) return body;

            form.querySelectorAll('[data-cms-field]').forEach(function (field) {
                var path = field.getAttribute('data-cms-field');
                if (/^blocks\.[^.]+\./.test(path)) return;
                if (/^[^.]+\.\d+\./.test(path)) return;
                setPathValue(body, path, normalizeStructuredValue(path, field.value));
            });

            form.querySelectorAll('[data-cms-array]').forEach(function (arrayEl) {
                var key = arrayEl.getAttribute('data-cms-array');
                var items = [];
                arrayEl.querySelectorAll('[data-cms-array-item]').forEach(function (itemEl, index) {
                    var item = {};
                    itemEl.querySelectorAll('[data-cms-field]').forEach(function (field) {
                        var parts = field.getAttribute('data-cms-field').split('.');
                        item[parts.slice(2).join('.')] = normalizeStructuredValue(parts.slice(2).join('.'), field.value);
                    });
                    item.sort_order = index;
                    if (Object.keys(item).some(function (keyName) { return keyName === 'sort_order' ? false : item[keyName] !== '' && !(Array.isArray(item[keyName]) && !item[keyName].length); })) {
                        items.push(item);
                    }
                });
                body[key] = items;
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
                        item[key] = normalizeStructuredValue(key, field.value);
                    });
                    nextBlocks.push(item);
                });
                body.blocks = nextBlocks;
            }

            return body;
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

        function bindContentBlockEvents() {
            var views = [
                'content-company-overview',
                'content-contact',
                'content-about',
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
                        if (target.classList.contains('cms-reload')) {
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
                if (statusEl) statusEl.textContent = block.updated_at ? ('已加载：' + formatDate(block.updated_at)) : '已加载';
            }).catch(function (err) {
                if (statusEl) statusEl.textContent = '加载失败';
                showToast('加载内容块失败：' + err.message, 'error');
            });
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
                showToast(err.message || 'body_json 格式无效', 'error');
                return;
            }

            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                showToast('body_json 格式无效', 'error');
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
                showToast('内容已保存');
            }).catch(function (err) {
                if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
                    showToast('内容已被其他操作修改，请刷新后重试', 'error');
                    if (statusEl) statusEl.textContent = '版本冲突';
                    return;
                }
                if (statusEl) statusEl.textContent = '保存失败';
                showToast('保存内容失败：' + err.message, 'error');
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

        function bindAssetsEvents() {
            var refreshBtn = document.getElementById('btn-refresh-assets');
            if (refreshBtn) refreshBtn.addEventListener('click', function () {
                assetPage = 1;
                loadAssets();
            });

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

        function loadAssets() {
            var tbody = document.getElementById('assets-tbody');
            if (!tbody) return;

            tbody.innerHTML = skeletonRows(7, 5);
            var pagination = document.getElementById('assets-pagination');
            if (pagination) pagination.style.display = 'none';

            apiRequest('/admin/assets?page=' + encodeURIComponent(assetPage) + '&pageSize=20').then(function (response) {
                var rows = unwrapListResponse(response);
                assetMeta = response && response.meta ? response.meta : { page: assetPage, pageSize: 20, total: rows.length };
                renderAssetsTable(rows);
            }).catch(function (err) {
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
                showToast('加载资源库失败：' + err.message, 'error');
            });
        }

        function renderAssetsTable(rows) {
            var tbody = document.getElementById('assets-tbody');
            if (!tbody) return;

            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><p>暂无资源记录</p></td></tr>';
                renderAssetsPagination();
                return;
            }

            tbody.innerHTML = rows.map(function (asset) {
                var name = escapeHtml(asset.original_name || asset.filename || '—');
                var path = escapeHtml(asset.path || '—');
                var mime = escapeHtml(asset.mime_type || '—');
                var size = formatFileSize(asset.file_size);
                var source = asset.module ? escapeHtml(asset.module + (asset.entity_type ? '/' + asset.entity_type : '')) : '—';
                var time = formatDate(asset.created_at);

                return '<tr>' +
                    '<td class="product-name-text">' + name + '</td>' +
                    '<td class="cell-muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + path + '">' + path + '</td>' +
                    '<td class="cell-muted">' + mime + '</td>' +
                    '<td class="cell-muted">' + escapeHtml(size) + '</td>' +
                    '<td class="cell-muted">' + source + '</td>' +
                    '<td class="cell-muted">' + escapeHtml(time) + '</td>' +
                    '<td><button class="btn btn-icon btn-icon-delete" aria-label="删除资源" data-delete-asset="' + escapeHtml(asset.id) + '">' + ICON_DELETE + '</button></td>' +
                    '</tr>';
            }).join('');

            tbody.querySelectorAll('[data-delete-asset]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    deleteAsset(btn.getAttribute('data-delete-asset'));
                });
            });
            renderAssetsPagination();
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

        function deleteAsset(id) {
            showConfirm('删除资源', '确定删除这条资源记录吗？文件本身不会从服务器删除，仅移出资源库。').then(function (ok) {
                if (!ok) return;

                apiRequest('/admin/assets/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () {
                    showToast('资源已移出资源库');
                    loadAssets();
                }).catch(function (err) {
                    showToast('删除失败：' + err.message, 'error');
                });
            });
        }

        function loadTrash() {
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
                if (productsTbody) productsTbody.innerHTML = '<tr><td colspan="5" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
                showToast('加载已删除产品失败：' + err.message, 'error');
            });

            apiRequest('/admin/certifications?status=deleted&page=1&pageSize=100').then(function (response) {
                trashedCerts = unwrapListResponse(response);
                renderTrashCertsTable();
            }).catch(function (err) {
                if (certsTbody) certsTbody.innerHTML = '<tr><td colspan="5" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
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
                tbody.innerHTML = '<tr><td colspan="5" class="table-empty"><p>回收站为空</p></td></tr>';
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
            tbody.querySelectorAll('.trash-product-check').forEach(function (cb) {
                cb.addEventListener('change', updateTrashProductBatchBar);
            });
            updateTrashProductBatchBar();
        }

        function renderTrashCertsTable() {
            var tbody = document.getElementById('trash-certs-tbody');
            if (!tbody) return;
            if (!trashedCerts.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="table-empty"><p>回收站为空</p></td></tr>';
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
            tbody.querySelectorAll('.trash-cert-check').forEach(function (cb) {
                cb.addEventListener('change', updateTrashCertBatchBar);
            });
            updateTrashCertBatchBar();
        }

        function updateTrashProductBatchBar() {
            var selected = document.querySelectorAll('.trash-product-check:checked');
            var all = document.querySelectorAll('.trash-product-check');
            var bar = document.getElementById('trash-product-batch-bar');
            var count = document.getElementById('trash-product-batch-count');
            var selectAll = document.getElementById('trash-product-select-all');
            if (count) count.textContent = '已选 ' + selected.length + ' 条';
            if (bar) bar.style.display = selected.length ? '' : 'none';
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
            if (bar) bar.style.display = selected.length ? '' : 'none';
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
                'system-env-port'
            ];
            ids.forEach(function (id) { setText(id, '—'); });
            apiRequest('/admin/system/status').then(function (response) {
                var data = unwrapDataResponse(response) || {};
                var sqlite = data.sqlite || {};
                var counts = data.counts || {};
                var env = data.env || {};
                setText('system-sqlite-enabled', yesNo(sqlite.enabled));
                setText('system-sqlite-available', yesNo(sqlite.available));
                setText('system-schema-version', sqlite.schemaVersion == null ? '—' : sqlite.schemaVersion);
                setText('system-public-source', data.publicApiSource || '—');
                setText('system-count-products', counts.products == null ? 0 : counts.products);
                setText('system-count-certifications', counts.certifications == null ? 0 : counts.certifications);
                setText('system-count-inquiries', counts.inquiries == null ? 0 : counts.inquiries);
                setText('system-count-content-blocks', counts.contentBlocks == null ? 0 : counts.contentBlocks);
                setText('system-count-assets', counts.assets == null ? 0 : counts.assets);
                setText('system-env-node', env.nodeEnv || '—');
                setText('system-env-port', env.port || '—');

                var sourceEl = document.getElementById('system-public-source');
                if (sourceEl) {
                    sourceEl.style.color = data.publicApiSource === 'json' ? '#b42318' : '';
                }
            }).catch(function (err) {
                showToast('加载系统状态失败：' + err.message, 'error');
            });
        }

        function moduleKeys() {
            return ['dashboard', 'website', 'products', 'content', 'certifications', 'inquiries', 'assets', 'settings'];
        }

        function loadModuleSettings() {
            var statusEl = document.getElementById('module-settings-status');
            if (statusEl) statusEl.textContent = '加载中...';
            apiRequest('/admin/settings/modules').then(function (response) {
                var data = unwrapDataResponse(response) || {};
                moduleKeys().forEach(function (key) {
                    var input = document.getElementById('module-' + key);
                    if (input) input.checked = !!data[key];
                });
                if (statusEl) statusEl.textContent = '已加载';
            }).catch(function (err) {
                if (statusEl) statusEl.textContent = '加载失败';
                showToast('加载模块设置失败：' + err.message, 'error');
            });
        }

        function saveModuleSettings() {
            var body = {};
            var statusEl = document.getElementById('module-settings-status');
            moduleKeys().forEach(function (key) {
                var input = document.getElementById('module-' + key);
                if (input) body[key] = !!input.checked;
            });
            if (statusEl) statusEl.textContent = '保存中...';
            apiRequest('/admin/settings/modules', {
                method: 'PUT',
                body: body
            }).then(function (response) {
                var data = unwrapDataResponse(response) || {};
                moduleKeys().forEach(function (key) {
                    var input = document.getElementById('module-' + key);
                    if (input) input.checked = !!data[key];
                });
                if (statusEl) statusEl.textContent = '已保存';
                showToast('模块设置已保存');
            }).catch(function (err) {
                if (statusEl) statusEl.textContent = '保存失败';
                showToast('保存模块设置失败：' + err.message, 'error');
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
                tbody.innerHTML = '<tr><td colspan="6" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
                showToast('加载审计日志失败：' + err.message, 'error');
            });
        }

        function renderAuditLogs(rows) {
            var tbody = document.getElementById('audit-logs-tbody');
            if (!tbody) return;
            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="table-empty"><p>暂无审计日志</p></td></tr>';
            } else {
                tbody.innerHTML = rows.map(function (row) {
                    return '<tr>' +
                        '<td>' + escapeHtml(formatDate(row.created_at)) + '</td>' +
                        '<td>' + escapeHtml(row.entity_type || '—') + '</td>' +
                        '<td>' + escapeHtml(row.entity_id || '—') + '</td>' +
                        '<td><span class="badge badge-blue">' + escapeHtml(auditActionLabel(row.action)) + '</span></td>' +
                        '<td>' + escapeHtml(row.performed_by || '—') + '</td>' +
                        '<td class="cell-muted">' + escapeHtml(row.ip || '—') + '</td>' +
                        '</tr>';
                }).join('');
            }
            renderAuditPagination();
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
                    educationListField('gallery.images', '图片路径列表', gallery.images, '每行一个图片路径；上传图片后可选择“加入图片资料”自动追加。') +
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
                    images: textToList(fieldValue(editor, 'gallery.images'))
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
                appendLineValue(editor.querySelector('[data-edu-field="gallery.images"]'), path);
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

        function closeModal(modalId) {
            var modal = document.getElementById(modalId);
            if (modal) modal.classList.remove('show');
            if (modalId === 'product-modal') editingProductId = null;
            if (modalId === 'certification-modal') editingCertificationId = null;
            if (modalId === 'inquiry-modal') { editingInquiryId = null; openedInquiry = null; }
        }

        function formatDate(value) {
            if (!value) return '-';
            var date = new Date(value);
            if (isNaN(date.getTime())) return value;
            return date.toLocaleString('zh-CN', { hour12: false });
        }
    }
})();
