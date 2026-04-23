import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdvisorLogin() {
  const navigate = useNavigate();
  const { setAdvisorUserType } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      // Verify user exists and has admin role (advisor)
      const currentUser = await base44.auth.me();
      
      if (!currentUser || currentUser.role !== 'admin') {
        toast.error('Only advisors can access this portal');
        setIsLoading(false);
        return;
      }

      // Set advisor type
      setAdvisorUserType();
      toast.success('Welcome back!');
      navigate('/proposals', { replace: true });
    } catch (error) {
      toast.error('Login failed');
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
            <h1 className="text-3xl font-bold text-navy mb-2">Advisor Login</h1>
            <p className="text-muted-foreground mb-8">Access the proposal building portal</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="text-sm font-semibold text-navy">Email Address</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="advisor@wealthworks.co.za"
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-navy text-white py-3 rounded-sm font-medium hover:bg-ocean transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

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