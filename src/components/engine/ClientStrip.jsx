import React from 'react';

export default function ClientStrip({ proposal }) {
  const items = [
    { label: 'Client', value: proposal.client_name, highlight: true },
    { label: 'Needs identified', value: proposal.needs_identified },
    { label: 'Risk profile', value: proposal.risk_profile },
    { label: 'Monthly budget', value: proposal.monthly_budget },
    { label: 'Time horizon', value: proposal.time_horizon }
  ];

  return (
    <div className="bg-navy">
      <div className="grid grid-cols-2 md:grid-cols-5">
        {items.map((item, i) => (
          <div key={i} className="px-5 py-3 border-r border-white/10 last:border-r-0">
            <div className="text-[8px] font-medium tracking-[.14em] uppercase text-white/30 mb-1">
              {item.label}
            </div>
            <div className={`text-[13px] font-medium ${item.highlight ? 'text-teal' : 'text-white'}`}>
              {item.value || '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}