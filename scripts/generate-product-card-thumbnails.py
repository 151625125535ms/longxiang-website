#!/usr/bin/env python3
"""Generate pure-white product card thumbnails without overwriting source images."""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, Optional, Tuple

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "data" / "longxiang.db"
DEFAULT_OUTPUT_DIR = ROOT / "assets" / "optimized" / "product-cards"
DEFAULT_REPORT = ROOT / ".tmp" / "product-card-thumbnail-report.json"
CANVAS_SIZE = (960, 720)
WHITE_THRESHOLD = 246
ALPHA_THRESHOLD = 8
BBOX_EXPAND_RATIO = 0.035
WEBP_QUALITY = 88
PRODUCT_SCALE_OVERRIDES = {
    "gcs": 0.78,
    "lxac-14kw": 0.74,
    "product-1781800386893": 0.76,
    "grid-connected-pv-box": 0.76,
    "pv-combiner-box": 0.76,
    "grid-connected-pv-cabinet": 0.76,
    "segmented-arc-quenching-surge-arrester": 0.70,
}


def query_products(db_path: Path) -> Iterable[sqlite3.Row]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield from conn.execute(
            """
            SELECT
                p.id,
                p.legacy_id,
                p.slug,
                p.name_en,
                COALESCE(parent.slug, c.slug, p.product_group, '') AS group_slug,
                COALESCE(c.slug, p.sub_category, '') AS category_slug,
                pm.path AS image_path
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN categories parent ON parent.id = c.parent_id
            LEFT JOIN product_media pm ON pm.product_id = p.id AND pm.is_cover = 1
            WHERE p.status = 'published'
            ORDER BY p.sort_order, p.id
            """
        )
    finally:
        conn.close()


def public_path_to_file(public_path: str) -> Path:
    return ROOT.joinpath(*public_path.replace("\\", "/").lstrip("/").split("/"))


def slugify(value: str, fallback: str) -> str:
    slug = re.sub(r"[^a-z0-9-]+", "-", (value or "").strip().lower())
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or fallback


def output_name(row: sqlite3.Row) -> str:
    return slugify(row["slug"] or row["legacy_id"] or "", f"product-{row['id']}") + ".webp"


def product_key(row: sqlite3.Row) -> str:
    return slugify(row["slug"] or row["legacy_id"] or "", f"product-{row['id']}")


def is_background_pixel(r: int, g: int, b: int, a: int) -> bool:
    if a <= ALPHA_THRESHOLD:
        return True
    return r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD


def detect_subject_bbox(image: Image.Image) -> Optional[Tuple[int, int, int, int]]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    min_x, min_y = width, height
    max_x, max_y = -1, -1

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if is_background_pixel(r, g, b, a):
                continue
            if x < min_x:
                min_x = x
            if y < min_y:
                min_y = y
            if x > max_x:
                max_x = x
            if y > max_y:
                max_y = y

    if max_x < 0 or max_y < 0:
        return None
    return min_x, min_y, max_x + 1, max_y + 1


def expand_bbox(bbox: Tuple[int, int, int, int], image_size: Tuple[int, int]) -> Tuple[int, int, int, int]:
    left, top, right, bottom = bbox
    width, height = image_size
    pad_x = max(2, round((right - left) * BBOX_EXPAND_RATIO))
    pad_y = max(2, round((bottom - top) * BBOX_EXPAND_RATIO))
    return (
        max(0, left - pad_x),
        max(0, top - pad_y),
        min(width, right + pad_x),
        min(height, bottom + pad_y),
    )


def classify(fill_ratio: float, bbox: Optional[Tuple[int, int, int, int]]) -> str:
    if bbox is None:
        return "low_confidence"
    if fill_ratio >= 0.985 or fill_ratio <= 0.08:
        return "low_confidence"
    if fill_ratio < 0.82:
        return "safe_auto"
    if fill_ratio < 0.92:
        return "needs_review"
    return "low_confidence"


def target_limits(crop_size: Tuple[int, int]) -> Tuple[int, int]:
    crop_width, crop_height = crop_size
    ratio = crop_width / crop_height if crop_height else 1
    canvas_width, canvas_height = CANVAS_SIZE

    if ratio < 0.58:
        return round(canvas_width * 0.46), round(canvas_height * 0.84)
    if ratio < 0.98:
        return round(canvas_width * 0.62), round(canvas_height * 0.82)
    if ratio > 1.75:
        return round(canvas_width * 0.86), round(canvas_height * 0.68)
    if ratio > 1.28:
        return round(canvas_width * 0.84), round(canvas_height * 0.74)
    return round(canvas_width * 0.80), round(canvas_height * 0.79)


def fit_size(source_size: Tuple[int, int], limits: Tuple[int, int]) -> Tuple[int, int]:
    source_width, source_height = source_size
    max_width, max_height = limits
    scale = min(max_width / source_width, max_height / source_height)
    return max(1, round(source_width * scale)), max(1, round(source_height * scale))


def scaled_limits(row: sqlite3.Row, crop_size: Tuple[int, int]) -> Tuple[int, int]:
    max_width, max_height = target_limits(crop_size)
    scale = PRODUCT_SCALE_OVERRIDES.get(product_key(row), 1)
    return max(1, round(max_width * scale)), max(1, round(max_height * scale))


def flatten_to_white(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    white = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    white.alpha_composite(rgba)
    return white.convert("RGB")


def generate_thumbnail(row: sqlite3.Row, output_dir: Path) -> Dict[str, Any]:
    image_path = (row["image_path"] or "").replace("\\", "/").strip()
    result: Dict[str, Any] = {
        "productId": row["id"],
        "legacyId": row["legacy_id"] or "",
        "slug": row["slug"] or "",
        "name": row["name_en"] or "",
        "sourcePath": image_path,
        "outputPath": "",
        "status": "skipped",
        "risk": "missing_file",
        "action": "skipped",
    }

    if not image_path:
        result["error"] = "Product has no cover image path."
        return result

    source_file = public_path_to_file(image_path)
    if not source_file.exists():
        result["error"] = "Image file does not exist in the local workspace."
        return result

    output_file = output_dir / output_name(row)
    with Image.open(source_file) as image:
        original_width, original_height = image.size
        bbox = detect_subject_bbox(image)
        fill_ratio = 0.0
        risk = "low_confidence"
        crop_box: Tuple[int, int, int, int] = (0, 0, original_width, original_height)

        if bbox:
            left, top, right, bottom = bbox
            fill_ratio = ((right - left) * (bottom - top)) / float(original_width * original_height)
            risk = classify(fill_ratio, bbox)
            if risk == "safe_auto":
                crop_box = expand_bbox(bbox, image.size)

        crop = image.crop(crop_box)
        flattened = flatten_to_white(crop)
        fitted_size = fit_size(flattened.size, scaled_limits(row, flattened.size))
        resized = flattened.resize(fitted_size, Image.Resampling.LANCZOS)

        canvas = Image.new("RGB", CANVAS_SIZE, (255, 255, 255))
        x = (CANVAS_SIZE[0] - fitted_size[0]) // 2
        y = (CANVAS_SIZE[1] - fitted_size[1]) // 2
        canvas.paste(resized, (x, y))

        output_dir.mkdir(parents=True, exist_ok=True)
        canvas.save(output_file, "WEBP", quality=WEBP_QUALITY, method=6)

        result.update(
            {
                "outputPath": str(output_file.relative_to(ROOT)).replace("\\", "/"),
                "status": "generated",
                "risk": risk,
                "action": "generated_cropped" if risk == "safe_auto" else "generated_conservative",
                "sourceSize": {"width": original_width, "height": original_height},
                "cropBox": {
                    "x": crop_box[0],
                    "y": crop_box[1],
                    "width": crop_box[2] - crop_box[0],
                    "height": crop_box[3] - crop_box[1],
                },
                "subjectFillRatio": round(fill_ratio, 4),
                "canvasSize": {"width": CANVAS_SIZE[0], "height": CANVAS_SIZE[1]},
                "renderedSize": {"width": fitted_size[0], "height": fitted_size[1]},
            }
        )

    return result


def summarize(items: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    summary: Dict[str, Any] = {
        "total": 0,
        "generated": 0,
        "generated_cropped": 0,
        "generated_conservative": 0,
        "skipped": 0,
        "missing_file": 0,
        "safe_auto": 0,
        "needs_review": 0,
        "low_confidence": 0,
    }
    for item in items:
        summary["total"] += 1
        status = item.get("status")
        action = item.get("action")
        risk = item.get("risk")
        if status == "generated":
            summary["generated"] += 1
        elif status == "skipped":
            summary["skipped"] += 1
        if action in summary and action != "skipped":
            summary[action] += 1
        if risk in summary:
            summary[risk] += 1
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate pure-white product card thumbnails.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="SQLite database path.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUTPUT_DIR), help="Thumbnail output directory.")
    parser.add_argument("--report", default=str(DEFAULT_REPORT), help="JSON report path.")
    args = parser.parse_args()

    output_dir = Path(args.out_dir)
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    items = [generate_thumbnail(row, output_dir) for row in query_products(Path(args.db))]
    report = {
        "workspace": str(ROOT),
        "database": str(Path(args.db)),
        "outputDirectory": str(output_dir),
        "canvasSize": {"width": CANVAS_SIZE[0], "height": CANVAS_SIZE[1]},
        "whiteThreshold": WHITE_THRESHOLD,
        "alphaThreshold": ALPHA_THRESHOLD,
        "summary": summarize(items),
        "items": items,
    }

    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    print(f"Wrote {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
