(function () {
    'use strict';

    var API_BASE = '../api';
    var categories = [];
    var STATUS_LABELS = { new: '新询盘', read: '已读', replied: '已回复', closed: '已关闭' };
    var STATUS_BADGES = { new: 'badge-gold', read: 'badge-blue', replied: 'badge-green', closed: 'badge-navy' };
    var ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    var ICON_DELETE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
    var ICON_VIEW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    var CJK_RE = /[一-鿿㐀-䶿豈-﫿]/;

    function hasChinese(str) {
        return CJK_RE.test(str);
    }

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
        var editingProductId = null;
        var uploadedImagePath = '';
        var editingInquiryId = null;
        var openedInquiry = null;
        var editingCertificationId = null;
        var catModalMode = null;
        var catModalGroupId = null;
        var catModalSubId = null;

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
        loadCategories();
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
                categories: '分类管理'
            };
            document.getElementById('header-title').textContent = titles[view] || '';

            if (view === 'dashboard') loadDashboard();
            if (view === 'products') loadProducts();
            if (view === 'inquiries') loadInquiries();
            if (view === 'company') loadCompany();
            if (view === 'certifications') loadCertifications();
            if (view === 'categories') renderCategoriesView();
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

            setText('stat-total', products.length);
            setText('stat-featured', featured.length);
            setText('stat-categories', categories.length);
            setText('stat-inquiries', inquiries.length);
            setText('stat-new-inquiries', inquiries.filter(function (item) { return item.status === 'new'; }).length);

            var catGrid = document.getElementById('category-stats');
            if (catGrid) {
                if (!categories.length) {
                    catGrid.innerHTML = '<p class="table-empty">分类加载中…</p>';
                } else {
                    catGrid.innerHTML = categories.map(function (group) {
                        var count = products.filter(function (p) {
                            return p.group === group.id || (!p.group && group.id === 'transformer');
                        }).length;
                        return '<div class="category-stat-card"><span class="badge badge-blue">' + count + '</span><div><div class="category-stat-count">' + count + '</div><div class="category-stat-label">' + escapeHtml(group.label) + '</div></div></div>';
                    }).join('');
                }
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
                var matchCat = !catVal;
                if (!matchCat) {
                    var parts = catVal.split('/');
                    if (parts.length === 2) {
                        matchCat = (p.group === parts[0] && p.subCategory === parts[1]) ||
                            (!p.group && p.category === parts[1]);
                    } else {
                        matchCat = p.group === catVal || (!p.group && p.category === catVal);
                    }
                }
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

            var groupSelect = document.getElementById('field-group');
            var subSelect = document.getElementById('field-subCategory');

            if (groupSelect) {
                groupSelect.addEventListener('change', function () {
                    clearFieldError('field-group');
                    var groupId = groupSelect.value;
                    var group = categories.find(function (g) { return g.id === groupId; });
                    subSelect.innerHTML = '<option value="">选择小类</option>';
                    subSelect.disabled = !group;
                    document.getElementById('field-category').value = '';
                    document.getElementById('field-categoryLabel').value = '';
                    document.getElementById('field-categoryLabelAr').value = '';
                    if (group) {
                        group.subcategories.forEach(function (s) {
                            subSelect.innerHTML += '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.label) + '</option>';
                        });
                    }
                });
            }

            if (subSelect) {
                subSelect.addEventListener('change', function () {
                    clearFieldError('field-subCategory');
                    var groupId = groupSelect ? groupSelect.value : '';
                    var subId = subSelect.value;
                    var group = categories.find(function (g) { return g.id === groupId; });
                    var sub = group && group.subcategories.find(function (s) { return s.id === subId; });
                    document.getElementById('field-category').value = subId;
                    if (sub) {
                        if (!document.getElementById('field-categoryLabel').value)
                            document.getElementById('field-categoryLabel').value = sub.label || '';
                        if (!document.getElementById('field-categoryLabelAr').value)
                            document.getElementById('field-categoryLabelAr').value = sub.labelAr || '';
                    }
                });
            }

            var imageInput = document.getElementById('field-image');
            var uploadArea = document.getElementById('upload-area');
            if (uploadArea && imageInput) {
                uploadArea.addEventListener('click', function (e) {
                    if (e.target !== imageInput) imageInput.click();
                });
                imageInput.addEventListener('change', uploadProductImage);
            } else if (imageInput) {
                imageInput.addEventListener('change', uploadProductImage);
            }

            var btnAddSpec = document.getElementById('btn-add-spec');
            if (btnAddSpec) btnAddSpec.addEventListener('click', function () { addSpecRow('', ''); });

            var form = document.getElementById('product-form');
            if (form) form.addEventListener('submit', saveProduct);

            [['field-id','input'],['field-name','input']].forEach(function (pair) {
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
            populateGroupSelect();

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

        function populateGroupSelect() {
            var groupSelect = document.getElementById('field-group');
            var subSelect = document.getElementById('field-subCategory');
            if (!groupSelect) return;
            groupSelect.innerHTML = '<option value="">选择大类</option>';
            categories.forEach(function (g) {
                groupSelect.innerHTML += '<option value="' + escapeHtml(g.id) + '">' + escapeHtml(g.label) + '</option>';
            });
            if (subSelect) { subSelect.innerHTML = '<option value="">请先选择大类</option>'; subSelect.disabled = true; }
        }

        function fillProductForm(product) {
            ['id', 'name', 'nameAr', 'category', 'categoryLabel', 'categoryLabelAr', 'shortDesc', 'shortDescAr', 'description', 'descriptionAr'].forEach(function (key) {
                var field = document.getElementById('field-' + key);
                if (field) field.value = product[key] || '';
            });
            document.getElementById('field-capacities').value = (product.capacities || []).join(', ');
            document.getElementById('field-voltages').value = (product.voltages || []).join(', ');
            document.getElementById('field-featured').checked = !!product.featured;
            uploadedImagePath = product.image || '';
            if (uploadedImagePath) showImagePreview('../' + uploadedImagePath);
            (product.specs || []).forEach(function (spec) { addSpecRow(spec[0], spec[1]); });
            if (!(product.specs || []).length) addSpecRow('', '');

            var groupId = product.group || (product.category === 'switchgear' ? 'switchgear' : (product.category === 'ev-charger' ? 'ev-charger' : 'transformer'));
            var subId = product.subCategory || product.category || '';
            var groupSelect = document.getElementById('field-group');
            var subSelect = document.getElementById('field-subCategory');
            if (groupSelect) {
                groupSelect.value = groupId;
                var group = categories.find(function (g) { return g.id === groupId; });
                if (subSelect) {
                    subSelect.innerHTML = '<option value="">选择小类</option>';
                    subSelect.disabled = false;
                    if (group) {
                        group.subcategories.forEach(function (s) {
                            subSelect.innerHTML += '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.label) + '</option>';
                        });
                    }
                    subSelect.value = subId;
                }
            }
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
            var groupId = (document.getElementById('field-group') || {}).value || '';
            var subCategoryId = (document.getElementById('field-subCategory') || {}).value || '';
            var category = document.getElementById('field-category').value || subCategoryId;
            var categoryLabel = document.getElementById('field-categoryLabel').value.trim();

            ['field-id', 'field-name', 'field-group', 'field-subCategory'].forEach(clearFieldError);
            var valid = true;
            if (!id) { showFieldError('field-id', '请填写产品 ID'); valid = false; }
            if (id && hasChinese(id)) { showFieldError('field-id', '产品 ID 不能包含中文'); valid = false; }
            if (!name) { showFieldError('field-name', '请填写英文名称'); valid = false; }
            if (name && hasChinese(name)) { showFieldError('field-name', '英文名称不能包含中文'); valid = false; }
            if (!groupId) { showFieldError('field-group', '请选择大类'); valid = false; }
            if (!subCategoryId) { showFieldError('field-subCategory', '请选择小类'); valid = false; }
            if (!valid) return;

            var group = categories.find(function (g) { return g.id === groupId; });
            var sub = group && group.subcategories.find(function (s) { return s.id === subCategoryId; });
            var resolvedLabel = categoryLabel || (sub ? sub.label : subCategoryId);
            var resolvedLabelAr = document.getElementById('field-categoryLabelAr').value.trim() || (sub ? sub.labelAr : '');

            var payload = {
                id: id,
                name: name,
                nameAr: document.getElementById('field-nameAr').value.trim(),
                image: uploadedImagePath,
                group: groupId,
                subCategory: subCategoryId,
                category: category || subCategoryId,
                categoryLabel: resolvedLabel,
                categoryLabelAr: resolvedLabelAr,
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

        function loadCategories() {
            apiRequest('/categories').then(function (data) {
                categories = Array.isArray(data) ? data : [];
                populateCategoryFilter();
                if (document.getElementById('view-categories').classList.contains('active')) {
                    renderCategoriesView();
                }
                if (document.getElementById('view-dashboard').classList.contains('active') && products.length) {
                    renderDashboard();
                }
            }).catch(function () {
                categories = [];
            });
        }

        function populateCategoryFilter() {
            var filter = document.getElementById('product-category-filter');
            if (!filter) return;
            filter.innerHTML = '<option value="">全部分类</option>';
            categories.forEach(function (group) {
                var optgroup = document.createElement('optgroup');
                optgroup.label = group.label;
                group.subcategories.forEach(function (sub) {
                    var opt = document.createElement('option');
                    opt.value = group.id + '/' + sub.id;
                    opt.textContent = sub.label;
                    optgroup.appendChild(opt);
                });
                filter.appendChild(optgroup);
            });
        }

        function renderCategoriesView() {
            var tree = document.getElementById('category-tree');
            if (!tree) return;
            if (!categories.length) {
                tree.innerHTML = '<p class="table-empty">暂无分类数据</p>';
                return;
            }
            tree.innerHTML = categories.map(function (group) {
                var subs = group.subcategories.map(function (sub) {
                    return '<div class="cat-sub-item">' +
                        '<span class="cat-sub-label">' + escapeHtml(sub.label) + (sub.labelZh ? '<em class="cat-label-zh">（' + escapeHtml(sub.labelZh) + '）</em>' : '') + '</span>' +
                        '<div class="cat-actions">' +
                            '<button class="btn btn-icon btn-icon-edit" title="编辑小类" data-edit-sub="' + escapeHtml(group.id + '/' + sub.id) + '">' + ICON_EDIT + '</button>' +
                            '<button class="btn btn-icon btn-icon-delete" title="删除小类" data-delete-sub="' + escapeHtml(group.id + '/' + sub.id) + '">' + ICON_DELETE + '</button>' +
                        '</div></div>';
                }).join('');
                return '<div class="cat-group">' +
                    '<div class="cat-group-header">' +
                        '<span class="cat-group-label">' + escapeHtml(group.label) + (group.labelZh ? '<em class="cat-label-zh">（' + escapeHtml(group.labelZh) + '）</em>' : '') + '</span>' +
                        '<div class="cat-actions">' +
                            '<button class="btn btn-sm btn-secondary" data-add-sub="' + escapeHtml(group.id) + '">+ 新增小类</button>' +
                            '<button class="btn btn-icon btn-icon-edit" title="编辑大类" data-edit-group="' + escapeHtml(group.id) + '">' + ICON_EDIT + '</button>' +
                            '<button class="btn btn-icon btn-icon-delete" title="删除大类" data-delete-group="' + escapeHtml(group.id) + '">' + ICON_DELETE + '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="cat-subs">' + (subs || '<p class="cat-empty">暂无小类</p>') + '</div>' +
                '</div>';
            }).join('');

            tree.querySelectorAll('[data-edit-group]').forEach(function (btn) {
                btn.addEventListener('click', function () { openCatModal('edit-group', btn.getAttribute('data-edit-group'), null); });
            });
            tree.querySelectorAll('[data-delete-group]').forEach(function (btn) {
                btn.addEventListener('click', function () { deleteCatGroup(btn.getAttribute('data-delete-group')); });
            });
            tree.querySelectorAll('[data-add-sub]').forEach(function (btn) {
                btn.addEventListener('click', function () { openCatModal('add-sub', btn.getAttribute('data-add-sub'), null); });
            });
            tree.querySelectorAll('[data-edit-sub]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var parts = btn.getAttribute('data-edit-sub').split('/');
                    openCatModal('edit-sub', parts[0], parts[1]);
                });
            });
            tree.querySelectorAll('[data-delete-sub]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var parts = btn.getAttribute('data-delete-sub').split('/');
                    deleteCatSub(parts[0], parts[1]);
                });
            });
        }

        function openCatModal(mode, groupId, subId) {
            catModalMode = mode;
            catModalGroupId = groupId;
            catModalSubId = subId;

            var titles = { 'add-group': '新增大类', 'edit-group': '编辑大类', 'add-sub': '新增小类', 'edit-sub': '编辑小类' };
            document.getElementById('cat-modal-title').textContent = titles[mode] || '分类';

            var group = groupId && categories.find(function (g) { return g.id === groupId; });
            var sub = group && subId && group.subcategories.find(function (s) { return s.id === subId; });
            var src = (mode === 'edit-group') ? group : (mode === 'edit-sub' ? sub : null);

            document.getElementById('cat-label').value = src ? (src.label || '') : '';
            document.getElementById('cat-labelAr').value = src ? (src.labelAr || '') : '';
            document.getElementById('cat-labelZh').value = src ? (src.labelZh || '') : '';

            document.getElementById('cat-modal').classList.add('show');
            setTimeout(function () { var el = document.getElementById('cat-label'); if (el) el.focus(); }, 50);
        }

        function saveCatModal() {
            var label = document.getElementById('cat-label').value.trim();
            if (!label) { document.getElementById('cat-label').focus(); showToast('请填写英文名称', 'error'); return; }
            if (hasChinese(label)) { document.getElementById('cat-label').focus(); showToast('英文名称不能包含中文，请将中文填写在"中文名称"字段', 'error'); return; }
            var body = {
                label: label,
                labelAr: document.getElementById('cat-labelAr').value.trim(),
                labelZh: document.getElementById('cat-labelZh').value.trim()
            };
            var url, method;
            if (catModalMode === 'add-group') { url = '/categories'; method = 'POST'; }
            else if (catModalMode === 'edit-group') { url = '/categories/' + encodeURIComponent(catModalGroupId); method = 'PUT'; }
            else if (catModalMode === 'add-sub') { url = '/categories/' + encodeURIComponent(catModalGroupId) + '/subcategories'; method = 'POST'; }
            else if (catModalMode === 'edit-sub') { url = '/categories/' + encodeURIComponent(catModalGroupId) + '/subcategories/' + encodeURIComponent(catModalSubId); method = 'PUT'; }
            apiRequest(url, { method: method, body: body }).then(function () {
                showToast('已保存');
                closeModal('cat-modal');
                loadCategories();
            }).catch(function (err) { showToast('保存失败：' + err.message, 'error'); });
        }

        function deleteCatGroup(groupId) {
            var group = categories.find(function (g) { return g.id === groupId; });
            showConfirm('删除大类', '确定删除大类 "' + (group ? group.label : groupId) + '" 及其所有小类吗？此操作不可恢复。').then(function (ok) {
                if (!ok) return;
                apiRequest('/categories/' + encodeURIComponent(groupId), { method: 'DELETE' }).then(function () {
                    showToast('大类已删除');
                    loadCategories();
                }).catch(function (err) { showToast('删除失败：' + err.message, 'error'); });
            });
        }

        function deleteCatSub(groupId, subId) {
            var group = categories.find(function (g) { return g.id === groupId; });
            var sub = group && group.subcategories.find(function (s) { return s.id === subId; });
            showConfirm('删除小类', '确定删除小类 "' + (sub ? sub.label : subId) + '" 吗？').then(function (ok) {
                if (!ok) return;
                apiRequest('/categories/' + encodeURIComponent(groupId) + '/subcategories/' + encodeURIComponent(subId), { method: 'DELETE' }).then(function () {
                    showToast('小类已删除');
                    loadCategories();
                }).catch(function (err) { showToast('删除失败：' + err.message, 'error'); });
            });
        }

        function bindCategoryEvents() {
            var btnAdd = document.getElementById('btn-add-category');
            if (btnAdd) btnAdd.addEventListener('click', function () { openCatModal('add-group', null, null); });

            var catModalClose = document.getElementById('cat-modal-close');
            if (catModalClose) catModalClose.addEventListener('click', function () { closeModal('cat-modal'); });
            var catModalCancel = document.getElementById('cat-modal-cancel');
            if (catModalCancel) catModalCancel.addEventListener('click', function () { closeModal('cat-modal'); });
            var catModalSubmit = document.getElementById('cat-modal-submit');
            if (catModalSubmit) catModalSubmit.addEventListener('click', saveCatModal);

            var catForm = document.getElementById('cat-form');
            if (catForm) catForm.addEventListener('submit', function (e) { e.preventDefault(); saveCatModal(); });

            var overlay = document.getElementById('cat-modal');
            if (overlay) overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeModal('cat-modal');
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
            var btn = document.getElementById('btn-save-company');
            if (btn) { btn.disabled = true; btn.textContent = '加载中...'; }
            apiRequest('/company').then(function (data) {
                Object.keys(data).forEach(function (key) {
                    var field = document.getElementById('company-' + key);
                    if (field) field.value = data[key];
                });
            }).catch(function (err) {
                showToast('加载公司信息失败：' + err.message, 'error');
            }).finally(function () {
                if (btn) { btn.disabled = false; btn.textContent = '保存公司信息'; }
            });
        }

        function bindCertificationEvents() {
            var addBtn = document.getElementById('btn-add-certification');
            if (addBtn) addBtn.addEventListener('click', function () { openCertificationModal(null); });
            bindModalClose('certification-modal', ['certification-modal-close', 'certification-cancel']);
            var form = document.getElementById('certification-form');
            if (form) form.addEventListener('submit', saveCertification);
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
            document.getElementById('certification-form').reset();
            document.getElementById('certification-modal-title').textContent = id ? '编辑证书' : '新增证书';
            if (id) {
                var item = certifications.find(function (cert) { return cert.id === id; });
                if (item) {
                    ['name', 'issuer', 'expiryDate', 'image', 'description'].forEach(function (key) {
                        document.getElementById('cert-' + key).value = item[key] || '';
                    });
                }
            }
            document.getElementById('certification-modal').classList.add('show');
        }

        function saveCertification(e) {
            e.preventDefault();
            var payload = {
                name: document.getElementById('cert-name').value.trim(),
                issuer: document.getElementById('cert-issuer').value.trim(),
                expiryDate: document.getElementById('cert-expiryDate').value.trim(),
                image: document.getElementById('cert-image').value.trim(),
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
