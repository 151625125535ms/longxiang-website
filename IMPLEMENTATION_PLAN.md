# Longxiang 后台前后端优化完整计划：SQLite 渐进迁移 + 可回退后台重构

## Summary

本方案固定为 **第 0 阶段到第 6 阶段，共 7 个阶段**；第 0 阶段仅做只读基线审计与范围冻结，不写代码、不改数据。实施顺序为：先数据层，再后台 API，再后台 UI，再管理能力补齐，再前台优化，最后部署与验收。

目标是在完整保留现有前台视觉、页面结构和公开访问路径的前提下，引入 SQLite 渐进迁移，重构后台为可管理、可回退、可扩展的产品/内容/证书/询盘管理系统。第一版不做新闻资讯、不做独立 SEO 模块、不做教育合作一级模块、不显示未实现导航。

## Phase Plan

- 第 0 阶段：基线审计与范围冻结
  只读统计现有 JSON、API、后台页面、前台调用点；确认迁移验收数字和字段映射表。重点审计 `company.json` 完整字段，确保旧 `GET /api/company` 顶层字段在 SQLite 兼容输出中不丢失。

- 第 1 阶段：SQLite 基础层与回退开关
  建库、建表、索引、分类 seed、完整 7 个 `content_blocks` seed、迁移脚本、`USE_SQLITE`、`ADMIN_SQLITE_REQUIRED`、旧公开 API 兼容层。

- 第 2 阶段：后台 API 稳定化
  完成产品、内容块、证书、询盘、资源、审计、模块开关、系统状态 API；固定统一响应、分页、版本冲突、per-resource batch。

- 第 3 阶段：后台信息架构与核心模块 UI
  Step 3.1 做顶部/左侧/二级栏目导航骨架；Step 3.2 接入产品管理；Step 3.3 接入内容、证书、询盘。

- 第 4 阶段：管理能力补齐
  完成分类管理、回收站、批量操作、资源库引用展示、审计日志查询、模块开关页、系统状态页。

- 第 5 阶段：前台接口优化
  后台 API 稳定后，再做前台统一请求层、缓存、请求去重、请求取消、分页加载、错误兜底；不改前台视觉。

- 第 6 阶段：部署、回退演练与验收
  本地验证后提交、服务器安装依赖、迁移、PM2 reload、验证 `USE_SQLITE=true/false` 回退和性能指标。

## Data Model And Migration

- 使用 SQLite + `better-sqlite3`，数据库默认 `data/longxiang.db`；保留现有 JSON 作为迁移源和公开 API 回退源。
- 核心表：`schema_migrations`、`products`、`product_media`、`product_specs`、`categories`、`certifications`、`content_blocks`、`inquiries`、`assets`、`audit_logs`、`admin_settings`。
- `products` 保留兼容字段：`legacy_id`、`product_group`、`sub_category`、`aliases_json`，并包含 `seo_title/seo_description/seo_keywords`、`version`、`created_at`、`updated_at`。
- `product_specs` 使用 `spec_group/spec_key/spec_value/unit/sort_order`，`spec_group` 第一版固定为 `capacity / voltage / technical`。
- `product_media` 迁移规则：
  - `products.image` -> 封面图，`is_cover=1`，`sort_order=0`。
  - `products.images[]` -> 附加图，`is_cover=0`，`sort_order=index+1`。
  - 重复路径跳过；无图片允许为空。
- `certifications` 保留 `legacy_category`，便于旧公开 API 输出 `category`。
- `content_blocks` 使用 `slug + body_json`，固定 7 个 slug：`company-overview`、`about-us`、`contact`、`applications`、`innovation`、`education`、`page-blocks`。
- Phase 1 开始前必须补入完整 7 个 `body_json` 默认 schema，迁移 seed 不允许用 `{}` 空占位，不允许未知 slug。
- `inquiries` 迁移现有 `data/inquiries.json`；状态固定为 `new/read/replied/closed/deleted`。
- `assets` 第一版记录上传来源和路径，不做复杂 DAM；删除只设 `is_active=0`。
- `audit_logs` 包含 `entity_type/entity_id/action/performed_by/request_id/before_json/after_json/ip/user_agent/created_at`。
- 时间字段统一 Unix 毫秒时间戳；软删除以 `status='deleted'` 为主，询盘额外保留 `deleted_at`。

分类 seed 必须先于产品/证书迁移执行：

- 产品分类：从现有 `products.json` 按数组顺序提取 `category/categoryLabel/categoryLabelAr/group/subCategory`，`slug = product.category || product.subCategory`，按 `UNIQUE(type, slug)` 使用 `INSERT OR IGNORE`，即先出现的胜出；同 slug label 不一致时不覆盖，输出迁移 warning。
- 证书分类固定 seed：`qualifications`、`patents`、`software-copyrights`、`test-reports-extra`。
- 内容分类固定 seed：7 个 `content_blocks` slug。

7 个 `body_json` 默认 schema 固定如下：

```json
{
  "slug": "company-overview",
  "body_json": {
    "name": "",
    "nameAr": "",
    "nameCN": "",
    "founded": "",
    "stockCode": "",
    "registeredCapital": "",
    "registeredCapitalAr": "",
    "factoryArea": "",
    "factoryAreaAr": "",
    "patents": "",
    "researchPartners": "",
    "description": "",
    "descriptionAr": "",
    "aboutIntro": "",
    "aboutIntroAr": "",
    "aboutDetail": "",
    "aboutDetailAr": "",
    "cover_image": "",
    "stats": [],
    "seo": { "title": "", "description": "", "keywords": "" }
  }
}
```

```json
{
  "slug": "contact",
  "body_json": {
    "address": "",
    "addressAr": "",
    "headquarters": "",
    "headquartersAr": "",
    "phone": "",
    "email": "",
    "officeHours": "",
    "officeHoursAr": "",
    "huaiyangBase": "",
    "huaiyangBaseAr": "",
    "whatsapp": "",
    "whatsappQr": "",
    "wechat": "",
    "wechatQr": "",
    "skype": "",
    "line": "",
    "lineQr": "",
    "tiktok": "",
    "instagram": "",
    "youtube": "",
    "googleMapsUrl": "",
    "googleMapsEmbedUrl": "",
    "googleMyMapsEmbedUrl": "",
    "openStreetMapUrl": "",
    "mapLocations": {},
    "mapQr": "",
    "seo": { "title": "", "description": "", "keywords": "" }
  }
}
```

```json
{
  "slug": "education",
  "body_json": {
    "hero": {
      "title_en": "",
      "title_ar": "",
      "title_cn": "",
      "subtitle_en": "",
      "subtitle_ar": "",
      "subtitle_cn": "",
      "image": ""
    },
    "stats": [],
    "sections": [],
    "partners": [],
    "cta": {
      "title_en": "",
      "title_ar": "",
      "title_cn": "",
      "text_en": "",
      "text_ar": "",
      "text_cn": "",
      "button_text_en": "",
      "button_text_ar": "",
      "button_text_cn": "",
      "href": "contact.html"
    },
    "seo": { "title": "", "description": "", "keywords": "" }
  }
}
```

```json
{
  "slug": "about-us",
  "body_json": {
    "hero": {
      "title_en": "",
      "title_ar": "",
      "title_cn": "",
      "subtitle_en": "",
      "subtitle_ar": "",
      "subtitle_cn": "",
      "image": ""
    },
    "sections": [
      {
        "title_en": "",
        "title_ar": "",
        "title_cn": "",
        "body_en": "",
        "body_ar": "",
        "body_cn": "",
        "image": "",
        "layout": "text-image",
        "sort_order": 0
      }
    ],
    "milestones": [
      {
        "year": "",
        "title_en": "",
        "title_ar": "",
        "title_cn": "",
        "description_en": "",
        "description_ar": "",
        "description_cn": "",
        "sort_order": 0
      }
    ],
    "seo": { "title": "", "description": "", "keywords": "" }
  }
}
```

```json
{
  "slug": "applications",
  "body_json": {
    "hero": {
      "title_en": "Applications",
      "title_ar": "",
      "title_cn": "应用行业",
      "subtitle_en": "",
      "subtitle_ar": "",
      "subtitle_cn": "",
      "image": ""
    },
    "industries": [
      {
        "name_en": "",
        "name_ar": "",
        "name_cn": "",
        "summary_en": "",
        "summary_ar": "",
        "summary_cn": "",
        "image": "",
        "related_product_ids": [],
        "sort_order": 0
      }
    ],
    "seo": { "title": "", "description": "", "keywords": "" }
  }
}
```

```json
{
  "slug": "innovation",
  "body_json": {
    "hero": {
      "title_en": "Technology Innovation",
      "title_ar": "",
      "title_cn": "科技创新",
      "subtitle_en": "",
      "subtitle_ar": "",
      "subtitle_cn": "",
      "image": ""
    },
    "sections": [
      {
        "title_en": "",
        "title_ar": "",
        "title_cn": "",
        "body_en": "",
        "body_ar": "",
        "body_cn": "",
        "image": "",
        "sort_order": 0
      }
    ],
    "highlights": [
      {
        "label_en": "",
        "label_ar": "",
        "label_cn": "",
        "value": "",
        "sort_order": 0
      }
    ],
    "related_certification_ids": [],
    "seo": { "title": "", "description": "", "keywords": "" }
  }
}
```

```json
{
  "slug": "page-blocks",
  "body_json": {
    "blocks": [
      {
        "key": "home-cta",
        "title_en": "",
        "title_ar": "",
        "title_cn": "",
        "text_en": "",
        "text_ar": "",
        "text_cn": "",
        "image": "",
        "href": "contact.html",
        "is_active": true,
        "sort_order": 0
      },
      {
        "key": "footer",
        "footerText": "",
        "footerTextAr": "",
        "is_active": true,
        "sort_order": 1
      }
    ]
  }
}
```

`GET /api/company` 兼容层要求：

- Phase 0 输出完整 `company.json -> content_blocks` 字段映射表。
- 旧 `company.json` 顶层字段必须在 `USE_SQLITE=true` 的响应顶层保留。
- 可以在 `body_json.extra` 保存暂未分类字段，但兼容输出时必须展开回原顶层字段，不允许前台因字段进入 `extra` 而读取不到。

GET /api/company 兼容层组装规则（Phase 1 实施要点）：

- company-overview 和 contact 的 body_json 字段名与原 company.json 保持一致（camelCase）。
- 兼容层直接展开两个 body_json：`{ ...companyOverview.body_json, ...contact.body_json }`。
- `footerText/footerTextAr` 从 `page-blocks` 中 `key=footer` 的 block 读取后追加到顶层。
- `ga4TrackingId` 从 `admin_settings` 的 `key=ga4TrackingId` 读取后追加到顶层。
- `admin_settings` 迁移时插入 `key=ga4TrackingId`，value 从现有 `company.json.ga4TrackingId` 读取。

## API And Rollback

旧公开 API 保持原响应结构，不包 `{ ok, data }`：

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/company`
- `GET /api/certifications`
- `GET /api/education`
- `POST /api/inquiries`
- `GET /api/health`

不提供公开 `GET /api/inquiries`；询盘读取只能走后台。

新后台 API 统一响应：

```json
{ "ok": true, "data": {}, "meta": { "page": 1, "pageSize": 20, "total": 0 } }
```

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "校验失败" } }
```

后台 API：

- `/api/admin/dashboard`
- `/api/admin/products`、`/api/admin/products/batch`
- `/api/admin/categories`
- `/api/admin/certifications`、`/api/admin/certifications/batch`
- `/api/admin/content-blocks`、`/api/admin/content-blocks/batch`
- `/api/admin/inquiries`、`/api/admin/inquiries/batch`
- `/api/admin/assets`
- `/api/admin/audit-logs`
- `/api/admin/settings/modules`
- `/api/admin/system/status`

per-resource batch 统一请求：

```json
{ "action": "soft_delete", "ids": [1, 2], "payload": {}, "versionMap": { "1": 3 } }
```

Batch 第一版全成功或全回滚，不允许部分成功；`hard_delete` 必须 `payload.confirm === true`。参数非法返回 `422 VALIDATION_ERROR`。执行中冲突整体回滚返回 `409 BATCH_FAILED`。版本要求资源的 batch 必须先做事务前 `versionMap` 校验：先 SELECT 所有目标当前版本，对比通过后再进入事务；`versionMap` 缺少目标 id 返回 `422 VALIDATION_ERROR`，版本不一致以 `409 BATCH_FAILED` 返回并在 items 内标记 `VERSION_CONFLICT`。

错误码与 HTTP 状态固定：

- `BAD_REQUEST -> 400`
- `UNAUTHORIZED -> 401`
- `FORBIDDEN -> 403`
- `NOT_FOUND -> 404`
- `VERSION_CONFLICT -> 409`
- `BATCH_FAILED -> 409`
- `VALIDATION_ERROR -> 422`
- `UPLOAD_ERROR -> 422`
- `DATABASE_UNAVAILABLE -> 503`
- `INTERNAL_ERROR -> 500`

回退环境变量：

```env
USE_SQLITE=true
ADMIN_SQLITE_REQUIRED=true
```

- `USE_SQLITE` 只控制旧公开 API 来源。
- `/api/admin/*` 始终依赖 SQLite，不读写 JSON。
- `USE_SQLITE=false` 时公开 API 回退 JSON。
- SQLite 不可用时后台 API 返回 `503 DATABASE_UNAVAILABLE`。
- `/api/health` 和 `/api/admin/system/status` 必须显示 SQLite 开关、可用性、schema 版本和公开 API 当前来源。

## Admin IA And Scope

第一版导航只显示已实现模块：

```text
概况

网站管理
  产品管理
    产品列表
    分类管理
    属性参数
    推荐位
  内容管理
    企业概况
    关于我们
    应用行业
    科技创新
    联系我们
    教育合作
    页面区块
  证书资质
    企业资质
    专利证书
    软著
    检测报告
  询盘管理
    全部询盘
    新询盘
    已读
    已回复
    已关闭
    回收站
  资源库

设置
  系统状态
  模块开关
  审计日志
```

SEO 不作为独立导航、不提供 `/api/admin/seo`、不提供 SEO 独立表。SEO 仅作为产品/内容编辑页普通字段。教育合作归入内容管理，数据为 `content_blocks.slug=education`，不做一级模块。

第一版必须做：产品、内容、证书、询盘、资源库、系统状态、模块开关、审计日志、桌面端 1280px+ 后台。

明确不做：新闻资讯、独立 SEO 模块、营销管理、客户管理、安全中心、数据分析、多角色权限、审批流、草稿预览、可视化搭建、AI、完整 DAM、移动端后台完整适配、PostgreSQL、前台 UI 重设计、证书 OCR、PDF 在线解析、邮件客户端、CRM、多语言独立翻译工作流。

防膨胀规则：不在必须做清单里的功能不进入第一版；导航不显示未实现模块；API 不开放空模块；新能力必须归入产品、内容、证书、询盘、资源库或设置之一。

## Test Plan And Acceptance

迁移脚本命令：

- `npm run db:backup`
- `npm run db:migrate`
- `npm run db:status`

迁移要求：

- 可重复执行。
- 通过 `legacy_id` 和 `UNIQUE(type, slug)` 防重复。
- 所有写入使用事务。
- 迁移失败回滚。
- 不修改旧 JSON。
- 输出统计：`categories`、`products`、`product_media`、`product_specs`、`certifications`、`content_blocks`、`inquiries`、`assets`，其中 categories 需拆分输出 product/certification/content inserted/skipped/warned。

静态检查：

- `node --check server/app.js`
- `node --check server/routes/*.js`
- `node --check admin/js/admin.js`
- `node --check js/*.js`
- `git diff --check`

验收标准：

- `USE_SQLITE=true` 时旧公开 API 输出结构与迁移前一致。
- `USE_SQLITE=false` 时公开前台不依赖 SQLite。
- `/api/admin/*` 在 SQLite 不可用时返回 503。
- 后台不显示新闻、SEO 独立模块、教育合作一级模块或未实现模块。
- 产品媒体、规格、证书、询盘、内容块均可迁移并在后台管理。
- 产品/证书/内容保存遇到 `VERSION_CONFLICT` 时只提供“重新加载”，不提供强制覆盖。
- Batch 操作全成功或全回滚。
- 前台优化后视觉与页面结构不变。
- 部署失败时只需设置 `USE_SQLITE=false` 并 PM2 reload，即可让公开前台回退 JSON。

部署前必须确认服务器具备 Node/npm、PM2、Python3、`build-essential`，以支持 `better-sqlite3` 原生模块安装。
