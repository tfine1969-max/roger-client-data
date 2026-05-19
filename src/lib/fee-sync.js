import { base44 } from '@/api/base44Client';
import { feeMappingRows } from '@/data/feeMapping';
import { withCalculatedFees, calcFees } from '@/lib/fee-utils';
import { zarVal, origVal } from '@/lib/valuation-utils';

const BATCH_SIZE = 25;

const FEE_FIELDS = [
  'rebate_fee_annual_percent',
  'advisory_fee_annual_percent',
  'rebate_fee_monthly_percent',
  'advisory_fee_monthly_percent',
  'rebate_fee_monthly_amount_original_currency',
  'advisory_fee_monthly_amount_original_currency',
  'rebate_fee_monthly_amount_zar',
  'advisory_fee_monthly_amount_zar',
  'total_monthly_fee_original_currency',
  'total_monthly_fee_zar',
  'fee_required',
];

function pickFeeFields(enriched) {
  const out = {};
  for (const f of FEE_FIELDS) out[f] = enriched[f] ?? null;
  return out;
}

export async function applySeededFeesToMonth(month, { platforms = null, onProgress } = {}) {
  const PAGE = 20000;
  let rows = await base44.entities.PortfolioValuation.filter({ upload_month: month }, '-created_date', PAGE);

  if (platforms && platforms.length > 0) {
    // Expand shorthand names to all known platform variants stored in the DB
    const PLATFORM_ALIASES = {
      'prime': ['prime', 'prime investments'],
      'julius baer': ['julius baer'],
      'credo': ['credo'],
      'gryphon': ['gryphon', 'gryphon asset management'],
      'northstar': ['northstar', 'northstar fnb', 'northstar sanlam'],
      'peresec': ['peresec', 'peresec securities'],
      'prescient': ['prescient'],
    };
    const platformSet = new Set(
      platforms.flatMap(p => PLATFORM_ALIASES[p.toLowerCase()] ?? [p.toLowerCase()])
    );
    rows = rows.filter(r => platformSet.has(String(r.platform || '').toLowerCase()));
  }

  const feeConfigs = await base44.entities.FeeConfig.list();
  let updated = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async row => {
      const enriched = withCalculatedFees(row, feeMappingRows, feeConfigs);
      const fees = pickFeeFields(enriched);
      await base44.entities.PortfolioValuation.update(row.id, fees);
      updated++;
    }));
    if (onProgress) onProgress(Math.min(i + BATCH_SIZE, rows.length), rows.length);
  }

  return { month, rows: rows.length, updated };
}
