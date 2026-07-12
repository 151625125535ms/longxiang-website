# 阶段三产品搜索摘要与阿语混入修复生产验收

日期：2026-07-12

目标站点：`https://www.lxenelectric.com/`

状态：已完成生产写入、真实页面验收和 rollback dry-run；未执行 rollback。

## 1. 批准与实际写入范围

用户批准桌面字段级矩阵后执行阶段 B。生产实际写入与批准矩阵一致：

- 审计产品：38；
- 实际修改产品：35；
- `seo_title`：13；
- `seo_description`：35；
- `short_desc_ar`：32；
- `name_en`：0；
- `name_ar`：0；
- 字段变更总数：80；
- 方案一字段数：48；
- 方案二字段数：0；
- 方案四字段数：32。

3 个产品保持全部目标字段不变：

- `kyn28-12`；
- `grid-connected-pv-box`；
- `segmented-arc-quenching-surge-arrester`。

`amorphous-sbh-mrl-wound-core` 的 `S(B)H21/25 - M.RL` 空格写法缺少权威型号依据，按矩阵作为歧义项跳过名称修改。

## 2. 共享执行引擎与版本化策略

实现采用一个稳定 seam：

- `scripts/apply-product-field-safe-patch.js`：薄 CLI adapter；
- `scripts/lib/product-field-safe-patch-engine.js`：共享安全执行引擎；
- `scripts/lib/product-field-patch-policies.js`：版本化策略注册；
- `fr-ru-localization-v1`：保持旧法俄字段行为；
- `search-copy-v1`：只允许 `seo_title`、`seo_description`、`name_en`、`name_ar`、`short_desc_ar`。

执行引擎集中处理唯一匹配、字段校验、expected-value compare-and-set、dry-run、SQLite backup、事务、单行更新数、version 递增和报告。

策略元数据明确区分：

- 正向补丁：`operation: forward`，执行 SEO 与阿语质量规则；
- 回滚补丁：`operation: rollback`，允许恢复已审计旧值，同时继续执行字段白名单、compare-and-set、token、事务和备份保护。

生产运行时代码未引用正向或 rollback JSON；未修改数据库 schema、公开产品映射、SSR 渲染器、前端产品模块或缓存逻辑。

## 3. RED → GREEN 证据

首次新增 `search-copy-v1` CLI 测试后运行：

```text
node scripts/test-product-field-safe-patch.js
AssertionError: Error: Unknown option: --policy
```

实现版本化策略与共享执行引擎后，同一测试转为通过。

专项补丁测试随后发现正向质量规则阻止旧内容 rollback。没有放宽全局规则，而是引入显式 `forward` / `rollback` operation；修复后：

```text
product field safe patch tests passed
stage3 product search copy patch tests passed
```

覆盖内容包括：

- 旧调用不传 policy 时保持法俄默认行为；
- 默认策略拒绝英/阿字段；
- `search-copy-v1` 只接受五个精确字段；
- 未知 policy、缺少元数据和 CLI/input 不一致失败；
- 冻结字段被拒绝；
- expected 不一致失败；
- dry-run 不写库；
- apply 必须创建新备份；
- 空变化不递增 version；
- rollback 可在 apply 后通过 dry-run；
- 阿语数字、单位和允许代码不能丢失。

## 4. Git 与部署

实现提交：

```text
a55d2b7 建立产品字段安全策略并准备阶段三补丁
```

- 已 push `origin/main`；
- 生产服务器使用 `git pull --ff-only origin main` fast-forward 到 `a55d2b7`；
- 服务器工作区干净；
- `package.json` 只增加检查脚本，没有依赖变化，因此未执行依赖安装；
- 新增内容为离线工具、测试、审计和数据补丁，不改变 PM2 运行代码；
- 未 reload 或 restart PM2。

## 5. 生产 dry-run、备份与 apply

正向 dry-run 报告：

`backups/server/stage3-product-search-copy/forward-dry-run-20260712-110437.md`

结果：

- policy：`search-copy-v1`；
- operation：`forward`；
- input products：35；
- matched products：35；
- changed products：35；
- field changes：80；
- blockers：0；
- errors：0；
- database changed：no。

生产 apply 前备份：

`backups/server/stage3-product-search-copy/longxiang-before-stage3-search-copy-20260712-110437.db`

- 大小：3,837,952 bytes；
- backup `PRAGMA integrity_check`：`ok`；
- active database `PRAGMA integrity_check`：`ok`；
- backup 与 active 均包含53条总产品记录，其中38条为已发布产品。

正向 apply 报告：

`backups/server/stage3-product-search-copy/forward-apply-20260712-110437.md`

结果：

- database changed：yes；
- products：35/35；
- fields：80/80；
- blockers：0；
- errors：0。

备份库与活动库对比：

- 对全部53条产品记录比较32个冻结列；
- 冻结列差异：0；
- 35个目标产品 version 各递增1；
- 非目标产品 version 不变；
- `name_en`、`name_ar`、Long Description、技术参数、法俄字段、slug、分类、图片和状态均未漂移。

## 6. rollback 验证

rollback dry-run 报告：

`backups/server/stage3-product-search-copy/rollback-dry-run-after-20260712-110437.md`

结果：

- operation：`rollback`；
- matched products：35；
- changed products：35；
- field changes：80；
- blockers：0；
- errors：0；
- database changed：no。

rollback 文件是正向补丁的逐字段精确逆向。当前生产验收通过，因此没有执行 rollback。

## 7. 本地完整门禁

- `npm run check:all`：通过；
- `node scripts/test-acceptance.js`：32/32；
- sitemap dry-run：184；
- 本地产品详情 raw/rendered：152/152；
- 本地 Schema：184 URL，错误0；
- 本地 SSR：184 URL、152详情，失败0；
- 本地实体图：192个审计路由，失败0；
- 旧 URL：424项有效重定向检查、28项无效404、152个 clean target，无链式跳转；
- Playwright：42/42；
- `npm audit --omit=dev`：0 vulnerabilities；
- `git diff --check`：通过；
- 运行时代码对本批次 JSON 引用：0。

本地连续全站审计曾触发一次429；按计划重启本地测试服务并串行重跑，没有降低覆盖，所有审计最终通过。

## 8. 生产真实页面验收

生产字段状态：

- `/api/products`：38；
- 35个补丁产品的全部 target 字段逐项一致；
- sitemap：184；
- 正式产品详情：152。

生产 SEO/Schema：

- raw canonical：152/152；
- raw hreflang：152/152；
- raw WebPage：152/152；
- raw BreadcrumbList：152/152；
- raw Product Schema：0；
- rendered 页面首次完成150/152，两个 URL 因单次60秒导航超时未完成；
- 对两个超时 URL 单独重试后，title、description、canonical、5个 hreflang、WebPage、BreadcrumbList 均通过，Product Schema 为0，因此 rendered 总覆盖补齐到152/152；
- 全站 Schema：184 URL，missing/mismatch/parse/load error 均为0；
- Product 高风险字段：0；
- planned pt 暴露：0；
- 实体图：192个 raw/rendered 路由，失败0；
- `.cn` Schema 暴露：0；
- 敏感信息发现：0；
- 旧 URL 生产检查：424项通过。

生产浏览器验收：

- Playwright：42/42；
- 英文代表产品 title、meta、H1、参数表：通过；
- 阿语桌面产品卡精确显示批准短描述；
- 阿语移动端沿用现有“卡片仅显示名称”响应式设计；
- 阿语详情 RTL、H1、询盘上下文：通过；
- 桌面与移动端横向溢出：0；
- Hero、Contact 地址标签、国际联系方式、导航、页脚和询盘结构回归通过。

## 9. 明确未修改内容

- 未修改 `description_en/ar/fr/ru`；
- 未修改 `short_desc_en/fr/ru`；
- 未修改产品技术参数；
- 未执行方案三；
- 未修改 Hero 图片、尺寸、质量或清晰度；
- 未修改 Contact 地址标签；
- 未公开国内销售电话或国内邮箱；
- 未修改 `.cn`；
- 未创建分类页；
- 未启用 planned `pt`；
- 未修改 URL、canonical、hreflang、sitemap 或 robots；
- 未新增 Product、Offer、价格、库存、Review 或 AggregateRating Schema。

冻结的 `description_ar` 中仍有32个英语混入观察项，符合本批次冻结约束，未借本任务扩大修改范围。

## 10. 最终状态

- 生产数据库写入：完成；
- 备份：可用且完整；
- rollback：可 dry-run；
- 真实 API、raw HTML、rendered DOM、Schema 与 UI：通过；
- PM2：`online`，未重启；
- 当前阶段三首批任务：完成。

本记录提交和 push 后属于纯文档，不要求生产服务器再次 pull，也不操作 PM2。
