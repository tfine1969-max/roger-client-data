import React from 'react';

export default function InboxMetrics({ proposals, activeFilter, onFilter }) {
  const metrics = [
    {
      value: proposals.filter(p => p.status === 'new' || p.status === 'Pending Review' || p.proposal_status === 'Pending Review').length,
      label: 'Awaiting Review',
      color: 'text-navy',
      filter: 'new',
    },
    {
      value: proposals.filter(p => p.status === 'in_progress' || p.status === 'signed').length,
      label: 'In Progress',
      color: 'text-gold',
      filter: 'in_progress',
    },
    {
      value: proposals.filter(p => p.status === 'sent' || p.status === 'client_signed').length,
      label: 'Sent',
      color: 'text-forest',
      filter: 'sent',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-5">
      {metrics.map((m) => {
        const isActive = activeFilter === m.filter;
        return (
          <button
            key={m.filter}
            onClick={() => onFilter(isActive ? null : m.filter)}
            className={`bg-card border rounded-sm transition-colors w-full py-5 flex flex-col items-center justify-center gap-1 ${
              isActive ? 'border-navy ring-1 ring-navy' : 'border-border hover:border-navy/40'
            }`}
          >
            <div className={`text-3xl font-medium ${m.color}`}>{m.value}</div>
            <div className="text-[9px] font-semibold tracking-[.14em] uppercase text-muted-foreground">
              {m.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}