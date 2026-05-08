import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Mail, ShieldCheck } from 'lucide-react';

const TABS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/advisor-dashboard' },
  { label: 'Inbox', icon: Mail, path: '/proposals' },
  { label: 'Compliance', icon: ShieldCheck, path: '/compliance-review' },
];

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-navy border-t border-white/10 flex md:hidden"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      {TABS.map(tab => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${active ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            style={{ minHeight: 56 }}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
            {active && <div className="absolute top-0 w-8 h-0.5 bg-white rounded-b" />}
          </button>
        );
      })}
    </nav>
  );
}