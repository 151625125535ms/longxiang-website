# Admin UI/UX Optimization Progress

## Batch 1: Lists, Filters, Pagination, Batch Actions

### Precheck
- [x] Browser visited `http://127.0.0.1:3000/admin/`; Chinese text renders correctly.

### 1-A Pagination Helper
- [x] Create `admin/js/pagination.js` with `renderPagination(container, meta, onPageChange)`.
- [x] Include `js/pagination.js` in `admin/index.html`.

### 1-B Products List
- [x] Add status filter: All / Published / Draft.
- [x] Add featured filter: All / Yes / No.
- [x] Add clear filters button shown only when filters are active.
- [x] Use `/admin/products?status=&featured=&q=&page=&pageSize=` parameters.
- [x] Render pagination with `renderPagination()`.

### 1-C Inquiries List
- [x] Add search input.
- [x] Add unread filter toggle: All / Unread only.
- [x] Add row checkboxes plus select-all checkbox.
- [x] Add sticky batch bar: selected count, mark read, close, delete, clear selection.
- [x] Call `/admin/inquiries/batch` with `mark_read`, `close`, `soft_delete`.
- [x] Refresh list, clear selection, and show toast after batch actions.

### 1-D Certifications List
- [x] Add search input.
- [x] Add status filter dropdown.
- [x] Render pagination with `renderPagination()`.

### 1-E Verification
- [x] `node --check server/app.js`
- [x] `node --check server/routes/admin/inquiries.js`
- [x] `node --check server/routes/admin/products.js`
- [x] `node --check admin/js/admin.js`
- [x] `node --check admin/js/pagination.js`
- [x] `git diff --check`
- [x] `npx playwright test tests/smoke.spec.js --reporter=line`
- [x] Product add/edit modal remains functional.
- [x] Certification add/edit modal remains functional.
- [x] Single inquiry status save remains functional.

## Blockers

None.

---

## Batch 2: Navigation Group Collapse + Header Quick Actions

### Status: 未开始

### 2-A HTML Menu Structure

- [x] 修改 `admin/index.html`，将菜单项按分组包裹（概况 / 产品 / 内容 / 证书 / 询盘 / 资源 / 系统）
- [x] 每个分组加 toggle button，控制展开/收起
- [x] CSS：分组展开/收起动效，当前分组默认展开
- [x] JS：toggle 行为绑定；`localStorage` 记住各分组折叠状态；页面加载时恢复状态

### 2-B Header Improvements

- [x] 顶部 header 增加面包屑（当前视图路径）
- [x] 增加当前视图说明文字
- [x] 快捷按钮：新增产品、查看新询盘、资源库、刷新（各跳转对应视图或 action）

### 2-C Mobile

- [x] 移动端抽屉模式保持，分组折叠同步生效
- [x] 390px 视口下侧栏展开/收起正常，不出现不可操作区域

### 2-D Verification

- [x] `node --check admin/js/admin.js`
- [x] `git diff --check`
- [x] `npx playwright test tests/smoke.spec.js --reporter=line`
- [x] 所有菜单项仍可正常跳转对应视图
- [x] 第 1 批已有功能（产品筛选、询盘批量操作、证书筛选）未受影响

---

## Batch 3: Forms + Content Block Collapse + Focus Trap + Hash Routing

状态：已完成

- [x] 产品/证书/分类 modal 改为分区表单（基础信息/展示内容/多语言/SEO），底部保存 sticky
- [x] 全部内容块（含 education）折叠卡片列表，卡片标题显示关键字段摘要
- [x] 高级 JSON 默认在 `<details>` 中收起，保存前校验错误位置提示
- [x] 未保存变更提醒（切换菜单/关闭 modal/重新加载前确认）
- [x] 版本冲突：提示 + 重新加载按钮（不做草稿保留）
- [x] Focus trap（Tab 焦点不逃出 modal）+ Esc 关闭 + 焦点回触发按钮
- [x] Hash 路由：视图切换写 hash，`hashchange` 加载视图（此为本批最后实现）
- [x] `npx playwright test tests/smoke.spec.js --reporter=line` 通过

---

## Batch 4: Dashboard + Resource Library + Recycle Bin

状态：已完成

- [x] Dashboard 待处理区：新询盘数、草稿产品数、最近修改内容、最近上传资源
- [x] 常用卡片带筛选跳转（新询盘 → 询盘未读筛选；草稿产品 → 产品 draft 筛选）
- [x] 资源库：已核查 `/admin/assets` 原本不支持 `q`/`type`，本批兼容新增
- [x] 资源路径复制按钮 + 成功 toast
- [x] 回收站：产品/证书 tab 分离
- [x] sessionStorage 草稿保留：产品 / 证书 / 内容块 409 后保存并提示恢复
- [x] `npx playwright test tests/smoke.spec.js --reporter=line` 通过

---

## Batch 5: Visual Standards + Accessibility

状态：已完成

- [x] 行高 ≥ 44px、按钮触控区 ≥ 44px（移动端）
- [x] 统一空状态、加载骨架、错误状态、toast 样式
- [x] 减少大面积深色块，仅侧栏使用深色
- [x] 批量选择和表格操作键盘可访问
- [x] 遗留清理：合并重复 trapFocus、回收站标题修复、hash 初始化 active 回归验证
- [x] `npx playwright test tests/smoke.spec.js --reporter=line` 通过

---

## Batch 6: Deleted Data Filtering + Pagination Summary

状态：已完成

- [x] 产品列表默认排除 `deleted`，显式 `status=deleted` 仍用于回收站
- [x] 证书列表默认排除 `deleted`，四个证书视图统一生效
- [x] 分页组件单页/多页均显示条数摘要
- [x] `node --check server/routes/admin/products.js`
- [x] `node --check server/routes/admin/certifications.js`
- [x] `node --check admin/js/pagination.js`
- [x] `node --check admin/js/admin.js`
- [x] `npx playwright test tests/smoke.spec.js --reporter=line` 通过

---

## Batch 7A: 设计 Token + 表格视觉基础 + 证书缩略图

状态：已完成

### 7A-1 CSS 设计 token 层追加

- [x] 在 `admin/css/admin.css` 追加语义 token（品牌色/表面色/文字色/状态色/间距/字型/圆角/阴影/动效）
- [x] 不删除、不修改现有变量，只追加

### 7A-2 表格视觉基础样式

- [x] 表头：`--surface-subtle` 背景，字重 600，`--text-secondary`
- [x] 数据行行高 56px，`--border-subtle` 分隔线
- [x] hover 行：浅蓝背景（accent-500 低透明度）
- [x] selected 行：左侧 3px `--accent-500` rail
- [x] badge 统一：`.badge-published` / `.badge-draft` / `.badge-deleted` / `.badge-unread` / `.badge-read` / `.badge-closed`
- [x] 操作按钮样式：`.btn-icon`（32×32，带 `title` tooltip）

### 7A-3 证书缩略图

- [x] 移除证书表格"图片路径"列（`<th>` 和对应 `<td>`）
- [x] 增加预览列（`.table-cell-thumb`，48×36，无图显示占位图标）
- [x] 证书名称列第二行加辅助小字（ID 或编号）

### 7A-4 操作按钮图标化

- [x] 产品列表操作列改为 `.btn-icon` 图标按钮（编辑 / 删除 SVG 图标）
- [x] 证书列表同上
- [x] 询盘列表同上
- [x] 所有按钮有 `title` 属性

### 7A-5 验收

- [x] `node --check admin/js/admin.js`
- [x] `node --check admin/index.html` 不适用：Node 24 对 `.html` 返回 `ERR_UNKNOWN_FILE_EXTENSION`
- [x] `git diff --check`
- [x] `npx playwright test tests/smoke.spec.js --reporter=line`
- [x] 截图 1440px（证书列表、产品列表）
- [x] 截图 390px（同上）

---

## Batch 7B: 内容模块位置 Banner + 字段说明文案

状态：已完成

### 7B-1 位置说明 Banner

- [x] 新增 `CONTENT_BLOCK_BANNERS`，覆盖 7 个内容模块
- [x] 在 `renderContentBlockForm()` 的内容卡片顶部插入位置说明 banner
- [x] `content-about` / `content-technology` 显示前台暂未接入提示
- [x] `content-education` banner 包含 `hero.title` / `hero.titleAr` 不可改名提醒

### 7B-2 字段说明 Hint

- [x] 新增 `fieldKey()` / `fieldLabel()` / `fieldHint()` helper
- [x] 为图片路径、营销文案、关联 ID、地图 URL、JSON、SEO、布局、启用开关等高困惑字段提供 hint
- [x] `renderField()` / `renderJsonField()` 支持可选 hint
- [x] `renderGroup()` / `renderArrayEditor()` / `renderReservedBlocks()` / `renderContentBlockForm()` 传递 hint

### 7B-3 验收

- [x] `node --check admin/js/admin.js`
- [x] `git diff --check`
- [x] `npx playwright test tests/smoke.spec.js --reporter=line`
- [x] 截图 1440px（company-overview、education、about）
- [x] 截图 390px（company-overview、education、about）


