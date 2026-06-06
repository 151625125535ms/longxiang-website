# API 接口契约

> **协作规则**：任何一方（Claude / Codex）需要新增、修改或删除接口时，**先在本文件提交变更说明**，对方确认后再动代码。
> 前端使用接口前以本文档为准；后端实现以本文档为准。

---

## 基础信息

| 项目 | 值 |
|---|---|
| Base URL | `/api` |
| 数据格式 | `application/json` |
| 认证方式 | `Authorization: Bearer <token>`（写操作必须携带） |
| 端口 | `3000`（开发） |

---

## 认证 `/api/auth`

### POST `/api/auth/login`
登录，获取 JWT token。无需认证。

**请求体**
```json
{ "username": "admin", "password": "admin123" }
```

**成功响应** `200`
```json
{ "token": "<jwt>", "username": "admin" }
```

**失败响应** `401`
```json
{ "error": "Invalid username or password." }
```

---

### GET `/api/auth/verify`
校验 token 是否有效。需携带 `Authorization` 头。

**成功响应** `200`
```json
{ "valid": true }
```

**失败响应** `401`
```json
{ "valid": false }
```

---

## 产品 `/api/products`

### GET `/api/products`
获取产品列表。**无需认证**，前端公开页面可直接调用。

**查询参数（可选）**

| 参数 | 类型 | 说明 |
|---|---|---|
| `category` | string | 按分类筛选，见下方分类枚举 |
| `featured` | `"true"` | 只返回首页推荐产品 |

**分类枚举值**

| value | 显示名 |
|---|---|
| `oil-immersed` | Oil-Immersed |
| `dry-type` | Dry-Type |
| `special` | Special |
| `combined` | Combined |
| `switchgear` | Switchgear |

**响应** `200` — 产品对象数组
```json
[
  {
    "id": "sbh15",
    "name": "10Kv Class Oil Immersed Transformer",
    "nameAr": "محول توزيع...",
    "image": "成品区/油式非晶S(B)H15.png",
    "category": "oil-immersed",
    "categoryLabel": "Oil-Immersed",
    "categoryLabelAr": "محولات مغمورة بالزيت",
    "shortDesc": "...",
    "shortDescAr": "...",
    "description": "...",
    "descriptionAr": "...",
    "capacities": ["30", "50", "63"],
    "voltages": ["10/0.4kV"],
    "specs": [["Product Model", "S(B)H15 Series"]],
    "featured": true
  }
]
```

> ⚠️ `image` 字段是相对于项目根目录的路径，前端拼接时需加 `../` 前缀（即 `../成品区/xxx.png`）。

---

### GET `/api/products/:id`
获取单个产品详情。**无需认证**。

**成功响应** `200` — 单个产品对象（结构同上）

**失败响应** `404`
```json
{ "error": "Product not found." }
```

---

### POST `/api/products` 🔒
新增产品。**需要认证**。

**请求体** — 产品对象，`id` 和 `name` 必填，其余同上结构。

**成功响应** `201` — 新建的产品对象

---

### PUT `/api/products/:id` 🔒
更新产品。**需要认证**。请求体为要更新的字段（部分更新，`id` 不可修改）。

**成功响应** `200` — 更新后的产品对象

---

### DELETE `/api/products/:id` 🔒
删除产品。**需要认证**。

**成功响应** `200`
```json
{ "message": "Product deleted.", "product": { } }
```

---

### POST `/api/products/upload` 🔒
上传产品图片。**需要认证**。请求格式 `multipart/form-data`，字段名 `image`。

**限制**：仅 jpeg / jpg / png / gif / webp，最大 10MB。

**成功响应** `200`
```json
{ "path": "uploads/product-xxx.jpg", "filename": "product-xxx.jpg" }
```

---

## 询盘 `/api/inquiries`

### POST `/api/inquiries`
提交询盘。**无需认证**，公开表单调用。

**请求体**

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | ✅ | 客户姓名 |
| `email` | ✅ | 邮箱（格式校验） |
| `subject` | ✅ | 主题 |
| `message` | ✅ | 消息内容 |
| `company` | | 公司名 |
| `phone` | | 电话 / WhatsApp |
| `productContext` | | 感兴趣的产品（由前端自动填入产品名） |

**成功响应** `201`
```json
{
  "message": "Inquiry submitted successfully.",
  "inquiry": { "id": "inq_xxx", "createdAt": "...", "status": "new" },
  "notification": { "sent": true }
}
```

**失败响应** `400`
```json
{ "error": "Name is required. Email is required." }
```

---

### GET `/api/inquiries` 🔒
获取询盘列表（分页）。**需要认证**。

**查询参数（可选）**

| 参数 | 默认值 | 说明 |
|---|---|---|
| `status` | 全部 | `new` / `read` / `replied` / `closed` |
| `page` | `1` | 页码 |
| `pageSize` | `50`（最大 200）| 每页条数 |

**响应** `200`
```json
{
  "items": [ { "id": "inq_xxx", "name": "...", "email": "...", "status": "new", ... } ],
  "total": 42,
  "page": 1,
  "pageSize": 50
}
```

**询盘对象完整字段**

| 字段 | 说明 |
|---|---|
| `id` | `inq_` 前缀 |
| `name / email / company / phone / subject / message / productContext` | 提交内容 |
| `ip` | 提交方 IP |
| `createdAt` | ISO 8601 时间戳 |
| `status` | `new` / `read` / `replied` / `closed` |
| `repliedAt` | 状态变为 `replied` 时自动记录 |
| `notes` | 管理员备注 |

---

### GET `/api/inquiries/:id` 🔒
获取单条询盘详情。**需要认证**。

---

### PUT `/api/inquiries/:id` 🔒
更新询盘状态和备注。**需要认证**。只允许修改 `status` 和 `notes`。

**请求体**
```json
{ "status": "replied", "notes": "已通过邮件回复" }
```

---

### DELETE `/api/inquiries/:id` 🔒
删除询盘。**需要认证**。

---

## 公司信息 `/api/company`

### GET `/api/company`
获取公司信息。**无需认证**，前端公开页面调用。

**响应** `200` — 公司信息对象（完整字段见下方）

```json
{
  "name": "Longxiang Electric",
  "nameCN": "河南龙翔电气股份有限公司",
  "founded": 1999,
  "stockCode": "831109",
  "registeredCapital": "5000万元",
  "phone": "+86-374-XXXXXXX",
  "email": "info@longxiang.com",
  "address": "...",
  "headquarters": "...",
  "officeHours": "Mon–Fri 08:30–17:30",
  "huaiyangBase": "...",
  "whatsapp": "8613812345678",
  "wechat": "...",
  "skype": "...",
  "ga4TrackingId": "G-XXXXXXXXXX",
  "footerText": "...",
  "factoryArea": "...",
  "patents": "...",
  "researchPartners": "...",
  "description": "...",
  "aboutIntro": "...",
  "aboutDetail": "..."
}
```

---

### PUT `/api/company` 🔒
更新公司信息。**需要认证**。请求体为完整公司对象（全量替换）。

> ⚠️ 当前为全量替换，提交时需携带所有字段，否则缺失字段会被清空。

---

## 证书 `/api/certifications`

### GET `/api/certifications`
获取证书列表。**无需认证**。

**响应** `200` — 证书对象数组
```json
[
  {
    "id": "cert_xxx",
    "name": "ISO 9001:2015",
    "issuer": "TÜV Rheinland",
    "expiryDate": "2026-12-31",
    "image": "uploads/certificates/iso9001.jpg",
    "description": "..."
  }
]
```

---

### POST `/api/certifications` 🔒
新增证书。**需要认证**。`name` 必填。

---

### PUT `/api/certifications/:id` 🔒
更新证书。**需要认证**。

---

### DELETE `/api/certifications/:id` 🔒
删除证书。**需要认证**。

---

## 错误响应格式

所有错误统一格式：
```json
{ "error": "错误说明" }
```

| HTTP 状态码 | 含义 |
|---|---|
| `400` | 请求参数错误 |
| `401` | 未登录或 token 失效 |
| `403` | 无权限 |
| `404` | 资源不存在 |
| `500` | 服务器内部错误 |

---

## 变更记录

| 日期 | 操作方 | 变更内容 |
|---|---|---|
| 2026-06-06 | Claude | 初始版本，整理现有所有接口 |
