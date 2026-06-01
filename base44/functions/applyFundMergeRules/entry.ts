import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BATCH = 10;
const DELAY = 500;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { upload_month, platform } = await req.json().catch(() => ({}));

    // Load all merge rules
    const rules = await base44.asServiceRole.entities.FundMergeRule.list('source_name', 2000);
    if (rules.length === 0) {
      return Response.json({ success: true, updated: 0, message: 'No fund merge rules found.' });
    }

    // Build lookup: source_name (lowercase) -> [{ canonical_name, platform }]
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

    // Load valuations page by page, filtered by month/platform
    const filterQuery = {};
    if (upload_month) filterQuery.upload_month = upload_month;
    if (platform) filterQuery.platform = platform;

    let updated = 0;
    let page = 0;
    const PAGE_SIZE = 200;
    const toUpdate = [];

    while (true) {
      const batch = await base44.asServiceRole.entities.PortfolioValuation.filter(
        filterQuery, '-upload_month', PAGE_SIZE, page * PAGE_SIZE
      );
      if (!batch.length) break;

      for (const row of batch) {
        const rawName = String(row.investment_name || '').trim();
        if (!rawName) continue;
        const key = rawName.toLowerCase();
        const matchingRules = ruleMap[key];
        if (!matchingRules) continue;

        const rowPlatform = String(row.platform || '').toLowerCase();
        const rule =
          matchingRules.find(r => r.platform && r.platform === rowPlatform) ||
          matchingRules.find(r => !r.platform);

        if (!rule || rule.canonical_name === rawName) continue;
        toUpdate.push({ id: row.id, canonical_name: rule.canonical_name, from: rawName });
      }

      if (batch.length < PAGE_SIZE) break;
      page++;
      await new Promise(r => setTimeout(r, 300));
    }

    // Apply updates in small batches with delays
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const chunk = toUpdate.slice(i, i + BATCH);
      await Promise.all(chunk.map(item =>
        base44.asServiceRole.entities.PortfolioValuation.update(item.id, { investment_name: item.canonical_name })
      ));
      updated += chunk.length;
      if (i + BATCH < toUpdate.length) await new Promise(r => setTimeout(r, DELAY));
    }

    return Response.json({
      success: true,
      updated,
      rules_applied: rules.length,
      message: `Applied ${rules.length} rules. Updated ${updated} valuation row${updated !== 1 ? 's' : ''}${upload_month ? ` in ${upload_month}` : ''}.`,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});