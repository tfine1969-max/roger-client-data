import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const RISK_PROFILES = ['Conservative', 'Cautious', 'Moderate', 'Growth', 'Aggressive'];

const TIME_HORIZONS = [
  'Less than 1 year',
  '1–3 years',
  '3–5 years',
  '5–10 years',
  '10+ years',
];

export default function FinancialProfile({ proposal, client, onUpdate }) {

  useEffect(() => {
    if (!client) return;
    if (client.risk_profile && !proposal?.risk_profile) {
      onUpdate('risk_profile', client.risk_profile);
    }
    if (client.time_horizon && !proposal?.time_horizon) {
      onUpdate('time_horizon', client.time_horizon);
    }
  }, [client?.risk_profile, client?.time_horizon]);

  const handleUpdate = async (field, value) => {
    await onUpdate(field, value);
    toast.success('Saved');
  };

  const riskValue = proposal?.risk_profile || client?.risk_profile || '';
  const horizonValue = proposal?.time_horizon || client?.time_horizon || '';

  return (
    <div className="bg-card border border-border rounded-lg px-5 py-3">
      <h2 className="text-sm font-bold text-navy uppercase tracking-wide mb-3">Financial Profile</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div>
          <label className="text-[10px] font-semibold text-navy uppercase tracking-wide block mb-1">Risk Profile</label>
          <Select value={riskValue} onValueChange={(v) => handleUpdate('risk_profile', v)}>
            <SelectTrigger className="h-8 text-xs rounded-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {RISK_PROFILES.map(profile => (
                <SelectItem key={profile} value={profile}>{profile}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {client?.risk_profile && (
            <p className="text-[10px] text-muted-foreground mt-0.5">From onboarding: {client.risk_profile}</p>
          )}
        </div>

        <div>
          <label className="text-[10px] font-semibold text-navy uppercase tracking-wide block mb-1">Time Horizon</label>
          <Select value={horizonValue} onValueChange={(v) => handleUpdate('time_horizon', v)}>
            <SelectTrigger className="h-8 text-xs rounded-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {TIME_HORIZONS.map(horizon => (
                <SelectItem key={horizon} value={horizon}>{horizon}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {client?.time_horizon && (
            <p className="text-[10px] text-muted-foreground mt-0.5">From onboarding: {client.time_horizon}</p>
          )}
        </div>

      </div>
    </div>
  );
}