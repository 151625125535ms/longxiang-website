# 阶段一：GA4 配置方案与事件字典

更新时间：2026-07-11

## 当前状态

- 生产接口的 `ga4TrackingId` 当前为空，网站不会加载 Google Analytics 脚本。
- 前端已实现 Consent Mode：用户未同意 Analytics Cookie 时，分析存储保持拒绝状态。
- 询盘成功后已有 `generate_lead` 事件调用；邮箱及部分社交入口已有点击事件调用。
- 在没有真实 GA4 Measurement ID 前，不填写示例 ID，不向生产数据库写入占位值。

## 启用步骤

1. 在企业持有的 Google Analytics 账号中创建或确认 GA4 Property。
2. 创建 Web Data Stream，域名填写 `https://www.lxenelectric.com/`。
3. 取得格式为 `G-XXXXXXXXXX` 的 Measurement ID。
4. 将 Measurement ID 写入 `.com` 的 `admin_settings.ga4TrackingId`；写入前备份数据库，写入后验证 `/api/company`。
5. 在 GA4 Admin 中把 `generate_lead` 标记为 Key event。
6. 使用 DebugView 和浏览器网络请求验证同意前不发送、同意后才发送。
7. 在 GA4 中建立 Organic Search 询盘探索报表，并与 Search Console 关联。

## 事件字典

| 事件 | 触发条件 | 必要参数 | 是否关键事件 | 当前状态 |
|---|---|---|---|---|
| `generate_lead` | 任一询盘表单收到成功响应 | `form_name`、`page_type`、`locale`、`product_id`（如有） | 是 | 已有基础事件，启用 GA4 后验证参数 |
| `click_email` | 点击国际销售邮箱 | `source_component`、`page_type`、`locale` | 否 | 已实现基础事件 |
| `select_item` | 点击产品卡进入详情页 | `item_id`、`item_name`、`item_category`、`item_list_name`、`locale` | 否 | 待后续埋点 |
| `view_item` | 成功打开产品详情页 | `item_id`、`item_name`、`item_category`、`locale` | 否 | 待后续埋点 |
| `view_item_list` | 产品列表或首页推荐产品完成渲染 | `item_list_name`、`item_category`、`locale` | 否 | 待后续埋点 |
| `search` | 提交站内产品搜索 | `search_term`、`item_category`、`locale` | 否 | 待后续埋点 |
| `select_content` | 点击产品分类或解决方案入口 | `content_type`、`content_id`、`source_component`、`locale` | 否 | 待后续埋点 |
| `click_china_website` | 点击页脚中国官网链接 | `source_component=footer`、`locale` | 否 | 待后续埋点 |
| `click_instagram` | 点击 Instagram | `source_component`、`locale` | 否 | 已实现基础事件 |
| `click_youtube` | 点击 YouTube | `source_component`、`locale` | 否 | 已实现基础事件 |

## 参数规范

- `locale`：`en`、`ar`、`fr`、`ru`；
- `page_type`：`home`、`product_list`、`product_detail`、`solution`、`about`、`contact`、`education`；
- `source_component`：`header`、`footer`、`hero`、`product_card`、`product_detail`、`floating_inquiry`、`contact_form`；
- `form_name`：`footer_quote_form`、`contact_form`、`product_inquiry_form`、`floating_inquiry_form`；
- `item_id` 使用稳定产品 slug，不使用数据库自增 ID；
- `item_category` 使用稳定英文分类 slug。

## 隐私约束

禁止向 GA4 发送以下内容：

- 姓名、邮箱、电话、公司名称；
- 询盘正文或表单自由文本；
- IP 地址、精确地址；
- 任何能够识别个人的信息。

事件只发送页面、语言、产品 slug、分类 slug 和组件位置等非个人化上下文。

## 验收标准

- 未同意 Analytics Cookie：不加载 `gtag.js`，不发送 GA4 事件；
- 同意后：只加载一个 Measurement ID，不重复初始化；
- 成功询盘：DebugView 出现一次 `generate_lead`，失败校验或失败响应不触发；
- 四种正式语言均携带正确 `locale`；
- GA4 Realtime 能看到测试流量，Search Console 关联成功；
- 生产页面源代码和 API 不出现示例 Measurement ID。
