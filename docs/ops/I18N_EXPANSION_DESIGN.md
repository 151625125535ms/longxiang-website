# 多语言扩展设计

## 当前策略

- 英文继续使用根目录 URL，例如 `/products.html`、`/products/{id}`。
- 阿拉伯语继续使用 `/ar/` 前缀，例如 `/ar/products.html`、`/ar/products/{id}`。
- Stage 7D 不新增第三种语言页面，不新增语言目录，不修改数据库结构，也不改变现有英文和阿语 URL。
- `config/locales.json` 作为脚本侧语言元数据来源，当前包含 `en` 和 `ar`。

## 语言配置字段

新增语言时，每个语言至少需要配置：

| 字段 | 用途 |
| --- | --- |
| `code` | 语言内部代码，来自 `supportedLocales` 的键 |
| `label` / `nativeLabel` | 后续语言选择器和后台显示 |
| `htmlLang` | 页面 `<html lang>` |
| `hreflang` | sitemap 和页面 alternate |
| `dir` | `ltr` 或 `rtl` |
| `pathPrefix` | URL 前缀，例如 `/ar` |
| `homePath` | 该语言首页 URL，例如 `/ar/index.html` |
| `fallbackLocale` | 内容缺失时的回退语言 |
| `includeInSitemap` | 是否参与 sitemap 和 hreflang 输出 |

当前配置形态保持为：

```json
{
  "defaultLocale": "en",
  "supportedLocales": ["en", "ar"],
  "locales": {
    "en": {
      "label": "English",
      "nativeLabel": "English",
      "htmlLang": "en",
      "hreflang": "en",
      "dir": "ltr",
      "pathPrefix": "",
      "homePath": "/",
      "fallbackLocale": null,
      "includeInSitemap": true
    }
  }
}
```

## Stage 7D 已对齐内容

- `scripts/generate-sitemap.js` 从 `config/locales.json` 读取 `hreflang`、`pathPrefix`、`homePath` 和 `includeInSitemap`。
- sitemap 的静态页 alternate 和产品页 alternate 不再直接硬编码 `en/ar`。
- 产品页 sitemap 条目按启用的 sitemap 语言循环生成。
- `scripts/verify-seo-i18n.js` 从同一份配置读取 sitemap 语言列表，检查 `hreflang`、路径前缀、首页映射和 `x-default`。
- `js/main.js` 的运行时语言配置补齐了相同的元数据字段，但仍保留静态内联对象，避免引入异步加载风险。

## 未来增加 3 个语言的建议路径

1. 先只在 `config/locales.json` 增加语言配置，并将 `includeInSitemap` 保持为 `false`。
2. 为新语言补齐页面目录和静态 SEO fallback。
3. 补齐产品详情页动态 canonical 和 alternate 生成逻辑。
4. 补齐后台内容字段或翻译管理方案，避免继续堆叠 `nameFr`、`nameEs` 这类字段。
5. 确认 `scripts/verify-seo-i18n.js` 通过后，再把新语言的 `includeInSitemap` 改为 `true`。
6. 生成 sitemap 并提交 Google Search Console / Bing Webmaster Tools。

## 当前仍不处理的边界

- 不新增 `/fr/`、`/es/`、`/ru/` 等目录。
- 不修改产品表、内容表或后台表单字段结构。
- 不把 `js/main.js` 改成运行时拉取 JSON 配置，因为这会改变页面启动时序。
- 不改 `js/content-pages.js` 和 `js/product-detail.js` 的现有动态 alternate 逻辑，只由验证脚本在未来配置开启新语言时提醒缺口。

## 风险与治理建议

- 目前前端运行时和 `config/locales.json` 仍存在一份静态配置重复。短期可接受，长期建议通过构建脚本或服务端注入生成前端语言配置。
- 当前产品翻译字段仍偏固定语言字段，新增多种语言后会快速膨胀。后续应单独规划翻译表或结构化 JSON 字段。
- 新语言页面上线前不要开启 `includeInSitemap`，否则 sitemap 会暴露尚不存在的 URL。
- 每次新增语言必须同时验证 canonical、hreflang、sitemap、robots、静态标题描述和 H1 fallback。
