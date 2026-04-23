import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ClientOnboardingConfirmation() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-ocean flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Welcome!</h1>
        <p className="text-white/80 mb-8">
          Your account has been successfully set up. You're all ready to get started.
        </p>

        <Button
          onClick={() => navigate('/client-dashboard')}
          className="w-full bg-white text-navy hover:bg-white/90 py-3 rounded-sm font-medium"
        >
          Go to My Profile
        </Button>
      </div>
    </div>
  );
}