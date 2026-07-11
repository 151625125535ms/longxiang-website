# 阶段一：Bing Webmaster Tools 导入准备

更新时间：2026-07-11

## 已完成的站点准备

- 全球站正式域名：`https://www.lxenelectric.com/`；
- `robots.txt` 已声明 `https://www.lxenelectric.com/sitemap.xml`；
- 生产 sitemap 当前包含 184 个 URL；
- sitemap 只包含英语、阿拉伯语、法语、俄语正式页面；
- 葡萄牙语仍为 planned，不进入 sitemap；
- 参数筛选 URL 不进入 sitemap，并输出 `noindex,follow`；
- Google Search Console 的 domain property 已验证，可用于 Bing 导入。

## 官方导入步骤

1. 登录 `https://www.bing.com/webmasters/`；
2. 在 My Sites 选择 Import；
3. 授权 Bing 读取已验证的 Google Search Console property 与 sitemap；
4. 只选择 `lxenelectric.com`，不要选择 `lxelec.cn`；
5. 完成导入后确认站点自动验证；
6. 在 Sitemaps 中确认 `https://www.lxenelectric.com/sitemap.xml` 已导入或手动提交；
7. 记录提交时间、处理状态和发现 URL 数量；
8. 数据生成后检查 Search Performance、URL Inspection、Site Explorer、SEO Reports 与 Crawl Information。

官方参考：

- `https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b`
- `https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed`

## 当前阻断

当前工作会话没有已授权的 Bing Webmaster Tools 账号。导入需要账号持有人登录，并授权 Bing 读取 Google Search Console；在登录完成前不能代表企业创建账号、选择 property 或授予权限。

## 导入后的验收

- Site 状态为 verified；
- sitemap 状态不是 Error；
- sitemap 地址准确且只属于 `.com`；
- Discovered URLs 与当前生产 sitemap 数量合理一致；
- URL Inspection 抽查首页、产品列表、解决方案和一个产品详情；
- 不提交参数筛选 URL；
- 不把 `.cn` 国内站导入到本次 `.com` 全球站任务中。

## 后续 IndexNow

IndexNow 适合在产品、解决方案、案例或文章发布/更新/删除时通知 Bing。阶段一只完成 Bing 站点与 sitemap 建立，不在没有发布事件和密钥管理方案时仓促加入 IndexNow。
