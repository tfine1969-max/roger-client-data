import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RISK_PROFILES = ['Conservative', 'Cautious', 'Moderate', 'Growth', 'Aggressive'];
const TIME_HORIZONS = ['Under 3 years', '3–5 years', '5–10 years', '10–20 years', '20+ years'];

export default function FinancialProfile({ proposal, onUpdate }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-bold text-navy mb-6">Financial Profile</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Profile */}
        <div>
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-2">
            Risk Profile
          </label>
          <Select value={proposal.risk_profile || ''} onValueChange={(v) => onUpdate('risk_profile', v)}>
            <SelectTrigger className="rounded-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {RISK_PROFILES.map(profile => (
                <SelectItem key={profile} value={profile}>
                  {profile}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Horizon */}
        <div>
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-2">
            Time Horizon
          </label>
          <Select value={proposal.time_horizon || ''} onValueChange={(v) => onUpdate('time_horizon', v)}>
            <SelectTrigger className="rounded-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {TIME_HORIZONS.map(horizon => (
                <SelectItem key={horizon} value={horizon}>
                  {horizon}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}