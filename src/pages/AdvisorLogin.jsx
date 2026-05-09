import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const clearClientSession = () => {
  sessionStorage.removeItem('pending_client_id');
  sessionStorage.removeItem('pending_client_email');
  sessionStorage.removeItem('pending_entity_type');
  sessionStorage.removeItem('pending_onboarding_route');
  sessionStorage.removeItem('client_session_verified');
};

export default function AdvisorLogin() {
  const navigate = useNavigate();
  const { setAdvisorUserType } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const redirectIfAdvisor = async () => {
      const currentUser = await base44.auth.me().catch(() => null);
      if (!isMounted || currentUser?.role !== 'admin') return;
      clearClientSession();
      setAdvisorUserType();
      navigate('/advisor-dashboard', { replace: true });
    };

    redirectIfAdvisor();

    return () => {
      isMounted = false;
    };
  }, [navigate, setAdvisorUserType]);

  const handleSignIn = async () => {
    setIsLoading(true);
    clearClientSession();

    try {
      const currentUser = await base44.auth.me();

      if (currentUser?.role === 'admin') {
        setAdvisorUserType();
        navigate('/advisor-dashboard', { replace: true });
        return;
      }

      toast.error('Only advisors can access this portal');
    } catch {
      base44.auth.redirectToLogin(`${window.location.origin}/advisor-dashboard`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-6 py-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-md bg-navy flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-navy mb-2">Advisor Login</h1>
            <p className="text-muted-foreground mb-8">
              Sign in with your approved WealthWorks advisor account.
            </p>

            <Button
              type="button"
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full bg-navy text-white py-3 rounded-sm font-medium hover:bg-ocean transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Checking access...' : 'Continue to secure sign-in'}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Not an advisor?{' '}
              <button onClick={() => navigate('/')} className="text-navy hover:underline font-medium">
                Go back
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
