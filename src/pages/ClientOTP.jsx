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
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingClientId, setPendingClientId] = useState(null);

  // Verify pending client context on mount
  useEffect(() => {
    const clientId = sessionStorage.getItem('pending_client_id');
    if (!clientId) {
      toast.error('Invalid session. Please register first.');
      navigate('/client-registration', { replace: true });
      return;
    }
    setPendingClientId(clientId);
    setIsInitializing(false);
  }, [navigate]);

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
      // Test OTP code for development: 123456
      if (otp !== '123456') {
        toast.error('Invalid OTP code');
        setIsLoading(false);
        return;
      }

      // Update client record to mark OTP verified
      await base44.entities.Clients.update(pendingClientId, {
        otp_verified: true
      });

      toast.success('OTP verified successfully');
      navigate('/client-onboarding', { replace: true });
    } catch (error) {
      toast.error(error.message || 'OTP verification failed');
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
        {/* Header */}
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

        {/* Form */}
        <form onSubmit={handleVerifyOTP} className="bg-white rounded-lg shadow-xl p-8">
          <div className="space-y-6">
            {/* OTP Input */}
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
              <p className="text-xs text-muted-foreground mt-2">
                (Test code: 123456)
              </p>
            </div>

            {/* Verify Button */}
            <Button
              type="submit"
              disabled={isLoading || !otp.trim()}
              className="w-full bg-navy hover:bg-ocean text-white py-3 rounded-sm font-medium disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/70 text-sm">
            Use test code <span className="font-mono font-bold">123456</span> for development
          </p>
        </div>
      </div>
    </div>
  );
}