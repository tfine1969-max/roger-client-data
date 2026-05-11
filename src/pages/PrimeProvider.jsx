import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import { fmtNum, formatMonth } from '@/lib/valuation-utils';
import primeLogo from '@/assets/provider-logos/prime-investments.png';

function getSortedMonths(holdings) {
  const months = [...new Set(holdings.map(h => h.upload_month).filter(Boolean))];
  return months.sort((a, b) => b.localeCompare(a));
}

export default function PrimeProvider() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  // Upload state
  const [file, setFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');

  const { data: holdings = [], refetch } = useQuery({
    queryKey: ['primeHoldings'],
    queryFn: () => base44.entities.PrimeHolding.list('-upload_month', 5000),
  });

  const months = useMemo(() => getSortedMonths(holdings), [holdings]);
  const activeMonth = selectedMonth || months[0] || '';

  const monthHoldings = useMemo(
    () => holdings.filter(h => h.upload_month === activeMonth),
    [holdings, activeMonth]
  );

  // Group by client (account_number + investor)
  const clients = useMemo(() => {
    const map = {};
    monthHoldings.forEach(h => {
      const key = h.account_number || h.investor;
      if (!map[key]) {
        map[key] = {
          account_number: h.account_number,
          investor: h.investor,
          id_number: h.id_number,
          product: h.product,
          status: h.status,
          adviser: h.adviser,
          holdings: [],
          total_value: 0,
        };
      }
      map[key].holdings.push(h);
      map[key].total_value += h.market_value ?? 0;
    });
    return Object.values(map).sort((a, b) => (a.investor || '').localeCompare(b.investor || ''));
  }, [monthHoldings]);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      (c.investor || '').toLowerCase().includes(q) ||
      (c.account_number || '').toLowerCase().includes(q) ||
      (c.id_number || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const totalAUM = useMemo(() => clients.reduce((s, c) => s + c.total_value, 0), [clients]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !uploadMonth) return;
    setUploadStatus('uploading');
    setUploadMessage('Uploading file...');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadMessage('Processing...');
      const res = await base44.functions.invoke('importPrimeFile', {
        file_url,
        upload_month: uploadMonth,
        replace_existing: replaceExisting,
      });
      if (!res.data.success) throw new Error(res.data.error || 'Import failed');
      setUploadStatus('success');
      setUploadMessage(`Imported ${res.data.rows_imported} rows for ${formatMonth(uploadMonth)}.`);
      queryClient.invalidateQueries({ queryKey: ['primeHoldings'] });
      refetch();
      setFile(null);
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage(err.message || 'Upload failed');
    }
  };

  // Client detail view
  if (selectedClient) {
    const c = selectedClient;
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setSelectedClient(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to clients
          </button>
          <div className="flex items-start gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{c.investor}</h1>
              <p className="text-sm text-muted-foreground mt-1 font-mono">{c.account_number} · {c.id_number}</p>
              <p className="text-sm text-muted-foreground">{c.product} · {c.status}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Value</p>
            <p className="mt-1 text-xl font-bold font-numbers">ZAR {fmtNum(c.total_value)}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Holdings</p>
            <p className="mt-1 text-xl font-bold">{c.holdings.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Adviser</p>
            <p className="mt-1 text-sm font-medium">{c.adviser || '—'}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Report Month</p>
            <p className="mt-1 text-sm font-medium">{formatMonth(activeMonth)}</p>
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">Holdings Detail</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Instrument', 'Code', '% of Account', 'Units', 'Price', 'Price Date', 'Currency', 'Market Value'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {c.holdings.map((h, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium max-w-xs"><span className="line-clamp-2">{h.instrument_name}</span></td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{h.instrument_code}</td>
                    <td className="px-4 py-3 text-right">{h.percent_of_account != null ? `${h.percent_of_account.toFixed(2)}%` : '—'}</td>
                    <td className="px-4 py-3 text-right font-numbers">{h.units != null ? fmtNum(h.units) : '—'}</td>
                    <td className="px-4 py-3 text-right font-numbers">{h.price != null ? h.price.toFixed(4) : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{h.price_date || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{h.currency}</td>
                    <td className="px-4 py-3 font-numbers font-semibold text-right whitespace-nowrap">ZAR {fmtNum(h.market_value ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider" colSpan={7}>Total</td>
                  <td className="px-4 py-3 font-numbers text-right whitespace-nowrap">ZAR {fmtNum(c.total_value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-14 w-40 flex items-center justify-center rounded-lg border bg-white px-4">
            <img src={primeLogo} alt="Prime" className="max-h-9 max-w-[130px] object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Prime Investments</h1>
            <p className="text-sm text-muted-foreground">Monthly holdings data per client</p>
          </div>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} variant="outline" className="gap-2">
          <UploadIcon className="w-4 h-4" /> Upload Data
        </Button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-white border rounded-lg p-6 space-y-4 max-w-lg">
          <h2 className="text-sm font-semibold">Upload Prime Holdings File</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Upload Month</Label>
              <Input type="month" value={uploadMonth} onChange={e => setUploadMonth(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Prime Holdings File (.xlsx)</Label>
              <Input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} required />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="rounded border-border" />
              <span>Replace existing data for this month</span>
            </label>
            <Button type="submit" disabled={!file || !uploadMonth || uploadStatus === 'uploading'} className="w-full gap-2">
              <UploadIcon className="w-4 h-4" />
              {uploadStatus === 'uploading' ? 'Processing...' : 'Upload & Import'}
            </Button>
            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {uploadMessage}
              </div>
            )}
            {uploadStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> {uploadMessage}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Month selector + summary */}
      {months.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Month:</span>
            {months.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  m === activeMonth ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {formatMonth(m)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reporting Month</p>
              <p className="mt-2 text-2xl font-bold text-primary">{activeMonth ? new Date(+activeMonth.split('-')[0], +activeMonth.split('-')[1] - 1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' }) : '—'}</p>
            </div>
            <div className="bg-white border rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total AUM</p>
              <p className="mt-1 font-numbers text-2xl font-semibold">ZAR {fmtNum(totalAUM)}</p>
            </div>
            <div className="bg-white border rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clients</p>
              <p className="mt-1 text-2xl font-semibold">{clients.length}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search client or account..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Client table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {['Client', 'Account Number', 'ID Number', 'Product', 'Holdings', 'Total Value (ZAR)', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredClients.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No data for this month. Upload a Prime file above.</td></tr>
                  )}
                  {filteredClients.map((c, i) => (
                    <tr key={i} className="group cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setSelectedClient(c)}>
                      <td className="px-5 py-4 font-medium">{c.investor || '—'}</td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{c.account_number}</td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">{c.id_number || '—'}</td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">{c.product || '—'}</td>
                      <td className="px-5 py-4 text-center text-muted-foreground">{c.holdings.length}</td>
                      <td className="px-5 py-4 font-numbers font-semibold whitespace-nowrap">ZAR {fmtNum(c.total_value)}</td>
                      <td className="px-5 py-4">
                        <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {months.length === 0 && !showUpload && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <UploadIcon className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">No Prime data yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Upload a Prime Holdings Excel file to get started.</p>
          </div>
          <Button onClick={() => setShowUpload(true)}>Upload Data</Button>
        </div>
      )}
    </div>
  );
}