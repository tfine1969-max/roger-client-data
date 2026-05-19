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

// Keywords used to match MonthlyUpload records to a provider (file_name + notes)
const PROVIDER_ALIASES: Record<string, string[]> = {
  'julius-baer': ['julius baer', 'julius'],
  'prime':       ['prime', 'prime investments'],
  'monthly':     ['monthly workbook', 'sheets imported', 'roger source'],
  'credo':       ['credo'],
  'gryphon':     ['gryphon'],
  'northstar':   ['northstar'],
  'peresec':     ['peresec'],
  'prescient':   ['prescient'],
};

function uploadMatchesProvider(upload: { file_name?: string; notes?: string }, provider: string): boolean {
  const haystack = `${upload.file_name || ''} ${upload.notes || ''}`.toLowerCase();
  const aliases = PROVIDER_ALIASES[provider] ?? [provider.toLowerCase()];
  return aliases.some(alias => haystack.includes(alias));
}

const BATCH = 50;

async function deleteAllByQuery(entity, query, base44) {
  let deleted = 0;
  while (true) {
    const records = await base44.asServiceRole.entities[entity].filter(query, '-created_date', BATCH);
    if (!records || records.length === 0) break;
    for (const r of records) {
      await base44.asServiceRole.entities[entity].delete(r.id);
      await new Promise(res => setTimeout(res, 150));
    }
    deleted += records.length;
    if (records.length < BATCH) break;
    await new Promise(res => setTimeout(res, 500));
  }
  return deleted;
}

async function deleteMatchingUploads(upload_month: string, provider: string, base44): Promise<number> {
  let deleted = 0;
  // Fetch all MonthlyUpload records for the month in pages and delete only those matching the provider
  while (true) {
    const records = await base44.asServiceRole.entities.MonthlyUpload.filter(
      { upload_month }, '-created_date', 100
    );
    if (!records || records.length === 0) break;
    const toDelete = records.filter(r => uploadMatchesProvider(r, provider));
    for (const r of toDelete) {
      await base44.asServiceRole.entities.MonthlyUpload.delete(r.id);
      deleted++;
      await new Promise(res => setTimeout(res, 150));
    }
    // If all records in this page were non-matching, we've scanned the full result set
    if (records.length < 100) break;
    await new Promise(res => setTimeout(res, 500));
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
      while (true) {
        const records = await base44.asServiceRole.entities.PortfolioValuation.filter(
          { upload_month }, '-created_date', 100
        );
        if (!records || records.length === 0) break;
        const toDelete = records.filter(r => r.platform !== 'Prime' && r.platform !== 'Julius Baer');
        for (const r of toDelete) {
          await base44.asServiceRole.entities.PortfolioValuation.delete(r.id);
          pvDeleted++;
          await new Promise(res => setTimeout(res, 150));
        }
        if (records.length < 100) break;
        await new Promise(res => setTimeout(res, 500));
      }
    } else {
      const platformValue = PLATFORM_FILTERS[provider];
      pvDeleted = await deleteAllByQuery('PortfolioValuation', { upload_month, platform: platformValue }, base44);
    }

    // Delete only MonthlyUpload records that belong to this provider
    uploadDeleted = await deleteMatchingUploads(upload_month, provider, base44);

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