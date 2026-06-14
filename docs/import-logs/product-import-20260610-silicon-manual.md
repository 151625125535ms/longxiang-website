# Product Import Log - 2026-06-10 - Silicon Steel Transformer Manual

Source manual:
`D:\weChat\xwechat_files\wxid_cxlg10degckg22_e794\msg\file\2026-06\产品册\变压器画册版式-2硅钢.pdf`

## Processing Notes

- The PDF is image-based and has no extractable text layer.
- The manual was processed from rendered page images and extracted product images.
- Existing backend data already contained SCB14, S13, S20 and high-overload oil-immersed transformer records, so this import only added clearly confirmed non-duplicate product series.

## Imported Products

1. `SCB13` - SC(B)13 Silicon Steel Laminated Dry-Type Power Transformer
2. `SCB18` - SC(B)18 Silicon Steel Laminated Dry-Type Power Transformer
3. `S22-M-RL` - S22-M.RL Oil-Immersed 3D Wound Core Distribution Transformer
4. `S22-M` - S22-M Oil-Immersed Power Transformer

## Classification

- `SCB13`, `SCB18`: `transformer / dry-type / dry-type`
- `S22-M-RL`, `S22-M`: `transformer / oil-immersed / oil-immersed`

## Verification

- Dry run passed before import.
- Import script created a backup before writing `data/products.json`.
- API validation example passed: `/api/products/S22-M-RL`
- Image validation example passed: `/uploads/product-s22-m-rl-silicon-wound-core.png`

## De-duplication

The following catalog items were not re-imported because existing product records already covered the same product families:

- SC(B)14 silicon steel laminated dry-type transformer
- S13-M.RL and S20-M.RL oil-immersed 3D wound core transformer records
- S13-M and S20-M oil-immersed transformer records
- S13 vegetable-oil high-overload oil-immersed transformer record
