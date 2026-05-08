import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';

export default function TopBar({ advisorName, clientName }) {
  const navigate = useNavigate();

  return (
    <div className="bg-navy px-4 md:px-8 py-3.5 grid grid-cols-3 items-center">
      <div>
        <h3 className="text-sm font-medium text-white tracking-wide">
          WealthWorks &nbsp;·&nbsp; Proposal workspace
        </h3>
        <p className="text-[10px] text-white/35 mt-0.5">
          Advisor view &nbsp;·&nbsp; {advisorName || '—'} &nbsp;·&nbsp; FSP 28337
        </p>
      </div>

      <div className="flex flex-col items-center">
        {clientName && (
          <>
            <p className="text-[9px] text-white/35 uppercase tracking-[.1em]">Client</p>
            <p className="text-sm font-semibold text-white tracking-wide">{clientName}</p>
          </>
        )}
      </div>

      <div className="flex justify-end items-center gap-2">
        <button
          onClick={() => navigate('/advisor-dashboard')}
          className="flex items-center gap-1.5 px-3 py-2 border border-white/12 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Workspace
        </button>
        <button
          onClick={() => navigate('/proposals')}
          className="px-3 py-2 border border-white/12 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-xs"
        >
          Proposals
        </button>
        <button
          onClick={() => {
            sessionStorage.removeItem('pending_client_id');
            sessionStorage.removeItem('pending_client_email');
            sessionStorage.removeItem('pending_entity_type');
            window.location.href = window.location.origin;
          }}
          className="text-white/30 p-2 border border-white/12 hover:text-white/70 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
