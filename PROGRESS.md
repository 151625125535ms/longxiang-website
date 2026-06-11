# 实施进度

## Phase 0 ✅ 已完成

## \- 产品：39 条，category slug 10 个，group 4 个

## \- 证书：76 条，4 类（qualifications/patents/software-copyrights/test-reports-extra）

## \- 询盘：1 条

## \- products.images\[] 不存在，只有 image，迁移只需处理封面图

## \- company.json schema 已更新，camelCase 字段名与原 JSON 保持一致

## \- ga4TrackingId 归入 admin\_settings，footerText 归入 page-blocks

## \- GET /api/company 兼容层组装规则已写入 IMPLEMENTATION\_PLAN.md

\- 现有公开 API 已确认，GET /api/inquiries 已是需认证接口
## Phase 1 🔄 进行中
---

## \- \[x] better-sqlite3 已安装

## \- \[x] server/lib/db.js（USE\_SQLITE/ADMIN\_SQLITE\_REQUIRED 开关）

## \- \[x] server/db/schema.sql（11 张表 + 索引）

## \- \[x] server/db/init.js（幂等建表，schema version: 1）

## \- \[x] server/db/backup.js

## \- \[x] server/db/migrate.js（迁移完成）

## &#x20; - products: 39，product\_media: 39，product\_specs: 904

## &#x20; - certifications: 76，content\_blocks: 7，inquiries: 1

## &#x20; - categories: 14（product:10, certification:4）

## &#x20; - admin\_settings: 2（modules + ga4TrackingId）

## \- \[x] server/db/status.js

## \- \[ ] 旧公开 API 兼容层（USE\_SQLITE=true 时读 SQLite）

\- \[ ] /api/health 增加 SQLite 状态
Phase 2 ⏳ 未开始
---

后台 API 稳定化

## Phase 3 ⏳ 未开始

后台信息架构与核心模块 UI

## Phase 4 ⏳ 未开始

管理能力补齐

## Phase 5 ⏳ 未开始

前台接口优化

## Phase 6 ⏳ 未开始

部署、回退演练与验收
