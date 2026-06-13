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

状态：未开始

- [ ] 产品/证书/分类 modal 改为分区表单（基础信息/展示内容/多语言/SEO），底部保存 sticky
- [ ] 全部内容块（含 education）折叠卡片列表，卡片标题显示关键字段摘要
- [ ] 高级 JSON 默认在 `<details>` 中收起，保存前校验错误位置提示
- [ ] 未保存变更提醒（切换菜单/关闭 modal/重新加载前确认）
- [ ] 版本冲突：提示 + 重新加载按钮（不做草稿保留）
- [ ] Focus trap（Tab 焦点不逃出 modal）+ Esc 关闭 + 焦点回触发按钮
- [ ] Hash 路由：视图切换写 hash，`hashchange` 加载视图（此为本批最后实现）
- [ ] `npx playwright test tests/smoke.spec.js --reporter=line` 通过

---

## Batch 4: Dashboard + Resource Library + Recycle Bin

状态：未开始

- [ ] Dashboard 待处理区：新询盘数、草稿产品数、最近修改内容、最近上传资源
- [ ] 常用卡片带筛选跳转（如新询盘 → `#inquiries?status=new`）
- [ ] 资源库：先核查 `/admin/assets` 是否已有 `q`/`type` 参数；有则直接用，无则新增
- [ ] 资源路径复制按钮 + 成功 toast
- [ ] 回收站：产品/证书 tab 分离
- [ ] `npx playwright test tests/smoke.spec.js --reporter=line` 通过

---

## Batch 5: Visual Standards + Accessibility

状态：未开始

- [ ] 行高 ≥ 44px、按钮触控区 ≥ 44px（移动端）
- [ ] 统一空状态、加载骨架、错误状态、toast 样式
- [ ] 减少大面积深色块，仅侧栏使用深色
- [ ] 批量选择和表格操作键盘可访问
- [ ] `npx playwright test tests/smoke.spec.js --reporter=line` 通过



