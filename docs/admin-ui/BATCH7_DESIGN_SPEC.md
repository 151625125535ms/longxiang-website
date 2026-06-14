# Batch 7 实施规格（永久存档）

> 由 Claude 整合 ui-ux-pro-max + frontend-design skill 输出、6 张设计预览图和现有代码摘要生成。  
> 归档日期：2026-06-14  
> 执行文件（Codex 读取）：`C:\Users\hnlxd\Desktop\codex_check.md`

---

## 设计基础原则（贯穿 7A–7D）

1. **风格**：Industrial/utilitarian + Trust & Authority。浅灰页面背景、白色内容面板、深 navy 侧栏、品牌蓝操作色。不用大面积渐变、装饰性元素、过度圆角。
2. **表格优先级**：第一列"对象摘要"（缩略图+名称+ID），状态用 badge，次要字段用 muted text。
3. **色彩**：保留现有 --color-navy / --color-blue 品牌色，新增语义 token 层（published=绿/draft=黄虚线/deleted=红/unread=红/read=灰/closed=灰）。
4. **交互**：hover 150-200ms，所有可点击元素有 cursor:pointer，focus 状态可见。
5. **字体**：保留 Source Sans 3，不换字体。

---

## Batch 7 分批计划

| 批次 | 内容 | 前置 |
|------|------|------|
| **7A** | CSS token + 表格视觉 + badge 语义化 + cert 缩略图 + 产品列增强 | 立即执行 |
| **7B** | 内容管理位置 banner + 字段 hint + 图片预览 | 7A 验收后 |
| **7C** | 证书预览面板 + 询盘详情面板（split layout） | 7B 验收后 |
| **7D** | 控制台 stat-card 增强 + 资源库拖放+网格 | 7C 验收后 |

---

## Batch 7A — CSS token + 表格视觉

### 改动文件

- `admin/css/admin.css`（只追加，不删现有代码）
- `admin/js/admin.js`（改 3 处：renderProductsTable / renderCertificationsTable / STATUS_BADGES）
- `admin/index.html`（改 2 处：4 个证书表头 / 产品表头）

### 7A-1 追加 CSS 语义 token 层

在 `admin/css/admin.css` 现有 `:root {}` 块末尾之后，追加（不改、不删任何现有变量）：

```css
/* ===== Batch 7A: Semantic Token Layer ===== */
:root {
  --surface-page:   #f4f7fa;
  --surface-panel:  #ffffff;
  --surface-subtle: #f8fafc;
  --border-subtle:  #e5ebf1;
  --border-strong:  #cbd6e2;
  --text-primary:   #0a1628;
  --text-secondary: #475569;
  --text-muted:     #718096;
  --accent:         #00a3e0;
  --accent-dim:     #e4f7fc;
  --s-pub-bg: #e8f7ef; --s-pub-tx: #126b3a;
  --s-dft-bg: #fff3d8; --s-dft-tx: #8a5b00;
  --s-del-bg: #fdecec; --s-del-tx: #b42318;
  --s-inf-bg: #e8f5ff; --s-inf-tx: #075985;
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px;
  --sp-5:20px; --sp-6:24px; --sp-8:32px;
  --fs-xs:12px; --fs-sm:14px; --fs-md:16px; --fs-lg:20px; --fs-xl:24px;
  --elev-1: 0 1px 2px rgba(15,23,42,.06),0 4px 12px rgba(15,23,42,.07);
  --elev-2: 0 8px 28px rgba(15,23,42,.13);
  --motion-f: 160ms ease-out;
  --motion-b: 220ms ease-out;
}
```

### 7A-2 追加表格视觉基础

继续在 `admin/css/admin.css` 末尾追加：

```css
/* ===== Batch 7A: Table Visual ===== */
.data-table thead th {
  background: var(--surface-subtle);
  border-bottom: 1px solid var(--border-strong);
  padding: 9px 14px;
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: .05em;
  white-space: nowrap;
}
.data-table tbody tr { border-bottom: 1px solid var(--border-subtle); transition: background var(--motion-f); }
.data-table tbody td { padding: 12px 14px; font-size: var(--fs-sm); color: var(--text-primary); vertical-align: middle; }
.data-table tbody tr:hover { background: rgba(0,163,224,.05); }
.data-table tbody tr.row-selected { background: rgba(0,163,224,.09); box-shadow: inset 3px 0 0 var(--accent); }

/* Thumbnail */
.tc-thumb { width:64px; padding:8px 10px !important; }
.tbl-thumb { width:48px; height:36px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); display:block; }
.tbl-thumb-sq { width:48px; height:48px; }
.thumb-ph { width:48px; height:36px; background:var(--surface-subtle); border:1px dashed var(--border-strong); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:16px; }
.thumb-ph-sq { width:48px; height:48px; }

/* Cell helpers */
.c-title { font-weight:500; font-size:var(--fs-sm); color:var(--text-primary); }
.c-sub   { font-size:var(--fs-xs); color:var(--text-muted); margin-top:2px; }
.tag-chip { display:inline-block; padding:2px 8px; border:1px solid var(--border-strong); border-radius:var(--radius-sm); font-size:var(--fs-xs); color:var(--text-secondary); white-space:nowrap; }

/* Semantic badge variants */
.badge-published { background:var(--s-pub-bg); color:var(--s-pub-tx); }
.badge-draft     { background:var(--s-dft-bg); color:var(--s-dft-tx); border:1px dashed var(--s-dft-tx); }
.badge-deleted   { background:var(--s-del-bg); color:var(--s-del-tx); }
.badge-unread    { background:var(--s-del-bg); color:var(--s-del-tx); }
.badge-read      { background:var(--surface-subtle); color:var(--text-muted); border:1px solid var(--border-subtle); }
.badge-replied   { background:var(--s-pub-bg); color:var(--s-pub-tx); }
.badge-closed    { background:var(--surface-subtle); color:var(--text-secondary); border:1px solid var(--border-subtle); }

/* Featured toggle switch */
.feat-toggle { position:relative; display:inline-block; width:36px; height:20px; cursor:pointer; vertical-align:middle; }
.feat-toggle input { opacity:0; width:0; height:0; position:absolute; }
.feat-track { position:absolute; inset:0; background:var(--border-strong); border-radius:10px; transition:background var(--motion-f); }
.feat-thumb { position:absolute; top:2px; left:2px; width:16px; height:16px; background:#fff; border-radius:50%; transition:transform var(--motion-f); box-shadow:0 1px 3px rgba(0,0,0,.18); pointer-events:none; }
.feat-toggle input:checked + .feat-track { background:var(--accent); }
.feat-toggle input:checked ~ .feat-thumb  { transform:translateX(16px); }

/* Unread inquiry row */
.row-unread { box-shadow:inset 3px 0 0 var(--s-del-tx); }
.row-unread td:nth-child(2) { font-weight:600; }
```

### 7A-3 修改产品表头（admin/index.html 第 233 行）

当前 6 列：`checkbox | 产品 | 分类 | 状态 | 简介 | 操作`，骨架行 colspan=6。

改为 8 列：
```html
<thead><tr>
  <th><input type="checkbox" id="product-select-all"></th>
  <th>产品</th><th>分类</th><th>状态</th><th>精选</th>
  <th>简介</th><th>更新时间</th><th>操作</th>
</tr></thead>
```
同时将产品 tbody 骨架行的 `colspan="6"` 全部改为 `colspan="8"`（共 3 处）。

### 7A-4 修改 4 个证书表头（admin/index.html）

4 个 section（qualifications / patents / software / test-reports）均为：
`checkbox | 证书名称 | 分类 | 图片路径 | 状态 | 操作`（6 列）

改为：`checkbox | 预览 | 证书名称 | 分类 | 状态 | 操作`（仍 6 列）

操作：移除 `<th>图片路径</th>`，在 `<th>证书名称</th>` 前插入 `<th style="width:64px">预览</th>`。骨架行 colspan 保持 6。

### 7A-5 修改 renderProductsTable()（admin/js/admin.js 约第 1047 行）

替换 `tbody.innerHTML = products.map(function (product) { ... }).join('');` 的 map 回调为：

```js
tbody.innerHTML = products.map(function (product) {
  var productId = product.id;
  var displayId = product.legacy_id || product.slug || product.id;
  var name      = product.name_en || product.name || '';
  var category  = product.category_name_en || product.category || '—';
  var status    = product.status || 'draft';
  var sCls = status === 'published' ? 'badge-published' : (status === 'deleted' ? 'badge-deleted' : 'badge-draft');
  var sLbl = status === 'published' ? '已发布' : (status === 'deleted' ? '已删除' : '草稿');
  var cover = product.cover_image || product.image || '';
  var thumb = cover
    ? '<img class="tbl-thumb tbl-thumb-sq" src="../' + escapeHtml(cover) + '" alt="" loading="lazy">'
    : '<div class="thumb-ph thumb-ph-sq">📦</div>';
  var featured = product.featured ? true : false;
  var desc = escapeHtml(product.short_desc_en || product.shortDesc || '');
  var upd  = product.updated_at ? formatDate(product.updated_at) : '—';
  return '<tr>'
    + '<td><input type="checkbox" class="product-row-check" data-id="' + escapeHtml(productId) + '" data-version="' + escapeHtml(product.version) + '"></td>'
    + '<td><div class="product-name-cell">' + thumb
        + '<div><div class="c-title">' + escapeHtml(name) + '</div>'
        + '<div class="c-sub">' + escapeHtml(String(displayId)) + '</div></div></div></td>'
    + '<td><span class="tag-chip">' + escapeHtml(category) + '</span></td>'
    + '<td><span class="badge ' + sCls + '">' + sLbl + '</span></td>'
    + '<td><label class="feat-toggle" title="' + (featured ? '取消精选' : '设为精选') + '">'
        + '<input type="checkbox" class="featured-toggle" data-product-id="' + escapeHtml(productId) + '"' + (featured ? ' checked' : '') + '>'
        + '<span class="feat-track"></span><span class="feat-thumb"></span>'
        + '</label></td>'
    + '<td style="max-width:180px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:var(--text-secondary);font-size:var(--fs-xs);">' + desc + '</td>'
    + '<td style="white-space:nowrap;font-size:var(--fs-xs);color:var(--text-muted);">' + upd + '</td>'
    + '<td><div class="actions-cell">'
        + '<button class="btn btn-icon btn-icon-edit" aria-label="编辑产品" data-edit-product="' + escapeHtml(productId) + '">' + ICON_EDIT + '</button>'
        + '<button class="btn btn-icon btn-icon-delete" aria-label="删除产品" data-delete-product="' + escapeHtml(productId) + '">' + ICON_DELETE + '</button>'
        + '</div></td>'
    + '</tr>';
}).join('');
```

同时将 `emptyRow(6, '暂无产品')` 改为 `emptyRow(8, '暂无产品')`。

在事件绑定区（`tbody.querySelectorAll('[data-delete-product]')` 之后）追加精选 toggle 事件：

```js
tbody.querySelectorAll('.featured-toggle').forEach(function (toggle) {
  toggle.addEventListener('change', function () {
    var pid = toggle.getAttribute('data-product-id');
    var val = toggle.checked;
    apiRequest('/admin/products/' + encodeURIComponent(pid), { method: 'PATCH', body: { featured: val } })
      .then(function () {
        showToast(val ? '已设为精选' : '已取消精选', 'success');
        var lbl = toggle.closest('label');
        if (lbl) lbl.title = val ? '取消精选' : '设为精选';
      })
      .catch(function (err) { showToast('操作失败：' + err.message, 'error'); toggle.checked = !val; });
  });
});
```

注：若 `PATCH /admin/products/:id` 不支持 `featured`，跳过 toggle 功能，在报告中注明。

### 7A-6 修改 renderCertificationsTable()（admin/js/admin.js 约第 2184 行）

替换 `tbody.innerHTML = rows.map(...)` 的 map 回调为：

```js
tbody.innerHTML = rows.map(function (item) {
  var status = item.status || 'draft';
  var sCls = status === 'published' ? 'badge-published' : (status === 'deleted' ? 'badge-deleted' : 'badge-draft');
  var sLbl = status === 'published' ? '已发布' : (status === 'deleted' ? '已删除' : '草稿');
  var img = item.image_path || '';
  var thumb = img
    ? '<img src="' + escapeHtml(img) + '" class="tbl-thumb" alt="" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
      + '<div class="thumb-ph" style="display:none">📄</div>'
    : '<div class="thumb-ph">📄</div>';
  return '<tr>'
    + '<td><input type="checkbox" class="cert-row-check" data-id="' + escapeHtml(item.id)
        + '" data-version="' + escapeHtml(item.version) + '" data-view="' + escapeHtml(viewName) + '"></td>'
    + '<td class="tc-thumb">' + thumb + '</td>'
    + '<td><div class="c-title">' + escapeHtml(item.name_en || '') + '</div>'
        + '<div class="c-sub">' + escapeHtml(String(item.id || '')) + '</div></td>'
    + '<td><span class="tag-chip">' + escapeHtml(item.category_name_en || '-') + '</span></td>'
    + '<td><span class="badge ' + sCls + '">' + sLbl + '</span></td>'
    + '<td><div class="actions-cell">'
        + '<button class="btn btn-icon btn-icon-edit" aria-label="编辑证书" data-cert-view="' + escapeHtml(viewName) + '" data-edit-cert="' + escapeHtml(item.id) + '">' + ICON_EDIT + '</button>'
        + '<button class="btn btn-icon btn-icon-delete" aria-label="删除证书" data-cert-view="' + escapeHtml(viewName) + '" data-delete-cert="' + escapeHtml(item.id) + '">' + ICON_DELETE + '</button>'
        + '</div></td>'
    + '</tr>';
}).join('');
```

`emptyRow(6, '暂无证书')` 保持不变（表头仍 6 列）。

### 7A-7 更新 STATUS_BADGES / STATUS_LABELS（admin/js/admin.js 第 16–17 行）

```js
var STATUS_LABELS = { new: '未读', read: '已读', replied: '已回复', closed: '已关闭' };
var STATUS_BADGES = { new: 'badge-unread', read: 'badge-read', replied: 'badge-replied', closed: 'badge-closed' };
```

### 7A 验收清单

- [ ] 产品表格 8 列，含精选 toggle 和更新时间
- [ ] 证书表格无"图片路径"列，有 48×36 缩略图
- [ ] 分类显示为 tag-chip（灰色边框小圆角）
- [ ] 状态 badge：已发布=绿/草稿=黄虚线/未读=红/已关闭=灰
- [ ] 表头浅灰背景 + uppercase
- [ ] 行 hover 浅蓝色背景
- [ ] 未读询盘行有左侧红色 rail + 客户名加粗
- [ ] smoke test 通过

---

## Batch 7B — 内容管理 Banner + 字段 Hint

### 背景

Batch 3 已实现结构化字段渲染（`renderContentBlockForm`），7B 不重做结构化表单。
任务：① 每个内容块顶部加位置说明 banner；② 关键字段下方加 hint；③ 图片路径字段加预览图。

### 7B-1 追加 CSS

```css
/* ===== Batch 7B: Content Block Banners & Field Hints ===== */
.cb-location-banner {
  display:flex; align-items:flex-start; gap:var(--sp-3);
  padding:var(--sp-3) var(--sp-4);
  background:var(--s-inf-bg);
  border:1px solid rgba(7,89,133,.2);
  border-left:3px solid var(--s-inf-tx);
  border-radius:var(--radius-md);
  margin-bottom:var(--sp-5);
}
.cb-banner-icon  { font-size:18px; flex-shrink:0; margin-top:1px; }
.cb-banner-title { font-size:var(--fs-xs); font-weight:700; color:var(--s-inf-tx); text-transform:uppercase; letter-spacing:.05em; }
.cb-banner-desc  { font-size:var(--fs-sm); color:var(--text-primary); margin-top:3px; line-height:1.55; }
.cb-banner-warn  { font-size:var(--fs-xs); color:var(--s-dft-tx); margin-top:var(--sp-2); padding:2px 6px; background:var(--s-dft-bg); border-radius:3px; display:inline-block; }
.cb-banner-nowired { font-size:var(--fs-xs); color:var(--text-muted); margin-top:var(--sp-1); font-style:italic; }

.field-hint { font-size:var(--fs-xs); color:var(--text-muted); margin-top:var(--sp-1); line-height:1.45; }
.img-field-preview { display:block; max-width:200px; max-height:112px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); margin-top:var(--sp-2); }
```

### 7B-2 CONTENT_BLOCK_BANNERS 常量 + renderCbBanner 函数

```js
var CONTENT_BLOCK_BANNERS = {
  'company-overview': {
    icon: '🏢', title: '前台显示位置',
    desc: '关于我们页面（about.html）企业介绍段落、联系页面公司名称、全站页脚品牌信息。',
    warn: null, nowired: null
  },
  'contact': {
    icon: '📞', title: '前台显示位置',
    desc: '联系我们页面（contact.html）：联系电话、邮箱、地址、地图、社交媒体链接、二维码。同时注入全站页脚联系信息。',
    warn: null, nowired: null
  },
  'about-us': {
    icon: '📄', title: '前台显示位置',
    desc: '关于我们页面（about.html）：Hero 区域、企业发展历程、核心板块。',
    warn: null, nowired: '当前前台以静态内容为主，部分字段可能暂未被前台渲染。'
  },
  'technology': {
    icon: '⚙', title: '前台显示位置',
    desc: '科技创新相关页面：Hero 区域、技术亮点、关联证书。',
    warn: null, nowired: '此内容块当前前台暂未接入，修改不会影响前台展示。'
  },
  'industries': {
    icon: '🏭', title: '前台显示位置',
    desc: '应用行业相关页面：各行业介绍卡片、关联产品。',
    warn: null, nowired: '此内容块当前前台暂未接入，修改不会影响前台展示。'
  },
  'education': {
    icon: '🎓', title: '前台显示位置',
    desc: '教育合作页面（education.html）：Hero 区域、统计数字卡片、四个合作模式、图库、合作理念、CTA 联系区。',
    warn: 'hero.title / hero.titleAr 字段名不可修改；保存时若含 _en/_ar 旧式字段将报错。',
    nowired: null
  },
  'page-blocks': {
    icon: '🗂', title: '前台显示位置',
    desc: '全站页脚（footer）：页脚品牌说明文字（footer.footerText）。home-cta 区块已定义，前台暂未接入。',
    warn: null, nowired: null
  }
};

function renderCbBanner(key) {
  var b = CONTENT_BLOCK_BANNERS[key];
  if (!b) return '';
  var html = '<div class="cb-location-banner">'
    + '<span class="cb-banner-icon">' + b.icon + '</span>'
    + '<div><div class="cb-banner-title">' + b.title + '</div>'
    + '<div class="cb-banner-desc">' + b.desc + '</div>';
  if (b.warn)    html += '<div class="cb-banner-warn">⚠ ' + b.warn + '</div>';
  if (b.nowired) html += '<div class="cb-banner-nowired">ℹ ' + b.nowired + '</div>';
  html += '</div></div>';
  return html;
}
```

在 `renderContentBlockForm(key, data)` 开头将 `renderCbBanner(key)` 的返回值插入表单 HTML 最前面。

### 7B-3 字段 Hint 映射

图片路径字段（字段名含 image/img/photo/background/cover/Qr）追加实时预览图和 hint。

| 字段名包含 | Hint 文本 |
|---|---|
| `googleMapsUrl` | 复制地图页面 URL，格式：https://maps.google.com/... |
| `EmbedUrl` | 嵌入地图的 iframe src，在 Google Maps 点击"分享→嵌入地图"获取 |
| `eyebrow` | 标题上方的小标签文字 |
| `tagline` | 模式副标题或口号，显示在标题下方 |
| `summary` | 模式简介，约 1-2 句 |
| `is_active` | 开关控制此区块是否在前台显示 |
| `sort_order` | 数字越小越靠前，从 0 开始 |
| `related_product_ids` / `related_certification_ids` | 输入 ID，英文逗号分隔，如 1,5,12 |

---

## Batch 7C — Split 面板布局

### 7C-1 追加 CSS

```css
/* ===== Batch 7C: Split Panel Layout ===== */
.split-wrap { display:grid; gap:var(--sp-4); align-items:start; }
.split-wrap-cert    { grid-template-columns:1fr 304px; }
.split-wrap-inquiry { grid-template-columns:1fr 360px; }

.side-panel {
  background:var(--surface-panel);
  border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg);
  box-shadow:var(--elev-1);
  position:sticky; top:var(--sp-4);
  overflow:hidden;
}
.side-panel.sp-hidden { display:none; }
.sp-header { display:flex; justify-content:space-between; align-items:center; padding:var(--sp-3) var(--sp-4); border-bottom:1px solid var(--border-subtle); }
.sp-title  { font-size:var(--fs-md); font-weight:600; color:var(--text-primary); }
.sp-body   { padding:var(--sp-4); }
.sp-preview-img { width:100%; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); margin-bottom:var(--sp-3); display:block; }
.sp-meta-row { display:flex; gap:var(--sp-3); padding:var(--sp-2) 0; border-bottom:1px solid var(--border-subtle); font-size:var(--fs-sm); }
.sp-meta-row:last-child { border-bottom:none; }
.sp-meta-label { width:56px; flex-shrink:0; font-size:var(--fs-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; padding-top:2px; }
.sp-meta-val { color:var(--text-primary); }
.sp-meta { margin-bottom:var(--sp-4); }
.sp-section { margin-bottom:var(--sp-4); }
.sp-section-label { font-size:var(--fs-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:var(--sp-2); }
.sp-message { font-size:var(--fs-sm); color:var(--text-primary); line-height:1.7; white-space:pre-wrap; }
.sp-actions { display:flex; gap:var(--sp-2); flex-wrap:wrap; }
.btn-sm { padding:5px 12px; font-size:var(--fs-xs); }

@media (max-width:900px) {
  .split-wrap-cert,.split-wrap-inquiry { grid-template-columns:1fr; }
  .side-panel { position:static; }
}
```

### 7C-2 证书预览面板 HTML（4 个 section，{S} = qualifications/patents/software/test-reports）

```html
<div class="split-wrap split-wrap-cert">
  <div class="data-table-wrapper"><!-- 原有表格不变 --></div>
  <div id="cert-panel-{S}" class="side-panel sp-hidden">
    <div class="sp-header">
      <span class="sp-title">证书预览</span>
      <button class="btn btn-icon" id="close-cert-panel-{S}" title="关闭" aria-label="关闭预览">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sp-body">
      <img id="cpv-img-{S}" class="sp-preview-img" src="" alt="" onerror="this.style.display='none'">
      <div class="sp-meta">
        <div class="sp-meta-row"><span class="sp-meta-label">证书名</span><span id="cpv-name-{S}" class="sp-meta-val"></span></div>
        <div class="sp-meta-row"><span class="sp-meta-label">颁发机构</span><span id="cpv-org-{S}" class="sp-meta-val"></span></div>
        <div class="sp-meta-row"><span class="sp-meta-label">有效期</span><span id="cpv-exp-{S}" class="sp-meta-val"></span></div>
        <div class="sp-meta-row"><span class="sp-meta-label">状态</span><span id="cpv-status-{S}" class="sp-meta-val"></span></div>
      </div>
      <div class="sp-actions">
        <button class="btn btn-primary btn-sm" id="cpv-edit-{S}">编辑</button>
        <button class="btn btn-danger btn-sm" id="cpv-del-{S}">删除</button>
      </div>
    </div>
  </div>
</div>
```

### 7C-3 证书预览 JS（showCertPreview）

```js
function showCertPreview(item, viewName) {
  var s = certViewSuffix(viewName);
  var panel = document.getElementById('cert-panel-' + s);
  if (!panel) return;
  var imgEl = document.getElementById('cpv-img-' + s);
  if (imgEl) { imgEl.src = item.image_path || ''; imgEl.style.display = item.image_path ? '' : 'none'; }
  var st2 = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v || '—'; };
  st2('cpv-name-' + s, item.name_en);
  st2('cpv-org-' + s, item.issuer_en || item.issuer);
  st2('cpv-exp-' + s, item.expiry_date ? formatDate(item.expiry_date) : '—');
  var statusEl = document.getElementById('cpv-status-' + s);
  if (statusEl) {
    var st = item.status || 'draft';
    var sc = st === 'published' ? 'badge-published' : (st === 'deleted' ? 'badge-deleted' : 'badge-draft');
    var sl = st === 'published' ? '已发布' : (st === 'deleted' ? '已删除' : '草稿');
    statusEl.innerHTML = '<span class="badge ' + sc + '">' + sl + '</span>';
  }
  var editBtn  = document.getElementById('cpv-edit-' + s);
  var delBtn   = document.getElementById('cpv-del-' + s);
  var closeBtn = document.getElementById('close-cert-panel-' + s);
  if (editBtn)  editBtn.onclick  = function () { openCertificationModal(item.id, viewName); };
  if (delBtn)   delBtn.onclick   = function () { deleteCertification(item.id, viewName); };
  if (closeBtn) closeBtn.onclick = function () { panel.classList.add('sp-hidden'); };
  panel.classList.remove('sp-hidden');
}
```

### 7C-4 询盘详情面板 HTML

```html
<div class="split-wrap split-wrap-inquiry">
  <div class="data-table-wrapper"><!-- 原有询盘表格不变 --></div>
  <div id="inquiry-detail-panel" class="side-panel sp-hidden">
    <div class="sp-header">
      <span class="sp-title" id="idp-name">询盘详情</span>
      <button class="btn btn-icon" id="close-inquiry-panel" title="关闭" aria-label="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sp-body">
      <div class="sp-meta">
        <div class="sp-meta-row"><span class="sp-meta-label">邮箱</span><span id="idp-email" class="sp-meta-val"></span></div>
        <div class="sp-meta-row"><span class="sp-meta-label">公司</span><span id="idp-company" class="sp-meta-val"></span></div>
        <div class="sp-meta-row"><span class="sp-meta-label">主题</span><span id="idp-subject" class="sp-meta-val"></span></div>
        <div class="sp-meta-row"><span class="sp-meta-label">时间</span><span id="idp-time" class="sp-meta-val"></span></div>
        <div class="sp-meta-row"><span class="sp-meta-label">状态</span><span id="idp-status" class="sp-meta-val"></span></div>
      </div>
      <div class="sp-section">
        <div class="sp-section-label">留言内容</div>
        <p id="idp-message" class="sp-message"></p>
      </div>
      <div class="sp-actions">
        <button class="btn btn-primary btn-sm" id="idp-read">标记已读</button>
        <button class="btn btn-secondary btn-sm" id="idp-close-inq">关闭询盘</button>
        <button class="btn btn-danger btn-sm" id="idp-delete-inq">删除</button>
      </div>
    </div>
  </div>
</div>
```

### 7C-5 询盘详情 JS（showInquiryDetail / batchInquiryAction）

```js
function showInquiryDetail(item) {
  var panel = document.getElementById('inquiry-detail-panel');
  if (!panel) return;
  var st2 = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v || '—'; };
  st2('idp-name',    item.name);
  st2('idp-email',   item.email);
  st2('idp-company', item.company);
  st2('idp-subject', item.subject);
  st2('idp-time',    formatDate(item.created_at));
  var msgEl = document.getElementById('idp-message');
  if (msgEl) msgEl.textContent = item.message || item.content || '';
  var statusEl = document.getElementById('idp-status');
  if (statusEl) {
    var cls = STATUS_BADGES[item.status] || 'badge-read';
    var lbl = STATUS_LABELS[item.status] || item.status;
    statusEl.innerHTML = '<span class="badge ' + cls + '">' + lbl + '</span>';
  }
  document.getElementById('idp-read').onclick        = function () { batchInquiryAction('mark_read',  [item.id]); };
  document.getElementById('idp-close-inq').onclick   = function () { batchInquiryAction('close',       [item.id]); };
  document.getElementById('idp-delete-inq').onclick  = function () { batchInquiryAction('soft_delete', [item.id]); };
  document.getElementById('close-inquiry-panel').onclick = function () { panel.classList.add('sp-hidden'); };
  panel.classList.remove('sp-hidden');
}

function batchInquiryAction(action, ids) {
  apiRequest('/admin/inquiries/batch', { method: 'POST', body: { action: action, ids: ids } })
    .then(function () {
      var msg = action === 'mark_read' ? '已标记已读' : action === 'close' ? '已关闭' : '已删除';
      showToast(msg, 'success');
      document.getElementById('inquiry-detail-panel').classList.add('sp-hidden');
      loadInquiries();
    })
    .catch(function (err) { showToast('操作失败：' + err.message, 'error'); });
}
```

---

## Batch 7D — 控制台 + 资源库增强

### 7D-1 stat-card CSS

```css
/* ===== Batch 7D: Dashboard & Assets ===== */
.dashboard-grid {
  display:grid; grid-template-columns:repeat(5,1fr); gap:var(--sp-4); margin-bottom:var(--sp-6);
}
.stat-card {
  background:var(--surface-panel); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); padding:var(--sp-5);
  display:flex; align-items:center; gap:var(--sp-3);
  box-shadow:var(--elev-1); transition:box-shadow var(--motion-f);
}
.stat-card:hover { box-shadow:var(--elev-2); }
.stat-card-icon { width:44px; height:44px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.stat-card-icon.blue  { background:#e4f7fc; }
.stat-card-icon.green { background:var(--s-pub-bg); }
.stat-card-icon.gold  { background:var(--s-dft-bg); }
.stat-card-icon.navy  { background:#eef1f5; }
.stat-card-value { font-size:var(--fs-xl); font-weight:700; color:var(--text-primary); line-height:1; }
.stat-card-label { font-size:var(--fs-xs); color:var(--text-muted); margin-top:var(--sp-1); text-transform:uppercase; letter-spacing:.04em; }
@media (max-width:900px) { .dashboard-grid { grid-template-columns:repeat(3,1fr); } }
@media (max-width:480px) { .dashboard-grid { grid-template-columns:1fr 1fr; } }
```

stat-card 图标颜色映射：stat-total=blue(📦) / stat-featured=gold(⭐) / stat-categories=navy(🗂) / stat-inquiries=blue(📬) / stat-new-inquiries=green(🔔)

### 7D-2 资源库拖放 + 网格 CSS

```css
.upload-dropzone { border:2px dashed var(--border-strong); border-radius:var(--radius-lg); padding:var(--sp-8) var(--sp-6); text-align:center; background:var(--surface-subtle); cursor:pointer; transition:all var(--motion-f); margin-bottom:var(--sp-4); }
.upload-dropzone.dz-over { border-color:var(--accent); background:var(--accent-dim); }
.dz-icon { font-size:36px; margin-bottom:var(--sp-2); }
.dz-text { font-size:var(--fs-md); font-weight:500; color:var(--text-primary); }
.dz-sub  { font-size:var(--fs-sm); color:var(--text-muted); margin:var(--sp-2) 0 var(--sp-4); }
.assets-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:var(--sp-3); }
.asset-card { border:1px solid var(--border-subtle); border-radius:var(--radius-md); overflow:hidden; cursor:pointer; background:var(--surface-panel); transition:box-shadow var(--motion-f),transform var(--motion-f); }
.asset-card:hover { box-shadow:var(--elev-1); transform:translateY(-1px); }
.asset-card.ac-sel { border-color:var(--accent); box-shadow:0 0 0 2px var(--accent-dim); }
.ac-thumb { width:100%; height:96px; object-fit:cover; background:var(--surface-subtle); display:block; }
.ac-info  { padding:var(--sp-2); }
.ac-name  { font-size:var(--fs-xs); color:var(--text-primary); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.ac-type  { font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-top:1px; }
```

执行 7D 前先读 `renderAssetsTable()`（约第 3010 行）了解数据字段名，再写网格渲染和右侧详情面板逻辑。

---

## 报告格式（每批通用）

完成后写入 `C:\Users\hnlxd\Desktop\claude_check.md`，顶部写"给 Claude 的提示词"，包含：

1. 本批次改动文件列表及改动简述
2. 跳过或未完成的项及原因
3. smoke test 完整输出
4. 静态检查结果（node --check）
5. 截图路径（1440px + 390px）
6. 发现的新问题或阻塞（如有）
