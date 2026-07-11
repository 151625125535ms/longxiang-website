# 阶段一完成度审计

审计日期：2026-07-11

## 结论

阶段一的 10 项任务中，8 项完成、1 项由用户明确取消、1 项只完成公开 URL 盘点但缺少 `.cn` 站长平台的真实流量与外链数据。因此当前不能把整个阶段一标记为 100% 完成。

本阶段没有修改 `lxelec.cn`，没有公开国内电话或国内销售邮箱，没有改变 Contact 页地址标签，也没有修改、压缩或替换任何 Hero 图片。

## 逐项验收

| 序号 | 任务 | 状态 | 权威证据 |
|---:|---|---|---|
| 1 | 确认法定英文名、注册资本、总部、生产基地与国际联系方式 | 完成 | 用户已确认；生产 `/api/company` 返回统一身份数据，且仅公开国际邮箱 |
| 2 | 建立企业实体主数据 | 完成 | `server/lib/companyIdentity.js`、数据库迁移 `0005_company_identity.js`、生产 schemaVersion 5 |
| 3 | 确认 `.cn` 中国官网、`.com` 全球官网分工 | 完成 | `.com` 页脚四种正式语言均有普通可抓取中国官网链接；未建立跨域 canonical |
| 4 | 盘点 `.cn` 英文 URL、流量和外链 | 部分完成 | 已完成公开 URL 样本和 `.com` 承接映射；没有 `.cn` Search Console/外链导出，无法验证点击、曝光、查询词和真实外链 |
| 5 | 修复 `?group=`、`?sub=` 参数 URL 策略 | 完成 | 参数筛选页原始 HTML 输出 `noindex,follow`，canonical/hreflang 指向对应语言的干净产品列表页 |
| 6 | 制定产品分类 URL 和后台数据模型 | 完成（设计） | `stage1-cn-readonly-inventory-20260711.md` 已记录 13 个计划分类 URL、字段模型和可索引门槛；未在内容不足时提前上线 |
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
- 生产服务器提交：`fdca728`，PM2 状态 online。

## 已部署提交

- `297a311`：统一全球站企业身份与联系方式；
- `5e56377`：收敛产品参数索引并启用卡片缩略图；
- `a5b5469`：补充阶段一分析与 Bing 接入清单；
- `fdca728`：补齐阶段一 GA4 事件与 Bing 验收。

## 唯一未闭环项

要完成第 4 项，需要 `.cn` Search Console 的只读导出，不需要也不允许修改 `.cn` 网站。最低数据范围：

1. 过去 16 个月“搜索结果”中的页面、查询、国家和设备 CSV；
2. “链接”报告中的外部链接目标页、主要来源网站和主要链接文字 CSV；
3. “网页索引”及 sitemap 状态截图或导出。

在取得这些只读数据前，不对 `.cn` 英文 URL 制定 301、noindex 或删除动作，也不把公开搜索结果误当成完整外链清单。

## GA4 启用前置条件

GA4 方案和代码准备已经完成，但生产启用仍需企业 GA4 Web Data Stream 的真实 `G-XXXXXXXXXX` Measurement ID。取得 ID 后属于生产配置写入，必须先备份数据库，再写入、验证 Consent、Realtime 与 DebugView。
