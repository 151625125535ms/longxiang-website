# 阶段二：`.com` 技术 SEO 只读审计

审计日期：2026-07-11
审计网站：`https://www.lxenelectric.com/`
执行性质：只读审计；本报告不修改运行时代码、路由、数据库、页面内容、sitemap 或站长平台配置

## 1. 最新执行边界

- 所有检查和后续建议只针对 `lxenelectric.com`。
- `.cn` 不属于审计、迁移、重定向或改造范围。
- 本阶段不创建、开发或上线独立产品分类 SEO 页面。
- `/products.html` 继续作为唯一可索引产品目录。
- `?group=`、`?sub=`、`?search=`、`?page=` 继续用于筛选，并保持 `noindex,follow`。
- 不新增分类 URL、分类 Schema、分类 hreflang、分类 sitemap URL 或分类 SEO 数据库字段。
- 不修改 Hero 图片或布局，不修改 Contact 页地址标签，不公开国内电话或国内邮箱。

## 2. 审计方法与证据范围

本次以生产网站真实响应为权威证据，完成了：

1. 抓取生产 sitemap 中全部 184 个 URL 的原始 HTML；
2. 检查 184 个 URL 的状态码、Title、Description、H1、canonical、hreflang、正文、导航、内部链接、JSON-LD 和 planned locale 暴露；
3. 使用真实浏览器检查全部 184 个 sitemap URL 的渲染后 Schema；
4. 对 152 个产品详情页同时检查原始 HTML 和渲染后结果；
5. 浏览器抽查 32 个静态页面、四语言参数筛选页、旧查询式产品 URL、尾斜杠产品 URL和产品别名 URL；
6. 检查 97 个关键渲染后站内链接的真实 HTTP 状态；
7. 检查 HTTP、非 www、大小写、尾斜杠、`/index.html`、旧 `product-detail.html?id=...` 和产品 alias 变体；
8. 读取生产 `/api/company` 与 `/api/products`，核对企业信息边界、产品别名和多语言内容质量。

临时抓取 JSON 和临时工具仅保存在本机系统临时目录，不进入 Git。

## 3. 执行摘要

### 3.1 已经正确工作的能力

| 检查项 | 生产结果 |
|---|---:|
| sitemap URL | 184 |
| sitemap URL 返回 200 | 184/184 |
| 原始 HTML 有 Title | 184/184 |
| 原始 HTML 有 Description | 184/184 |
| 原始 HTML 恰好一个 H1 | 184/184 |
| 重复 Title 组 | 0 |
| 重复 Description 组 | 0 |
| 产品详情原始 canonical | 152/152 |
| 产品详情原始完整 hreflang | 152/152 |
| 产品详情原始 WebPage | 152/152 |
| 产品详情原始 BreadcrumbList | 152/152 |
| Product 高风险字段暴露 | 0 |
| 渲染后 Schema 缺失 | 0 |
| 渲染后 Schema URL/语言不匹配 | 0 |
| JSON-LD 解析错误 | 0 |
| sitemap 中 pt URL | 0 |
| pt Schema 暴露 | 0 |
| 关键渲染后内部链接返回 200 | 97/97 |
| sitemap 中独立分类 URL | 0 |

HTTP、非 www 均正确 301 到 `https://www.lxenelectric.com/`。不存在的大小写和静态页尾斜杠变体返回真实 404，并带 `noindex`。

### 3.2 主要结论

站点当前不是“无法抓取”，而是存在明显的两层状态：

- 原始 HTML 的 Title、Description 和产品详情 head 信号已经较完整；
- 主要正文、真实导航、核心内链以及大部分静态页 Schema 仍依赖 JavaScript。

32 个静态 sitemap 页的原始正文平均约 21.6 词、原始内部链接平均约 1.4 个；浏览器渲染后主内容平均约 530.2 词、内部链接平均约 17.3 个。
152 个产品详情页的原始 H1 仍是每种语言统一的 “Product Details” 占位文案，原始正文平均约 26.5 词，原始内部链接均为 1 个。

因此，阶段二最优先事项应是复用后台和 content_blocks，将现有真实内容服务端输出，而不是继续增加新页面或分类页。

## 4. Critical：原始 HTML 抓取与索引信号

### C1. 28 个静态 sitemap 页的原始 canonical/hreflang 不完整

**受影响范围**

| 语言 | 受影响模板 | 原始 canonical | 原始 hreflang |
|---|---|---|---|
| 英语 | 首页、About、Solutions、Education、Certifications、Compare、Contact | 首页存在；其余 6 页缺失 | 7 页全部缺失 |
| 阿语 | 首页及上述 6 个内容页 | 7 页全部缺失 | 7 页全部缺失 |
| 法语 | 首页及上述 6 个内容页 | 7 页存在 | 只有 en/ar/fr/x-default，缺 ru |
| 俄语 | 首页及上述 6 个内容页 | 7 页存在 | 7 页全部缺失 |

`products.html` 的四种语言不受此问题影响，均有一个 canonical 和完整 en/ar/fr/ru/x-default。

**当前证据**

- 原始 HTML 缺 canonical：13 页；
- 原始 HTML hreflang 不完整：28 页；
- JavaScript 渲染后，上述页面 canonical/hreflang 才变为完整；
- sitemap 自身的语言组完整，但不能替代页面原始 head 中的互返标签。

**原因**

四套静态页面壳的 head 标签历史状态不一致，公共 JavaScript 在浏览器端补齐 SEO link 标签。

**推荐修改**

建立统一的服务端静态页 SEO 输出模块，从 `config/locales.json` 和统一页面模型生成 canonical/hreflang；禁止四语言页面继续各自维护不一致的硬编码组合。

**UI 影响**

无预期视觉变化，只改变原始响应 head。

**风险**

会影响英、阿、法、俄现有 canonical/hreflang，属于多语言 SEO 高风险修改，必须小批量上线。

**回滚**

回滚对应服务端 SEO 渲染提交，恢复现有静态文件响应。

**验证**

- 逐模板检查原始响应；
- 验证每组 en/ar/fr/ru/x-default 互返；
- 运行 `verify-seo-i18n.js`、sitemap dry-run 和浏览器回归；
- 生产抽查四语言首页及内容页。

### C2. 主要正文、导航和核心内链仍依赖 JavaScript

**受影响范围**

- 全部 32 个静态 sitemap 页面；
- 全部 152 个产品详情页面。

**当前证据**

| 页面范围 | 原始正文 | 原始内部链接 | 渲染后表现 |
|---|---:|---:|---|
| 32 个静态页 | 平均 21.6 词，最少 11 词 | 平均 1.4 个 | 主内容平均 530.2 词，内部链接平均 17.3 个 |
| 152 个产品页 | 平均 26.5 词 | 每页 1 个 | 抽样产品主内容约 586–683 词，内部链接约 20–21 个 |

产品页原始 H1 分别固定为：

- 英语：`Product Details`，38 页；
- 阿语：`تفاصيل المنتج`，38 页；
- 法语：`Détails du produit`，38 页；
- 俄语：`Информация о продукте`，38 页。

产品特定 Title、Description、canonical、hreflang、WebPage 和 BreadcrumbList 已经由服务器输出，但产品特定 H1、规格、正文、产品图片和相关链接仍等待 JavaScript/API。

**原因**

静态页面壳只保留占位节点，公共导航、content_blocks 和产品正文主要由客户端请求 API 后注入。

**推荐修改**

按模板分批建立服务端 HTML 输出，复用现有数据库、content_blocks、统一企业主数据和现有前端渲染规则：

1. 第一批只处理公共导航、页脚和静态页面 head；
2. 第二批处理首页、About、Solutions、Contact 的已发布正文；
3. 第三批处理 `products.html` 首屏目录和产品详情的 H1、正文、规格及相关链接。

不得新增第二套硬编码 SEO 正文。客户端增强必须在服务端内容基础上幂等运行，不能重复插入。

**UI 影响**

目标是浏览器最终视觉和交互不变；HTML 首次响应内容会增加。

**风险**

可能造成服务端/客户端重复内容、闪动、语言回退错误或英/阿基线变化。必须按模板独立提交、独立验收。

**回滚**

每个模板的服务端渲染能力使用独立提交；回滚单一模板，不回滚整个多语言体系。

**验证**

- 原始 HTML 中检查真实 H1、正文、导航和链接；
- 比较服务端内容与浏览器最终 DOM；
- 四语言桌面/移动 Playwright；
- 检查无重复 H1、无重复正文、无布局变化；
- 真实生产页面抽查。

### C3. 旧查询式产品详情 URL 仍是 200，并依赖 JavaScript 才规范化

**受影响范围**

`product-detail.html?id={product-id}` 的四语言模板。按当前 38 个产品验证，共 152 个 URL 变体。

**当前证据**

- 152/152 返回 200；
- 152/152 原始 HTML 没有 canonical；
- 152/152 原始 HTML没有 noindex；
- 原始 Title/H1 是通用产品详情占位内容；
- 执行 JavaScript 后，抽样 URL 才切换为对应清洁产品 URL canonical 和真实产品正文。

示例：

`https://www.lxenelectric.com/product-detail.html?id=anti-short-amorphous`

- 原始响应：200、无 canonical；
- 渲染后 canonical：`https://www.lxenelectric.com/products/anti-short-amorphous`。

**原因**

旧静态模板仍可由 `express.static` 直接访问，产品 ID 解析和 canonical 更新发生在客户端。

**推荐修改**

为四语言旧查询式 URL 建立服务端 301：

1. 使用现有产品读取能力解析 ID、slug 和经过确认的 alias；
2. 只有唯一目标才重定向；
3. 无产品或映射冲突时返回 404，不跳首页；
4. 保留 query 中与产品识别无关的参数需要单独评估，不盲目透传。

**UI 影响**

旧链接访问者会直接进入清洁产品 URL，最终产品页面视觉不变。

**风险**

alias 数据中存在冲突，不能把所有 alias 机械重定向。

**回滚**

删除旧 URL 301 路由，恢复静态文件处理。

**验证**

- 38 个当前产品 × 4 种语言逐一验证 301 目标；
- alias 白名单逐条验证；
- 无效 ID 返回 404；
- 清洁产品 URL 保持 200、自 canonical、完整 hreflang。

## 5. Important：结构化数据、内容质量与规范化

### I1. 25 个静态 sitemap 页的原始 HTML 没有任何 JSON-LD

**受影响范围**

除四语言 `products.html`、三个已硬编码 Organization 的首页和 152 个产品页外，其余 25 个静态 sitemap 页面。

**当前证据**

原始 Schema 类型统计：

| 类型 | 原始 HTML 页面数 |
|---|---:|
| WebPage | 152 |
| BreadcrumbList | 152 |
| CollectionPage | 4 |
| Organization | 3 |
| 无 JSON-LD | 25 |

浏览器渲染后 184 页的所需 Schema 均存在且无 URL/语言错误，说明客户端逻辑有效，但大部分静态页面仍需要搜索引擎执行 JavaScript。

**推荐修改**

与 C1/C2 共用服务端 SEO 模块输出 WebPage/子类型和 BreadcrumbList，不单独在各 HTML 文件重复硬编码。

**UI 影响**

无。

**风险、回滚、验证**

与 C1 相同；另外运行结构化数据全站审计，确保 JSON-LD 可解析且 URL 与 canonical 一致。

### I2. Organization 重复，且 WebSite 节点缺失

**当前证据**

- 渲染后 Schema 总计出现 7 个 Organization，但只有 4 个正式语言首页；
- 英语、法语、俄语首页各出现两个 Organization，阿语首页出现一个；
- 184 页渲染后类型统计中没有 WebSite；
- 当前原始 Organization 没有稳定的 `@id` 图谱引用。

**原因**

英语、法语、俄语首页已有静态 Organization，公共 JavaScript 又注入一份；阿语只有客户端注入。

**推荐修改**

统一由服务器输出一个 `@graph` 或可复用实体图：

- `https://www.lxenelectric.com/#organization`；
- `https://www.lxenelectric.com/#website`；
- WebSite publisher 引用 Organization；
- 页面 WebPage/子类型引用 WebSite；
- 只输出当前国际邮箱，不输出国内电话、国内邮箱或未建立的 WhatsApp。

客户端检测到服务端实体后不得重复注入。

**UI 影响**

无。

**风险**

结构化数据重复清理需要同时覆盖四语言首页和 Contact Schema。

**回滚**

回滚 Schema 统一提交，恢复现有客户端注入。

**验证**

全站 Schema 审计、Schema.org/Rich Results 解析、四语言原始响应抽查。

### I3. 产品 Title 和 Description 需要内容修复

生产原始 meta 统计：

| 语言 | 产品数 | Title 超过 60 字符 | Description 以省略号结尾 | Description 超过 160 字符 |
|---|---:|---:|---:|---:|
| 英语 | 38 | 12 | 35 | 0 |
| 阿语 | 38 | 36 | 35 | 23 |
| 法语 | 38 | 26 | 2 | 4 |
| 俄语 | 38 | 34 | 34 | 17 |

Title 和 Description 均存在且没有重复，但大量 Description 是程序截断结果，不是完整营销摘要。

**推荐修改**

后续只先处理 10 个经业务价值和 GSC 数据确认的重点产品；修改前提交候选产品、关键词、搜索意图、当前问题和影响语言，等待确认。

**UI 影响**

Title/Description 不改变页面布局；若同步重写正文，会改变可见文字，需要另行确认。

**风险**

不能仅为字符数机械截断，不能改变型号、参数和产品事实。

**回滚**

使用产品字段安全补丁或后台版本记录恢复原字段。

**验证**

原始 HTML、浏览器 Title/Description、四语言产品事实一致性和 GSC 后续 CTR。

### I4. 阿语产品短描述存在明显英语混入

自动筛查发现 35/38 个阿语短描述含拉丁字母片段。该数字包含型号、IEC、kV、kVA 等合理保留项，不能把 35 条全部直接判定为翻译错误；但人工抽样已确认存在句子级英语，例如：

- `Grid with high fault current`；
- `Eco-friendly distribution`；
- `Commercial & industrial distribution`；
- `Noise-sensitive installations`；
- `three-phase five-wire`。

**推荐修改**

先对 10 个重点产品做电气行业阿语审核，保留国际型号和单位，仅翻译自然语言场景和说明。

**UI 影响**

会改变阿语产品可见文案，必须先提交候选和对照稿。

**风险**

机械删除拉丁字符会破坏型号、标准和单位。

**回滚**

按产品字段版本恢复。

**验证**

母语审核、数字/单位/型号对照和阿语页面浏览器验收。

### I5. 产品 alias 中有两条冲突，301 必须使用白名单

**当前证据**

- 9 个产品保存了 alias；
- alias 记录共 30 条；
- 30 条 alias URL 均返回 200；
- 28 条原始 canonical 指向预期产品；
- 2 条与现有正式产品 slug 冲突：
  - `3phase-3limb` 被列为 `amorphous-scbh-dry` 的 alias，但它本身也是正式产品 slug；
  - `3phase-5limb` 同样既是 alias 又是正式产品 slug。

这两个 URL 当前正确承接各自正式产品，不能重定向到 `amorphous-scbh-dry`。

**推荐修改**

- 先修正 alias 数据冲突；
- URL 规范化只使用经过测试的 28 条唯一映射；
- alias 数据修正属于生产数据写入，需另行确认、备份和 dry-run；
- 在数据修正前，301 路由必须明确排除这两个冲突 slug。

**UI 影响**

无直接视觉影响。

**风险**

错误301会把两个真实产品页面合并到错误目标，造成排名和业务信息损失。

**回滚**

回滚路由并恢复 alias 数据备份。

**验证**

alias 全量映射测试、目标产品事实核对、状态码与 canonical 检查。

### I6. Compare 空状态页内容过薄但仍在 sitemap

四语言 `compare.html` 均返回 200 并进入 sitemap。浏览器渲染后的主内容只有约 11–17 词，H1 仍是 “Loading comparison” 类空状态；没有选择产品时缺少独立搜索价值。

**推荐修改**

后续二选一，需用户确认：

1. 保留索引：补充真实的产品比较说明和选择入口；
2. 不作为搜索落地页：从 sitemap 移除并输出 `noindex,follow`。

本轮不执行 noindex 或 sitemap 切换。

**UI 影响**

方案1会增加可见内容；方案2无明显视觉变化。

**风险**

属于索引策略变更，需单独验证 canonical、hreflang 和 sitemap 数量。

**回滚**

恢复原 sitemap 和 robots meta。

**验证**

原始 HTML、状态码、robots、sitemap 和四语言页面。

### I7. 企业公开数据仍有未统一的旧注册资本字段

生产 `/api/company` 同时返回：

- `registeredCapital: RMB 69.552 million`；
- `registeredCapitalAr: 100 مليون يوان صيني`；
- `stats[registered-capital].value: 100 million RMB`。

真实首页和 About 页面当前没有显示 “100 million RMB” 或对应阿语文案，因此现有 UI 未受影响；但未来服务端输出正文时可能把旧字段重新暴露。

**推荐修改**

在实施服务端正文前，先把统一企业主数据和遗留 stats 字段纳入数据一致性审计。任何生产数据修改需单独备份和确认。

**UI 影响**

本轮无；未来若使用该字段会影响企业信息展示。

**风险**

错误企业数据会降低可信度，并导致页面与 Schema 不一致。

**回滚**

恢复数据库备份或字段安全补丁。

**验证**

`/api/company`、首页、About 和 Organization Schema 交叉核对。

## 6. Improvement：可延后处理的 URL 规范化

### P1. `/index.html` 当前为 200，不是 301

- `/index.html` 返回 200；
- canonical 正确指向根目录 `/`；
- 8 个英文静态页面的渲染后内部链接仍包含 `/index.html`。

建议先把英文站内首页链接统一到 `/`，再将 `/index.html` 301 到 `/`。由于当前 canonical 正确，这项排在 C1–C3 之后。

### P2. 产品详情尾斜杠变体返回 200

对全部 152 个四语言产品 URL 增加尾斜杠后：

- 152/152 返回 200；
- 152/152 原始 canonical 正确指向无尾斜杠清洁 URL。

当前 canonical 已能合并信号，后续可使用 301/308 统一尾斜杠，但优先级低于旧查询式 URL。

## 7. 参数页和“不上线分类页”约束验收

### 7.1 参数页

四语言 `products.html?group=transformer&sub=dry-type` 实测：

- 状态码 200；
- `robots=noindex,follow`；
- canonical 指向对应语言的无参数 `products.html`；
- hreflang 包含 en/ar/fr/ru/x-default；
- alternate 不带筛选参数；
- 页面筛选体验正常。

### 7.2 分类页

- sitemap 中分类 URL 数：0；
- `/products/transformers`：404；
- `/products/switchgear`：404；
- `/products/new-energy-equipment`：404；
- 本次没有创建分类路由、页面、Schema、hreflang 或数据库字段。

因此最新“不上线分类页”约束当前得到满足。

## 8. 其他通过项

- `robots.txt` 允许公开站点抓取，禁止 `/admin/`、`/api/admin/` 和 `/api/auth/`，并声明权威 sitemap；
- sitemap 没有参数 URL、planned locale 或分类 URL；
- 184 个 sitemap URL 没有 3xx、4xx 或 5xx；
- 97 个关键渲染后内部链接全部返回 200；
- Product Schema 未暴露价格、库存、评价或 AggregateRating；
- 生产公开企业 API只提供国际邮箱 `henanlxgj@163.com`，未发现国内电话或国内邮箱进入运行时页面源；
- Contact 页现有地址标签和 Hero 资源在本轮没有任何修改；
- GA4 ID 仍为空，不加载占位 ID，不阻塞本轮技术 SEO 审计。

## 9. 推荐的最小实施批次

本报告完成后应暂停，等待用户确认。推荐后续不要一次性执行全部阶段二，而是按以下顺序：

### 批次 2A：统一静态页原始 head

范围：

- 只建立服务端 canonical/hreflang 和基础 Schema 输出；
- 覆盖四语言首页、About、Solutions、Education、Certifications、Compare、Contact；
- 不改变正文、布局、Hero、Contact 标签或联系方式。

理由：

这是当前最明确、UI 影响最小、可独立验证的 Critical 问题。

### 批次 2B：旧查询式产品 URL 301

范围：

- 只处理 `product-detail.html?id=...`；
- 使用现有产品数据解析唯一目标；
- alias 采用白名单，明确排除两个冲突 slug；
- 无目标返回404。

理由：

它可停止旧 URL 继续以 200 被抓取，并消除 canonical 对 JavaScript 的依赖。

### 批次 2C：服务端公共导航和静态正文

范围：

- 先公共导航/页脚；
- 再首页、About、Solutions、Contact；
- 最后 products 和产品详情；
- 每类模板独立提交。

理由：

业务价值最高，但影响范围也最大，必须在 2A 稳定后分批实施。

### 批次 2D：Organization/WebSite 实体图

范围：

- 移除重复 Organization；
- 增加稳定 `@id`；
- 增加 WebSite 与 publisher 引用；
- 不输出国内联系方式。

该批次可以与 2A 同设计，但建议独立提交和验证。

## 10. 页面、语言和 UI 影响预判

| 后续批次 | 影响语言 | 影响页面 | UI 预期 |
|---|---|---|---|
| 2A 原始 head | en/ar/fr/ru | 28 个静态页 | 无视觉变化 |
| 2B 旧 URL 301 | en/ar/fr/ru | 旧查询式产品 URL | URL 改变，最终产品页视觉不变 |
| 2C 服务端正文 | en/ar/fr/ru | 全部静态页及产品详情 | 目标是不变，但有重复渲染/闪动风险 |
| 2D Schema | en/ar/fr/ru | 首页、Contact、内容页 | 无视觉变化 |
| 重点产品文案 | 按确认清单 | 10 个产品及语言版本 | 可见文字会变化，需另行确认 |

## 11. 下一步确认点

在用户确认前，不执行：

- 服务端渲染；
- 301；
- 数据库或 alias 写入；
- 产品正式文案修改；
- sitemap、hreflang 或 noindex 重大切换；
- 独立产品分类页；
- Hero 图片或布局修改；
- Contact 地址标签或联系方式修改。

建议下一步先确认是否执行“批次 2A：统一静态页原始 head”。实施前还需输出具体文件范围、测试清单和回滚提交边界。

## 12. 批次 2A 实施记录（2026-07-11）

批次 2A 已按确认范围完成本地实现和回归验证：服务端仅为 en/ar/fr/ru 的首页、About、Solutions、Education、Certifications、Compare、Contact 共 28 个正式 URL 重写受管控的 `<head>` 标签，不修改页面 `<body>`。

验证结果：

- 原始 HTML canonical：28/28 正确，且每页仅 1 个；
- 原始 HTML hreflang：28/28 完整，每页均为 en/ar/fr/ru/x-default 共 5 个；
- 原始 HTML 必需页面 Schema：28/28 正确；
- 全站结构化数据审计：184/184 URL 通过，无缺失、类型错误、JSON 解析错误或 planned `pt` 暴露；
- 产品详情回归：152/152 原始 canonical、hreflang、WebPage、BreadcrumbList 和渲染结果通过；
- sitemap 保持 184 个 URL，未增加分类页或 planned locale；
- 浏览器回归：18/18 通过，包括参数 URL、四语种页脚、Contact 地址标签及仅国际邮箱约束；
- 没有修改 Hero 图片、Hero 布局、页面正文、CSS、Contact 地址标签或联系方式；
- 没有创建分类路由、分类模板、分类 Schema、分类 hreflang、分类 sitemap URL 或数据库字段；
- 输出中没有 `.cn` SEO alternate、国内电话、国内邮箱、虚构国际电话或 WhatsApp。

本批次新增独立的静态页 SEO 头部渲染模块，并在 `express.static` 之前只挂载上述 28 个精确路由；`/index.html`、`/products.html`、产品详情、参数 URL 与任何分类路径均不在该路由集合中。

生产部署后复验结果与本地一致：28/28 原始 HTML 通过，184/184 sitemap URL 的浏览器结构化数据审计通过，四种正式语言首页和 Contact 真实浏览器验收通过；PM2 完成一次必要重启后保持 `online`。

## 13. 批次 2B 本地实施记录（2026-07-11）

批次 2B 仅为四种正式语言的精确旧路径 `product-detail.html?id=...` 增加服务端 301/404 处理。解析顺序固定为正式 `legacy_id`、正式 `slug`、28 条代码白名单 alias；未列入白名单或不能唯一解析的标识返回本语言 404。

修改前以生产公开 `/api/products` 和本地只读数据库交叉盘点，结果完全一致：

- 已发布产品：38；
- alias 记录：30；
- 安全 alias：28；
- 冲突 alias：`3phase-3limb`、`3phase-5limb`；
- 两个冲突标识均按正式产品优先，目标为各自清洁产品 URL，不指向 `amorphous-scbh-dry`。

本地验证结果：

- legacy ID 重定向：152/152；
- 正式 slug 重定向：152/152；
- 批准 alias 重定向：112/112；
- 正式标识优先于冲突 alias：8/8；
- 有效重定向矩阵检查：424 次，对应 320 个唯一旧 URL；
- 缺失、空、重复、数组、未知、前置空格和异常编码 404：28/28；
- 清洁目标无重定向链：152/152；
- GET/HEAD 状态与 Location 一致；
- 所有目标 Location 均无 query 和 fragment；
- 接口验收：32/32；
- 清洁产品页原始与渲染 SEO：152/152，失败 0；
- sitemap：184，未增加分类页或 planned locale；
- 全站 Schema：184/184，无缺失、错配、解析错误、加载错误或高风险 Product 字段；
- 浏览器回归：18/18。

本批次没有修改 `.cn`、数据库、alias 数据、清洁产品页行为、产品列表/筛选策略、分类页、sitemap URL 集合、canonical、hreflang、Schema、正文、CSS、Hero、Contact 或联系方式。

生产部署后使用生产公开 `/api/products` 和真实 HTTP/浏览器再次完整验收，结果与本地一致：424 次有效重定向检查覆盖 320 个唯一旧 URL，28 个无效场景均返回本语言 404，152 个清洁目标均为 200 且无第二跳；清洁产品页 SEO 152/152、全站 Schema 184/184、四语言代表性旧链接最终页面及 Contact 约束全部通过。PM2 只执行一次必要重启并保持 `online`。

需要持续注意：301 可能被客户端和搜索引擎长期缓存；即使以后通过 Git 回滚路由，已缓存的永久重定向也不保证立即失效。任何白名单目标调整都必须重新完成生产 alias→目标映射盘点。

## 2026-07-11 批次 2C 本地实施结果

2C 已按共享数据源、共享纯展示模块和薄服务端 adapter 的结构完成，未在 40 个物理 HTML 壳中复制正文、导航或页脚：

- 公共壳：184/184 sitemap URL 原始 HTML 具备非空主导航、完整页脚、footer-bottom、国际邮箱、Social Media、中国官网普通跳转链接、Cookie Settings 和页脚询盘表单。
- 重点正文：16/16 首页、About、Solutions、Contact 原始 HTML 具备唯一 H1、已发布正文、关键 H2/H3、CTA 和内部链接。
- 产品目录：4/4 clean 目录具备 taxonomy 和最多 9 张首屏产品卡；4 个代表性参数页继续为 200、`noindex,follow`，canonical/hreflang 均不带 query。
- 产品详情：152/152 原始 HTML 具备产品特定 H1、描述、原始 `image` 主图、960×720 尺寸、`fetchpriority=high`、规格、应用、选型、支持、FAQ、询盘上下文和相关清洁链接。
- 结构化数据：184/184 无缺失、错配、JSON-LD 解析错误或加载错误；Product Schema 和价格、库存、Offer、Review、AggregateRating 高风险字段暴露均为 0。
- URL 回归：320 个唯一旧产品 URL 的 424 次有效 GET/HEAD 检查全部单跳 301；28 个无效场景保持 404；152 个清洁目标无第二跳。
- sitemap 与语言：仍为 184；仅 en/ar/fr/ru；planned `pt`、分类 URL、分类 Schema、分类 hreflang 和分类 sitemap URL 均为 0。
- 浏览器回归：35/35；覆盖公共壳、重点正文、目录和详情的同版本节点保留、分类/内容 API 单独失败、内容版本升级、禁用 JavaScript、四语言 clean URL、阿语 RTL、法语/俄语共享模块路径、筛选和询盘。
- 敏感信息：184 sitemap URL 与 4 参数页原始 HTML 中，国内电话、国内邮箱、WhatsApp、遗留注册资本暴露均为 0；`.cn` 只作为允许的普通中国官网链接。

本批没有修改 CSS、Hero 图片或图片资源，也未压缩或替换产品主图；Contact 两个地址行继续使用既有地址标签，国际邮箱保持 `henanlxgj@163.com`。

生产最终复验与本地结果一致：全站服务端正文 184 URL + 4 参数页失败 0；旧 URL 424 次有效检查全部单跳 301；产品详情 SEO 152/152；Schema 184/184；生产 Playwright 35/35。部署时发现 Cloudflare 命中旧水合脚本查询版本，已通过服务端统一输出 `20260711-stage2c-final` 版本修复，普通生产 URL 已确认加载新脚本，PM2 最终保持 `online`。
