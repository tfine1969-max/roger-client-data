import { CheckCircle2, Loader2 } from 'lucide-react';
import { fmtNum } from '@/lib/valuation-utils';

export default function UploadProgressSummary({
  active,
  processed = 0,
  total = 0,
  clients = 0,
  holdings = 0,
  aum = 0,
  message,
}) {
  if (!active && processed === 0 && clients === 0 && holdings === 0 && !message) return null;

  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {active ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700" />}
          <p className="truncate text-sm font-medium text-slate-950">
            {message || (active ? 'Import running...' : 'Import complete')}
          </p>
        </div>
        {total > 0 && (
          <p className="shrink-0 text-xs font-medium text-muted-foreground">
            {processed} / {total}
          </p>
        )}
      </div>

      {total > 0 && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md bg-white px-3 py-2">
          <p className="font-semibold text-slate-950">{clients}</p>
          <p className="text-muted-foreground">Clients processed</p>
        </div>
        <div className="rounded-md bg-white px-3 py-2">
          <p className="font-semibold text-slate-950">{holdings}</p>
          <p className="text-muted-foreground">Holdings imported</p>
        </div>
        <div className="rounded-md bg-white px-3 py-2">
          <p className="font-semibold text-slate-950">R {fmtNum(aum)}</p>
          <p className="text-muted-foreground">AUM added</p>
        </div>
      </div>
    </div>
  );
}
