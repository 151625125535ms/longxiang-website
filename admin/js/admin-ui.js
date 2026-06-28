(function () {
    'use strict';

    var root = window.LongxiangAdmin = window.LongxiangAdmin || {};

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

    function trapFocus(modalEl, onEscape) {
        if (!modalEl) return;
        releaseFocusTrap(modalEl);
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
    }

    function releaseFocusTrap(modalEl) {
        if (modalEl && modalEl.__focusTrapHandler) {
            modalEl.removeEventListener('keydown', modalEl.__focusTrapHandler);
            modalEl.__focusTrapHandler = null;
        }
    }

    root.ui = {
        showToast: showToast,
        trapFocus: trapFocus,
        releaseFocusTrap: releaseFocusTrap
    };
})();
