#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${LONGXIANG_DATA_DIR:-/var/lib/longxiang/data}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/lib/longxiang/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/longxiang}"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK_DIR="${BACKUP_DIR}/daily-${STAMP}"
ARCHIVE="${WORK_DIR}.tar.gz"

mkdir -p "${WORK_DIR}"

if compgen -G "${DATA_DIR}/*.json" > /dev/null; then
    cp "${DATA_DIR}"/*.json "${WORK_DIR}/"
fi

if [ -d "${UPLOAD_DIR}" ]; then
    mkdir -p "${WORK_DIR}/uploads"
    cp -a "${UPLOAD_DIR}/." "${WORK_DIR}/uploads/"
fi

tar -C "${BACKUP_DIR}" -czf "${ARCHIVE}" "$(basename "${WORK_DIR}")"
rm -rf "${WORK_DIR}"

find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'daily-*.tar.gz' -mtime +14 -delete

echo "Backup created: ${ARCHIVE}"
