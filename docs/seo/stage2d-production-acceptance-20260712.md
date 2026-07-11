# 阶段二批次 2D 生产验收记录

验收日期：2026-07-12

目标网站：`https://www.lxenelectric.com`

范围：仅 `.com` 的全站企业与网站实体图；不涉及 `.cn`、数据库写入、分类页、planned `pt`、Hero 图片或 Contact 可见内容修改。

## 实现边界

- 新增服务端实体构建模块 `server/lib/siteEntityGraph.js`，统一生成固定 Organization、WebSite、WebPage 和 BreadcrumbList 标识。
- 静态页、产品目录和产品详情继续由各自渲染器负责页面专属数据，只引用统一实体 ID，不重复维护企业事实。
- 客户端不再注入 Organization 或 LocalBusiness；页面 Schema 仅在 API 内容版本更新时幂等更新白名单字段。
- 同版本水合不改写 JSON-LD；API 失败时保留服务端 JSON-LD；重复初始化不增加 script。
- 新增 `scripts/audit-site-entity-graph.js`，同时审计 sitemap URL、首页别名、语言目录别名和产品参数页的原始 HTML 与最终 DOM。
- 未修改任何 HTML、CSS、Hero 图片文件、Contact 地址标签、联系方式、语言配置、数据库或 `.cn` 资源。

## RED → GREEN 证据

- 初始 Node 契约测试因首页缺少受管实体图失败；实现根首页 `@graph` 后通过。
- 产品详情和产品目录契约测试先分别因缺少稳定页面 `@id` 与纯 WebSite 引用失败；接入统一 builder 后通过。
- 浏览器测试先发现语言首页水合重新注入 Organization、About 水合覆盖纯引用；移除旧注入并加版本门控后通过。
- 安全审查构造的嵌套 WebSite 样本最初未被审计器识别；改为递归实体发现后会失败。
- 同版本水合测试最初因缺少 `data-schema-version` 失败；服务端版本标记与客户端白名单更新完成后通过。
- 任意 `telephone`、`phone`、`mobile`、`faxNumber`、`tel:` 或 WhatsApp URL 现在都会使审计失败。

## 最终实体契约

- Organization：`https://www.lxenelectric.com/#organization`
- WebSite：`https://www.lxenelectric.com/#website`
- 页面：`{canonical}#webpage`
- 面包屑：`{canonical}#breadcrumb`
- Organization `name`：`Longxiang Electric`
- Organization `legalName`：`Henan Longxiang Electric Co., Ltd.`
- WebSite `publisher`：仅引用 `#organization`
- 页面 `isPartOf`：仅引用 `#website`
- About 与 Contact 的 `about`：仅引用 `#organization`
- Contact 使用 `ContactPage`，完整 LocalBusiness 定义为 0。
- Organization 地址使用已确认的总部原始文本，不生成街道、邮编、电话或 WhatsApp。

## 部署前本地门禁

- `npm run check:all`：通过；接口验收 32/32。
- `npm audit --omit=dev`：0 vulnerabilities。
- sitemap dry-run：184 URL，组成保持 28 个静态页、4 个产品目录、152 个产品详情。
- 全站实体图审计：184 个 sitemap URL，加 8 个别名/参数样本，共 192/192 raw 与 192/192 rendered 通过。
- 全站 SSR 审计：184 个 sitemap URL、4 个参数目录、16 个重点正文、4 个 clean 产品目录、152 个详情全部通过；敏感发现 0。
- 产品详情 SEO：152/152 canonical、完整 hreflang、WebPage 和 BreadcrumbList 的 raw/rendered 全部通过；Product Schema 暴露 0。
- 旧 URL：424 次有效 GET/HEAD 检查、320 个唯一旧 URL、28 个无效 404、152 个 clean target 全部通过，单跳且丢弃旧 query/fragment。
- 旧版结构化数据兼容审计：184/184；缺失、错配、解析错误、加载错误、高风险 Product 字段和 planned `pt` 均为 0。
- Playwright：42/42；覆盖四语言、桌面/移动、RTL/LTR、JavaScript 禁用、API 失败、同版本水合、版本升级、重复初始化、Hero、Contact、导航、页脚和表单。
- 两个只读审查均完成第二轮复核，最终未发现 P0、P1 或 P2。

## 生产部署

- 实现提交：`92eca5b`（`统一全站企业与网站实体图`）。
- GitHub `main` 已推送该提交。
- 部署前服务器为干净的 `main`，HEAD 为 `afb55ad`，PM2 为 `online`。
- 服务器仅执行 `git pull --ff-only origin main`，快进到 `92eca5b`；未直接编辑服务器文件。
- 按授权执行本批次唯一一次 `pm2 reload longxiang-website`，reload 后服务为 `online`。
- 未变更依赖、环境变量、Nginx、数据库、认证或权限。

## 生产验收结果

- 首页、`/index.html`、`/ar/`、`/fr/`、`/ru/`、Contact、产品目录、产品详情和健康接口均返回 200。
- 旧产品查询式 URL 返回单跳 301 到 clean URL。
- sitemap 为 184；正式语言仍为 en/ar/fr/ru；产品仍为 38，详情仍为 152。
- 客户端统一缓存版本为 `20260712-stage2d-entity-graph`，包含 `main.js`、`content-pages.js`、`education.js`、`products-list.js` 和 `product-detail.js`。
- 生产实体审计：192/192 raw、192/192 rendered；页面类型、语言、canonical、页面 `@id`、`publisher`、`isPartOf` 和 raw/rendered 完整语义差异均为 0。
- 生产审计中的 JSON-LD 解析错误、重复定义 ID、LocalBusiness、电话、国内邮箱、WhatsApp、`.cn` Schema、`100 million RMB`、planned `pt` 和 Product 高风险字段均为 0。
- `/` 与 `/index.html` 是同一 canonical 首页的两个响应，均输出相同实体图；184 个 sitemap URL 中只有域名根首页完整定义 Organization 与 WebSite。
- 生产 Playwright：42/42 通过，没有发现可见 UI、Hero、Contact、导航、页脚、表单或多语言回归。

## 固定约束确认

- `.cn` 未修改、未迁移、未配置站长平台，仅保留原有普通跳转链接。
- `.com` 未暴露国内电话、国内邮箱或 WhatsApp，也未虚构国际电话。
- Contact 地址标签和可见联系方式未修改。
- Hero 图片、图片文件、尺寸和清晰度未修改。
- 未创建分类页、分类路由、分类 Schema、分类 hreflang 或分类 sitemap URL。
- planned `pt` 未启用。
- 本批次到此停止，不自动进入下一内容阶段。
