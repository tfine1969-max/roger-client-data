import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle, X, FileText, FolderOpen } from 'lucide-react';
import DeleteMonthData from './DeleteMonthData';
import { DEFAULT_USD_ZAR_RATE, getUsdZarRateForMonth, saveUsdZarRateForMonth } from '@/lib/exchange-rates';
import ProviderUploadSummary from './ProviderUploadSummary';

export default function JuliusBaerUpload({ onImported }) {
  const [month, setMonth] = useState('');
  const [rate, setRate] = useState(DEFAULT_USD_ZAR_RATE);
  const [replace, setReplace] = useState(false);
  const [files, setFiles] = useState([]); // array of File objects
  const [results, setResults] = useState([]); // per-file results
  const [status, setStatus] = useState(null); // null | 'uploading' | 'done'
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
    const pdfs = Array.from(incoming).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...pdfs.filter(f => !existing.has(f.name))];
    });
    setResults([]);
    setStatus(null);
  };

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length || !month || !rate) return;
    setStatus('uploading');
    setResults([]);

    const exchangeRate = parseFloat(rate);
    const newResults = [];

    for (const file of files) {
      const resultEntry = { name: file.name, status: 'uploading', message: '' };
      setResults(prev => [...prev.filter(r => r.name !== file.name), { ...resultEntry }]);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const response = await base44.functions.invoke('importJuliusBaerPdf', {
          file_url,
          upload_month: month,
          exchange_rate: exchangeRate,
          replace_existing: replace,
        });
        const result = response.data;
        if (!result.success) throw new Error(result.error || 'Import failed');
        const entry = {
          name: file.name,
          status: 'success',
          message: `${result.rows_imported} holdings imported`,
          client_name: result.client_name,
          account_code: result.account_code,
          portfolio_no: result.portfolio_no,
          usd_total: result.holdings_extracted?.reduce((s, h) => s + (h.usd_value ?? 0), 0) ?? 0,
          zar_total: result.holdings_extracted?.reduce((s, h) => s + (h.zar_value ?? 0), 0) ?? 0,
        };
        newResults.push(entry);
        setResults(prev => [...prev.filter(r => r.name !== file.name), entry]);
      } catch (err) {
        const entry = { name: file.name, status: 'error', message: err.message || 'Failed' };
        newResults.push(entry);
        setResults(prev => [...prev.filter(r => r.name !== file.name), entry]);
      }
    }

    setStatus('done');
    if (onImported) await onImported(month);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Upload one or multiple Julius Baer monthly valuation PDFs — one per client. Holdings are extracted automatically via AI and stored in USD, then converted to ZAR using your supplied rate.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
        {/* Month + Rate side by side */}
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
                placeholder={DEFAULT_USD_ZAR_RATE}
                value={rate}
                onChange={e => handleRateChange(e.target.value)}
                required
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">ZAR / USD</span>
            </div>
            <p className="text-xs text-muted-foreground">Used for all USD uploads in the selected month unless changed here.</p>
          </div>
          <ProviderUploadSummary provider="Julius Baer" uploadMonth={month} />
        </div>

        {/* File selection buttons */}
        <div className="space-y-2">
          <Label>Julius Baer PDFs</Label>
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="w-4 h-4" /> Add PDF(s)
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => folderRef.current?.click()}
            >
              <FolderOpen className="w-4 h-4" /> Add Folder
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
            />
            <input
              ref={folderRef}
              type="file"
              accept=".pdf"
              multiple
              // @ts-ignore
              webkitdirectory=""
              className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="rounded-lg border divide-y text-sm">
            {files.map(f => {
              const res = results.find(r => r.name === f.name);
              return (
                <div key={f.name} className="flex items-center gap-3 px-4 py-2.5">
                  <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-foreground">{f.name}</span>
                  {res?.status === 'uploading' && (
                    <span className="text-xs text-muted-foreground animate-pulse">Processing…</span>
                  )}
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
          <span>Replace existing Julius Baer data for this month</span>
        </label>

        <Button
          type="submit"
          disabled={!files.length || !month || !rate || status === 'uploading'}
          className="w-full gap-2"
        >
          <UploadIcon className="w-4 h-4" />
          {status === 'uploading'
            ? `Processing ${results.length} / ${files.length}…`
            : `Upload & Import ${files.length > 0 ? `(${files.length} PDF${files.length > 1 ? 's' : ''})` : 'PDFs'}`}
        </Button>

        {/* Summary after done */}
        {status === 'done' && (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-sm rounded p-3 border ${errorCount === 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successCount} of {files.length} PDF{files.length > 1 ? 's' : ''} imported successfully{errorCount > 0 ? `, ${errorCount} failed` : ''}.
            </div>

            {/* Per-client result cards */}
            {results.filter(r => r.status === 'success').map((r, i) => (
              <div key={i} className="text-xs bg-muted/40 border rounded p-3 space-y-0.5">
                <p className="font-semibold text-foreground">{r.client_name || r.name}</p>
                {r.account_code && <p><span className="text-muted-foreground">Account:</span> {r.account_code}</p>}
                {r.portfolio_no && <p><span className="text-muted-foreground">Portfolio:</span> {r.portfolio_no}</p>}
                <p>
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-medium text-foreground">
                    USD {r.usd_total?.toLocaleString(undefined, { maximumFractionDigits: 2 })} → ZAR {Math.round(r.zar_total)?.toLocaleString()}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </form>
      <DeleteMonthData provider="julius-baer" />
    </div>
  );
}
