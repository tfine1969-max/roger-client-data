import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BarChart3, Briefcase,
  Percent, SlidersHorizontal, ClipboardCheck,
  Upload, AlertTriangle, LineChart, ChevronDown, Layers,
  UserCog, LogOut, ChevronDown as ChevronDownSm
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

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
  { path: '/app', label: 'Dashboard', icon: LayoutDashboard, color: COLORS.blue },
  { path: '/app/clients', label: 'Clients', icon: Users, color: COLORS.grey },
  { path: '/app/platforms', label: 'Platforms', icon: BarChart3, color: COLORS.blueTint55 },
  { path: '/app/funds', label: 'Funds', icon: Briefcase, color: COLORS.greyTint55 },
  { path: '/app/investment-summary', label: 'Summary', icon: LineChart, color: COLORS.blueTint35 },
];

const reportsGroup = {
  label: 'Client Reports',
  icon: LineChart,
  color: COLORS.blueTint35,
  items: [
    { path: '/app/reports/marc-hoar',      label: 'Marc Hoar',              icon: Users },
    { path: '/app/reports/worrall-family', label: 'Worrall Family',         icon: Users },
  ],
};

const feesGroup = {
  label: 'Fees',
  icon: Percent,
  color: COLORS.blue,
  items: [
    { path: '/app/fee-seeding', label: 'Fee Seeding', icon: Layers },
    { path: '/app/fees', label: 'Fees', icon: Percent },
    { path: '/app/bulk-fees', label: 'Bulk Fees', icon: SlidersHorizontal },
  ],
};

const dataGroup = {
  label: 'Data',
  icon: Upload,
  color: COLORS.grey,
  items: [
    { path: '/app/control', label: 'Control', icon: ClipboardCheck },
    { path: '/app/upload', label: 'Upload / Delete', icon: Upload },
    { path: '/app/data-quality', label: 'Data Quality', icon: AlertTriangle },
  ],
};

function NavDropdown({ group, location }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  const isGroupActive = group.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));

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
  { path: '/app/platforms', label: 'All Platforms' },
];

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const initials = (user.full_name || user.email || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div ref={ref} className="relative ml-2 shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {initials}
        </span>
        <span className="hidden sm:block max-w-[120px] truncate">{user.full_name || user.email}</span>
        <ChevronDownSm className={cn("w-3 h-3 transition-transform hidden sm:block", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-xs font-semibold text-slate-900 truncate">{user.full_name || user.email}</p>
            <p className="text-xs text-slate-400 truncate">{user.role}</p>
          </div>
          {user.role === 'Administrator' && (
            <Link
              to="/app/users"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg"
            >
              <UserCog className="w-4 h-4" /> Manage Users
            </Link>
          )}
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();

  const inPlatformsSection =
    location.pathname === '/app/platforms' || location.pathname.startsWith('/app/providers/');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur">
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="flex h-14 items-center gap-4">
            <Link to="/app" className="group flex shrink-0 items-center gap-3">
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
                  path === '/app'
                    ? location.pathname === '/app'
                    : path === '/app/platforms'
                    ? inPlatformsSection
                    : location.pathname === path || location.pathname.startsWith(path + '/');
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
            <UserMenu />
          </div>
        </div>

        {inPlatformsSection && (
          <div className="border-t border-slate-200/80 bg-white">
            <div className="max-w-screen-xl mx-auto px-5 sm:px-6">
              <div className="flex h-11 items-center gap-2 overflow-x-auto">
                {platformsSubNav.map(({ path, label }) => {
                  const active = path === '/app/platforms'
                    ? location.pathname === '/app/platforms'
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