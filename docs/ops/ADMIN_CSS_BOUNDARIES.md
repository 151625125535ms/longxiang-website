# 后台 CSS 职责边界

## 加载顺序

后台主应用页面按以下顺序加载样式：

1. `admin-base.css`
2. `admin-components.css`
3. `admin.css`

`admin.css` 仍然放在最后加载，这样在逐步收敛样式期间，旧的登录页兼容样式和页面级覆盖仍能继续生效。

## 文件职责

| 文件 | 当前负责 | 长期不应负责 |
| --- | --- | --- |
| `admin-base.css` | 设计变量、重置样式、字体排版、后台外壳布局基础、焦点规则 | 具体业务页面细节或可复用组件变体 |
| `admin-components.css` | 按钮、表单、表格、徽章、弹窗、提示、分页、标签页等可复用 UI 组件 | 仅属于产品、询盘、资源库或可视化编辑器的页面布局 |
| `admin.css` | 登录页兼容、后台页面级布局、业务页面覆盖样式 | 已经存在于 base/components 中的基础变量或通用组件规则 |

## 兼容规则

`admin/login.html` 目前只加载 `admin.css`，因此在登录页明确迁移到拆分后的 CSS 加载栈之前，登录页依赖的基础重置和关键样式必须继续保留在 `admin.css` 中。

## Stage 7C 本次变更

本次只做第一组低风险收敛：从 `admin.css` 中移除重复的 `.btn-icon-edit`、`.btn-icon-delete`、`.btn-icon-view` 图标按钮变体规则。

依据：

- 相同规则已经存在于 `admin-components.css`。
- `admin/index.html` 会先加载 `admin-components.css`，再加载 `admin.css`。
- 登录页不使用这些表格操作图标按钮变体。

暂缓处理：

- 通用 `.btn`、`.data-table`、`.modal`、`.form-*`、`.toast` 和分页相关重复样式暂时保留在 `admin.css` 中。
- 这些样式可能同时影响后台业务页面和登录页兼容性，后续应按选择器族逐组收敛，并配合浏览器冒烟测试。
