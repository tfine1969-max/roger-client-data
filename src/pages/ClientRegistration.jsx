import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function ClientRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Create Client record and send OTP
    navigate('/client-otp');
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
            <h1 className="text-3xl font-bold text-navy mb-2">Create Account</h1>
            <p className="text-muted-foreground mb-8">Register to begin your onboarding</p>

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

              <div>
                <Label className="text-sm font-semibold text-navy">Password</Label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="mt-1.5 rounded-sm"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-navy">Confirm Password</Label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="mt-1.5 rounded-sm"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-navy text-white py-3 rounded-sm font-medium hover:bg-ocean transition-colors"
              >
                Register
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <button onClick={() => navigate('/advisor-login')} className="text-navy hover:underline font-medium">
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}