# 产品系列整理任务规格

## 任务目标

整理前台 Products 页面中的变压器产品数据，将两本产品册中的同一产品下不同规格型号合并为一个产品模块，减少重复产品卡片，让英文页面和阿拉伯语页面的数据展示都更规范。

本任务需要同时保证：

- 英文产品列表页 `products.html` 正常展示。
- 阿拉伯语产品列表页 `ar/products.html` 正常展示。
- 英文产品详情页 `product-detail.html?id=...` 正常展示。
- 阿拉伯语产品详情页 `ar/product-detail.html?id=...` 正常展示。
- `/api/products` 与 fallback `data/products.json` 结构一致。
- 后台产品管理能看到整理后的产品，前后端联调不破坏。

## 必读文档

- `docs/protocol/BASE_WORKFLOW.md`
- `docs/protocol/CODE_BOUNDARIES.md`
- `docs/protocol/HANDOFF_TEMPLATE.md`
- `docs/protocol/REVIEW_TEMPLATE.md`
- `docs/admin-ui/ADMIN_UI_WORKFLOW.md`
- `docs/cms/CMS_INVARIANTS.md`

## 数据源

用户原始描述写的是：

```text
D:\LX\产品册目录
```

Codex 本地核查时该目录不存在，实际可访问目录为：

```text
D:\LX\产品册
```

该目录下已确认存在：

```text
D:\LX\产品册\变压器画册版式-2硅钢.pdf
D:\LX\产品册\变压器画册版式-1非晶.pdf
```

Claude 开始实现前必须先确认这两个 PDF 可以读取。如果路径不同或 PDF 不存在，按 `Spec Issue Escalation` 停止并写回 Codex，不要凭记忆补数据。

## 产品合并规则

### 硅钢 PDF：`变压器画册版式-2硅钢.pdf`

最终应整理为 5 个产品模块：

| 模块 | 产品系列 | PDF 目录页 |
| --- | --- | --- |
| 1 | SC(B) 系列 | 02, 05, 08 |
| 2 | S□-M·RL 系列前三个产品 | 11, 14, 17 |
| 3 | S□-M·RL 系列后三个产品 | 20, 23, 26 |
| 4 | S□-M 系列前三个产品 | 29, 32, 35 |
| 5 | S□-M 系列第五类产品 | 38 |

### 非晶 PDF：`变压器画册版式-1非晶.pdf`

最终应整理为 6 个产品模块：

| 模块 | 产品系列 | PDF 目录页 |
| --- | --- | --- |
| 1 | SC(B)H□ 系列 | 02, 05, 08 |
| 2 | DGH 系列 | 11 |
| 3 | S(B)H□-M·RL 系列 | 14 |
| 4 | S(B)H□-M 系列第一组 | 17, 20, 23 |
| 5 | S(B)H□-M 系列第二组 | 26, 29, 32 |
| 6 | S(B)H□-M 系列第三组 | 35 |

注意：非晶 PDF 中第 4、5、6 类名称都属于 `S(B)H□-M` 系列，但它们是该系列下不同产品，不是同一产品下的不同规格型号。因此不能把第 4、5、6 类再合并成一个产品。

## 本轮范围

本轮允许 Claude 做以下事情：

1. 从两本 PDF 中提取上述页码对应的产品名称、型号、技术参数、容量范围、电压等级、产品特点。
2. 对现有 transformer 产品数据进行盘点，识别重复或拆分过细的记录。
3. 将目标硅钢和非晶变压器整理为 11 个产品模块。
4. 同步整理英文和阿拉伯语字段：
   - `name`
   - `nameAr`
   - `shortDesc`
   - `shortDescAr`
   - `description`
   - `descriptionAr`
   - `categoryLabel`
   - `categoryLabelAr`
   - `specs`
   - `capacities`
   - `voltages`
   - `aliases`
5. 同步保证公开 API 和 fallback JSON 可用：
   - SQLite 模式：`/api/products` 从 `data/longxiang.db` 读取。
   - fallback 模式：前端失败时读取 `data/products.json`。
6. 必要时新增脚本或数据补丁，用于把整理后的产品同步到 SQLite。
7. 验证英文和阿拉伯语产品列表、详情、搜索、分类筛选、对比选择功能。

## 明确不做

- 不改数据库 schema。
- 不改公开 API 响应结构。
- 不改 `GET /api/education`。
- 不改 education 数据。
- 不改 CMS content block schema。
- 不改后台一级模块结构。
- 不把 PDF 原文件提交进 git。
- 不提交 `data/longxiang.db`。
- 不提交 `screenshots/` 或 `test-results/`。
- 不只改英文而漏掉阿拉伯语。

## 允许修改的文件

Claude 可根据实际实现选择修改以下范围：

```text
data/products.json
scripts/
server/routes/admin/products.js
server/routes/products.js
js/products-list.js
js/product-detail.js
products.html
product-detail.html
ar/products.html
ar/product-detail.html
docs/tasks/product-series-restructure-report.md
```

如果只需要数据整理，优先只改：

```text
data/products.json
scripts/
docs/tasks/product-series-restructure-report.md
```

如果现有前端已经能正确展示合并后的数据，不要为了任务而重写前端。

## 禁止修改的文件/接口

```text
server/db/schema.sql
server/routes/education.js
docs/cms/CMS_INVARIANTS.md
docs/protocol/*
node_modules/
.agents/
backups/
.env
data/longxiang.db
```

禁止改变以下公开 API 的响应外形：

```text
GET /api/products
GET /api/products/:id
GET /api/education
GET /api/company
GET /api/certifications
```

## 实施步骤

### 1. 前置检查

1. 确认当前分支为 `main`。
2. 确认工作区状态，避免覆盖用户或 Codex 未提交变更。
3. 确认 PDF 路径：

```powershell
Get-ChildItem -LiteralPath 'D:\LX\产品册' -File
```

4. 确认两本 PDF 存在。
5. 如果 PDF 不存在，停止并写回 `C:\Users\hnlxd\Desktop\codex_check.md`。

### 2. 提取 PDF 内容

从两本 PDF 中只提取用户指定目录页对应的内容。

注意目录页码可能不是 PDF 物理页码。Claude 需要先确认 PDF 内部目录页与物理页的偏移关系，不要直接假设第 2 页就是目录页 `02`。

建议输出一个临时盘点表，至少包含：

```text
source_pdf
catalog_page
physical_page
module_id
series_name
model_variants
capacity_range
voltage_range
key_specs
notes
```

### 3. 设计 11 个产品模块

按用户指定分组生成 11 个产品模块。每个模块应有：

- 稳定 `id`，使用小写 kebab-case。
- 英文 `name`。
- 阿拉伯语 `nameAr`。
- 英文 `shortDesc` / `description`。
- 阿拉伯语 `shortDescAr` / `descriptionAr`。
- `group: "transformer"`。
- 合理 `category` / `subCategory`：
  - 干式：`dry-type`
  - 油浸式：`oil-immersed`
  - 特种或炉用：`special`
- `categoryLabel` / `categoryLabelAr`。
- `capacities`。
- `voltages`。
- `specs`，其中必须包含：
  - Product Model
  - Series / Variants
  - Transformer Type
  - Core Type 或 Structure
  - Cooling Method
  - Rated Voltage 或 Voltage Class
  - Capacity Range
  - Standard / Reference，如 PDF 中可提取
- `aliases`，保留被合并型号或旧产品 ID，保证旧详情链接尽量不失效。

### 4. 处理现有重复产品

当前本地 SQLite 中 transformer 类产品已有多条记录，包括但不限于：

```text
sbh15
s13
s20
scb14
SCBH15
SBH21-M-RL
SCB13
dgh
```

Claude 不能简单追加 11 个新产品导致公开页重复。必须选择一种可审查策略：

1. 推荐：更新/合并现有记录，保留核心旧 `legacy_id`，将被合并的旧 ID 写入 `aliases`。
2. 如果必须新增新 ID，则旧重复记录应改为 `draft` 或从 `data/products.json` 中移除，并在报告中列出原因。

无论采用哪种策略，公开 Products 页面最终不应同时显示同一产品的旧拆分卡片和新合并卡片。

### 5. 同步 JSON 与 SQLite

`data/products.json` 是 git 跟踪文件，必须保持为可用 fallback。

`data/longxiang.db` 不被 git 跟踪，不能提交。若需要同步 SQLite，必须提供可复用方式，例如：

- 新增或更新一个脚本，把整理后的 JSON 应用到 SQLite。
- 或通过后台 API 批量更新产品。
- 或在报告中写明本地执行了哪些 SQL/API 操作，以及线上如何重复执行。

不要只改 `data/products.json` 后宣称完成，因为当前服务在 `USE_SQLITE=true` 时公开 API 优先读取 SQLite。

### 6. 前后端联调

验证以下场景：

- `GET /api/products` 返回整理后的公开产品。
- `GET /api/products/:id` 对 11 个新/保留 ID 均正常。
- 旧 ID 或合并型号通过 `aliases` 能尽量打开正确详情。
- `products.html?group=transformer` 显示整理后的 transformer 产品。
- `products.html?group=transformer&sub=dry-type` 显示干式产品。
- `products.html?group=transformer&sub=oil-immersed` 显示油浸式产品。
- `ar/products.html?group=transformer` 显示阿拉伯语名称和描述。
- `ar/product-detail.html?id=...` 显示阿拉伯语详情。
- 搜索型号关键字能命中合并后的产品。
- 对比功能仍可选择产品。
- 后台产品列表能加载，产品编辑不会因字段缺失报错。

## 验收命令

基础静态检查：

```powershell
node --check server/routes/products.js
node --check server/routes/admin/products.js
node --check js/products-list.js
node --check js/product-detail.js
git diff --check
```

数据结构检查：

```powershell
node -e "const p=require('./data/products.json'); console.log(p.filter(x=>x.group==='transformer').map(x=>[x.id,x.name,x.nameAr,x.category,x.subCategory]).length)"
node -e "const p=require('./data/products.json'); const bad=p.filter(x=>x.group==='transformer'&&(!x.nameAr||!x.shortDescAr||!x.descriptionAr)); console.log(bad.map(x=>x.id)); if(bad.length) process.exit(1)"
```

服务验证：

```powershell
$env:USE_SQLITE='true'; npm start
```

另开 PowerShell：

```powershell
curl http://127.0.0.1:3000/api/products
curl http://127.0.0.1:3000/products.html?group=transformer
curl http://127.0.0.1:3000/ar/products.html?group=transformer
```

如果已有 smoke test 可用，运行：

```powershell
npx playwright test tests/smoke.spec.js --reporter=line
```

## 人工验收点

- 英文 Products 页面 transformer 分类下不再出现明显重复的型号拆分卡片。
- 阿拉伯语 Products 页面同样显示整理后的产品，而不是英文 fallback。
- 每个产品模块详情页能看到合并后的型号/规格信息。
- 旧链接如 `product-detail.html?id=sbh15`、`product-detail.html?id=s13`、`product-detail.html?id=SCBH15` 尽量仍能落到对应合并产品。
- 搜索 `SCB`、`S(B)H`、`DGH`、`M.RL`、`S13`、`S22` 能命中合理结果。
- 后台产品列表正常加载，编辑任一整理后的产品不报错。

## 截图要求

如 Claude 实现本任务，完成后至少提供以下截图路径：

- 英文 `products.html?group=transformer` 桌面 1440px。
- 阿拉伯语 `ar/products.html?group=transformer` 桌面 1440px。
- 英文任一整理后产品详情页。
- 阿拉伯语同一产品详情页。

截图目录不要提交进 git，因为 `.gitignore` 已忽略 `screenshots/`。

## 完成后请回填

Claude 完成后必须写入：

```text
C:\Users\hnlxd\Desktop\codex_check.md
```

并包含：

- 实际修改文件。
- 是否完全按规格实现。
- PDF 实际读取路径。
- PDF 页码偏移关系说明。
- 11 个最终产品模块清单。
- 被合并、下线或保留的旧产品 ID 清单。
- JSON 与 SQLite 如何同步。
- 英文页面验证结果。
- 阿拉伯语页面验证结果。
- 验收命令输出。
- 截图路径。
- `git diff --stat`。
- 未解决风险。

## 审核完后

请将实现报告写入 `C:\Users\hnlxd\Desktop\codex_check.md`，由用户转交 Codex 复核。
