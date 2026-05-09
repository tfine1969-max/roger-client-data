import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AddInvestmentDialog({ clientId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ investment_name: '', platform: '', currency: 'USD', portfolio_id: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.Investment.create({ ...form, client_id: clientId });
    setForm({ investment_name: '', platform: '', currency: 'USD', portfolio_id: '' });
    setOpen(false);
    setLoading(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Investment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Investment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Investment / Fund Name *</Label>
            <Input value={form.investment_name} onChange={e => setForm({ ...form, investment_name: e.target.value })} placeholder="e.g. Wealthworks Global Flexible Fund" required />
          </div>
          <div className="space-y-2">
            <Label>Platform / Provider *</Label>
            <Input value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} placeholder="e.g. Credo, Allan Gray" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} placeholder="USD" />
            </div>
            <div className="space-y-2">
              <Label>Portfolio ID</Label>
              <Input value={form.portfolio_id} onChange={e => setForm({ ...form, portfolio_id: e.target.value })} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !form.investment_name || !form.platform}>
            {loading ? 'Creating...' : 'Create Investment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}