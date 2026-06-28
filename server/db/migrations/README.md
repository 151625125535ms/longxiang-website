# Database Migrations

本目录保存 SQLite schema 迁移。迁移文件必须满足：

- 文件名使用递增版本号，例如 `0002_runtime_schema_baseline.js`。
- 每个文件导出 `version`、`name`、`up(db)`。
- `up(db)` 必须可重复执行，优先使用 `IF NOT EXISTS` 或字段存在检查。
- 不在迁移中写入真实业务数据。
- 不在迁移中读取 `.env` 以外的敏感信息。
- 不直接修改生产数据库；生产只通过 GitHub `main` 拉取代码后由应用启动或本地命令执行迁移。

新增迁移时，应先备份本地数据库，再用临时 `DB_PATH` 验证新库初始化和旧库前向迁移。
