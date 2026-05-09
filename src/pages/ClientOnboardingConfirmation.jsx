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

        <h1 className="text-3xl font-bold text-white mb-3">Thank you!</h1>
        <p className="text-white/80 mb-2">
          Your onboarding documents have been submitted successfully.
        </p>
        <p className="text-white/70 text-sm mb-8">
          Verification is under review. Wealth Works will contact you once your application has been assessed.
        </p>

        <Button
          onClick={() => navigate('/client-dashboard')}
          className="w-full bg-white text-navy hover:bg-white/90 py-3 rounded-sm font-medium"
        >
          Go to My Profile
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            sessionStorage.removeItem('pending_client_id');
            sessionStorage.removeItem('pending_client_email');
            sessionStorage.removeItem('pending_entity_type');
            window.location.href = window.location.origin + '/';
          }}
          className="w-full mt-3 text-white/70 hover:text-white hover:bg-white/10 py-3 rounded-sm font-medium"
        >
          Log out
        </Button>
      </div>
    </div>
  );
}