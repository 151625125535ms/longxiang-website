# 阶段一：国内相关域名与 Search Console 数据审计

审计日期：2026-07-11

## 审计边界

- 只读取公开页面、robots.txt、sitemap 和用户导出的 Search Console CSV；
- 不修改 `lxdianqi.com`、`lxelec.cn`、中文 IDN 域名或其服务器；
- 不提交 sitemap、不发起索引请求、不配置重定向；
- 原始 Search Console 导出保留在用户桌面，不提交到代码仓库。
- 后续所有 SEO 实施、内容建设、内链、外链和数据闭环只针对 `lxenelectric.com`。

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
- 两个被观察站点首页均没有跨域 hreflang，只输出各自 self-canonical；
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

所以不能把三个非 `.com` 域名简单理解为“同一个站点的三个入口”，也不能把 `lxdianqi.com` 的 GSC 数据当成 `lxelec.cn` 数据。

## 四、`.cn` 竞争监测与 `.com` 海外权重建设

正式执行边界：

1. `lxelec.cn`、`lxdianqi.com` 和中文 IDN 只做公开页面、公开 sitemap 和公开搜索结果的只读观察；
2. 不把上述域名列入迁移、改版、技术修复或站长平台配置计划；
3. `lxenelectric.com` 独立建设海外采购关键词、IEC/目标市场标准、OEM/EPC、出口交付、案例和 RFQ 内容；
4. `.com` 的产品、分类、解决方案、案例和技术文章形成独立内链闭环；
5. `.com` 通过展会、协会、合作伙伴、行业媒体、客户案例和可链接工具获取海外相关外链；
6. 监测 `.cn` 英文页面只是为了识别竞争主题和内容缺口，不复制其正文，不把其权重视为 `.com` 的依赖。

该边界为长期约束，不是“等待以后授权”的临时暂停。

## 五、后续监测方式

阶段一不再以 `.cn` Search Console 数据为完成条件。后续仅使用公开信息按季度观察：

1. `.cn` 公开 sitemap 的 URL 数、页面类型和新增/删除变化；
2. Google/Bing 对 `.cn` 英文页面的公开索引样本与品牌/产品查询竞争；
3. `.com` 与 `.cn` 在相同产品主题上的标题、搜索意图和内容覆盖差异；
4. `.com` 自身 GSC/Bing 的非品牌曝光、点击、排名、外链和有效询盘增长。

`lxdianqi.com` 已导出的少量 GSC 数据只作为背景记录，不进入 `.com` KPI，也不触发任何非 `.com` 网站操作。
