# Base Workflow

This document defines the reusable collaboration workflow for the user, Codex, and Claude.

## Roles

- User: publishes tasks, passes Markdown files between Codex and Claude, and decides whether to continue, pause, or change direction.
- Codex: reads project context, writes executable plans/specifications, revises them from Claude's review feedback, and executes only after the plan is approved or the user explicitly asks Codex to proceed.
- Claude: reviews Codex plans/specifications, identifies risks, contradictions, missing details, and implementation concerns, then writes structured feedback for Codex. Claude does not implement, edit files, run data migrations, or execute tasks.

## Standard Loop

1. User publishes a task to Codex.
2. Codex reads the relevant project files and writes an executable plan or task
   specification.
3. For any task that will span multiple conversation rounds, Codex writes the
   full plan/specification to `docs/tasks/{task-id}-spec.md` and commits it
   before sending the handoff file to the user. This file is the authoritative
   source for the task. If the desktop handoff file is overwritten in a later
   round, Claude and Codex read `docs/tasks/{task-id}-spec.md` to recover the
   original plan.
4. Codex writes `C:\Users\hnlxd\Desktop\claude_check.md` asking Claude to
   review the plan, not implement it by default.
5. User sends `claude_check.md` to Claude.
6. Claude reviews the plan/specification and writes feedback to
   `C:\Users\hnlxd\Desktop\codex_check.md`.
7. User sends `codex_check.md` back to Codex.
8. Codex responds with one of the following:
   - a revised plan/specification for another Claude review round;
   - an execution plan for Codex to carry out;
   - a clarification request for the user;
   - a decision that the task is blocked or should be split.
9. Codex executes only after the plan is approved by Claude or the user
   explicitly asks Codex to proceed despite open review comments.

## Desktop Handoff Files

- `C:\Users\hnlxd\Desktop\codex_check.md`: Claude-to-Codex review feedback, questions, or risk reports. This file may be overwritten each round.
- `C:\Users\hnlxd\Desktop\claude_check.md`: Codex-to-Claude plans/specifications and review requests. This file may be overwritten each round.

Each handoff file should start with either "给 Codex 的提示词" or "给 Claude 的提示词".

## Execution Branches

The default branch is:

```text
User task -> Codex plan -> Claude review -> Codex revision or execution
```

Codex executes code/data changes when:

- Claude has reviewed and approved the plan; or
- Claude's feedback has been incorporated and the user asks Codex to proceed; or
- the user explicitly asks Codex to skip Claude review for a simple task.

Claude remains review-only in all branches. Do not route implementation work to
Claude.

## Moving To The Next Round

A round is complete only when Codex has processed Claude's review feedback and
produced one of these outcomes:

- revised plan for another Claude review;
- approved execution plan;
- completed Codex execution with verification;
- clear blocker or user decision request.

For Admin UI batch work, also follow `docs/admin-ui/ADMIN_UI_WORKFLOW.md`.

## Task Spec Persistence

For single-round tasks (straightforward, no context risk), the desktop handoff
file alone is sufficient unless the user asks for persistence.

For multi-round tasks (complex, spans multiple conversation turns, or involves
more than one review/revision/execution cycle), Codex must:

1. Write the full task plan/specification to `docs/tasks/{task-id}-spec.md`.
2. Commit that file before sending the review request to the user.
3. Include a "必读文档" line in the handoff pointing Claude to this file.

Claude must:

1. Read `docs/tasks/{task-id}-spec.md` at the start of each new conversation
   turn before reviewing or implementing.
2. If the file is missing, ask the user to confirm the task scope before
   proceeding.

When the task is complete and accepted, the spec file may be deleted or
archived per `docs/tasks/README.md`.

## Spec Issue Escalation

If Claude finds a plan/specification is not executable, contradicts a code
boundary, or has a critical ambiguity during review or implementation, Claude
must:

1. Stop review/implementation at the blocked point — do not guess or infer
   intent.
2. Write the specific issue to `C:\Users\hnlxd\Desktop\codex_check.md` using
   the REVIEW_TEMPLATE format, with the issue clearly marked in
   "已知风险/待确认点".
3. Ask the user to forward it to Codex for clarification before resuming.

Codex must respond with either a corrected specification or an explicit
decision on how Claude should handle the ambiguity.

## 执行验证规范（Codex 必读）

每次 Phase 执行完毕、提交审核请求前，Codex 必须完成以下三项验证。缺少任意一项，审核请求视为不完整。

### 1. 代码文件完整性检查

不得仅验证本次修改涉及的文件。执行完毕后，必须主动检查：

- 所有调用了本次改动函数/变量的文件（使用 grep 确认全项目调用点）
- 动态渲染路径涉及的 JS 文件（如 `products-list.js`、`product-detail.js` 等）
- 阿语对应页面（`ar/` 目录下所有受影响的 HTML/JS）
- 边缘页面（`404.html`、`compare.html`、`certifications.html` 等）

报告中须列出"已检查的文件范围"，明确说明检查了哪些文件、是否存在未检查的相关文件。

### 2. 代码执行结果与预期视觉效果对照

每次执行后，必须提供 before/after 截图对照，而非只提交 after 截图。

对照要求：

- 逐区块列出"改动前存在的内容"与"改动后的状态"
- 若某区块改动前有内容、改动后消失，必须在报告中明确说明原因
- 视觉质量验收与功能验收并列，不得以"功能正确"替代"视觉合格"

Playwright 截图只能验证特定断言，不能替代人工视觉对照。报告中须单独列出"Playwright 未覆盖的页面和场景"。

### 3. 防止"看似空白实为内容"的异常

以下情况在截图中会显示为空白，但并非真正空白，禁止将其误判为布局问题或误判为"正常"而跳过：

| 现象 | 实际原因 | 验证方式 |
| --- | --- | --- |
| 页面区块显示空白 | 动画元素被标为 `is-observable` 后隐藏，IntersectionObserver 尚未回调 | 检查元素是否有 `opacity: 0` + `is-observable` class；用 `setTimeout` 延迟截图或读取 DOM 检查 |
| 嵌入组件显示空白 | Cookie 同意系统拦截了 iframe 加载（`data-consent-src`） | 检查 HTML 是否有 `data-consent-category` 属性；此类空白属于正常行为，不得标记为布局问题 |
| 产品/内容列表为空 | 动态渲染后再次调用 `initScrollAnimations()`，卡片被隐藏 | 检查渲染函数是否调用了 `window.initScrollAnimations()`；若有，确认卡片在截图时是否已恢复可见 |
| 地图/视频区域空白 | 第三方嵌入未加载（网络、API key、或 consent 拦截） | 读取 HTML 确认该位置是否有 `iframe` 或 `consent-embed-placeholder`；空白有解释则标注，无解释则上报 |

每次截图出现非预期空白时，必须读取对应 HTML 元素确认其性质后再下结论，不得仅凭截图表象判断。

### 4. 方案优化后必须合并持久化

每当 Claude 审查意见或用户反馈导致方案调整，Codex 必须：

1. 将调整内容合并回 `docs/tasks/{task-id}-spec.md`
2. 在合并后的文件中标注版本（如 `## 版本：v2，已并入 Claude 审查意见`）
3. 提交合并后的 spec 文件
4. 在下一轮 `claude_check.md` 的"必读文档"字段中指向更新后的 spec

禁止仅将优化内容保存在临时 `codex_check.md` 或对话记录中，跨 session 时这些内容将丢失。
