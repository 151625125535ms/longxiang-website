# 当前事实清单

更新时间：2026-07-13 19:56（Asia/Shanghai）
用途：记录当前线上真实状态，作为后续修改、部署、SEO/i18n 调整和后台内容维护的对照基线。
更新原则：只记录已经通过本地、GitHub、服务器或真实 HTTP 结果核验过的事实；未核验项必须明确标注。

## 代码与部署

- 本地分支：`main`
- 2026-07-13 产品详情图库代码提交 `e5ddf04`（`实现产品详情多图图库闭环`）已推送至 GitHub；生产服务器已通过 `git pull --ff-only origin main` 从 `25eeb82` 快进到该提交。
- 2026-07-13 图库切换修复提交 `0ac95b8`（`修复产品图库脚本缓存导致无法切图`）已推送并部署；根因是公共壳层把 `product-detail.js` 改写为旧的 30 天 immutable 缓存版本，修复后仅产品详情脚本使用 `20260713-product-gallery-interaction-fix`。
- 生产使用 `pm2 reload longxiang-website --update-env` 完成无停机重载，进程保持 `online`；部署后内网和公网健康接口均返回成功。
- 本次提交未修改依赖、数据库结构或迁移，因此未执行 `npm install`，也未写入生产数据库、生产上传目录或产品图库数据。
- 生产服务器工作区在部署前后均无 tracked 改动。
- 本地未跟踪噪音：`.tmp/`、`chanpince/`，按项目规则默认不处理
- 禁止同步方向：不得执行 `git push longxiang`；服务器只允许 `git pull origin main`
- 2026-07-08 产品图片资源关联修复代码提交：`8690b6b`（`补充产品图片资源关联修复入口`）已推送 GitHub 并由生产服务器 `git pull origin main` 拉取；本次只部署脚本、审计口径和运维文档，未执行生产数据库 `--apply`。

## 运行环境

- `package.json` 要求：Node.js `>=24 <25`，npm `>=11 <12`
- 生产 PM2 进程：`longxiang-website`
- PM2 状态：`online`
- PM2 实例数：`1`
- PM2 模式：`cluster_mode`
- PM2 应用 Node 版本：`v24.18.0`
- PM2 Node 路径来源：`/home/ubuntu/.nvm/versions/node/v24.18.0/bin`
- 服务器 SSH 默认 `node`：`v18.19.1`
- 服务器 SSH 默认 `npm`：`9.2.0`
- 重要注意：生产应用实际使用 Node 24，但 SSH 默认 shell 是 Node 18；涉及 `better-sqlite3` 的脚本必须显式使用 Node 24 路径或正确加载 nvm 环境，否则会出现 Node ABI 不匹配。

## 生产环境变量基线

只核验了非敏感键：

- `PORT=3000`
- `NODE_ENV=production`
- `UPLOAD_DIR=/var/lib/longxiang/uploads`
- `UPLOAD_PUBLIC_PATH=uploads`

## 线上 HTTP 状态

- 首页：`https://www.lxenelectric.com/` 返回 `HTTP/2 200`
- sitemap：`https://www.lxenelectric.com/sitemap.xml` 返回 `HTTP/2 200`
- robots：`Sitemap: https://www.lxenelectric.com/sitemap.xml`
- 线上 sitemap URL 数：`184`
- 本地 `node scripts/generate-sitemap.js --dry-run` URL 数：`184`
- 生产 `node scripts/generate-sitemap.js --dry-run` URL 数：`184`
- 公网 `https://www.lxenelectric.com/api/health` 返回 `HTTP 200`，`ok=true`、`sqlite=true`
- 公网 `en/ar/fr/ru` 产品详情已通过真实浏览器验收：页面成功水合，单图产品无缩略图和切换控件，阿语为 RTL，`390x844` 视口无横向溢出，未发现页面脚本错误或图片加载失败
- 公网多图产品 `segmented-arc-quenching-surge-arrester` 已通过真实交互验收：3 张图片的缩略图点击和上下切换按钮均能更新主图、选中态与计数；四语和手机视口均通过

## 多语言与 SEO

- 默认语言：`en`
- 当前支持语言：`en`、`ar`、`fr`、`ru`
- 当前进入 sitemap 的语言：`en`、`ar`、`fr`、`ru`
- 当前 planned 语言：`pt`
- `pt` 当前状态：只在 `plannedLocales` 中预留，`includeInSitemap=false`
- 本地 SEO/i18n 校验：`node scripts/verify-seo-i18n.js` 通过
- 生产 SEO/i18n 校验：使用 Node 24 运行 `node scripts/verify-seo-i18n.js` 通过

## 生产数据库

数据库：`/home/ubuntu/longxiang-website/data/longxiang.db`
模式：SQLite WAL，`PRAGMA journal_mode` 返回 `wal`
统计方式：生产服务器使用 Node 24 + `better-sqlite3` 只读查询。

当前核心数据量：

| 对象 | 数量 | 备注 |
| --- | ---: | --- |
| products | 53 | 其中 `published=38`，`deleted=15` |
| categories | 17 |  |
| certifications | 76 | 全部 `published` |
| content_blocks | 15 |  |
| assets | 217 |  |
| product_media | 55 | 其中非封面媒体 `2` |
| inquiries | 8 |  |

当前关键表：

- `products`
- `categories`
- `certifications`
- `content_blocks`
- `assets`
- `product_media`
- `product_specs`
- `inquiries`
- `asset_references`
- `admin_settings`
- `audit_logs`
- `schema_migrations`

重要结构事实：

- 生产 `products` 表没有 `image` 字段。
- 产品图片当前以 `product_media.path` 为主。
- 产品详情图库继续使用 `product_media` 作为唯一数据源，不新增图库字段或第二套关系；封面为 `is_cover=1, sort_order=1`，图库从 2 开始连续排序。
- 2026-07-13 生产试点后只读复核：38 个 published 产品中，`segmented-arc-quenching-surge-arrester` 有 3 张图片（1 张封面、2 张图库图），其余 37 个产品仍为单图。
- `products` 已有 `fr`、`ru` 字段族，例如 `name_fr`、`name_ru`、`description_fr`、`description_ru`、`seo_title_fr`、`seo_title_ru`。
- `certifications` 已有 `fr`、`ru` 字段族。

## 图片与上传资源

生产图片审计命令：`npm run images:audit`（在 Node 24 环境下执行）

当前结果：

- `uploadDir`：`/var/lib/longxiang/uploads`
- `uploadPublicPath`：`uploads`
- missing cover files：`0`
- invalid product_media paths：`0`
- non-upload product_media paths：`23`
- orphan upload files：`9`
- 产品图库派生缩略图缓存文件：`3`
- `assets.entity_id IS NULL`：`213`
- `product_media.asset_id IS NULL`：`1 / 55 (1.82%)`

解释：

- `missing cover files=0` 和 `invalid product_media paths=0` 是当前图片链路的关键健康信号。
- `assets.entity_id IS NULL` 与 `product_media.asset_id IS NULL` 当前属于已知未完全闭合的资源关联信号，不等同于页面图片缺失，但后续资源治理应跟踪。

2026-07-08 补充运维入口：

- 产品媒体资源关联 dry-run：`npm run images:repair-product-links`
- 产品媒体资源关联 apply：`npm run images:repair-product-links -- --apply`
- 产品媒体资源关联验证：`npm run images:verify-product-links`
- 该入口只补产品图片链路的 `assets`、`product_media.asset_id` 和产品 owner 的 `asset_references`；生产执行 `--apply` 属于数据库写入，必须先 dry-run、确认备份、说明回滚与验证方式，并取得明确确认。
- 2026-07-08 生产 dry-run 结果：`product_media.asset_id IS NULL=1/53`，`product_media missing active asset paths=1`，缺口文件为 `/home/ubuntu/longxiang-website/成品区/干式非晶三相三柱 .png` 且 `file_exists=true`，受影响 owner 为产品 `12`；`product asset_references missing=0`，`stale product asset_references=0`。未执行生产 `--apply`。

2026-07-13 产品详情图库代码能力验收：

- 临时数据库完成后台真实上传 4 张图库图片、前移/后移、保存、关闭重开和顺序持久化；接口测试另覆盖删除、清空、只修改封面和封面/图库去重。
- 临时数据库中的 `product_media.asset_id`、连续 `sort_order` 与产品 owner `asset_references` 完全一致；`npm run images:verify-product-links` 等价验证为 `ok=true`、退出码 0。
- Playwright 覆盖桌面 `1440x900`、手机 `390x844`、`en/ar/fr/ru`、RTL、JavaScript 禁用和单图无控件状态，7/7 通过；图片请求无 404，手机无横向溢出。
- 第一轮使用产品卡片 WebP 的 5 图测试新增传输约 `145368` bytes，但该样本不能代表后台直接上传的原始产品图，不作为最终性能结论。
- 改用仓库中真实的 0.59–1.39MB 产品 PNG 后，直接加载原图缩略列表的首屏新增传输为 `3390085` bytes，超过 `2.5MB` 门槛约 29%，因此未采用该实现。
- 经单独授权后补充最小派生链路：主图和 SEO 保持原图，缩略图通过受产品媒体顺序约束的 `/media/product-gallery/:identifier/:index.webp` 按需生成 `320x240` WebP，缓存位于 `uploads/.cache/product-gallery/`；无需数据库迁移，也不改变 `product_media` 权威数据源。
- 同一组真实 PNG 最终复测：图库首屏新增传输为 `42668` bytes；单图 LCP `144ms`，多图 LCP `132ms`。Playwright 后台及前台 7/7 通过，桌面、手机、四语、RTL、无 JavaScript 和单图场景均达到验收目标。
- `npm run images:audit` 会单独统计产品图库派生缓存文件，并将专用缓存目录排除在孤儿上传文件检查之外；临时干净数据库验证未产生资源引用缺口或孤儿缓存误报。
- 现有本地业务数据库的资源验证仍保留执行前噪音基线：2 个媒体路径缺少 active asset、1 个产品 owner 引用缺口、3 个过期引用。图库改动不得新增或替换这些缺口；不为本任务顺手修改本地业务数据。
- 当前图库代码能力已达到状态 B，并已进入生产多图试点：`segmented-arc-quenching-surge-arrester` 的 3 图交互已通过自动化真实浏览器技术验收。用户侧确认修复结果前暂不标记为状态 C；继续为其他产品写入图库数据仍须单独确认产品、图片和顺序。

## 备份与监控

- 最新备份包：`/var/backups/longxiang/daily-20260706-181702.tar.gz`
- 最新备份包大小：约 `23M`
- 备份日志最近记录：2026-07-02 至 2026-07-06 均生成 daily 备份
- 监控日志最近状态：2026-07-07 00:45:03Z 显示网站、Node health、TLS、磁盘、PM2 均 OK
- 监控磁盘信号：磁盘使用率低于阈值，最近记录为 `13% below 85%`
- TLS 信号：证书有效期超过 21 天

## 当前已知风险

- 服务器 SSH 默认 Node/npm 与项目 engines 不一致；直接用默认 `node` 跑依赖 `better-sqlite3` 的脚本会失败。部署、排障和手工脚本执行时必须显式进入 Node 24 环境。
- 资源关联尚未完全闭合：`assets.entity_id IS NULL=213`，`product_media.asset_id IS NULL=1/55`。图库试点新增图片没有产生产品 owner 引用缺口或过期引用；剩余缺口仍是此前产品 12 的旧路径关联，当前不影响已核验的图片路径健康。
- 生产多图试点已完成技术验收，用户侧最终确认仍待完成；在扩大到其他产品前仍需逐项确认图片内容和顺序。
- 搜索引擎控制台状态本次未核验；Google Search Console、Bing Webmaster Tools 的提交和收录状态不应从代码或 sitemap 状态反推。
- 本清单是时间点事实，不代表永久事实。每次语言、SEO、产品数据、上传链路、部署环境发生变化后都应更新。

## 快速复核命令

本地：

```powershell
git status --short
git rev-parse HEAD
git rev-parse origin/main
node scripts/generate-sitemap.js --dry-run
node scripts/verify-seo-i18n.js
npm run images:repair-product-links
npm run images:verify-product-links
git diff --check
```

生产服务器：

```bash
cd /home/ubuntu/longxiang-website
git status --short
git rev-parse HEAD
pm2 status longxiang-website
curl -I https://www.lxenelectric.com/
curl -I https://www.lxenelectric.com/sitemap.xml
curl -s https://www.lxenelectric.com/sitemap.xml | grep -c '<url>'
export PATH=/home/ubuntu/.nvm/versions/node/v24.18.0/bin:$PATH
node scripts/generate-sitemap.js --dry-run
node scripts/verify-seo-i18n.js
npm run images:audit
npm run images:repair-product-links
npm run images:verify-product-links
```
