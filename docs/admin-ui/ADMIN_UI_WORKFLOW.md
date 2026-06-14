# Admin UI/UX Optimization — 工作流约定

本文件在整个长任务期间持续有效，每批执行前必读。

---

## 1. 批次隔离原则

- 每次只执行**一个批次**，批次内子任务可连续完成。
- 一个批次全部完成并通过验收后，写报告给 Claude，**等待 Claude 审查确认**后再开始下一批次。
- 不得跨批次混合执行（例如第 2 批进行中时不得顺手改内容块编辑器）。

---

## 2. 进度文件

- 进度追踪：`D:\Projects\longxiang-website\docs\admin-ui\ADMIN_UI_PROGRESS.md`
- 每完成一个子任务后**立即更新**对应 checkbox（`- [x]`）。
- 如遇阻塞，在进度文件末尾追加"⚠ 阻塞记录"，然后写报告通知 Claude。

---

## 3. 通信协议

| 角色 | 写入文件 | 读取文件 |
| ---- | -------- | -------- |
| Claude 给 Codex 的指令 | `C:\Users\hnlxd\Desktop\codex_check.md` | — |
| Codex 给 Claude 的报告 | `C:\Users\hnlxd\Desktop\claude_check.md` | — |

- 每份文件最上方必须是"给 Claude 的提示词"（或"给 Codex 的提示词"）。
- 文件必须为 UTF-8 编码，防止中文乱码。
- Codex 每次写完报告后，须在文件中提醒 Claude 审查完后继续给 Codex 输出下一轮提示词。

---

## 4. 遇到阻塞时

1. 能自行解决：解决后继续，在进度文件记录。
2. 需要 Claude 决策（API 不存在、边界不明确）：写报告给 Claude，暂停当前批次。
3. 需要用户决策：在报告中明确说明，由 Claude 转达用户。

---

## 5. Git 提交规范

- 每批次完成并验收通过后才提交 commit。
- commit 前运行所有静态检查（见下方验收命令）。
- 不得使用 `--no-verify`，不得 force push。
- commit message 格式：`feat(admin): [batchN] 简短描述`

---

## 6. 验收命令（每批 commit 前必须全部通过）

```powershell
node --check server/app.js
node --check admin/js/admin.js
git diff --check
npx playwright test tests/smoke.spec.js --reporter=line
```

---

## 7. 硬性禁区

1. **不改数据库 schema**（不新增表/字段）
2. **不改公开网站页面**（所有改动限定在 `admin/` 和 `server/routes/admin/*`）
3. **education 数据层保护**：
   - 不改 `GET /api/education` 返回结构
   - 不改 server 端 education 路由或映射逻辑
   - 不在 education body_json 中引入新字段（`_en/_ar` 等）
   - education **管理 UI** 可以也必须优化，但保存时写入 DB 的 payload 必须与改造前完全等价
4. **每批必须跑 smoke test 全部通过**
5. **第 2 批起每批附真实 Chromium 截图**（桌面 1440px + 移动端 390px），截图路径写入 claude_check.md 报告中

---

## 8. 项目关键路径

| 内容 | 路径 |
| ---- | ---- |
| 项目根目录 | `D:\Projects\longxiang-website` |
| 后台 HTML | `admin/index.html` |
| 后台 CSS | `admin/css/admin.css` |
| 后台 JS | `admin/js/admin.js` |
| 分页 helper | `admin/js/pagination.js` |
| 后台路由 | `server/routes/admin/` |
| smoke test | `tests/smoke.spec.js` |
| 整体任务定义 | `D:\Projects\longxiang-website\docs\admin-ui\ADMIN_UI_TASK.md` |
| 进度追踪 | `D:\Projects\longxiang-website\docs\admin-ui\ADMIN_UI_PROGRESS.md` |
| 工作流约定 | `D:\Projects\longxiang-website\docs\admin-ui\ADMIN_UI_WORKFLOW.md`（本文件） |
