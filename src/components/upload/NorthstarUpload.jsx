import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle, X, FileText, FolderOpen } from 'lucide-react';
import DeleteMonthData from './DeleteMonthData';
import { DEFAULT_USD_ZAR_RATE, getUsdZarRateForMonth, saveUsdZarRateForMonth } from '@/lib/exchange-rates';
import ProviderUploadSummary from './ProviderUploadSummary';

const BATCH_SIZE = 25;

const cleanText = value => String(value || '').trim();
const normalizeText = value => cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');

const parseAmount = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = cleanText(value);
  const negative = raw.startsWith('(') && raw.endsWith(')');
  const parsed = Number(raw.replace(/[$,\s()]/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
};

const fileNameClient = fileName => {
  const name = cleanText(fileName).replace(/\.pdf$/i, '');
  const match = name.match(/Northstar Monthly Statement\s+.+?-\s+(.+?)\s+-\s+\d{1,2}\s+\w+$/i) ||
    name.match(/Northstar Monthly Statement\s+.+?-\s+(.+)$/i);
  return cleanText(match?.[1]);
};

const displayClientName = name => {
  const cleaned = cleanText(name);
  if (!cleaned) return 'Northstar Client';
  if (cleaned.includes(',')) return cleaned;
  const parts = cleaned.replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, '').split(/\s+/).filter(Boolean);
  if (parts.length < 2) return cleaned;
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
};

const slugAccount = value => {
  const slug = cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return slug ? `NORTHSTAR_${slug}` : 'NORTHSTAR_UNKNOWN';
};

const northstarCurrency = holding => {
  const explicit = cleanText(holding.currency).toUpperCase();
  const evidence = [
    holding.value_label,
    holding.currency_context,
    holding.asset_class,
    holding.holding_name,
  ].map(cleanText).join(' ').toUpperCase();
  if (explicit === 'USD' && /\b(USD|US DOLLAR|DOLLAR)\b/.test(evidence)) return 'USD';
  return 'ZAR';
};

const dedupeHoldings = holdings => {
  const map = new Map();
  holdings.forEach(holding => {
    const value = Math.round(parseAmount(holding.market_value) * 100) / 100;
    const key = `${normalizeText(holding.holding_name)}||${value}`;
    const currency = northstarCurrency(holding);
    const current = { ...holding, currency };
    const existing = map.get(key);
    if (!existing || (currency === 'ZAR' && existing.currency !== 'ZAR')) {
      map.set(key, current);
    }
  });
  return [...map.values()];
};

const extractNorthstarHoldings = async ({ fileUrl, fallbackClient }) => {
  return base44.integrations.Core.InvokeLLM({
    file_urls: [fileUrl],
    prompt: `
Extract portfolio holdings from this Northstar monthly statement PDF.

Read all pages and extract every individual holding/fund line from the portfolio valuation or holdings tables. Do not return summary-only asset-class rows if individual holdings are present.

Currency rules:
- Northstar local statement values are usually ZAR/Rand. Use currency ZAR unless the holding value column explicitly says USD or US Dollar.
- Never convert values. Extract the displayed value exactly and identify its displayed currency.
- If a holding appears twice with the same value, once as USD and once as ZAR, return only the ZAR row.

Statement fields:
- client_name: investor/client name. If unclear use "${fallbackClient}".
- account_number: account, portfolio, investor, policy, product, or reference number if shown.
- report_date: valuation/report date in YYYY-MM-DD if shown.

For each holding:
- holding_name: full fund/security/instrument name.
- asset_class: section/category if shown.
- currency: ZAR or USD using the currency rules above.
- value_label: the exact column/header text where market_value came from, for example "Market Value ZAR" or "Current Value".
- currency_context: any nearby currency text/symbol from the row or table.
- units: units/shares/quantity if shown.
- unit_price: price/NAV if shown.
- market_value: numeric value exactly as displayed.

Return JSON exactly:
{
  "client_name": string,
  "account_number": string,
  "report_date": string,
  "holdings": [
    {
      "holding_name": string,
      "asset_class": string,
      "currency": string,
      "value_label": string,
      "currency_context": string,
      "units": number or null,
      "unit_price": number or null,
      "market_value": number
    }
  ]
}
`,
    response_json_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string' },
        account_number: { type: 'string' },
        report_date: { type: 'string' },
        holdings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              holding_name: { type: 'string' },
              asset_class: { type: 'string' },
              currency: { type: 'string' },
              value_label: { type: 'string' },
              currency_context: { type: 'string' },
              units: { type: ['number', 'null'] },
              unit_price: { type: ['number', 'null'] },
              market_value: { type: 'number' },
            },
          },
        },
      },
    },
  });
};

export default function NorthstarUpload({ onImported }) {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState('');
  const [rate, setRate] = useState(DEFAULT_USD_ZAR_RATE);
  const [replace, setReplace] = useState(false);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState(null);
  const folderRef = useRef(null);
  const fileRef = useRef(null);

  const handleMonthChange = (value) => {
    setMonth(value);
    setRate(getUsdZarRateForMonth(value));
  };

  const handleRateChange = (value) => {
    setRate(value);
    saveUsdZarRateForMonth(month, value);
  };

  const addFiles = (incoming) => {
    const pdfs = Array.from(incoming || []).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.webkitRelativePath || f.name));
      return [...prev, ...pdfs.filter(f => !existing.has(f.webkitRelativePath || f.name))];
    });
    setResults([]);
    setStatus(null);
  };

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

  const deleteExistingRows = async ({ uploadMonth, replaceAll, clientName, rawClientName, accountCode }) => {
    const rows = await base44.entities.PortfolioValuation.list('-created_date', 5000);
    const clientNames = new Set([normalizeText(clientName), normalizeText(rawClientName)].filter(Boolean));
    const accountCodes = new Set([cleanText(accountCode)].filter(Boolean));
    const stale = rows.filter(row => {
      if (row.upload_month !== uploadMonth) return false;
      if (replaceAll && row.platform === 'Northstar') return true;
      if (row.platform !== 'Credo') return false;
      return clientNames.has(normalizeText(row.portfolio_name)) || accountCodes.has(cleanText(row.account_code));
    });
    for (const row of stale) {
      await base44.entities.PortfolioValuation.delete(row.id);
    }
  };

  const createRows = async rows => {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(row => base44.entities.PortfolioValuation.create(row)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length || !month || !rate) return;
    setStatus('uploading');
    setResults([]);

    const exchangeRate = parseFloat(rate);

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const resultEntry = { name: file.name, status: 'uploading', message: '' };
      setResults(prev => [...prev.filter(r => r.name !== file.name), { ...resultEntry }]);

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const fallbackClient = fileNameClient(file.name);
        const extracted = await extractNorthstarHoldings({ fileUrl: file_url, fallbackClient });
        const holdings = dedupeHoldings((extracted.holdings || []).filter(h => cleanText(h.holding_name) && parseAmount(h.market_value) !== 0));
        if (holdings.length === 0) throw new Error('No Northstar holdings extracted from PDF.');

        const clientName = displayClientName(extracted.client_name || fallbackClient);
        const accountCode = cleanText(extracted.account_number) || slugAccount(clientName);

        await deleteExistingRows({
          uploadMonth: month,
          replaceAll: replace && i === 0,
          clientName,
          rawClientName: fallbackClient,
          accountCode,
        });

        const valuationRows = holdings.map(holding => {
          const currency = northstarCurrency(holding);
          const originalValue = parseAmount(holding.market_value);
          const fxRate = currency === 'ZAR' ? 1 : exchangeRate;
          return {
            upload_month: month,
            account_code: accountCode,
            portfolio_name: clientName,
            platform: 'Northstar',
            investment_name: cleanText(holding.holding_name) || cleanText(holding.asset_class) || 'Northstar Holding',
            currency,
            original_currency_value: originalValue,
            month_end_market_value: originalValue,
            exchange_rate_to_zar: fxRate,
            zar_value: originalValue * fxRate,
            exchange_rate_date: cleanText(extracted.report_date) || null,
            exchange_rate_source: currency === 'ZAR' ? 'N/A' : 'Manual Upload Rate',
            conversion_status: currency === 'ZAR' ? 'ZAR Base Currency' : 'Converted',
            number_of_units: holding.units ?? null,
            month_end_unit_price: holding.unit_price ?? null,
            has_missing_account_code: !accountCode,
            has_missing_identity_no: true,
            has_missing_market_value: originalValue === 0,
            is_duplicate: false,
            is_flagged: originalValue === 0,
          };
        });

        await createRows(valuationRows);

        await base44.entities.MonthlyUpload.create({
          upload_month: month,
          file_name: file.name,
          upload_date: new Date().toISOString(),
          total_rows: valuationRows.length,
          rows_imported: valuationRows.length,
          rows_skipped: 0,
          import_status: 'Imported',
          notes: `Northstar browser import. Client: ${clientName}. Account: ${accountCode}.`,
        });

        const usdTotal = valuationRows.filter(r => r.currency === 'USD').reduce((sum, row) => sum + row.original_currency_value, 0);
        const zarTotal = valuationRows.reduce((sum, row) => sum + row.zar_value, 0);

        const entry = {
          name: file.name,
          status: 'success',
          message: `${valuationRows.length} holdings imported`,
          client_name: clientName,
          account_code: accountCode,
          usd_total: usdTotal,
          zar_total: zarTotal,
        };
        setResults(prev => [...prev.filter(r => r.name !== file.name), entry]);
      } catch (err) {
        const entry = { name: file.name, status: 'error', message: err.message || 'Failed' };
        setResults(prev => [...prev.filter(r => r.name !== file.name), entry]);
      }
    }

    setStatus('done');
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
    if (onImported) await onImported(month);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Upload Northstar monthly statement PDFs. The importer extracts every holding, stores the USD value, and converts it to ZAR for AUM using the exchange rate below.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,1fr)_220px_280px]">
          <div className="space-y-1.5">
            <Label>Upload Month</Label>
            <Input type="month" value={month} onChange={e => handleMonthChange(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Universal USD → ZAR Rate</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={rate}
                onChange={e => handleRateChange(e.target.value)}
                required
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">ZAR / USD</span>
            </div>
            <p className="text-xs text-muted-foreground">Used for all USD uploads in the selected month unless changed here.</p>
          </div>
          <ProviderUploadSummary provider="Northstar" uploadMonth={month} />
        </div>

        <div className="space-y-2">
          <Label>Northstar Statement PDFs</Label>
          <div className="flex gap-2 flex-wrap">
            <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
              <FileText className="w-4 h-4" /> Add PDF(s)
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={() => folderRef.current?.click()}>
              <FolderOpen className="w-4 h-4" /> Add Folder
            </Button>
            <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
            <input ref={folderRef} type="file" accept=".pdf" multiple webkitdirectory="" className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>
        </div>

        {files.length > 0 && (
          <div className="rounded-lg border divide-y text-sm">
            {files.map(f => {
              const res = results.find(r => r.name === f.name);
              return (
                <div key={f.name} className="flex items-center gap-3 px-4 py-2.5">
                  <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-foreground">{f.name}</span>
                  {res?.status === 'uploading' && <span className="text-xs text-muted-foreground animate-pulse">Processing...</span>}
                  {res?.status === 'success' && (
                    <span className="text-xs text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {res.message}
                    </span>
                  )}
                  {res?.status === 'error' && (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {res.message}
                    </span>
                  )}
                  {!res && (
                    <button type="button" onClick={() => removeFile(f.name)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} className="rounded border-border" />
          <span>Replace existing Northstar data for this month</span>
        </label>

        <Button type="submit" disabled={!files.length || !month || !rate || status === 'uploading'} className="w-full gap-2">
          <UploadIcon className="w-4 h-4" />
          {status === 'uploading'
            ? `Processing ${results.length} / ${files.length}...`
            : `Upload & Import ${files.length > 0 ? `(${files.length} PDF${files.length > 1 ? 's' : ''})` : 'PDFs'}`}
        </Button>

        {status === 'done' && (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-sm rounded p-3 border ${errorCount === 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successCount} of {files.length} PDF{files.length > 1 ? 's' : ''} imported successfully{errorCount > 0 ? `, ${errorCount} failed` : ''}.
            </div>

            {results.filter(r => r.status === 'success').map((r, i) => (
              <div key={i} className="text-xs bg-muted/40 border rounded p-3 space-y-0.5">
                <p className="font-semibold text-foreground">{r.client_name || r.name}</p>
                {r.account_code && <p><span className="text-muted-foreground">Account:</span> {r.account_code}</p>}
                <p>
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-medium text-foreground">
                    USD {r.usd_total?.toLocaleString(undefined, { maximumFractionDigits: 2 })} → ZAR {Math.round(r.zar_total || 0).toLocaleString()}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </form>
      <DeleteMonthData provider="northstar" />
    </div>
  );
}
