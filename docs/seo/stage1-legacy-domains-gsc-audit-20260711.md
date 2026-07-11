# 阶段一：国内相关域名与 Search Console 数据审计

审计日期：2026-07-11

## 审计边界

- 只读取公开页面、robots.txt、sitemap 和用户导出的 Search Console CSV；
- 不修改 `lxdianqi.com`、`lxelec.cn`、中文 IDN 域名或其服务器；
- 不提交 sitemap、不发起索引请求、不配置重定向；
- 原始 Search Console 导出保留在用户桌面，不提交到代码仓库。

## 一、当前线上域名关系

| 域名 | 当前实际内容 | 首页状态 | HTML 语言 | canonical | sitemap |
|---|---|---:|---|---|---:|
| `https://www.lxdianqi.com/` | 中文企业官网 | 200 | `zh` | self-canonical | 229 条记录，228 个唯一 URL |
| `https://www.lxelec.cn/` | 英文企业官网 | 200 | `en` | self-canonical | 105 条记录，104 个唯一 URL |
| `http://龙翔电气.com/` | 域名入口 | 302 | 不适用 | 跳到 `http://www.lxdianqi.com` | 未单独提供 |
| `https://www.lxenelectric.com/` | 新全球多语言官网 | 200 | 默认英语，另有 ar/fr/ru | self-canonical | 184 个 URL |

补充技术结果：

- `lxdianqi.com` 和 `lxelec.cn` 的两个裸域名 HTTPS 均出现证书主机名不匹配；
- 中文 IDN 的 HTTP 入口使用临时 `302` 并先跳到 HTTP，而不是最终 HTTPS canonical；
- 本次测试中中文 IDN 的 HTTPS 连接未成功完成，不能证明其 HTTPS 可用；
- `lxdianqi.com` 与 `lxelec.cn` sitemap 有 32 个相同路径，但对应页面是中文和英文版本；
- 两个旧站首页均没有跨域 hreflang，只输出各自 self-canonical；
- `lxelec.cn` 的英文内容与新的 `lxenelectric.com` 全球英文内容存在主题竞争风险。

因此，“指向同一服务器”只是基础设施关系，不会让 Google 自动合并三个域名的索引、点击、外链或 canonical 信号。Search Console 数据仍按域名 property 分开统计。

## 二、`lxdianqi.com` Search Console 基线

数据源：用户桌面 `lxdianqi.com-Performance-on-Search-2026-07-11` 文件夹中的 7 个 CSV，以及用户提供的 Search Console 截图。

### 数据覆盖

- 导出筛选：过去 3 个月、Web 搜索；
- 当前实际有数据的日期：2026-07-07 至 2026-07-08；
- 点击：0；
- property 级曝光：48；
- CTR：0%；
- 平均排名：5.4。

数据只有约两天，不能据此判断稳定排名、CTR 或国内站长期趋势。

### 国家与设备

| 维度 | 曝光 | 占 property 级曝光 |
|---|---:|---:|
| 美国 | 29 | 60.4% |
| 中国 | 10 | 20.8% |
| 俄罗斯 | 2 | 4.2% |
| 印度 | 2 | 4.2% |
| 其他 5 个国家/地区 | 5 | 10.4% |
| 桌面设备 | 47 | 97.9% |
| 移动设备 | 1 | 2.1% |

### 页面表现

| 页面 | 曝光 | 平均排名 |
|---|---:|---:|
| `https://www.lxdianqi.com/` | 23 | 4.04 |
| `/Profile.html` | 7 | 6.29 |
| `/product_list/2.html` | 4 | 5.75 |
| `/product_list/3.html` | 4 | 6.50 |
| `/news_details/73.html` | 2 | 4.50 |
| `/Case_detail/1.html` | 2 | 7.00 |

页面表共有 30 行，页面维度曝光合计 67，高于 property 级 48。Search Console 在 property 和 page 分组时使用不同聚合方式，因此不能把 67 当作站点总曝光，也不能直接用页面行求站点 CTR。

### 查询数据

查询表仅显示：

- `site:lxdianqi.com`：1 次曝光、0 点击、平均排名 1。

其余 47 次 property 级曝光没有出现在查询表中，说明数据量过小且受到 Search Console 匿名查询阈值影响。当前无法据此建立关键词策略。

### sitemap、索引和链接处理状态

- sitemap：`https://www.lxdianqi.com/sitemap.xml`；
- 提交日期：2026-07-08；
- 上次读取：2026-07-09；
- 状态：成功；
- 已发现网页：229；
- 已发现视频：0；
- 网页索引报告仍显示“正在处理数据，请过 1 天左右再来查看”；
- 链接报告仍显示“正在处理数据，请过 1 天左右再来查看”。

因此本次尚无 `lxdianqi.com` 的可靠索引覆盖率或外链清单。

## 三、目标分工与线上现实的冲突

用户确认的目标分工是：

- `lxelec.cn`：中国官网；
- `lxenelectric.com`：全球官网。

当前线上现实是：

- 中文内容和 229 URL sitemap 在 `lxdianqi.com`；
- 英文内容和 105 URL sitemap 在 `lxelec.cn`；
- 中文 IDN 暂时跳到 `lxdianqi.com`；
- 新全球站 `lxenelectric.com` 另有英语、阿语、法语和俄语内容。

所以不能把三个旧域名简单理解为“同一个站点的三个入口”，也不能把 `lxdianqi.com` 的 GSC 数据当成 `lxelec.cn` 数据。

## 四、推荐的长期迁移方向（本阶段不执行）

如果继续坚持“`.cn` 中国官网、`.com` 全球官网”的正式分工，推荐最终状态为：

1. `lxdianqi.com` 的中文 URL 在 `.cn` 建好等价中文页后，逐页 301 到 `lxelec.cn` 对应路径；
2. `lxelec.cn` 当前英文 URL 在 `.com` 建好等价国际页后，逐页 301 到 `lxenelectric.com` 对应路径；
3. `龙翔电气.com` 配置有效 HTTPS，并 301 到 `https://www.lxelec.cn/` 或对应中文路径；
4. 所有裸域名先覆盖有效证书，再一次性 301 到各自 `www + HTTPS` canonical；
5. 不把全部旧 URL 重定向到首页；没有等价页的 URL需按流量、外链和业务价值决定合并或 410；
6. 迁移前必须获取三个旧域名各自的 Search Console 页面、查询、索引和外链数据，并制作逐 URL 映射表。

该迁移涉及 `.cn` 内容、服务器/Nginx、证书、301、sitemap 和 Search Console，是高风险独立项目。按照用户当前“不要修改 `.cn`”的要求，本阶段只记录方案，不执行。

## 五、阶段一仍需的数据

要完成英文旧站权重盘点，仍需从 `sc-domain:lxelec.cn` 导出：

1. 过去 16 个月 Search results：查询、网页、国家、设备；
2. Links：外部链接最多的网页、链接最多的网站、链接最多的文字；
3. 网页索引和 sitemap 状态截图。

`lxdianqi.com` 的链接与索引报告当前仍在处理，待 Search Console 生成后可作为中国站迁移资产的补充数据，但不阻塞 `.com` 当前阶段的代码优化。
