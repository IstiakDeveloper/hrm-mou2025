#!/usr/bin/env python3
"""Parse legacy FixedAssets.xls into normalized JSON rows for Laravel import."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import xlrd
except ImportError:
    print("ERROR: xlrd is required. Run: python -m pip install xlrd", file=sys.stderr)
    sys.exit(2)

SHEET_ALIASES = {
    "Bandikhara": "Bandaikhara",
    "Kirtipur": "Kritipur",
    "Shaharpukur": "Saharpukur",
    "Adamdigi": "Adamdighi",
    "Soilgachi": "Shailgachi",
    "Tilokpur": "Tilakpur",
    "Nozipur": "Nazipur",
    "Phaharpur": "Paharpur",
    "Chowbaria": "Chaubaria Hat",
    "Gangopara": "Hat Gangopara",
    "Khatkhoir": "Katkhair",
    "Hat Koroi": "Hatkoroi",
    "Dighirhat": "Digirhat",
}

SKIP_SHEETS = {"Agradigun (3)"}

CAT_HEADER_RE = re.compile(r"^(.+?)\s*\((\d+(?:\.\d+)?)\s*%\)\s*$")
ASSET_RE = re.compile(r"^(MOU|COAST)-(.+?)-([A-Za-z]{2,4})-(\d+)$", re.I)


def parse_date(cell, datemode: int) -> str | None:
    if cell.ctype == xlrd.XL_CELL_DATE:
        try:
            return xlrd.xldate_as_datetime(cell.value, datemode).strftime("%Y-%m-%d")
        except Exception:
            return None
    value = cell.value
    if isinstance(value, str):
        value = value.strip()
        if re.match(r"^\d{4}-\d{2}-\d{2}", value):
            return value[:10]
    return None


def to_float(value) -> float:
    try:
        if value in ("", None):
            return 0.0
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: parse_fixed_assets_xls.py <path-to-FixedAssets.xls>", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        return 2

    wb = xlrd.open_workbook(str(path))
    rows: list[dict] = []
    warnings: list[str] = []

    for sheet_name in wb.sheet_names():
        if sheet_name in SKIP_SHEETS:
            warnings.append(f"Skipped non-asset sheet: {sheet_name}")
            continue

        branch_name = SHEET_ALIASES.get(sheet_name, sheet_name)
        sh = wb.sheet_by_name(sheet_name)
        current_category = None
        current_rate = None

        for r in range(sh.nrows):
            raw = sh.cell(r, 0).value
            if not isinstance(raw, str):
                continue
            cell0 = raw.strip()
            if not cell0 or cell0 == "Asset No":
                continue

            if re.match(r"^\d{5,6}\s*-\s*", cell0):
                continue

            cat_match = CAT_HEADER_RE.match(cell0)
            if cat_match:
                current_category = cat_match.group(1).strip()
                current_rate = float(cat_match.group(2))
                continue

            asset_match = ASSET_RE.match(cell0)
            if not asset_match:
                if cell0.upper().startswith("MOU-") or cell0.upper().startswith("COAST-"):
                    warnings.append(f"{sheet_name}!R{r + 1}: unparsable tag {cell0}")
                continue

            if not current_category:
                warnings.append(f"{sheet_name}!R{r + 1}: asset without category header: {cell0}")
                continue

            source_prefix = asset_match.group(1).upper()
            branch_abbr = asset_match.group(2)
            sub_code = asset_match.group(3).upper()
            seq = asset_match.group(4)

            purchase_date = parse_date(sh.cell(r, 1), wb.datemode)
            purchase_cost = to_float(sh.cell(r, 2).value)
            opening_value = to_float(sh.cell(r, 3).value)
            accum_dep = to_float(sh.cell(r, 11).value)
            closing_value = to_float(sh.cell(r, 12).value)

            rows.append(
                {
                    "sheet": sheet_name,
                    "branch_name": branch_name,
                    "excel_row": r + 1,
                    "asset_tag": cell0,
                    "source_prefix": source_prefix,
                    "branch_abbr": branch_abbr,
                    "sub_code": sub_code,
                    "seq": seq,
                    "category_name": current_category,
                    "category_rate": current_rate,
                    "purchase_date": purchase_date,
                    "purchase_cost": round(purchase_cost, 2),
                    "opening_value": round(opening_value, 2),
                    "accumulated_depreciation": round(accum_dep, 2),
                    "book_value": round(closing_value, 2),
                }
            )

    payload = {
        "source": str(path).replace("\\", "/"),
        "as_of_date": "2026-07-01",
        "last_depreciation_date": "2026-06-30",
        "asset_count": len(rows),
        "warnings": warnings,
        "rows": rows,
    }
    json.dump(payload, sys.stdout, ensure_ascii=False, separators=(",", ":"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
