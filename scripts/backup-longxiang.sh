#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${LONGXIANG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${LONGXIANG_ENV_FILE:-${ROOT_DIR}/.env}"

env_value() {
    local key="$1"
    if [ -f "${ENV_FILE}" ]; then
        grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
    fi
}

resolve_path() {
    local value="$1"
    if [[ "${value}" = /* ]]; then
        printf '%s\n' "${value}"
    else
        printf '%s/%s\n' "${ROOT_DIR}" "${value}"
    fi
}

DB_PATH="${DB_PATH:-$(env_value DB_PATH)}"
UPLOAD_DIR="${UPLOAD_DIR:-$(env_value UPLOAD_DIR)}"
BACKUP_DIR="${BACKUP_DIR:-$(env_value BACKUP_DIR)}"

DB_PATH="$(resolve_path "${DB_PATH:-data/longxiang.db}")"
UPLOAD_DIR="$(resolve_path "${UPLOAD_DIR:-uploads}")"
BACKUP_DIR="$(resolve_path "${BACKUP_DIR:-backups/server}")"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK_DIR="${BACKUP_DIR}/daily-${STAMP}"
ARCHIVE="${WORK_DIR}.tar.gz"

mkdir -p "${WORK_DIR}"

if [ -f "${DB_PATH}" ]; then
    mkdir -p "${WORK_DIR}/data"
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "${DB_PATH}" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
        sqlite3 "${DB_PATH}" ".backup '${WORK_DIR}/data/longxiang.db'"
    else
        cp "${DB_PATH}" "${WORK_DIR}/data/longxiang.db"
    fi
fi

if [ -d "${UPLOAD_DIR}" ]; then
    mkdir -p "${WORK_DIR}/uploads"
    cp -a "${UPLOAD_DIR}/." "${WORK_DIR}/uploads/"
fi

tar -C "${BACKUP_DIR}" -czf "${ARCHIVE}" "$(basename "${WORK_DIR}")"
rm -rf "${WORK_DIR}"

find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'daily-*.tar.gz' -mtime +30 -delete

echo "Backup created: ${ARCHIVE}"
