import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileDown, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = [
  { key: 'dec_2025', label: 'Dec 2025' },
  { key: 'jan_2026', label: 'Jan 2026' },
  { key: 'feb_2026', label: 'Feb 2026' },
  { key: 'mar_2026', label: 'Mar 2026' },
  { key: 'apr_2026', label: 'Apr 2026' },
  { key: 'may_2026', label: 'May 2026' },
  { key: 'jun_2026', label: 'Jun 2026' },
  { key: 'jul_2026', label: 'Jul 2026' },
  { key: 'aug_2026', label: 'Aug 2026' },
  { key: 'sep_2026', label: 'Sep 2026' },
  { key: 'oct_2026', label: 'Oct 2026' },
  { key: 'nov_2026', label: 'Nov 2026' },
  { key: 'dec_2026', label: 'Dec 2026' },
];

const CLIENT_NAME = 'Marc Hoar';

function fmtNum(val, currency) {
  if (!val && val !== 0) return '—';
  const n = Number(val);
  if (!n) return '—';
  return (currency === 'USD' ? '$' : 'R') + n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
}

function parseNum(str) {
  const cleaned = String(str || '').replace(/[^0-9.]/g, '');
  return cleaned ? parseFloat(cleaned) : null;
}

function PortfolioTable({ title, rows, currency, onSaveRow, editingMonthKey }) {
  const [edits, setEdits] = useState({});

  const totals = MONTHS.reduce((acc, m) => {
    acc[m.key] = rows.reduce((s, r) => s + (Number(r[m.key]) || 0), 0);
    return acc;
  }, {});

  const handleChange = (rowId, monthKey, val) => {
    setEdits(prev => ({ ...prev, [`${rowId}-${monthKey}`]: val }));
  };

  const handleSave = async (row, monthKey) => {
    const key = `${row.id}-${monthKey}`;
    const raw = edits[key];
    if (raw === undefined) return;
    const num = parseNum(raw);
    await onSaveRow(row.id, { [monthKey]: num });
    setEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-6 bg-accent rounded-full" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <Badge variant="outline" className="text-xs">{currency}</Badge>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="text-left px-3 py-2 font-semibold min-w-[200px] sticky left-0 bg-primary z-10">Fund / Investment Name</th>
              {MONTHS.map(m => (
                <th key={m.key} className="px-2 py-2 font-semibold text-center min-w-[100px] whitespace-nowrap">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                <td className="px-3 py-1.5 font-medium text-foreground sticky left-0 bg-inherit z-10 border-r border-border">
                  {row.fund_name}
                </td>
                {MONTHS.map(m => {
                  const editKey = `${row.id}-${m.key}`;
                  const isEditing = m.key === editingMonthKey;
                  const editVal = edits[editKey];
                  return (
                    <td key={m.key} className="px-1 py-1 text-center">
                      {isEditing ? (
                        <Input
                          className="h-6 text-xs text-center w-24 mx-auto px-1"
                          defaultValue={row[m.key] || ''}
                          onChange={e => handleChange(row.id, m.key, e.target.value)}
                          onBlur={() => handleSave(row, m.key)}
                          onKeyDown={e => e.key === 'Enter' && handleSave(row, m.key)}
                        />
                      ) : (
                        <span className={row[m.key] ? 'text-foreground' : 'text-muted-foreground/40'}>
                          {fmtNum(row[m.key], currency)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-primary text-primary-foreground font-bold">
              <td className="px-3 py-2 sticky left-0 bg-primary z-10">TOTAL</td>
              {MONTHS.map(m => (
                <td key={m.key} className="px-2 py-2 text-center">
                  {totals[m.key] ? fmtNum(totals[m.key], currency) : '—'}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function InvestmentSummary() {
  const [editingMonth, setEditingMonth] = useState(null);
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['investment-summary', CLIENT_NAME],
    queryFn: () => base44.entities.InvestmentSummaryReport.filter({ client_name: CLIENT_NAME }, 'sort_order', 100),
  });

  const localRows = rows.filter(r => r.portfolio === 'LOCAL').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const offshoreRows = rows.filter(r => r.portfolio === 'OFFSHORE').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const saveRow = async (id, data) => {
    await base44.entities.InvestmentSummaryReport.update(id, data);
    qc.invalidateQueries({ queryKey: ['investment-summary', CLIENT_NAME] });
    toast.success('Saved');
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-playfair">{CLIENT_NAME}</h1>
          <p className="text-muted-foreground text-sm mt-1">Investment Portfolio Summary — 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <span className="text-xs text-muted-foreground px-2">Edit month:</span>
            {MONTHS.filter(m => ['apr_2026','may_2026','jun_2026','jul_2026','aug_2026','sep_2026','oct_2026','nov_2026','dec_2026'].includes(m.key)).map(m => (
              <button
                key={m.key}
                onClick={() => setEditingMonth(editingMonth === m.key ? null : m.key)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  editingMonth === m.key
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'hover:bg-secondary text-foreground'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <GeneratePdfButton clientName={CLIENT_NAME} />
        </div>
      </div>

      {editingMonth && (
        <div className="mb-4 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg text-sm text-foreground flex items-center gap-2">
          <Pencil className="w-4 h-4 text-accent" />
          Editing <strong>{MONTHS.find(m => m.key === editingMonth)?.label}</strong> — click any cell and type to update, then press Enter or click away to save.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <PortfolioTable
            title="LOCAL PORTFOLIO"
            rows={localRows}
            currency="ZAR"
            onSaveRow={saveRow}
            editingMonthKey={editingMonth}
          />
          <PortfolioTable
            title="OFFSHORE PORTFOLIO"
            rows={offshoreRows}
            currency="USD"
            onSaveRow={saveRow}
            editingMonthKey={editingMonth}
          />
        </>
      )}
    </div>
  );
}

function GeneratePdfButton({ clientName }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      // Use fetch directly to get binary PDF
      const { base44 } = await import('@/api/base44Client');
      const token = localStorage.getItem('base44_token') || '';

      // Invoke via SDK — returns axios response with data as blob/arraybuffer
      const res = await base44.functions.invoke('generateInvestmentSummaryPdf', { client_name: clientName });

      // base44 functions return axios response; data may be arraybuffer
      let blobData;
      if (res.data instanceof ArrayBuffer) {
        blobData = new Blob([res.data], { type: 'application/pdf' });
      } else if (res.data instanceof Blob) {
        blobData = res.data;
      } else {
        throw new Error(res.data?.error || 'Unexpected response');
      }

      const url = URL.createObjectURL(blobData);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clientName.replace(/\s+/g, '_')}_Investment_Summary.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error('PDF failed: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <Button onClick={handleClick} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Download PDF
    </Button>
  );
}
