# CMS 优化任务 — 逐步执行单

> 本文件是决策完备的执行单，不是设计文档。
> 每个步骤均包含：做什么、改哪个文件的哪一部分、如何验证完成。
> 执行前必读：[CMS_INVARIANTS.md](CMS_INVARIANTS.md) 和 [CMS_GROUND_TRUTH.md](CMS_GROUND_TRUTH.md)
> 进度追踪：[CMS_PROGRESS.md](CMS_PROGRESS.md)

---

## Day 1：SQLite 稳定性 + 后台 API 规范化

### Step 1.1 — 启用 SQLite WAL 模式

**文件**：`server/lib/db.js`

在 `dbInstance = new Database(dbPath)` 之后，`dbInstance.pragma('foreign_keys = ON')` 之前，插入：

```js
dbInstance.pragma('journal_mode = WAL');
```

**同步修改**：`scripts/backup-longxiang.sh`

在 `cp` 语句（若存在）或新增 SQLite 备份逻辑之前，加入：

```bash
sqlite3 "${DATA_DIR}/longxiang.db" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
cp "${DATA_DIR}/longxiang.db" "${WORK_DIR}/longxiang.db"
```

**验证**：

```powershell
node -e "const db=require('better-sqlite3')('data/longxiang.db'); console.log(db.pragma('journal_mode',{simple:true})); db.close();"
# 应输出：wal
```

---

### Step 1.2 — 内容块列表补分页和 meta

**文件**：`server/routes/admin/content-blocks.js`

修改 `router.get('/', ...)` 处理函数：

1. 从 `req.query` 解析：`page`（默认 1）、`pageSize`（默认 20，最大 100）、`status`、`q`（搜索 slug/title_en）、`slug`
2. 构建 WHERE 子句（status 白名单：published/draft）
3. 先查 COUNT(*) 得到 total，再查分页数据
4. 响应改为：

```js
res.json({ ok: true, data: rows, meta: { page, pageSize, total } });
```

**验证**：

```powershell
curl "http://localhost:3000/api/admin/content-blocks?page=1&pageSize=5"
# 响应必须包含 meta.total=7
```

---

### Step 1.3 — GET /:slug 增加固定白名单校验

**文件**：`server/routes/admin/content-blocks.js`

在文件顶部增加：

```js
const VALID_SLUGS = ['company-overview', 'contact', 'about-us', 'applications', 'innovation', 'education', 'page-blocks'];
```

在 `router.get('/:slug', ...)` 中，查询数据库前加入：

```js
if (!VALID_SLUGS.includes(req.params.slug)) {
    return sendError(res, 404, 'NOT_FOUND', 'Content block not found.');
}
```

同样在 `router.put('/:slug', ...)` 中加入相同校验。

**验证**：

```powershell
curl "http://localhost:3000/api/admin/content-blocks/unknown-slug"
# 应返回 404 NOT_FOUND
```

---

### Step 1.4 — batch 操作限定为 publish/unpublish

**文件**：`server/routes/admin/content-blocks.js`

确认文件顶部：

```js
const BATCH_ACTIONS = ['publish', 'unpublish'];
```

**注意**：不得添加 `soft_delete`、`restore`、`hard_delete`。

**验证**：

```powershell
curl -X POST http://localhost:3000/api/admin/content-blocks/batch -H "Content-Type: application/json" -d "{\"action\":\"soft_delete\",\"ids\":[1],\"versionMap\":{\"1\":1}}"
# 应返回 422 VALIDATION_ERROR
```

---

## Day 2：Schema 校验 + 旧写接口治理

### Step 2.1 — 建立声明式 SCHEMAS 对象

**文件**：`server/routes/admin/content-blocks.js`

在文件顶部（VALID_SLUGS 之后）添加：

```js
const SCHEMAS = {
    'company-overview': { stats: 'array', seo: 'object' },
    'contact':          { mapLocations: 'object', seo: 'object' },
    'about-us':         { hero: 'object', sections: 'array', milestones: 'array', seo: 'object' },
    'applications':     { hero: 'object', industries: 'array', seo: 'object' },
    'innovation':       { hero: 'object', sections: 'array', highlights: 'array', seo: 'object' },
    'education':        { hero: 'object', stats: 'array', sections: 'array', cta: 'object' },
    'page-blocks':      { blocks: 'array' }
};

function validateBodyJson(slug, bodyJson) {
    const schema = SCHEMAS[slug];
    if (!schema) return null;
    for (const [key, expectedType] of Object.entries(schema)) {
        if (bodyJson[key] === undefined) continue;
        const actual = Array.isArray(bodyJson[key]) ? 'array' : typeof bodyJson[key];
        if (actual !== expectedType) {
            return `${key} must be ${expectedType === 'array' ? 'an array' : 'an object'}.`;
        }
    }
    return null;
}
```

在 `router.put('/:slug', ...)` 的保存逻辑中，version 校验通过后加入：

```js
if (body.body_json !== undefined) {
    const schemaError = validateBodyJson(req.params.slug, body.body_json);
    if (schemaError) return sendError(res, 422, 'VALIDATION_ERROR', schemaError);
}
```

**注意**：education 的 schema 定义中不得出现 title_en/title_ar 相关字段。

---

### Step 2.2 — PUT /:slug 保留 extra 字段

**文件**：`server/routes/admin/content-blocks.js`

在 `router.put('/:slug', ...)` 的事务函数中，组装 body_json 时加入：

```js
let incomingBodyJson = body.body_json === undefined ? before.body_json : body.body_json;
if (before.body_json.extra !== undefined && incomingBodyJson.extra === undefined) {
    incomingBodyJson = { ...incomingBodyJson, extra: before.body_json.extra };
}
```

然后使用 `JSON.stringify(incomingBodyJson)` 写入数据库。

---

### Step 2.3 — page-blocks 系统 key 服务端保护

**文件**：`server/routes/admin/content-blocks.js`

在 `router.put('/:slug', ...)` 中，schema 校验之后加入 page-blocks 专属校验：

```js
if (req.params.slug === 'page-blocks' && body.body_json !== undefined) {
    const blocks = body.body_json.blocks;
    if (Array.isArray(blocks)) {
        const RESERVED_KEYS = ['footer', 'home-cta'];
        const missingKey = RESERVED_KEYS.find(k => !blocks.some(b => b.key === k));
        if (missingKey) {
            return sendError(res, 422, 'VALIDATION_ERROR', `Block key "${missingKey}" is required and cannot be removed.`);
        }
    }
}
```

**验证**：

```powershell
# 尝试保存缺少 footer 的 page-blocks，应返回 422
```

---

### Step 2.4 — 关闭旧 JSON 写接口

**文件**：`server/routes/company.js`

在 `router.put('/', authMiddleware, ...)` 开头加入：

```js
if (isUseSqlite()) {
    return res.status(405).json({
        ok: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Use /api/admin/content-blocks/company-overview instead.' }
    });
}
```

**文件**：`server/routes/education.js`

在 `router.put('/editor', authMiddleware, ...)` 开头加入：

```js
if (isUseSqlite()) {
    return res.status(410).json({
        ok: false,
        error: { code: 'GONE', message: 'Use /api/admin/content-blocks/education instead.' }
    });
}
```

在 `router.patch('/', authMiddleware, ...)` 开头加入相同逻辑。

**验证**：

```powershell
curl -X PUT http://localhost:3000/api/company -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{}"
# 应返回 405

curl -X PUT http://localhost:3000/api/education/editor -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{}"
# 应返回 410
```

---

## Day 3：P1 结构化表单（企业概况 / 联系我们 / 教育合作 / 页面区块）

### Step 3.1 — 企业概况结构化表单

**文件**：`admin/js/admin.js`（企业概况视图函数）

表单字段覆盖 body_json 的 name/nameAr/nameCN/founded/stockCode/registeredCapital/
registeredCapitalAr/factoryArea/factoryAreaAr/patents/researchPartners/description/
descriptionAr/aboutIntro/aboutIntroAr/aboutDetail/aboutDetailAr/cover_image/stats/seo。

保存时：
1. 调用 `GET /api/admin/content-blocks/company-overview` 获取 version
2. 携带 version 调用 `PUT /api/admin/content-blocks/company-overview`
3. 409 VERSION_CONFLICT 时提示"内容已被他人修改，请重新加载"，不允许强制覆盖

保留高级 JSON 折叠区（textarea），但保存走同一 PUT 接口。

---

### Step 3.2 — 联系我们结构化表单

与 Step 3.1 相同模式，slug 为 `contact`。字段覆盖联系方式、地图 URL、社交账号、二维码路径。
图片字段使用路径文本输入（不扩展 DAM）。

---

### Step 3.3 — 教育合作结构化表单

**重要约束**（来自 CMS_INVARIANTS.md）：
- 表单字段必须使用 `title`/`titleAr` 命名，**不得使用** `title_en`/`title_ar`
- 不得修改 `GET /api/education` 的返回逻辑
- slug 为 `education`

sections 数组支持查看（Day 4 完成增删排序），Day 3 先提供基础信息编辑和单节段查看。
保存时调用 `PUT /api/admin/content-blocks/education`（不再调用旧 `/api/education/editor`）。

更新 `admin/js/admin.js:2244`：将 `apiRequest('/education/editor', { method: 'PUT', ... })` 
改为调用 `PUT /api/admin/content-blocks/education`，携带 version。

---

### Step 3.4 — 页面区块结构化表单

slug 为 `page-blocks`。blocks 数组固定展示 key='footer' 和 key='home-cta'，不提供删除按钮。
保存时服务端会校验 footer/home-cta 必须存在（Step 2.3 已实现）。

---

## Day 4：P2 结构化表单（关于我们 / 应用行业 / 科技创新）

### Step 4.1 — 关于我们结构化表单

slug 为 `about-us`。
- sections 和 milestones 数组支持新增、删除、排序（drag 或上下箭头）
- 保存前过滤空项（所有文案字段均为空的数组项）
- sort_order 在保存前按当前顺序重新赋值（0, 1, 2, ...）

---

### Step 4.2 — 应用行业结构化表单

slug 为 `applications`。
- industries 数组支持新增、删除、排序
- related_product_ids 输入时校验为数字数组，非数字显示警告（不阻止保存）

---

### Step 4.3 — 科技创新结构化表单

slug 为 `innovation`。
- sections 和 highlights 数组支持新增、删除、排序
- related_certification_ids 输入时做存在性提示（查询证书表），不强制外键

---

## Day 5：测试、部署与验收

### Step 5.1 — 本地静态检查

```powershell
node --check server/app.js
node --check server/routes/company.js
node --check server/routes/education.js
node --check server/routes/admin/content-blocks.js
node --check admin/js/admin.js
git diff --check
```

### Step 5.2 — API 验收脚本

```powershell
# content-blocks 列表含 meta
curl "http://localhost:3000/api/admin/content-blocks?page=1&pageSize=20"

# 版本冲突
curl -X PUT http://localhost:3000/api/admin/content-blocks/company-overview -H "Content-Type: application/json" -d "{\"version\":999,\"body_json\":{}}"
# 应返回 409

# page-blocks 系统 key 保护
curl -X PUT http://localhost:3000/api/admin/content-blocks/page-blocks -H "Content-Type: application/json" -d "{\"version\":1,\"body_json\":{\"blocks\":[{\"key\":\"home-cta\"}]}}"
# 应返回 422（缺少 footer）

# education 老 schema 验证
curl http://localhost:3000/api/education | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const b=JSON.parse(d);console.log(b.hero&&b.hero.title?'OK':'FAIL');})"
```

### Step 5.3 — 服务器部署

```powershell
# 备份（先执行，再部署）
ssh longxiang "cd /home/ubuntu/longxiang-website && npm run db:backup"

# 部署
git push origin main
ssh longxiang "cd /home/ubuntu/longxiang-website && git pull origin main && npm install && pm2 reload longxiang-website"

# 验证
ssh longxiang "pm2 status"
curl https://<domain>/api/health
curl https://<domain>/api/education | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const b=JSON.parse(d);console.log(b.hero&&b.hero.title?'OK_OLD_SCHEMA':'FAIL');});"
```

### Step 5.4 — 回退方案（如线上异常）

```bash
ssh longxiang "cd /home/ubuntu/longxiang-website && sed -i 's/USE_SQLITE=true/USE_SQLITE=false/' .env && pm2 reload longxiang-website"
```

公开前台立即回退到 JSON 源，后台 API 会返回 503 DATABASE_UNAVAILABLE（这是预期行为）。
