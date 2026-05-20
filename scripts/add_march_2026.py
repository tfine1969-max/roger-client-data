"""
Adds March 2026 entry to monthlyClientData.js from the Roger Data Excel file.
Matches Excel client names to existing Jan 2026 clients for account codes / identity numbers.
All NAV values from the Excel are ZAR-denominated (already converted).
"""
import json
import re
from collections import defaultdict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
EXCEL = Path("/root/.claude/uploads/410dfec5-c10b-4656-be0a-4912c3a41f11/d17dbd99-Roger_Data__Jan_to_March.xlsx")
OUT = ROOT / "src" / "data" / "monthlyClientData.js"

# Manual name overrides: (excel_name_normalized, provider_id) -> existing_full_name
# Used for clients whose Excel name doesn't match existing name automatically.
CLIENT_NAME_OVERRIDES = {
    # "Eskinazi, Raymond Nessim" -> Eskinazi, Ray (same person, different name format)
    ("eskinaziraymondnessim", "prime"): "Eskinazi, Ray",
    # Sweet Grass Trading lost the "12" in the Excel
    ("sweetgrasstradingptyltd", "prime"): "Sweet Grass Trading 12 (Pty) Ltd",
    ("sweetgrasstradingptyltdacc2", "prime"): "Sweet Grass Trading 12 Acc 2",
}

PROVIDERS = {
    "gryphon asset management": ("gryphon", "Gryphon"),
    "julius baer": ("julius-baer", "Julius Baer"),
    "northstar": ("northstar-fnb", "Northstar FNB"),
    "peresec securities": ("peresec", "Peresec"),
    "peresec": ("peresec", "Peresec"),
    "prescient": ("prescient", "Prescient"),
    "credo": ("credo", "Credo"),
    "prime": ("prime", "Prime Investments"),
}

FEE_RATES = {
    "julius-baer": {"rebateAnnualRate": 0.003221070905091383, "advisoryAnnualRate": 0.0056674609242583695},
    "credo": {"rebateAnnualRate": 0.003, "advisoryAnnualRate": 0.006},
    "gryphon": {"rebateAnnualRate": 0.0025, "advisoryAnnualRate": 0.005},
    "prime": {"rebateAnnualRate": 0.0025, "advisoryAnnualRate": 0.005},
    "northstar-fnb": {"rebateAnnualRate": 0.0, "advisoryAnnualRate": 0.005},
    "northstar-sanlam": {"rebateAnnualRate": 0.0, "advisoryAnnualRate": 0.005},
    "peresec": {"rebateAnnualRate": 0.0, "advisoryAnnualRate": 0.005},
    "prescient": {"rebateAnnualRate": 0.0, "advisoryAnnualRate": 0.005},
}


def normalize(v):
    """Compact alphanumeric key, strips titles."""
    v = str(v or "").lower().strip()
    v = re.sub(r"\b(mr|mrs|ms|miss|dr|prof)\b", " ", v)
    return re.sub(r"[^a-z0-9]+", "", v)


def to_provider(raw, investment=""):
    """Map raw Excel provider string to (provider_id, provider_name).
    Uses investment name to disambiguate Northstar FNB vs Northstar Sanlam.
    """
    t = normalize(raw)
    if "northstar" in t:
        if "sanlam" in normalize(investment):
            return "northstar-sanlam", "Northstar Sanlam"
        return "northstar-fnb", "Northstar FNB"
    for key, vals in PROVIDERS.items():
        if normalize(key) in t:
            return vals
    slug = re.sub(r"[^a-z0-9-]+", "-", str(raw).lower().strip())
    return slug, str(raw).strip()


def surname(name):
    """Return normalised surname (part before first comma, or whole name)."""
    return normalize(name.split(",")[0]) if "," in name else normalize(name)


def first_name_letter(name):
    """Return first letter of first name (after comma), stripping titles."""
    parts = name.split(",", 1)
    if len(parts) < 2:
        return ""
    fn = re.sub(r"\b(mr|mrs|ms|miss|dr|prof)\b", " ", parts[1].lower()).strip()
    return fn[0] if fn else ""


def match_name(excel_name, existing_names):
    """
    Match an abbreviated Excel client name to the best existing full name.
    Returns matching existing name, or None.
    When multiple accounts exist for the same client+provider, returns the first
    alphabetically so we get a deterministic representative account code.
    """
    norm = normalize(excel_name)
    # 1. Exact normalised match
    for en in existing_names:
        if normalize(en) == norm:
            return en

    # 2. Surname match
    sn = surname(excel_name)
    sn_matches = [en for en in existing_names if surname(en) == sn]

    if len(sn_matches) == 1:
        return sn_matches[0]

    if len(sn_matches) > 1:
        fl = first_name_letter(excel_name)
        if fl:
            fl_matches = [en for en in sn_matches if first_name_letter(en) == fl]
            if len(fl_matches) == 1:
                return fl_matches[0]
            if fl_matches:
                # Multiple accounts for same client; return the first (alphabetical)
                return sorted(fl_matches)[0]
            # Token overlap on first name
            excel_fn_tokens = set(
                re.sub(r"[^a-z]+", " ", excel_name.split(",", 1)[1].lower() if "," in excel_name else "").split()
            )
            best, best_score = None, 0
            for en in sn_matches:
                en_fn_tokens = set(
                    re.sub(r"[^a-z]+", " ", en.split(",", 1)[1].lower() if "," in en else "").split()
                )
                score = len(excel_fn_tokens & en_fn_tokens)
                if score > best_score:
                    best_score, best = score, en
            if best:
                return best
        # No first-name letter — return first alphabetical match
        return sorted(sn_matches)[0]

    return None


def build_jan_lookup(monthly_data):
    """
    Build lookup: (provider_id, normalised_client_name) -> {accountCode, identityNo, full_name}.
    """
    jan = next(m for m in monthly_data if m["id"] == "jan-2026")
    lookup = {}
    by_provider = defaultdict(list)
    for c in jan["clients"]:
        by_provider[c["providerId"]].append(c["client"])

    for c in jan["clients"]:
        lookup[(c["providerId"], normalize(c["client"]))] = {
            "accountCode": c["accountCode"],
            "identityNo": c["identityNo"],
            "fullName": c["client"],
        }
    return lookup, {pid: names for pid, names in by_provider.items()}


def generate_account_code(provider_id, client_name):
    slug = re.sub(r"[^A-Z0-9]+", "_", client_name.upper()).strip("_")[:70]
    return f"{provider_id.upper().replace('-', '_')}_{slug or 'UNKNOWN'}"


def compute_fees(zar_aum, provider_id):
    rates = FEE_RATES.get(provider_id, {"rebateAnnualRate": 0.0, "advisoryAnnualRate": 0.0})
    rebate_rate = rates["rebateAnnualRate"]
    advisory_rate = rates["advisoryAnnualRate"]
    rebate_zar = zar_aum * rebate_rate / 12
    advisory_zar = zar_aum * advisory_rate / 12
    return {
        "rebate": {
            "annualRate": rebate_rate,
            "nativeFees": {"ZAR": rebate_zar},
            "zarFee": rebate_zar,
        },
        "advisory": {
            "annualRate": advisory_rate,
            "nativeFees": {"ZAR": advisory_zar},
            "zarFee": advisory_zar,
        },
        "total": {
            "nativeFees": {"ZAR": rebate_zar + advisory_zar},
            "zarFee": rebate_zar + advisory_zar,
        },
    }


def parse_march(wb, jan_lookup, by_provider_names):
    ws = wb["March"]
    clients = {}
    unmatched = []

    for row in ws.iter_rows(min_row=2, values_only=True):
        client_raw = str(row[0] or "").strip()
        investment = str(row[5] or "").strip()
        provider_raw = str(row[7] or "").strip()
        nav = row[8]

        if not client_raw or not investment or not provider_raw or nav is None:
            continue

        nav = float(nav)
        provider_id, provider_name = to_provider(provider_raw, investment)

        # Resolve account code / identity by matching against Jan data
        exact_key = (provider_id, normalize(client_raw))
        info = jan_lookup.get(exact_key)
        if info is None:
            # Check manual overrides first
            override_name = CLIENT_NAME_OVERRIDES.get((normalize(client_raw), provider_id))
            if override_name:
                info = jan_lookup.get((provider_id, normalize(override_name)))
            if info is None:
                existing_names = by_provider_names.get(provider_id, [])
                matched_name = match_name(client_raw, existing_names)
                if matched_name:
                    info = jan_lookup.get((provider_id, normalize(matched_name)))

        if info:
            account_code = info["accountCode"]
            identity_no = info["identityNo"]
            display_name = info["fullName"]
        else:
            account_code = generate_account_code(provider_id, client_raw)
            identity_no = ""
            display_name = client_raw
            unmatched.append((client_raw, provider_id))

        client_id = f"{provider_id}|{account_code}|{display_name}"

        if client_id not in clients:
            clients[client_id] = {
                "id": client_id,
                "client": display_name,
                "accountCode": account_code,
                "identityNo": identity_no,
                "providerId": provider_id,
                "providerName": provider_name,
                "nativeValues": defaultdict(float),
                "zarAum": 0.0,
                "holdingCount": 0,
                "holdings": [],
            }

        c = clients[client_id]
        c["nativeValues"]["ZAR"] += nav
        c["zarAum"] += nav
        c["holdingCount"] += 1
        c["holdings"].append({
            "investment": investment,
            "currency": "ZAR",
            "nativeValue": nav,
            "zarValue": nav,
        })

    if unmatched:
        print(f"  Unmatched clients (generated account codes): {unmatched}")

    client_rows = []
    provider_source_totals = defaultdict(lambda: {"providerName": "", "nativeUsd": 0.0, "zarTotal": 0.0})

    for c in clients.values():
        c["nativeValues"] = dict(sorted(c["nativeValues"].items()))
        c["fees"] = compute_fees(c["zarAum"], c["providerId"])
        provider_source_totals[c["providerId"]]["providerName"] = c["providerName"]
        provider_source_totals[c["providerId"]]["zarTotal"] += c["zarAum"]
        client_rows.append(c)

    source_zar_total = sum(v["zarTotal"] for v in provider_source_totals.values())

    return {
        "id": "mar-2026",
        "label": "Mar 2026",
        "sourceFile": "Roger_Data_Jan_to_March.xlsx",
        "exchangeRates": {"ZAR": 1},
        "sourceNativeTotals": {"ZAR": source_zar_total},
        "sourceZarTotals": {"ZAR": source_zar_total},
        "sourceZarTotal": source_zar_total,
        "providerSourceTotals": dict(provider_source_totals),
        "clients": sorted(client_rows, key=lambda x: (x["providerName"], x["client"], x["accountCode"])),
    }, unmatched


def main():
    # Load existing monthlyClientData.js
    js_content = OUT.read_text(encoding="utf-8")
    fee_rates_match = re.search(r"export const feeRates = (\{.*?\});", js_content, re.DOTALL)
    data_match = re.search(r"export const monthlyClientData = (\[.*?\]);", js_content, re.DOTALL)
    fee_rates_json = fee_rates_match.group(1)
    monthly_data = json.loads(data_match.group(1))

    # Check if March already exists
    if any(m["id"] == "mar-2026" for m in monthly_data):
        print("March 2026 already exists in monthlyClientData.js — replacing it.")
        monthly_data = [m for m in monthly_data if m["id"] != "mar-2026"]

    jan_lookup, by_provider_names = build_jan_lookup(monthly_data)

    wb = openpyxl.load_workbook(EXCEL, data_only=True)
    march_entry, unmatched = parse_march(wb, jan_lookup, by_provider_names)

    print(f"March 2026: {len(march_entry['clients'])} clients, zarTotal={march_entry['sourceZarTotal']:,.2f}")
    print("Provider totals:")
    for pid, pt in sorted(march_entry["providerSourceTotals"].items()):
        print(f"  {pid}: {pt['zarTotal']:,.2f}")

    monthly_data.append(march_entry)

    OUT.write_text(
        "export const feeRates = "
        + fee_rates_json
        + ";\n\nexport const monthlyClientData = "
        + json.dumps(monthly_data, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"\nWritten to {OUT}")


if __name__ == "__main__":
    main()
