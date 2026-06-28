# 已跟踪资源与历史产物审查清单

## 审查范围

本清单对应 Stage 7A，仅审查 Git 已跟踪文件，不改变任何资源文件、Git 跟踪状态或目录结构。

本阶段使用的候选范围：

```powershell
git ls-files -- uploads screenshots data backups logs
git ls-files -- '*.bak-*' 'longxiang-*.png' 'products-import-*.json' '*.docx'
```

引用证据搜索规则：对每个候选文件使用文件名在已跟踪文本文件中搜索，范围限定为 `*.html`、`*.js`、`*.css`、`*.json`、`*.md`。本阶段不处理、不移动、不删除、不暂存禁止目录，也不对资源文件执行 `git rm` 或取消 Git 跟踪。

分类规则：

- A：明确在网站使用中，保留。
- B：数据库或后台可能引用，暂时保留。
- C：明显测试、截图、备份或导入产物，建议后续移出 Git 或归档。
- D：无法判断，保留，等有更强证据再处理。

## 汇总

- 候选文件总数：69
- A：1 个
- B：34 个
- C：32 个
- D：2 个
- `data/`、`backups/`、`logs/` 在本次限定命令中未返回已跟踪候选文件。

## 明细清单

| 文件路径 | 文件类型 | Git 跟踪状态 | 引用证据 | 分类 | 建议处理方式 |
| --- | --- | --- | --- | --- | --- |
| `5.26网站问题(1).docx` | Word 文档 | 已跟踪（git ls-files） | 未发现文件名引用 | C | 明显历史 Word 文档；本阶段不处理，后续经确认后移出 Git 或归档。 |
| `assets/education/education.docx` | Word 文档 | 已跟踪（git ls-files） | `docs/assets/education-assets.md:3` 提到源文档 | C | Word 源文档；本阶段不处理，后续确认是否归档到文档资料区或移出 Git。 |
| `contact.html.bak-contact-ui-20260610` | HTML 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `contact.html.bak-fix-google-embed-20260610` | HTML 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `contact.html.bak-map-marker-20260610` | HTML 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `contact.html.bak-npc-map-20260610` | HTML 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `css/styles.css.bak-contact-ui-20260610` | CSS 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `css/styles.css.bak-map-marker-20260610` | CSS 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `css/styles.css.bak-npc-map-20260610` | CSS 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `css/styles.css.bak-vector-row-20260609` | CSS 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `index.html.bak-vector-row-20260609` | HTML 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `js/main.js.bak-map-marker-20260610` | JS 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `js/main.js.bak-npc-map-20260610` | JS 备份文件 | 已跟踪（git ls-files） | 未发现文件名引用 | C | `.bak-*` 历史备份；后续经确认后移出 Git 或归档。 |
| `longxiang-home-desktop.png` | PNG 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | 根目录验证截图；后续经确认后移出 Git 或归档。 |
| `longxiang-home-desktop-after.png` | PNG 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | 根目录验证截图；后续经确认后移出 Git 或归档。 |
| `longxiang-home-desktop-final.png` | PNG 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | 根目录验证截图；后续经确认后移出 Git 或归档。 |
| `longxiang-home-desktop-qa.png` | PNG QA 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | QA 截图；后续经确认后移出 Git 或归档。 |
| `longxiang-home-mobile-final.png` | PNG 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | 根目录验证截图；后续经确认后移出 Git 或归档。 |
| `longxiang-home-mobile-qa.png` | PNG QA 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | QA 截图；后续经确认后移出 Git 或归档。 |
| `longxiang-local-http-detail-qa.png` | PNG QA 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | QA 截图；后续经确认后移出 Git 或归档。 |
| `longxiang-local-http-mobile-qa.png` | PNG QA 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | QA 截图；后续经确认后移出 Git 或归档。 |
| `longxiang-logo-symbo1l.png` | PNG 图片 | 已跟踪（git ls-files） | 未发现文件名引用 | D | 文件名疑似历史或误拼资源，但证据不足；保留，等待更强证据。 |
| `longxiang-logo-symbol.png` | PNG 图片 | 已跟踪（git ls-files） | `js/content-pages.js:150`、`js/content-pages.js:152`、`server/lib/contentBlockSeeds.js:13`、`scripts/seed-content-blocks-20260616.js:24` | A | 明确被站点内容种子和前端内容逻辑引用；保留。 |
| `longxiang-products-modal-qa.png` | PNG QA 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | QA 截图；后续经确认后移出 Git 或归档。 |
| `products-import-amorphous-manual.json` | 产品导入 JSON | 已跟踪（git ls-files） | 未发现文件名引用 | C | 导入临时文件；本阶段不处理，后续经确认后移出 Git 或归档。 |
| `products-import-box-transformer-manual.json` | 产品导入 JSON | 已跟踪（git ls-files） | `docs/import-logs/product-import-20260610-box-transformer-manual.md:7` | C | 导入临时文件；本阶段不处理，后续经确认后移出 Git 或归档。 |
| `products-import-new-energy.json` | 产品导入 JSON | 已跟踪（git ls-files） | 未发现文件名引用 | C | 导入临时文件；本阶段不处理，后续经确认后移出 Git 或归档。 |
| `products-import-silicon-manual.json` | 产品导入 JSON | 已跟踪（git ls-files） | 未发现文件名引用 | C | 导入临时文件；本阶段不处理，后续经确认后移出 Git 或归档。 |
| `products-import-switchgear-manual.json` | 产品导入 JSON | 已跟踪（git ls-files） | `docs/import-logs/product-import-20260610-switchgear-manual.md:7` | C | 导入临时文件；本阶段不处理，后续经确认后移出 Git 或归档。 |
| `screenshots/admin-batch2-desktop-1440.png` | PNG 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | 验证截图；后续经确认后移出 Git 或归档。 |
| `screenshots/admin-batch2-mobile-390.png` | PNG 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | 验证截图；后续经确认后移出 Git 或归档。 |
| `screenshots/admin-batch3-content-cards-1440.png` | PNG 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | 验证截图；后续经确认后移出 Git 或归档。 |
| `screenshots/admin-batch3-modal-desktop-1440.png` | PNG 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | 验证截图；后续经确认后移出 Git 或归档。 |
| `screenshots/admin-batch3-modal-mobile-390.png` | PNG 截图 | 已跟踪（git ls-files） | 未发现文件名引用 | C | 验证截图；后续经确认后移出 Git 或归档。 |
| `uploads/asset-1781867281347-31018d5308a3.webp` | WebP 上传资源 | 已跟踪（git ls-files） | `docs/ops/PRODUCT_UPLOAD_WORKFLOW.md:245` | B | 上传资源，可能由后台资产或产品数据引用；暂时保留，后续结合数据库核对。 |
| `uploads/asset-1781872630474-e42f9c6f847a.webp` | WebP 上传资源 | 已跟踪（git ls-files） | `docs/ops/PRODUCT_UPLOAD_WORKFLOW.md:246` | B | 上传资源，可能由后台资产或产品数据引用；暂时保留，后续结合数据库核对。 |
| `uploads/asset-1781872631405-4a4483d19206.webp` | WebP 上传资源 | 已跟踪（git ls-files） | `docs/ops/PRODUCT_UPLOAD_WORKFLOW.md:247` | B | 上传资源，可能由后台资产或产品数据引用；暂时保留，后续结合数据库核对。 |
| `uploads/asset-1782286329274-b39ef19ff21f.webp` | WebP 上传资源 | 已跟踪（git ls-files） | 未发现文件名引用；位于 `uploads/` | B | 上传资源可能由数据库或后台引用；暂时保留，后续结合数据库核对。 |
| `uploads/docs/.gitkeep` | Git 占位文件 | 已跟踪（git ls-files） | `docs/ops/RESOURCE_HYGIENE.md:84` 提到例外规则 | D | 非业务资源，属于跟踪例外；保留，后续随 `.gitignore` 例外策略单独评估。 |
| `uploads/product-1778749192506-238290980.png` | PNG 上传资源 | 已跟踪（git ls-files） | 未发现文件名引用；位于 `uploads/` | B | 上传资源可能由数据库或后台引用；暂时保留，后续结合数据库核对。 |
| `uploads/product-1781433736331-2fe0db445b4b.png` | PNG 上传资源 | 已跟踪（git ls-files） | 未发现文件名引用；位于 `uploads/` | B | 上传资源可能由数据库或后台引用；暂时保留，后续结合数据库核对。 |
| `uploads/product-1781433802166-8aafc0d0d8c2.png` | PNG 上传资源 | 已跟踪（git ls-files） | 未发现文件名引用；位于 `uploads/` | B | 上传资源可能由数据库或后台引用；暂时保留，后续结合数据库核对。 |
| `uploads/product-1781439859624-ef46c00260fd.png` | PNG 上传资源 | 已跟踪（git ls-files） | 未发现文件名引用；位于 `uploads/` | B | 上传资源可能由数据库或后台引用；暂时保留，后续结合数据库核对。 |
| `uploads/product-box-type-substation.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-box-transformer-manual.json:96` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-compact-cooling-box-transformer.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-box-transformer-manual.json:69` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-ggd-low-voltage-fixed-switchgear.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-switchgear-manual.json:10` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-kyn-12-dry-air-switchgear.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-switchgear-manual.json:69` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-kyn28-12-metal-clad-switchgear.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-switchgear-manual.json:39` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-lxac-14kw.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-new-energy.json:40` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-lxac-7kw-ac-no-display.png` | PNG 上传资源 | 已跟踪（git ls-files） | 未发现文件名引用；位于 `uploads/` | B | 上传资源可能由数据库或后台引用；暂时保留，后续结合数据库核对。 |
| `uploads/product-lxac-7kw-display.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-new-energy.json:10` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-lxdc-120-400kw.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-new-energy.json:107` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-lxdc-20-30-40kw.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-new-energy.json:74` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-lxdc480-1280kw.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-new-energy.json:142` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-lxwz-reactive-power-compensation.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-switchgear-manual.json:99` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-portable-storage-1kw-3kwh.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-new-energy.json:174` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-portable-storage-3kw-5kwh.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-new-energy.json:213` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-s22-m-oil-immersed.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-silicon-manual.json:93` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-s22-m-rl-silicon-wound-core.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-silicon-manual.json:66`、`docs/import-logs/product-import-20260610-silicon-manual.md:29` | B | 导入 JSON 和导入日志曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-sbh21-m-rl-amorphous-wound-core.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-amorphous-manual.json:94` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-scb13-silicon-dry.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-silicon-manual.json:10` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-scb18-silicon-dry.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-silicon-manual.json:38` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-scbh15-dry-amorphous.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-amorphous-manual.json:10` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-scbh17-dry-amorphous.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-amorphous-manual.json:38` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-scbh19-dry-amorphous.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-amorphous-manual.json:66`、`docs/import-logs/product-import-20260610-amorphous-manual.md:29` | B | 导入 JSON 和导入日志曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-ts-les-920k100l.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-new-energy.json:282` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-ts-mes-115k12l.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-new-energy.json:252`、`docs/import-logs/product-import-20260610-new-energy.md:44` | B | 导入 JSON 和导入日志曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-zgs13-wind-combined.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-box-transformer-manual.json:38` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |
| `uploads/product-zgsbh15-pv-amorphous-combined.png` | PNG 上传资源 | 已跟踪（git ls-files） | `products-import-box-transformer-manual.json:10` | B | 导入 JSON 曾引用，可能已进入产品数据；暂时保留，后续结合数据库核对。 |

## 后续处理建议

1. A 类文件继续保留，不纳入清理讨论。
2. B 类文件先保留，后续如要治理，应先读取数据库或后台资产表，确认是否仍被产品、内容块或资源库引用。
3. C 类文件可以作为后续独立治理阶段的候选清单，但必须先再次确认用途，并取得明确授权后再移动、归档、移出 Git 或调整跟踪状态。
4. D 类文件保持现状，等待更强引用证据或明确业务归属。

本阶段不授权删除或移动任何文件，不授权执行 `git rm`，不授权取消任何资源文件的 Git 跟踪。
