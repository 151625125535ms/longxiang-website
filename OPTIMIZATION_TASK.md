# 前后端优化总任务表

> **每轮 Codex/Claude 交替时必须对照此表推进，不得跳过或跑偏。**
> 每次任务完成后，将对应条目状态从 ⏳/🔄 改为 ✅，并注明提交 hash 或验证结论。

---

## 已完成 ✅

| 编号 | 任务 | 提交/验证 |
|------|------|-----------|
| P0-1 | 敏感路径拦截中间件（Express 静态根目录暴露修复） | `2058ec5`，服务器 403 验证通过 |
| P1-4 | 产品详情页双 H1 修复（hero 固定 H1 改为 `.page-hero-title`） | `2058ec5` |
| P3-1 | 产品详情页 H2 在 H1 之前修复（删除冗余 H2） | `9bfe5a6` |
| DB-1 | content_blocks 内容填充（company-overview / contact / page-blocks） | `fill-content-blocks.js` 本地+服务器执行，audit=6，version=3 |
| P2-V | API 接口验证（admin content-blocks 接口确认迁移数据可读） | 本地验证：company-overview stats=4，contact mapLocations=electric,newEnergy |
| P2-I | 图片优化（补充 width / height / loading="lazy"） | `db5e56b`，11 个文件扫描，62 张静态图全部达标 |
| P2-M | 移动端点击目标检查（≥44px，WCAG 2.5.5） | 报告核实通过：hamburger 28×30px、footer 链接 ~22px 均未达标；Claude 已确认 |
| K-1  | Helmet CSP 草案评估 | 外部资源清单完整，草案通过 Claude 审核；upgradeInsecureRequests 改为生产环境条件启用 |
| P2-M-fix | CSS 触控目标修复（hamburger / 导航链接 / footer 链接） | `ea85b22`，服务器 CSS 资源 200 验证通过 |
| K-1-impl | CSP Report-Only 模式启用 | `0775926`，服务器首页响应头 `Content-Security-Policy-Report-Only` 验证通过 |
| P2-C | 缓存策略确认（CSS/JS 版本参数检查） | 报告输出至 `plan2.md`；站点主 CSS 均带版本参数，后台登录 CSS 无版本；英文多页 JS 无版本但服务端仅缓存 5 分钟 |
| DOCS | OPTIMIZATION_TASK.md 纳入 git 版本控制 | `docs: add optimization task tracking file`，仅提交本文件 |
| P2-C-fix | 版本参数补全（admin/login.html + 英文前台 JS） | `69bedc8`，9 个 HTML 文件版本参数补全 |
| TEST | Playwright Chromium 冒烟测试安装与运行 | `0dcd652`，4 条 smoke 用例全部通过 |

---

## 进行中 🔄

| 编号 | 任务 | 当前状态 |
|------|------|----------|
| 暂无 | 当前无进行中任务 | 等待下一轮 plan.md |

---

## 待执行（可立即开始，不依赖域名）⏳

| 编号 | 任务 | 说明 |
|------|------|------|
| TEST | 安装 Playwright Firefox/WebKit | `npm install --save-dev @playwright/test && npx playwright install` |

---

## 待执行（阻塞于域名确认）🔒

| 编号 | 任务 | 阻塞原因 |
|------|------|----------|
| P1-1 | 替换 `sitemap.xml`（55 处）+ `robots.txt`（1 处）错误占位域名 `hnlxdq.com` | 域名未确认 |
| SEO-1 | 为所有 HTML 页面新建 `<link rel="canonical">`、hreflang、OG URL 标签 | 域名未确认 |
| ENV-1 | 生产 `.env` 设置 `ALLOWED_ORIGINS`（解决 CORS `origin:true` P1 风险） | 域名未确认 |
| OPS-1 | Nginx 配置核查（gzip、SSL、HTTP→HTTPS 重定向） | 域名未上线 |
| OPS-2 | HTTPS / HSTS 验证 | 域名未上线 |
| PERF-1 | Lighthouse 全站跑分（性能 / SEO / 可访问性） | 建议域名上线后执行 |
| COMPAT | 跨浏览器全量兼容性测试（Firefox / WebKit / Safari） | 建议域名上线后执行 |

---

## 严格禁止事项（整个优化任务期间持续有效）

- 不得修改 education 相关接口、schema 或映射逻辑
- 不得修改 `GET /api/education` 的直接 body_json 返回逻辑
- 不得引入 `title_en` / `title_ar` / `title_cn` 到 education body_json
- 不得建议内容块删除类批量操作
- 不得建议插入 `categories(type='content')`

---

## 工作流说明

- **Claude** 负责：审核代码、核实结果、更新此文件、写 `plan.md` 给 Codex
- **Codex** 负责：执行任务、提交代码、部署服务器、写 `plan2.md` 给 Claude
- **plan.md / plan2.md**：桌面交换文件，顶部必须是"给对方的 Prompts"，每轮覆写
- **此文件**：项目内持久文件，随 git 保存，每轮完成后同步更新状态
