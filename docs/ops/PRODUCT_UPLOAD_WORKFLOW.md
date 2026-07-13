# 产品资料上传与导入流程

本文档用于以后需要从产品手册、图片目录或其他资料中批量新增产品时复用。目标是保证产品内容、图片资源、分类、前台读取和服务器数据保持一致。

## 适用场景

- 从 PDF、Word、图片目录或产品表格中提取产品资料。
- 将产品新增到后台产品模块。
- 图片需要进入资源库，并和产品建立关联。
- 需要同时维护当前正式语言 `en/ar/fr/ru` 的内容。
- 只做数据导入，不改前台 UI、布局、样式和交互。

## 基本原则

1. 先读项目代码和数据库结构，再导入数据。
2. 图片必须通过资源库上传接口进入 `assets`，不能只写本地绝对路径。
3. 产品封面应通过 `cover_image` 使用资源库返回的相对路径，例如 `uploads/asset-xxx.webp`。
4. 产品创建或更新必须走现有后台产品结构，确保 `products`、`product_specs`、`product_media` 保持一致。
5. 阿拉伯语内容按自然阿拉伯语表达录入，不要反转字符顺序；RTL 显示由前端方向样式负责。
6. 服务器只通过后台 API 或从 GitHub 拉取代码更新，不在服务器上直接编辑代码文件。
7. 每次导入前按 `legacy_id` 或 `slug` 查重；已存在则更新，不存在再新增。

## 导入前检查

1. 确认资料文件和图片目录存在。
2. 确认本地服务健康：

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:3000/api/health
```

3. 查询目标分类是否存在。如果目标分类不存在，但已有正确父类，应先创建子分类。
4. 查询是否已有同类产品，避免重复导入。
5. 检查接口和表结构：
   - 后台产品接口：`server/routes/admin/products.js`
   - 后台资源库接口：`server/routes/admin/assets.js`
   - 后台分类接口：`server/routes/admin/categories.js`
   - 前台产品接口：`server/routes/products.js`
   - 数据库连接：`server/lib/db.js`

## 内容整理规则

每个产品至少整理这些字段：

- `legacy_id`
- `slug`
- `category_id`
- `status`
- `name_en`
- `name_ar`
- `short_desc_en`
- `short_desc_ar`
- `description_en`
- `description_ar`
- `seo_title`
- `seo_description`
- `seo_keywords`
- `seo_title_ar`
- `seo_description_ar`
- `seo_keywords_ar`
- `seo_title_fr`
- `seo_description_fr`
- `seo_keywords_fr`
- `seo_title_ru`
- `seo_description_ru`
- `seo_keywords_ru`
- `cover_image`
- `gallery`（可选，最多 6 张，不含封面）
- `specs`

参数建议按三类写入：

- `capacity`：前台会映射为容量标签。
- `voltage`：前台会映射为电压标签。
- `technical`：前台会映射为通用规格表。

示例：

```json
[
  { "spec_group": "capacity", "spec_key": "Capacity", "spec_value": "100", "unit": "kW", "sort_order": 0 },
  { "spec_group": "voltage", "spec_key": "Voltage", "spec_value": "690V AC", "unit": "", "sort_order": 0 },
  { "spec_group": "technical", "spec_key": "Protection degree", "spec_value": "IP65", "unit": "", "sort_order": 0 }
]
```

## 图片上传流程

1. 登录后台，获取 JWT。
2. 调用资源库上传接口：

```http
POST /api/admin/assets/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

表单字段：

- `file`：图片文件。
- `module=products`
- `entity_type=product`

建议上传时使用 ASCII 文件名，避免中文文件名在 multipart 或服务器环境中出现编码差异。

上传成功后记录：

- `asset.id`
- `asset.path`
- `asset.checksum`
- 是否复用已有资源：`asset.reused`

产品保存时将封面资源的 `asset.path` 写入 `cover_image`；其他视角图片按展示顺序写入 `gallery`。后台产品接口会在 `product_media` 中关联对应 `assets.id`，封面固定为 `is_cover=1, sort_order=1`，图库从 `sort_order=2` 开始连续保存。

后台界面中的图库操作规则：

1. 封面始终是前台第 1 张，不要重复加入图库。
2. 图库最多 6 张；达到上限后先删除不需要的图片再继续添加。
3. 使用前移、后移按钮调整顺序，不依赖拖拽。
4. 保存后关闭并重新打开产品，确认数量和顺序仍一致。
5. 产品只有封面时保持图库为空，前台不会显示空缩略图区。

前台缩略图不会直接下载图库原始大图。公开详情接口同时返回原图 `src` 和缩略图 `thumbnailSrc`：主图与 SEO 继续使用原图，缩略图按需生成 `320x240` WebP 并缓存到 `uploads/.cache/product-gallery/`。该目录是可再生成的派生缓存，不属于 `product_media` 或 `assets` 业务数据；`npm run images:audit` 会单独报告缓存文件数量，并将其排除在孤儿上传文件之外。

## 产品创建或更新流程

1. 调用后台产品列表接口按 `legacy_id` 或 `q` 查重。
2. 不存在时调用：

```http
POST /api/admin/products
Authorization: Bearer <token>
Content-Type: application/json
```

3. 已存在时先读取详情拿到 `version`，再调用：

```http
PUT /api/admin/products/:id
Authorization: Bearer <token>
Content-Type: application/json
```

4. 创建或更新 payload 必须包含：

- 产品基础字段。
- `category_id`，且必须是父分类下的子分类。
- `cover_image`，值为资源库返回的相对路径。
- `gallery`，需要多图时按前台展示顺序传入资源相对路径；不需要多图时创建可省略或传空数组。
- `specs`，按 `capacity`、`voltage`、`technical` 组织。

### 四语 SEO 信息

产品后台的 SEO 区域按 `EN / AR / FR / RU` 四个标签切换，每种语言都包含标题、描述和关键词三个输入项。切换标签只改变当前可见面板，不会清空其它语言已经填写的值；阿语面板使用 RTL 输入方向。

字段映射如下：

| 语言 | 标题 | 描述 | 关键词 |
| --- | --- | --- | --- |
| 英语 | `seo_title` | `seo_description` | `seo_keywords` |
| 阿语 | `seo_title_ar` | `seo_description_ar` | `seo_keywords_ar` |
| 法语 | `seo_title_fr` | `seo_description_fr` | `seo_keywords_fr` |
| 俄语 | `seo_title_ru` | `seo_description_ru` | `seo_keywords_ru` |

阿语标题建议 20-70 字符，描述建议 90-160 字符，关键词填写 3-6 个不重复主题短语。型号、容量、电压和国际代码应与产品资料一致，不得增加来源中不存在的认证、性能或用途承诺。

阿语 SEO 标题和描述会供阿语产品详情页的 title、description、Open Graph、Twitter 和 JSON-LD 使用；字段为空时继续回退到现有阿语名称和简介。`seo_keywords_ar` 仅供后台内容管理，不进入公开产品 API，也不输出 meta keywords。

生产环境只有完成 Schema v6 迁移后才具备这三个阿语字段。迁移前不得在生产后台声称已保存阿语独立 SEO；代码部署、Schema 迁移和批量内容回填必须分别验收。

批量回填的 forward 文件可以在 `approval_status=pending` 时执行 dry-run 和内容审计，但不能 apply；独立阿语审批完成后必须显式改为 `approved`。rollback 必须通过 `--paired-forward` 指向该已审批 forward 文件，且摘要、产品身份及三个字段的正反映射完全一致，否则拒绝执行。

更新接口的图库语义必须区分：

- 省略 `gallery`：保留现有图库；只修改封面时服务端仍会排除与新封面重复的图库项。
- 提交 `gallery: []`：清空图库。
- 提交非空 `gallery`：按数组顺序覆盖图库；服务端最终执行去重和 6 张上限校验。

## 本地验证清单

导入后必须验证：

1. 后台产品列表能看到目标产品。
2. 产品归属目标分类。
3. 后台产品详情中英文和阿拉伯语字段均非空。
   - Schema v6 上还应切换四个 SEO 标签，确认阿语标题、描述、关键词保存后刷新仍存在，且英/法/俄值未变化。
4. `product_media.asset_id` 已关联到资源库 `assets.id`。
5. 封面图访问返回 200：

```http
GET /uploads/asset-xxx.webp
```

6. 前台列表能按分类读取：

```http
GET /api/products?category=<category-slug>
```

7. 前台详情能按 `legacy_id` 读取：

```http
GET /api/products/<legacy_id>
```

8. 前台返回字段包含：

- `name`
- `nameAr`
- `shortDesc`
- `shortDescAr`
- `description`
- `descriptionAr`
- `seoTitleAr`
- `seoDescriptionAr`
- `image`
- 详情接口的 `images`（封面第一、顺序与后台一致，包含原图 `src` 和缩略图 `thumbnailSrc`）；产品列表接口不得返回完整图库
- `category`
- `specs`
- `capacities`
- `voltages`

公开接口不返回 `seoKeywordsAr`，页面也不输出 meta keywords；不得把关键词字段是否出现在页面源码中作为保存成功的判断依据。

多图产品还必须完成真实页面验收：

1. 桌面端缩略图位于主图右侧，手机端位于主图下方且页面无横向溢出。
2. 鼠标、触摸和键盘选择缩略图后，主图、选中态和计数同步变化。
3. `en/ar/fr/ru` 均能显示同一媒体顺序，阿语 RTL 方向自然。
4. 真实单图产品没有缩略图、计数、翻页按钮或空图库容器。
5. 原始 HTML 已包含主图和多图缩略图；主图继续作为 SEO 主图。
6. 缩略图请求返回 `image/webp` 且无 404；点击缩略图后主图切换到对应原始 `src`，不得把缩略图放大为主图。
7. 使用代表性真实大图复测首屏传输和 LCP；图库新增传输不得超过任务约定阈值，不能用小体积占位图代替真实样本。

## 产品图片资源关联补偿

如果 `npm run images:audit` 显示 `product_media.asset_id`、`product_media missing active asset paths` 或 `product asset_references missing` 仍有缺口，优先使用产品媒体专用修复入口，不使用会全量重建所有模块引用的旧 backfill。

Dry-run：

```powershell
npm run images:repair-product-links
```

Apply：

```powershell
npm run images:repair-product-links -- --apply
```

验证：

```powershell
npm run images:verify-product-links
npm run images:audit
```

该入口只处理产品图片链路：

- 为 `product_media.path` 中存在但 `assets` 缺失的本地文件补 `assets` 行。
- 按路径补回或修正 `product_media.asset_id`。
- 只重建受影响产品 owner 的 `asset_references`，不清空其他模块引用。

生产环境执行 `--apply` 属于数据库写入，必须先 dry-run、确认备份、说明回滚与验证方式，并取得明确确认后再执行。生产服务器执行这些命令时必须显式使用 Node 24 环境。

给生产产品新增、删除或重排图库同样属于生产数据库写入。代码部署授权不包含图库数据试点；必须另行确认目标产品、图片来源、顺序、备份和回滚方式后，才能通过生产后台保存。

## 服务器同步流程

数据导入到服务器时优先走服务器后台 API，不直接修改服务器代码。

推荐方式：

1. 建立临时 SSH 隧道，将本地端口转发到服务器本机服务：

```powershell
ssh -N -L 3301:127.0.0.1:3000 longxiang
```

2. 通过 `http://127.0.0.1:3301` 调用服务器后台 API。
3. 从服务器 `.env` 读取后台账号配置，不要把密码写入文档、脚本或提交。
4. 重复本地导入流程：
   - 创建缺失分类。
   - 上传图片到服务器资源库。
   - 创建或更新产品。
   - 验证后台和前台接口。
5. 结束后关闭 SSH 隧道。

如果本次涉及代码或脚本变更，仍按项目 Git 流程执行：

1. 本地修改。
2. 本地验证。
3. `git add`。
4. `git commit`，提交信息使用中文。
5. `git push` 到 GitHub。
6. 服务器执行 `git pull`，再按需要重启服务。

纯数据导入一般不需要提交数据库文件，因为 `data/*.db` 和 `uploads/*` 已被 `.gitignore` 忽略，应通过后台 API 同步到服务器。

## 导入结果记录模板

每次完成后记录以下信息：

```markdown
## 导入记录

- 日期：
- 资料来源：
- 图片来源：
- 目标分类：
- 是否创建新分类：
- 产品：
  - ID：
  - legacy_id：
  - slug：
  - 英文名称：
  - 阿拉伯语名称：
  - 图片路径：
  - 资源 ID：
  - 参数数量：
- 验证：
  - 后台列表：
  - 后台详情：
  - 图片访问：
  - 资源关联：
  - 前台列表：
  - 前台详情：
```

## 2026-06-19 光伏并网设备导入记录

- 资料来源：`D:\LX\产品册\新能源设备产品手册（最终版）.pdf`
- 图片来源：`C:\Users\hnlxd\Desktop\picture2`
- 新增分类：`Grid-Connected PV Equipment`
- 分类 ID：`17`
- 父分类：`New Energy Equipment`

服务器最终导入结果：

| 产品 ID | legacy_id | 英文名称 | 阿拉伯语名称 | 图片路径 | 资源 ID | 参数数量 |
| ---: | --- | --- | --- | --- | ---: | ---: |
| 52 | `grid-connected-pv-box` | Grid-Connected PV Box | صندوق ربط كهروضوئي بالشبكة | `uploads/asset-1781867281347-31018d5308a3.webp` | 16 | 27 |
| 53 | `pv-combiner-box` | PV Combiner Box | صندوق تجميع كهروضوئي | `uploads/asset-1781872630474-e42f9c6f847a.webp` | 17 | 26 |
| 54 | `grid-connected-pv-cabinet` | Grid-Connected PV Cabinet | خزانة ربط كهروضوئية بالشبكة | `uploads/asset-1781872631405-4a4483d19206.webp` | 18 | 34 |

验证结果：

- 后台分类产品列表返回 3 条。
- 三个产品 `category_id` 均为 `17`。
- 三张封面图访问均返回 200。
- 三个产品均有 `product_media.asset_id`。
- 英文和阿拉伯语字段均已填写。
- 前台 `/api/products?category=grid-connected-pv-equipment` 返回 3 条。
- 前台 `/api/products/<legacy_id>` 三个详情接口均可读取。
