import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Platform filter values as stored in PortfolioValuation
const PLATFORM_FILTERS = {
  'monthly': null,           // all platforms from monthly workbook (non-Prime, non-JB)
  'julius-baer': 'Julius Baer',
  'prime': 'Prime',
  'credo': 'Credo',
  'gryphon': 'Gryphon',
  'northstar': 'Northstar',
  'peresec': 'Peresec',
  'prescient': 'Prescient',
};

const BATCH = 50;

async function deleteAllByQuery(entity, query, base44) {
  let deleted = 0;
  while (true) {
    const records = await base44.asServiceRole.entities[entity].filter(query, '-created_date', BATCH);
    if (!records || records.length === 0) break;
    for (const r of records) {
      await base44.asServiceRole.entities[entity].delete(r.id);
    }
    deleted += records.length;
    if (records.length < BATCH) break;
    await new Promise(r => setTimeout(r, 300));
  }
  return deleted;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider, upload_month } = await req.json();

    if (!provider || !upload_month) {
      return Response.json({ error: 'provider and upload_month are required' }, { status: 400 });
    }

    const platformValue = PLATFORM_FILTERS[provider];
    let pvDeleted = 0;
    let primeDeleted = 0;
    let uploadDeleted = 0;

    // Delete PortfolioValuation records
    if (provider === 'prime') {
      // Prime: delete by platform = 'Prime'
      pvDeleted = await deleteAllByQuery('PortfolioValuation', { upload_month, platform: 'Prime' }, base44);
      // Also delete PrimeHolding records
      primeDeleted = await deleteAllByQuery('PrimeHolding', { upload_month }, base44);
    } else if (provider === 'julius-baer') {
      pvDeleted = await deleteAllByQuery('PortfolioValuation', { upload_month, platform: 'Julius Baer' }, base44);
    } else if (provider === 'monthly') {
      // Monthly workbook: delete all PV records for that month that are NOT Prime or Julius Baer
      // We delete all for the month and let user re-upload
      // Fetch all for month, filter out Prime & JB
      let skip = 0;
      while (true) {
        const records = await base44.asServiceRole.entities.PortfolioValuation.filter(
          { upload_month }, '-created_date', 200
        );
        if (!records || records.length === 0) break;
        const toDelete = records.filter(r => r.platform !== 'Prime' && r.platform !== 'Julius Baer');
        for (const r of toDelete) {
          await base44.asServiceRole.entities.PortfolioValuation.delete(r.id);
          pvDeleted++;
        }
        if (records.length < 200) break;
        await new Promise(r => setTimeout(r, 300));
        skip += 200;
      }
    } else {
      // Named platform
      pvDeleted = await deleteAllByQuery('PortfolioValuation', { upload_month, platform: platformValue }, base44);
    }

    // Delete MonthlyUpload records for this month
    uploadDeleted = await deleteAllByQuery('MonthlyUpload', { upload_month }, base44);

    return Response.json({
      success: true,
      provider,
      upload_month,
      portfolio_valuations_deleted: pvDeleted,
      prime_holdings_deleted: primeDeleted,
      monthly_uploads_deleted: uploadDeleted,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});