(function () {
    'use strict';

    var root = window.LongxiangAdmin = window.LongxiangAdmin || {};

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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

    root.core = {
        escapeHtml: escapeHtml,
        getToken: getToken,
        setToken: setToken,
        removeToken: removeToken,
        getUsername: getUsername,
        setUsername: setUsername
    };
})();
