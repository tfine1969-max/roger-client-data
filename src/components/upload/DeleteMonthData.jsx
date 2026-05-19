import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const PROVIDER_LABELS = {
  'monthly': 'Monthly Workbook',
  'julius-baer': 'Julius Baer',
  'prime': 'Prime Investments',
  'credo': 'Credo',
  'gryphon': 'Gryphon',
  'northstar': 'Northstar',
  'peresec': 'Peresec',
  'prescient': 'Prescient',
};

// Maps provider tab ID → platform value(s) stored in PortfolioValuation
const PROVIDER_PLATFORMS = {
  'prime': ['Prime', 'Prime Investments'],
  'julius-baer': ['Julius Baer'],
  'credo': ['Credo'],
  'gryphon': ['Gryphon', 'Gryphon Asset Management'],
  'northstar': ['Northstar', 'Northstar FNB', 'Northstar Sanlam'],
  'peresec': ['Peresec', 'Peresec Securities'],
  'prescient': ['Prescient'],
  'monthly': null, // null = delete all platforms for that month
};

const BATCH = 25;

async function deleteMonthDataClientSide(provider, month) {
  const platforms = PROVIDER_PLATFORMS[provider];
  let pvRows = [];

  if (platforms) {
    const results = await Promise.all(
      platforms.map(p => base44.entities.PortfolioValuation.filter({ upload_month: month, platform: p }, '-created_date', 20000))
    );
    pvRows = results.flat();
  } else {
    pvRows = await base44.entities.PortfolioValuation.filter({ upload_month: month }, '-created_date', 20000);
  }

  for (let i = 0; i < pvRows.length; i += BATCH) {
    await Promise.all(pvRows.slice(i, i + BATCH).map(r => base44.entities.PortfolioValuation.delete(r.id)));
  }

  const allUploads = await base44.entities.MonthlyUpload.list('-upload_date', 500);
  const uploadsToDelete = allUploads.filter(u => {
    if (u.upload_month !== month) return false;
    if (!platforms) return true;
    const notes = (u.notes || '').toLowerCase();
    const file = (u.file_name || '').toLowerCase();
    return platforms.some(p => notes.includes(p.toLowerCase()) || file.includes(p.toLowerCase()));
  });
  for (let i = 0; i < uploadsToDelete.length; i += BATCH) {
    await Promise.all(uploadsToDelete.slice(i, i + BATCH).map(r => base44.entities.MonthlyUpload.delete(r.id)));
  }

  return { portfolio_valuations_deleted: pvRows.length, upload_records_deleted: uploadsToDelete.length };
}

export default function DeleteMonthData({ provider }) {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [status, setStatus] = useState(null); // null | 'deleting' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState(null);

  const providerLabel = PROVIDER_LABELS[provider] || provider;

  const handleDelete = async () => {
    if (!month || !confirm) return;
    setStatus('deleting');
    setMessage('Deleting...');
    setDetail(null);
    try {
      const result = await deleteMonthDataClientSide(provider, month);
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
      queryClient.invalidateQueries({ queryKey: ['primeHoldings'] });
      queryClient.invalidateQueries({ queryKey: ['providerUploadSummary'] });
      setStatus('success');
      setMessage(`All ${providerLabel} data for ${month} has been deleted.`);
      setDetail(result);
      setConfirm(false);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Delete failed');
    }
  };

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center gap-2 mb-3">
        <Trash2 className="w-4 h-4 text-destructive" />
        <h3 className="text-sm font-semibold text-destructive">Delete Data</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Permanently delete all <strong>{providerLabel}</strong> data for a specific month. This cannot be undone.
      </p>

      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Month to delete</Label>
          <Input
            type="month"
            value={month}
            onChange={e => { setMonth(e.target.value); setStatus(null); setConfirm(false); }}
            className="max-w-xs h-9"
          />
        </div>

        {month && (
          <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirm}
              onChange={e => setConfirm(e.target.checked)}
              className="mt-0.5 rounded border-destructive"
            />
            <span className="text-destructive font-medium">
              I confirm: permanently delete all <strong>{providerLabel}</strong> records for <strong>{month}</strong>
            </span>
          </label>
        )}

        <Button
          variant="destructive"
          size="sm"
          disabled={!month || !confirm || status === 'deleting'}
          onClick={handleDelete}
          className="gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {status === 'deleting' ? 'Deleting...' : 'Delete All Data for This Month'}
        </Button>

        {status === 'success' && (
          <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>{message}</p>
              {detail && (
                <p className="text-xs text-green-600 mt-1">
                  {detail.portfolio_valuations_deleted} valuation records deleted
                  {detail.upload_records_deleted > 0 && `, ${detail.upload_records_deleted} upload log entries removed`}
                </p>
              )}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {message}
          </div>
        )}
      </div>
    </div>
  );
}