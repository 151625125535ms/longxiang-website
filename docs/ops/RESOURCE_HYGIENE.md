# 资源与 Git 卫生治理

## 目的

本文档记录本项目哪些文件应进入 Git，哪些文件必须留在运行时目录或本地临时目录中，避免数据库、上传资源、日志、截图、备份包和临时产物混入代码提交。

## 固定原则

- GitHub `main` 是唯一代码源。
- 服务器只允许从 GitHub pull，不允许直接编辑、提交或向服务器 remote push。
- `data/*.db`、`data/*.db-shm`、`data/*.db-wal` 不进入 Git。
- `uploads/` 是运行时上传资源目录，不应继续把新增上传资源纳入 Git。
- `backups/` 是备份输出目录，不进入 Git。
- `screenshots/` 是验证截图目录，不应继续把新增截图纳入 Git。
- `logs/` 是本地或服务器日志目录，不进入 Git。
- `.tmp/` 和 `chanpince/` 当前仅记录为未跟踪目录，本阶段不清点、不移动、不删除、不暂存。

## 当前清点结论

### 已通过 `.gitignore` 排除

- `node_modules/`
- `.agents/`
- `backups/`
- `data/*.db`
- `data/*.db-shm`
- `data/*.db-wal`
- `data/*.db.bak*`
- `*.log`
- `logs/`
- `.env`
- `.env.*`
- `/uploads/*`
- `screenshots/`
- `test-results/`

### 本阶段补充排除

- `*.bak`
- `*.bak-*`
- `*.tmp`
- `!/.tmp/` 用于保持仓库根目录 `.tmp/` 仍为本阶段不处理的未跟踪目录，避免被通用 `*.tmp` 规则吞掉
- `*.old`

### 当前存在但本阶段不处理的目录

- `.tmp/`
- `chanpince/`

### 历史遗留项

当前仓库中历史上已经跟踪过部分资源文件：

- `screenshots/` 下有 5 个已跟踪截图文件。
- `uploads/` 下有 35 个已跟踪上传资源文件。
- `backups/`、`logs/`、`data/` 当前没有被 Git 跟踪的运行时文件。

这些历史遗留项本阶段只记录，不移除、不归档、不删除。若后续需要把它们移出 Git，应单独形成文件清单、评估页面引用风险，并取得明确批准后再执行。

## 执行纪律

- 不执行 `git clean`。
- 不递归删除未跟踪目录。
- 不直接删除运行时资源、数据库、备份、日志或截图。
- 任何删除、归档或 Git 跟踪状态调整，必须先形成明确文件清单并取得用户批准。
- 如果某个运行时产物确实需要作为长期文档证据，应移动到 `docs/` 下并说明用途；本阶段不执行移动。

## 常用检查命令

```powershell
git status --short
git diff --check
git check-ignore -v --no-index backups\example.zip
git check-ignore -v --no-index screenshots\example.png
git check-ignore -v --no-index logs\example.log
git check-ignore -v --no-index uploads\example.png
git check-ignore -v --no-index data\example.db
git ls-files backups screenshots logs uploads data
npm run images:audit
npm run images:repair-product-links
npm run images:verify-product-links
```

## 后续建议

- 如果需要治理已跟踪的 `screenshots/` 和 `uploads/` 历史资源，应作为独立阶段执行，不与业务代码修改混在一起。
- 如果后续继续细化 `.gitignore`，可单独评估是否显式加入 `data/backups/`，以及是否为 `uploads/docs/.gitkeep` 建立更清晰的例外规则。
- 对生产上传资源的备份，应依赖服务器备份策略或单独对象存储备份，而不是 Git。
- 对本地验证截图和临时文件，应在确认无需追溯后由用户批准清理。
- 产品图片资源关联补偿优先使用 `npm run images:repair-product-links` 做 dry-run；生产 `--apply` 属于数据库写入，必须单独确认，不和资源文件清理混在同一阶段。
