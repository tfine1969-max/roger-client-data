import json
import re
from collections import OrderedDict
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\trevo\Wealthworks Dropbox\Wealth Works (Pty) Ltd\Roger Data\Client Names.xlsx")
OUT = ROOT / "base44" / "functions" / "_shared" / "canonicalClientMappings.ts"


def clean(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def compact_key(value):
    value = clean(value).lower()
    value = re.sub(r"\b(mr|mrs|ms|miss|dr|prof)\b", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def main():
    workbook = openpyxl.load_workbook(SOURCE, data_only=True)
    sheet = workbook.active
    mappings = OrderedDict()

    for row in sheet.iter_rows(min_row=2, values_only=True):
        account_code = clean(row[1] if len(row) > 1 else "")
        identity_no = clean(row[2] if len(row) > 2 else "")
        portfolio_name = clean(row[4] if len(row) > 4 else "")
        platform = clean(row[5] if len(row) > 5 else "")
        if not portfolio_name or not (account_code or identity_no):
            continue

        key = (compact_key(platform), account_code.lower(), identity_no.lower(), portfolio_name)
        mappings[key] = {
            "platform": platform,
            "accountCode": account_code,
            "identityNo": identity_no,
            "portfolioName": portfolio_name,
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "export const canonicalClientMappings = "
        + json.dumps(list(mappings.values()), indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(mappings)} canonical client mappings to {OUT}")


if __name__ == "__main__":
    main()
