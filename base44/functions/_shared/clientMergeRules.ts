import { canonicalClientMappings } from './canonicalClientMappings.ts';

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

function cleanAccountCode(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function canonicalPlatform(value: unknown) {
  return normalizeClientText(value).replace(/asset management|investments|securities/g, '').trim();
}

const providerAccountMappings = new Map<string, string>();
const accountMappings = new Map<string, string>();
const identityNames = new Map<string, Set<string>>();
const identityMappings = new Map<string, string>();

for (const mapping of canonicalClientMappings) {
  const name = mapping.portfolioName;
  const accountCode = cleanAccountCode(mapping.accountCode);
  const platform = canonicalPlatform(mapping.platform);
  const identity = cleanIdentity(mapping.identityNo);

  if (accountCode && platform && name) providerAccountMappings.set(`${platform}||${accountCode}`, name);
  if (accountCode && name && !accountMappings.has(accountCode)) accountMappings.set(accountCode, name);
  if (identity && name) {
    if (!identityNames.has(identity)) identityNames.set(identity, new Set());
    identityNames.get(identity)?.add(name);
  }
}

for (const [identity, names] of identityNames.entries()) {
  const [name] = [...names];
  if (names.size === 1 && name) identityMappings.set(identity, name);
}

function applyCanonicalClientMapping(row: Record<string, any>) {
  const accountCode = cleanAccountCode(row.account_code || row.account_number);
  const identity = cleanIdentity(row.identity_no);
  const platform = canonicalPlatform(row.platform);

  const canonicalName =
    (platform && accountCode ? providerAccountMappings.get(`${platform}||${accountCode}`) : null) ||
    (accountCode ? accountMappings.get(accountCode) : null) ||
    (identity ? identityMappings.get(identity) : null);

  if (!canonicalName) return row;
  return { ...row, portfolio_name: canonicalName };
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
  const canonicalRow = applyCanonicalClientMapping(row);
  const accountCode = cleanAccountCode(canonicalRow.account_code || canonicalRow.account_number);
  const identity = cleanIdentity(canonicalRow.identity_no);
  const name = normalizeClientText(canonicalRow.portfolio_name || canonicalRow.investor || canonicalRow.client_name);

  const match = rules.find(rule =>
    (accountCode && rule.accountCodes.has(accountCode)) ||
    (identity && rule.identities.has(identity)) ||
    (name && rule.names.has(name))
  );

  if (!match?.mergedName) return canonicalRow;
  return { ...canonicalRow, portfolio_name: match.mergedName };
}
