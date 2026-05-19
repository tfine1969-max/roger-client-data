import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BarChart3, Briefcase,
  Percent, SlidersHorizontal, ClipboardCheck,
  Upload, AlertTriangle, LineChart, ChevronDown, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

// WealthWorks corporate palette
// Blue: #26547C | 55% tint: #6B97B8 | 35% tint: #94B5CE
// Grey: #777772 | 55% tint: #A3A39F | 35% tint: #BCBCB9

const COLORS = {
  blue:      '#26547C',
  grey:      '#777772',
  blueTint55: '#6B97B8',
  greyTint55: '#A3A39F',
  blueTint35: '#94B5CE',
  greyTint35: '#BCBCB9',
};

const singleItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, color: COLORS.blue },
  { path: '/clients', label: 'Clients', icon: Users, color: COLORS.grey },
  { path: '/platforms', label: 'Platforms', icon: BarChart3, color: COLORS.blueTint55 },
  { path: '/funds', label: 'Funds', icon: Briefcase, color: COLORS.greyTint55 },
  { path: '/investment-summary', label: 'Summary', icon: LineChart, color: COLORS.blueTint35 },
];

const reportsGroup = {
  label: 'Client Reports',
  icon: LineChart,
  color: COLORS.blueTint35,
  items: [
    { path: '/reports/marc-hoar',      label: 'Marc Hoar',              icon: Users },
    { path: '/reports/worrall-family', label: 'Worrall Family',         icon: Users },
  ],
};

const feesGroup = {
  label: 'Fees',
  icon: Percent,
  color: COLORS.blue,
  items: [
    { path: '/fee-seeding', label: 'Fee Seeding', icon: Layers },
    { path: '/fees', label: 'Fees', icon: Percent },
    { path: '/bulk-fees', label: 'Bulk Fees', icon: SlidersHorizontal },
  ],
};

const dataGroup = {
  label: 'Data',
  icon: Upload,
  color: COLORS.grey,
  items: [
    { path: '/control', label: 'Control', icon: ClipboardCheck },
    { path: '/upload', label: 'Upload / Delete', icon: Upload },
    { path: '/data-quality', label: 'Data Quality', icon: AlertTriangle },
  ],
};

function NavDropdown({ group, location }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  const isGroupActive = group.items.some(item => location.pathname.startsWith(item.path));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const Icon = group.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "group relative flex h-8 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all whitespace-nowrap",
          isGroupActive
            ? "bg-white text-primary shadow-sm ring-1 ring-slate-200"
            : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm",
          hovered && !isGroupActive && "bg-white"
        )}
      >
        <Icon className={cn("h-4 w-4 transition-colors", isGroupActive ? "text-primary" : "text-slate-400 group-hover:text-slate-700")} />
        <span className="hidden md:inline">{group.label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform hidden md:block", open && "rotate-180")} />
        {isGroupActive && (
          <span className="absolute inset-x-3 -bottom-1.5 h-0.5 rounded-full bg-primary" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[190px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
          {group.items.map(({ path, label, icon: ItemIcon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                  active
                    ? "text-primary font-semibold bg-primary/5 rounded-lg"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 rounded-lg"
                )}
              >
                <ItemIcon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const platformsSubNav = [
  { path: '/platforms', label: 'All Platforms' },
];

export default function AppLayout() {
  const location = useLocation();

  const inPlatformsSection =
    location.pathname === '/platforms' || location.pathname.startsWith('/providers/');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur">
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="flex h-14 items-center gap-4">
            <Link to="/" className="group flex shrink-0 items-center gap-3">
              <img
                src="https://media.base44.com/images/public/69fec6783aa61326b91c656b/2b79ae42c_logo.png"
                alt="Wealth Works"
                className="h-10 w-auto transition-transform group-hover:scale-[1.01]"
              />
              <p className="hidden text-[10px] font-medium uppercase leading-none tracking-[0.22em] text-slate-500 md:block">
                Cape Town Client Management
              </p>
            </Link>
            <nav className="flex flex-1 items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50/80 p-1">
              {singleItems.map(({ path, label, icon: Icon }) => {
                const active =
                  path === '/'
                    ? location.pathname === '/'
                    : path === '/platforms'
                    ? inPlatformsSection
                    : location.pathname.startsWith(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={cn(
                      "group relative flex h-9 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-all",
                      active
                        ? "bg-white text-primary shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "text-slate-400 group-hover:text-slate-700")} />
                    <span className="hidden md:inline">{label}</span>
                    {active && (
                      <span className="absolute inset-x-3 -bottom-1.5 h-0.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}

              <NavDropdown group={reportsGroup} location={location} />
              <NavDropdown group={feesGroup} location={location} />
              <NavDropdown group={dataGroup} location={location} />
            </nav>
          </div>
        </div>

        {inPlatformsSection && (
          <div className="border-t border-slate-200/80 bg-white">
            <div className="max-w-screen-xl mx-auto px-5 sm:px-6">
              <div className="flex h-11 items-center gap-2 overflow-x-auto">
                {platformsSubNav.map(({ path, label }) => {
                  const active = path === '/platforms'
                    ? location.pathname === '/platforms'
                    : location.pathname.startsWith(path);
                  return (
                    <Link
                      key={path}
                      to={path}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="max-w-screen-xl mx-auto px-5 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}