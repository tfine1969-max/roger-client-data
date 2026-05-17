import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Scans all current PortfolioValuation records and derives FundMergeRules
 * by looking at which investment_names have been changed across different
 * upload months (i.e. same platform+client has different fund names over time
 * that have already been manually merged).
 *
 * More importantly: this reads the CURRENT state of all valuations, extracts
 * all distinct investment_name values, and creates rules for any name that
 * looks like it was already merged (i.e. the same canonical name appears
 * across rows that came from different source names on the same platform).
 *
 * Simpler approach: accept a list of { source_name, canonical_name, platform }
 * directly from the frontend so the user can confirm/seed from the Funds page.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { rules } = await req.json();

    if (!Array.isArray(rules) || rules.length === 0) {
      return Response.json({ error: 'No rules provided' }, { status: 400 });
    }

    // Load existing rules to avoid duplicates
    const existing = await base44.asServiceRole.entities.FundMergeRule.list('source_name', 1000);
    const existingKeys = new Set(
      existing.map(r => `${(r.source_name || '').toLowerCase().trim()}||${(r.platform || '').toLowerCase().trim()}`)
    );

    const toCreate = [];
    const skipped = [];

    for (const rule of rules) {
      const sourceName = String(rule.source_name || '').trim();
      const canonicalName = String(rule.canonical_name || '').trim();
      const platform = String(rule.platform || '').trim();

      if (!sourceName || !canonicalName || sourceName === canonicalName) {
        skipped.push({ rule, reason: 'source equals canonical or missing fields' });
        continue;
      }

      const key = `${sourceName.toLowerCase()}||${platform.toLowerCase()}`;
      if (existingKeys.has(key)) {
        skipped.push({ rule, reason: 'already exists' });
        continue;
      }

      toCreate.push({ source_name: sourceName, canonical_name: canonicalName, platform });
      existingKeys.add(key);
    }

    let created = 0;
    for (const rule of toCreate) {
      await base44.asServiceRole.entities.FundMergeRule.create(rule);
      created++;
    }

    return Response.json({
      success: true,
      created,
      skipped: skipped.length,
      message: `Saved ${created} fund merge rule${created !== 1 ? 's' : ''}. Skipped ${skipped.length} (duplicates or invalid).`,
      skipped_details: skipped,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});