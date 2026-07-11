# 阶段二批次 2C 生产验收记录

验收日期：2026-07-11
目标网站：`https://www.lxenelectric.com`
范围：仅 `.com`；不包含 `.cn`、数据库写入、分类页、planned `pt`、Hero 图片或 Contact 标签修改。

## 部署前本地门禁

- `npm run check:all`：通过，接口验收 32/32。
- sitemap dry-run：184 URL。
- 2B 旧 URL：320 个唯一地址、424 次有效检查全部单跳 301；28 个无效场景 404；152 个 clean target 无链。
- 产品详情 SEO：152/152 canonical、完整 hreflang、WebPage、BreadcrumbList；Product Schema 暴露 0。
- Schema：184/184；缺失、错配、解析错误、加载错误和高风险 Product 字段均为 0。
- 服务端正文：184 sitemap URL + 4 参数页；16 重点正文、4 clean 目录、152 详情全部通过；敏感字段发现 0。
- Playwright：35/35，包含现有 29 项回归及 6 项 2C 专项；覆盖同版本 DOM 保留、分类 API 单独失败、内容 API 单独失败、内容版本升级、禁用 JavaScript、四语言 clean URL、LTR/RTL、目录筛选和详情询盘。
- Hero：16/16 重点正文快照逐页确认使用当前 CMS 原始资源；目录与详情继续使用现有 `assets/hero/product.webp`，未加入尺寸、质量参数或缩略图替换。
- 全站服务端正文审计精确计数：16 个重点正文、4 个 clean 目录、152 个详情、4 个参数目录；参数目录 canonical/hreflang 均无 query，详情 H1、主图和规格与 URL 对应产品逐一匹配。
- 生产公开快照：38 产品、184 URL、4 正式语言、3 taxonomy groups，严格校验通过。

## 生产执行

- GitHub `main` 已包含 B/C/D 与缓存版本修复；生产服务器仅通过 `git pull --ff-only origin main` 更新，未直接编辑服务器文件。
- 初次部署后执行一次必要 PM2 restart。生产浏览器验收发现 Cloudflare 仍返回旧查询版本的四个水合脚本，因此增加统一缓存版本提交，并执行一次必要的零停机 PM2 reload；最终服务保持 `online`。
- 生产普通 URL 已统一输出 `/js/main.js`、`content-pages.js`、`products-list.js`、`product-detail.js` 的 `20260711-stage2c-final` 缓存版本，HTML 响应 `cf-cache-status=DYNAMIC`。
- 全站服务端正文：184 sitemap URL + 4 参数目录全部通过；精确分类为 16 个重点正文、4 个 clean 目录、152 个详情、4 个参数目录，敏感字段发现 0。Cloudflare 邮件保护经解码后仍仅为国际邮箱。
- 旧 URL：320 个唯一旧地址、424 次有效 GET/HEAD 检查全部单跳 301；28 个无效场景 404；152 个 clean target 无第二跳。
- 产品详情 SEO：152/152 原始 canonical、完整 hreflang、WebPage、BreadcrumbList 与渲染结果通过；Product Schema 暴露 0，失败 0。
- Schema：184/184；缺失、错配、JSON-LD 解析错误、加载错误、高风险 Product 字段和 planned `pt` 暴露均为 0。
- 生产 Playwright：35/35；覆盖桌面/移动、四语言、API 失败、内容版本升级、禁用 JavaScript、Hero、目录、详情、Contact 与询盘。
- 最终 PM2 状态：`longxiang-website` 为 `online`。

## 固定约束检查

- `.cn` 未修改，仅保留页脚普通跳转链接。
- 国内电话、国内邮箱、WhatsApp 未进入公开 API、原始 HTML、最终 DOM 或 Schema。
- Contact 地址标签与联系方式未修改。
- Hero 图片、产品主图文件、尺寸和清晰度未修改；详情继续使用 `product.image`，目录继续使用 `cardImage || image`。
- 未创建分类页、分类路由、分类 Schema、分类 hreflang、分类 sitemap URL 或分类数据库字段。
- sitemap 仍为 184，正式语言仍为 en/ar/fr/ru，planned `pt` 未启用。
