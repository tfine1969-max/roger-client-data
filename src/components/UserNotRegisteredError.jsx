import React from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-slate-200 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-primary/10">
          <ShieldAlert className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Access Restricted</h1>
        <p className="text-slate-600 mb-6">
          This is an internal Wealth Works application. Access is granted to staff only.
        </p>
        <p className="text-slate-500 text-sm mb-6">
          Your account is not registered for this application. Please contact your administrator to request access.
        </p>
        <Button variant="outline" onClick={() => base44.auth.logout('/')}>
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;