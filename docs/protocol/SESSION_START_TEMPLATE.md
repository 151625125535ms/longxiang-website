给 Codex 的提示词

# 任务开始

---

## 【填写任务】

<!-- 在这里写你要做的事，一两句话即可，例如：
     "我想给产品列表页加一个搜索框"
     "批量操作功能有个 bug，选中后点删除没有反应"
     "继续上一轮 Batch 7C 的任务，Claude 已审核 Codex 方案"
-->

> 本次任务：


---

## 系统说明（不需要修改）

### 项目基本信息

- 项目：longxiang-website（外贸网站 + 后台管理系统）
- 路径：`D:\Projects\longxiang-website`
- 技术栈：Node.js + Express + SQLite（better-sqlite3）
- 后台路由：`server/routes/admin/`，后台 UI：`admin/`
- 当前阶段：Batch 7（Admin UI 视觉美化 + 内容管理重设计）

### 协作分工

| 角色 | 职责 |
|------|------|
| **Codex**（OpenAI Codex CLI） | 读取项目、设计方案、根据 Claude 审核意见修订方案或执行 |
| **Claude** | 审核 Codex 方案，指出风险、遗漏、边界问题和修改建议；默认不直接实现 |
| **用户** | 在 Codex 和 Claude 之间传递文件，决定方向和是否继续 |

### 两个传话文件

| 文件 | 方向 | 作用 |
|------|------|------|
| `C:\Users\hnlxd\Desktop\codex_check.md` | Claude → Codex | Claude 的方案审核意见、问题或风险反馈 |
| `C:\Users\hnlxd\Desktop\claude_check.md` | Codex → Claude | Codex 的方案、规格或审核请求 |

每轮任务结束后这两个文件都会被覆盖，不是永久存档。

### 标准流程

```
用户发布任务 → Codex 设计方案/规格 → 用户发给 Claude 审核
→ Claude 输出审核意见 → 用户发给 Codex
→ Codex 根据意见修订方案或执行 → 必要时再次交给 Claude 审核
```

### 协议文档位置

完整协作规则在项目内永久保存，Claude 和 Codex 每次对话开始时会自动加载：

- `docs/protocol/BASE_WORKFLOW.md` — 完整流程与三方职责
- `docs/protocol/CODE_BOUNDARIES.md` — 全局禁区
- `docs/protocol/HANDOFF_TEMPLATE.md` — Codex 发给 Claude 的方案审核请求格式
- `docs/protocol/REVIEW_TEMPLATE.md` — Claude 回给 Codex 的方案审核意见格式
- `docs/tasks/` — 跨多轮任务的规格持久化目录

### 关键约束（摘要）

- 不改数据库 schema，除非用户明确批准
- 不改公开 API 响应结构（含 `GET /api/education`）
- 不提交 `node_modules/`、`.agents/`、`backups/`、`.env`
- 不使用 `--no-verify`，不 force push
- CMS 专项约束见 `docs/cms/CMS_INVARIANTS.md`

---

## Codex 收到后请做

1. 确认已理解任务描述。
2. 判断任务是否复杂、是否需要持久化到 `docs/tasks/{task-id}-spec.md`。
3. 读取相关项目文件和协议文档。
4. 输出 Codex 初版方案或任务规格。
5. 将给 Claude 审核的内容写入 `C:\Users\hnlxd\Desktop\claude_check.md`。
6. 如果任务复杂，先提交持久化任务文档，再让用户转交 Claude 审核。

## Claude 后续收到 `claude_check.md` 后请做

1. 默认只审核 Codex 方案，不直接实现。
2. 检查方案是否可执行、是否违反边界、是否漏掉关键文件/数据/语言版本/验收步骤。
3. 将审核意见写入 `C:\Users\hnlxd\Desktop\codex_check.md`，由用户转交 Codex。
4. 只有用户明确要求 Claude 实现时，才进入 Claude 实现分支。
