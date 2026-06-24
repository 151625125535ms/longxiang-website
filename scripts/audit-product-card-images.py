#!/usr/bin/env python3
"""Audit product cover images for card-thumbnail generation readiness."""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, Optional, Tuple

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "data" / "longxiang.db"
DEFAULT_OUTPUT = ROOT / ".tmp" / "product-card-image-audit.json"
WHITE_THRESHOLD = 246
ALPHA_THRESHOLD = 8


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
                p.status,
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


def classify(fill_ratio: float, margins: Dict[str, float], bbox: Optional[Tuple[int, int, int, int]]) -> str:
    if bbox is None:
        return "low_confidence"
    max_imbalance = max(
        abs(margins["left"] - margins["right"]),
        abs(margins["top"] - margins["bottom"]),
    )
    if fill_ratio >= 0.985:
        return "low_confidence"
    if fill_ratio <= 0.08:
        return "low_confidence"
    if fill_ratio < 0.82 and max_imbalance < 0.22:
        return "safe_auto"
    if fill_ratio < 0.92:
        return "needs_review"
    return "low_confidence"


def audit_product(row: sqlite3.Row) -> Dict[str, Any]:
    image_path = (row["image_path"] or "").replace("\\", "/").strip()
    item: Dict[str, Any] = {
        "productId": row["id"],
        "legacyId": row["legacy_id"] or "",
        "slug": row["slug"] or "",
        "name": row["name_en"] or "",
        "group": row["group_slug"] or "",
        "category": row["category_slug"] or "",
        "imagePath": image_path,
        "status": "missing_file",
        "risk": "missing_file",
    }

    if not image_path:
        item["error"] = "Product has no cover image path."
        return item

    file_path = public_path_to_file(image_path)
    item["filePath"] = str(file_path)
    if not file_path.exists():
        item["error"] = "Image file does not exist in the local workspace."
        return item

    try:
        with Image.open(file_path) as image:
            width, height = image.size
            bbox = detect_subject_bbox(image)
            item.update(
                {
                    "status": "ok",
                    "format": image.format or "",
                    "fileSize": file_path.stat().st_size,
                    "width": width,
                    "height": height,
                }
            )

            if bbox is None:
                item.update(
                    {
                        "subjectBox": None,
                        "subjectFillRatio": 0,
                        "margins": None,
                        "risk": "low_confidence",
                        "reason": "Could not detect a non-white/non-transparent subject.",
                    }
                )
                return item

            left, top, right, bottom = bbox
            subject_width = right - left
            subject_height = bottom - top
            fill_ratio = (subject_width * subject_height) / float(width * height)
            margins = {
                "left": round(left / width, 4),
                "right": round((width - right) / width, 4),
                "top": round(top / height, 4),
                "bottom": round((height - bottom) / height, 4),
            }
            risk = classify(fill_ratio, margins, bbox)
            item.update(
                {
                    "subjectBox": {
                        "x": left,
                        "y": top,
                        "width": subject_width,
                        "height": subject_height,
                    },
                    "subjectFillRatio": round(fill_ratio, 4),
                    "margins": margins,
                    "risk": risk,
                }
            )
    except Exception as exc:  # pragma: no cover - defensive audit output
        item.update(
            {
                "status": "error",
                "risk": "missing_file",
                "error": str(exc),
            }
        )
    return item


def summarize(items: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "total": 0,
        "ok": 0,
        "missing_file": 0,
        "safe_auto": 0,
        "needs_review": 0,
        "low_confidence": 0,
    }
    for item in items:
        result["total"] += 1
        if item.get("status") == "ok":
            result["ok"] += 1
        risk = item.get("risk")
        if risk in result:
            result[risk] += 1
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit product cover images for card-thumbnail generation.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="SQLite database path.")
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT), help="JSON audit report path.")
    args = parser.parse_args()

    db_path = Path(args.db)
    output_path = Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    items = [audit_product(row) for row in query_products(db_path)]
    report = {
        "workspace": str(ROOT),
        "database": str(db_path),
        "whiteThreshold": WHITE_THRESHOLD,
        "alphaThreshold": ALPHA_THRESHOLD,
        "summary": summarize(items),
        "items": items,
    }

    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
