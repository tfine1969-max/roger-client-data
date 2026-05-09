import React from 'react';

const STATUS_STYLES = {
  'In Progress':                'bg-blue-100 text-blue-800 border-blue-200',
  'Sent':                       'bg-amber-100 text-amber-800 border-amber-200',
  'Awaiting Client Signature':  'bg-purple-100 text-purple-800 border-purple-200',
  'Signed':                     'bg-green-100 text-green-800 border-green-200',
  'Outdated':                   'bg-red-100 text-red-700 border-red-200',
};

export default function StatusBadge({ status }) {
  const label = status || 'In Progress';
  const style = STATUS_STYLES[label] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${style}`}>
      {label}
    </span>
  );
}