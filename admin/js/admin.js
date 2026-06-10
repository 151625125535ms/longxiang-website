(function () {
    'use strict';

    var API_BASE = '../api';
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
                if (!res.ok) throw new Error(data.message || data.error || '请求失败');
                return data;
            });
        });
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
        var educationContent = null;
        var editingProductId = null;
        var uploadedImagePath = '';
        var editingInquiryId = null;
        var openedInquiry = null;
        var editingCertificationId = null;
        var uploadedCertificationPath = '';
        var currentView = 'dashboard';

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
        bindEducationEvents();
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
                certifications: '证书管理'
            };
            document.getElementById('header-title').textContent = titles[view] || (view === 'education' ? '教育合作内容管理' : '');

            if (view === 'dashboard') loadDashboard();
            if (view === 'products') loadProducts();
            if (view === 'inquiries') loadInquiries();
            if (view === 'company') loadCompany();
            if (view === 'certifications') loadCertifications();
            if (view === 'education') loadEducation();
        }

        function loadDashboard() {
            ['stat-total', 'stat-featured', 'stat-categories', 'stat-inquiries', 'stat-new-inquiries'].forEach(function (id) { setText(id, '—'); });
            Promise.all([
                apiRequest('/products'),
                apiRequest('/inquiries?pageSize=200')
            ]).then(function (results) {
                products = results[0];
                inquiries = results[1].items || [];
                renderDashboard();
            }).catch(function (err) {
                showToast('加载控制台失败：' + err.message, 'error');
            });
        }

        function renderDashboard() {
            var featured = products.filter(function (p) { return p.featured; });
            var categoryMap = {};
            products.forEach(function (p) { categoryMap[p.category] = p.categoryLabel; });

            setText('stat-total', products.length);
            setText('stat-featured', featured.length);
            setText('stat-categories', Object.keys(categoryMap).length);
            setText('stat-inquiries', inquiries.length);
            setText('stat-new-inquiries', inquiries.filter(function (item) { return item.status === 'new'; }).length);

            var catGrid = document.getElementById('category-stats');
            if (catGrid) {
                catGrid.innerHTML = Object.keys(categoryMap).map(function (key) {
                    var count = products.filter(function (p) { return p.category === key; }).length;
                    return '<div class="category-stat-card"><span class="badge badge-blue">' + count + '</span><div><div class="category-stat-count">' + count + '</div><div class="category-stat-label">' + escapeHtml(categoryMap[key]) + '</div></div></div>';
                }).join('');
            }

            renderRecentInquiries();
        }

        function renderRecentInquiries() {
            var container = document.getElementById('recent-inquiries-list');
            if (!container) return;

            var sorted = inquiries.slice().sort(function (a, b) {
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            }).slice(0, 6);

            if (!sorted.length) {
                container.innerHTML = '<p class="recent-inquiries-empty">暂无询盘记录</p>';
                return;
            }

            container.innerHTML = sorted.map(function (item) {
                var isNew = item.status === 'new';
                var name = escapeHtml(item.name || '—');
                var subject = escapeHtml(item.subject || item.product || '（无主题）');
                var date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
                return '<div class="recent-inquiry-item" data-id="' + escapeHtml(item.id) + '" role="button" tabindex="0" aria-label="查看询盘：' + name + '">' +
                    '<div class="recent-inquiry-dot' + (isNew ? ' new' : '') + '"></div>' +
                    '<div class="recent-inquiry-info">' +
                        '<div class="recent-inquiry-name">' + name + '</div>' +
                        '<div class="recent-inquiry-subject">' + subject + '</div>' +
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
                        switchView('company');
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
            document.getElementById('products-tbody').innerHTML = skeletonRows(5, 5);
            apiRequest('/products').then(function (data) {
                products = data;
                renderProductsTable();
            }).catch(function (err) {
                document.getElementById('products-tbody').innerHTML = '<tr><td colspan="5" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
                showToast('加载产品失败：' + err.message, 'error');
            });
        }

        function renderProductsTable() {
            var tbody = document.getElementById('products-tbody');
            if (!tbody) return;

            var searchVal = ((document.getElementById('product-search') || {}).value || '').trim().toLowerCase();
            var catVal = (document.getElementById('product-category-filter') || {}).value || '';
            var filtered = products.filter(function (p) {
                var matchSearch = !searchVal ||
                    (p.name || '').toLowerCase().indexOf(searchVal) !== -1 ||
                    (p.id || '').toLowerCase().indexOf(searchVal) !== -1;
                var matchCat = !catVal || p.category === catVal || p.subCategory === catVal || p.group === catVal;
                return matchSearch && matchCat;
            }).sort(function (a, b) {
                return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
            });

            if (!filtered.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="table-empty"><p>' + (products.length ? '无匹配产品' : '暂无产品') + '</p></td></tr>';
                return;
            }

            tbody.innerHTML = filtered.map(function (product) {
                return '<tr>' +
                    '<td><div class="product-name-cell"><img class="product-thumb" src="../' + escapeHtml(product.image || '') + '" alt=""><div><div class="product-name-text">' + escapeHtml(product.name) + '</div><div class="product-id-text">' + escapeHtml(product.id) + '</div></div></div></td>' +
                    '<td><span class="badge badge-blue">' + escapeHtml(product.categoryLabel || product.category) + '</span></td>' +
                    '<td><span class="badge badge-toggle ' + (product.featured ? 'badge-gold' : 'badge-navy') + '" role="button" tabindex="0" aria-label="' + (product.featured ? '取消首页推荐' : '设为首页推荐') + '" data-toggle-featured="' + escapeHtml(product.id) + '">' + (product.featured ? '首页推荐' : '普通') + '</span></td>' +
                    '<td class="cell-muted">' + escapeHtml(product.shortDesc || '') + '</td>' +
                    '<td><div class="actions-cell"><button class="btn btn-icon btn-icon-edit" aria-label="编辑产品" data-edit-product="' + escapeHtml(product.id) + '">' + ICON_EDIT + '</button><button class="btn btn-icon btn-icon-delete" aria-label="删除产品" data-delete-product="' + escapeHtml(product.id) + '">' + ICON_DELETE + '</button></div></td>' +
                    '</tr>';
            }).join('');

            tbody.querySelectorAll('[data-edit-product]').forEach(function (btn) {
                btn.addEventListener('click', function () { openProductModal(btn.getAttribute('data-edit-product')); });
            });
            tbody.querySelectorAll('[data-delete-product]').forEach(function (btn) {
                btn.addEventListener('click', function () { deleteProduct(btn.getAttribute('data-delete-product')); });
            });
            tbody.querySelectorAll('[data-toggle-featured]').forEach(function (badge) {
                badge.addEventListener('click', function () { toggleFeatured(badge.getAttribute('data-toggle-featured')); });
                badge.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFeatured(badge.getAttribute('data-toggle-featured')); }
                });
            });
        }

        function bindProductEvents() {
            var btnAddProduct = document.getElementById('btn-add-product');
            if (btnAddProduct) btnAddProduct.addEventListener('click', function () { openProductModal(null); });

            var productSearch = document.getElementById('product-search');
            if (productSearch) productSearch.addEventListener('input', renderProductsTable);
            var productCatFilter = document.getElementById('product-category-filter');
            if (productCatFilter) productCatFilter.addEventListener('change', renderProductsTable);

            bindModalClose('product-modal', ['modal-close', 'modal-cancel']);

            var category = document.getElementById('field-category');
            if (category) {
                category.addEventListener('change', function () {
                    var match = CATEGORIES.find(function (item) { return item.value === category.value; });
                    if (!match) return;
                    if (!document.getElementById('field-categoryLabel').value) document.getElementById('field-categoryLabel').value = match.label;
                    if (!document.getElementById('field-categoryLabelAr').value) document.getElementById('field-categoryLabelAr').value = match.labelAr;
                });
            }

            var imageInput = document.getElementById('field-image');
            if (imageInput) imageInput.addEventListener('change', uploadProductImage);

            var btnAddSpec = document.getElementById('btn-add-spec');
            if (btnAddSpec) btnAddSpec.addEventListener('click', function () { addSpecRow('', ''); });

            var form = document.getElementById('product-form');
            if (form) form.addEventListener('submit', saveProduct);

            [['field-id','input'],['field-name','input'],['field-categoryLabel','input'],['field-category','change']].forEach(function (pair) {
                var el = document.getElementById(pair[0]);
                if (el) el.addEventListener(pair[1], function () { clearFieldError(pair[0]); });
            });
        }

        function openProductModal(productId) {
            editingProductId = productId;
            uploadedImagePath = '';
            var modal = document.getElementById('product-modal');
            var title = document.getElementById('modal-title');
            var form = document.getElementById('product-form');
            form.reset();
            document.getElementById('specs-list').innerHTML = '';
            document.getElementById('image-preview').style.display = 'none';
            document.getElementById('image-preview').innerHTML = '';
            document.getElementById('upload-area').style.display = '';
            document.getElementById('field-id').disabled = !!productId;

            if (productId) {
                title.textContent = '编辑产品';
                apiRequest('/products/' + encodeURIComponent(productId)).then(function (product) {
                    fillProductForm(product);
                }).catch(function (err) { showToast('加载产品失败：' + err.message, 'error'); });
            } else {
                title.textContent = '新增产品';
                addSpecRow('', '');
            }
            modal.classList.add('show');
        }

        function fillProductForm(product) {
            ['id', 'name', 'nameAr', 'categoryLabel', 'categoryLabelAr', 'shortDesc', 'shortDescAr', 'description', 'descriptionAr'].forEach(function (key) {
                var field = document.getElementById('field-' + key);
                if (field) field.value = product[key] || '';
            });
            var categoryField = document.getElementById('field-category');
            if (categoryField) {
                if (product.group === 'ev-charger' || product.group === 'switchgear') {
                    categoryField.value = product.subCategory || product.category || '';
                } else if (product.category === 'switchgear') {
                    categoryField.value = product.subCategory || 'medium-low-voltage';
                } else {
                    categoryField.value = product.subCategory || product.category || '';
                }
            }
            document.getElementById('field-capacities').value = (product.capacities || []).join(', ');
            document.getElementById('field-voltages').value = (product.voltages || []).join(', ');
            document.getElementById('field-featured').checked = !!product.featured;
            uploadedImagePath = product.image || '';
            if (uploadedImagePath) showImagePreview('../' + uploadedImagePath);
            (product.specs || []).forEach(function (spec) { addSpecRow(spec[0], spec[1]); });
            if (!(product.specs || []).length) addSpecRow('', '');
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
            var categoryLabel = document.getElementById('field-categoryLabel').value.trim();
            var categoryMeta = CATEGORIES.find(function (item) { return item.value === category; }) || {};

            ['field-id', 'field-name', 'field-category', 'field-categoryLabel'].forEach(clearFieldError);
            var valid = true;
            if (!id) { showFieldError('field-id', '请填写产品 ID'); valid = false; }
            if (!name) { showFieldError('field-name', '请填写英文名称'); valid = false; }
            if (!category) { showFieldError('field-category', '请选择分类'); valid = false; }
            if (!categoryLabel) { showFieldError('field-categoryLabel', '请填写英文分类名'); valid = false; }
            if (!valid) return;

            var payload = {
                id: id,
                name: name,
                nameAr: document.getElementById('field-nameAr').value.trim(),
                image: uploadedImagePath,
                category: category,
                group: categoryMeta.group || (category === 'switchgear' ? 'switchgear' : 'transformer'),
                subCategory: categoryMeta.subCategory || category,
                categoryLabel: categoryLabel,
                categoryLabelAr: document.getElementById('field-categoryLabelAr').value.trim(),
                shortDesc: document.getElementById('field-shortDesc').value.trim(),
                shortDescAr: document.getElementById('field-shortDescAr').value.trim(),
                description: document.getElementById('field-description').value.trim(),
                descriptionAr: document.getElementById('field-descriptionAr').value.trim(),
                capacities: splitList(document.getElementById('field-capacities').value),
                voltages: splitList(document.getElementById('field-voltages').value),
                specs: getSpecsFromForm(),
                featured: document.getElementById('field-featured').checked
            };

            var request = editingProductId
                ? apiRequest('/products/' + encodeURIComponent(editingProductId), { method: 'PUT', body: payload })
                : apiRequest('/products', { method: 'POST', body: payload });

            request.then(function () {
                showToast(editingProductId ? '产品已更新' : '产品已新增');
                closeModal('product-modal');
                loadProducts();
            }).catch(function (err) {
                showToast('保存产品失败：' + err.message, 'error');
            });
        }

        function splitList(value) {
            return value.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
        }

        function deleteProduct(productId) {
            var product = products.find(function (item) { return item.id === productId; });
            showConfirm('删除产品', '确定删除 "' + (product ? product.name : productId) + '" 吗？').then(function (ok) {
                if (!ok) return;
                apiRequest('/products/' + encodeURIComponent(productId), { method: 'DELETE' }).then(function () {
                    showToast('产品已删除');
                    loadProducts();
                }).catch(function (err) { showToast('删除失败：' + err.message, 'error'); });
            });
        }

        function toggleFeatured(productId) {
            var product = products.find(function (p) { return p.id === productId; });
            if (!product) return;
            var badge = document.querySelector('[data-toggle-featured="' + productId + '"]');
            if (badge) badge.style.pointerEvents = 'none';
            var newFeatured = !product.featured;
            apiRequest('/products/' + encodeURIComponent(productId), {
                method: 'PUT',
                body: Object.assign({}, product, { featured: newFeatured })
            }).then(function (updated) {
                product.featured = updated.featured;
                renderProductsTable();
                setText('stat-featured', products.filter(function (p) { return p.featured; }).length);
                showToast(updated.featured ? '已加入首页推荐' : '已取消首页推荐');
            }).catch(function (err) {
                if (badge) badge.style.pointerEvents = '';
                showToast('操作失败：' + err.message, 'error');
            });
        }

        function loadInquiries() {
            document.getElementById('inquiries-tbody').innerHTML = skeletonRows(6, 5);
            var status = document.getElementById('inquiry-status-filter').value;
            var url = '/inquiries?pageSize=200' + (status ? '&status=' + encodeURIComponent(status) : '');
            apiRequest(url).then(function (data) {
                inquiries = data.items || [];
                renderInquiriesTable();
            }).catch(function (err) {
                document.getElementById('inquiries-tbody').innerHTML = '<tr><td colspan="6" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
                showToast('加载询盘失败：' + err.message, 'error');
            });
        }

        function renderInquiriesTable() {
            var tbody = document.getElementById('inquiries-tbody');
            if (!inquiries.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="table-empty"><p>暂无询盘</p></td></tr>';
                return;
            }
            tbody.innerHTML = inquiries.map(function (item) {
                return '<tr>' +
                    '<td><div class="product-name-text">' + escapeHtml(item.name) + '</div><div class="product-id-text">' + escapeHtml(item.email) + '</div></td>' +
                    '<td>' + escapeHtml(item.company || '-') + '</td>' +
                    '<td>' + escapeHtml(item.subject || '-') + '</td>' +
                    '<td>' + formatDate(item.createdAt) + '</td>' +
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
        }

        function bindInquiryEvents() {
            var filter = document.getElementById('inquiry-status-filter');
            if (filter) filter.addEventListener('change', loadInquiries);
            bindModalClose('inquiry-modal', ['inquiry-modal-close', 'inquiry-cancel']);
            var save = document.getElementById('inquiry-save');
            if (save) save.addEventListener('click', saveInquiryStatus);
            var reply = document.getElementById('inquiry-reply');
            if (reply) reply.addEventListener('click', replyByEmail);
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
                apiRequest('/inquiries/' + encodeURIComponent(openedInquiry.id), {
                    method: 'PUT',
                    body: { status: 'replied', notes: currentNotes }
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
            apiRequest('/inquiries/' + encodeURIComponent(id)).then(function (item) {
                openedInquiry = item;
                document.getElementById('inquiry-detail').innerHTML =
                    detailItem('客户姓名', item.name) +
                    detailItem('邮箱', item.email) +
                    detailItem('公司', item.company || '-') +
                    detailItem('电话', item.phone || '-') +
                    detailItem('主题', item.subject || '-') +
                    detailItem('提交时间', formatDate(item.createdAt)) +
                    detailItem('IP 地址', item.ip || '-') +
                    '<div class="detail-item detail-full"><strong>消息内容</strong><p>' + escapeHtml(item.message || '') + '</p></div>';
                document.getElementById('inquiry-status').value = item.status || 'new';
                document.getElementById('inquiry-notes').value = item.notes || '';
                if (item.productContext) {
                    document.getElementById('inquiry-detail').insertAdjacentHTML('beforeend', detailItem('Product', item.productContext));
                }
                document.getElementById('inquiry-modal').classList.add('show');

                if (item.status === 'new') {
                    openedInquiry.status = 'read';
                    apiRequest('/inquiries/' + encodeURIComponent(id), { method: 'PUT', body: { status: 'read', notes: item.notes || '' } })
                        .then(function () {
                            document.getElementById('inquiry-status').value = 'read';
                            if (currentView === 'inquiries') {
                                loadInquiries();
                            } else {
                                renderRecentInquiries();
                            }
                        })
                        .catch(function (err) { showToast('标记已读失败：' + err.message, 'error'); });
                }
            }).catch(function (err) { showToast('加载询盘详情失败：' + err.message, 'error'); });
        }

        function detailItem(label, value) {
            return '<div class="detail-item"><strong>' + label + '</strong><span>' + escapeHtml(value) + '</span></div>';
        }

        function saveInquiryStatus() {
            if (!editingInquiryId) return;
            apiRequest('/inquiries/' + encodeURIComponent(editingInquiryId), {
                method: 'PUT',
                body: {
                    status: document.getElementById('inquiry-status').value,
                    notes: document.getElementById('inquiry-notes').value
                }
            }).then(function () {
                showToast('询盘状态已保存');
                closeModal('inquiry-modal');
                loadInquiries();
            }).catch(function (err) { showToast('保存失败：' + err.message, 'error'); });
        }

        function deleteInquiry(id) {
            showConfirm('删除询盘', '确定删除这条询盘吗？').then(function (ok) {
                if (!ok) return;
                apiRequest('/inquiries/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () {
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
            var addBtn = document.getElementById('btn-add-certification');
            if (addBtn) addBtn.addEventListener('click', function () { openCertificationModal(null); });
            bindModalClose('certification-modal', ['certification-modal-close', 'certification-cancel']);
            var form = document.getElementById('certification-form');
            if (form) form.addEventListener('submit', saveCertification);
            var certFile = document.getElementById('cert-file');
            if (certFile) certFile.addEventListener('change', uploadCertificationFile);
        }

        function loadCertifications() {
            document.getElementById('certifications-tbody').innerHTML = skeletonRows(5, 4);
            apiRequest('/certifications').then(function (data) {
                certifications = data;
                renderCertificationsTable();
            }).catch(function (err) {
                document.getElementById('certifications-tbody').innerHTML = '<tr><td colspan="5" class="table-empty"><p>加载失败，请刷新重试</p></td></tr>';
                showToast('加载证书失败：' + err.message, 'error');
            });
        }

        function renderCertificationsTable() {
            var tbody = document.getElementById('certifications-tbody');
            if (!certifications.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="table-empty"><p>暂无证书</p></td></tr>';
                return;
            }
            tbody.innerHTML = certifications.map(function (item) {
                return '<tr><td>' + escapeHtml(item.name) + '</td><td>' + escapeHtml(item.issuer || '-') + '</td><td>' + escapeHtml(item.expiryDate || '-') + '</td><td class="cell-muted">' + escapeHtml(item.image || '未设置') + '</td><td><div class="actions-cell"><button class="btn btn-icon btn-icon-edit" aria-label="编辑证书" data-edit-cert="' + escapeHtml(item.id) + '">' + ICON_EDIT + '</button><button class="btn btn-icon btn-icon-delete" aria-label="删除证书" data-delete-cert="' + escapeHtml(item.id) + '">' + ICON_DELETE + '</button></div></td></tr>';
            }).join('');
            tbody.querySelectorAll('[data-edit-cert]').forEach(function (btn) {
                btn.addEventListener('click', function () { openCertificationModal(btn.getAttribute('data-edit-cert')); });
            });
            tbody.querySelectorAll('[data-delete-cert]').forEach(function (btn) {
                btn.addEventListener('click', function () { deleteCertification(btn.getAttribute('data-delete-cert')); });
            });
        }

        function openCertificationModal(id) {
            editingCertificationId = id;
            uploadedCertificationPath = '';
            document.getElementById('certification-form').reset();
            document.getElementById('certification-modal-title').textContent = id ? '编辑证书' : '新增证书';
            if (id) {
                var item = certifications.find(function (cert) { return cert.id === id; });
                if (item) {
                    ['name', 'issuer', 'expiryDate', 'image', 'description'].forEach(function (key) {
                        document.getElementById('cert-' + key).value = item[key] || '';
                    });
                    uploadedCertificationPath = item.image || '';
                }
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
                name: document.getElementById('cert-name').value.trim(),
                issuer: document.getElementById('cert-issuer').value.trim(),
                expiryDate: document.getElementById('cert-expiryDate').value.trim(),
                image: document.getElementById('cert-image').value.trim() || uploadedCertificationPath,
                description: document.getElementById('cert-description').value.trim()
            };
            if (!payload.name) {
                showToast('请填写证书名称', 'error');
                return;
            }
            var request = editingCertificationId
                ? apiRequest('/certifications/' + encodeURIComponent(editingCertificationId), { method: 'PUT', body: payload })
                : apiRequest('/certifications', { method: 'POST', body: payload });
            request.then(function () {
                showToast('证书已保存');
                closeModal('certification-modal');
                loadCertifications();
            }).catch(function (err) { showToast('保存证书失败：' + err.message, 'error'); });
        }

        function deleteCertification(id) {
            showConfirm('删除证书', '确定删除这个证书吗？').then(function (ok) {
                if (!ok) return;
                apiRequest('/certifications/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () {
                    showToast('证书已删除');
                    loadCertifications();
                }).catch(function (err) { showToast('删除失败：' + err.message, 'error'); });
            });
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
            apiRequest('/education/editor', { method: 'PUT', body: payload }).then(function (data) {
                educationContent = data.education || payload;
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
