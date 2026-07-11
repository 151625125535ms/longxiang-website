# 阶段二批次 2C：全球站完整 SSR 实施计划

## 目标与边界

仅改造 `lxenelectric.com`。在不改变现有视觉、Hero 图片、Contact 地址标签、四语言 URL 与 2A/2B 行为的前提下，让 184 个正式 URL 的原始 HTML 包含公共导航和完整页脚；让 16 个重点内容页、4 个产品目录及 152 个产品详情页输出可抓取正文。

不修改 `.cn`、数据库、分类页、planned `pt`、Nginx、环境变量或认证；不安装依赖。`.cn` 只保留为页脚中的普通中国官网链接。国内电话、国内邮箱、WhatsApp 和冲突注册资本不得进入公开输出。

## 模块与接口

### 数据模块

- `server/lib/publicContentBlocks.js`
  - `readPublicContentBlock(slug)`：只读取 published 内容，解析 JSON，返回带 `version` 的规范对象。
  - `localizePublicContentBlock(block, locale)`：按现有 patch 规则生成四语言视图。
  - API 和 SSR 共同调用，Contact 必须经过公开联系方式过滤。
- `server/lib/publicCompanyView.js`
  - `readPublicCompanyView()`：组合唯一公开企业 view-model。
  - 企业事实只从 `companyIdentity` 和已过滤公开块读取；禁止 renderer 自行硬编码联系方式。

### HTML 模块

- `server/lib/globalShellHtmlRenderer.js`
  - 输入 HTML 壳、locale、pathname、global-shell、company view。
  - 输出导航、active 状态、完整页脚和 SSR 版本标记。
- `server/lib/contentPageHtmlRenderer.js`
  - 输入 HTML 壳、页面 slug、localized block。
  - 只负责 home/about-us/solutions/contact 的正文和版本标记。
- `server/lib/productListHtmlRenderer.js`
  - 输入 products 壳、产品、分类、locale、query。
  - 输出首屏卡片、筛选状态、分页及版本标记；不生成分类 URL。
- `server/lib/productDetailHtmlRenderer.js`
  - 输入详情壳、产品、product-pages block、相关产品及 locale。
  - 输出产品正文、规格、支持、FAQ、询盘上下文和相关链接；不输出高风险 Product 字段。

### 路由组合

`server/app.js` 只编排读取和 renderer 调用：静态内容页、clean/parameter products、产品详情和 404 都先生成公共壳，再应用既有 head SEO renderer。干净 products 不再落入 `express.static`。

### 客户端接管

- `main.js` 在 `globalShellCache === null` 时保留 SSR 导航和页脚。
- 服务端/API 版本一致时不替换 DOM，只绑定移动菜单、Cookie、询盘、Social 和追踪事件。
- `content-pages.js`、`products-list.js`、`product-detail.js` 读取 SSR 标记；版本一致时跳过初始整块重绘，后续筛选和交互仍使用现有 renderer。
- 所有事件通过元素标记或既有初始化边界幂等绑定，防止重复提交和重复 GA4 事件。

## TDD 与回滚边界

### A：共享公开数据和公共壳

先新增失败测试覆盖企业数据过滤、184 路由壳、HTML escape、导航/页脚非空、active 状态和 SSR 版本，再实现数据模块、公共壳 renderer 与 `main.js` 幂等接管。验证后提交“服务端输出全球站公共导航和页脚”。

### B：重点静态正文

先新增 16 页原始正文失败测试，再实现四类正文 renderer。比较最终 DOM 文本、顺序、class、Hero URL、Contact 标签与基线；验证后提交“服务端输出重点静态页面正文”。

### C：产品目录和参数页

先新增 clean/parameter 页失败测试，再实现默认首屏、query 筛选、分页及客户端接管。验证 200、robots、canonical、无参数 hreflang 和筛选交互；提交“服务端输出产品列表首屏内容”。

### D：产品详情

先新增 152 页正文失败测试，再实现详情正文和幂等接管。验证 H1、描述、图片、规格、应用、选型、支持、FAQ、询盘、相关链接及既有 Schema；提交“服务端输出产品详情正文”。

## 验证门禁

每个边界执行 `git diff --check`、相关 `node --check` 和新增单元测试。四个边界完成后按 task.md 顺序运行 acceptance、`npm run check:all`、sitemap、SEO、2B redirect、产品原始 SEO、Schema、全站 SSR 审计、smoke 和 SSR/hydration Playwright；全站浏览器审计串行运行。

浏览器额外验证 JavaScript 禁用、API 延迟/API 失败、桌面/移动、LTR/RTL、移动菜单、Cookie Settings、询盘表单、产品筛选和详情询盘。临时截图、trace、审计 JSON 不提交。

## 部署与回滚

所有本地门禁和两轮只读审查通过后才一次性 push。部署前确认生产仓库干净，服务器仅 `git pull --ff-only origin main`，只重启一次 `longxiang-website` 并确认 PM2 online。生产按同一组全量审计和视觉检查验收；若失败，按 A/B/C/D 的独立提交执行 Git revert，再由服务器 pull 回滚后的 main。

## 2026-07-11 执行状态

- A 已按用户授权调整顺序先行部署：公共导航、完整页脚、公开企业数据过滤及公共壳幂等水合均已上线；生产公开 API 已完成国内联系方式、WhatsApp 和遗留注册资本过滤。
- 已重新采集并严格验证生产公开快照：38 个产品、184 个 sitemap URL、4 个正式语言、3 组产品 taxonomy，敏感字段发现数为 0。
- B 已完成：16/16 重点静态页原始 HTML 输出已发布正文；Node 与浏览器共用 `content-page-presentation.js`，同版本水合不替换正文节点。
- C 已完成：4/4 clean 产品目录及四语言参数页服务端输出当前筛选、taxonomy、最多 9 张首屏产品卡和分页；参数页继续保持 `200 + noindex,follow + clean canonical/hreflang`。
- D 已完成：152/152 产品详情原始 HTML 输出产品特定 H1、完整描述、原始高质量主图、决策摘要、应用、选型、规格、支持、FAQ、询盘上下文和相关产品链接。
- 全站服务端正文审计：184 sitemap URL + 4 参数页全部通过，敏感字段发现数为 0。
- 浏览器回归：35/35；其中新增 6 项专项覆盖分类 API 单独失败、内容 API 单独失败、内容版本升级、禁用 JavaScript Hero、四语言 clean URL 和多语言正文。
- Hero 验收：16/16 重点正文页保持当前 CMS 原始背景资源，目录与详情保持现有产品 Hero；未加入缩略图、宽度或质量参数，同版本水合只增强资源而不重写标题、按钮或证明条。
- DOM 等价：16 个重点正文页与原客户端 renderer 结构等价；4 个目录页在四语言下与原线上最终 DOM 等价；详情页新增的差异仅为原始 HTML 预填询盘上下文，属于本任务要求且不改变视觉。
- 仍未修改 `.cn`、数据库、分类页、sitemap URL 集合、planned `pt`、CSS、Hero 图片、Contact 地址标签或联系方式。
