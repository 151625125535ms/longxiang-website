# 阶段一完成度审计

审计日期：2026-07-11

## 结论

按用户最新边界，阶段一的 10 项任务中，9 项完成、1 项（Hero 图片优化）由用户明确取消。所有执行、测试和验收项均限定在 `.com`；`.cn` 公开观察仅保留为非执行附录。因此阶段一可以完成收口。

本阶段没有修改 `lxelec.cn`，没有公开国内电话或国内销售邮箱，没有改变 Contact 页地址标签，也没有修改、压缩或替换任何 Hero 图片。

## 逐项验收

| 序号 | 任务 | 状态 | 权威证据 |
|---:|---|---|---|
| 1 | 确认法定英文名、注册资本、总部、生产基地与国际联系方式 | 完成 | 用户已确认；生产 `/api/company` 返回统一身份数据，且仅公开国际邮箱 |
| 2 | 建立企业实体主数据 | 完成 | `server/lib/companyIdentity.js`、数据库迁移 `0005_company_identity.js`、生产 schemaVersion 5 |
| 3 | 确认 `.cn` 中国官网、`.com` 全球官网分工 | 完成 | `.com` 页脚四种正式语言均有普通可抓取中国官网链接；未建立跨域 canonical |
| 4 | 建立 `.com` 海外关键词与内容竞争基线 | 完成 | 已记录 `.com` GSC 起始查询、页面、国家和设备基线；后续只使用 `.com` 数据调整优先级 |
| 5 | 修复 `?group=`、`?sub=` 参数 URL 策略 | 完成 | 参数筛选页原始 HTML 输出 `noindex,follow`，canonical/hreflang 指向对应语言的干净产品列表页 |
| 6 | 制定 `.com` 产品分类 URL 和后台数据模型 | 完成（设计） | `stage1-com-parameter-url-and-category-plan-20260711.md` 已记录 13 个计划分类 URL、字段模型和可索引门槛；未在内容不足时提前上线 |
| 7 | 优化首页和产品详情大背景图 | 用户取消 | 按用户最新指令保持 Hero 图片原样；提交中没有任何图片文件变更 |
| 8 | 首页产品卡切换到现有缩略图 | 完成 | 生产首页前 8 个推荐产品卡使用 `assets/optimized/product-cards/`；Playwright 验收通过 |
| 9 | 配置 GA4 方案和事件字典 | 完成（待真实 ID 启用） | 已有事件字典、Consent-safe 公共上下文和中国官网跳转事件；`ga4TrackingId` 仍为空，不加载 GA4、不使用占位 ID |
| 10 | 导入 Bing Webmaster Tools | 完成 | 用户截图确认 sitemap 为 `Success`、发现 184 个 URL、错误 0、警告 0，最后提交和抓取均为 2026-07-05 |

## 已通过的技术验证

- `npm run check:all`：通过；
- `node scripts/generate-sitemap.js --dry-run`：184 个 URL；
- SEO/i18n 校验：通过；
- 服务端验收：30 项通过、0 项失败；
- Playwright：18 项通过，覆盖英语、阿拉伯语、法语、俄语；
- 生产法语首页：加载 `main.js?v=20260711-ga4-context`；
- 生产事件实测：`click_china_website` 带 `locale=fr`、`page_type=home`、`source_component=footer`；
- 未同意 Analytics Cookie 时不发送该事件；
- 生产 `ga4TrackingId` 为空；
- 生产服务器持续从 GitHub `main` 拉取，PM2 状态 online。

## 已部署提交

- `297a311`：统一全球站企业身份与联系方式；
- `5e56377`：收敛产品参数索引并启用卡片缩略图；
- `a5b5469`：补充阶段一分析与 Bing 接入清单；
- `fdca728`：补齐阶段一 GA4 事件与 Bing 验收。

## 非 `.com` 域名边界

- 不修改 `.cn` 源代码、服务器、301、canonical、noindex、hreflang、页面内容、sitemap 或站长平台配置；
- `.cn` 不属于待改造、待迁移或未来授权清单；
- 只通过公开页面、公开 sitemap 和公开搜索结果观察英文主题竞争；
- `.com` 通过独立海外内容、关键词、内链、外链和转化建设自身权重；
- 不复制 `.cn` 内容。

`.cn` 的公开快照仅保留在非执行附录 `reference-cn-public-observation-20260711.md`，不进入阶段一任务、测试或验收。`.com` 参数 URL 和分类规划见 `stage1-com-parameter-url-and-category-plan-20260711.md`。

## GA4 启用前置条件

GA4 方案和代码准备已经完成，但生产启用仍需企业 GA4 Web Data Stream 的真实 `G-XXXXXXXXXX` Measurement ID。取得 ID 后属于生产配置写入，必须先备份数据库，再写入、验证 Consent、Realtime 与 DebugView。
