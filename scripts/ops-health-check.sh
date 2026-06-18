#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${LONGXIANG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SITE_URL="${SITE_URL:-https://www.lxenelectric.com/}"
LOCAL_HEALTH_URL="${LOCAL_HEALTH_URL:-http://127.0.0.1:3000/api/health}"
SSL_HOST="${SSL_HOST:-www.lxenelectric.com}"
SSL_PORT="${SSL_PORT:-443}"
PM2_NAME="${PM2_NAME:-longxiang-website}"
DISK_PATH="${DISK_PATH:-${ROOT_DIR}}"
DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-85}"
CERT_WARN_DAYS="${CERT_WARN_DAYS:-21}"

status=0

log() {
    printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

fail() {
    status=1
    log "FAIL: $*"
}

pass() {
    log "OK: $*"
}

if curl -fsS --max-time 15 "${SITE_URL}" >/dev/null; then
    pass "website reachable: ${SITE_URL}"
else
    fail "website unreachable: ${SITE_URL}"
fi

if curl -fsS --max-time 10 "${LOCAL_HEALTH_URL}" >/dev/null; then
    pass "local node health endpoint reachable"
else
    fail "local node health endpoint unreachable: ${LOCAL_HEALTH_URL}"
fi

cert_tmp="$(mktemp)"
if timeout 15 sh -c "printf '' | openssl s_client -servername '${SSL_HOST}' -connect '${SSL_HOST}:${SSL_PORT}' 2>/dev/null | openssl x509 -out '${cert_tmp}'" && [ -s "${cert_tmp}" ]; then
    if openssl x509 -checkend "$((CERT_WARN_DAYS * 86400))" -noout -in "${cert_tmp}" >/dev/null; then
        pass "public TLS certificate valid for more than ${CERT_WARN_DAYS} days: ${SSL_HOST}"
    else
        fail "public TLS certificate expires within ${CERT_WARN_DAYS} days: ${SSL_HOST}"
    fi
else
    fail "unable to read public TLS certificate: ${SSL_HOST}:${SSL_PORT}"
fi
rm -f "${cert_tmp}"

disk_used="$(df -P "${DISK_PATH}" | awk 'NR==2 { gsub("%", "", $5); print $5 }')"
if [ -n "${disk_used}" ] && [ "${disk_used}" -lt "${DISK_WARN_PERCENT}" ]; then
    pass "disk usage ${disk_used}% below ${DISK_WARN_PERCENT}%"
else
    fail "disk usage ${disk_used:-unknown}% at or above ${DISK_WARN_PERCENT}%"
fi

if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe "${PM2_NAME}" 2>/dev/null | grep -q 'status.*online'; then
        pass "PM2 process online: ${PM2_NAME}"
    else
        fail "PM2 process not online: ${PM2_NAME}"
    fi
else
    fail "pm2 command not found"
fi

exit "${status}"
