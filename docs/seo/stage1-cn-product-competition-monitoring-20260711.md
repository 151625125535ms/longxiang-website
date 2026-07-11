# 阶段一：`.cn` 英文产品竞争监测与 `.com` 内容覆盖对照

盘点日期：2026-07-11

## 边界与方法

- 只读取 `lxelec.cn` 公开 sitemap 中的 19 个产品详情 URL、页面 H1、状态码和 canonical；
- 目标产品来自 `https://www.lxenelectric.com/api/products` 当前公开的 38 个产品；
- 19 个 `.cn` 产品 URL 均返回 200，并 self-canonical；
- 本表只用于观察 `.cn` 英文产品主题与 `.com` 当前内容覆盖，不用于设计重定向；
- `.cn` 不属于本项目的改造范围，不执行 301、canonical、noindex、hreflang、内容或站长平台配置；
- `.com` 仅把对照结果用于识别海外内容缺口，并用独立文案、关键词和证据建设自身权重。

覆盖相似度定义：

- 高：`.com` 已有相同型号或高度相近的海外产品主题，可重点做差异化增强；
- 中：属于同一产品族，但容量、版本、命名或系列合并方式不同，说明 `.com` 仍有内容缺口；
- 低：`.com` 没有明确对应单品，应建设独立分类或主题页，不复制 `.cn` 页面。

## 竞争主题覆盖对照

| `.cn` 英文产品 URL | 页面 H1 | `.com` 当前相关 URL | 相似度 | `.com` 优化动作 |
|---|---|---|---|---|
| `/product_detail/1296874736991305728.html` | Full Fusion Large Capacity Network Charging Reactor Products – 1600kW Series | `/products/lxdc480-1280kw` | 中 | `.cn` 为 1600kW，`.com` 当前为 480–1280kW，容量不等价；确认是否需要新建 1600kW 页面 |
| `/product_detail/1296873941302976512.html` | Split Single Cabinet Flexible Charging Stack – 360–480kW | `/products/lxdc480-1280kw` | 中 | 同为充电堆，但容量区间和柜体组合不同；评估是否需要独立 360–480kW 海外页面 |
| `/product_detail/1296870047709102080.html` | Full Range of AC Charging Pile 7kW Products | `/products/lxac-7kw` 或 `/products/lxac-7kw-display` | 中 | 确认旧页是否包含显示屏版本，必要时先建立 7kW 系列汇总页 |
| `/product_detail/1296866833375371264.html` | Complete Set of High-Voltage Reactive Power Compensation Device | `/products/lxwz` | 高 | 核对型号、电压等级和装置组成 |
| `/product_detail/1296866166262931456.html` | KYN-12 Indoor Dry Air Metal Armored Removable Switchgear | `/products/kyn-12` | 高 | 核对旧页型号拼写和技术参数 |
| `/product_detail/1296865330111651840.html` | KYN28-12 Indoor Metal Armored Removable Switchgear | `/products/kyn28-12` | 高 | 核对 Metal-Clad/Armored 英文术语和参数 |
| `/product_detail/1296864398401044480.html` | GGD Low-Voltage Fixed Complete Switchgear | `/products/ggd` | 高 | 核对柜型、额定电流和应用范围 |
| `/product_detail/1296861641589882880.html` | GCS Low-Voltage Withdrawable Switchgear | `/products/gcs` | 高 | 核对柜型、额定电流和应用范围 |
| `/product_detail/S(B)H15_type_(energy_efficiency_class_3)_oil-immersed_amorphous_alloy_core_distribution_transformer.html` | S(B)H15 Class 3 Oil-Immersed Amorphous Alloy Core Distribution Transformer | `/products/amorphous-sbh15-m` | 中 | `.com` 合并 S(B)H15/21/25 系列；确认旧页是否应落到系列页而非单品 |
| `/product_detail/ZGS13_Series_Combined_Transformer_for_Photovoltaic_Power_Generation.html` | ZGS13 Combined Transformer for Photovoltaic Power Generation | `/products/pv-combined` | 高 | 核对油介质、容量和高低压配置 |
| `/product_detail/ZGSBH15_Series_Combined_Amorphous_Alloy_Transformer_for_Wind_Power_Generation.html` | ZGSBH15 Combined Amorphous Alloy Transformer for Wind Power | `/products/wind-power` | 高 | `.com` 名称包含 Vegetable Oil；确认介质与型号一致 |
| `/product_detail/Oil-immersed_three-dimensional_coil_core_distribution_transformer.html` | S13 Oil-Immersed 3D Wound Core Distribution Transformer | `/products/silicon-smrl-wound-core` | 高 | 核对 S13/S20/S22 系列合并关系 |
| `/product_detail/Dry-type_amorphous_alloy_furnace_transformer.html` | DGH Series Dry-Type Amorphous Alloy Furnace Transformer | `/products/amorphous-dgh-furnace` | 高 | 核对 DGH15/17/19 型号范围 |
| `/product_detail/Three-phase_five-column_amorphous_alloy_transformer.html` | Three-Phase Five-Column Amorphous Alloy Transformer | `/products/3phase-5limb` | 高 | 核对 `.com` 页面是否继续独立发布，避免与综合干式非晶页重复 |
| `/product_detail/Three-phase_three-column_amorphous_alloy_transformer.html` | Three-Phase Three-Column Amorphous Alloy Transformer | `/products/3phase-3limb` | 高 | 核对 `.com` 页面是否继续独立发布，避免与综合干式非晶页重复 |
| `/product_detail/(B)H25_Oil-immersed_amorphous_alloy_core_distribution_transformers.html` | (B)H25 Oil-Immersed Amorphous Alloy Core Distribution Transformer | `/products/amorphous-sbh15-m` | 中 | `.com` 为 S(S)H15/21/25-M 合并系列；核对型号前缀和铁芯结构 |
| `/product_detail/(B)H21_Oil-immersed_amorphous_alloy_core_distribution_transformers.html` | (B)H21 Oil-Immersed Amorphous Alloy Core Distribution Transformer | `/products/amorphous-sbh15-m` | 中 | 同上；若旧页是 M.RL 三维卷铁芯，应改候选为 `/products/amorphous-sbh-mrl-wound-core` |
| `/product_detail/S(B)H15_Oil-immersed_amorphous_alloy_core_distribution_transformers.html` | S(B)H15 Oil-Immersed Amorphous Alloy Core Distribution Transformer | `/products/amorphous-sbh15-m` | 中 | 核对能效等级、短路能力和型号后缀 |
| `/product_detail/Amorphous_alloy_transformer.html` | Amorphous Alloy Transformer | 未来非晶合金变压器分类页 | 低 | 泛化主题页；建设独立海外分类页并加入选型、标准、产品内链和询盘入口 |

## 汇总与执行规则

- 高置信度：11 个；
- 中置信度：7 个；
- 低置信度：1 个；
- `.cn` 永久保持公开只读观察，不进入待改造或待迁移清单；
- 高相似度页面用于监测关键词竞争，并增强 `.com` 的海外差异化卖点、标准、交付与 RFQ 内容；
- 中相似度页面由技术/产品人员判断 `.com` 是否需要新建独立容量或版本页面；
- 低相似度页面优先在 `.com` 建立真正的分类或主题页；
- 不复制 `.cn` 正文，不依赖 `.cn` 权重，也不规划任何从 `.cn` 到 `.com` 的跳转。
