from __future__ import annotations
import csv, json
from pathlib import Path
from .constants import SIGN_CODE_MAPPING

def write_json(path: str | Path, data) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

def write_csv(path: str | Path, rows: list[dict]) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        Path(path).write_text("", encoding="utf-8"); return
    fields = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)

def export_astro_package_like(out_dir: str | Path, chart: dict, midpoint_rows: list[dict]) -> None:
    out = Path(out_dir); (out / "json").mkdir(parents=True, exist_ok=True); (out / "csv").mkdir(exist_ok=True); (out / "reports").mkdir(exist_ok=True)
    write_json(out / "json/chart.json", chart)
    write_json(out / "json/midpoint_ephemeris_normalized.json", midpoint_rows)
    write_json(out / "json/sign_code_mapping.json", SIGN_CODE_MAPPING)
    write_csv(out / "csv/midpoint_ephemeris_normalized.csv", midpoint_rows)
    report = ["# Calculation Report", "", f"Midpoint records: {len(midpoint_rows)}", "", "Status: generated from birth details / Swiss Ephemeris, not OCR-extracted from PDF."]
    (out / "reports/validation_report.md").write_text("\n".join(report), encoding="utf-8")
