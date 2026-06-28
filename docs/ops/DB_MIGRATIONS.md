# 数据库迁移纪律

## 目标

数据库 schema 变化必须通过本地代码和迁移脚本完成，禁止在生产服务器手工修改数据库结构。

## 当前迁移

- Version 1: `initial_schema`，由 `server/db/schema.sql` 初始化并记录。
- Version 2: `runtime_schema_baseline`，把历史运行时补丁纳入正式迁移，包括：
  - `inquiries.country`
  - `certifications.asset_id`
  - `asset_references` 表和索引

## 执行前要求

```powershell
node server/db/backup.js
git status --short
```

如果备份失败，停止迁移，不要修改迁移文件。

## 本地验证命令

```powershell
node --check server/db/migrations/index.js
node --check server/db/migrations/0002_runtime_schema_baseline.js
node --check server/lib/db.js
node --check server/db/init.js
node --check server/db/status.js
node server/db/status.js
node scripts/test-acceptance.js
git diff --check
```

新库初始化还需要使用临时 `DB_PATH` 验证：

```powershell
$env:DB_PATH='data/stage5-migration-test.db'
node server/db/init.js
node -e "const {getDb}=require('./server/lib/db'); const db=getDb(); const rows=db.prepare('SELECT version,name FROM schema_migrations ORDER BY version').all(); console.log(JSON.stringify(rows)); if(!rows.some(r=>r.version===2)) throw new Error('migration 2 missing');"
Remove-Item -LiteralPath $env:DB_PATH -ErrorAction SilentlyContinue
Remove-Item -LiteralPath ($env:DB_PATH + '-shm') -ErrorAction SilentlyContinue
Remove-Item -LiteralPath ($env:DB_PATH + '-wal') -ErrorAction SilentlyContinue
Remove-Item Env:\DB_PATH
```

## 生产纪律

生产服务器只允许：

```bash
cd /home/ubuntu/longxiang-website
git pull --ff-only origin main
pm2 restart longxiang-website
pm2 status longxiang-website
```

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
