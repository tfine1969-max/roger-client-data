import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function IncomeAssetsStep({ formData, handleChange }) {
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">INCOME & ASSETS</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">GROSS ANNUAL INCOME BAND</Label>
            <Select value={formData.gross_annual_income_band || undefined} onValueChange={v => handleChange('gross_annual_income_band', v)}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{['Under R150,000', 'R150,000 - R350,000', 'R350,000 - R750,000', 'R750,000 - R1.5m', 'R1.5m - R3m', 'Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">MONTHLY INVESTABLE SURPLUS</Label>
            <Select value={formData.monthly_investable_surplus || undefined} onValueChange={v => handleChange('monthly_investable_surplus', v)}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{['Under R2,000', 'R2,000 - R5,000', 'R5,000 - R15,000', 'R15,000 - R50,000', 'Over R50,000'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">NET WORTH BAND</Label>
            <Select value={formData.net_worth_band || undefined} onValueChange={v => handleChange('net_worth_band', v)}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{['Under R500,000', 'R500k - R2m', 'R2m - R5m', 'R5m - R10m', 'R10m - R20m', 'Over R20m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TOTAL LIABILITIES</Label>
            <Select value={formData.total_liabilities || undefined} onValueChange={v => handleChange('total_liabilities', v)}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{['None', 'Under R500,000', 'R500k - R1m', 'R1m - R3m', 'Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">WILL IN PLACE?</Label>
            <Select value={formData.will_in_place || undefined} onValueChange={v => handleChange('will_in_place', v)}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem><SelectItem value="In progress">In progress</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">DEPENDANTS</Label>
            <Select value={formData.dependants} onValueChange={v => handleChange('dependants', v)}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{['0', '1', '2', '3', '4', '5+'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}