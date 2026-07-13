# 数据库迁移纪律

## 目标

数据库 schema 变化必须通过本地代码和迁移脚本完成，禁止在生产服务器手工修改数据库结构。

## 当前迁移

- Version 1: `initial_schema`，由 `server/db/schema.sql` 初始化并记录。
- Version 2: `runtime_schema_baseline`，把历史运行时补丁纳入正式迁移，包括：
  - `inquiries.country`
  - `certifications.asset_id`
  - `asset_references` 表和索引
- Version 3: `i18n_fr_ru_fields`，增加产品和证书的法语、俄语字段族。
- Version 4: `products_name_cn_model`，增加产品中文名称和型号字段。
- Version 5: `company_identity`，增加公司身份相关结构。
- Version 6: `product_arabic_seo_fields`，增加产品 `seo_title_ar`、`seo_description_ar`、`seo_keywords_ar`。截至 2026-07-14 生产仍为 v5，v6 尚未获得生产迁移授权。

## 执行前要求

本地迁移验证前先执行 `git status --short`，并用 `server/db/backup.js` 创建 SQLite 在线备份。生产备份必须写入仓库外的专用绝对路径，不能使用活动数据库旁的默认路径，也不能覆盖已有文件。

```powershell
node server/db/backup.js C:\backups\longxiang-pre-migration-YYYYMMDD-HHMMSS.db
```

只有命令明确输出备份文件、非零字节数、Schema version，并且内部 `PRAGMA integrity_check`、产品总数及状态分布均与源库一致时，才算备份通过。备份失败时停止迁移。

## 本地验证命令

```powershell
node --check server/db/migrations/index.js
node --check server/db/migrations/0006_product_arabic_seo_fields.js
node --check server/lib/sqliteBackup.js
node --check server/lib/db.js
node --check server/db/init.js
node --check server/db/status.js
node server/db/status.js
node scripts/test-product-arabic-seo-support.js
node scripts/test-acceptance.js
git diff --check
```

新库初始化还需要使用临时 `DB_PATH` 验证：

```powershell
$env:DB_PATH='data/stage6-migration-test.db'
node server/db/init.js
node server/db/status.js
Remove-Item -LiteralPath $env:DB_PATH -ErrorAction SilentlyContinue
Remove-Item -LiteralPath ($env:DB_PATH + '-shm') -ErrorAction SilentlyContinue
Remove-Item -LiteralPath ($env:DB_PATH + '-wal') -ErrorAction SilentlyContinue
Remove-Item Env:\DB_PATH
```

## 生产纪律

生产迁移必须单独授权。服务器 pull 后，先在仓库外创建并验证 WAL 安全在线备份；备份通过前不得重启进程触发自动迁移：

```bash
cd /home/ubuntu/longxiang-website
git pull --ff-only origin main
mkdir -p /home/ubuntu/longxiang-backups
node server/db/backup.js /home/ubuntu/longxiang-backups/longxiang-pre-v6-YYYYMMDD-HHMMSS.db
test -s /home/ubuntu/longxiang-backups/longxiang-pre-v6-YYYYMMDD-HHMMSS.db
pm2 restart longxiang-website
pm2 status longxiang-website
```

`server/db/backup.js` 使用 `better-sqlite3` 在线备份 API，并在返回成功前只读打开备份、执行完整性检查和源/备份摘要比对。必须保留命令输出与最终绝对路径；任一检查失败都不得继续 `pm2 restart`。

禁止在生产服务器执行：

```bash
sqlite3 data/longxiang.db
git add .
git commit
git push
```

## 回滚

迁移代码回滚使用本地 `git revert`，再 push 到 GitHub，由服务器 pull。

如果生产数据库结构已经向前迁移，不通过手工删列回滚；应优先从已验证备份恢复，或编写新的前向修复迁移。

## 设计说明

普通运行路径通过 `server/lib/db.js` 的 `getDb()` 自动检查迁移。`server/db/init.js` 初始化新库时使用 `getDb({ skipMigrations: true })`，先执行 `schema.sql` 和 version 1 记录，再运行正式迁移，避免在空库建表前提前记录 version 2。
