import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BATCH = 50;

async function bulkCreateValuations(base44, records, replaceExisting, uploadMonth) {
  if (replaceExisting && records.length > 0) {
    let deleted = 0;
    while (true) {
      const toDelete = await base44.asServiceRole.entities.PortfolioValuation.filter(
        { upload_month: uploadMonth, platform: 'Credo' }, '-created_date', BATCH
      );
      if (!toDelete || toDelete.length === 0) break;
      for (const r of toDelete) {
        await base44.asServiceRole.entities.PortfolioValuation.delete(r.id);
        deleted++;
        await new Promise(res => setTimeout(res, 100));
      }
      if (toDelete.length < BATCH) break;
    }
  }

  let created = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await base44.asServiceRole.entities.PortfolioValuation.bulkCreate(batch);
    created += batch.length;
    if (i + BATCH < records.length) {
      await new Promise(res => setTimeout(res, 300));
    }
  }
  return created;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, upload_month, exchange_rate } = await req.json();
    if (!file_url || !upload_month || !exchange_rate) {
      return Response.json({ error: 'file_url, upload_month, and exchange_rate required' }, { status: 400 });
    }

    // Extract PDF content via LLM
    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract from this Credo valuation PDF the client name, account number, and all security holdings.
      
For each holding, extract:
- quantity (numeric)
- security_name (string)
- unit_cost (numeric)
- market_value_usd (numeric - the value in reporting currency USD)

Return as JSON: {
  "client_name": "string",
  "account_number": "string",
  "holdings": [
    {"quantity": number, "security_name": "string", "unit_cost": number, "market_value_usd": number}
  ]
}

Include ALL holdings from all currency sections. If a field is missing or 0, include it as-is.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          client_name: { type: 'string' },
          account_number: { type: 'string' },
          holdings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                quantity: { type: 'number' },
                security_name: { type: 'string' },
                unit_cost: { type: 'number' },
                market_value_usd: { type: 'number' },
              },
            },
          },
        },
      },
    });

    const { client_name, account_number, holdings } = extracted;

    if (!holdings || holdings.length === 0) {
      return Response.json({ error: 'No holdings extracted from PDF' }, { status: 400 });
    }

    const valuations = holdings.map(h => ({
      upload_month,
      account_code: account_number || 'UNKNOWN',
      portfolio_name: client_name || 'Credo Client',
      platform: 'Credo',
      investment_name: h.security_name || 'Unknown Security',
      currency: 'USD',
      original_currency_value: h.market_value_usd,
      exchange_rate_to_zar: exchange_rate,
      zar_value: (h.market_value_usd || 0) * exchange_rate,
      exchange_rate_date: null,
      exchange_rate_source: 'Manual',
      conversion_status: 'Converted',
      number_of_units: h.quantity,
      month_end_unit_price: h.unit_cost,
    }));

    const created = await bulkCreateValuations(base44, valuations, true, upload_month);

    return Response.json({
      success: true,
      rows_imported: created,
      client_name,
      account_number,
      upload_month,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});