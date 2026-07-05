(function () {
    'use strict';

    var modules = window.LongxiangAdminModules = window.LongxiangAdminModules || {};

    modules.products = function createProductsModule(context) {
        context = context || {};

        function requireDependency(name) {
            if (!context[name]) throw new Error('产品模块缺少依赖：' + name);
            return context[name];
        }

        var apiRequest = requireDependency('apiRequest');
        var unwrapDataResponse = requireDependency('unwrapDataResponse');
        var unwrapListResponse = requireDependency('unwrapListResponse');
        var escapeHtml = requireDependency('escapeHtml');
        var showToast = requireDependency('showToast');
        var showConfirm = requireDependency('showConfirm');
        var skeletonRows = requireDependency('skeletonRows');
        var emptyRow = requireDependency('emptyRow');
        var clearErrorBanner = requireDependency('clearErrorBanner');
        var showErrorBanner = requireDependency('showErrorBanner');
        var formatDate = requireDependency('formatDate');
        var bindModalClose = requireDependency('bindModalClose');
        var showModal = requireDependency('showModal');
        var closeModal = requireDependency('closeModal');
        var switchView = requireDependency('switchView');
        var resetFormDirty = requireDependency('resetFormDirty');
        var markFormDirty = requireDependency('markFormDirty');
        var showDraftRecovery = requireDependency('showDraftRecovery');
        var draftKey = requireDependency('draftKey');
        var restoreFormDraft = requireDependency('restoreFormDraft');
        var collectFormDraft = requireDependency('collectFormDraft');
        var safeSessionRemove = requireDependency('safeSessionRemove');
        var safeSessionSet = requireDependency('safeSessionSet');
        var showConflictNotice = requireDependency('showConflictNotice');
        var adminProductNameCn = requireDependency('adminProductNameCn');
        var assetPreviewSrc = requireDependency('assetPreviewSrc');
        var uploadAdminAssetFile = requireDependency('uploadAdminAssetFile');
        var openAssetPicker = requireDependency('openAssetPicker');
        var loadProductCategories = requireDependency('loadProductCategories');
        var populateProductCategorySelects = requireDependency('populateProductCategorySelects');
        var buildVersionMap = requireDependency('buildVersionMap');
        var runBatchAction = requireDependency('runBatchAction');
        var batchActionLabel = requireDependency('batchActionLabel');
        var setActiveModalTrigger = requireDependency('setActiveModalTrigger');
        var getActiveElement = requireDependency('getActiveElement');
        var ICON_VIEW = context.ICON_VIEW || '';
        var ICON_EDIT = context.ICON_EDIT || '';
        var ICON_DELETE = context.ICON_DELETE || '';

        var products = [];
        var editingProductId = null;
        var editingProductVersion = null;
        var uploadedImagePath = '';
        var productGalleryPaths = [];
        var productImageUploading = false;
        var productPreviewIdentifier = '';
        var productSearchTimer = null;
        var productPage = 1;
        var productMeta = { page: 1, pageSize: 20, total: 0 };

        var SEO_LENGTH_RULES = {
            'field-seo-title': { min: 20, max: 70, label: 'SEO 标题' },
            'field-seo-title-fr': { min: 20, max: 70, label: '法语 SEO 标题' },
            'field-seo-title-ru': { min: 20, max: 70, label: '俄语 SEO 标题' },
            'field-seo-description': { min: 70, max: 170, label: 'SEO 描述' },
            'field-seo-description-fr': { min: 70, max: 170, label: '法语 SEO 描述' },
            'field-seo-description-ru': { min: 70, max: 170, label: '俄语 SEO 描述' }
        };

        function setProductCoverPath(path) {
            uploadedImagePath = path || '';
            var coverField = document.getElementById('field-cover-image');
            if (coverField) coverField.value = uploadedImagePath;
            updateProductCompletenessSummary();
        }

        function getProductUploadPath(response) {
            var uploaded = response && (response.data || response);
            var path = uploaded && (uploaded.path || uploaded.public_path || uploaded.url || uploaded.location);
            if (!path) return '';
            path = String(path).trim().replace(/\\/g, '/');
            path = path.replace(/^https?:\/\/[^/]+\//i, '');
            return path.replace(/^\/+/, '');
        }

        function productPreviewPath(localeCode) {
            if (!productPreviewIdentifier) return '';
            var encoded = encodeURIComponent(productPreviewIdentifier);
            if (localeCode === 'ar') return '../ar/products/' + encoded;
            if (localeCode === 'fr') return '../fr/products/' + encoded;
            if (localeCode === 'ru') return '../ru/products/' + encoded;
            return '../products/' + encoded;
        }

        function updateProductPreviewState() {
            document.querySelectorAll('[data-product-preview-locale]').forEach(function (button) {
                button.disabled = !productPreviewIdentifier;
            });
            var hint = document.getElementById('product-preview-hint');
            if (hint) {
                hint.textContent = productPreviewIdentifier
                    ? '将打开当前产品的四语前台详情页；如刚保存内容，请刷新前台确认。'
                    : '新增产品保存后才会生成可预览的产品详情页。';
            }
        }

        function openProductPreview(localeCode) {
            var path = productPreviewPath(localeCode);
            if (!path) {
                showToast('请先保存产品后再预览。', 'error');
                return;
            }
            window.open(path, '_blank', 'noopener');
        }

        function updateSeoLengthHint(fieldId) {
            var field = document.getElementById(fieldId);
            var hint = document.querySelector('[data-seo-count-for="' + fieldId + '"]');
            var rule = SEO_LENGTH_RULES[fieldId];
            if (!field || !hint || !rule) return;

            var length = String(field.value || '').trim().length;
            var status = 'ok';
            var suffix = '长度合适';
            if (!length) {
                status = 'empty';
                suffix = '未填写';
            } else if (length < rule.min) {
                status = 'warn';
                suffix = '偏短';
            } else if (length > rule.max) {
                status = 'warn';
                suffix = '偏长';
            }
            hint.className = 'seo-length-hint is-' + status;
            hint.textContent = rule.label + '：' + length + ' 字，建议 ' + rule.min + '-' + rule.max + ' 字，' + suffix + '。';
        }

        function updateSeoLengthHints() {
            Object.keys(SEO_LENGTH_RULES).forEach(updateSeoLengthHint);
        }

        function bindSeoLengthHints() {
            Object.keys(SEO_LENGTH_RULES).forEach(function (fieldId) {
                var field = document.getElementById(fieldId);
                if (field) field.addEventListener('input', function () { updateSeoLengthHint(fieldId); });
            });
            updateSeoLengthHints();
        }

        function hasTextField(id) {
            return !!getFieldValue(id);
        }

        function hasAnyTextField(ids) {
            return ids.some(function (id) { return hasTextField(id); });
        }

        function hasProductSpecs() {
            return Array.prototype.some.call(document.querySelectorAll('#specs-list .spec-row'), function (row) {
                var key = row.querySelector('.spec-key');
                var value = row.querySelector('.spec-value');
                return !!((key && key.value.trim()) || (value && value.value.trim()));
            });
        }

        function completenessItem(label, ok, required) {
            return {
                label: label,
                ok: !!ok,
                status: ok ? 'is-ok' : (required ? 'is-danger' : 'is-warn'),
                text: ok ? '已填写' : (required ? '必填缺失' : '建议补齐')
            };
        }

        function updateProductCompletenessSummary() {
            var list = document.getElementById('product-completeness-list');
            if (!list) return;
            var checks = [
                completenessItem('英文名称', hasTextField('field-name'), true),
                completenessItem('产品分类', hasTextField('field-category'), true),
                completenessItem('封面图', hasTextField('field-cover-image'), false),
                completenessItem('英文简介或详情', hasAnyTextField(['field-shortDesc', 'field-description']), false),
                completenessItem('阿语内容', hasAnyTextField(['field-nameAr', 'field-shortDescAr', 'field-descriptionAr']), false),
                completenessItem('法语内容', hasAnyTextField(['field-nameFr', 'field-shortDescFr', 'field-descriptionFr']), false),
                completenessItem('俄语内容', hasAnyTextField(['field-nameRu', 'field-shortDescRu', 'field-descriptionRu']), false),
                completenessItem('产品参数', hasProductSpecs(), false),
                completenessItem('SEO 标题与描述', hasTextField('field-seo-title') && hasTextField('field-seo-description'), false)
            ];
            list.innerHTML = checks.map(function (item) {
                return '<li><strong>' + escapeHtml(item.label) + '</strong><span class="' + item.status + '">' + escapeHtml(item.text) + '</span></li>';
            }).join('');
        }

        function bindProductCompletenessSummary() {
            [
                'field-name', 'field-category', 'field-cover-image',
                'field-shortDesc', 'field-description',
                'field-nameAr', 'field-shortDescAr', 'field-descriptionAr',
                'field-nameFr', 'field-shortDescFr', 'field-descriptionFr',
                'field-nameRu', 'field-shortDescRu', 'field-descriptionRu',
                'field-seo-title', 'field-seo-description'
            ].forEach(function (id) {
                var field = document.getElementById(id);
                if (!field) return;
                field.addEventListener('input', updateProductCompletenessSummary);
                field.addEventListener('change', updateProductCompletenessSummary);
            });
            updateProductCompletenessSummary();
        }


        function setProductSubmitDisabled(disabled) {
            var submit = document.getElementById('modal-submit');
            if (submit) submit.disabled = !!disabled;
        }


        function loadProducts() {
            document.getElementById('products-tbody').innerHTML = skeletonRows(9, 5);
            clearErrorBanner('view-products');
            updateProductBatchBar();
            updateProductsResultCount(null);
            var searchVal = ((document.getElementById('product-search') || {}).value || '').trim();
            var catVal = (document.getElementById('product-category-filter') || {}).value || '';
            var statusVal = (document.getElementById('product-status-filter') || {}).value || '';
            var featuredVal = (document.getElementById('product-featured-filter') || {}).value || '';
            var issueVal = (document.getElementById('product-issue-filter') || {}).value || '';
            var url = '/admin/products?page=' + encodeURIComponent(productPage) + '&pageSize=' + encodeURIComponent(productMeta.pageSize || 20);
            if (searchVal) url += '&q=' + encodeURIComponent(searchVal);
            if (catVal) url += '&category=' + encodeURIComponent(catVal);
            if (statusVal) url += '&status=' + encodeURIComponent(statusVal);
            if (featuredVal !== '') url += '&featured=' + encodeURIComponent(featuredVal);
            if (issueVal) url += '&issue=' + encodeURIComponent(issueVal);
            updateProductClearFilters();

            apiRequest(url).then(function (response) {
                products = unwrapListResponse(response);
                productMeta = response && response.meta ? response.meta : { page: productPage, pageSize: productMeta.pageSize || 20, total: products.length };
                renderProductsTable();
                renderProductsPagination();
            }).catch(function (err) {
                document.getElementById('products-tbody').innerHTML = emptyRow(9, '加载失败，请刷新重试');
                updateProductsResultCount(0);
                showErrorBanner('view-products', '产品数据加载失败，请稍后重试', loadProducts);
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
                (document.getElementById('product-featured-filter') || {}).value || '',
                (document.getElementById('product-issue-filter') || {}).value || ''
            ].some(Boolean);
            btn.style.display = hasFilters ? '' : 'none';
        }

        function updateProductsResultCount(totalOverride) {
            var el = document.getElementById('products-result-count');
            if (!el) return;
            if (totalOverride == null) {
                el.textContent = '正在加载产品...';
                return;
            }
            el.textContent = '共 ' + totalOverride + ' 个产品';
        }

        function syncProductStatusTabs() {
            var status = (document.getElementById('product-status-filter') || {}).value || '';
            document.querySelectorAll('[data-product-status]').forEach(function (btn) {
                var active = btn.getAttribute('data-product-status') === status;
                btn.classList.toggle('active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }

        function setProductStatusFilter(status, issue) {
            var statusFilter = document.getElementById('product-status-filter');
            if (statusFilter) statusFilter.value = status || '';
            var issueFilter = document.getElementById('product-issue-filter');
            if (issueFilter) issueFilter.value = issue || '';
            syncProductStatusTabs();
            productPage = 1;
            loadProducts();
        }

        function renderProductSeoBadges(product) {
            var hasTitle = !!String(product.seo_title || '').trim();
            var hasDescription = !!String(product.seo_description || '').trim();
            var badges = [];

            if (hasTitle && hasDescription) {
                badges.push('<span class="product-seo-badge product-seo-badge-ok">SEO完整</span>');
            } else {
                if (!hasTitle) badges.push('<span class="product-seo-badge product-seo-badge-warn">缺SEO标题</span>');
                if (!hasDescription) badges.push('<span class="product-seo-badge product-seo-badge-warn">缺SEO描述</span>');
            }
            if (productValueIsTrue(product.missing_arabic)) badges.push('<span class="product-seo-badge product-seo-badge-danger">缺阿语内容</span>');
            if (productValueIsTrue(product.missing_cover)) badges.push('<span class="product-seo-badge product-seo-badge-warn">缺封面图</span>');
            if (productValueIsTrue(product.missing_specs)) badges.push('<span class="product-seo-badge product-seo-badge-warn">缺产品参数</span>');
            if (productValueIsTrue(product.missing_public_url)) badges.push('<span class="product-seo-badge product-seo-badge-danger">未进Sitemap</span>');

            return '<div class="product-meta-badges">' + badges.join('') + '</div>';
        }

        function renderProductsTable() {
            var tbody = document.getElementById('products-tbody');
            if (!tbody) return;
            updateProductsResultCount(productMeta && productMeta.total != null ? productMeta.total : products.length);

            if (!products.length) {
                tbody.innerHTML = emptyRow(9, '暂无产品');
                updateProductBatchBar();
                return;
            }

            tbody.innerHTML = products.map(function (product) {
                var productId = product.id;
                var displayId = product.legacy_id || product.slug || product.id;
                var chineseName = product.name_cn || adminProductNameCn(product);
                var name = product.name_en || product.name || '';
                var model = product.model || product.legacy_id || product.slug || product.id || '—';
                var categoryName = product.category_name || product.category_name_en || product.category || '—';
                var status = product.status || 'draft';
                var statusClass = status === 'published' ? 'badge-green' : (status === 'deleted' ? 'badge-navy' : 'badge-gold');
                var statusLabel = status === 'published' ? '已发布' : (status === 'deleted' ? '已删除' : '草稿');
                var featured = productValueIsTrue(product.featured);
                var intro = compactText(product.short_desc_en || product.short_desc_ar || product.description_en || product.description_ar || '—', 72);
                var updatedAt = formatDate(product.updated_at);
                var cover = product.cover_image || product.image || '';
                var thumb = cover
                    ? '<img class="product-thumb" src="../' + escapeHtml(cover) + '" alt="">'
                    : '<div class="product-thumb" style="background:#eef1f5;border:1px solid #d8dee8;"></div>';
                return '<tr data-product-row="' + escapeHtml(productId) + '">' +
                    '<td><input type="checkbox" class="product-row-check" data-id="' + escapeHtml(productId) + '" data-version="' + escapeHtml(product.version) + '"></td>' +
                    '<td><div class="product-name-cell">' + thumb + '<div><div class="product-name-text">' + escapeHtml(chineseName || name || displayId) + '</div><div class="product-id-text">' + escapeHtml(name || displayId) + '</div>' + renderProductSeoBadges(product) + '</div></div></td>' +
                    '<td class="cell-muted product-model-cell">' + escapeHtml(model) + '</td>' +
                    '<td class="product-category-cell" title="' + escapeHtml(categoryName) + '"><span class="badge badge-blue product-category-badge">' + escapeHtml(categoryName) + '</span></td>' +
                    '<td class="product-status-cell"><span class="badge ' + statusClass + ' product-status-badge">' + statusLabel + '</span></td>' +
                    '<td><span class="table-switch ' + (featured ? 'is-on' : '') + '" aria-label="' + (featured ? '已推荐' : '未推荐') + '"></span></td>' +
                    '<td class="cell-muted product-intro-cell" title="' + escapeHtml(intro) + '">' + escapeHtml(intro) + '</td>' +
                    '<td class="cell-muted product-date-cell">' + escapeHtml(updatedAt) + '</td>' +
                    '<td><div class="actions-cell"><button class="btn btn-icon btn-icon-view" aria-label="预览产品" data-preview-product="' + escapeHtml(displayId) + '">' + ICON_VIEW + '</button><button class="btn btn-icon btn-icon-edit" aria-label="编辑产品" data-edit-product="' + escapeHtml(productId) + '">' + ICON_EDIT + '</button><button class="btn btn-icon btn-icon-delete" aria-label="删除产品" data-delete-product="' + escapeHtml(productId) + '">' + ICON_DELETE + '</button></div></td>' +
                    '</tr>';
            }).join('');

            tbody.querySelectorAll('[data-preview-product]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    window.open('../products/' + encodeURIComponent(btn.getAttribute('data-preview-product')), '_blank', 'noopener');
                });
            });
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

        function productValueIsTrue(value) {
            return value === true || value === 1 || value === '1' || value === 'true';
        }

        function compactText(value, maxLength) {
            var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
            if (!text) return '—';
            return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
        }

        function findProductById(productId) {
            for (var i = 0; i < products.length; i++) {
                if (String(products[i].id) === String(productId)) return products[i];
            }
            return null;
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
            all.forEach(function (checkbox) {
                var row = checkbox.closest ? checkbox.closest('tr') : null;
                if (row) row.classList.toggle('row-selected', checkbox.checked);
            });
            if (selectAll) {
                selectAll.checked = all.length > 0 && selected.length === all.length;
                selectAll.indeterminate = selected.length > 0 && selected.length < all.length;
            }
        }

        function clearProductSelection() {
            document.querySelectorAll('.product-row-check').forEach(function (checkbox) {
                checkbox.checked = false;
            });
            var selectAll = document.getElementById('product-select-all');
            if (selectAll) {
                selectAll.checked = false;
                selectAll.indeterminate = false;
            }
            updateProductBatchBar();
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


        function bindProductEvents() {
            var btnAddProduct = document.getElementById('btn-add-product');
            if (btnAddProduct) btnAddProduct.addEventListener('click', function () { openProductModal(null); });

            var btnRefreshProducts = document.getElementById('btn-refresh-products');
            if (btnRefreshProducts) {
                btnRefreshProducts.addEventListener('click', function () {
                    productPage = 1;
                    loadProductCategories();
                    loadProducts();
                });
            }

            var btnImportProducts = document.getElementById('btn-import-products');
            if (btnImportProducts) {
                btnImportProducts.addEventListener('click', function () {
                    showToast('批量导入入口已预留，当前后端未提供导入接口', 'error');
                });
            }

            document.querySelectorAll('[data-product-status]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var statusFilter = document.getElementById('product-status-filter');
                    if (statusFilter) statusFilter.value = btn.getAttribute('data-product-status') || '';
                    syncProductStatusTabs();
                    productPage = 1;
                    loadProducts();
                });
            });
            syncProductStatusTabs();

            var productSearch = document.getElementById('product-search');
            if (productSearch) productSearch.addEventListener('input', function () {
                clearTimeout(productSearchTimer);
                productSearchTimer = setTimeout(function () {
                    productPage = 1;
                    loadProducts();
                }, 250);
            });
            ['product-category-filter', 'product-status-filter', 'product-featured-filter', 'product-issue-filter'].forEach(function (id) {
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
                    ['product-search', 'product-category-filter', 'product-status-filter', 'product-featured-filter', 'product-issue-filter'].forEach(function (id) {
                        var field = document.getElementById(id);
                        if (field) field.value = '';
                    });
                    syncProductStatusTabs();
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
            var clearProductSelectionBtn = document.getElementById('btn-clear-product-selection');
            if (clearProductSelectionBtn) clearProductSelectionBtn.addEventListener('click', clearProductSelection);
            var closeProductBatchBtn = document.getElementById('btn-close-product-batch');
            if (closeProductBatchBtn) closeProductBatchBtn.addEventListener('click', clearProductSelection);

            bindModalClose('product-modal', ['modal-close', 'modal-cancel']);
            bindProductEditorNavigation();
            bindProductDescriptionTabs();

            var imageInput = document.getElementById('field-image');
            if (imageInput) imageInput.addEventListener('change', uploadProductImage);
            var selectProductAsset = document.getElementById('btn-product-select-asset');
            if (selectProductAsset) selectProductAsset.addEventListener('click', openProductAssetPicker);
            var clearProductImage = document.getElementById('btn-product-clear-image');
            if (clearProductImage) clearProductImage.addEventListener('click', clearProductCoverImage);
            var galleryUploadBtn = document.getElementById('btn-product-gallery-upload');
            var galleryUploadInput = document.getElementById('product-gallery-upload-input');
            if (galleryUploadBtn && galleryUploadInput) galleryUploadBtn.addEventListener('click', function () { galleryUploadInput.click(); });
            if (galleryUploadInput) galleryUploadInput.addEventListener('change', uploadProductGalleryFiles);
            var gallerySelectBtn = document.getElementById('btn-product-gallery-select');
            if (gallerySelectBtn) gallerySelectBtn.addEventListener('click', openProductGalleryAssetPicker);

            var btnAddSpec = document.getElementById('btn-add-spec');
            if (btnAddSpec) btnAddSpec.addEventListener('click', function () { addSpecRow({}); });

            document.querySelectorAll('[data-product-preview-locale]').forEach(function (button) {
                button.addEventListener('click', function () {
                    openProductPreview(button.getAttribute('data-product-preview-locale'));
                });
            });

            var featuredField = document.getElementById('field-featured');
            if (featuredField) featuredField.addEventListener('change', syncProductFeaturedSwitch);

            var form = document.getElementById('product-form');
            if (form) form.addEventListener('submit', saveProduct);
            bindSeoLengthHints();
            bindProductCompletenessSummary();

            [['field-name','input'],['field-category','change'],['field-status','change']].forEach(function (pair) {
                var el = document.getElementById(pair[0]);
                if (el) el.addEventListener(pair[1], function () { clearFieldError(pair[0]); });
            });

            document.querySelectorAll('[data-product-editor-shortcuts]').forEach(function (container) {
                container.addEventListener('click', function (event) {
                    var button = event.target && event.target.closest ? event.target.closest('[data-action]') : null;
                    if (!button) return;
                    var target = button.getAttribute('data-action') || '';
                    closeModal('product-modal', true);
                    if (target.indexOf('view-') === 0) switchView(target.slice(5));
                });
            });
        }

        function bindProductEditorNavigation() {
            document.querySelectorAll('[data-product-editor-scroll]').forEach(function (button) {
                button.addEventListener('click', function () {
                    var targetId = button.getAttribute('data-product-editor-scroll');
                    var target = targetId ? document.getElementById(targetId) : null;
                    if (!target) return;
                    document.querySelectorAll('[data-product-editor-scroll]').forEach(function (item) {
                        item.classList.toggle('active', item === button);
                    });
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            });
        }

        function bindProductDescriptionTabs() {
            document.querySelectorAll('[data-product-detail-tab]').forEach(function (button) {
                button.addEventListener('click', function () {
                    activateProductDetailTab(button.getAttribute('data-product-detail-tab'));
                });
            });
        }

        function activateProductDetailTab(locale) {
            locale = locale || 'en';
            document.querySelectorAll('[data-product-detail-tab]').forEach(function (button) {
                var active = button.getAttribute('data-product-detail-tab') === locale;
                button.classList.toggle('active', active);
                button.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            document.querySelectorAll('[data-product-detail-panel]').forEach(function (panel) {
                var active = panel.getAttribute('data-product-detail-panel') === locale;
                panel.classList.toggle('active', active);
                if (active) {
                    panel.removeAttribute('hidden');
                } else {
                    panel.setAttribute('hidden', 'hidden');
                }
            });
        }

        function openProductModal(productId) {
            setActiveModalTrigger(getActiveElement());
            resetFormDirty();
            editingProductId = productId;
            editingProductVersion = null;
            productPreviewIdentifier = '';
            productImageUploading = false;
            setProductSubmitDisabled(false);
            setProductCoverPath('');
            productGalleryPaths = [];
            var modal = document.getElementById('product-modal');
            var title = document.getElementById('modal-title');
            var form = document.getElementById('product-form');
            form.reset();
            document.getElementById('image-preview').style.display = 'none';
            document.getElementById('image-preview').innerHTML = '';
            document.getElementById('upload-area').style.display = '';
            setFieldValue('field-status', 'published');
            renderProductSpecs([]);
            renderProductGallery({});
            renderProductCertifications({});
            activateProductDetailTab('en');
            syncProductFeaturedSwitch();
            populateProductCategorySelects();
            updateProductPreviewState();
            updateSeoLengthHints();
            updateProductCompletenessSummary();

            if (productId) {
                title.textContent = '编辑产品';
                var listed = findProductById(productId);
                editingProductVersion = listed ? listed.version : null;
                apiRequest('/admin/products/' + encodeURIComponent(productId)).then(function (response) {
                    var product = unwrapDataResponse(response) || {};
                    if (editingProductVersion == null) editingProductVersion = product.version;
                    fillProductForm(product);
                    showDraftRecovery(document.querySelector('#product-modal .modal-body'), draftKey('product', productId), function (draft) {
                        restoreFormDraft('product-form', draft);
                    });
                }).catch(function (err) { showToast('加载产品失败：' + err.message, 'error'); });
            } else {
                title.textContent = '新增产品';
            }
            showModal('product-modal');
            if (!productId) {
                showDraftRecovery(document.querySelector('#product-modal .modal-body'), draftKey('product', 'new'), function (draft) {
                    restoreFormDraft('product-form', draft);
                });
            }
        }

        function fillProductForm(product) {
            var fields = {
                'field-model': product.model || '',
                'field-nameCn': product.name_cn || adminProductNameCn(product),
                'field-name': product.name_en || '',
                'field-nameAr': product.name_ar || '',
                'field-nameFr': product.name_fr || '',
                'field-nameRu': product.name_ru || '',
                'field-shortDesc': product.short_desc_en || '',
                'field-shortDescAr': product.short_desc_ar || '',
                'field-shortDescFr': product.short_desc_fr || '',
                'field-shortDescRu': product.short_desc_ru || '',
                'field-description': product.description_en || '',
                'field-descriptionAr': product.description_ar || '',
                'field-descriptionFr': product.description_fr || '',
                'field-descriptionRu': product.description_ru || '',
                'field-status': product.status || 'published',
                'field-seo-title': product.seo_title || '',
                'field-seo-description': product.seo_description || '',
                'field-seo-keywords': product.seo_keywords || '',
                'field-seo-title-fr': product.seo_title_fr || '',
                'field-seo-title-ru': product.seo_title_ru || '',
                'field-seo-description-fr': product.seo_description_fr || '',
                'field-seo-description-ru': product.seo_description_ru || '',
                'field-seo-keywords-fr': product.seo_keywords_fr || '',
                'field-seo-keywords-ru': product.seo_keywords_ru || ''
            };
            Object.keys(fields).forEach(function (id) {
                setFieldValue(id, fields[id]);
            });
            var categoryField = document.getElementById('field-category');
            if (categoryField) categoryField.value = product.category_id || '';
            document.getElementById('field-featured').checked = productValueIsTrue(product.featured);
            syncProductFeaturedSwitch();
            setProductCoverPath(product.cover_image || '');
            if (uploadedImagePath) showImagePreview('../' + uploadedImagePath);
            renderProductSpecs(product.specs || []);
            renderProductGallery(product);
            renderProductCertifications(product);
            productPreviewIdentifier = product.slug || product.legacy_id || product.id || '';
            updateProductPreviewState();
            updateSeoLengthHints();
            updateProductCompletenessSummary();
        }

        function setFieldValue(id, value) {
            var field = document.getElementById(id);
            if (field) field.value = value == null ? '' : value;
        }

        function getFieldValue(id) {
            var field = document.getElementById(id);
            return field ? field.value.trim() : '';
        }

        function syncProductFeaturedSwitch() {
            var field = document.getElementById('field-featured');
            if (!field || !field.closest) return;
            var label = field.closest('.switch-field');
            if (label) label.classList.toggle('is-on', field.checked);
        }

        function renderProductSpecs(specs) {
            var list = document.getElementById('specs-list');
            if (!list) return;
            list.innerHTML = '';
            if (!specs || !specs.length) {
                list.innerHTML = '<div class="form-empty-note">暂无参数</div>';
                updateProductCompletenessSummary();
                return;
            }
            specs.forEach(function (spec) {
                addSpecRow(spec);
            });
        }

        function renderProductGallery(product) {
            var container = document.getElementById('product-gallery-preview');
            if (!container) return;
            if (product && Array.isArray(product.media)) {
                productGalleryPaths = product.media
                    .filter(function (item) { return item && !productValueIsTrue(item.is_cover) && (item.path || item.url); })
                    .map(function (item) { return String(item.path || item.url || '').trim(); })
                    .filter(Boolean);
            }
            if (!productGalleryPaths.length) {
                container.innerHTML = '<div class="gallery-empty">暂无图库图片</div>';
                return;
            }
            container.innerHTML = productGalleryPaths.map(function (path, index) {
                return '<div class="gallery-item">' +
                    '<img src="' + escapeHtml(assetPreviewSrc(path)) + '" alt="">' +
                    '<button class="gallery-remove-btn" type="button" data-remove-gallery-image="' + index + '" aria-label="移除图库图片">×</button>' +
                    '</div>';
            }).join('') || '<div class="gallery-empty">暂无图库图片</div>';
            container.querySelectorAll('[data-remove-gallery-image]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var index = parseInt(btn.getAttribute('data-remove-gallery-image'), 10);
                    if (!isNaN(index)) {
                        productGalleryPaths.splice(index, 1);
                        renderProductGallery();
                        markFormDirty();
                    }
                });
            });
        }

        function addProductGalleryPath(path) {
            path = String(path || '').trim();
            if (!path) return;
            if (productGalleryPaths.indexOf(path) === -1) productGalleryPaths.push(path);
            renderProductGallery();
            markFormDirty();
        }

        function uploadProductGalleryFiles() {
            var input = document.getElementById('product-gallery-upload-input');
            var files = Array.prototype.slice.call((input && input.files) || []);
            if (input) input.value = '';
            var images = files.filter(function (file) { return /^image\/(jpeg|png|webp|gif)$/.test(file.type || ''); });
            if (!images.length) {
                showToast('请选择 JPG、PNG、WebP 或 GIF 图片。', 'error');
                return;
            }
            productImageUploading = true;
            setProductSubmitDisabled(true);
            Promise.all(images.map(function (file) {
                return uploadAdminAssetFile(file, {
                    module: 'products',
                    entity_type: 'product',
                    entity_id: editingProductId || ''
                });
            })).then(function (responses) {
                responses.forEach(function (response) {
                    addProductGalleryPath(getProductUploadPath(response));
                });
                showToast('图库图片已上传');
            }).catch(function (err) {
                showToast('图库上传失败：' + err.message, 'error');
            }).finally(function () {
                productImageUploading = false;
                setProductSubmitDisabled(false);
            });
        }

        function openProductGalleryAssetPicker() {
            openAssetPicker({
                title: '添加产品图库图片',
                subtitle: '选择资源库中的图片加入当前产品图库。',
                module: 'products',
                entityType: 'product',
                entityId: editingProductId || '',
                onSelect: function (asset) {
                    addProductGalleryPath(asset && asset.path ? asset.path : '');
                    showToast('已添加到产品图库');
                }
            });
        }

        function renderProductCertifications(product) {
            var container = document.getElementById('product-cert-selector');
            if (!container) return;
            var items = product && (product.certifications || product.related_certifications || product.certification_ids);
            var chips = Array.isArray(items) ? items : [];
            var chipsHtml = chips.length
                ? chips.map(function (item) {
                    var label = item.name || item.title || item.id || item;
                    return '<span class="relation-chip">' + escapeHtml(label) + '</span>';
                }).join('')
                : '<span>暂未关联证书</span>';
            container.innerHTML = '<div class="relation-chip-row">' + chipsHtml + '</div><button class="btn btn-secondary btn-sm" type="button" data-action="view-cert-qualifications">打开证书库</button>';
        }

        function uploadProductImage() {
            var file = this.files[0];
            if (!file) return;
            showImagePreview(URL.createObjectURL(file));
            productImageUploading = true;
            setProductSubmitDisabled(true);

            uploadAdminAssetFile(file, {
                module: 'products',
                entity_type: 'product',
                entity_id: editingProductId || ''
            })
                .then(function (data) {
                    if (data.error) throw new Error(data.error);
                    setProductCoverPath(getProductUploadPath(data));
                    if (!uploadedImagePath) throw new Error('上传接口未返回图片路径');
                    markFormDirty();
                    showToast('图片上传成功');
                })
                .catch(function (err) { showToast('图片上传失败：' + err.message, 'error'); })
                .finally(function () {
                    productImageUploading = false;
                    setProductSubmitDisabled(false);
                });
        }

        function openProductAssetPicker() {
            openAssetPicker({
                title: '选择产品封面',
                subtitle: '从资源库复用已有图片，或上传新图片作为当前产品封面。',
                module: 'products',
                entityType: 'product',
                entityId: editingProductId || '',
                onSelect: function (asset) {
                    var path = asset && asset.path ? asset.path : '';
                    if (!path) return;
                    setProductCoverPath(path);
                    showImagePreview(assetPreviewSrc(path));
                    markFormDirty();
                    showToast('已选择产品封面');
                }
            });
        }

        function clearProductCoverImage() {
            setProductCoverPath('');
            var preview = document.getElementById('image-preview');
            var uploadArea = document.getElementById('upload-area');
            if (preview) {
                preview.style.display = 'none';
                preview.innerHTML = '';
            }
            if (uploadArea) uploadArea.style.display = '';
            markFormDirty();
        }

        function showImagePreview(src) {
            var preview = document.getElementById('image-preview');
            var uploadArea = document.getElementById('upload-area');
            uploadArea.style.display = 'none';
            preview.style.display = '';
            preview.innerHTML = '<img src="' + src + '" alt="Preview"><span class="remove-image" id="remove-image">&times;</span>';
            document.getElementById('remove-image').addEventListener('click', function () {
                setProductCoverPath('');
                preview.innerHTML = '';
                preview.style.display = 'none';
                uploadArea.style.display = '';
                document.getElementById('field-image').value = '';
                markFormDirty();
            });
        }

        function addSpecRow(spec, legacyValue) {
            if (arguments.length > 1) {
                spec = {
                    spec_key: spec,
                    spec_value: legacyValue
                };
            }
            spec = spec || {};
            var key = spec.spec_key || spec.key || spec.name || spec.label || '';
            var value = spec.spec_value || spec.value || spec.text || '';
            var list = document.getElementById('specs-list');
            if (!list) return;
            var empty = list.querySelector('.form-empty-note');
            if (empty) empty.remove();
            var row = document.createElement('div');
            row.className = 'spec-row';
            row.innerHTML = '<input type="text" class="spec-key bidi-field" dir="auto" placeholder="参数名" value="' + escapeHtml(key) + '">' +
                '<input type="text" class="spec-value bidi-field" dir="auto" placeholder="参数值" value="' + escapeHtml(value) + '">' +
                '<button type="button" class="btn-remove-spec">×</button>';
            row.querySelectorAll('input').forEach(function (field) {
                field.addEventListener('input', updateProductCompletenessSummary);
                field.addEventListener('change', updateProductCompletenessSummary);
            });
            row.querySelector('.btn-remove-spec').addEventListener('click', function () {
                row.remove();
                updateProductCompletenessSummary();
            });
            list.appendChild(row);
            updateProductCompletenessSummary();
        }

        function getSpecsFromForm() {
            var specs = [];
            document.querySelectorAll('#specs-list .spec-row').forEach(function (row) {
                var key = row.querySelector('.spec-key').value.trim();
                var value = row.querySelector('.spec-value').value.trim();
                if (key || value) {
                    specs.push({
                        spec_key: key,
                        spec_value: value
                    });
                }
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
            if (productImageUploading) {
                showToast('图片仍在上传，请上传完成后再保存。', 'error');
                return;
            }
            var name = getFieldValue('field-name');
            var nameAr = getFieldValue('field-nameAr');
            var category = getFieldValue('field-category');
            var status = getFieldValue('field-status') || 'published';

            ['field-name', 'field-category', 'field-status'].forEach(clearFieldError);
            var valid = true;
            if (!name && !nameAr) { showFieldError('field-name', '请填写产品名称'); valid = false; }
            if (!category) { showFieldError('field-category', '请选择分类'); valid = false; }
            if (!valid) return;

            var payload = {
                model: getFieldValue('field-model'),
                name_cn: getFieldValue('field-nameCn'),
                name_en: name || nameAr,
                name_ar: nameAr,
                name_fr: getFieldValue('field-nameFr'),
                name_ru: getFieldValue('field-nameRu'),
                category_id: parseInt(category, 10),
                status: status,
                short_desc_en: getFieldValue('field-shortDesc'),
                short_desc_ar: getFieldValue('field-shortDescAr'),
                short_desc_fr: getFieldValue('field-shortDescFr'),
                short_desc_ru: getFieldValue('field-shortDescRu'),
                description_en: getFieldValue('field-description'),
                description_ar: getFieldValue('field-descriptionAr'),
                description_fr: getFieldValue('field-descriptionFr'),
                description_ru: getFieldValue('field-descriptionRu'),
                featured: document.getElementById('field-featured').checked,
                cover_image: getFieldValue('field-cover-image') || uploadedImagePath,
                seo_title: getFieldValue('field-seo-title'),
                seo_description: getFieldValue('field-seo-description'),
                seo_keywords: getFieldValue('field-seo-keywords'),
                seo_title_fr: getFieldValue('field-seo-title-fr'),
                seo_title_ru: getFieldValue('field-seo-title-ru'),
                seo_description_fr: getFieldValue('field-seo-description-fr'),
                seo_description_ru: getFieldValue('field-seo-description-ru'),
                seo_keywords_fr: getFieldValue('field-seo-keywords-fr'),
                seo_keywords_ru: getFieldValue('field-seo-keywords-ru'),
                specs: getSpecsFromForm(),
                gallery: productGalleryPaths.slice(0)
            };
            if (editingProductId) payload.version = editingProductVersion;
            var submittedCoverImage = payload.cover_image || '';

            var wasEditing = !!editingProductId;
            var request = editingProductId
                ? apiRequest('/admin/products/' + encodeURIComponent(editingProductId), { method: 'PUT', body: payload })
                : apiRequest('/admin/products', { method: 'POST', body: payload });

            request.then(function (response) {
                var saved = unwrapDataResponse(response) || {};
                if (Object.prototype.hasOwnProperty.call(saved, 'cover_image')) {
                    var savedCoverImage = saved.cover_image == null ? '' : String(saved.cover_image).trim();
                    if (savedCoverImage !== submittedCoverImage) {
                        showToast('产品图片保存校验失败：后端返回路径与提交路径不一致，请刷新后重试。', 'error');
                        return;
                    }
                }
                if (!editingProductId && saved.id) editingProductId = saved.id;
                productPreviewIdentifier = saved.slug || saved.legacy_id || productPreviewIdentifier;
                updateProductPreviewState();
                safeSessionRemove(draftKey('product', editingProductId || 'new'));
                if (!wasEditing) safeSessionRemove(draftKey('product', 'new'));
                showToast(wasEditing ? '产品已更新' : '产品已新增');
                resetFormDirty();
                closeModal('product-modal', true);
                loadProducts();
            }).catch(function (err) {
                if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
                    safeSessionSet(draftKey('product', editingProductId || 'new'), collectFormDraft('product-form'));
                    showConflictNotice('内容已被他人修改，请重新加载后再编辑', loadProducts);
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


        function getUploadedImagePath() {
            return uploadedImagePath;
        }

        function resetModalState() {
            editingProductId = null;
            editingProductVersion = null;
            productImageUploading = false;
        }

        return {
            loadProducts: loadProducts,
            renderProductsPagination: renderProductsPagination,
            updateProductClearFilters: updateProductClearFilters,
            updateProductsResultCount: updateProductsResultCount,
            syncProductStatusTabs: syncProductStatusTabs,
            setProductStatusFilter: setProductStatusFilter,
            renderProductSeoBadges: renderProductSeoBadges,
            renderProductsTable: renderProductsTable,
            productValueIsTrue: productValueIsTrue,
            compactText: compactText,
            findProductById: findProductById,
            bindProductBatchButton: bindProductBatchButton,
            getSelectedProductIds: getSelectedProductIds,
            updateProductBatchBar: updateProductBatchBar,
            clearProductSelection: clearProductSelection,
            batchProductAction: batchProductAction,
            bindProductEvents: bindProductEvents,
            openProductModal: openProductModal,
            fillProductForm: fillProductForm,
            setFieldValue: setFieldValue,
            getFieldValue: getFieldValue,
            syncProductFeaturedSwitch: syncProductFeaturedSwitch,
            renderProductSpecs: renderProductSpecs,
            renderProductGallery: renderProductGallery,
            addProductGalleryPath: addProductGalleryPath,
            uploadProductGalleryFiles: uploadProductGalleryFiles,
            openProductGalleryAssetPicker: openProductGalleryAssetPicker,
            renderProductCertifications: renderProductCertifications,
            uploadProductImage: uploadProductImage,
            openProductAssetPicker: openProductAssetPicker,
            clearProductCoverImage: clearProductCoverImage,
            showImagePreview: showImagePreview,
            addSpecRow: addSpecRow,
            getSpecsFromForm: getSpecsFromForm,
            showFieldError: showFieldError,
            clearFieldError: clearFieldError,
            saveProduct: saveProduct,
            deleteProduct: deleteProduct,
            setProductCoverPath: setProductCoverPath,
            getProductUploadPath: getProductUploadPath,
            setProductSubmitDisabled: setProductSubmitDisabled,
            getUploadedImagePath: getUploadedImagePath,
            resetModalState: resetModalState
        };
    };
})();
