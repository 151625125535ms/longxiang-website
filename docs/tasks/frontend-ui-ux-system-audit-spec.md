# Frontend UI/UX System Audit Spec

## 版本状态

- 日期：2026-06-14
- 版本：v2，已并入 Claude 审查意见、用户复盘反馈与 Phase 1 回滚决议
- 角色约束：Codex 负责设计、实现、验证、提交和部署执行；Claude 只负责审查，不实现、不修改文件、不运行命令、不部署
- 当前状态：Phase 1 初版实现 `1365495` 已判定需要回滚并重新设计；不得继续推进 Phase 2，直到 Phase 1 重新设计通过审查

## 背景

本任务目标是对 Longxiang 网站前端进行系统性 UI/UX 优化，覆盖视觉协调、字体层级、图片展示、响应式体验、交互逻辑、英文/阿语一致性和整体转化路径。

设计基线：
- B2B electrical equipment export website
- Trust & Authority
- 工业、专业、可信、清晰
- 避免娱乐化、AI 感渐变、无意义装饰和功能正确但视觉粗糙的改动

## 用户复盘发现的 Phase 1 回归

用户本地查看后指出三个问题，均高于继续 Phase 2：

1. Cookie settings 被压缩成紧凑条后视觉很丑，应保持原有视觉质感或先提交视觉预览，不得只以“不遮挡表单”作为通过标准。
2. 首页 hero 与 products 之间原本存在的文字和图片内容消失，不能动该区域。
3. products 页面出现大片空白、首屏产品不可见。

定位结论：
- Cookie 问题来自 Phase 1 对 `.cookie-consent-banner` 的紧凑化改造。
- 首页和 products 可见性问题来自 `.js-enabled .is-observable.fade-in` 选择器优先级高于 `.fade-in.visible`，导致已经标记为 visible 的元素仍被压成 `opacity: 0`。
- `initScrollAnimations()` 在项目中多处调用，动态渲染后重复标记元素为 `is-observable`，存在结构性风险。

## 当前强制决议

### 决议 1：Phase 1 初版必须回滚

- 回滚提交：`1365495 feat(ui): implement phase 1 UX reliability fixes`
- 使用非破坏式 `git revert`，不得使用 `git reset --hard`
- 回滚范围包括：
  - 所有 HTML 中新增的 `js-enabled` 内联脚本和 `20260614phase1` 版本号
  - `css/styles.css` 中 Phase 1 动画/Cookie/层级改造
  - `js/main.js` 中 Phase 1 动画/计数器改造
- 回滚后保留并更新本规格文件、协议文件和后续重新设计要求

### 决议 2：Phase 1 重新设计前不得直接改代码

重新设计时必须先输出方案给 Claude 审查和用户确认。方案至少包含：
- Cookie 桌面/移动视觉方案，包含截图或 CSS 预览
- 首页 hero 到 products 之间所有原有区块的 before/after 对照
- products 页面首屏产品可见性的硬性验收方式
- `initScrollAnimations()` 幂等策略和全项目调用点分析

### 决议 3：动画架构必须幂等

下一版 `initScrollAnimations()` 必须满足：
- 已经有 `visible` 的元素不得再被隐藏
- 已经有 `is-observable` 的元素不得重复处理
- 动态注入的产品卡片如果需要立即显示，应在渲染时直接带 `visible`
- Playwright 验收必须检查 `products.html` 首屏产品卡片 computed opacity 不为 0

### 决议 4：Cookie 视觉质量与功能同级

Cookie 改造不得只追求“不遮挡”。必须同时满足：
- 保持原有视觉体量和品牌质感，或提交新设计预览让用户确认
- 桌面端不遮挡关键表单
- 移动端不遮挡主要内容
- Customize modal 层级正确
- 若视觉无法从自动化判断，必须标注“需要用户目视确认”

### 决议 5：Phase 3 实施前必须有视觉设计文档

首页信任漏斗重构属于高风险结构改动。代码实施前必须先输出轻量级视觉设计文档，包含：
- 8 个首页区块的顺序、标题、视觉形式
- 各区块大致高度和间距
- 改动前后区块对照表
- 英文和阿语影响范围

该文档写入 `claude_check.md`，Claude 审查、用户确认后才能实现。

### 决议 6：每次方案优化必须持久化

任何 Claude 审查意见、用户反馈、执行中发现的问题，必须合并回本文件或对应 `docs/tasks/{task-id}-spec.md`。

不得只保存在：
- `C:\Users\hnlxd\Desktop\codex_check.md`
- 对话记录
- 临时截图说明

## 分阶段计划（修订版）

### Phase 1：重新设计可靠性与阻塞体验修复

状态：初版已回滚，等待重新设计方案。

必须解决：
- 首页/产品页动画空白
- Cookie 遮挡与视觉质量
- reduced-motion
- 浮动询价和 Cookie 层级

不得发生：
- Cookie 视觉明显降级
- 首页 hero 与 products 之间原有内容消失
- products 首屏产品卡片 opacity 为 0
- 只用 after 截图证明通过

验收必须包含：
- before/after 截图逐区块对照
- 首页 hero 下方区块可见
- products 首屏产品可见
- Cookie 视觉由用户目视确认
- 英文/阿语产品详情移动端
- Playwright 未覆盖场景列表

### Phase 2：字体和布局 token

状态：暂停。Phase 1 重新设计通过前不得执行。

范围：
- 只处理组件/UI 级 viewport 字号，不动合理的 hero 级缩放
- 阿语 above-fold 字体 preload 可纳入评估
- 修改全局 token 时必须截图覆盖所有主要英文/阿语页面

### Phase 3：首页 B2B 信任漏斗

状态：暂停。实现前必须先出视觉设计文档。

风险：
- 首页产品区为异步渲染
- 统计计数器依赖 DOM 时机
- `initScrollAnimations()` 调用点多，重排后必须重新验证

### Phase 4：产品卡片和产品详情优化

状态：暂停。实现前需要用户确认图片处理策略。

注意：
- `object-fit: contain + 白底` 不一定适合工厂实拍图
- 不得移动或删除 `normalizeImagePath()` 调用点
- 不得破坏 `data-products-source="static-fallback"`
- 移动端产品分类筛选是本阶段需求

### Phase 5：Contact、页脚和 RTL 收尾

状态：暂停。

注意：
- Contact 桌面“空白段”曾被误判，实际可能是 Cookie 同意系统阻止地图 iframe 加载
- 看到空白时必须先检查是否为 `data-consent-category="functional"` 的正常占位
- Contact 移动端前两屏缺少询价入口，仍需在本阶段评估

## 执行报告新要求

每次 Phase 或修复提交给 Claude 前，Codex 必须报告：

1. 已检查文件范围：包含 grep 调用点，而不是只列改动文件。
2. 视觉对照：before/after 截图逐区块说明。
3. 视觉自评：是否保持网站调性，是否有新增视觉异常。
4. Playwright 未覆盖场景：明确列出盲区。
5. 规格文件更新：说明本文件是否已同步本轮反馈。

## 当前下一步

1. 提交 Phase 1 初版回滚和本规格文件 v2。
2. 不部署。
3. 如继续该前端优化任务，先重新输出 Phase 1 设计方案到 `C:\Users\hnlxd\Desktop\claude_check.md`。
4. 方案经 Claude 和用户确认后再实现代码。
