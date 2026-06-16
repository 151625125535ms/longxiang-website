# 产品分类层级可配置化 — 分步执行清单

> 配套方案文档：`docs/tasks/category-hierarchy-optimization-plan.md`
> 执行前读取：`IMPLEMENTATION_PLAN.md`、`PROGRESS.md`、`server/lib/category-helper.js`

---

## 执行前提

1. 确认 `.env` 中 `USE_SQLITE=true`
2. 确认本地 `data/longxiang.db` 与服务器同步（或已在本地做过 dry-run）
3. 确认当前分支为 `main`，工作树干净

---

## Step 1：更新 schema.sql

**修改文件**：`server/db/schema.sql`（仅用于新环境初始化，实际 ALTER TABLE 由迁移脚本执行）

### 1a. 更新 schema.sql

在 `categories` 表定义中，`is_active` 行后新增：

```sql
product_group TEXT,
```

使新环境初始化时自带该字段。

> **注**：不要手工对本地 DB 执行 `ALTER TABLE`。本地和服务器 DB 的字段添加由 Step 2 的迁移脚本幂等处理。

### Step 1 验收

- [ ] `server/db/schema.sql` 中 categories 表含 `product_group TEXT`
- [ ] `node --check` 不适用于 sql 文件，跳过

---

## Step 2：迁移脚本

**新建文件**：`scripts/repair-product-category-hierarchy.js`

### 脚本功能

- `--dry-run`：只输出将要执行的 schema 变更和数据变更清单，不写 DB，DB MD5 不变
- 正式模式执行顺序：
  1. **Schema 检查**：查询 `PRAGMA table_info(categories)`；若 `product_group` 字段不存在，执行 `ALTER TABLE categories ADD COLUMN product_group TEXT`
  2. 备份 DB 到 `data/backups/longxiang.db.bak-hierarchy-YYYYMMDD-HHmmss`
  3. 在单一 `db.transaction()` 中执行数据变更
- 创建 3 条一级类记录（已存在则跳过，按 slug 判断）：

  | slug | name_en | name_ar | product_group | sort_order |
  |------|---------|---------|---------------|-----------|
  | group-transformer | Transformer | المحولات | transformer | 1 |
  | group-new-energy-equipment | New Energy Equipment | معدات الطاقة الجديدة | new-energy-equipment | 2 |
  | group-switchgear | Switchgear | معدات المفاتيح الكهربائية | switchgear | 3 |

- 更新所有命中 slug 的二级分类的 `parent_id` 和 `product_group`（按 slug 匹配）
- 输出摘要字段：`created` / `updated` / `skipped` / `unmatched`（unmatched = 配置了映射但 DB 中找不到该 slug 的记录）

### Step 2 验收

```powershell
node scripts/repair-product-category-hierarchy.js --dry-run
```

dry-run 期望输出：

- schema 状态：`product_group 字段：不存在（将在正式模式下添加）` 或 `已存在`
- 将创建 3 条一级类（或 0 条，若已创建）
- 将更新 N 条二级分类的 parent_id / product_group
- unmatched：[]（若有内容，需人工确认是否可接受）
- 不以固定数量作为唯一成功条件

验收清单：

- [ ] dry-run 输出创建数 0–3；更新数 = 命中映射且需修复的实际数量（可超过 10，不设上限）；invalid group 数量 = 0；unmatched 为空或已人工确认可接受
- [ ] dry-run 前后 DB MD5 不变：`certutil -hashfile data/longxiang.db MD5`
- [ ] `node --check scripts/repair-product-category-hierarchy.js` 通过

---

## Step 3：更新 `/api/admin/categories` 接口

**修改文件**：`server/routes/admin/categories.js`

### GET 变更

**只修改 `type=product` 分支**，其余 type（certification/content）和不传 type 的路径保持原有简单 SELECT，不受影响。

当 `type=product` 时，SQL 改为带 JOIN 的层级查询：

```sql
SELECT
    c.id, c.type, c.parent_id, c.slug, c.name_en, c.name_ar,
    c.sort_order, c.is_active, c.product_group,
    p.name_en AS parent_name_en,
    CASE
      WHEN c.parent_id IS NULL AND c.product_group IS NOT NULL THEN 'parent'
      WHEN c.parent_id IS NOT NULL THEN 'child'
      ELSE 'legacy'
    END AS level,
    c.created_at, c.updated_at
FROM categories c
LEFT JOIN categories p ON p.id = c.parent_id
WHERE c.type = 'product'
ORDER BY c.sort_order, c.id
```

其他 type 或不传 type 时，保留原有 SQL 不变（无 JOIN，无层级字段）。

### POST 变更

新增接受字段：

- `parent_id`（二级分类必填，一级类不传）
- `product_group`（一级类必填，限 `transformer | new-energy-equipment | switchgear`）

校验规则：
- 若传入 `parent_id`：查询父分类必须存在且是一级类（`parent_id IS NULL AND product_group IS NOT NULL`），否则返回 422
- 若传入 `product_group` 且不传 `parent_id`（创建一级类）：
  - `product_group` 必须在白名单 `['transformer','new-energy-equipment','switchgear']` 内，否则返回 422
  - 检查是否已存在相同 `product_group` 的一级类；若已存在返回 422（提示"请编辑已有一级类"）
- `type='product'` 且两者都不传：返回 422（"产品分类必须指定所属一级类（product_group）或父分类（parent_id）"），避免继续制造无层级的旧结构分类
- `type='certification'` / `type='content'` 且两者都不传：按旧逻辑处理（向后兼容）

写入时：若 `parent_id` 存在，自动从父分类读取 `product_group` 写入当前分类。

### DELETE 变更

删除前检查：若 `SELECT COUNT(*) FROM categories WHERE parent_id = ?` > 0，返回 422（"请先删除或移走所有子分类"）。

### PUT is_active=0 变更

若目标分类是一级类（`parent_id IS NULL AND product_group IS NOT NULL`）且有 `is_active=1` 的子分类，返回 422（"请先停用所有子分类"）。

### PUT 字段变更规则

- 二级分类修改 `parent_id`（移至新父分类）：从新父分类读取 `product_group` 自动写入，忽略请求中的 `product_group` 值
- 二级分类不允许直接提交 `product_group`（提交时忽略，由 parent_id 推导）
- **v1 约束**：一级类的 `product_group` 只读不可编辑；PUT 一级类时，若请求含 `product_group` 字段，忽略该字段（一级类 group 标识修改涉及级联更新，留到后续版本）

### Step 3 验收（HTTP 级别）

启动本地服务后：

- `GET /api/admin/categories?type=product` 返回含 `level`、`parent_name_en`、`product_group` 字段
- 一级类记录的 `level='parent'`，`parent_name_en=null`
- 二级类记录的 `level='child'`，`parent_name_en` 为对应一级类的 name_en
- `POST /api/admin/categories` 传入无效 `parent_id` 返回 422
- [ ] `node --check server/routes/admin/categories.js` 通过

---

## Step 4：更新 `/api/product-categories` 接口

**修改文件**：`server/routes/product-categories.js`

### 变更

优先从 DB 读取一级/二级类结构：

```sql
SELECT
    c.id, c.slug, c.name_en, c.name_ar, c.sort_order, c.product_group,
    c.parent_id
FROM categories c
WHERE c.type = 'product' AND c.is_active = 1
ORDER BY c.sort_order ASC, c.id ASC
```

建树逻辑：

1. 先找出所有 `parent_id IS NULL AND product_group IS NOT NULL` 的一级类，按 `sort_order` 排序
2. 再找出所有 `parent_id IS NOT NULL` 的二级类，归入对应一级类的 children
3. 若步骤 1 找不到任何一级类记录（数据库未迁移）→ fallback 到原来的 `getCategoryMapping` 逻辑
4. 若找到一级类但无任何有效 child：返回诊断字段或 fallback，避免前台出现空分类树
5. child 的 `parent_id` 指向不存在或 `is_active=0` 的一级类：跳过该 child 并 `console.warn`，不生成孤儿节点
6. `is_active=0` 的一级类不出现在树中，其所有子分类也不出现

### Step 4 验收（HTTP 级别）

迁移脚本执行后，`GET /api/product-categories` 返回：

- 3 个一级类按 sort_order 排列
- 每个一级类的 children 来自 DB 的二级分类，标签为 DB 中的 name_en / name_ar
- 停用分类（`is_active=0`）不出现
- [ ] `node --check server/routes/product-categories.js` 通过

---

## Step 5：更新 `/api/products` 和后台产品 POST/PUT

**修改文件**：`server/routes/products.js`、`server/routes/admin/products.js`

### `mapSqliteProduct` 变更（products.js）

SQL JOIN 中新增 `c.product_group AS category_product_group`。

新读取优先级（去掉信任产品表旧值的分支）：

```js
// 1. 优先用分类表的 product_group
if (row.category_product_group && VALID_GROUPS.has(row.category_product_group)) {
    group = row.category_product_group;
    // sub_category 优先用 helper 映射值（保留 switchgear→medium-low-voltage 等兼容行为）
    const helperMapping = getCategoryMapping(row.category_slug);
    subCategory = helperMapping ? helperMapping.subCategory : row.category_slug;
}
// 2. 分类表无有效 product_group，完全 fallback 到 helper
else {
    const mapping = getCategoryMapping(row.category_slug);
    if (!mapping) return null;  // helper 也无映射 → 过滤掉
    group = mapping.group;
    subCategory = mapping.subCategory;
}
```

> **不再信任产品表旧 `product_group / sub_category`**：所有推导来源为分类表 + helper，避免历史脏数据污染。

### `resolveProductCategoryMapping` 变更（admin/products.js）

新增校验：**产品只能绑定二级分类**（`c.parent_id IS NOT NULL`），否则返回 422：

```json
{ "error": "产品只能绑定二级分类，请选择具体子分类", "code": "VALIDATION_ERROR" }
```

新优先级（去掉信任产品表旧值的分支）：

```js
// 1. 分类表 product_group 有效 → 使用，sub_category 优先 helper 映射值
if (VALID_GROUPS.has(category.product_group)) {
    const helperMapping = getCategoryMapping(category.slug);
    return {
        categoryId: category.id,
        productGroup: category.product_group,
        subCategory: helperMapping ? helperMapping.subCategory : category.slug
    };
}
// 2. fallback 到 helper
const mapping = getCategoryMapping(category.slug);
if (!mapping) return { error: '分类无效或无法推导 group', categoryId: category.id };
return { categoryId: category.id, productGroup: mapping.group, subCategory: mapping.subCategory };
```

### Step 5 验收（HTTP 级别）

迁移脚本执行后，重新验证：

- `GET /api/products`：所有产品 group 均在 VALID_GROUPS 内
- `POST /api/admin/products` 绑定一级类 ID → 返回 422
- `POST /api/admin/products` 绑定新二级分类 → `product_group` 和 `sub_category` 自动从分类表推导
- [ ] `node --check server/routes/products.js` 通过
- [ ] `node --check server/routes/admin/products.js` 通过

---

## Step 6：更新 admin.js（后台 UI）

**修改文件**：`admin/js/admin.js`

### 6a. 删除硬编码分类数组

先搜索确认引用范围：

```powershell
rg "CATEGORIES|ev-charger|energy-storage" admin/js/admin.js
```

删除第 5-15 行的 `var CATEGORIES = [...]` 常量（含旧 `ev-charger` group 和独立 `energy-storage` group 引用），全部改为从 API 动态加载。如有其他位置引用该常量，也一并替换为 API 数据。

### 6b. 分类管理表格新增列

当前 4 列 → 新增：**层级**（一级类 / 二级类）、**所属一级类**（二级类显示 parent_name_en，一级类显示 "—"）。

### 6c. 分类新增 / 编辑弹窗新增字段

- **层级**（select）：一级类 / 二级类
  - 选"一级类"：显示 **Group 标识**（select，选项固定为 transformer / new-energy-equipment / switchgear）
  - 选"二级类"：显示 **所属一级类**（select，动态加载 `level='parent'` 的分类），必填
- 层级选择联动：根据选择显示 / 隐藏对应字段
- 编辑已有分类时：按 `level` 回填表单，一级类不显示父类选择，二级类不显示 Group 标识

### 6d. 产品表单分类下拉

- 只显示二级分类（`level='child'`）
- 用 `<optgroup label="[一级类名]">` 按所属一级类分组展示
- **迁移前 fallback**：若 API 返回的分类中，未同时存在至少一条 `level='parent'` 和至少一条 `level='child'` 的记录，平铺显示全部 `is_active=1` 的产品分类，并在下拉顶部插入一条 disabled 提示选项："分类层级未初始化，请执行迁移脚本"

### 6e. 更新 admin/index.html

**修改文件**：`admin/index.html`

- 分类管理表格 `<thead>` 新增"层级"和"所属一级类"两列
- `categories-tbody` 对应 `colspan` 同步更新
- 分类新增/编辑 modal 中新增：层级选择（select：一级类 / 二级类）、所属一级类下拉（动态加载 `level='parent'` 的分类）、Group 标识 select（固定三选一：transformer / new-energy-equipment / switchgear）
- 确认产品分类 `<select>` 的 HTML 结构支持 `<optgroup label="...">` 分组和 `disabled` 提示选项

### 6f. 修正保存分类错误提示

admin.js 当前对所有 422 统一提示"Slug 已存在"。需改为：读取接口返回的 `err.error` 或 `err.message` 字段，直接展示给用户。影响范围：分类新增/编辑保存的 catch 块。

### Step 6 验收（UI 操作级别）

启动本地服务，在后台手动操作验证：

- [ ] 分类管理表格显示层级和所属一级类列
- [ ] 新增分类弹窗有层级选择；选"二级类"后显示所属一级类下拉
- [ ] 新增一个二级分类（选择所属一级类），保存后 DB 中 `parent_id` 和 `product_group` 正确
- [ ] 产品表单分类下拉按一级类分组，不显示一级类本身
- [ ] 选择该新分类保存产品后，`/api/products` 中该产品 `group` 和 `subCategory` 正确
- [ ] `node --check admin/js/admin.js` 通过

---

## Step 7：回归检查 + 本地迁移 + 提交部署

### 静态检查

```powershell
node --check server/app.js
node --check server/routes/products.js
node --check server/routes/product-categories.js
node --check server/routes/admin/categories.js
node --check server/routes/admin/products.js
node --check scripts/repair-product-category-hierarchy.js
node --check admin/js/admin.js
git diff --check
```

### 本地执行迁移

```powershell
node scripts/repair-product-category-hierarchy.js --dry-run
# 确认输出符合预期后正式执行：
node scripts/repair-product-category-hierarchy.js
```

### 提交

```bash
git add server/db/schema.sql
git add server/routes/admin/categories.js
git add server/routes/admin/products.js
git add server/routes/products.js
git add server/routes/product-categories.js
git add scripts/repair-product-category-hierarchy.js
git add admin/js/admin.js
git add admin/index.html
git add PROGRESS.md
git commit -m "feat: 产品分类层级可配置化（parent_id + product_group）"
git push origin main
```

### 服务器部署

```bash
git pull origin main
pm2 reload ecosystem.config.js
# 验证服务启动
curl http://localhost:3000/api/product-categories
# 执行服务器迁移
node scripts/repair-product-category-hierarchy.js --dry-run
node scripts/repair-product-category-hierarchy.js
```

### Step 7 验收（Smoke Test）

| 项目 | 期望 |
|------|------|
| `/api/product-categories` 返回 3 个一级类 | ✓ |
| `/api/products` 所有产品 group 合法 | ✓ |
| 后台新增二级分类 → DB parent_id / product_group 正确 | ✓ |
| 后台新增产品绑定新分类 → 前台可见 | ✓ |
| 旧分类（未参与迁移的边缘情况）fallback 正常 | ✓ |
| 绑定一级类 ID 创建产品 → 422 | ✓ |

---

## 关键约束

1. **执行顺序**：代码上线（含 fallback）→ pm2 restart → 执行迁移脚本。不能先跑脚本再上线代码。
2. **不开放新增一级类**：后台 UI 虽然有"一级类"选项，但 API 层校验禁止创建第 4 个一级类（product_group 不在白名单内返回 422）。
3. **`category-helper.js` 不删除**：作为 fallback 保留，直到全部分类都有 parent_id / product_group 为止。
4. **产品只能绑定二级分类**：绑定一级类（group-transformer 等）返回 422，前台 UI 下拉不显示一级类。
