import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Mail, ShieldCheck } from 'lucide-react';

const TABS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/advisor-dashboard', root: '/advisor-dashboard' },
  { label: 'Inbox', icon: Mail, path: '/proposals', root: '/proposals' },
  { label: 'Compliance', icon: ShieldCheck, path: '/compliance-review', root: '/compliance-review' },
];

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabPress = (tab) => {
    const alreadyActive = location.pathname === tab.path || location.pathname.startsWith(tab.root + '/');
    if (alreadyActive) {
      // Already on this tab — navigate to root to reset state
      navigate(tab.root, { replace: true });
    } else {
      navigate(tab.path);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-navy border-t border-white/10 flex md:hidden"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      {TABS.map(tab => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path || location.pathname.startsWith(tab.root + '/');
        return (
          <button
            key={tab.path}
            onClick={() => handleTabPress(tab)}
            className={`relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${active ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            style={{ minHeight: 56 }}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
            {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-b" />}
          </button>
        );
      })}
    </nav>
  );
}