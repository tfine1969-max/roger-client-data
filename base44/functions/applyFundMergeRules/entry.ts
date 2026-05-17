import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Applies all saved FundMergeRules to PortfolioValuation records.
 * Can be scoped to a specific upload_month (e.g. after a new import)
 * or run across all months if no month is specified.
 *
 * Called automatically after each provider import, or manually from the Funds page.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { upload_month } = await req.json().catch(() => ({}));

    // Load all merge rules
    const rules = await base44.asServiceRole.entities.FundMergeRule.list('source_name', 1000);
    if (rules.length === 0) {
      return Response.json({ success: true, updated: 0, message: 'No fund merge rules found.' });
    }

    // Build lookup: source_name (lowercase) -> { canonical_name, platform (optional) }
    const ruleMap = {};
    for (const rule of rules) {
      const key = String(rule.source_name || '').toLowerCase().trim();
      if (!key) continue;
      if (!ruleMap[key]) ruleMap[key] = [];
      ruleMap[key].push({
        canonical_name: String(rule.canonical_name || '').trim(),
        platform: String(rule.platform || '').trim().toLowerCase(),
      });
    }

    // Load valuations (scoped to month if provided)
    const allValuations = await base44.asServiceRole.entities.PortfolioValuation.list('-upload_month', 5000);
    const valuations = upload_month
      ? allValuations.filter(v => v.upload_month === upload_month)
      : allValuations;

    let updated = 0;
    const changes = [];

    for (const row of valuations) {
      const rawName = String(row.investment_name || '').trim();
      if (!rawName) continue;

      const key = rawName.toLowerCase();
      const matchingRules = ruleMap[key];
      if (!matchingRules) continue;

      // Find the most specific matching rule (platform-specific > any platform)
      const rowPlatform = String(row.platform || '').toLowerCase();
      const rule =
        matchingRules.find(r => r.platform && r.platform === rowPlatform) ||
        matchingRules.find(r => !r.platform);

      if (!rule) continue;
      if (rule.canonical_name === rawName) continue; // already correct

      await base44.asServiceRole.entities.PortfolioValuation.update(row.id, {
        investment_name: rule.canonical_name,
      });
      updated++;
      changes.push({ id: row.id, from: rawName, to: rule.canonical_name });

      if (updated % 20 === 0) await new Promise(res => setTimeout(res, 200));
    }

    return Response.json({
      success: true,
      updated,
      rules_applied: rules.length,
      message: `Applied ${rules.length} rule${rules.length !== 1 ? 's' : ''}. Updated ${updated} valuation row${updated !== 1 ? 's' : ''}${upload_month ? ` in ${upload_month}` : ' across all months'}.`,
      changes: changes.slice(0, 50), // sample for logging
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});