import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { configs, apply_historical } = await req.json();
  if (!configs || !Array.isArray(configs)) {
    return Response.json({ error: 'configs array required' }, { status: 400 });
  }

  let totalUpdated = 0;

  for (const cfg of configs) {
    const { account_code, platform, investment_name, rebate_fee_annual_percent, advisory_fee_annual_percent } = cfg;
    const rebate = rebate_fee_annual_percent ?? 0;
    const advisory = advisory_fee_annual_percent ?? 0;

    const rows = await base44.asServiceRole.entities.PortfolioValuation.filter({ account_code, platform, investment_name });

    for (const row of rows) {
      const origValue = row.original_currency_value ?? row.month_end_market_value ?? 0;
      const zarValue = row.zar_value ?? row.month_end_market_value ?? 0;
      const rebateMonthlyOrig = origValue * (rebate / 100) / 12;
      const advisoryMonthlyOrig = origValue * (advisory / 100) / 12;
      const rebateMonthlyZar = zarValue * (rebate / 100) / 12;
      const advisoryMonthlyZar = zarValue * (advisory / 100) / 12;

      await base44.asServiceRole.entities.PortfolioValuation.update(row.id, {
        rebate_fee_annual_percent: rebate,
        advisory_fee_annual_percent: advisory,
        rebate_fee_monthly_percent: rebate / 12,
        advisory_fee_monthly_percent: advisory / 12,
        rebate_fee_monthly_amount_original_currency: rebateMonthlyOrig,
        advisory_fee_monthly_amount_original_currency: advisoryMonthlyOrig,
        rebate_fee_monthly_amount_zar: rebateMonthlyZar,
        advisory_fee_monthly_amount_zar: advisoryMonthlyZar,
        total_monthly_fee_original_currency: rebateMonthlyOrig + advisoryMonthlyOrig,
        total_monthly_fee_zar: rebateMonthlyZar + advisoryMonthlyZar,
        fee_required: false,
      });
      totalUpdated++;
      await sleep(80); // throttle to avoid rate limits
    }

    // Upsert FeeConfig
    const existing = await base44.asServiceRole.entities.FeeConfig.filter({ account_code, platform, investment_name });
    const configData = { account_code, platform, investment_name, rebate_fee_annual_percent: rebate, advisory_fee_annual_percent: advisory };
    if (existing.length > 0) {
      await base44.asServiceRole.entities.FeeConfig.update(existing[0].id, configData);
    } else {
      await base44.asServiceRole.entities.FeeConfig.create(configData);
    }
    await sleep(100);
  }

  return Response.json({ success: true, totalUpdated });
});