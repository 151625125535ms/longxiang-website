# Product Series Restructure Extraction Notes

## Source PDFs

```text
D:\LX\产品册\变压器画册版式-2硅钢.pdf
D:\LX\产品册\变压器画册版式-1非晶.pdf
```

## Tool Precheck

- PyMuPDF: available.
- pypdfium2: available.
- pytesseract Python package: available.
- Tesseract executable: not available in PATH.
- PaddleOCR: not installed.

Execution used PyMuPDF rendering plus visual inspection of rendered page images.

Rendered temporary images:

```text
D:\tmp\longxiang-product-series-ocr\
```

Temporary images are not committed.

## Page Mapping

Both PDFs are two-page spread catalog files. The catalog page numbers printed in
the table of contents are internal printed page numbers, not one-to-one PDF
physical pages.

### Silicon Steel PDF

- Physical page 4 contains the table of contents.
- Physical page 5 contains printed page 01.
- Target product pages start from physical page 6.
- Product spread mapping was identified from rendered contact sheet:

| Module | Catalog pages | Physical pages | Series / Product group |
| --- | --- | --- | --- |
| 1 | 02, 05, 08 | 6-10 | SC(B)13 / SC(B)14 / SC(B)18 silicon steel dry-type transformers |
| 2 | 11, 14, 17 | 11-15 | S13 / S20 / S22-M.RL oil-immersed 3D wound core transformers |
| 3 | 20, 23, 26 | 16-20 | S13 / S20 / S22-M.RL anti-short-circuit 3D wound core transformers |
| 4 | 29, 32, 35 | 21-25 | S13 / S20 / S22-M oil-immersed power transformers |
| 5 | 38 | 26 | S13-M vegetable-oil high-overload distribution transformer |

### Amorphous Alloy PDF

- Physical page 4 contains the table of contents.
- Physical page 5 contains printed page 01.
- Target product pages start from physical page 6.
- Product spread mapping was identified from rendered contact sheet:

| Module | Catalog pages | Physical pages | Series / Product group |
| --- | --- | --- | --- |
| 1 | 02, 05, 08 | 6-10 | SC(B)H15 / SC(B)H17 / SC(B)H19 dry-type amorphous alloy core transformers |
| 2 | 11 | 11 | DGH dry-type amorphous alloy furnace transformer |
| 3 | 14 | 12 | S(B)H21-M.RL oil-immersed amorphous alloy 3D wound core transformer |
| 4 | 17, 20, 23 | 13-17 | S(B)H15-M oil-immersed amorphous alloy distribution transformer |
| 5 | 26, 29, 32 | 18-22 | S(B)H21-M oil-immersed amorphous alloy distribution transformer |
| 6 | 35 | 23 | S(B)H25-M oil-immersed amorphous alloy distribution transformer |

## OCR Confidence / Notes

- Full table OCR was not reliable because Tesseract executable is unavailable.
- Product series names and grouping were read from rendered images and contact sheets.
- Detailed electrical table values should be treated as catalog-backed but not
  fully transcribed. Product modules therefore use conservative range values
  such as `30-2500 kVA` and `6-10kV distribution class` where the rendered table
  detail was too small for reliable transcription.
- No PDF source files or rendered temporary images were added to git.
