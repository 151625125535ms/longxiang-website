# 多语言扩展设计

## 当前语言状态

`config/locales.json` 是语言状态的权威来源。

- 默认语言：`en`
- 已启用语言：`en`、`ar`、`fr`、`ru`
- 已进入 sitemap / hreflang 的语言：`en`、`ar`、`fr`、`ru`
- planned 语言：`pt`
- `pt` 只允许存在于 `plannedLocales`，且 `includeInSitemap=false`

当前策略：

- 英文继续使用根目录 URL，例如 `/products.html`、`/products/{id}`。
- 阿拉伯语继续使用 `/ar/` 前缀，例如 `/ar/products.html`、`/ar/products/{id}`。
- 法语继续使用 `/fr/` 前缀，例如 `/fr/products.html`、`/fr/products/{id}`。
- 俄语继续使用 `/ru/` 前缀，例如 `/ru/products.html`、`/ru/products/{id}`。
- 葡萄牙语 `pt` 仍为 planned，不进入语言选择器、sitemap、hreflang、正式页面路由或公开产品详情路由。

## 语言配置字段

每个已启用或 planned 语言至少需要配置：

| 字段 | 用途 |
| --- | --- |
| `label` / `nativeLabel` | 语言选择器、后台和运维显示 |
| `htmlLang` | 页面 `<html lang>` |
| `hreflang` | sitemap 和页面 alternate |
| `dir` | `ltr` 或 `rtl` |
| `pathPrefix` | URL 前缀，例如 `/fr` |
| `homePath` | 该语言规范首页 URL，例如 `/fr/`；正式语言不得把 `index.html` 作为 canonical |
| `fallbackLocale` | 内容缺失时的回退语言 |
| `includeInSitemap` | 是否参与 sitemap 和 hreflang 输出 |

当前配置形态应保持为：

```json
{
  "defaultLocale": "en",
  "supportedLocales": ["en", "ar", "fr", "ru"],
  "plannedLocales": {
    "pt": {
      "pathPrefix": "/pt",
      "includeInSitemap": false
    }
  },
  "locales": {
    "en": { "includeInSitemap": true },
    "ar": { "pathPrefix": "/ar", "includeInSitemap": true },
    "fr": { "pathPrefix": "/fr", "includeInSitemap": true },
    "ru": { "pathPrefix": "/ru", "includeInSitemap": true }
  }
}
```

## 已对齐内容

- `scripts/generate-sitemap.js` 从 `config/locales.json` 读取 `hreflang`、`pathPrefix`、`homePath` 和 `includeInSitemap`。
- 当前正式语言首页固定为 `/`、`/ar/`、`/fr/`、`/ru/`；对应 `index.html` 地址只作为永久 301 兼容入口，不进入 canonical、hreflang、语言切换或 sitemap。
- sitemap 静态页 alternate 和产品页 alternate 按已启用 sitemap 语言循环生成，不再写死 `en/ar`。
- sitemap URL count 使用 `scripts/sitemap-count-model.js` 按当前数据库和 sitemap 语言动态计算。
- `scripts/verify-seo-i18n.js` 从同一份配置读取 sitemap 语言列表，检查 `hreflang`、路径前缀、首页映射、`x-default` 和 planned locale 隔离。
- `scripts/export-i18n-content-template.js` 和 `scripts/import-fr-content-filled.js` 应按 `config/locales.json` 校验 supported/planned 状态，不再接受旧的 `en/ar` 或 `en/ar/fr` 阶段快照。
- `js/main.js` 的运行时语言配置保留静态内联对象，但必须通过 `scripts/verify-seo-i18n.js` 与 `config/locales.json` 同步校验。

## Translation revision 阶段 B 能力

阶段 B 在代码层增加通用翻译版本能力，但不切换公开读取权威：

- Schema v7 以 additive migration 增加产品、分类、证书和 content block 的 translation revision 表；现有四语固定字段继续作为公开读取来源。
- `server/lib/translationWriter.js` 是正式翻译写入口。`saveDraft()` 只写草稿；`publishDraft()` 和 `restoreRevision()` 在同一写事务内切换版本、镜像现有四语旧字段并记录审计。
- 旧产品、分类、证书和内容块表单继续保持“保存即上线”，但必须在原事务内通过兼容适配器同步 published revision。
- `product_specs.spec_code` 是不可随排序或翻译变化的稳定行身份。无法可靠识别的历史规格由 backfill 报告阻断，不根据相近规格猜测。
- 后台“翻译版本”工作台从 locale registry 动态生成语言标签，可按单一语言保存草稿、发布和恢复历史版本。
- `pt` 可以准备内部草稿或内部发布版本，但其 planned 状态不变；公开 API、前台语言选择器、sitemap、hreflang 和正式路由仍拒绝 `pt`。
- content block 的 Fr/Ru Patch 和 overlay 迁移仍属于阶段 C；阶段 B 只建立 revision 容器，不改变现有公开合并逻辑。

### backfill 与回滚边界

`scripts/backfill-translation-revisions.js` 默认只读 dry-run，并输出计划哈希、待分配规格身份、待创建 revision 和 blocker：

```powershell
node scripts/backfill-translation-revisions.js --db=<database-copy>
```

apply 只允许显式数据库路径、确认词、dry-run 计划哈希和新 receipt 路径：

```powershell
node scripts/backfill-translation-revisions.js --apply --db=<database-copy> --expected-plan-hash=<hash> --receipt=<receipt.json> --confirm=STAGE_B_BACKFILL
```

apply 会在同一写事务内完成收敛检查，并把 recovery receipt 写入数据库表 `translation_backfill_receipts`；外部 receipt 文件只是便于运维携带的副本。逻辑 rollback 会精确核对本批 revision，发现任何后续草稿、发布、历史或内容变化时整批拒绝回滚：

```powershell
node scripts/backfill-translation-revisions.js --rollback --db=<database-copy> --receipt=<receipt.json> --confirm=STAGE_B_BACKFILL_ROLLBACK
```

如果 apply 已提交但外部 receipt 文件写入失败，可以使用数据库内的计划哈希恢复：

```powershell
node scripts/backfill-translation-revisions.js --rollback --db=<database-copy> --plan-hash=<applied-plan-hash> --confirm=STAGE_B_BACKFILL_ROLLBACK
```

dry-run 计划哈希包含待导入的旧字段内容和产品规格源快照；源内容在 dry-run 后发生变化时，apply 会在取得写锁后以 `PLAN_CHANGED` 整批拒绝。逻辑 rollback 会移除本批 translation revision，但保留已经分配的稳定 `spec_code`。Schema 迁移和完整数据库状态的生产回滚必须使用迁移前、仓库外、校验通过的 SQLite WAL 在线备份；receipt 不能替代数据库备份。

旧后台表单继续采用“保存即上线”语义，但保存事务会通过统一 writer 生成 draft 并立即 publish；已有未发布草稿时，旧表单保存会整笔拒绝，管理员应先在翻译工作台发布或丢弃草稿。翻译工作台的 `saveDraft` 永远不修改旧公开字段，只有 publish、restore 和兼容保存会改变当前公开快照。

生产部署顺序必须单独授权，并保持：WAL 在线备份及校验 -> 迁移 v7 -> backfill dry-run -> 核对计划哈希与 blocker -> 单独授权 apply -> 写后数据库和后台闭环验收。当前阶段不得仅凭代码合入自动执行生产迁移或 backfill。

## Content overlay 阶段 C1 能力

阶段 C1 只建立默认关闭的迁移与读取能力，不切换公开读取权威：

- Schema v8 以 additive migration 增加 `content_translation_schemas` 和 `content_overlay_migration_receipts`。前者保存按 content block、内容版本和 schema 版本绑定的路径白名单及结构哈希；后者保存 apply/rollback 回执。
- `server/lib/contentTranslationOverlay.js` 只允许白名单内的文本路径进入 overlay。对象数组使用持久 `_translationId` 作为翻译身份；该字段属于数据库内部元数据，旧接口和 revision 接口都不得向前台输出。
- 旧 Patch 转换时，只有双方等长且均为对象数组时，才允许按旧下标一次性继承稳定 ID。迁移后排序与文本绑定只依赖稳定 ID；插入、删除或结构变化会改变 canonical structure hash，并在重新发布前阻止旧 overlay 静默套用。
- About Us 阿语和 Education 法语中现存的数组长度差异使用 schema 显式允许的受控 replacement 保存，不扩大到资源路径或其它中性结构字段。
- `server/lib/localizedPublicCatalog.js` 和 `server/lib/revisionPublicContent.js` 提供显式 revision 读取入口；`server/lib/publicTranslationReadAdapter.js` 的默认 source 仍是 `legacy`。C1 合入本身不会改变公开路由、SSR、SEO、sitemap 或前台页面的数据来源。
- `server/lib/localePublicationPolicy.js` 提供基于 published revision 的批量发布矩阵，产品、分类、证书或 content block 的一批实体只执行一次矩阵查询，供后续读取切换和 sitemap 使用。

### overlay dry-run、apply 与 rollback

只读 dry-run：

```powershell
node scripts/migrate-content-overlays.js --db=<database-copy>
```

apply 必须使用显式数据库副本、dry-run 计划哈希、确认词和新的外部 receipt 路径：

```powershell
node scripts/migrate-content-overlays.js --apply --db=<database-copy> --expected-plan-hash=<hash> --receipt=<receipt.json> --confirm=STAGE_C1_CONTENT_OVERLAYS
```

rollback 会核对数据库内 receipt、当前 content block、schema 和本批 published revision；任一内容在 apply 后发生变化时整批拒绝回滚：

```powershell
node scripts/migrate-content-overlays.js --rollback --db=<database-copy> --receipt=<receipt.json> --confirm=STAGE_C1_CONTENT_OVERLAYS_ROLLBACK
```

也可以使用数据库内计划哈希恢复：

```powershell
node scripts/migrate-content-overlays.js --rollback --db=<database-copy> --plan-hash=<applied-plan-hash> --confirm=STAGE_C1_CONTENT_OVERLAYS_ROLLBACK
```

C1 的本地验收使用 SQLite 在线备份生成临时副本，连续验证 dry-run 不写库、源数据漂移阻断、apply 收敛、旧接口兼容、四语 revision 输出、稳定数组 ID、结构哈希、批量查询预算、rollback 和 reapply。生产 Schema v8 迁移、content overlay apply 及公开读取切换分别属于后续授权节点，不能由 C1 commit 自动触发。

## pt planned 边界

- 不创建正式 `/pt/` 公开页面目录作为上线入口。
- 不把 `pt` 加入 `supportedLocales`。
- 不把 `pt` 加入前台语言选择器。
- 不让 `pt` 进入 sitemap URL、sitemap alternate、页面 hreflang 或 `x-default`。
- 不批量写入 `pt` 产品、证书、内容块字段。
- 如需为未来 `pt` 准备页面壳或内容模板，必须保持 `noindex` 和 planned 隔离，并用验证脚本证明不会被公开索引链路引用。

## 后续新增或启用语言的建议路径

1. 先在 `plannedLocales` 中增加语言配置，并保持 `includeInSitemap=false`。
2. 准备页面壳、静态 SEO fallback、前台运行时文案、后台字段或翻译管理方案。
3. 补齐产品详情页、内容页、404、语言选择器和后台入口的运行时支持。
4. 运行 `node scripts/verify-seo-i18n.js`，确认 planned 语言不会进入公开索引链路。
5. 需要正式启用时，再把语言移入 `supportedLocales` 和 `locales`，并同步验证 canonical、alternate、x-default、sitemap、noindex/index、前台路径和产品详情路由。
6. sitemap 验证通过后，再生成 sitemap 并提交 Google Search Console / Bing Webmaster Tools。

## 验证命令

```powershell
node --check scripts/export-i18n-content-template.js
node --check scripts/import-fr-content-filled.js
node --check scripts/verify-seo-i18n.js
node --check scripts/generate-sitemap.js
node scripts/audit-translation-write-entrypoints.js
npm run test:translation-stage-b
npm run test:translation-stage-c1
npm run test:acceptance:db-copy
node scripts/generate-sitemap.js --dry-run
node scripts/verify-seo-i18n.js
git diff --check
```

## 风险与治理建议

- 前端运行时和 `config/locales.json` 仍存在一份静态配置重复；短期通过 `scripts/verify-seo-i18n.js` 强校验兜底，长期可评估构建脚本或服务端注入。
- 当前公开读取仍使用固定语言字段；translation revision 与 content overlay 都是默认关闭的兼容迁移层。只有完成后续四语读取切换、观察期和旧写入口退役，才能消除双写及旧 Patch 技术债。
- 新语言上线前不要开启 `includeInSitemap`，否则 sitemap 会暴露尚未准备好的 URL。
- 每次语言状态变化后都必须同步更新 `docs/ops/CURRENT_FACTS.md` 和本设计文档。
