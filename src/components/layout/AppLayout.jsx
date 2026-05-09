import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Upload, BarChart3, AlertTriangle, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/platforms', label: 'Platforms', icon: BarChart3 },
  { path: '/fees', label: 'Fees', icon: Percent },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/data-quality', label: 'Data Quality', icon: AlertTriangle },
];

export default function AppLayout() {
  const location = useLocation();

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
                const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
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
      </header>
      <main className="max-w-screen-xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}