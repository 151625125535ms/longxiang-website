# 阶段一：`.com` 参数 URL 与产品分类规划

适用范围：仅 `https://www.lxenelectric.com/`

## 参数 URL 处理结果

- `/products.html`：保持可索引并 self-canonical；
- `/products.html?group=...`：保留用户筛选体验，输出 `noindex,follow`，canonical 指向 `/products.html`；
- `/products.html?group=...&sub=...`：保留用户筛选体验，输出 `noindex,follow`，canonical 指向 `/products.html`；
- `/products.html?search=...`、`?page=...`：同样不建立独立索引；
- 阿拉伯语、法语、俄语参数页分别 canonical 到 `.com` 对应语言的干净产品列表页；
- 参数页的 hreflang 不携带筛选参数，所有 alternate 均留在 `.com`；
- 参数页不进入 `.com` sitemap。

该策略停止参数组合继续形成重复索引，同时保留用户筛选体验。它不引用、不修改也不依赖任何 `.cn` 页面。

## 产品分类干净 URL 与后台模型

当前 `categories` 已具备父子层级，阶段一确定以下 `.com` 长期 URL，不在内容不足时提前纳入 sitemap：

| 内部分类 | 计划英文 URL |
|---|---|
| Transformer | `/products/transformers` |
| Oil-Immersed | `/products/transformers/oil-immersed-transformers` |
| Dry-Type | `/products/transformers/dry-type-transformers` |
| Combined | `/products/transformers/combined-transformers` |
| New Energy Equipment | `/products/new-energy-equipment` |
| AC EV Charging Station | `/products/new-energy-equipment/ac-ev-charging-stations` |
| DC EV Charging Station | `/products/new-energy-equipment/dc-ev-charging-stations` |
| Energy Storage System | `/products/new-energy-equipment/energy-storage-systems` |
| Grid-Connected PV Equipment | `/products/new-energy-equipment/grid-connected-pv-equipment` |
| Surge Arrester | `/products/new-energy-equipment/surge-arresters` |
| Switchgear | `/products/switchgear` |
| Medium & Low Voltage Switchgear | `/products/switchgear/medium-low-voltage-switchgear` |
| High-Voltage Switchgear | `/products/switchgear/high-voltage-switchgear` |

分类正式可索引前，后台数据模型需要补齐：

- `seo_slug`：与内部分类 slug 分离，支持稳定的采购型 URL；
- `seo_title_en/ar/fr/ru`；
- `seo_description_en/ar/fr/ru`；
- `intro_en/ar/fr/ru`：分类页独有正文，不复用产品卡摘要；
- `hero_image`：只用于未来分类页，当前 Hero 图片保持原样，不压缩、不替换；
- `is_indexable`：内容达到发布标准后才允许进入 sitemap/hreflang；
- `canonical_override`：仅用于 `.com` 内部特殊规范化例外，默认必须为空；
- `published_at`、`updated_at`：用于 sitemap lastmod 和内容审计。

分类页启用门槛：至少有 3 个已发布产品、唯一 Title/H1/Description、300–500 词海外采购型正文、规格或选型说明、相关产品内链和询盘 CTA。未达到门槛时继续使用 noindex 参数筛选页。
