import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ClientRegistration() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [entityType, setEntityType] = useState('Individual');
  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = formData.email.toLowerCase().trim();
    const mobile = formData.mobile.trim();

    if (!email || !mobile) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const result = await base44.functions.invoke('clientOtp', {
        action: 'register',
        email,
        mobile,
        entityType,
      });

      const data = result?.data || result;
      if (!data?.success || !data?.client_id) {
        throw new Error(data?.error || 'Registration failed');
      }

      sessionStorage.setItem('pending_client_id', data.client_id);
      sessionStorage.setItem('pending_client_email', email);
      sessionStorage.setItem('pending_entity_type', entityType);
      sessionStorage.removeItem('client_session_verified');

      toast.success('Account created. Verify your OTP to continue.');
      sessionStorage.setItem('pending_onboarding_route', data.onboarding_route || '/client-onboarding');
      navigate('/client-otp', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Registration failed');
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
        <div className="w-full max-w-lg">
          <div className="bg-card border border-border rounded-lg p-8">
            <h1 className="text-3xl font-bold text-navy mb-2">Create Account</h1>
            <p className="text-muted-foreground mb-8">Register to begin your onboarding</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="text-sm font-semibold text-navy">I am registering as</Label>
                <div className="flex gap-2 mt-1.5">
                  {['Individual', 'Trust', 'Company'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEntityType(type)}
                      className={`flex-1 py-2 text-sm font-medium border rounded-sm transition-all ${
                        entityType === type ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

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

              <div>
                <Label className="text-sm font-semibold text-navy">Mobile Number</Label>
                <Input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="+27 ..."
                  required
                  className="mt-1.5 rounded-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-navy text-white py-3 rounded-sm font-medium hover:bg-ocean transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending code...' : 'Register'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <button onClick={() => navigate('/client-login')} className="text-navy hover:underline font-medium">
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
