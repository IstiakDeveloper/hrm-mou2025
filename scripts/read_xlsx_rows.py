#!/usr/bin/env python3
"""Read first worksheet of an XLSX file; print JSON array of rows (stdout)."""
import io
import json
import sys

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
import zipfile
import xml.etree.ElementTree as ET
import re

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def col_index(letters: str) -> int:
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch) - 64)
    return idx - 1


def col_letters(ref: str) -> str:
    m = re.match(r"^([A-Z]+)", ref or "")
    return m.group(1) if m else "A"


def load_shared(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    strings = []
    for si in root.findall("m:si", NS):
        strings.append("".join((t.text or "") for t in si.findall(".//m:t", NS)))
    return strings


def cell_value(cell: ET.Element, shared: list[str]) -> str:
    t = cell.get("t")
    v = cell.find("m:v", NS)
    if t == "inlineStr":
        inline = cell.find("m:is", NS)
        if inline is not None:
            parts = inline.findall(".//m:t", NS)
            return "".join((p.text or "") for p in parts)
    if v is None:
        return ""
    raw = v.text or ""
    if t == "s":
        return shared[int(raw)] if raw.isdigit() else ""
    return raw


def sheet_rows(path: str) -> list[list[str]]:
    with zipfile.ZipFile(path) as zf:
        shared = load_shared(zf)
        sheet_xml = zf.read("xl/worksheets/sheet1.xml")
    root = ET.fromstring(sheet_xml)
    rows_out: list[list[str]] = []
    for row in root.findall("m:sheetData/m:row", NS):
        cells: dict[int, str] = {}
        for cell in row.findall("m:c", NS):
            ref = cell.get("r") or "A1"
            col = col_letters(ref)
            cells[col_index(col)] = cell_value(cell, shared)
        if not cells:
            rows_out.append([])
            continue
        max_i = max(cells)
        line = [""] * (max_i + 1)
        for i, val in cells.items():
            line[i] = val
        rows_out.append(line)
    return rows_out


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: read_xlsx_rows.py <file.xlsx>", file=sys.stderr)
        sys.exit(1)
    print(json.dumps(sheet_rows(sys.argv[1]), ensure_ascii=False))


if __name__ == "__main__":
    main()
