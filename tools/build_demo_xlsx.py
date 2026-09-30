#!/usr/bin/env python3
"""Build the reproducible synthetic demo XLSX fixture for dashboard QA.

Source of truth: ``Base Datos_PsO_Valme_demo.csv``.

The generated workbook is a lossless derivative: header order and every cell
value (including blanks) are copied verbatim from the CSV, with no inference,
normalization, enrichment or clinical correction. Dates stay as the CSV text
strings; no Excel serials are manufactured.

Usage:
    python3 tools/build_demo_xlsx.py

Determinism note: the SHA-256 of the source CSV is printed so it can be
recorded as evidence. The verification test re-checks that hash.
"""

from __future__ import annotations

import csv
import hashlib
import sys
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook

REPO_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = REPO_ROOT / "Base Datos_PsO_Valme_demo.csv"
XLSX_PATH = REPO_ROOT / "Base Datos_PsO_Valme_demo.xlsx"
SHEET_TITLE = "Base_PsO"


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    if not CSV_PATH.exists():
        print(f"Source CSV not found: {CSV_PATH}", file=sys.stderr)
        return 2

    with CSV_PATH.open(encoding="utf-8-sig", newline="") as handle:
        matrix = list(csv.reader(handle))

    if not matrix:
        print("Source CSV is empty.", file=sys.stderr)
        return 2

    workbook = Workbook()
    # Fixed document timestamps keep the generated artifact byte-reproducible.
    fixed = datetime(2026, 9, 29, 0, 0, 0)
    workbook.properties.created = fixed
    workbook.properties.modified = fixed
    worksheet = workbook.active
    worksheet.title = SHEET_TITLE

    for row_index, row in enumerate(matrix, start=1):
        for col_index, value in enumerate(row, start=1):
            # Blanks stay blank; every other value is written verbatim as text.
            if value == "":
                continue
            worksheet.cell(row=row_index, column=col_index, value=str(value))

    workbook.save(XLSX_PATH)
    print(f"CSV : {CSV_PATH.name}")
    print(f"SHA-256: {sha256_of(CSV_PATH)}")
    print(f"Wrote: {XLSX_PATH.name} sheet={SHEET_TITLE} rows={len(matrix)} cols={len(matrix[0])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
