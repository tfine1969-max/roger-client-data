import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TopBar({ advisorName, clientName }) {
  const navigate = useNavigate();
  return (
    <div className="bg-navy px-4 md:px-8 py-3.5 grid grid-cols-3 items-center">
      {/* Left */}
      <div>
        <h3 className="text-sm font-medium text-white tracking-wide">
          WealthWorks &nbsp;·&nbsp; Proposal engine
        </h3>
        <p className="text-[10px] text-white/35 mt-0.5">
          Advisor view &nbsp;·&nbsp; {advisorName || '—'} &nbsp;·&nbsp; FSP 28337
        </p>
      </div>

      {/* Centre: client name */}
      <div className="flex flex-col items-center">
        {clientName && (
          <>
            <p className="text-[9px] text-white/35 uppercase tracking-[.1em]">Client</p>
            <p className="text-sm font-semibold text-white tracking-wide">{clientName}</p>
          </>
        )}
      </div>

      {/* Right: logout only */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            sessionStorage.removeItem('pending_client_id');
            sessionStorage.removeItem('pending_client_email');
            sessionStorage.removeItem('pending_entity_type');
            navigate('/');
          }}
          className="text-white/30 p-2 border border-white/12 hover:text-white/70 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}