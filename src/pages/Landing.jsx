import { base44 } from '@/api/base44Client';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-10 flex flex-col items-center gap-6 text-center">
        {/* Logo */}
        <img
          src="https://media.base44.com/images/public/69fec6783aa61326b91c656b/2b79ae42c_logo.png"
          alt="Wealth Works"
          className="h-14 w-auto"
        />

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Roger Data</h1>
          <p className="text-sm text-slate-500 mt-1">Client Portfolio Management</p>
        </div>

        {/* Internal notice */}
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-4 py-2.5 text-xs font-medium text-primary">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          Internal Use Only — Wealth Works Staff
        </div>

        {/* Sign in */}
        <Button
          className="w-full"
          onClick={() => base44.auth.redirectToLogin(window.location.origin + '/app')}
        >
          Sign In
        </Button>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        © {new Date().getFullYear()} Wealth Works. All rights reserved.
      </p>
    </div>
  );
}