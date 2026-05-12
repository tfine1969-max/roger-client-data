export function normalizeClientText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|dr|prof)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function compactParts(value: unknown) {
  return String(value || '')
    .split('|')
    .map(part => part.trim())
    .filter(Boolean);
}

function cleanIdentity(value: unknown) {
  return String(value || '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
}

export async function loadClientMergeRules(base44: any) {
  try {
    const rules = await base44.asServiceRole.entities.ClientMergeRule.list('-created_date', 1000);
    return (rules || []).map((rule: any) => ({
      mergedName: rule.merged_name,
      accountCodes: new Set(compactParts(rule.account_codes).map(code => code.toLowerCase())),
      identities: new Set(compactParts(rule.identity_numbers).map(cleanIdentity)),
      names: new Set(compactParts(rule.source_names).map(normalizeClientText)),
    }));
  } catch (_error) {
    return [];
  }
}

export function applyClientMergeRules(row: Record<string, any>, rules: any[] = []) {
  const accountCode = String(row.account_code || row.account_number || '').trim().toLowerCase();
  const identity = cleanIdentity(row.identity_no);
  const name = normalizeClientText(row.portfolio_name || row.investor || row.client_name);

  const match = rules.find(rule =>
    (accountCode && rule.accountCodes.has(accountCode)) ||
    (identity && rule.identities.has(identity)) ||
    (name && rule.names.has(name))
  );

  if (!match?.mergedName) return row;
  return { ...row, portfolio_name: match.mergedName };
}
