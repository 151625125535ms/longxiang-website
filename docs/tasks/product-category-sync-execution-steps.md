# 产品分类与前台展示一致性优化 — 分步执行清单

> 本文档是 `product-category-sync-optimization-plan.md` 的配套执行清单，供 Codex 逐步实施。
> 每个 Step 完成后在对应验收项打勾（`[x]`），再进行下一步。

## 执行前提（每次新会话必须先执行）

1. 读取 `IMPLEMENTATION_PLAN.md`、`PROGRESS.md`
2. 读取 `server/app.js`、`server/lib/db.js`、`server/middleware/auth.js`
3. 确认 `.env` 中 `USE_SQLITE=true` 已设置
4. 确认理解后再开始实施

---

## Step 1：编写分类映射 helper

**新建文件**：`server/lib/category-helper.js`

**内容要求**：

- 定义 `CATEGORY_MAP`，包含以下 10 条封闭映射：

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

- 定义 `VALID_GROUPS = new Set(['transformer', 'new-energy-equipment', 'switchgear'])`
- 导出 `getCategoryMapping(slug)` 函数：slug 命中则返回 `{ group, subCategory }`，未命中返回 `null` 并输出 `console.warn`
- 导出 `VALID_GROUPS`，供其他模块引用

**验收**：

- [ ] 文件存在：`server/lib/category-helper.js`
- [ ] `getCategoryMapping('energy-storage')` → `{ group: 'new-energy-equipment', subCategory: 'energy-storage' }`
- [ ] `getCategoryMapping('ev-charger')` → `null` + `console.warn` 输出
- [ ] `getCategoryMapping('switchgear')` → `{ group: 'switchgear', subCategory: 'medium-low-voltage' }`
- [ ] `node --check server/lib/category-helper.js` 无错误

---

## Step 2：新增 `/api/product-categories` 路由

**新建文件**：`server/routes/product-categories.js`

**内容要求**：

- 查询 `categories WHERE type='product' AND is_active=1`
- 使用 helper 将每条分类映射为 `{ group, sub, label, labelAr }`
- parent group 按 helper 中定义的固定顺序排列：transformer → new-energy-equipment → switchgear
- 子类按 `sort_order ASC, id ASC` 排序
- 只暴露 `group`、`sub`、`label`、`labelAr`，不暴露 `id`、`created_at`、`updated_at`
- 无需鉴权

**修改文件**：`server/app.js`

- 在适当位置注册路由：`app.use('/api/product-categories', require('./routes/product-categories'))`
- 注册位置在 `/api/admin` 路由之前

**验收**：

- [ ] `GET /api/product-categories` 返回 200，结构包含 `group/sub/label/labelAr`
- [ ] 返回顺序：transformer 的子类 → new-energy-equipment 的子类 → switchgear 的子类
- [ ] 停用分类不在返回结果中
- [ ] 当前无产品的 active 分类仍在返回结果中（空分类也返回）
- [ ] `node --check server/routes/product-categories.js` 无错误
- [ ] `node --check server/app.js` 无错误

---

## Step 3：修改 `/api/products` 的 mapSqliteProduct

**修改文件**：`server/routes/products.js`

**修改要求**：

- SQL 查询增加过滤条件：`AND p.category_id IS NOT NULL AND c.id IS NOT NULL AND c.is_active = 1`
- 引入 `getCategoryMapping` 和 `VALID_GROUPS` from `server/lib/category-helper.js`
- 在 `mapSqliteProduct` 中，推导触发条件同时覆盖空值和过时非空值：

  ```js
  const { VALID_GROUPS, getCategoryMapping } = require('../lib/category-helper');

  // 在 mapSqliteProduct 内：
  if (!product_group || !VALID_GROUPS.has(product_group)) {
      const mapped = getCategoryMapping(category_slug);
      if (!mapped) return null; // 该产品过滤掉，不出现在前台
      group = mapped.group;
      subCategory = mapped.subCategory;
  }
  ```

- helper 返回 null 的产品不包含在最终结果中（在 map 后 filter 掉 null）
- 保持现有字段名：`category`、`categoryLabel`、`categoryLabelAr`、`group`、`subCategory`

**验收**：

- [ ] `/api/products` 返回的所有产品 `group` 字段在 `VALID_GROUPS` 内
- [ ] `group='ev-charger'` 的产品不再出现
- [ ] 独立一级 `energy-storage` 产品不再出现
- [ ] `category_id=NULL` 或分类停用的产品不在结果中
- [ ] `node --check server/routes/products.js` 无错误

---

## Step 4：修改后台产品 POST/PUT

**修改文件**：`server/routes/admin/products.js`

**POST 修改（约第 337-338 行）**：

- 删除 `product_group: body.product_group ? ...` 和 `sub_category: body.sub_category ? ...`
- 校验 `body.category_id` 存在、`type='product'`、`is_active=1`；失败时返回 422 + `VALIDATION_ERROR`，消息："所选分类不存在或已停用"
- 由 `category_id` 查询 `categories.slug`，调用 helper 写入 `product_group`/`sub_category`
- 若 helper 返回 null，返回 422 + `VALIDATION_ERROR`，消息："分类映射未定义，请联系管理员"

**PUT 修改（约第 423-424 行）**：

- 同 POST，始终忽略请求体的 `product_group`/`sub_category`
- 更换 `category_id` 时同步更新 `product_group`/`sub_category`

**验收**：

- [ ] 后台新增产品只选分类，`product_group`/`sub_category` 自动写入 DB
- [ ] 提交包含 `product_group` 字段的请求体，DB 中仍是 helper 推导值（不被覆盖）
- [ ] 绑定停用分类时，返回 422 + 说明原因
- [ ] `node --check server/routes/admin/products.js` 无错误

---

## Step 5：编写数据修复脚本

**新建文件**：`scripts/repair-product-category-mapping.js`

**内容要求**：

- 扫描 `products` 全表（含非 published）
- 通过 `category_id → categories.slug → helper` 推导正确 `product_group`/`sub_category`
- 支持 `--dry-run` 参数：输出影响清单（产品 ID、旧值、新值），不写 DB
- 正式执行前自动备份 DB 到 `data/backups/longxiang.db.bak-repair-YYYYMMDD-HHmmss`
- 所有 UPDATE 在单一 `db.transaction()` 内执行，失败自动回滚
- 输出摘要：影响总数、按 group 变更统计、跳过产品列表
- `switchgear` slug 对应产品：只更新 `product_group`，不改变已有 `sub_category='medium-low-voltage'`

**本地验证**（Step 5 完成后立即执行）：

```powershell
node scripts/repair-product-category-mapping.js --dry-run
```

期望：影响 10 个产品（`ev-charger` 6 个 + 一级 `energy-storage` 4 个）

**验收**：

- [ ] `--dry-run` 输出影响 10 个产品，不写 DB
- [ ] dry-run 前后 DB 文件哈希不变：`certutil -hashfile data/longxiang.db MD5`
- [ ] `node --check scripts/repair-product-category-mapping.js` 无错误

---

## Step 6：改造 `js/products-list.js`

**修改文件**：`js/products-list.js`

**修改要求**：

- 页面加载时用 `Promise.all` 并行请求 `/api/product-categories` 和 `/api/products`
- 分类接口失败时使用集中维护的 `FALLBACK_TAXONOMY` 常量（常量内容与 helper 映射表严格一致）
- 产品接口失败时显示错误提示，不崩溃
- 删除现有独立一级 `energy-storage` group
- 将现有 `ev-charger` group 改名为 `new-energy-equipment`
- 将 `energy-storage` 加入 `new-energy-equipment` children，与 `ac`、`dc` 并列
- 删除 `normalizeProduct` 中把未知分类默认归为 `transformer` 的硬编码 fallback
- URL 参数保持 `group/sub/search/page` 不变
- 分类不存在时：先 fallback 到第一个有产品的分类，再 fallback 到第一个分类

**验收**：

- [ ] 前台分类树由接口数据渲染，无静态分类按钮
- [ ] `?group=new-energy-equipment&sub=energy-storage` 显示 **4 个**储能产品
- [ ] `?group=transformer` 显示 **24 个**变压器产品
- [ ] `?group=new-energy-equipment`（不带 sub）显示 **10 个**产品
- [ ] `?group=unknown` 自动 fallback 到有效分类
- [ ] 断开分类接口时，`FALLBACK_TAXONOMY` 渲染正常，产品仍可过滤
- [ ] `node --check js/products-list.js` 无错误

---

## Step 7：修改 `products.html` 和 `ar/products.html`

**修改要求**：

- 删除分类树区域内的静态按钮 HTML
- 保留分类树容器元素（保留 `id` 或 `class` 供 JS 识别）
- 容器内保留加载占位符：`<div class="loading-placeholder">Loading...</div>`（或骨架屏）
- `ar/products.html` 保持 `/ar/` 路径结构不变，不修改 URL 结构

**验收**：

- [ ] 页面初始加载期间显示占位符
- [ ] JS 加载完成后分类树正常渲染（占位符消失）
- [ ] `ar/products.html` 的 `isArabic` 检测正常（`true`）
- [ ] 语言切换正常

---

## Step 8：更新导航与页脚

**修改范围**：全局导航文件、页脚文件、首页（`index.html`）产品入口区域

**修改要求**：

- 全局导航 Products 下拉：`EV Charger` 一级入口 → `New Energy Equipment`
- `Energy Storage` 从导航一级入口移除，改为 `New Energy Equipment` 下的二级项，与 `AC EV Charging Station`、`DC EV Charging Station` 并列
- 页脚 Products 区域：`EV Charger` → `New Energy Equipment`；在可展示二级链接位置包含 `Energy Storage`、`AC EV Charging Station`、`DC EV Charging Station`
- 首页产品入口：`EV Charger` 升级为 `New Energy Equipment`

**验收**：

- [ ] 全站导航无 `EV Charger` 一级入口
- [ ] `New Energy Equipment` 导航入口存在且链接正确
- [ ] `Energy Storage` 出现在 `New Energy Equipment` 下，不作为独立一级入口

---

## Step 9：回归检查（提交前必须全部通过）

```powershell
node --check server/app.js
node --check server/routes/products.js
node --check server/routes/product-categories.js
node --check server/lib/category-helper.js
node --check server/routes/admin/products.js
node --check scripts/repair-product-category-mapping.js
node --check js/products-list.js
node --check js/main.js
git diff --check
```

**前台验证**（本地服务启动后）：

- [ ] 产品详情页（`/api/products/:id`）仍能加载产品数据（API 字段兼容）
- [ ] Compare 页仍能加载产品数据
- [ ] 阿语页面语言切换正常

---

## Step 10：提交与部署

### 本地提交

```bash
git add server/lib/category-helper.js
git add server/routes/product-categories.js
git add server/routes/products.js
git add server/routes/admin/products.js
git add server/app.js
git add scripts/repair-product-category-mapping.js
git add js/products-list.js
git add products.html ar/products.html
# 加导航/页脚/首页相关文件
git commit -m "feat: 产品分类与前台展示一致性优化"
git push origin main
```

### 服务器部署

```bash
git pull origin main
pm2 reload ecosystem.config.js
```

### 数据修复（部署完成、服务重启后再执行）

```bash
# 第一步：dry-run 再次确认（若与本地 dry-run 间隔较长，须重新运行）
node scripts/repair-product-category-mapping.js --dry-run

# 第二步：确认影响清单符合预期后正式执行
node scripts/repair-product-category-mapping.js
```

### Smoke test（部署 + 修复后）

| 验收指标 | 期望值 | 通过 |
| --- | --- | --- |
| `/api/products` 返回产品总数 | ≥ 50 | [ ] |
| `group` 为非法值的产品数 | 0 | [ ] |
| `group='ev-charger'` 的产品数 | 0 | [ ] |
| `group='energy-storage'`（一级）的产品数 | 0 | [ ] |
| `group=new-energy-equipment&sub=energy-storage` 返回数 | 4 | [ ] |
| `group=transformer` 返回数 | 24 | [ ] |
| `group=new-energy-equipment`（不带 sub）返回数 | 10 | [ ] |
| `group=switchgear` 返回数 | 5 | [ ] |
| 修复脚本 dry-run 报告影响数（本地验证） | 10 | [ ] |

---

## 关键执行约束

1. **Step 1 必须最先完成**，Steps 2/3/4/5 均依赖 helper
2. **部署顺序**：代码先上线（Step 10 前半）→ 重启 → dry-run 再确认 → 正式修复
3. **不要在部署新代码之前正式执行修复脚本**（旧前端不识别 `new-energy-equipment`，会导致产品短暂不可见）
4. **新增分类时**：必须同步在 `server/lib/category-helper.js` 映射表和 `js/products-list.js` 的 `FALLBACK_TAXONOMY` 各添加一行
5. **回滚**：如出现异常，参见 `product-category-sync-optimization-plan.md` 中的"回滚方案"章节
