import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload as UploadIcon, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatMonth } from '@/lib/valuation-utils';
import MonthBadge from '@/components/shared/MonthBadge';

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const m = String(i + 1).padStart(2, '0');
  return `2026-${m}`;
});
// Also add 2025
const ALL_MONTHS = [
  ...Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}`),
  ...MONTHS,
  ...Array.from({ length: 12 }, (_, i) => `2027-${String(i + 1).padStart(2, '0')}`),
];

// Required column headers (normalised)
const REQUIRED_COLS = ['portfolio name', 'account code', 'investment name'];

function normalise(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export default function Upload() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const { data: uploads = [] } = useQuery({
    queryKey: ['monthlyUploads'],
    queryFn: () => base44.entities.MonthlyUpload.list('-upload_month'),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const existingUpload = uploads.find(u => u.upload_month === month);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults(null);
    setError(null);
    setConfirmReplace(false);
  };

  const doImport = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setConfirmReplace(false);

    let uploadRecord = null;
    try {
      // Create upload record
      uploadRecord = await base44.entities.MonthlyUpload.create({
        upload_month: month,
        file_name: file.name,
        upload_date: new Date().toISOString(),
        uploaded_by: user?.email || 'unknown',
        import_status: 'Pending',
      });

      // If replacing, delete existing valuations for this month
      if (existingUpload) {
        const existing = await base44.entities.PortfolioValuation.filter({ upload_month: month });
        for (const r of existing) {
          await base44.entities.PortfolioValuation.delete(r.id);
        }
        await base44.entities.MonthlyUpload.delete(existingUpload.id);
      }

      // Upload and extract
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const ROW_SCHEMA = {
        type: 'object',
        properties: {
          portfolio_id: { type: 'string' },
          account_code: { type: 'string', description: 'Account Code column' },
          identity_no: { type: 'string', description: 'Identity No column' },
          portfolio_name: { type: 'string', description: 'Portfolio Name column' },
          platform: { type: 'string', description: 'Platform column' },
          investment_name: { type: 'string', description: 'Investment Name column' },
          currency: { type: 'string', description: 'Currency column' },
          month_end_market_value: { type: 'number', description: 'Month End Market Value column' },
          number_of_units: { type: 'number', description: 'Number of Units column' },
          month_end_unit_price: { type: 'number', description: 'Month End Unit Price column' },
        }
      };

      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: { type: 'object', properties: { rows: { type: 'array', items: ROW_SCHEMA } } }
      });

      if (extracted.status !== 'success') throw new Error(extracted.details || 'Extraction failed');

      const rows = extracted.output?.rows || [];
      if (rows.length === 0) throw new Error('No rows extracted. Check that your file has the expected column headers.');

      // Data quality checks
      let imported = 0, skipped = 0;
      const seenKeys = new Set();
      const errors = [];

      const batch = [];
      for (const row of rows) {
        if (!row.portfolio_name && !row.investment_name) { skipped++; continue; }

        const key = `${row.account_code}||${row.platform}||${row.investment_name}||${row.currency}||${month}`;
        const isDuplicate = seenKeys.has(key);
        if (!isDuplicate) seenKeys.add(key);

        const flags = {
          has_missing_account_code: !row.account_code,
          has_missing_identity_no: !row.identity_no,
          has_missing_market_value: row.month_end_market_value === null || row.month_end_market_value === undefined,
          is_duplicate: isDuplicate,
        };
        flags.is_flagged = Object.values(flags).some(Boolean);

        batch.push({
          upload_month: month,
          portfolio_id: row.portfolio_id || '',
          account_code: row.account_code || '',
          identity_no: row.identity_no || '',
          portfolio_name: row.portfolio_name || '',
          platform: row.platform || '',
          investment_name: row.investment_name || '',
          currency: row.currency || '',
          month_end_market_value: row.month_end_market_value ?? null,
          number_of_units: row.number_of_units ?? null,
          month_end_unit_price: row.month_end_unit_price ?? null,
          unique_key: key,
          monthly_upload_id: uploadRecord.id,
          ...flags,
        });
        imported++;
      }

      // Bulk create in chunks of 50
      for (let i = 0; i < batch.length; i += 50) {
        await base44.entities.PortfolioValuation.bulkCreate(batch.slice(i, i + 50));
      }

      await base44.entities.MonthlyUpload.update(uploadRecord.id, {
        import_status: 'Imported',
        total_rows: rows.length,
        rows_imported: imported,
        rows_skipped: skipped,
      });

      // Sync Client records
      let clientSync = null;
      try {
        const syncRes = await base44.functions.invoke('syncClientsAfterUpload', { upload_month: month });
        clientSync = syncRes.data;
      } catch (e) {
        console.warn('Client sync failed:', e.message);
      }

      setResults({
        imported,
        skipped,
        total: rows.length,
        flagged: batch.filter(r => r.is_flagged).length,
        clientSync,
      });
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      if (uploadRecord) {
        await base44.entities.MonthlyUpload.update(uploadRecord.id, {
          import_status: 'Failed',
          notes: err.message,
        });
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!file || !month) return;
    if (existingUpload && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    doImport();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Upload Monthly Data</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload an Excel file to import client portfolio valuations for a specific month.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Import Spreadsheet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Month selection */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Select Month <span className="text-destructive">*</span></label>
            <Select value={month} onValueChange={v => { setMonth(v); setConfirmReplace(false); setResults(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose the month this data represents" />
              </SelectTrigger>
              <SelectContent>
                {ALL_MONTHS.map(m => (
                  <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {existingUpload && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2">
                ⚠ Data for <strong>{formatMonth(month)}</strong> already exists ({existingUpload.rows_imported} rows). Importing will replace it.
              </p>
            )}
          </div>

          {/* File upload */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Excel File <span className="text-destructive">*</span></label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <UploadIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Supports <strong>.xlsx</strong> or <strong>.xls</strong> files</p>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="file-upload" />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild className="cursor-pointer"><span>Choose File</span></Button>
              </label>
              {file && <p className="mt-3 text-sm font-medium text-foreground">{file.name}</p>}
            </div>
          </div>

          {/* Column format guide */}
          <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground mb-2">Expected column headers:</p>
            <p>Portfolio Id · Account Code · Identity No · Portfolio Name · Platform · Investment Name · Currency · Month End Market Value · Number of Units · Month End Unit Price</p>
            <p className="mt-2">Column order doesn't matter — mapping is done by header name.</p>
          </div>

          {/* Confirm replace */}
          {confirmReplace && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-800">Replace {formatMonth(month)} data?</p>
              <p className="text-xs text-amber-700 mt-1">All existing records for this month will be deleted before importing the new file.</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={doImport} disabled={loading}>
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Yes, replace data
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmReplace(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {!confirmReplace && (
            <Button onClick={handleImport} disabled={!file || !month || loading} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><UploadIcon className="w-4 h-4" /> Import {month ? formatMonth(month) : ''}</>}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-800">Import successful — {formatMonth(month)}</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Rows', v: results.total },
                { label: 'Imported', v: results.imported },
                { label: 'Skipped', v: results.skipped },
                { label: 'Flagged', v: results.flagged },
              ].map(s => (
                <div key={s.label} className="bg-white rounded border p-3 text-center">
                  <p className="text-xl font-bold">{s.v}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {results.clientSync && (
              <div className="mt-3 text-xs text-green-800 bg-green-100 rounded px-3 py-2 space-y-0.5">
                <p className="font-semibold">Client register updated:</p>
                <p>✦ {results.clientSync.clients_created} new clients created · {results.clientSync.clients_updated} updated · {results.clientSync.clients_marked_absent} marked absent</p>
              </div>
            )}
            {results.flagged > 0 && (
              <p className="text-xs text-amber-700 mt-3">⚠ {results.flagged} rows have data quality issues. Review them in the <a href="/data-quality" className="underline">Data Quality</a> screen.</p>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Import failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload history */}
      {uploads.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-sm font-semibold">Upload History</h2>
          </div>
          <div className="divide-y">
            {uploads.map(u => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MonthBadge month={u.upload_month} />
                    <p className="text-sm font-medium">{u.file_name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{u.rows_imported} rows · {u.uploaded_by} · {u.upload_date?.slice(0, 10)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  u.import_status === 'Imported' ? 'bg-green-50 text-green-700' :
                  u.import_status === 'Failed' ? 'bg-red-50 text-red-700' :
                  'bg-yellow-50 text-yellow-700'
                }`}>{u.import_status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}