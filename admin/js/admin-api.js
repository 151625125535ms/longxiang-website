(function () {
    'use strict';

    var root = window.LongxiangAdmin = window.LongxiangAdmin || {};
    var core = root.core;
    var API_BASE = '/api';

    function apiRequest(url, options) {
        options = options || {};
        var headers = options.headers || {};
        var token = core.getToken();
        if (token) headers.Authorization = 'Bearer ' + token;

        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        options.headers = headers;

        return fetch(API_BASE + url, options).then(function (res) {
            if (res.status === 401 || res.status === 403) {
                core.removeToken();
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

    root.api = {
        API_BASE: API_BASE,
        apiRequest: apiRequest,
        unwrapDataResponse: unwrapDataResponse,
        unwrapListResponse: unwrapListResponse
    };
})();
