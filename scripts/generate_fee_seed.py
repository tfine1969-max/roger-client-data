"""Generate src/data/feeSeedRows.js from fees_seeded_values.xlsx."""
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "fees_seeded_values.xlsx"
OUT = ROOT / "src" / "data" / "feeSeedRows.js"

PROVIDER_NORMALIZE = {
    "gryphon asset management": "Gryphon",
    "gryphon": "Gryphon",
    "prime investments": "Prime",
    "prime": "Prime",
    "prime ": "Prime",
    "julius baer": "Julius Baer",
    "julius baer ": "Julius Baer",
    "credo": "Credo",
    "peresec securities": "Peresec",
    "peresec": "Peresec",
    "prescient": "Prescient",
    "northstar": "Northstar",
    "northstar fnb": "Northstar FNB",
    "northstar sanlam": "Northstar Sanlam",
}


def normalized_text(value):
    value = str(value or "").strip()
    value = re.sub(r"\b(mr|mrs|ms|miss|dr|prof)\b", " ", value, flags=re.I)
    value = re.sub(r"[^a-z0-9]+", " ", value.lower())
    return re.sub(r"\s+", " ", value).strip()


def compact(value):
    return re.sub(r"[^a-z0-9]", "", normalized_text(value))


def tokens(value):
    return [t for t in normalized_text(value).split() if t]


def normalize_provider(raw):
    key = str(raw or "").strip().lower()
    return PROVIDER_NORMALIZE.get(key, str(raw or "").strip())


rows = []
wb = openpyxl.load_workbook(SOURCE)
ws = wb.active

for row in ws.iter_rows(min_row=2, values_only=True):
    client, cls, investment, inv_class, provider, rebate, advisory = (row + (None,) * 7)[:7]
    if not client or not investment:
        continue
    client = str(client).strip()
    investment = str(investment).strip()
    inv_class = str(inv_class).strip() if inv_class else ""
    provider_raw = str(provider).strip() if provider else ""
    provider_norm = normalize_provider(provider_raw)
    rebate_pct = round(float(rebate or 0) * 100, 6)
    advisory_pct = round(float(advisory or 0) * 100, 6)

    rows.append({
        "client": client,
        "clientKey": compact(client),
        "clientTokens": tokens(client),
        "investment": investment,
        "investmentClass": inv_class,
        "investmentKey": compact(investment),
        "provider": provider_norm,
        "sourceProvider": provider_raw,
        "rebateAnnualPercent": rebate_pct,
        "advisoryAnnualPercent": advisory_pct,
    })

js = (
    "// Generated from fees_seeded_values.xlsx. "
    "Percent fields are annual percentage values, e.g. 0.4 = 0.40% p.a.\n"
    "export const feeSeedRows = "
    + json.dumps(rows, indent=2, ensure_ascii=False)
    + ";\n"
)

OUT.write_text(js, encoding="utf-8")
print(f"Wrote {len(rows)} rows → {OUT}")
