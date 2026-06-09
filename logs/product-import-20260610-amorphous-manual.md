# Product Import Log - 2026-06-10 - Amorphous Transformer Manual

Source manual:
`D:\weChat\xwechat_files\wxid_cxlg10degckg22_e794\msg\file\2026-06\产品册\变压器画册版式-1非晶.pdf`

## Processing Notes

- The PDF is image-based and has no extractable text layer.
- The manual was processed from rendered page images and extracted product images.
- Existing backend data already contained DGH and several oil-immersed amorphous transformer records, so this import only added non-duplicate product series that were clearly confirmed from the manual.

## Imported Products

1. `SCBH15` - SC(B)H15 Dry-Type Amorphous Alloy Core Distribution Transformer
2. `SCBH17` - SC(B)H17 Dry-Type Amorphous Alloy Core Distribution Transformer
3. `SCBH19` - SC(B)H19 Dry-Type Amorphous Alloy Core Distribution Transformer
4. `SBH21-M-RL` - S(B)H21-M.RL Oil-Immersed Amorphous Alloy 3D Wound Core Distribution Transformer

## Classification

- `SCBH15`, `SCBH17`, `SCBH19`: `transformer / dry-type / dry-type`
- `SBH21-M-RL`: `transformer / oil-immersed / oil-immersed`

## Verification

- Dry run passed before import.
- Import script created a backup before writing `data/products.json`.
- API validation example passed: `/api/products/SCBH19`
- Image validation example passed: `/uploads/product-scbh19-dry-amorphous.png`

## De-duplication

The following catalog items were not re-imported because existing product records already covered the same product families:

- DGH dry-type amorphous alloy furnace transformer
- General S(B)H15 / S(B)H21 / S(B)H25 amorphous oil-immersed transformer records
- Existing anti-short-circuit amorphous and vegetable-oil amorphous product records
