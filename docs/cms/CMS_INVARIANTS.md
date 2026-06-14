# CMS 优化任务 — 绝对禁止清单

> 每次写代码前必读。违反任何一条，立即停止并重新评估。

---

## 代码禁令

### 禁止创建以下函数（任何文件，任何位置）

- `mapEducationPublicResponse()`
- `mapEducationFields()`
- `convertEducationSchema()`
- 任何以"convert"/"map"/"transform"命名的 education schema 转换函数

**原因**：经 SSH 核查，服务器 education body_json 已使用老 schema（title/titleAr），
前台完全兼容。GET /api/education 直接返回 body_json 是正确行为，不需要任何映射层。

---

### 禁止在 education body_json 中使用以下字段名

- `title_en`、`title_ar`、`title_cn`
- `subtitle_en`、`subtitle_ar`、`subtitle_cn`
- `hero.title_en`、`section.title_en`、`cta.title_en`（及对应 _ar/_cn）

**原因**：education 使用老 schema（title/titleAr），引入 _en/_ar 后缀会破坏前台。

---

### 禁止修改 GET /api/education 的返回逻辑

当前 [server/routes/education.js:186-197](server/routes/education.js#L186) 在
USE_SQLITE=true 时直接返回 `JSON.parse(row.body_json)`，这是正确的，不要添加字段映射。

---

### 禁止为 content_blocks 添加删除类 batch action

- 禁止在 `BATCH_ACTIONS` 中加入 `soft_delete`、`restore`、`hard_delete`
- content_blocks 的 BATCH_ACTIONS 只能是 `['publish', 'unpublish']`

**原因**：7 个内容块是系统骨架，删除任何一块都会导致公开 API 空数据。

---

### 禁止插入 categories(type='content') 数据

- 禁止在迁移脚本或 seed 中插入 `type='content'` 的分类数据
- content_blocks 表没有 category_id 外键，content 分类数据是孤立数据

---

### 禁止修改公开 API 的响应结构

以下接口的响应体格式必须保持不变（不能包裹 { ok, data, meta }）：
- `GET /api/company`
- `GET /api/education`
- `GET /api/products`
- `GET /api/certifications`

---

## 设计决策（已锁定，不允许重新讨论）

| 决策 | 结论 |
|------|------|
| education 旧 editor 治理方式 | 返回 410 Gone，不实现"改写 SQLite"路径 |
| 进程内内容缓存 | 不做，PM2 单进程、7 条记录无需缓存 |
| categories(type='content') seed | 不做，无消费方 |
| extra 字段处理 | PUT /:slug 保存时若请求不含 extra，自动保留 before.body_json.extra |
| page-blocks 系统 key | 服务端校验 footer + home-cta 必须存在，缺失返回 422 |

---

## 架构约束

- 所有后台写入必须走 `/api/admin/content-blocks`，不得绕过到旧 JSON 接口
- 所有后台 API 响应必须是 `{ ok, data, meta }` 格式
- 每次保存必须携带 `version`，不允许静默覆盖
- 不新增表、不新增公开 API 路由、不新增后台一级模块
