# CMS 优化任务 — SSH 核查固化事实

> 以下事实均已通过 `ssh longxiang` 直接核查，不允许重新推断、质疑或推翻。
> 如需更新，必须先重新 SSH 验证，再修改本文件。

---

## 服务器状态（核查时间：2026-06-12）

- 服务：PM2 运行中，`instances: 1`（fork 模式，单进程）
- Node.js：已安装
- better-sqlite3：已安装（原生模块正常）
- 数据库：`data/longxiang.db`，WAL 模式**尚未启用**（待 Day 1 启用）

## content_blocks 数据（7 条，全部 status='published'）

| slug | 实际字段风格 |
|------|-------------|
| company-overview | camelCase（name, nameAr, stats, seo） |
| contact | camelCase（address, addressAr, phone, mapLocations, ...） |
| about-us | hero/sections/milestones，各含 title_en/title_ar/title_cn |
| applications | hero/industries，各含 name_en/name_ar/name_cn |
| innovation | hero/sections/highlights，各含 title_en/title_ar/title_cn |
| education | **老 schema**：hero.title/titleAr，section.title/titleAr，cta.title/titleAr |
| page-blocks | blocks 数组，包含 key='footer' 和 key='home-cta' |

## education 字段详情（最关键）

```
hero:     { eyebrow, title, titleAr, subtitle, subtitleAr, backgroundImage }
sections: [{ id, modeNumber, title, titleAr, tagline, taglineAr, ... }]
cta:      { title, titleAr, text, textAr, buttonText, buttonTextAr, href }
```

**前台 js/education.js:27 使用 `localized(item, key)` 读 `item[key]` + `item[keyAr]`。**
**当前 SQLite 数据与前台完全兼容，GET /api/education 直接返回 body_json 是正确的。**

## admin.js 调用点

- `admin/js/admin.js:2244`：`apiRequest('/education/editor', { method: 'PUT', body: payload })`
  → 这是旧写接口唯一调用方，Day 3 新结构化表单会替换它
- `admin/js/admin.js:2222`：`apiRequest('/education')` → GET /api/education 读取

## 环境变量（本地 .env）

```
USE_SQLITE=true
ADMIN_SQLITE_REQUIRED=true
```

## 数据库索引

已有：idx_content_blocks_slug（slug 列），PUT /:slug 走索引，无需额外优化。
