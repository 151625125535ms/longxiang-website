(function () {
    'use strict';

    function normalizeMeta(meta) {
        var page = parseInt(meta && meta.page, 10);
        var pageSize = parseInt(meta && meta.pageSize, 10);
        var total = parseInt(meta && meta.total, 10);

        if (!Number.isFinite(page) || page < 1) page = 1;
        if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 20;
        if (!Number.isFinite(total) || total < 0) total = 0;

        return {
            page: page,
            pageSize: pageSize,
            total: total,
            totalPages: Math.max(1, Math.ceil(total / pageSize))
        };
    }

    function button(label, page, disabled, extraClass) {
        return '<button type="button" class="pagination-btn ' + (extraClass || '') + '" data-page="' + page + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>';
    }

    function pageButtons(meta) {
        var pages = [];
        var start = Math.max(1, meta.page - 2);
        var end = Math.min(meta.totalPages, meta.page + 2);

        if (start > 1) {
            pages.push(button('1', 1, false, meta.page === 1 ? 'active' : ''));
            if (start > 2) pages.push('<span class="pagination-ellipsis">...</span>');
        }

        for (var page = start; page <= end; page += 1) {
            pages.push(button(String(page), page, false, page === meta.page ? 'active' : ''));
        }

        if (end < meta.totalPages) {
            if (end < meta.totalPages - 1) pages.push('<span class="pagination-ellipsis">...</span>');
            pages.push(button(String(meta.totalPages), meta.totalPages, false, meta.page === meta.totalPages ? 'active' : ''));
        }

        return pages.join('');
    }

    window.renderPagination = function renderPagination(container, meta, onPageChange) {
        if (!container) return;

        var normalized = normalizeMeta(meta);
        if (!normalized.total || normalized.total <= normalized.pageSize) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = '';
        container.innerHTML =
            '<div class="pagination-summary">第 ' + normalized.page + ' 页，共 ' + normalized.total + ' 条</div>' +
            '<div class="pagination-controls">' +
                button('上一页', Math.max(1, normalized.page - 1), normalized.page <= 1, 'pagination-prev') +
                pageButtons(normalized) +
                button('下一页', Math.min(normalized.totalPages, normalized.page + 1), normalized.page >= normalized.totalPages, 'pagination-next') +
            '</div>';

        container.querySelectorAll('[data-page]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.disabled) return;
                var nextPage = parseInt(btn.getAttribute('data-page'), 10);
                if (!Number.isFinite(nextPage) || nextPage === normalized.page) return;
                if (typeof onPageChange === 'function') onPageChange(nextPage);
            });
        });
    };
})();
