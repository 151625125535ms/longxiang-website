# 前端与后台模块化治理

## 目标

降低后台大文件维护成本，同时保持现有静态 HTML、原生 JavaScript、CSS 加载方式和业务行为不变。

## Stage 6 边界

- 后台 JS 建立 `LongxiangAdmin` 命名空间，并拆出 `core`、`api`、`ui` 三个工具层。
- `admin/js/admin.js` 仍保留原有函数名作为兼容入口，内部调用新模块。
- 后台 CSS 建立三层加载边界：基础层、组件层、页面专属覆盖层。
- `admin/css/admin.css` 继续最后加载，用于登录页兼容和后台页面专属覆盖。
- 由于 `admin/login.html` 本阶段不在允许修改范围，`admin/css/admin.css` 会暂时保留部分基础和组件旧样式作为过渡兼容层；后续允许同步调整登录页后，再收敛重复样式来源。
- 公共前端 `css/styles.css` 本阶段只补充结构注释，不移动选择器。

## 后台 JS 加载顺序

后台页面必须按以下顺序加载脚本：

1. `admin/js/pagination.js`
2. `admin/js/admin-core.js`
3. `admin/js/admin-api.js`
4. `admin/js/admin-ui.js`
5. `admin/js/admin.js`

`admin-api.js` 依赖 `admin-core.js`，`admin.js` 依赖三个新模块。不得把 `admin.js` 放到新模块之前。

## 后台 CSS 加载顺序

后台页面必须按以下顺序加载样式：

1. `admin/css/admin-base.css`
2. `admin/css/admin-components.css`
3. `admin/css/admin.css`

`admin-base.css` 放设计变量、全局 reset 和后台壳层；`admin-components.css` 放按钮、表格、表单、弹窗、toast、分页等复用组件；`admin.css` 放登录页兼容和页面专属样式。

## 验证要求

```powershell
node --check admin/js/admin-core.js
node --check admin/js/admin-api.js
node --check admin/js/admin-ui.js
node --check admin/js/admin.js
node scripts/test-acceptance.js
npx playwright test
git diff --check
```

如果 Playwright 环境不可用，至少手动冒烟检查：

- 首页
- 产品列表页
- 阿语首页
- 后台登录页
- 后台首页
- 后台产品、询盘、资源、可视化编辑、系统状态等关键视图

## 禁止事项

- 不把后台改成 React、Vue、Next.js 或其他框架。
- 不引入 bundler 或新增依赖。
- 不改变后端 API 协议。
- 不修改数据库 schema。
- 不在服务器直接编辑文件。
- 不把 `.tmp/`、`chanpince/`、`data/`、`uploads/` 纳入本阶段治理。
- 不在公共前端 CSS 中大规模移动选择器。

## 后续拆分建议

如果后续继续拆分，应先允许同步调整 `admin/login.html`，再逐步减少 `admin/css/admin.css` 中与基础层、组件层重复的兼容样式。每次只移动一个明确模块，并用浏览器截图或 Playwright 冒烟确认视觉没有回退。
