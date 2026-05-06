import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('clientOtp', {
        action: 'login',
        email: normalizedEmail,
      });

      const data = result?.data || result;
      if (!data?.success || !data?.client_id) {
        throw new Error(data?.error || 'Login failed');
      }

      sessionStorage.setItem('pending_client_id', data.client_id);
      sessionStorage.setItem('pending_client_email', data.email || normalizedEmail);
      sessionStorage.removeItem('client_session_verified');
      sessionStorage.setItem('pending_onboarding_route', data.onboarding_route || '/client-onboarding');
      toast.success('Verification code sent');
      navigate('/client-otp', { replace: true });
    } catch (error) {
      const details = error?.response?.data?.details || error?.response?.data?.error || error.message;
      toast.error(details || 'Login failed');
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
          <div className="bg-card border border-border rounded-lg p-8">
            <h1 className="text-3xl font-bold text-navy mb-2">Client Login</h1>
            <p className="text-muted-foreground mb-8">Enter your email to receive a verification code</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="text-sm font-semibold text-navy">Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1.5 rounded-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-navy text-white py-3 rounded-sm font-medium hover:bg-ocean transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending code...' : 'Send verification code'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{' '}
              <button onClick={() => navigate('/client-registration')} className="text-navy hover:underline font-medium">
                Register
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
