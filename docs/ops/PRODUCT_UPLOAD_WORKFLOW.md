# 产品资料上传与导入流程

本文档用于以后需要从产品手册、图片目录或其他资料中批量新增产品时复用。目标是保证产品内容、图片资源、分类、前台读取和服务器数据保持一致。

## 适用场景

- 从 PDF、Word、图片目录或产品表格中提取产品资料。
- 将产品新增到后台产品模块。
- 图片需要进入资源库，并和产品建立关联。
- 需要同时维护英文和阿拉伯语内容。
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
- `cover_image`
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

产品保存时将 `asset.path` 写入 `cover_image`，后台产品接口会在 `product_media` 中用该路径关联对应 `assets.id`。

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
- `specs`，按 `capacity`、`voltage`、`technical` 组织。

## 本地验证清单

导入后必须验证：

1. 后台产品列表能看到目标产品。
2. 产品归属目标分类。
3. 后台产品详情中英文和阿拉伯语字段均非空。
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
- `image`
- `category`
- `specs`
- `capacities`
- `voltages`

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
