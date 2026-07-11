# 阶段一：`lxelec.cn` 英文产品页到 `.com` 的候选映射

盘点日期：2026-07-11

## 边界与方法

- 只读取 `lxelec.cn` 公开 sitemap 中的 19 个产品详情 URL、页面 H1、状态码和 canonical；
- 目标产品来自 `https://www.lxenelectric.com/api/products` 当前公开的 38 个产品；
- 19 个 `.cn` 产品 URL 均返回 200，并 self-canonical；
- 本表只用于迁移设计，不代表已经批准或执行 301；
- 真正重定向前仍需核对 `.cn` Search Console 的点击、曝光和外链，并由产品人员确认技术等价性。

置信度定义：

- 高：型号、产品类型和主要能力一致，可进入一对一迁移候选；
- 中：属于同一产品族，但容量、版本、命名或系列合并方式不同；
- 低：没有明确等价单品，不应强制跳转到近似产品。

## 完整候选映射

| `.cn` 英文产品 URL | 页面 H1 | `.com` 候选承接 URL | 置信度 | 迁移前检查 |
|---|---|---|---|---|
| `/product_detail/1296874736991305728.html` | Full Fusion Large Capacity Network Charging Reactor Products – 1600kW Series | `/products/lxdc480-1280kw` | 中 | `.cn` 为 1600kW，`.com` 当前为 480–1280kW，容量不等价；确认是否需要新建 1600kW 页面 |
| `/product_detail/1296873941302976512.html` | Split Single Cabinet Flexible Charging Stack – 360–480kW | `/products/lxdc480-1280kw` | 中 | 同为充电堆，但容量区间和柜体组合不同；不能仅凭名称执行 301 |
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
| `/product_detail/Amorphous_alloy_transformer.html` | Amorphous Alloy Transformer | 未来非晶合金变压器分类页 | 低 | 泛化主题页；当前没有等价分类 URL，不能重定向到任一单品 |

## 汇总与执行规则

- 高置信度：11 个；
- 中置信度：7 个；
- 低置信度：1 个；
- 当前不执行任何 `.cn` 重定向；
- 高置信度也必须等 `.cn` GSC 流量和外链导出后才能确定优先级；
- 中置信度必须由技术/产品人员确认容量、型号、结构和应用等价性；
- 低置信度页面应先在 `.com` 建立真正的分类或主题承接页；
- 不允许把 19 个产品页批量跳转到 `.com` 首页或产品总目录。
