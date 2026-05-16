import { base44 } from '@/api/base44Client';
import { feeMappingRows } from '@/data/feeMapping';
import { formatClientName, normalizeClientText } from '@/lib/client-utils';

export const CLIENT_BLUEPRINT_MONTH = '2026-04';

const BATCH_SIZE = 20;

const clean = value => String(value ?? '').trim();
const compact = value => normalizeClientText(value).replace(/[^a-z0-9]+/g, '');
const sortedClientKey = value => normalizeClientText(value)
  .split(' ')
  .filter(Boolean)
  .sort()
  .join('');
const cleanAccount = value => clean(value).toLowerCase();
const cleanIdentity = value => clean(value).replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
const cleanPlatform = value => normalizeClientText(value).replace(/\b(asset management|investments|securities)\b/g, '').trim();
const feeNumber = value => {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const addToMap = (map, key, value) => {
  if (key && value && !map.has(key)) map.set(key, value);
};

function canonicalName(row) {
  return clean(row?.portfolio_name) || '';
}

function buildBlueprint(rows) {
  const byAccount = new Map();
  const byIdentity = new Map();
  const byName = new Map();

  rows.forEach(row => {
    const name = canonicalName(row);
    if (!name) return;

    addToMap(byAccount, cleanAccount(row.account_code), name);
    addToMap(byIdentity, cleanIdentity(row.identity_no), name);
    addToMap(byName, compact(name), name);
    addToMap(byName, compact(formatClientName(name)), name);
  });

  return { byAccount, byIdentity, byName };
}

function addVote(map, key, value) {
  if (!key || value == null) return;
  if (!map.has(key)) map.set(key, new Map());
  const votes = map.get(key);
  const voteKey = Number(value).toFixed(6);
  votes.set(voteKey, (votes.get(voteKey) || 0) + 1);
}

function voteWinner(votes) {
  if (!votes) return null;
  const [winner] = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  return winner ? Number(winner[0]) : null;
}

function rowPlatform(row) {
  return row.platform ?? row.provider ?? row.sourceProvider;
}

function rowInvestment(row) {
  return row.investment_name ?? row.investmentKey ?? row.investment;
}

function rowClientName(row) {
  return row.portfolio_name ?? row.client;
}

function rowRebate(row) {
  return row.rebate_fee_annual_percent ?? row.rebateAnnualPercent;
}

function rowAdvisory(row) {
  return row.advisory_fee_annual_percent ?? row.advisoryAnnualPercent;
}

function buildFeeBlueprint(rows, fallbackRows = []) {
  const rebateByPlatformFundVotes = new Map();
  const rebateByFundVotes = new Map();
  const rebateByPlatformNameFundVotes = new Map();
  const rebateByPlatformNameVotes = new Map();
  const advisoryByPlatformAccountVotes = new Map();
  const advisoryByPlatformIdentityVotes = new Map();
  const advisoryByPlatformNameVotes = new Map();
  const advisoryByPlatformSortedNameVotes = new Map();

  [...rows, ...fallbackRows].forEach(row => {
    const platform = cleanPlatform(rowPlatform(row));
    const investment = compact(rowInvestment(row));
    const account = cleanAccount(row.account_code);
    const identity = cleanIdentity(row.identity_no);
    const name = compact(rowClientName(row));
    const rebate = feeNumber(rowRebate(row));
    const advisory = feeNumber(rowAdvisory(row));

    addVote(rebateByPlatformFundVotes, `${platform}||${investment}`, rebate);
    addVote(rebateByFundVotes, investment, rebate);
    addVote(rebateByPlatformNameFundVotes, `${platform}||${name}||${investment}`, rebate);
    addVote(rebateByPlatformNameVotes, `${platform}||${name}`, rebate);
    addVote(advisoryByPlatformAccountVotes, `${platform}||${account}`, advisory);
    addVote(advisoryByPlatformIdentityVotes, `${platform}||${identity}`, advisory);
    addVote(advisoryByPlatformNameVotes, `${platform}||${name}`, advisory);
    addVote(advisoryByPlatformSortedNameVotes, `${platform}||${sortedClientKey(rowClientName(row))}`, advisory);
  });

  const toWinnerMap = votesMap => new Map([...votesMap.entries()].map(([key, votes]) => [key, voteWinner(votes)]));
  return {
    rebateByPlatformFund: toWinnerMap(rebateByPlatformFundVotes),
    rebateByFund: toWinnerMap(rebateByFundVotes),
    rebateByPlatformNameFund: toWinnerMap(rebateByPlatformNameFundVotes),
    rebateByPlatformName: toWinnerMap(rebateByPlatformNameVotes),
    advisoryByPlatformAccount: toWinnerMap(advisoryByPlatformAccountVotes),
    advisoryByPlatformIdentity: toWinnerMap(advisoryByPlatformIdentityVotes),
    advisoryByPlatformName: toWinnerMap(advisoryByPlatformNameVotes),
    advisoryByPlatformSortedName: toWinnerMap(advisoryByPlatformSortedNameVotes),
  };
}

function matchCanonicalName(row, blueprint) {
  return blueprint.byAccount.get(cleanAccount(row.account_code))
    || blueprint.byIdentity.get(cleanIdentity(row.identity_no))
    || blueprint.byName.get(compact(row.portfolio_name))
    || blueprint.byName.get(compact(formatClientName(row.portfolio_name)))
    || '';
}

function matchFeeRates(row, feeBlueprint) {
  const platform = cleanPlatform(row.platform);
  const investment = compact(row.investment_name);
  const account = cleanAccount(row.account_code);
  const identity = cleanIdentity(row.identity_no);
  const name = compact(row.portfolio_name);
  const sortedName = sortedClientKey(row.portfolio_name);

  const platformFundKey = `${platform}||${investment}`;
  const platformAccountKey = `${platform}||${account}`;
  const platformIdentityKey = `${platform}||${identity}`;
  const platformNameKey = `${platform}||${name}`;
  const platformSortedNameKey = `${platform}||${sortedName}`;
  const platformNameFundKey = `${platform}||${name}||${investment}`;
  const rebate = feeBlueprint.rebateByPlatformFund.get(platformFundKey)
    ?? feeBlueprint.rebateByPlatformNameFund.get(platformNameFundKey)
    ?? feeBlueprint.rebateByFund.get(investment)
    ?? feeBlueprint.rebateByPlatformName.get(platformNameKey);

  const advisory = feeBlueprint.advisoryByPlatformAccount.get(platformAccountKey)
    ?? feeBlueprint.advisoryByPlatformIdentity.get(platformIdentityKey)
    ?? feeBlueprint.advisoryByPlatformName.get(platformNameKey)
    ?? feeBlueprint.advisoryByPlatformSortedName.get(platformSortedNameKey);

  return {
    rebate,
    advisory,
    rebateMatched: rebate != null,
    advisoryMatched: advisory != null,
  };
}

function feeFields(row, rebate, advisory, feeRequired = false) {
  const originalValue = Number(row.original_currency_value ?? row.month_end_market_value ?? 0) || 0;
  const zarValue = Number(row.zar_value ?? row.month_end_market_value ?? 0) || 0;
  const rebateOrig = originalValue * (rebate / 100) / 12;
  const advisoryOrig = originalValue * (advisory / 100) / 12;
  const rebateZar = zarValue * (rebate / 100) / 12;
  const advisoryZar = zarValue * (advisory / 100) / 12;

  return {
    rebate_fee_annual_percent: rebate,
    advisory_fee_annual_percent: advisory,
    rebate_fee_monthly_percent: rebate / 12,
    advisory_fee_monthly_percent: advisory / 12,
    rebate_fee_monthly_amount_original_currency: rebateOrig,
    advisory_fee_monthly_amount_original_currency: advisoryOrig,
    rebate_fee_monthly_amount_zar: rebateZar,
    advisory_fee_monthly_amount_zar: advisoryZar,
    total_monthly_fee_original_currency: rebateOrig + advisoryOrig,
    total_monthly_fee_zar: rebateZar + advisoryZar,
    fee_required: feeRequired,
  };
}

async function updateRows(rows) {
  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(({ id, update }) =>
      base44.entities.PortfolioValuation.update(id, update)
    ));
    updated += batch.length;
  }
  return updated;
}

export async function applyClientBlueprint(uploadMonth, options = {}) {
  if (!uploadMonth || uploadMonth <= CLIENT_BLUEPRINT_MONTH) {
    return { updated: 0, matched: 0, skipped: true };
  }

  const [blueprintRows, targetRows] = await Promise.all([
    base44.entities.PortfolioValuation.filter({ upload_month: CLIENT_BLUEPRINT_MONTH }, '-created_date', 5000),
    base44.entities.PortfolioValuation.filter({ upload_month: uploadMonth }, '-created_date', 5000),
  ]);

  const blueprint = buildBlueprint(blueprintRows || []);
  const feeBlueprint = buildFeeBlueprint(blueprintRows || [], feeMappingRows || []);
  const provider = clean(options.provider).toLowerCase();

  const changes = (targetRows || [])
    .filter(row => !provider || clean(row.platform).toLowerCase() === provider)
    .map(row => {
      const nextName = matchCanonicalName(row, blueprint);
      const normalizedRow = nextName ? { ...row, portfolio_name: nextName } : row;
      const currentRebate = feeNumber(row.rebate_fee_annual_percent) ?? 0;
      const currentAdvisory = feeNumber(row.advisory_fee_annual_percent) ?? 0;
      const feeMatch = matchFeeRates(normalizedRow, feeBlueprint);
      const rebate = feeMatch.rebateMatched ? feeMatch.rebate : currentRebate;
      const advisory = feeMatch.advisoryMatched ? feeMatch.advisory : currentAdvisory;
      const feeRequired = !feeMatch.advisoryMatched;
      const update = {
        ...feeFields(normalizedRow, rebate, advisory, feeRequired),
      };
      if (nextName && nextName !== clean(row.portfolio_name)) update.portfolio_name = nextName;

      const nameChanged = update.portfolio_name != null;
      const feeChanged = currentRebate !== rebate || currentAdvisory !== advisory || Boolean(row.fee_required) !== feeRequired;

      return nameChanged || feeChanged ? { id: row.id, update } : null;
    })
    .filter(Boolean);

  const updated = await updateRows(changes);
  return { updated, matched: changes.length, skipped: false };
}
