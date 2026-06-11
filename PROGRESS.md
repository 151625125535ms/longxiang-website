# 实施进度

## Phase 0 ✅ 已完成

- 产品：39 条，category slug 10 个，group 4 个
- 证书：76 条，4 类（qualifications/patents/software-copyrights/test-reports-extra）
- 询盘：1 条
- products.images[] 不存在，只有 image，迁移只需处理封面图
- company.json schema 已更新，camelCase 字段名与原 JSON 保持一致
- ga4TrackingId 归入 admin_settings，footerText 归入 page-blocks
- GET /api/company 兼容层组装规则已写入 IMPLEMENTATION_PLAN.md
- 现有公开 API 已确认，GET /api/inquiries 已是需认证接口

## Phase 1 ✅ 已完成

- [x] better-sqlite3 已安装
- [x] server/lib/db.js（USE_SQLITE/ADMIN_SQLITE_REQUIRED 开关）
- [x] server/db/schema.sql（11 张表 + 索引）
- [x] server/db/init.js（幂等建表，schema version: 1）
- [x] server/db/backup.js
- [x] server/db/migrate.js（迁移完成）
  - products: 39，product_media: 39，product_specs: 904
  - certifications: 76，content_blocks: 7，inquiries: 1
  - categories: 14（product:10, certification:4）
  - admin_settings: 2（modules + ga4TrackingId）
- [x] server/db/status.js
- [x] 旧公开 API 兼容层（USE_SQLITE=true 时读 SQLite）
  - GET /api/products → 39 条，字段完整
  - GET /api/products/:id → 单条正常
  - GET /api/certifications → 76 条，legacy_category 映射正确
  - GET /api/company → 结构正确（company-overview + contact + page-blocks footer + admin_settings ga4）
  - GET /api/education → 6 sections（education.json 迁移）
  - POST /api/inquiries → 201 OK，写入 SQLite
- [x] /api/health 增加 SQLite 状态（enabled/available/schemaVersion）

### 冒烟测试结果（USE_SQLITE=true）

| 端点 | 状态 | 备注 |
|------|------|------|
| GET /api/health | ✓ | sqlite.enabled=true, available=true, schemaVersion=1 |
| GET /api/products | ✓ | 39 条 |
| GET /api/products/:id | ✓ | 字段完整 |
| GET /api/certifications | ✓ | 76 条 |
| GET /api/company | ✓ | 结构正确，company-overview/contact 空值为设计预期 |
| GET /api/education | ✓ | 6 sections |
| POST /api/inquiries | ✓ | 201，写入 SQLite |

### 已知问题

- product category label mismatch 7 处（dry-type/oil-immersed/combined），Phase 0 已知，保留首次出现的 label
- company-overview / contact 的 body_json 为默认空值，需由管理员在 Phase 3 后台 UI 填写

## Phase 2 ✅ 已完成

后台 API 稳定化，路由目录：server/routes/admin/

### 已实现文件

| 文件 | 端点 |
|------|------|
| helpers.js | sendError / getClientIp / insertAuditLog 公共工具 |
| index.js | authMiddleware + requireSqlite 统一中间件，10 条子路由挂载 |
| dashboard.js | GET /api/admin/dashboard |
| system.js | GET /api/admin/system/status |
| categories.js | GET/POST/PUT/DELETE /api/admin/categories |
| products.js | GET/POST/PUT/DELETE /api/admin/products + /batch |
| certifications.js | GET/POST/PUT/DELETE /api/admin/certifications + /batch |
| content-blocks.js | GET/PUT /api/admin/content-blocks + /batch |
| inquiries.js | GET/PUT/DELETE /api/admin/inquiries + /batch |
| settings.js | GET/PUT /api/admin/settings/modules |
| audit-logs.js | GET /api/admin/audit-logs |
| assets.js | GET/POST/DELETE /api/admin/assets |

### 设计规范符合情况

- 统一响应格式 { ok, data, meta } ✅
- 错误码与 HTTP 状态映射（400/401/403/404/409/422/500/503）✅
- 乐观锁版本控制（products/certifications/content-blocks）✅
- Batch 全成功或全回滚，versionMap 事务外预检 ✅
- SQLite 不可用时全部 admin 路由返回 503 ✅
- 写操作全部记录 audit_log ✅
- 不读写任何 JSON 文件 ✅

## Phase 3 ✅ 已完成

后台信息架构与核心模块 UI

### 已完成内容

| 步骤 | 文件 | 内容 |
|------|------|------|
| Step 3.1 | admin/index.html, admin/js/admin.js, admin/css/admin.css | 分组二级导航骨架（概况/网站管理/设置），15 个新视图占位 section |
| Step 3.2 | admin/index.html, admin/js/admin.js | 产品管理接入 /api/admin/products，分类筛选动态加载，乐观锁 version |
| Step 3.3 | admin/index.html, admin/js/admin.js | 询盘/证书/内容块接入 /api/admin/*，4 个证书子视图，7 个内容块 JSON 编辑器 |

### 设计规范符合情况

- API_BASE 改为绝对路径 /api ✅
- 所有模块调用 /api/admin/* 后台接口 ✅
- 乐观锁（products/certifications/content-blocks）version 传递正确 ✅
- 409 VERSION_CONFLICT 有用户提示 ✅
- 旧 view-company/view-certifications/view-education 已清除 ✅

## Phase 4 ✅ 已完成

管理能力补齐

| 步骤 | 状态 | 文件 | 内容 |
|------|------|------|------|
| Step 4.1 | ✅ | admin/index.html, admin/js/admin.js | 系统状态视图、模块开关、审计日志（带分页） |
| Step 4.2 | ✅ | admin/index.html, admin/js/admin.js | 产品分类管理 CRUD（新增/编辑/删除） |
| Step 4.3 | ✅ | admin/index.html, admin/js/admin.js | 产品/证书批量操作（全选 checkbox、批量发布/下架/软删/永删，versionMap，409 处理） |
| Step 4.4 | ✅ | admin/index.html, admin/js/admin.js | 回收站（已删产品/证书列表、单条恢复、批量恢复、批量永久删除） |
| Step 4.5 | ✅ | admin/index.html, admin/js/admin.js | 资源库视图（文件列表 + 分页 + 删除，接入 /api/admin/assets） |

## Phase 5 ⏳ 未开始

前台接口优化

- 前台统一请求层（缓存、请求去重、请求取消）
- 产品/证书列表分页加载
- 错误兜底展示
- 不改前台视觉、不改公开 API 响应结构

## Phase 6 ⏳ 未开始

部署、回退演练与验收

- 本地验收通过后提交 git
- 服务器安装依赖（Node/npm、PM2、Python3、build-essential 用于 better-sqlite3）
- 运行 `npm run db:migrate` 迁移数据
- PM2 reload，`USE_SQLITE=true` 验证
- 验证 `USE_SQLITE=false` 公开前台回退 JSON
- 性能指标确认
