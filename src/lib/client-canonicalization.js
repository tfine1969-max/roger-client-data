import { base44 } from '@/api/base44Client';
import { formatClientName, normalizeClientText } from '@/lib/client-utils';

export const CLIENT_BLUEPRINT_MONTH = '2026-04';

const BATCH_SIZE = 20;

const clean = value => String(value ?? '').trim();
const compact = value => normalizeClientText(value).replace(/[^a-z0-9]+/g, '');
const cleanAccount = value => clean(value).toLowerCase();
const cleanIdentity = value => clean(value).replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();

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

function matchCanonicalName(row, blueprint) {
  return blueprint.byAccount.get(cleanAccount(row.account_code))
    || blueprint.byIdentity.get(cleanIdentity(row.identity_no))
    || blueprint.byName.get(compact(row.portfolio_name))
    || blueprint.byName.get(compact(formatClientName(row.portfolio_name)))
    || '';
}

async function updateRows(rows) {
  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(({ id, portfolio_name }) =>
      base44.entities.PortfolioValuation.update(id, { portfolio_name })
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
  const provider = clean(options.provider).toLowerCase();

  const changes = (targetRows || [])
    .filter(row => !provider || clean(row.platform).toLowerCase() === provider)
    .map(row => {
      const nextName = matchCanonicalName(row, blueprint);
      return nextName && nextName !== clean(row.portfolio_name)
        ? { id: row.id, portfolio_name: nextName }
        : null;
    })
    .filter(Boolean);

  const updated = await updateRows(changes);
  return { updated, matched: changes.length, skipped: false };
}
