# Agent Instructions

## 语言规范

所有自然语言均使用中文。

Before working in this repository, read and follow [WORKFLOW.md](docs/ops/WORKFLOW.md).

## 协作协议

三方（用户 / Codex / Claude）协作规则见 `docs/protocol/`：

- [BASE_WORKFLOW.md](docs/protocol/BASE_WORKFLOW.md) — 三方职责与标准流程
- [CODE_BOUNDARIES.md](docs/protocol/CODE_BOUNDARIES.md) — 全局禁区
- [HANDOFF_TEMPLATE.md](docs/protocol/HANDOFF_TEMPLATE.md) — 任务规格模板（Codex 发给 Claude 时使用）
- [REVIEW_TEMPLATE.md](docs/protocol/REVIEW_TEMPLATE.md) — 实现报告模板（Claude 回填给 Codex 时使用）

临时任务文档见 `docs/tasks/`，命名约定：`{task-id}-spec.md`。

Key rules:

- Treat `D:\Projects\longxiang-website` as the primary development workspace.
- Treat GitHub `origin/main` as the backup and synchronization source.
- Treat `longxiang:/home/ubuntu/longxiang-website` as the deployment/server working copy.
- Do not modify both local and server copies independently.
- Before changes, check `git status` and sync from `origin/main`.
- After changes, commit and push to `origin/main`; deploy by pulling on the server.
- Do not commit `node_modules/`, `.agents/`, `backups/`, or `.env` files.
