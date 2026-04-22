import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function TopBar({ advisorName, statusText }) {
  const navigate = useNavigate();

  return (
    <div className="bg-navy px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h3 className="text-sm font-medium text-white tracking-wide">
          WealthWorks &nbsp;·&nbsp; Proposal engine
        </h3>
        <p className="text-[10px] text-white/35 mt-0.5">
          Advisor view &nbsp;·&nbsp; {advisorName || '—'} &nbsp;·&nbsp; FSP 28337
        </p>
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-forest flex-shrink-0" />
          <span className="text-[11px] text-white/40">{statusText || 'Inbox'}</span>
        </div>
        <span className="text-xs font-medium text-white/60 hidden sm:inline">
          {advisorName}
        </span>
        <button 
          onClick={() => base44.auth.logout()}
          className="text-[11px] text-white/30 px-3 py-1.5 border border-white/12 hover:text-white/70 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}