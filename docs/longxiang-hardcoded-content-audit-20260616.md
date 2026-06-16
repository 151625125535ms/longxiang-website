# Longxiang 官网可变内容硬编码审计报告

审计时间：2026-06-16  
项目路径：`/home/ubuntu/longxiang-website`  
审计范围：活跃公网页面与前台脚本/CSS，包括根目录 `*.html`、`ar/*.html`、`js/*.js`、`css/styles.css`。未把 `backups/`、`docs/`、`node_modules/`、导入用 JSON、管理后台 UI 文案作为主要问题源。

## 0. 2026-06-16 改造进展记录

本报告的第 1-2 节保留了改造前的原始审计问题清单。当前已经完成以下迁移：

- 新增公开 `/api/content-blocks/:slug` 读取链路，并把 `home`、`solutions`、`about-us`、`contact`、`product-pages`、`global-shell`、`certifications`、`compare`、`not-found` 接入前台渲染。
- 根目录和 `ar/` 下的主要页面已经改为中性 HTML 壳，导航、页脚、首页、方案页、关于页、联系页、产品页、产品详情页、证书页、对比页和 404 页内容由数据库内容块/API 渲染。
- 全站导航、页脚、询盘入口、cookie 弹窗、第三方嵌入授权提示已进入 `global-shell`。
- 产品列表页 hero/support/CTA 和产品详情页 hero、面包屑、加载态、参数标题、FAQ 标题、未找到产品文案已进入 `product-pages`。
- 已移除活跃前台中的旧图片路径、旧 JSON fallback、主要询盘/页脚硬编码关键词；静态资源版本当前为 `20260616-shell7`。

仍需继续跟进的公开前台硬编码主要集中在 `js/products-list.js` 的产品列表交互 labels、比较条提示、空状态/failure 文案，以及少量通用 loading/empty state 文案是否需要进一步进入内容块或独立 i18n 配置。

## 1. 总结

当前官网已经有后台和 SQLite 数据模型，但前台仍存在大量“业务可变内容”直接写在页面、JS 或 CSS 中的情况。最高风险集中在：

1. `solutions.html` / `ar/solutions.html`：整页方案文案、项目案例、数字、CTA、35 处图片引用均硬编码。
2. `about.html` / `ar/about.html`：公司介绍部分字段会被 `/api/company` 覆盖，但大量图片、统计、时间线、证书卡、市场标签、CTA 仍写死。
3. `education.html`：英文页保留完整静态教育页内容；同时 `js/education.js` 又从 `/api/education` 重绘页面，形成“后台数据 + 静态旧内容”双来源。
4. `contact.html` / `ar/contact.html`：电话、邮箱、社媒、地图坐标已有接口覆盖能力，但 HTML 兜底值仍是硬编码；FAQ、表单选项和提示语也写死。
5. 全站壳层：导航、页脚、产品分类入口、证书分类顺序、SEO 默认图、CSS 背景图仍集中写在 `js/main.js` 和 `css/styles.css`。

已有后台能力：

- SQLite 有 `content_blocks` 表，当前 7 个 slug：`company-overview`、`contact`、`about-us`、`applications`、`innovation`、`education`、`page-blocks`。
- `/api/company` 会合并 `company-overview`、`contact`、`page-blocks.footer`。
- `/api/education` 会读取 `content_blocks.education`。
- 产品、产品分类、证书分别已有 API 和 DB 表：当前产品 50 条、证书 76 条、产品/证书分类 14 条。

主要差距：`about-us`、`applications`、`innovation`、`page-blocks` 等模型虽然存在，但没有形成完整公网页面渲染链路；`solutions`、`home`、`product-page-copy`、`global-shell`、`seo/page-hero` 等高频改动内容还没有清晰后台模型。

## 2. 高优先级问题清单

### P0: Solutions 页面整页硬编码

文件：

- `solutions.html:59-420`
- `ar/solutions.html:59-405`

硬编码内容：

- hero 图和标题文案：`solutions.html:59-68`
- 锚点导航：`solutions.html:73-81`
- 方案总览、目标市场、区域描述：`solutions.html:85-137`
- 5 个 solution 模块的标题、介绍、列表、CTA、图片：`solutions.html:141-349`
- 应用场景图卡：`solutions.html:351-382`
- 资质背书图卡：`solutions.html:386-413`
- 结尾 CTA：`solutions.html:417-420`

代表性图片硬编码：

- `assets/solutions/smart-energy/smart-ev-network-hero.png`
- `assets/solutions/project-services/kaifeng-xihuafu-power-distribution.png`
- `assets/solutions/project-services/epc-charging-station.jpg`
- `assets/solutions/project-services/line-operation-maintenance.jpg`
- `assets/solutions/project-services/substation-expansion.jpg`
- `assets/solutions/smart-energy/hybrid-energy-topology-a.png`
- `assets/solutions/smart-energy/hybrid-energy-topology-b.png`
- `assets/solutions/smart-energy/microgrid-topology.png`
- `assets/solutions/smart-energy/pv-grid-topology.png`
- 多个资质图片：`cert-high-tech-enterprise.png`、`cert-green-factory.png` 等

建议：

- 新增或启用 `content_blocks` 的 `solutions` slug，结构至少覆盖：hero、anchor tabs、overview cards、market fit、solution sections、scenario cards、credential strip、CTA、SEO。
- 每个图片字段改为资产路径字段，后台用 asset picker 或路径输入维护。
- 英文和阿语内容应同一条记录内维护，例如 `title/titleAr`、`summary/summaryAr`、`images[]`。

### P0: About 页面大块内容与图片硬编码

文件：

- `about.html:57-304`
- `ar/about.html:57-304`

硬编码内容：

- hero 背景图、标题、副标题、CTA：`about.html:57-68`
- 公司第三段介绍、视频 URL、视频 caption：`about.html:82-94`
- 统计数字：`about.html:96-120`
- Vision/Mission/Culture 三张背景卡：`about.html:126-148`
- 质量认证文案和 4 张证书图：`about.html:152-173`
- 发展时间线：`about.html:178-215`
- 能力卡与产品/方案图：`about.html:220-242`
- 工厂图集：`about.html:247-275`
- 市场标签与 CTA：`about.html:279-304`

备注：

- `about.html:80-81` 和 `ar/about.html:80-81` 使用 `data-company-field`，会被 `/api/company` 覆盖。
- 但其余段落和图片未接入 `content_blocks.about-us`；当前 DB 中 `about-us` block 也基本为空，未承载这些页面内容。

建议：

- 用 `content_blocks.about-us` 承载 about 页完整结构，不只承载 `aboutIntro/aboutDetail` 两个字段。
- 视频、统计、时间线、图集、证书背书、能力卡、市场标签都应变为数组字段。
- 页面首屏 fallback 可以保留，但应由构建时/服务端从同一份数据生成，而不是人工双写。

### P0: Education 英文页有完整静态旧内容，和后台数据双来源

文件：

- `education.html:58-235`
- `ar/education.html:58-66`
- `js/education.js:36-76`、`js/education.js:119-284`

硬编码内容：

- 英文页 hero 和完整正文保留在 HTML：`education.html:58-235`
- 阿语页只有空容器：`ar/education.html:66`
- `js/education.js` 会请求 `/api/education`，成功后执行 `pageRoot.innerHTML = ...` 重绘页面。
- `js/education.js:38-74` 仍硬编码教育页导航、标题、section label、按钮文案等 UI/内容混合文本。

风险：

- API 成功时英文 HTML 内容被替换，API 失败时英文页显示静态旧内容；阿语页 API 失败则几乎没有内容。
- 同一页面内容存在后台数据、英文静态 HTML、JS labels 三个来源，后续维护容易漏改。

建议：

- 保留 `/api/education` 作为唯一内容来源。
- 删除或最小化 `education.html` 中 `data-education-page` 内的完整静态正文，只保留 loading/empty state。
- `js/education.js` 中的 section label 若属于业务文案，也应进入 `content_blocks.education`；纯 UI label 可进入独立 i18n 配置。

### P1: Contact 信息已可接口覆盖，但兜底值、地图、FAQ、表单仍硬编码

文件：

- `contact.html:58-145`
- `ar/contact.html:58-143`
- `js/main.js:866-957`

硬编码内容：

- hero 图和标题：`contact.html:58-63`
- 公司名、电话、邮箱、两处地址：`contact.html:72-79`
- Instagram / YouTube 链接：`contact.html:84-87`
- Google Maps 坐标 embed：`contact.html:94`
- 表单字段、placeholder、subject options：`contact.html:109-125`
- Buyer FAQ：`contact.html:131-143`

备注：

- `data-company-field`、`data-company-phone-link`、`data-company-email-link`、`data-company-google-map-frame` 会被 `/api/company` 覆盖。
- 但 API 失败、JS 失败、首屏未加载时仍显示 HTML 中的硬编码值。

建议：

- Contact hero、FAQ、表单选项/提示语进入 `content_blocks.contact` 或新增 `contact-page` block。
- 对已有公司字段，统一从 `/api/company` 渲染；HTML 里保留中性 loading/fallback，不保留具体电话邮箱地址。
- 地图默认 URL 不应写在 HTML，应完全来自 `contact.mapLocations` 或 `googleMapsEmbedUrl`。

### P1: 首页首页首屏、信任背书、统计、CTA 硬编码

文件：

- `index.html:100-115`
- `index.html:131-202`
- `js/main.js:1339-1342`

硬编码内容：

- hero 背景图、logo、标题、副标题、按钮：`index.html:100-109`
- proof strip：`index.html:111-115`
- 信任客户/能力卡：`index.html:131-171`
- Why Choose：`index.html:175-183`
- Stats 数字：`index.html:187-193`
- CTA：`index.html:198-202`
- 首页产品分类入口图标：`js/main.js:1339-1342`

建议：

- 新增 `content_blocks.home`，承载 hero、proof strip、trust chips、feature cards、stats、CTA。
- 首页产品分类入口优先从 `/api/product-categories` 读取，分类图标作为 category 字段或 asset 关联；不要写死 `首页矢量图/*.png`。

### P1: 产品页/详情页数据动态，但页面营销说明、FAQ、表单项硬编码

文件：

- `products.html:58-113`
- `product-detail.html:58-111`
- `js/products-list.js:13-45`

硬编码内容：

- 产品列表页 hero：`products.html:58-63`
- 产品页“Built for Project Selection”说明和四个卡片：`products.html:102-113`
- 详情页 hero、Project & Export Support、FAQ、询盘表单：`product-detail.html:58-111`
- 产品分类 fallback taxonomy：`js/products-list.js:13-45`

备注：

- 产品列表和详情数据本身走 `/api/products`。
- 产品分类 API 已存在，但 fallback taxonomy 仍写在 JS 中；当 API 不可用或新分类未同步时，会出现旧分类/旧翻译。

建议：

- 产品页营销说明、FAQ、表单配置进入 `content_blocks.product-pages`。
- fallback taxonomy 可从服务端输出静态 JSON 快照，或从 DB 分类表生成，而不是手写在 `products-list.js`。

### P1: 证书页统计兜底和分类顺序硬编码

文件：

- `certifications.html:58-95`
- `ar/certifications.html:58-95`
- `js/main.js:1432-1464`

硬编码内容：

- hero 图、标题、说明：`certifications.html:58-63`
- 静态统计兜底：`certifications.html:76-80`
- 搜索 placeholder、loading 文案、Load More：`certifications.html:82-95`
- JS labels 与 categoryOrder：`js/main.js:1432-1464`

备注：

- `js/main.js` 会从 `/api/certifications` 更新统计数，所以 `455/317/89/9` 是兜底展示值。
- 当前 DB 证书为 76 条，与 HTML 兜底总数 455 明显不一致，API 失败时会显示错误规模。

建议：

- hero/intro/SEO 进入 content block。
- 统计兜底改为 `Loading...` 或由后端注入真实快照。
- 分类顺序来自证书分类表 `categories`，或在后台设置中维护。

### P1: 全站导航、页脚、询盘入口、Cookie/表单 UI 文案在 JS 中硬编码

文件：

- `js/main.js:361-425`
- `js/main.js:964-1016`
- `js/main.js:1002-1013`
- `js/main.js:1105-1118`

硬编码内容：

- 主导航及下拉菜单中英/阿语 label：`js/main.js:361-425`
- 页脚品牌文案、Quick Links、产品链接、Request Quote 表单：`js/main.js:964-1016`
- footer 产品链接按文字匹配映射 group：`js/main.js:1105-1118`

备注：

- 页脚里 `.footer-brand p` 会被 `/api/company` 的 `footerText/footerTextAr` 覆盖，但 HTML 和 JS 初始值仍写死。
- 文字匹配分类链接比较脆弱，后续改文案或翻译可能导致链接失效。

建议：

- 新增 `global-shell` 或扩展 `page-blocks`，承载导航、footer、全站 CTA、cookie UI 配置。
- 产品菜单应直接从 `/api/product-categories` 生成，不应按文案匹配分类。

### P2: CSS 中隐藏背景图硬编码

文件：

- `css/styles.css:581-585`
- `css/styles.css:3049-3056`
- `css/styles.css:6515-6518`

硬编码图片：

- About CTA：`../5、厂区厂貌/厂区2.JPG`
- `.global-map`：`../5、厂区厂貌/龙翔公司正门.jpg`
- `.education-cta`：`../assets/education/images/international-cooperation-leadership.jpeg`

风险：

- 内容维护人员通常只搜 HTML/后台字段，不容易发现 CSS 背景图。

建议：

- 内容图不要写在 CSS 中；用 HTML style 绑定后台字段，或用 CSS variable `--section-bg-image` 由 JS/模板设置。

### P2: SEO、OG 图、页面 title/description 多处硬编码

文件：

- 各页面 `<title>` 和 `<meta name="description">`
- `js/main.js:759-767`
- `js/product-detail.js:117`

硬编码内容：

- 每个 HTML 页面的 title/description。
- `js/main.js:767` 固定 OG 图片为 `5、厂区厂貌/龙翔公司正门.jpg`。
- 产品详情 title 拼接固定公司名。

建议：

- 每个 page block 加 `seo` 字段并由前台统一注入。
- OG 图应来自当前页面 hero/cover 或后台 SEO image 字段。

### P2: 静态 JSON fallback 路径存在，但当前未看到对应 JSON 文件

文件：

- `js/main.js:1121-1122`：`/api/company` fallback 到 `data/company.json`
- `js/main.js:1411`：`/api/products` fallback 到 `data/products.json`
- `js/main.js:1660`：`/api/certifications` fallback 到 `data/certifications.json`
- `js/education.js:284`：`/api/education` fallback 到 `data/education.json`

当前 `data/` 下只看到 SQLite 文件和备份，未看到上述 JSON fallback 文件。

风险：

- API 失败时 fallback 也失败，页面可能显示静态旧内容、空内容或错误状态。

建议：

- 要么移除不存在的 fallback 路径，明确显示可控错误态；要么由部署流程从 DB 生成静态 JSON 快照。

## 3. 图片硬编码清单

以下为活跃前台文件中排除 favicon 后的图片路径。阿语页多为英文页的镜像重复，也需要同步治理。

### About

- `about.html:57` `5、厂区厂貌/龙翔公司正门.jpg`
- `about.html:128` `assets/solutions/smart-energy/wind-solar-field.png`
- `about.html:135` `assets/solutions/smart-energy/industrial-park-solar-scene.png`
- `about.html:142` `assets/education/images/factory-visit-workshop.jpeg`
- `about.html:169` `assets/solutions/smart-energy/cert-high-tech-enterprise.png`
- `about.html:170` `assets/solutions/smart-energy/cert-transformer-research-center.png`
- `about.html:171` `assets/solutions/smart-energy/cert-enterprise-technology-center.png`
- `about.html:172` `assets/solutions/smart-energy/cert-green-factory.png`
- `about.html:229` `成品区/油式非晶S(B)H15.png`
- `about.html:234` `assets/solutions/smart-energy/grid-connection-cabinet.png`
- `about.html:239` `assets/solutions/smart-energy/smart-ev-network-hero.png`
- `about.html:256` `5、厂区厂貌/厂区.JPG`
- `about.html:260` `5、厂区厂貌/龙湖车间一角2.jpg`
- `about.html:264` `5、厂区厂貌/淮阳车间一角.jpg`
- `about.html:268` `厂区风采/IMG_7584.JPG`
- `about.html:272` `5、厂区厂貌/淮阳厂区正门.png`

### Education

- `education.html:58` `assets/education/images/longxiang-electrical-college-hero.png`
- `education.html:87` `assets/education/images/longxiang-electrical-college-building.jpeg`
- `education.html:101` `assets/education/images/student-group-photo.jpeg`
- `education.html:106` `assets/education/images/smart-grid-training-classroom.jpeg`
- `education.html:111` `assets/education/images/electrical-training-panel.jpeg`
- `education.html:116` `assets/education/images/international-cooperation-leadership.jpeg`
- `education.html:133` `assets/education/images/classroom-project-discussion.jpeg`
- `education.html:147` `assets/education/images/field-practical-training.jpeg`
- `education.html:161` `assets/education/images/switchgear-training-corridor.jpeg`
- `education.html:184` `assets/education/images/international-cooperation-leadership.jpeg`
- `education.html:185` `assets/education/images/student-group-photo.jpeg`
- `education.html:186` `assets/education/images/smart-grid-training-classroom.jpeg`
- `education.html:187` `assets/education/images/pole-climbing-training.jpeg`
- `education.html:188` `assets/education/images/training-equipment-workshop.jpeg`
- `education.html:189` `assets/education/images/factory-visit-workshop.jpeg`
- `education.html:202` `assets/education/images/vocational-education-demo-plaque.jpeg`
- `education.html:206` `assets/education/images/industry-education-integration-plaque.jpeg`
- `education.html:210` `assets/education/images/teaching-production-training-base-plaque.jpeg`

### Solutions

- `solutions.html:59` `assets/solutions/smart-energy/smart-ev-network-hero.png`
- `solutions.html:157` `assets/solutions/project-services/kaifeng-xihuafu-power-distribution.png`
- `solutions.html:158` `assets/solutions/smart-energy/grid-connection-cabinet.png`
- `solutions.html:159` `assets/solutions/smart-energy/dry-type-transformer.png`
- `solutions.html:173` `assets/solutions/project-services/kaifeng-xihuafu-power-distribution.png`
- `solutions.html:178` `assets/solutions/project-services/epc-charging-station.jpg`
- `solutions.html:202` `assets/solutions/project-services/line-operation-maintenance.jpg`
- `solutions.html:203` `assets/solutions/project-services/substation-expansion.jpg`
- `solutions.html:234` `assets/solutions/project-services/line-operation-maintenance.jpg`
- `solutions.html:239` `assets/solutions/project-services/substation-expansion.jpg`
- `solutions.html:263` `assets/solutions/smart-energy/hybrid-energy-topology-b.png`
- `solutions.html:265` `assets/solutions/smart-energy/containerized-energy-storage.png`
- `solutions.html:266` `assets/solutions/smart-energy/dual-ev-charging-cabinet.png`
- `solutions.html:267` `assets/solutions/smart-energy/mobile-monitoring-dashboard.png`
- `solutions.html:282` `assets/solutions/smart-energy/hybrid-energy-topology-a.png`
- `solutions.html:287` `assets/solutions/smart-energy/single-line-diagram-a.png`
- `solutions.html:311` `assets/solutions/smart-energy/microgrid-topology.png`
- `solutions.html:313` `assets/solutions/smart-energy/grid-connection-cabinet.png`
- `solutions.html:314` `assets/solutions/smart-energy/dry-type-transformer.png`
- `solutions.html:337` `assets/solutions/smart-energy/industrial-park-solar-scene.png`
- `solutions.html:338` `assets/solutions/smart-energy/pv-grid-topology.png`
- `solutions.html:359` `assets/solutions/smart-energy/campus-solar-scene.png`
- `solutions.html:363` `assets/solutions/smart-energy/public-building-solar-scene.png`
- `solutions.html:367` `assets/solutions/smart-energy/commercial-complex-solar-scene.png`
- `solutions.html:371` `assets/solutions/smart-energy/industrial-park-solar-scene.png`
- `solutions.html:375` `assets/solutions/project-services/line-operation-maintenance.jpg`
- `solutions.html:379` `assets/solutions/project-services/substation-expansion.jpg`
- `solutions.html:394` `assets/solutions/smart-energy/cert-high-tech-enterprise.png`
- `solutions.html:398` `assets/solutions/smart-energy/cert-green-factory.png`
- `solutions.html:402` `assets/solutions/smart-energy/cert-enterprise-technology-center.png`
- `solutions.html:406` `assets/solutions/smart-energy/cert-charging-station-research-center.png`
- `solutions.html:410` `assets/solutions/smart-energy/cert-transformer-research-center.png`

### Other Public Pages

- `index.html:100` `5、厂区厂貌/龙翔公司正门.jpg`
- `index.html:103` `longxiang-logo-symbol.png`
- `products.html:58` `assets/hero/product.webp`
- `product-detail.html:58` `assets/hero/product.webp`
- `contact.html:58` `assets/hero/contact.jpg`
- `certifications.html:58` `5、厂区厂貌/厂区1.JPG`
- `compare.html:58` `成品区/非晶立体卷.png`
- `js/main.js:767` `5、厂区厂貌/龙翔公司正门.jpg`
- `js/main.js:1340` `首页矢量图/变压器.png`
- `js/main.js:1341` `首页矢量图/充电桩.png`
- `js/main.js:1342` `首页矢量图/成套电气.png`
- `css/styles.css:585` `../5、厂区厂貌/厂区2.JPG`
- `css/styles.css:3056` `../5、厂区厂貌/龙翔公司正门.jpg`
- `css/styles.css:6518` `../assets/education/images/international-cooperation-leadership.jpeg`

### Arabic Mirror Pages

阿语页面中对应硬编码主要位于：

- `ar/about.html:57-272`
- `ar/solutions.html:59-395`
- `ar/contact.html:58-94`
- `ar/education.html:58`
- `ar/products.html:58`
- `ar/product-detail.html:58`
- `ar/certifications.html:58`
- `ar/compare.html:58`
- `ar/index.html:100-103`

治理时不要只改英文页；应以同一内容模型渲染英文和阿语。

## 4. 静态文本风险分布

按活跃 HTML 中可见文本节点粗略统计，最多的页面是：

- `solutions.html`：166 个文本节点
- `ar/solutions.html`：156 个文本节点
- `about.html`：134 个文本节点
- `ar/about.html`：134 个文本节点
- `education.html`：103 个文本节点
- `contact.html`：92 个文本节点
- `index.html`：84 个文本节点
- `product-detail.html`：80 个文本节点
- `products.html`：67 个文本节点
- `certifications.html`：60 个文本节点

这些统计包含导航/页脚等通用文本，但仍能说明：当前主要业务内容不是由后台统一驱动。

## 5. 建议改造顺序

1. 先做内容模型清理，不急着逐个页面改图。
   - 新增/完善 `content_blocks.home`、`content_blocks.solutions`、`content_blocks.product-pages`、`content_blocks.global-shell`。
   - 扩充 `about-us`，让它承载 about 页完整内容。
   - 保留 `education`，但去掉英文静态双写。

2. 把图片全部改成后台字段。
   - 页面 hero 图、图集、证书背书图、方案拓扑图、CTA 背景图都用 asset path 字段。
   - CSS 背景图改为 HTML/JS 设置 CSS variable 或 inline style。

3. 统一全站壳层。
   - 导航、footer、全站 CTA、询盘表单默认文案、社媒入口从 `global-shell` 或 `page-blocks` 渲染。
   - 产品分类导航从 `/api/product-categories` 读取。

4. 统一 SEO。
   - 每个内容 block 有 `seo.title`、`seo.description`、`seo.image`。
   - `og:image` 不再固定为公司大门图。

5. 修复 fallback 策略。
   - 若要静态 fallback，就由 DB 自动生成 `data/*.json`。
   - 若不要 fallback，前台显示明确 loading/error，不展示过期静态内容。

## 6. 验收标准

改造完成后建议用以下标准验收：

- 搜索活跃前台文件，不应再出现业务图片路径直接写在 HTML/JS/CSS 中，logo/favicon 这类品牌静态资产除外。
- 修改后台 `content_blocks` 中 hero 图、标题、CTA、footer、联系方式后，英文和阿语页面都能同步变化。
- 断开 `/api/education` 或 `/api/company` 时，页面不会展示过期业务内容或错误统计，只显示受控 fallback/error。
- 产品分类新增/改名后，首页分类入口、产品页侧栏、footer 产品入口都不需要改 JS。
- 证书实际数量与页面统计一致；API 失败时不显示过期的 `455/317/89/9`。
