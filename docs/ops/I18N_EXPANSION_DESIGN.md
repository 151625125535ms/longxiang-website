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
| `homePath` | 该语言首页 URL，例如 `/fr/index.html` |
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
- sitemap 静态页 alternate 和产品页 alternate 按已启用 sitemap 语言循环生成，不再写死 `en/ar`。
- sitemap URL count 使用 `scripts/sitemap-count-model.js` 按当前数据库和 sitemap 语言动态计算。
- `scripts/verify-seo-i18n.js` 从同一份配置读取 sitemap 语言列表，检查 `hreflang`、路径前缀、首页映射、`x-default` 和 planned locale 隔离。
- `scripts/export-i18n-content-template.js` 和 `scripts/import-fr-content-filled.js` 应按 `config/locales.json` 校验 supported/planned 状态，不再接受旧的 `en/ar` 或 `en/ar/fr` 阶段快照。
- `js/main.js` 的运行时语言配置保留静态内联对象，但必须通过 `scripts/verify-seo-i18n.js` 与 `config/locales.json` 同步校验。

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
node scripts/generate-sitemap.js --dry-run
node scripts/verify-seo-i18n.js
git diff --check
```

## 风险与治理建议

- 前端运行时和 `config/locales.json` 仍存在一份静态配置重复；短期通过 `scripts/verify-seo-i18n.js` 强校验兜底，长期可评估构建脚本或服务端注入。
- 当前产品翻译字段仍是固定语言字段，继续新增多种语言会膨胀；后续应单独规划翻译表或结构化 JSON 字段。
- 新语言上线前不要开启 `includeInSitemap`，否则 sitemap 会暴露尚未准备好的 URL。
- 每次语言状态变化后都必须同步更新 `docs/ops/CURRENT_FACTS.md` 和本设计文档。
