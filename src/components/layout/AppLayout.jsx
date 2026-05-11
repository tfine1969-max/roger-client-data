import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Upload, BarChart3, AlertTriangle, Percent, Briefcase, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/platforms', label: 'Platforms', icon: BarChart3 },
  { path: '/funds', label: 'Funds', icon: Briefcase },
  { path: '/fees', label: 'Fees', icon: Percent },
  { path: '/bulk-fees', label: 'Bulk Fees', icon: SlidersHorizontal },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/data-quality', label: 'Data Quality', icon: AlertTriangle },
];

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
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold tracking-wider">WW</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-primary tracking-tight">Wealth Works</span>
                <p className="text-[10px] text-muted-foreground leading-none tracking-widest uppercase">Portfolio Management</p>
              </div>
            </Link>
            <nav className="flex items-center gap-0.5">
              {navItems.map(({ path, label, icon: Icon }) => {
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
                      "flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Platforms sub-nav */}
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