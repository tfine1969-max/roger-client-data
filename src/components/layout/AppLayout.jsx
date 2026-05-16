import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BarChart3, Briefcase,
  Percent, SlidersHorizontal, ClipboardCheck,
  Upload, AlertTriangle, LineChart, ChevronDown
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
  { path: '/investment-summary', label: 'Reports', icon: LineChart, color: COLORS.blueTint35 },
];

const feesGroup = {
  label: 'Fees',
  icon: Percent,
  color: COLORS.blue,
  items: [
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
    { path: '/upload', label: 'Upload', icon: Upload },
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

  const btnStyle = isGroupActive
    ? { backgroundColor: group.color, color: '#fff' }
    : hovered
    ? { backgroundColor: group.color + '1a', color: group.color }
    : { color: '#6b7280' };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={btnStyle}
        className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap"
      >
        <Icon className="w-4 h-4" />
        <span className="hidden md:inline">{group.label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform hidden md:block", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-[160px] rounded-lg border bg-white shadow-lg py-1">
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
                    ? "text-primary font-semibold bg-primary/5"
                    : "text-foreground hover:bg-muted/60"
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
  { path: '/providers/prime', label: 'Prime Investments' },
];

export default function AppLayout() {
  const location = useLocation();

  const inPlatformsSection =
    location.pathname === '/platforms' || location.pathname.startsWith('/providers/');

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <img src="https://media.base44.com/images/public/69fec6783aa61326b91c656b/2b79ae42c_logo.png" alt="Wealth Works" className="h-9 w-auto" />
              <p className="text-[10px] text-muted-foreground leading-none tracking-widest uppercase">Cape Town Client Management</p>
            </Link>
            <nav className="flex items-center gap-1">
              {singleItems.map(({ path, label, icon: Icon, color }) => {
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
                    className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap"
                    style={active
                      ? { backgroundColor: color, color: '#fff' }
                      : { color: '#6b7280' }
                    }
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = color + '1a'; e.currentTarget.style.color = color; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#6b7280'; } }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{label}</span>
                  </Link>
                );
              })}

              <NavDropdown group={feesGroup} location={location} />
              <NavDropdown group={dataGroup} location={location} />
            </nav>
          </div>
        </div>

        {inPlatformsSection && (
          <div className="border-t bg-muted/40">
            <div className="max-w-screen-xl mx-auto px-6">
              <div className="flex items-center gap-1 h-10">
                {platformsSubNav.map(({ path, label }) => {
                  const active = path === '/platforms'
                    ? location.pathname === '/platforms'
                    : location.pathname.startsWith(path);
                  return (
                    <Link
                      key={path}
                      to={path}
                      className={cn(
                        "px-3 py-1 rounded text-xs font-medium transition-all",
                        active
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
      <main className="max-w-screen-xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}