# 域名确认后优化任务 — 完整交接文档

> **阅读对象**：接手后续域名相关优化任务的 Claude 实例。
> 阅读本文件后，你将完全了解项目背景、已完成工作、当前状态，以及域名到位后需要执行的全部任务。

---

## 一、项目背景

**项目**：河南龙翔电气有限公司外贸网站（英文 + 阿语双语）

**本地路径**：`D:\Projects\longxiang-website`
**服务器路径**：`/home/ubuntu/longxiang-website`（SSH 别名 `longxiang`）
**主分支**：`main`

**技术栈**：
- Node.js + Express，入口 `server/app.js`
- SQLite + better-sqlite3，数据库 `data/longxiang.db`
- 后台路由 `server/routes/admin/`，公开路由 `server/routes/`
- 前台 JS `js/`，后台 UI `admin/`
- 进程管理：PM2，实例数 = 1（单进程）

**工作流**：
- **Claude**：审核代码/结果 → 写 `C:\Users\hnlxd\Desktop\plan.md`（顶部是"给 Codex 的 Prompts"）
- **Codex**：执行任务 → 写 `C:\Users\hnlxd\Desktop\plan2.md`（顶部是"给 Claude 的 Prompts"）
- **plan.md / plan2.md** 每轮覆写，顶部 Prompts 不可省略、不可放末尾
- **主线任务文件**：`OPTIMIZATION_TASK.md`（本文件同级），每轮完成后更新状态

---

## 二、已完成的优化任务（截至 2026-06-13）

| 编号 | 任务 | 提交 |
|------|------|------|
| P0-1 | Express 静态根目录暴露 → 敏感路径拦截中间件 | `2058ec5` |
| P1-4 | 产品详情页双 H1 修复 | `2058ec5` |
| P3-1 | 产品详情页 H2/H1 语义顺序修复 | `9bfe5a6` |
| DB-1 | content_blocks 内容填充（company-overview/contact/page-blocks） | 脚本执行，audit=6 |
| P2-I | 图片优化（width/height/loading="lazy"，62 张） | `db5e56b` |
| P2-M-fix | 移动端触控目标修复（hamburger/导航/footer，≥44px） | `ea85b22` |
| K-1-impl | Helmet CSP Report-Only 启用 | `0775926` |
| P2-C-fix | 静态资源版本参数补全（admin/login.html + 英文页 JS） | `69bedc8` |
| TEST | Playwright Chromium 冒烟测试（4 条用例） | `0dcd652` |

**当前服务器最新提交**：`98bf419`（docs: update optimization task status）

---

## 三、当前待处理项（阻塞于域名）

### 3.1 域名情况说明

网站尚未购买/确认域名，`sitemap.xml`（55 处）和 `robots.txt`（1 处）中存在错误占位域名 `https://www.hnlxdq.com`，需要在域名确认后替换。

### 3.2 待执行任务（按优先级排序）

**第一批（域名到位立即执行）：**

| 编号 | 任务 | 文件/位置 | 说明 |
|------|------|-----------|------|
| ENV-1 | 设置 `ALLOWED_ORIGINS` | 服务器 `.env` | 解决 CORS `origin:true` P1 安全风险 |
| P1-1 | 替换错误占位域名 | `sitemap.xml`（55处）+ `robots.txt`（1处） | 将 `hnlxdq.com` 替换为真实域名 |
| SEO-1 | 创建 canonical/hreflang/OG 标签 | 所有 HTML 页面 | 标签当前完全不存在，需新建 |

**第二批（需要 HTTPS/服务器配置）：**

| 编号 | 任务 | 说明 |
|------|------|------|
| OPS-1 | Nginx 配置核查 | gzip、SSL、HTTP→HTTPS 重定向 |
| OPS-2 | HTTPS/HSTS 验证 | 确认强制 HTTPS 正常工作 |

**第三批（域名上线后执行）：**

| 编号 | 任务 | 说明 |
|------|------|------|
| PERF-1 | Lighthouse 全站跑分 | 性能/SEO/可访问性评分 |
| COMPAT | 跨浏览器兼容性测试 | 安装 Playwright Firefox/WebKit 后执行 |

---

## 四、域名到位后的执行指南

### Step 1：确认域名信息

需要知道：
- **主域名**：如 `https://www.longxiang-elec.com`
- **是否有 www 重定向**（www → 裸域 或 裸域 → www）
- **服务器 IP** / Nginx 是否已配置 SSL

### Step 2：ENV-1 — 设置 ALLOWED_ORIGINS

在服务器 `/home/ubuntu/longxiang-website/.env` 中新增：
```
ALLOWED_ORIGINS=https://www.<域名>,https://<域名>
```
然后 `pm2 reload longxiang-website`。

### Step 3：P1-1 — 替换 sitemap.xml 和 robots.txt

**sitemap.xml**：将所有 `https://www.hnlxdq.com` 替换为 `https://www.<真实域名>`
```powershell
(Get-Content sitemap.xml) -replace 'https://www\.hnlxdq\.com', 'https://www.<域名>' | Set-Content sitemap.xml
```

**robots.txt**：第 4 行 `Sitemap: https://www.hnlxdq.com/sitemap.xml` 替换为真实域名。

验证：`grep -c 'hnlxdq' sitemap.xml` 应返回 0。

### Step 4：SEO-1 — canonical/hreflang/OG 标签

所有 HTML 页面 `<head>` 中需新建（当前完全不存在）：

```html
<!-- canonical -->
<link rel="canonical" href="https://www.<域名>/当前页面.html">

<!-- hreflang（英文页面示例） -->
<link rel="alternate" hreflang="en" href="https://www.<域名>/index.html">
<link rel="alternate" hreflang="ar" href="https://www.<域名>/ar/index.html">
<link rel="alternate" hreflang="x-default" href="https://www.<域名>/index.html">

<!-- OG URL -->
<meta property="og:url" content="https://www.<域名>/当前页面.html">
```

涉及文件（英文版 + 阿语版对应）：
`index.html`、`products.html`、`product-detail.html`、`solutions.html`、`education.html`、`about.html`、`contact.html`、`certifications.html`、`compare.html`、`404.html`

### Step 5：OPS-1 — Nginx 核查

检查 `/etc/nginx/sites-available/` 中的配置：
- 是否有 SSL 证书（Let's Encrypt 或其他）
- 是否配置 HTTP → HTTPS 重定向（301）
- 是否启用 gzip
- 是否正确反向代理到 `http://127.0.0.1:3000`

### Step 6：OPS-2 — HTTPS/HSTS 验证

```bash
curl -sI https://www.<域名>/ | grep -i 'strict-transport\|location\|content-security'
```

### Step 7：PERF-1 — Lighthouse 跑分

推荐使用 Chrome DevTools 或 `npx lighthouse https://www.<域名>/ --output html` 生成报告。

### Step 8：COMPAT — 跨浏览器测试

```powershell
npx playwright install firefox webkit
npx playwright test tests/smoke.spec.js --project=firefox --project=webkit --reporter=line
```

---

## 五、可选优化（任何时间均可执行，不阻塞域名任务）

| 优化项 | 说明 |
|--------|------|
| CSP 强制模式 | 当前 Report-Only，观察无违规后改 `reportOnly: false` |
| 内联样式迁出 | 将 `index.html`/`ar/index.html` 的 `<style>` 块移入 `css/styles.css`，之后去掉 CSP 中的 `unsafe-inline` |

---

## 六、严格禁止事项（整个优化任务期间持续有效）

**以下内容在任何情况下都不得引入：**
- `mapEducationPublicResponse()`、`mapEducationFields()`、`convertEducationSchema()` 或任何 education body_json schema 转换方案
- 修改 `GET /api/education` 的直接 body_json 返回逻辑
- 向 education body_json 引入 `title_en`/`title_ar`/`title_cn`
- 内容块删除类批量操作
- 插入 `categories(type='content')`

---

## 七、快速验收命令参考

```powershell
# 启动本地服务
$env:USE_SQLITE="true"; npm start

# 敏感路径验证（应返回 403）
curl -sI http://localhost:3000/data/longxiang.db | head -1
curl -sI http://localhost:3000/server/app.js | head -1
curl -sI http://localhost:3000/package.json | head -1

# CSP 头验证
curl -sI http://localhost:3000/ | grep -i content-security

# Playwright 冒烟测试
npx playwright test tests/smoke.spec.js --reporter=line

# education schema 验证（必须返回 OK_OLD_SCHEMA）
curl http://localhost:3000/api/education | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const b=JSON.parse(d);console.log(b.hero&&b.hero.title?'OK_OLD_SCHEMA':'FAIL_NEW_SCHEMA');})"
```

---

## 八、给接手 Claude 的提示词模板

**当域名确认后，向 Claude 发送以下内容（替换 `<域名>` 后使用）：**

```
请读取项目文件 D:\Projects\longxiang-website\DOMAIN_READY_BRIEFING.md
和 D:\Projects\longxiang-website\OPTIMIZATION_TASK.md，
了解前后端优化任务的全部背景和当前状态。

域名已确认为：https://www.<域名>

请按照 DOMAIN_READY_BRIEFING.md 第四节的执行顺序，
从 ENV-1 开始，依次为 Codex 生成执行任务，
写入 C:\Users\hnlxd\Desktop\plan.md，
文件最上方必须是"给 Codex 的 Prompts"。
```
