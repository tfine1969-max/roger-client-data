import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOtpEmail = async ({ email, otp }) => {
  await base44.integrations.Core.SendEmail({
    from_name: 'WealthWorks',
    to: email,
    subject: 'Your WealthWorks login verification code',
    body: `Your WealthWorks verification code is ${otp}.\n\nThis code expires in 15 minutes.\n\nIf you did not request this code, please ignore this email.`,
  });
};

export default function ClientLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error('Please enter your email address');
      return;
    }
    setIsLoading(true);
    try {
      const clients = await base44.entities.Clients.list();
      const client = clients.find(c => c.email === formData.email);
      if (!client) {
        toast.error('No account found with this email address');
        return;
      }
      const otp = generateOtp();
      await base44.entities.Clients.update(client.id, {
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        otp_verified: false,
      });
      await sendOtpEmail({ email: client.email, otp });

      sessionStorage.setItem('pending_client_id', client.id);
      sessionStorage.setItem('pending_client_email', client.email);
      sessionStorage.setItem('pending_onboarding_route', client.onboarding_complete === true ? '/client-dashboard' : '/client-onboarding');
      toast.success('Verification code sent');
      navigate('/client-otp', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
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
