import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function ClientOTP() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingClientId, setPendingClientId] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    const clientId = sessionStorage.getItem('pending_client_id');
    const email = sessionStorage.getItem('pending_client_email') || '';
    if (!clientId) {
      toast.error('Invalid session. Please register first.');
      navigate('/client-registration', { replace: true });
      return;
    }
    setPendingClientId(clientId);
    setPendingEmail(email);
    setIsInitializing(false);
  }, [navigate]);

  const handleResend = async () => {
    if (!pendingClientId) return;
    setIsResending(true);
    try {
      const result = await base44.functions.invoke('clientOtp', {
        action: 'resend',
        clientId: pendingClientId,
        email: pendingEmail,
      });
      const data = result?.data || result;
      if (!data?.success) throw new Error(data?.error || 'Failed to resend code');
      toast.success('A new code has been sent to your email');
    } catch (err) {
      const details = err?.response?.data?.details || err?.response?.data?.error || err.message;
      toast.error(details || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp.trim()) {
      toast.error('Please enter OTP code');
      return;
    }

    if (!pendingClientId) {
      toast.error('Client session not found');
      return;
    }

    setIsLoading(true);

    try {
      const result = await base44.functions.invoke('clientOtp', {
        action: 'verify',
        clientId: pendingClientId,
        otp: otp.trim(),
      });
      const data = result?.data || result;
      if (!data?.success) throw new Error(data?.error || 'OTP verification failed');

      sessionStorage.setItem('client_session_verified', 'true');
      if (data.email) {
        sessionStorage.setItem('pending_client_email', data.email);
      }

      toast.success('OTP verified successfully');
      const dest = sessionStorage.getItem('pending_onboarding_route') || '/client-onboarding';
      sessionStorage.removeItem('pending_onboarding_route');
      navigate(dest, { replace: true });
    } catch (error) {
      const details = error?.response?.data?.details || error?.response?.data?.error || error.message;
      toast.error(details || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy to-ocean flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-ocean flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <button
            onClick={() => navigate('/client-registration')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-white">OTP Verification</h1>
          <p className="text-white/70 mt-2">Enter the verification code sent to your email</p>
        </div>

        <form onSubmit={handleVerifyOTP} className="bg-white rounded-lg shadow-xl p-8">
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-semibold text-navy mb-2 block">
                OTP Code
              </Label>
              <Input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                className="rounded-sm text-center text-2xl letter-spacing-2 font-mono"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !otp.trim()}
              className="w-full bg-navy hover:bg-ocean text-white py-3 rounded-sm font-medium disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-sm text-navy/70 hover:text-navy transition-colors disabled:opacity-50"
              >
                {isResending ? 'Sending...' : "Didn't receive a code? Resend"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
