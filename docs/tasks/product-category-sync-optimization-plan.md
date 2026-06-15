# 产品分类与前台产品展示一致性优化方案

## 背景

当前后台产品列表和分类管理模块已经具备产品分类数据维护能力，但前台 `products` 页面仍主要依赖静态 HTML 分类树和 `js/products-list.js` 内置分类配置。结果是后台新增、编辑、停用或删除产品分类后，前台 `Product Categories` 左侧列表不会自动同步；部分已发布产品虽然存在于后台和公开 API 中，但由于前台没有分类入口或过滤字段不一致，用户无法正常浏览。

## 当前架构诊断

### 后台分类管理

- 后台分类接口为 `/api/admin/categories?type=product`。
- 分类数据存储在 SQLite `categories` 表，关键字段包括 `type`、`slug`、`name_en`、`name_ar`、`sort_order`、`is_active`。
- 新增、编辑、删除分类均只影响数据库；当前没有公共分类接口供前台读取。
- 删除分类时已有引用检查：如果 `products` 或 `certifications` 仍引用分类，删除会被拒绝。

### 后台产品管理

- 后台产品列表接口为 `/api/admin/products`。
- 后台新增或编辑产品时，表单只提交 `category_id`。
- 服务端产品创建逻辑允许 `product_group`、`sub_category` 为空；后台表单不提交这两个字段。
- 前台产品过滤依赖 `group` 和 `subCategory`，因此后台新增产品存在"数据有效但前台过滤不到"的结构风险。

### 前台产品展示

- `products.html` 和 `ar/products.html` 的左侧 Product Categories 是静态 HTML。
- `js/products-list.js` 内部维护一份静态 taxonomy，并默认选中 `group=transformer`。
- 公开产品接口 `/api/products` 能返回已发布产品，但没有同步返回分类树。
- 现有储能产品已经是 `published`，且 `/api/products` 可返回，但前台普通入口没有将储能归入 `New Energy Equipment` 的二级分类，所以用户看不到。

> **适用范围**：本方案仅在 `USE_SQLITE=true` 环境下有效。若 SQLite 未启用，`/api/products` 会读取静态 `data/products.json`，旧 group 值（`ev-charger`、一级 `energy-storage`）仍会进入前台。当前生产环境 `.env` 已设置 `USE_SQLITE=true`，静态 JSON 路径不受本次改动影响。

## 优化目标

- 后台分类管理的新增、编辑、停用、删除操作，在前台刷新 `products` 页面后立即体现。
- 所有 `published` 且分类有效的产品，都能在前台正确出现在对应分类下。
- 后台产品保存只要求管理员选择分类，系统自动维护前台展示需要的 `group/subCategory`。
- 保持现有 URL 兼容并建立新入口，例如 `products.html?group=transformer`、`products.html?group=new-energy-equipment&sub=energy-storage`。
- 不引入高风险实时推送机制；本阶段采用刷新即同步。

## 技术实现方案

### 1. 新增公开产品分类接口

新增只读接口：

```text
GET /api/product-categories
```

返回 `type='product' AND is_active=1` 的分类树，供前台直接渲染：

```json
[
  {
    "group": "new-energy-equipment",
    "label": "New Energy Equipment",
    "labelAr": "معدات الطاقة الجديدة",
    "children": [
      {
        "sub": "energy-storage",
        "label": "Energy Storage",
        "labelAr": "نظام تخزين الطاقة"
      },
      {
        "sub": "ac",
        "label": "AC EV Charging Station",
        "labelAr": "محطة شحن تيار متردد"
      },
      {
        "sub": "dc",
        "label": "DC EV Charging Station",
        "labelAr": "محطة شحن تيار مستمر"
      }
    ]
  }
]
```

**API 契约（实施时必须遵守）：**

- 排序规则：父级 group 按 helper 内定义的固定顺序（transformer → new-energy-equipment → switchgear）；子类按 `categories.sort_order ASC, id ASC`。
- 返回范围：所有 `is_active=1` 的 product 类型分类，包括当前没有产品的分类（空分类也返回，前台自行决定是否渲染）。
- 只暴露展示字段：`group`、`sub`、`label`、`labelAr`；不暴露 `id`、`created_at`、`updated_at` 等后台审计字段。
- 本接口无需鉴权，挂载在 `/api/product-categories`（非 `/api/admin/`），在 `server/app.js` 中单独注册。

### 2. 抽取共享分类映射逻辑

新增服务端 helper 文件（路径由 Codex 确定，建议 `server/lib/category-helper.js`），统一处理：

- `category.slug → group / subCategory`
- `category.slug → 前台父级标签`
- 合法一级 group 集合：`VALID_GROUPS = new Set(['transformer', 'new-energy-equipment', 'switchgear'])`
- 产品 API 映射
- 后台产品创建/更新时字段回填
- 数据修复脚本

这样避免后台、前台、迁移脚本各维护一份不一致规则。

**分组规则（封闭映射，新分类必须显式加入）：**

| slug | group | subCategory |
| --- | --- | --- |
| `oil-immersed` | `transformer` | `oil-immersed` |
| `dry-type` | `transformer` | `dry-type` |
| `combined` | `transformer` | `combined` |
| `special` | `transformer` | `special` |
| `ac` | `new-energy-equipment` | `ac` |
| `dc` | `new-energy-equipment` | `dc` |
| `energy-storage` | `new-energy-equipment` | `energy-storage` |
| `high-voltage` | `switchgear` | `high-voltage` |
| `medium-low-voltage` | `switchgear` | `medium-low-voltage` |
| `switchgear` | `switchgear` | `medium-low-voltage` |

> **`switchgear` slug 的特殊说明**：数据库中有 1 个产品 `category.slug='switchgear'`（指向父级通用分类），当前 `sub_category='medium-low-voltage'`。helper 将其映射为 `sub='medium-low-voltage'`，修复脚本不改变该产品的 sub 值。前台 taxonomy 保持现有 `medium-low-voltage` 子项不变。

**重要约束：**

- **不支持"未命中规则自动成为独立 group"**。若某 slug 未在上表中，helper 返回 `null`，产品在前台不可见，并在日志中输出警告。
- 后续新增分类时，必须同步在 helper 映射表和前台 fallback taxonomy 中各新增一行，否则该分类的产品前台不可见。
- `VALID_GROUPS` 为封闭集合，与映射表的 group 列保持严格一致，不动态扩展。

本轮不使用 `categories.parent_id` 建立数据库父子层级。当前后台创建分类时 `parent_id` 固定为 `NULL`，前台一级/二级层级由服务端 helper 根据 slug 映射生成，避免引入数据库 schema 迁移和后台表单复杂度。

### 3. 修正公开产品 API

`/api/products` 映射每条产品时：

- 只返回 `p.status='published'` 的产品。
- 联表读取 `categories`（`LEFT JOIN`）。
- SQL 层过滤条件：`AND p.category_id IS NOT NULL AND c.id IS NOT NULL AND c.is_active = 1`；`category_id` 为空或分类不存在、分类停用的产品均不出现在前台。
- 必须在 `mapSqliteProduct` 中使用共享 helper 推导 `group/subCategory`：推导触发条件必须同时覆盖空值和过时非空值。

```js
const VALID_GROUPS = new Set(['transformer', 'new-energy-equipment', 'switchgear']);

if (!product_group || !VALID_GROUPS.has(product_group)) {
    // 根据 category_slug 调用 helper 推导 group/subCategory
    // 若 helper 返回 null（slug 未在映射表中），该产品不出现在前台
}
```

- 当前数据库中存在过时 group 值：`ev-charger`（6 个产品）和独立一级 `energy-storage`（4 个产品）。这些值非空但不属于 `VALID_GROUPS`，新代码部署后由 helper 正确推导，修复脚本执行后 DB 字段同步对齐。
- 保持原有字段名兼容：`category`、`categoryLabel`、`categoryLabelAr`、`group`、`subCategory`。

**停用产品分类的预期行为（明确定义）：**

- 停用分类不再出现在前台分类树中。
- 归属该分类的产品也不再出现在前台产品目录中（SQL 层过滤）。
- 后台仍可查看、重新启用该分类，产品数据不删除。
- 已有 `category_id=NULL` 的产品：前台不显示（过滤逻辑同上），后台可正常查看，编辑时必须选择有效分类才能保存。

### 4. 修正后台产品保存

后台产品 create/update 逻辑中：

- 校验 `category_id` 必须存在、`type='product'`，且 **`is_active=1`**（不允许将新产品绑定到已停用分类）。
- 已有产品若 `category_id` 指向停用分类，保留绑定关系但前台隐藏；编辑时必须重新选择有效分类。
- 根据分类 slug 调用 helper 自动写入 `product_group` 和 `sub_category`。
- POST 和 PUT 必须始终忽略请求体中的 `product_group`、`sub_category`，不能让外部提交值覆盖服务端推导结果。
- 后台表单不新增 group/sub 字段，避免运营人员理解内部技术字段。
- 编辑产品更换分类时同步更新 group/sub。
- 校验失败时返回 422，错误码 `VALIDATION_ERROR`，说明原因（如"所选分类不存在或已停用"）。

**停用分类的后台防误操作要求：**

后台对分类执行停用操作时，若该分类下存在 `status='published'` 的产品，接口必须在响应中返回影响数量提示，或在前台后台 UI 弹出确认框，显示"该分类下有 N 个已发布产品，停用后将从前台隐藏，是否继续？"，防止运营误操作。

### 5. 前台动态渲染 Product Categories

`js/products-list.js` 改造为：

- 页面加载时**并行**请求 `/api/product-categories` 和 `/api/products`（`Promise.all`），减少首屏等待。
- 分类接口失败时使用集中维护的 fallback taxonomy 常量，保证页面可用；产品接口失败时显示错误提示，不渲染产品列表。
- fallback taxonomy 常量必须与服务端 helper 的映射表保持同步，每次修改 helper 映射时必须同步更新 fallback。
- 根据分类 API 渲染左侧树，不再依赖 `products.html` 写死按钮。
- 删除现有独立一级 `energy-storage` taxonomy group；将现有 `ev-charger` group 改名为 `new-energy-equipment`，并把 `energy-storage` 与 `ac`、`dc` 放在同一 children 列表下。
- 删除 `normalizeProduct` 中把未知分类默认归为 `transformer` 的硬编码 fallback，避免掩盖脏数据。
- URL 参数仍使用 `group/sub/search/page`。
- 默认选中当前 URL 分类；如果 URL 分类不存在，则选择第一个有产品的分类；如果没有产品，则选第一个分类。
- 搜索、分页、Compare、询盘功能保持现有行为。

`products.html` 和 `ar/products.html`：

- 保留分类树容器，删除静态分类按钮，交给 JS 注入。
- 容器内保留一个加载占位符（如"Loading..."文字或骨架屏），避免 JS 加载期间分类区域完全空白。

### 6. 导航与入口同步

- 全局导航 Products 下拉中，将现有 `EV charger` 一级入口改名为 `New Energy Equipment`。
- `Energy Storage` 不作为一级导航入口，而是作为 `New Energy Equipment` 下的二级子类，与 `AC EV Charging Station`、`DC EV Charging Station` 并列。
- 页脚 Products 链接同步使用 `New Energy Equipment`；在可展示二级链接的位置包含 `Energy Storage`、`AC EV Charging Station`、`DC EV Charging Station`。
- 首页产品入口区域如继续维持有限类目展示，应将现有 `EV Charger` 入口升级为 `New Energy Equipment`，避免阻断用户进入储能产品。
- 后续可进一步让全站导航也完全由公共分类接口驱动。

`product-detail.html` 和 `compare.html` 本轮不做结构改造；它们继续通过 `/api/products/:id` 和 `/api/products` 读取产品数据，只需保持 API 字段兼容。

阿语页面继续保持 `/ar/` 路径结构不变，因为 `js/products-list.js` 通过 pathname 中的 `/ar/` 判断语言环境。

### 7. 数据修复脚本

新增一次性脚本：

```text
scripts/repair-product-category-mapping.js
```

功能：

- 扫描 `products` 表所有产品（含非 published）。
- 根据 `category_id → categories.slug → helper` 推导正确 `product_group / sub_category`。
- 修复空值、过时值或不一致值。重点覆盖当前过时 group：`ev-charger`（6 个产品）和独立一级 `energy-storage`（4 个产品）。
- 支持 `--dry-run`，默认先输出影响清单（含产品 ID、旧值、新值），不写库。
- **所有 UPDATE 操作必须在单一 `db.transaction()` 中执行**，失败时自动回滚，避免部分修复状态。
- 真正执行前自动备份 `data/longxiang.db` 到 `data/backups/longxiang.db.bak-repair-YYYYMMDD-HHmmss`。
- 输出修复摘要：影响产品总数、按 group 的变更统计、跳过（`category_id=NULL` 或 slug 未命中映射）的产品列表。

> **执行时序注意**：dry-run 在本地先验证，正式修复必须在新代码部署并服务重启后再执行。若 dry-run 与正式执行之间有时间间隔（后台产品被编辑），正式执行前须重新运行一次 dry-run 确认影响清单仍符合预期。

## 分阶段实施计划

### 阶段一：后端能力，0.5-1 天

- 新增分类映射 helper（`server/lib/category-helper.js`）。
- 新增 `/api/product-categories`，并在 `server/app.js` 注册路由。
- 修改 `/api/products` 映射和过滤（SQL 层 + helper 推导）。
- 修改后台产品 create/update 自动回填 group/sub，增加 is_active 校验。
- 编写数据修复脚本，并先在本地执行 `--dry-run` 验证影响清单。

### 阶段二：前台改造，0.5-1 天

- 改造 `js/products-list.js` 动态加载分类树（并行请求）。
- 简化 `products.html` 和 `ar/products.html` 静态分类结构，保留加载占位符。
- 将原 `EV charger` 一级入口改名为 `New Energy Equipment`，并在其下展示 `Energy Storage`、`AC EV Charging Station`、`DC EV Charging Station`。
- 保持现有 URL 兼容。

### 阶段三：测试验证，0.5 天

- 本地运行 JS 语法检查。
- 本地启动服务或调用接口验证 API。
- 验证英文、阿语产品页。
- 验证后台新增、编辑、停用分类后的前台刷新同步。
- 验证停用有产品的分类时，后台出现影响数量提示。
- 验证储能产品可通过 `New Energy Equipment > Energy Storage` 前台入口访问。
- 验证分类接口失败时前台 fallback taxonomy 正常渲染。
- 验证产品接口失败时前台显示错误提示。
- 本地执行修复脚本 `--dry-run`，确认影响清单：`ev-charger` 6 个产品 + 一级 `energy-storage` 4 个产品。

### 阶段四：部署，0.5 天

- 按 `AGENTS.md`：本地修改 → 本地验证 → `git add` → `git commit` → `git push` → 服务器 `git pull`。
- 服务器拉取新代码后，按 `ecosystem.config.js` 使用 PM2 重启服务（`pm2 reload ecosystem.config.js`），使新 helper、新 API 和新前端先上线。
- 服务器执行数据修复脚本 `--dry-run`，再次确认影响清单与本地一致。
- 确认无误后正式执行数据修复脚本（自动备份 → 事务更新 → 输出摘要）。
- 线上 smoke test：见"量化验收指标"章节。

## 回滚方案

**触发条件**：部署后出现产品大面积不可见、API 500 错误、前台分类树为空且 fallback 未生效等异常。

### 代码回滚

```bash
git revert HEAD --no-edit
git push origin main
# 服务器执行
git pull origin main
pm2 reload ecosystem.config.js
```

### 数据库回滚（修复脚本已执行时）

```bash
# 备份文件路径：data/backups/longxiang.db.bak-repair-YYYYMMDD-HHmmss
cp data/backups/longxiang.db.bak-repair-YYYYMMDD-HHmmss data/longxiang.db
pm2 reload ecosystem.config.js
```

> 修复脚本使用事务，若脚本执行中途失败会自动回滚，DB 不会处于部分修复状态，无需手动恢复。只有脚本完整执行成功后才需要以上手动回滚步骤。

## 权限与责任

| 角色 | 职责 | 所需权限 |
| --- | --- | --- |
| Codex | 编写代码、本地验证、commit/push、服务器部署、执行修复脚本 | GitHub push、服务器 SSH、SQLite 写权限、PM2 重启权限 |
| Claude | 方案审查、代码审查，不执行任何代码修改或文件改动 | 只读 |
| 服务器 | 只执行 `git pull` 和 PM2 重启，不直接写代码 | — |

## 测试策略

### API 测试

- `/api/product-categories` 返回 active 产品分类，按规定顺序排列。
- `/api/product-categories` 包含当前无产品的 active 分类。
- 停用分类后，`/api/product-categories` 不返回该分类。
- `/api/products` 不返回 draft/deleted 产品。
- `/api/products` 不返回 `category_id=NULL`、分类不存在或分类停用的产品。
- `/api/products` 中所有产品的 `group` 字段属于 `VALID_GROUPS`，不存在 `ev-charger` 或独立一级 `energy-storage`。
- 储能分类产品返回 `group=new-energy-equipment`、`subCategory=energy-storage`。
- 后台新增产品只选分类，公开 API 返回正确 group/subCategory。
- 修复脚本 `--dry-run` 不写库（执行前后数据库 MD5 不变）。

### 前台测试

- `products.html` 左侧分类树由接口数据渲染，不含静态按钮。
- `ar/products.html` 使用 `name_ar`，缺失时 fallback 到英文名。
- `products.html?group=new-energy-equipment&sub=energy-storage` 显示 **4 个**储能产品。
- `products.html?group=transformer` 显示 **24 个**变压器产品。
- `products.html?group=new-energy-equipment`（不带 sub）显示 **6 个** AC/DC 充电桩产品 + **4 个**储能产品，共 **10 个**。
- `products.html?group=unknown` 自动 fallback 到有效分类。
- 断开 `/api/product-categories` 时，前台 fallback taxonomy 正常渲染，产品仍可按 fallback 分类过滤。
- 断开 `/api/products` 时，前台显示错误提示，不崩溃。
- 搜索、分页、比较、询盘按钮仍可用。

### 后台测试

- 分类新增、编辑、停用后，后台列表更新。
- 停用有已发布产品的分类时，后台返回影响数量提示。
- 有产品引用的分类删除被拒绝。
- 无产品引用的分类删除成功，前台刷新后消失。
- 新增产品只选择 active 分类即可在前台正确显示，group/subCategory 自动回填。
- 尝试将产品绑定到停用分类时，后台返回 422 错误并说明原因。

### 回归测试

```powershell
node --check server/app.js
node --check server/routes/products.js
node --check server/routes/product-categories.js
node --check server/lib/category-helper.js
node --check js/products-list.js
node --check js/main.js
git diff --check
```

- 产品详情页和 Compare 页仍能加载产品数据（API 字段兼容）。
- 阿语页面语言切换正常（`/ar/` 路径结构未变）。

## 性能与安全考量

- 分类接口数据量很小，刷新请求开销可忽略。
- `/api` 已设置 `Cache-Control: no-store`，满足刷新即同步。
- 前台并行加载分类和产品，首屏时间不因两次请求而翻倍。
- 不引入 SSE 或 WebSocket，避免过度复杂化。
- 公共分类接口只暴露展示字段，不暴露后台审计字段。
- 后台写操作仍使用现有鉴权链路。
- 服务端校验 `category_id` 存在且 `is_active=1`，避免产品绑定到停用分类。
- 数据修复脚本使用事务 + 执行前自动备份，失败自动回滚。

## 量化验收指标

部署并执行修复脚本后，必须满足以下所有指标：

| 指标 | 期望值 |
| --- | --- |
| `/api/products` 返回产品总数 | ≥ 50 |
| `/api/products` 中 `group` 为非法值的产品数 | 0 |
| `/api/products` 中 `group='ev-charger'` 的产品数 | 0 |
| `/api/products` 中 `group='energy-storage'`（一级） 的产品数 | 0 |
| `group=new-energy-equipment&sub=energy-storage` 返回产品数 | 4 |
| `group=transformer` 返回产品数 | 24 |
| `group=new-energy-equipment`（不带 sub） 返回产品数 | 10 |
| `group=switchgear` 返回产品数 | 5 |
| 修复脚本 dry-run 报告影响产品数 | 10（ev-charger×6 + energy-storage×4） |

## 方案成熟标准

- 后台分类改动后，前台刷新即可看到一致分类树。
- 公开 API 与后台数据一致，无有效产品被前台过滤丢失。
- 储能产品可从 `New Energy Equipment` 二级分类入口访问。
- 新增产品不需要手工维护 group/subCategory。
- 所有量化验收指标通过。
- 所有回归测试通过，服务器工作区干净，GitHub 与服务器 HEAD 一致。
