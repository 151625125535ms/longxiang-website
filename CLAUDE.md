# Longxiang Website — Claude Code 项目指令

## 语言规范

所有自然语言均使用中文。代码注释、变量名、API 字段名保持英文。

## 工作流规则

详见 [WORKFLOW.md](WORKFLOW.md)。核心规则：

- 本机开发目录：`D:\Projects\longxiang-website`
- 服务器路径：`/home/ubuntu/longxiang-website`（别名 `longxiang`）
- 主分支：`main`；开工前 `git pull origin main`，完成后 `git push origin main`
- 服务器不直接写代码，只 pull 部署

## 技术栈

- Node.js + Express，入口 `server/app.js`
- SQLite + better-sqlite3，数据库 `data/longxiang.db`
- 后台路由 `server/routes/admin/`，公开路由 `server/routes/`
- 前台 JS `js/`，后台 UI `admin/`
- 进程管理：PM2，`ecosystem.config.js` instances=1（单进程）

## 已完成基础能力（不要重做）

- SQLite 迁移、7 个 content_blocks seed、schema_migrations 表
- 后台版本乐观锁（PUT /:slug + version + 409 VERSION_CONFLICT）
- batch 事务 + versionMap 事务前校验
- audit_logs 写入（before/after）
- USE_SQLITE / ADMIN_SQLITE_REQUIRED 环境开关
- 产品/证书/询盘/资源/审计/模块开关/系统状态后台 API

## 当前任务

内容管理系统 7 个子模块优化（CMS Optimization）。

详见：
- [CMS_TASK.md](CMS_TASK.md) — 逐步执行单
- [CMS_PROGRESS.md](CMS_PROGRESS.md) — 进度追踪
- [CMS_INVARIANTS.md](CMS_INVARIANTS.md) — 绝对禁止清单（每次写代码前必读）
- [CMS_GROUND_TRUTH.md](CMS_GROUND_TRUTH.md) — SSH 核查固化事实（不允许重新推断）

## 静态检查命令（每次 commit 前必须全部通过）

```powershell
node --check server/app.js
node --check server/routes/company.js
node --check server/routes/education.js
node --check server/routes/admin/content-blocks.js
node --check admin/js/admin.js
git diff --check
```

## 快速验收命令

```powershell
# 本地开发服务器
$env:USE_SQLITE="true"; npm start

# 内容块列表
curl http://localhost:3000/api/admin/content-blocks?page=1^&pageSize=20

# education 字段验证
curl http://localhost:3000/api/education | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const b=JSON.parse(d);console.log(b.hero&&b.hero.title?'OK_OLD_SCHEMA':'FAIL_NEW_SCHEMA');})"
```
