# 产品分类层级可配置化优化方案

## 背景与目标

当前产品分类的父子层级关系（一级类 / 二级类）**硬编码在 `server/lib/category-helper.js`** 中，数据库的 `categories` 表是完全平铺的，`parent_id` 字段虽已存在但值全为 NULL。

这导致：
- 后台管理员新增分类时，不知道自己新增的是一级类还是二级类
- 不知道二级类属于哪个一级类
- 新增分类后必须同时改代码，否则产品绑定该分类后在前台消失

**目标**：在不重做 CMS 的前提下，把分类层级关系迁移到数据库，使后台可配置。

---

## 现状分析

### 数据库

`categories` 表结构：

```sql
id, type, parent_id, slug, name_en, name_ar, sort_order, is_active, created_at, updated_at
```

`parent_id` 已存在但全为 NULL。缺少 `product_group` 字段。

当前 10 条产品分类全部平铺，一级类（transformer / new-energy-equipment / switchgear）**不在 DB 中**，只在 helper 代码里。

### 后台管理（admin.js）

- **第 5-15 行有一个硬编码的 `var CATEGORIES` 数组**，仍然包含旧的 `ev-charger` group 值，是存量技术债
- 分类新增表单字段：slug / name_en / name_ar / sort_order / is_active，无父子关系字段
- 产品表单分类下拉：从 API 读取，但平铺显示所有分类，无分组，无层级区分
- 分类列表：显示 name_en / slug / sort_order / is_active，无层级信息

### 接口

- `/api/admin/categories?type=product`：返回平铺列表，无 parent_id / product_group
- `/api/product-categories`：通过 helper CATEGORY_MAP 构建树
- `/api/products` 中 `mapSqliteProduct`：触发条件为 `!group || !VALID_GROUPS.has(group)`，从 helper 推导
- 后台产品 POST/PUT：通过 `resolveProductCategoryMapping` → helper 推导 group

---

## 方案设计

### 数据模型变更

#### 1. categories 表新增 `product_group` 字段

```sql
ALTER TABLE categories ADD COLUMN product_group TEXT;
```

- 一级类行：`product_group = 'transformer' | 'new-energy-equipment' | 'switchgear'`，`parent_id = NULL`
- 二级类行：`product_group` 与父级相同，`parent_id = 对应一级类 id`

> **注**：本地和服务器 DB 的实际 `ALTER TABLE` 由 `scripts/repair-product-category-hierarchy.js` 在正式模式下幂等执行（字段已存在则跳过）。`server/db/schema.sql` 只更新表定义，用于新环境初始化，无需手工执行。

#### 2. 三条系统一级类记录（由迁移脚本创建）

| slug | name_en | product_group | parent_id | type |
|------|---------|---------------|-----------|------|
| `group-transformer` | Transformer | transformer | NULL | product |
| `group-new-energy-equipment` | New Energy Equipment | new-energy-equipment | NULL | product |
| `group-switchgear` | Switchgear | switchgear | NULL | product |

slug 使用 `group-` 前缀避免与现有二级分类 slug 冲突（现有 `switchgear` slug 是二级分类）。

#### 3. 现有 10 条二级分类写入 parent_id 和 product_group

| slug | parent slug | product_group |
|------|-------------|---------------|
| oil-immersed | group-transformer | transformer |
| dry-type | group-transformer | transformer |
| combined | group-transformer | transformer |
| special | group-transformer | transformer |
| ac | group-new-energy-equipment | new-energy-equipment |
| dc | group-new-energy-equipment | new-energy-equipment |
| energy-storage | group-new-energy-equipment | new-energy-equipment |
| switchgear | group-switchgear | switchgear |
| medium-low-voltage | group-switchgear | switchgear |
| high-voltage | group-switchgear | switchgear |

### 层级判断规则

- **一级类**：`parent_id IS NULL AND product_group IS NOT NULL`
- **二级类**：`parent_id IS NOT NULL`

### sub_category 字段推导规则（重要）

新方案中：

- `product_group` = 所绑定分类的 `categories.product_group`（从分类表读取）
- `sub_category` 推导优先级：
  1. 优先取 `getCategoryMapping(category.slug)?.subCategory`（helper 映射值）
  2. helper 无映射时，取分类 `slug`

> **重要**：`sub_category` **不直接等于分类 slug**。helper 优先保证历史 `switchgear → medium-low-voltage` 等兼容行为不被破坏。

---

## 接口变更

### `/api/admin/categories?type=product`

`type=product` 时，GET 路由切换为带 JOIN 的 SQL，新增返回字段：`parent_id`、`product_group`、`level`（`'parent'`、`'child'` 或 `'legacy'`）、`parent_name_en`。

`level` 三态含义：

- `'parent'`：`parent_id IS NULL AND product_group IS NOT NULL`（迁移后创建的一级类）
- `'child'`：`parent_id IS NOT NULL`（真实子分类）
- `'legacy'`：`parent_id IS NULL AND product_group IS NULL`（迁移前旧平铺分类，执行迁移脚本后此状态消失）

`type=certification`、`type=content` 及不传 type 时，保持原有简单 SELECT，不受影响。

### `/api/admin/categories` POST

新增接受字段：
- `parent_id`（二级分类必填）
- `product_group`（一级类必填，限 `transformer / new-energy-equipment / switchgear`）

校验规则：
- 若传入 `parent_id`：查询父分类必须存在且是一级类（`parent_id IS NULL AND product_group IS NOT NULL`），否则返回 422
- 若传入 `product_group` 且不传 `parent_id`（即创建一级类）：
  - `product_group` 必须在白名单 `['transformer','new-energy-equipment','switchgear']` 内，否则返回 422
  - 若已存在相同 `product_group` 的一级类，返回 422（提示"请编辑已有一级类，不允许重复创建"）
- `type='product'` 且两者都不传：返回 422（"产品分类必须指定所属一级类（product_group）或父分类（parent_id）"），避免继续制造无层级的旧结构分类
- `type='certification'` / `type='content'` 且两者都不传：按旧逻辑处理（向后兼容）

> **约束**：系统仅允许 3 个内置一级类，通过上述白名单+唯一性校验限制。新增第四个产品大类需同步改导航和视觉，不在本次范围内。

### `/api/admin/categories` PUT

规则：

- 二级分类修改 `parent_id`（移至新父分类）：自动从新父分类读取 `product_group` 并写入，忽略请求中的 `product_group` 值
- 二级分类不允许直接提交 `product_group` 字段（提交时忽略，由 parent_id 推导）
- **v1 约束**：一级类的 `product_group` 字段只读，不允许后台编辑；PUT 一级类时，即使请求含 `product_group` 字段也忽略（可编辑 name_en / name_ar / sort_order / is_active）。修改一级类 group 标识需同步所有子分类和产品，留到后续版本处理

### `/api/admin/categories` DELETE

删除前检查：若该分类有任何关联子分类（`parent_id = id` 存在），返回 422（"请先删除或移走所有子分类"）。

### `/api/admin/categories` PUT `is_active=0`（停用）

若一级类下有 `is_active=1` 的子分类，返回 422（"请先停用所有子分类"）。

### `/api/product-categories`

优先从 DB 读取一级/二级类树结构：

```
SELECT parent, children
FROM categories
WHERE type='product' AND is_active=1
ORDER BY sort_order
```

若 DB 中一级类记录不存在（`parent_id IS NULL` 的记录为 0），回退到 `category-helper.js` CATEGORY_MAP。

### `/api/products` 中 `mapSqliteProduct`

新读取优先级：

1. 从 JOIN 的 `categories` 表读取 `c.product_group`
2. 若 `c.product_group` 有效（在 VALID_GROUPS 中）→ `group = c.product_group`；`sub_category` 优先用 `getCategoryMapping(slug)?.subCategory`（保留 helper 映射值），若 helper 无映射则用 `category_slug`
3. 若 `c.product_group` 无效或空 → 完全 fallback 到 `getCategoryMapping(slug)`（现有逻辑）
4. 若 fallback 也无映射 → 过滤掉该产品（返回 null，由 `.filter(Boolean)` 移除）

> **switchgear 兼容性**：`switchgear` slug 在 helper 中映射为 `sub_category = 'medium-low-voltage'`。新优先级在步骤 2 中优先读 helper 的 subCategory，因此该映射自动保留，`?sub=medium-low-voltage` URL 行为不变。

> **去除对产品表旧值的信任**：不再将产品表中存储的 `product_group / sub_category` 字段作为 fallback 来源，避免历史脏数据污染。

### 后台产品 POST/PUT（`resolveProductCategoryMapping`）

新优先级：

1. 查询 `categories WHERE id=? AND type='product' AND is_active=1`
2. 校验：分类必须是二级类（`parent_id IS NOT NULL`），否则返回 422（"产品只能绑定二级分类，请选择具体子分类"）
3. 若分类的 `product_group` 有效 → `productGroup = category.product_group`，`subCategory = getCategoryMapping(category.slug)?.subCategory || category.slug`
4. 若无效 → fallback 到 `getCategoryMapping(category.slug)`
5. 若 fallback 也无映射 → 返回 422

同时增加校验：**产品只能绑定二级分类**（`parent_id IS NOT NULL`），绑定一级类（group-transformer 等）返回 422。

---

## 后台 UI 变更（admin.js）

### 删除硬编码分类数组

删除第 5-15 行的 `var CATEGORIES = [...]` 常量（包含旧 `ev-charger` group 和独立 `energy-storage` group），所有分类数据均改为从 API 动态加载。

执行前先搜索确认引用范围：`rg "CATEGORIES|ev-charger|energy-storage" admin/js/admin.js`

### 更新 admin/index.html

`admin/index.html` 中分类表格和分类 modal 为静态 HTML，需同步更新：

- 分类管理表格 `<thead>` 新增"层级"和"所属一级类"两列，`categories-tbody` 对应 `colspan` 同步更新
- 分类新增/编辑 modal 中新增：层级选择字段（select）、所属一级类下拉（从 API 加载 `level='parent'` 的分类）、Group 标识 select（固定三选一）
- 确认产品分类 `<select>` 的 HTML 结构支持 `<optgroup label="...">` 分组和 `disabled` 提示选项

### 保存分类错误处理

保存分类时所有 422 错误应展示接口返回的具体 `err.error` 或 `err.message` 字段，不再统一显示"Slug 已存在"。本次新增的 422 场景包括：无效 parent_id、重复一级类、type=product 缺少 parent/group、一级类停用失败等。

### 分类管理表格

新增列：层级（一级类 / 二级类）、所属一级类（二级类显示父类 name_en）、Group 标识。

### 分类新增 / 编辑弹窗

新增字段：
- **层级选择**（radio 或 select）：一级类 / 二级类
  - 选"一级类"：显示 Group 标识输入（固定为三选一的 select）
  - 选"二级类"：显示所属一级类下拉（从 API 加载一级类列表），此字段必填
- 一级类不显示 parent 选择，二级类不显示 Group 标识输入

### 产品表单分类下拉

- 只显示二级分类（`level='child'`）
- 用 `<optgroup label="...">` 按所属一级类分组展示
- **迁移前 fallback**：若 API 返回的分类中，未同时存在至少一条 `level='parent'` 和至少一条 `level='child'` 的记录（迁移脚本尚未执行，分类全为 legacy），下拉改为平铺显示所有 `is_active=1` 的产品分类，并在顶部显示一条提示选项（disabled）："分类层级未初始化，请执行迁移脚本"

---

## 迁移脚本

新建 `scripts/repair-product-category-hierarchy.js`：

- `--dry-run`：输出将执行的 schema 变更和数据变更，不写 DB，DB MD5 不变
- 正式模式：
  1. **Schema 检查**：检查 `categories` 表是否有 `product_group` 字段；若无则执行 `ALTER TABLE categories ADD COLUMN product_group TEXT`（幂等）
  2. 备份 DB 到 `data/backups/longxiang.db.bak-hierarchy-YYYYMMDD-HHmmss`
  3. 在单一 `db.transaction()` 中：
     - 创建 3 条一级类记录（按 slug 判断，已存在则跳过）
     - 更新所有命中 slug 的二级分类的 `parent_id` 和 `product_group`
- 输出摘要：`created` / `updated` / `skipped` / `unmatched`（未命中的 slug 列表，供人工确认是否可接受）
- 不以固定数量作为唯一成功条件

---

## 回滚方案

- 代码回滚：`git revert` 或 `git checkout` 到上一个 commit
- DB 回滚：脚本执行前备份已自动创建，直接替换 `data/longxiang.db`
- `category-helper.js` 保留不删，回滚后立即生效

---

## 约束与注意事项

1. `parent_id` 和 `product_group` 字段对旧数据是 NULL，fallback 到 helper 保证旧数据不失效
2. 现有 `switchgear` slug（id=5）是二级分类（映射到 `medium-low-voltage`），新创建的一级类 slug 为 `group-switchgear`，不冲突
3. `UNIQUE(type, slug)` 约束：`group-transformer` 等新 slug 不与现有记录冲突
4. 迁移脚本和代码发布顺序：代码先上线（含 fallback 逻辑）→ 重启 → 再执行迁移脚本
5. `category-helper.js` 降级为 fallback，不删除，保证灰度过渡期安全
6. 一级类停用/删除保护：有 active child 的一级类不允许停用；有任何 child 的一级类不允许删除
7. 产品接口不信任产品表旧 `product_group / sub_category` 值：所有推导来源为分类表 + helper，避免历史脏数据污染
