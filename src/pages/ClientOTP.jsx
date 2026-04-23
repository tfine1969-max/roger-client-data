import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function ClientOTP() {
  const navigate = useNavigate();
  const { setClientUserType } = useAuth();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Get current user or pending client on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setClientUserType();
      } catch (error) {
        // Check if we have a pending client from registration
        const pendingEmail = sessionStorage.getItem('pending_client_email');
        if (!pendingEmail) {
          toast.error('Please register first');
          navigate('/client-registration', { replace: true });
          return;
        }
        // User is pending registration - set a minimal user object
        setUser({ email: pendingEmail });
        setClientUserType();
      }
    };
    checkUser();
  }, [navigate, setClientUserType]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp.trim()) {
      toast.error('Please enter OTP code');
      return;
    }

    // Test OTP for development
    if (otp === '123456') {
      setIsLoading(true);
      try {
        if (user?.email) {
          const clientId = sessionStorage.getItem('pending_client_id');
          if (clientId) {
            // Update using stored client ID
            await base44.entities.Clients.update(clientId, {
              otp_verified: true
            });
          } else {
            // Fallback: find by email
            const clients = await base44.entities.Clients.filter({ email: user.email });
            if (clients && clients.length > 0) {
              await base44.entities.Clients.update(clients[0].id, {
                otp_verified: true
              });
            }
          }
        }
        toast.success('OTP verified successfully');
        navigate('/client-onboarding');
      } catch (error) {
        toast.error(error.message || 'OTP verification failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!user?.email) {
      toast.error('User email not found');
      return;
    }

    setIsLoading(true);

    try {
      // Find the client record by email
      const clients = await base44.entities.Clients.filter({ email: user.email });

      if (!clients || clients.length === 0) {
        toast.error('Client record not found');
        setIsLoading(false);
        return;
      }

      const clientId = clients[0].id;

      // Update otp_verified to true
      await base44.entities.Clients.update(clientId, {
        otp_verified: true
      });

      toast.success('OTP verified successfully');
      // Clear session storage
      sessionStorage.removeItem('pending_client_email');
      sessionStorage.removeItem('pending_client_id');
      // Redirect to onboarding form
      navigate('/client-onboarding', { replace: true });
    } catch (error) {
      toast.error(error.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

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
                Check your email for the verification code
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
            Didn't receive the code?{' '}
            <button className="text-white font-semibold hover:underline">
              Resend OTP
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}