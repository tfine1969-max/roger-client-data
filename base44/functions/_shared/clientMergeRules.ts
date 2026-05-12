import { canonicalClientMappings } from './canonicalClientMappings.ts';
import { canonicalFeeFallbackMappings, canonicalFeeMappings } from './canonicalFeeMappings.ts';

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

function compactKey(value: unknown) {
  return normalizeClientText(value).replace(/[^a-z0-9]+/g, '');
}

function titleCaseWord(value: string) {
  if (/^[A-Z]{2,}$/.test(value) && value.length <= 4) return value;
  return value
    .toLowerCase()
    .split(/([-'()])/)
    .map(part => /^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join('');
}

function titleCaseName(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(titleCaseWord)
    .join(' ');
}

function isEntityName(value: unknown) {
  return /\b(pty|ltd|limited|cc|trust|inc|plc|holdings|investments|properties|trading|manufacturers|company|corporation|corp|fund|fof)\b/i.test(String(value || '')) ||
    /^(ltd|limited|cc|inc|plc),?\s+/i.test(String(value || ''));
}

function formatCanonicalClientName(value: unknown) {
  const raw = String(value || '').trim().replace(/\s+/g, ' ');
  if (!raw) return raw;

  if (isEntityName(raw)) {
    const prefix = raw.match(/^(ltd|limited|cc|inc|plc),?\s+/i)?.[1];
    const ordered = prefix ? `${raw.replace(/^(ltd|limited|cc|inc|plc),?\s+/i, '').trim()} ${prefix}` : raw;
    return ordered
      .replace(/\(\s*pty\s*\)/ig, '(PTY)')
      .replace(/\bpty\b/ig, 'PTY')
      .replace(/\bltd\b/ig, 'LTD')
      .replace(/\blimited\b/ig, 'LIMITED')
      .replace(/\bcc\b/ig, 'CC')
      .toUpperCase();
  }

  const stripped = raw
    .replace(/^(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\.?\s+/i, '')
    .replace(/\s+(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\.?$/i, '')
    .trim();

  if (stripped.includes(',')) {
    const [surname, ...rest] = stripped.split(',');
    return [titleCaseName(surname), titleCaseName(rest.join(' ').trim())].filter(Boolean).join(', ');
  }

  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length < 2) return titleCaseName(stripped);
  return `${titleCaseName(words[words.length - 1])}, ${titleCaseName(words.slice(0, -1).join(' '))}`;
}

const providerAccountMappings = new Map<string, string>();
const accountMappings = new Map<string, string>();
const identityNames = new Map<string, Set<string>>();
const identityMappings = new Map<string, string>();
const exactFeeMappings = new Map<string, any>();
const accountFeeFallbacks = new Map<string, any>();

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

for (const mapping of canonicalFeeMappings) {
  const platform = canonicalPlatform(mapping.platform);
  const accountCode = cleanAccountCode(mapping.accountCode);
  const investment = compactKey(mapping.investmentName);
  if (platform && accountCode && investment) exactFeeMappings.set(`${platform}||${accountCode}||${investment}`, mapping);
}

for (const mapping of canonicalFeeFallbackMappings) {
  const platform = canonicalPlatform(mapping.platform);
  const accountCode = cleanAccountCode(mapping.accountCode);
  if (platform && accountCode) accountFeeFallbacks.set(`${platform}||${accountCode}`, mapping);
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
  return { ...row, portfolio_name: formatCanonicalClientName(canonicalName) };
}

function monthlyFeeAmounts(row: Record<string, any>, rebateAnnualPercent: number, advisoryAnnualPercent: number) {
  const originalValue = Number(row.original_currency_value ?? row.month_end_market_value ?? 0) || 0;
  const zarValue = Number(row.zar_value ?? row.month_end_market_value ?? 0) || 0;
  const rebateMonthlyPercent = rebateAnnualPercent / 12;
  const advisoryMonthlyPercent = advisoryAnnualPercent / 12;
  const rebateOriginal = originalValue * (rebateAnnualPercent / 100) / 12;
  const advisoryOriginal = originalValue * (advisoryAnnualPercent / 100) / 12;
  const rebateZar = zarValue * (rebateAnnualPercent / 100) / 12;
  const advisoryZar = zarValue * (advisoryAnnualPercent / 100) / 12;

  return {
    rebate_fee_annual_percent: rebateAnnualPercent,
    advisory_fee_annual_percent: advisoryAnnualPercent,
    rebate_fee_monthly_percent: rebateMonthlyPercent,
    advisory_fee_monthly_percent: advisoryMonthlyPercent,
    rebate_fee_monthly_amount_original_currency: rebateOriginal,
    advisory_fee_monthly_amount_original_currency: advisoryOriginal,
    rebate_fee_monthly_amount_zar: rebateZar,
    advisory_fee_monthly_amount_zar: advisoryZar,
    total_monthly_fee_original_currency: rebateOriginal + advisoryOriginal,
    total_monthly_fee_zar: rebateZar + advisoryZar,
    fee_required: false,
  };
}

function applyCanonicalFeeMapping(row: Record<string, any>) {
  const platform = canonicalPlatform(row.platform);
  const accountCode = cleanAccountCode(row.account_code || row.account_number);
  const investment = compactKey(row.investment_name || row.investment);
  if (!platform || !accountCode) return row;

  const feeMapping = (investment ? exactFeeMappings.get(`${platform}||${accountCode}||${investment}`) : null) ||
    accountFeeFallbacks.get(`${platform}||${accountCode}`);

  if (!feeMapping) return row;

  const rebate = Number(feeMapping.rebateAnnualPercent ?? 0);
  const advisory = Number(feeMapping.advisoryAnnualPercent ?? 0);
  return {
    ...row,
    ...monthlyFeeAmounts(row, rebate, advisory),
  };
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

  const mergedRow = match?.mergedName ? { ...canonicalRow, portfolio_name: match.mergedName } : canonicalRow;
  return applyCanonicalFeeMapping(mergedRow);
}
