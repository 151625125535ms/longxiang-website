# Admin UI/UX Optimization — 整体任务定义

本文件是后台管理 UI/UX 全面优化项目的**权威任务清单**。
工作流约定见 `ADMIN_UI_WORKFLOW.md`，逐批进度见 `ADMIN_UI_PROGRESS.md`。

---

## 项目背景与目标

优化现有后台管理体验，不重写技术栈。所有改动限定在 `admin/` 和 `server/routes/admin/*`，不影响公开网站页面。

核心痛点（持续演进）：

- 第 1–5 批：导航、筛选、表单、分页、视觉规范、可访问性
- 第 6 批：数据完整性（已删除数据泄漏）、分页可读性
- **第 7 批（当前）**：视觉美感不足、内容管理对非技术人员不友好、表格设计单薄、用户不知道编辑的内容对应前端哪个位置

---

## 批次状态总览

| 批次 | 内容 | 状态 | Commit |
| ---- | ---- | ---- | ------ |
| 第 1 批 | 列表筛选 + 分页 + 批量操作 | ✅ 已完成 | `38dc754` |
| 第 2 批 | 导航分组折叠 + 顶部 header 改进 | ✅ 已完成 | `0ddd7fd` |
| 第 3 批 | 表单分区 + 内容块折叠 + focus trap + hash 路由 | ✅ 已完成 | `3c80ecc` |
| 第 4 批 | Dashboard 待处理区 + 资源库 + 回收站 tab 分离 | ✅ 已完成 | `836daf5` |
| 第 5 批 | 视觉规范 + 可访问性 | ✅ 已完成 | `51a38a3` |
| 第 6 批 | 已删除数据过滤 + 分页条数摘要 | ✅ 已完成 | `a215201` |
| 第 7 批 | UI 美化 + 内容管理重设计 + 非技术用户友好 | 🔄 实施中（7A）| — |

---

## 已确认的设计决策（不可推翻）

| 决策 | 内容 |
| ---- | ---- |
| education 豁免边界 | 管理 UI 必须优化，数据层（API schema / body_json 字段）禁止改变 |
| 全部 content block API payload 不变 | body_json 结构只能在 UI 层拆解和重组，不能新增字段 |
| focus trap 覆盖所有 modal | 含 destructive confirm modal |
| 分页 helper 复用 | `renderPagination()` 统一使用，不重复造轮子 |
| 内容块改造范围 | 全部 7 个内容块，含 education，不得豁免 UI 层改造 |
| 技术栈不变 | 纯 HTML / CSS / Vanilla JS，无框架 |

---

## API 兼容约定

- 不新增数据库字段，不改数据库 schema
- content block 的 `POST /admin/content/:key` 写入 payload 结构不变
- education `GET /api/education` 返回结构不变
- 不改公开网站任何接口