import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Scans all PortfolioValuation records and detects potential fund merge rules
 * by finding cases where the same (platform, account_code) has different
 * investment_names across different upload months.
 *
 * The most recent month's name is treated as the canonical name.
 * Returns detected rules WITHOUT saving them — caller (frontend) reviews and
 * calls seedFundMergeRules to save.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { auto_save = false } = await req.json().catch(() => ({}));

    const valuations = await base44.asServiceRole.entities.PortfolioValuation.list('-upload_month', 5000);

    // Group by (platform, account_code) → map investment_name → Set<upload_month>
    const holdingHistory = {};
    for (const row of valuations) {
      const platform = String(row.platform || '').trim();
      const account = String(row.account_code || row.portfolio_name || '').trim();
      const fundName = String(row.investment_name || '').trim();
      const month = String(row.upload_month || '').trim();
      if (!platform || !fundName || !month) continue;

      const hKey = `${platform}||${account}`;
      if (!holdingHistory[hKey]) holdingHistory[hKey] = {};
      if (!holdingHistory[hKey][fundName]) holdingHistory[hKey][fundName] = { months: new Set(), platform };
      holdingHistory[hKey][fundName].months.add(month);
    }

    // Sort all months descending to find most recent
    const allMonths = [...new Set(valuations.map(v => v.upload_month).filter(Boolean))].sort().reverse();

    // For each holding group with multiple names, find canonical (most recent month's name)
    const ruleMap = {};
    for (const [, nameMap] of Object.entries(holdingHistory)) {
      const namesArr = Object.keys(nameMap);
      if (namesArr.length < 2) continue;

      let canonicalName = null;
      for (const month of allMonths) {
        const name = namesArr.find(n => nameMap[n].months.has(month));
        if (name) { canonicalName = name; break; }
      }
      if (!canonicalName) continue;

      const platform = Object.values(nameMap)[0].platform;

      for (const name of namesArr) {
        if (name === canonicalName) continue;
        const key = `${name.toLowerCase()}||${platform.toLowerCase()}`;
        if (!ruleMap[key]) {
          ruleMap[key] = { source_name: name, canonical_name: canonicalName, platform };
        }
      }
    }

    const detected = Object.values(ruleMap);

    if (!auto_save || detected.length === 0) {
      return Response.json({ success: true, detected, count: detected.length });
    }

    // Load existing rules to avoid duplicates
    const existing = await base44.asServiceRole.entities.FundMergeRule.list('source_name', 1000);
    const existingKeys = new Set(
      existing.map(r => `${String(r.source_name || '').toLowerCase().trim()}||${String(r.platform || '').toLowerCase().trim()}`)
    );

    let created = 0;
    const skipped = [];
    for (const rule of detected) {
      const key = `${rule.source_name.toLowerCase()}||${rule.platform.toLowerCase()}`;
      if (existingKeys.has(key)) { skipped.push(rule); continue; }
      await base44.asServiceRole.entities.FundMergeRule.create(rule);
      existingKeys.add(key);
      created++;
      if (created % 10 === 0) await new Promise(res => setTimeout(res, 100));
    }

    return Response.json({
      success: true,
      detected: detected.length,
      created,
      skipped: skipped.length,
      message: `Detected ${detected.length} rules. Saved ${created} new rules. Skipped ${skipped.length} duplicates.`,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});