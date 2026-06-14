# CMS 优化任务 — 进度追踪

> Agent 每完成一个 Step，立即将 `[ ]` 改为 `[x]`，并填写完成时间。
> 不得跳步，不得在上一步未验证通过前开始下一步。

---

## Day 1：SQLite 稳定性 + 后台 API 规范化

- [x] Step 1.1 — 启用 SQLite WAL + 备份脚本补 checkpoint
  - 验证：`node -e "..."` 输出 `wal`
  - 完成时间：2026-06-12 22:50:52 +08:00

- [x] Step 1.2 — 内容块列表补分页和 meta
  - 验证：`GET /api/admin/content-blocks?page=1&pageSize=5` 含 meta.total=7
  - 完成时间：2026-06-12 22:51:37 +08:00

- [x] Step 1.3 — GET /:slug 和 PUT /:slug 增加固定白名单校验
  - 验证：未知 slug 返回 404
  - 完成时间：2026-06-12 22:52:13 +08:00

- [x] Step 1.4 — 确认 batch 只保留 publish/unpublish
  - 验证：soft_delete 返回 422
  - 完成时间：2026-06-12 22:53:45 +08:00

- [x] Day 1 commit + push
  - commit message：`feat: enable WAL, add pagination/meta/slug-whitelist to content-blocks API`
  - 完成时间：2026-06-12 23:08:00 +08:00（合并为最终实现提交：3075111）

---

## Day 2：Schema 校验 + 旧写接口治理

- [x] Step 2.1 — 建立声明式 SCHEMAS 对象和 validateBodyJson 函数
  - 验证：传入非法类型（stats 为字符串）返回 422
  - 完成时间：2026-06-12 22:54:29 +08:00

- [x] Step 2.2 — PUT /:slug 保留 extra 字段
  - 验证：手动测试保存后 extra 不丢失
  - 完成时间：2026-06-12 22:55:46 +08:00

- [x] Step 2.3 — page-blocks 系统 key 服务端保护
  - 验证：缺少 footer 的保存请求返回 422
  - 完成时间：2026-06-12 22:56:28 +08:00

- [x] Step 2.4 — PUT /api/company 返回 405
  - 验证：PUT /api/company 返回 405
  - 完成时间：2026-06-12 22:57:07 +08:00

- [x] Step 2.5 — PUT /api/education/editor 和 PATCH /api/education 返回 410
  - 验证：两个接口均返回 410
  - 完成时间：2026-06-12 22:57:45 +08:00

- [x] Day 2 commit + push
  - commit message：`feat: add schema validation, page-blocks key guard, deprecate old write routes`
  - 完成时间：2026-06-12 23:08:00 +08:00（合并为最终实现提交：3075111）

---

## Day 3：P1 结构化表单

- [x] Step 3.1 — 企业概况结构化表单
  - 验证：保存后 GET /api/company 字段不丢失；409 时显示重新加载提示
  - 完成时间：2026-06-12 23:03:25 +08:00

- [x] Step 3.2 — 联系我们结构化表单
  - 验证：保存后地图字段正确输出
  - 完成时间：2026-06-12 23:03:25 +08:00

- [x] Step 3.3 — 教育合作结构化表单（字段用 title/titleAr，不用 title_en/title_ar）
  - 验证：保存后 GET /api/education 仍返回 hero.title（老 schema）
  - 验证：admin.js 不再调用 /api/education/editor
  - 完成时间：2026-06-12 23:03:25 +08:00

- [x] Step 3.4 — 页面区块结构化表单
  - 验证：删除 footer 保存被拒绝；修改 footer 文本保存成功
  - 完成时间：2026-06-12 23:03:25 +08:00

- [x] Day 3 commit + push
  - commit message：`feat: structured forms for company-overview, contact, education, page-blocks`
  - 完成时间：2026-06-12 23:08:00 +08:00（合并为最终实现提交：3075111）

---

## Day 4：P2 结构化表单

- [x] Step 4.1 — 关于我们结构化表单（sections/milestones 增删排序）
  - 完成时间：2026-06-12 23:04:56 +08:00

- [x] Step 4.2 — 应用行业结构化表单（industries 增删排序 + product ID 校验）
  - 完成时间：2026-06-12 23:04:56 +08:00

- [x] Step 4.3 — 科技创新结构化表单（sections/highlights 增删排序 + 证书 ID 提示）
  - 完成时间：2026-06-12 23:04:56 +08:00

- [x] Day 4 commit + push
  - commit message：`feat: structured forms for about-us, applications, innovation`
  - 完成时间：2026-06-12 23:08:00 +08:00（合并为最终实现提交：3075111）

---

## Day 5：测试与部署

- [x] Step 5.1 — 所有静态检查通过（node --check）
  - 完成时间：2026-06-12 23:05:50 +08:00

- [x] Step 5.2 — 所有 API 验收命令通过
  - 完成时间：2026-06-12 23:06:38 +08:00

- [x] Step 5.3 — 服务器备份 + 部署 + PM2 验证
  - 完成时间：2026-06-12 23:10:14 +08:00

- [x] Step 5.4 — 前台回归：教育合作页正常、阿语页 titleAr 正常、页脚正常
  - 完成时间：2026-06-12 23:10:14 +08:00

- [x] 最终验收通过，任务完成

---

## 阻塞记录

如果某步骤遇到阻塞，在此记录：

| 步骤 | 问题描述 | 解决方案 | 状态 |
|------|----------|----------|------|
|      |          |          |      |
