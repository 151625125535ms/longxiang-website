(function () {
    'use strict';

    var modules = window.LongxiangAdminModules = window.LongxiangAdminModules || {};

    modules.inquiries = function createInquiriesModule(context) {
        context = context || {};

        function requireDependency(name) {
            if (!context[name]) throw new Error('询盘模块缺少依赖：' + name);
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
        var bindRangeCheckboxes = requireDependency('bindRangeCheckboxes');
        var syncBatchBarFocus = requireDependency('syncBatchBarFocus');
        var bindModalClose = requireDependency('bindModalClose');
        var showModal = requireDependency('showModal');
        var closeModal = requireDependency('closeModal');
        var formatDate = requireDependency('formatDate');
        var resetFormDirty = requireDependency('resetFormDirty');
        var confirmDiscardChanges = requireDependency('confirmDiscardChanges');
        var getCurrentView = requireDependency('getCurrentView');
        var setActiveModalTrigger = requireDependency('setActiveModalTrigger');
        var getActiveElement = requireDependency('getActiveElement');
        var getInquiries = requireDependency('getInquiries');
        var setInquiries = requireDependency('setInquiries');
        var getInquiryPage = requireDependency('getInquiryPage');
        var setInquiryPage = requireDependency('setInquiryPage');
        var getInquiryMeta = requireDependency('getInquiryMeta');
        var setInquiryMeta = requireDependency('setInquiryMeta');
        var getInquirySearchTimer = requireDependency('getInquirySearchTimer');
        var setInquirySearchTimer = requireDependency('setInquirySearchTimer');
        var getInquiryUnreadOnly = requireDependency('getInquiryUnreadOnly');
        var setInquiryUnreadOnly = requireDependency('setInquiryUnreadOnly');
        var getEditingInquiryId = requireDependency('getEditingInquiryId');
        var setEditingInquiryId = requireDependency('setEditingInquiryId');
        var getOpenedInquiry = requireDependency('getOpenedInquiry');
        var setOpenedInquiry = requireDependency('setOpenedInquiry');
        var getActiveInquiryId = requireDependency('getActiveInquiryId');
        var setActiveInquiryId = requireDependency('setActiveInquiryId');
        var renderPagination = context.renderPagination || window.renderPagination;
        var STATUS_LABELS = context.STATUS_LABELS || {};
        var STATUS_BADGES = context.STATUS_BADGES || {};
        var ICON_VIEW = context.ICON_VIEW || '';
        var ICON_DELETE = context.ICON_DELETE || '';

        function currentMeta() {
            return getInquiryMeta() || { page: 1, pageSize: 20, total: 0 };
        }

        function currentInquiries() {
            return getInquiries() || [];
        }

        function loadInquiries() {
            var tbody = document.getElementById('inquiries-tbody');
            var meta = currentMeta();
            if (tbody) tbody.innerHTML = skeletonRows(7, 5);
            clearErrorBanner('view-inquiries');
            updateInquiryBatchBar();

            var statusEl = document.getElementById('inquiry-status-filter');
            var searchEl = document.getElementById('inquiry-search');
            var status = statusEl ? statusEl.value : '';
            var searchVal = ((searchEl || {}).value || '').trim();
            var url = '/admin/inquiries?page=' + encodeURIComponent(getInquiryPage()) + '&pageSize=' + encodeURIComponent(meta.pageSize || 20);

            if (status) url += '&status=' + encodeURIComponent(status);
            if (searchVal) url += '&q=' + encodeURIComponent(searchVal);
            if (getInquiryUnreadOnly()) url += '&unread=true';

            apiRequest(url).then(function (response) {
                var rows = unwrapListResponse(response);
                setInquiries(rows);
                setInquiryMeta(response && response.meta ? response.meta : { page: getInquiryPage(), pageSize: meta.pageSize || 20, total: rows.length });
                renderInquiriesTable();
                renderInquiriesPagination();
            }).catch(function (err) {
                if (tbody) tbody.innerHTML = emptyRow(7, '加载失败，请刷新重试');
                showErrorBanner('view-inquiries', '询盘数据加载失败，请稍后重试', loadInquiries);
                renderInquiriesPagination({ page: 1, pageSize: meta.pageSize || 20, total: 0 });
                showToast('加载询盘失败：' + err.message, 'error');
            });
        }

        function renderInquiriesPagination(metaOverride) {
            var pagination = document.getElementById('inquiries-pagination');
            if (!renderPagination || !pagination) return;
            renderPagination(pagination, metaOverride || currentMeta(), function (nextPage) {
                setInquiryPage(nextPage);
                loadInquiries();
            });
        }

        function renderInquiriesTable() {
            var tbody = document.getElementById('inquiries-tbody');
            var rows = currentInquiries();
            var activeId = getActiveInquiryId();

            if (!tbody) return;
            if (!rows.length) {
                tbody.innerHTML = emptyRow(7, '暂无询盘');
                setActiveInquiryId(null);
                updateInquiryBatchBar();
                return;
            }

            if (activeId && !findInquiryInList(activeId)) setActiveInquiryId(null);
            activeId = getActiveInquiryId();

            tbody.innerHTML = rows.map(function (item) {
                var rowClasses = [];
                if (item.is_read === 0) rowClasses.push('row-unread');
                if (String(item.id) === String(activeId)) rowClasses.push('row-active');
                return '<tr class="' + rowClasses.join(' ') + '" data-inquiry-row="' + escapeHtml(item.id) + '">' +
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
            bindRangeCheckboxes('.inquiry-select', updateInquiryBatchBar);
            updateInquiryBatchBar();
        }

        function findInquiryInList(id) {
            var rows = currentInquiries();
            for (var i = 0; i < rows.length; i++) {
                if (String(rows[i].id) === String(id)) return rows[i];
            }
            return null;
        }

        function bindInquiryEvents() {
            var filter = document.getElementById('inquiry-status-filter');
            if (filter) filter.addEventListener('change', function () {
                setInquiryPage(1);
                loadInquiries();
            });

            var search = document.getElementById('inquiry-search');
            if (search) search.addEventListener('input', function () {
                clearTimeout(getInquirySearchTimer());
                setInquirySearchTimer(setTimeout(function () {
                    setInquiryPage(1);
                    loadInquiries();
                }, 250));
            });

            var unreadFilter = document.getElementById('inquiry-unread-filter');
            if (unreadFilter) {
                unreadFilter.querySelectorAll('[data-unread]').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        unreadFilter.querySelectorAll('[data-unread]').forEach(function (item) { item.classList.remove('active'); });
                        btn.classList.add('active');
                        setInquiryUnreadOnly(btn.getAttribute('data-unread') === 'true');
                        setInquiryPage(1);
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

            var prev = document.getElementById('inquiry-prev');
            if (prev) prev.addEventListener('click', function () { openAdjacentInquiry(-1); });

            var next = document.getElementById('inquiry-next');
            if (next) next.addEventListener('click', function () { openAdjacentInquiry(1); });
        }

        function setInquiryUnreadFilter(unreadOnly) {
            var unreadFilter = document.getElementById('inquiry-unread-filter');
            setInquiryUnreadOnly(!!unreadOnly);
            setInquiryPage(1);

            if (unreadFilter) {
                unreadFilter.querySelectorAll('[data-unread]').forEach(function (btn) {
                    var targetValue = getInquiryUnreadOnly() ? 'true' : '';
                    btn.classList.toggle('active', btn.getAttribute('data-unread') === targetValue);
                });
            }

            loadInquiries();
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
            syncBatchBarFocus(bar, selected.length, '.inquiry-select');
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
            var openedInquiry = getOpenedInquiry();
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
                var modalNotes = document.getElementById('inquiry-notes');
                var currentNotes = modalNotes ? modalNotes.value : '';
                apiRequest('/admin/inquiries/' + encodeURIComponent(openedInquiry.id), {
                    method: 'PUT',
                    body: { status: 'replied', is_read: 1, notes: currentNotes }
                }).then(function () {
                    openedInquiry.status = 'replied';
                    setOpenedInquiry(openedInquiry);
                    var modalStatus = document.getElementById('inquiry-status');
                    if (modalStatus) modalStatus.value = 'replied';
                    showToast('状态已更新为已回复');
                    loadInquiries();
                }).catch(function (err) { showToast('状态更新失败：' + err.message, 'error'); });
            }
        }

        function openInquiryModal(id) {
            var modal = document.getElementById('inquiry-modal');
            var modalIsOpen = modal && modal.classList.contains('show');
            if (!modalIsOpen) setActiveModalTrigger(getActiveElement());

            resetFormDirty();
            setEditingInquiryId(id);
            setOpenedInquiry(null);

            apiRequest('/admin/inquiries/' + encodeURIComponent(id)).then(function (response) {
                var item = unwrapDataResponse(response) || {};
                setOpenedInquiry(item);
                renderInquiryModalDetail(item);

                var status = document.getElementById('inquiry-status');
                var notes = document.getElementById('inquiry-notes');
                if (status) status.value = item.status || 'new';
                if (notes) notes.value = item.notes || '';

                setActiveInquiryId(item.id);
                if (getCurrentView() === 'inquiries') {
                    document.querySelectorAll('[data-inquiry-row]').forEach(function (row) {
                        row.classList.toggle('row-active', String(row.getAttribute('data-inquiry-row')) === String(item.id));
                    });
                }

                updateInquiryModalNav();
                showModal('inquiry-modal');
            }).catch(function (err) {
                showToast('加载询盘详情失败：' + err.message, 'error');
            });
        }

        function renderInquiryModalDetail(item) {
            var detail = document.getElementById('inquiry-detail');
            var status = item.status || 'new';
            if (!detail) return;

            detail.innerHTML =
                detailItem('客户姓名', item.name || '-') +
                detailItem('联系方式', item.phone || '-') +
                detailItem('邮箱', item.email || '-') +
                detailItem('公司', item.company || '-') +
                detailItem('国家', item.country || '-') +
                detailItem('产品', item.product_context || '-') +
                detailItem('主题', item.subject || '-') +
                detailItem('状态', STATUS_LABELS[status] || status || '-') +
                detailItem('提交时间', formatDate(item.created_at)) +
                detailItem('IP 地址', item.ip || '-') +
                '<div class="detail-item detail-full"><strong>消息内容</strong><p>' + escapeHtml(item.message || '') + '</p></div>';
        }

        function getInquiryListIndex(id) {
            var rows = currentInquiries();
            for (var i = 0; i < rows.length; i += 1) {
                if (String(rows[i].id) === String(id)) return i;
            }
            return -1;
        }

        function updateInquiryModalNav() {
            var rows = currentInquiries();
            var index = getInquiryListIndex(getEditingInquiryId());
            var prev = document.getElementById('inquiry-prev');
            var next = document.getElementById('inquiry-next');
            var position = document.getElementById('inquiry-modal-position');
            var hasListContext = index !== -1 && rows.length > 0;

            if (prev) prev.disabled = !hasListContext || index <= 0;
            if (next) next.disabled = !hasListContext || index >= rows.length - 1;
            if (position) {
                position.textContent = hasListContext
                    ? '当前结果第 ' + (index + 1) + ' / ' + rows.length + ' 条'
                    : '当前询盘';
            }
        }

        function openAdjacentInquiry(direction) {
            if (!confirmDiscardChanges()) return;

            var rows = currentInquiries();
            var index = getInquiryListIndex(getEditingInquiryId());
            if (index === -1) return;

            var nextItem = rows[index + direction];
            if (!nextItem) return;
            openInquiryModal(nextItem.id);
        }

        function detailItem(label, value) {
            return '<div class="detail-item"><strong>' + label + '</strong><span>' + escapeHtml(value) + '</span></div>';
        }

        function saveInquiryStatus() {
            var editingInquiryId = getEditingInquiryId();
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
                resetFormDirty();
                closeModal('inquiry-modal', true);
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

        function resetModalState() {
            setEditingInquiryId(null);
            setOpenedInquiry(null);
        }

        return {
            loadInquiries: loadInquiries,
            renderInquiriesPagination: renderInquiriesPagination,
            renderInquiriesTable: renderInquiriesTable,
            findInquiryInList: findInquiryInList,
            bindInquiryEvents: bindInquiryEvents,
            setInquiryUnreadFilter: setInquiryUnreadFilter,
            bindInquiryBatchButton: bindInquiryBatchButton,
            getSelectedInquiryIds: getSelectedInquiryIds,
            updateInquiryBatchBar: updateInquiryBatchBar,
            clearInquirySelection: clearInquirySelection,
            inquiryBatchLabel: inquiryBatchLabel,
            batchInquiryAction: batchInquiryAction,
            replyByEmail: replyByEmail,
            openInquiryModal: openInquiryModal,
            renderInquiryModalDetail: renderInquiryModalDetail,
            getInquiryListIndex: getInquiryListIndex,
            updateInquiryModalNav: updateInquiryModalNav,
            openAdjacentInquiry: openAdjacentInquiry,
            detailItem: detailItem,
            saveInquiryStatus: saveInquiryStatus,
            deleteInquiry: deleteInquiry,
            resetModalState: resetModalState
        };
    };
})();
