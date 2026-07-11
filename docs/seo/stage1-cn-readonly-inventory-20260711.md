# 阶段一：`.cn` 英文页面只读盘点与 `.com` 承接清单

盘点日期：2026-07-11

## 边界

- 本文只记录公开搜索结果和公开页面，不登录、不修改 `lxelec.cn`。
- 不在 `.com` 建立指向 `.cn` 的 canonical 或跨域 hreflang。
- 不复制 `.cn` 的国内联系方式、页脚或询盘入口到 `.com`。
- `.com` 仅保留页脚中的中国官网普通链接。
- 任何 `.cn` 的 301、noindex、内容改写或站长平台操作，都必须另行授权并在 `.cn` 自身系统内执行。

## 公开索引样本

| `.cn` 英文 URL | 公开页面类型 | 与 `.com` 的重合 | `.com` 承接页 | 当前动作 |
|---|---|---|---|---|
| `https://www.lxelec.cn/` | 英文首页 | 品牌、企业介绍、产品总览 | `https://www.lxenelectric.com/` | `.com` 强化全球采购与国际项目意图；不改 `.cn` |
| `https://www.lxelec.cn/Profile.html` | 英文企业介绍 | 企业事实、生产能力 | `https://www.lxenelectric.com/about.html` | `.com` 使用已确认的统一实体主数据；不跨域 canonical |
| `https://www.lxelec.cn/product_list/Products.html` | 英文产品总目录 | 产品分类与产品卡 | `https://www.lxenelectric.com/products.html` | `.com` 保持全球产品目录入口 |
| `https://www.lxelec.cn/product_list/Transformers.html` | 英文变压器分类 | 变压器采购关键词 | 未来 `/products/transformers` | 阶段一先让参数筛选页 noindex；干净分类页进入后续落地 |
| `https://www.lxelec.cn/product_detail/Dry-type_amorphous_alloy_furnace_transformer.html` | 英文产品详情 | DGH 干式非晶合金电炉变压器 | `https://www.lxenelectric.com/products/amorphous-dgh-furnace` | `.com` 保持独立产品 URL 和全球询盘入口 |
| `https://www.lxelec.cn/Case_detail/1851165621131317248.html` | 英文综合解决方案 | 综合能源解决方案 | `https://www.lxenelectric.com/solutions.html` | `.com` 后续按海外场景重写，不直接复制正文 |
| `https://www.lxelec.cn/news_list/Blog.html` | 英文新闻/博客目录 | 品牌新闻与行业主题 | 未来 `.com` News/Insights | 国内新闻保持 `.cn` 独立；国际内容在 `.com` 重新创作 |
| `https://www.lxelec.cn/Innovation/Projects.html` | 英文研发项目 | 技术实力与创新证明 | `.com` About/Certificates/未来 Technology | 只提炼可验证事实，不复制整页 |
| `https://www.lxelec.cn/Cooperation/1.html` | 英文研究合作 | 研发、运维、职教能力 | `https://www.lxenelectric.com/education.html` 及未来 Technology | 按海外客户意图重新组织 |
| `https://www.lxelec.cn/Cooperation/3.html` | 英文培训合作 | 培训和校企合作 | `https://www.lxenelectric.com/education.html` | `.com` 使用国际合作语境 |
| `https://www.lxelec.cn/Cooperation/4.html` | 英文企业实践 | 校企合作 | `https://www.lxenelectric.com/education.html` | 不建立强制一对一映射 |

## 结论

1. `.cn` 当前确有可索引英文内容，且覆盖首页、产品、解决方案、新闻、研发和教育合作等主题。
2. `.com` 不能通过跨域 canonical 或 hreflang“接管”这些页面；两站市场意图不同，应通过内容差异化和普通官方互链建立关系。
3. `.com` 的产品与解决方案内容应突出 IEC/目标市场标准、出口文件、OEM、EPC、交付条件和 RFQ 信息，避免复制 `.cn` 面向国内项目的文本。
4. 在没有 `.cn` Search Console 或外链工具导出前，不能判断每个 `.cn` URL 的点击、曝光、查询词和外链数量，也不能据此决定重定向优先级。

## 尚需的只读数据

如后续提供 `.cn` Search Console 只读权限或导出文件，补齐以下字段：

- 过去 16 个月的页面点击、曝光、CTR、平均排名；
- 英文查询词及对应落地页；
- 外部链接目标页、来源域名和链接数量；
- 已索引英文 URL 总量及排除原因；
- sitemap 中的英文 URL 数量。

在上述数据缺失时，阶段一只完成公开索引样本和承接关系，不对 `.cn` 提出执行动作。

## `.com` 参数 URL 处理结果

阶段一立即处理现有筛选参数，但不仓促上线内容不足的分类落地页：

- `/products.html`：保持可索引并 self-canonical；
- `/products.html?group=...`：保留用户筛选体验，输出 `noindex,follow`，canonical 指向 `/products.html`；
- `/products.html?group=...&sub=...`：保留用户筛选体验，输出 `noindex,follow`，canonical 指向 `/products.html`；
- `/products.html?search=...`、`?page=...`：同样不建立独立索引；
- 阿拉伯语、法语、俄语参数页分别 canonical 到对应语言的干净产品列表页；
- 参数页的 hreflang 不携带筛选参数，避免生成成倍的参数语言组合。

这样可以先停止 Search Console 已发现的参数页继续形成重复索引，同时不破坏首页分类入口和产品筛选功能。

## 产品分类干净 URL 与后台模型

当前 `categories` 已具备父子层级，阶段一确定以下长期 URL，不在内容不足时提前纳入 sitemap：

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
- `hero_image`：只用于未来分类页，不改当前任何 Hero 图片；
- `is_indexable`：内容达到发布标准后才允许进入 sitemap/hreflang；
- `canonical_override`：仅用于迁移例外，默认必须为空；
- `published_at`、`updated_at`：用于 sitemap lastmod 和内容审计。

分类页启用门槛：至少有 3 个已发布产品、唯一 Title/H1/Description、300–500 词采购型正文、规格或选型说明、相关产品内链和询盘 CTA。未达到门槛时继续使用 noindex 参数筛选页。
