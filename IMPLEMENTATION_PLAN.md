# Longxiang Website — 项目实施计划（Codex 上下文文档）

> 本文档供 Codex 每次新会话开始时加载，快速建立项目背景。
> 内容随项目阶段推进更新；代码细节以源文件为准。

## 项目概述

Longxiang 外贸网站：变压器、新能源设备、开关柜产品的 B2B 展示与询盘网站。
目标市场：阿拉伯语 + 英文双语，服务中东地区客户。

- 本地开发目录：`D:\Projects\longxiang-website`
- 服务器路径：`/home/ubuntu/longxiang-website`（别名 `longxiang`）
- 主分支：`main`；所有改动走本地 → GitHub → 服务器 pull 链路

## 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | Node.js + Express，入口 `server/app.js` |
| 数据库 | SQLite + better-sqlite3，文件 `data/longxiang.db` |
| 进程管理 | PM2，`ecosystem.config.js`，instances=1 单进程 |
| 前端 | 原生 HTML/CSS/JS，无框架 |
| 后台 UI | `admin/index.html` + `admin/js/admin.js` |
| 环境开关 | `USE_SQLITE=true`（生产和开发均已设置） |

**关键路径：**
- 后台路由：`server/routes/admin/`（需 JWT 鉴权）
- 公开路由：`server/routes/`（无鉴权）
- 前台 JS：`js/`
- 后台 UI：`admin/`

## 已完成的基础能力（不要重做）

- SQLite 迁移、schema_migrations 表、7 个 content_blocks seed
- 后台乐观锁：PUT /:slug + version + 409 VERSION_CONFLICT
- batch 事务 + versionMap 事务前校验
- audit_logs 写入（before/after）
- USE_SQLITE / ADMIN_SQLITE_REQUIRED 环境开关
- 产品 / 证书 / 询盘 / 资源 / 审计 / 模块开关 / 系统状态后台 API
- Admin UI 视觉美化 + 内容管理重设计（Batch 7，已完成）

## 产品分类业务约束（当前任务核心约束）

**合法一级 group（封闭集合）：**

```js
VALID_GROUPS = new Set(['transformer', 'new-energy-equipment', 'switchgear'])
```

**slug → group / subCategory 封闭映射：**

| slug | group | subCategory |
| --- | --- | --- |
| `oil-immersed` | `transformer` | `oil-immersed` |
| `dry-type` | `transformer` | `dry-type` |
| `combined` | `transformer` | `combined` |
| `special` | `transformer` | `special` |
| `ac` | `new-energy-equipment` | `ac` |
| `dc` | `new-energy-equipment` | `dc` |
| `energy-storage` | `new-energy-equipment` | `energy-storage` |
| `high-voltage` | `switchgear` | `high-voltage` |
| `medium-low-voltage` | `switchgear` | `medium-low-voltage` |
| `switchgear` | `switchgear` | `medium-low-voltage` |

**重要：**
- `ev-charger` 和独立一级 `energy-storage` 是过时的脏数据 group 值，不是合法 group
- 新增分类必须同步更新 `server/lib/category-helper.js` 和 `js/products-list.js` 的 `FALLBACK_TAXONOMY`

## 静态检查命令（每次 commit 前必须全部通过）

```powershell
node --check server/app.js
node --check server/routes/products.js
node --check server/lib/category-helper.js
node --check js/products-list.js
node --check js/main.js
git diff --check
```

## 协作规则

- **Codex**：设计并执行，commit/push/部署
- **Claude**：只审查方案，不执行代码，不修改项目文件
- 所有审查意见通过 `C:\Users\hnlxd\Desktop\codex_check.md` 传递给 Codex
- 所有 Codex 完成报告通过 `C:\Users\hnlxd\Desktop\claude_check.md` 传递给 Claude
