import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RISK_PROFILES, BUDGETS, HORIZONS, generateRef } from '@/lib/constants';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export default function NewProposalModal({ open, onClose, advisorKey, advisorName }) {
  const [form, setForm] = useState({
    client_name: '', client_email: '', client_mobile: '',
    risk_profile: '', monthly_budget: '', time_horizon: '',
    needs_identified: '', notes: ''
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Proposal.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClose();
      setForm({ client_name: '', client_email: '', client_mobile: '', risk_profile: '', monthly_budget: '', time_horizon: '', needs_identified: '', notes: '' });
      navigate(`/proposal/${created.id}`);
    }
  });

  const handleCreate = () => {
    if (!form.client_name.trim()) return;
    createMutation.mutate({
      ...form,
      reference: generateRef(),
      status: 'new',
      advisor_key: advisorKey,
      advisor_name: advisorName
    });
  };

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[560px] p-0 gap-0 rounded-none">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted">
          <DialogTitle className="text-sm font-medium text-navy tracking-wide">
            New proposal — client details
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">
                Client full name <span className="text-ocean">*</span>
              </Label>
              <Input value={form.client_name} onChange={e => update('client_name', e.target.value)} placeholder="Full name" className="rounded-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Email address</Label>
              <Input type="email" value={form.client_email} onChange={e => update('client_email', e.target.value)} placeholder="client@email.com" className="rounded-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Mobile number</Label>
              <Input type="tel" value={form.client_mobile} onChange={e => update('client_mobile', e.target.value)} placeholder="+27" className="rounded-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Risk profile</Label>
              <Select value={form.risk_profile} onValueChange={v => update('risk_profile', v)}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {RISK_PROFILES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Monthly budget</Label>
              <Select value={form.monthly_budget} onValueChange={v => update('monthly_budget', v)}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BUDGETS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Time horizon</Label>
              <Select value={form.time_horizon} onValueChange={v => update('time_horizon', v)}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {HORIZONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Needs identified</Label>
            <Input value={form.needs_identified} onChange={e => update('needs_identified', e.target.value)} placeholder="e.g. Life cover, Retirement planning, Offshore" className="rounded-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Notes</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional context..." className="rounded-sm min-h-[70px]" />
          </div>
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full bg-gold text-white py-3.5 text-[13px] font-medium tracking-[.08em] uppercase hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create proposal →'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}