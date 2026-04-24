import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className="text-sm font-medium text-navy mt-0.5">{value || '—'}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const isOnboarded = status === 'Onboarded' || status === 'Active';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${isOnboarded ? 'bg-teal/15 text-teal' : 'bg-amber-100 text-amber-700'}`}>
      {status || 'Draft'}
    </span>
  );
};

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const clientId = sessionStorage.getItem('pending_client_id');

    const loadClient = async () => {
      try {
        const clients = await base44.entities.Clients.list();
        let found = clientId ? clients.find(c => c.id === clientId) : null;

        if (!found) {
          const user = await base44.auth.me().catch(() => null);
          if (user?.email) {
            found = clients.find(c => c.email === user.email);
            if (found) sessionStorage.setItem('pending_client_id', found.id);
          }
        }

        if (found) {
          setClient(found);
        } else {
          toast.error('Client record not found');
          navigate('/client-login', { replace: true });
        }
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadClient();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('pending_client_id');
    sessionStorage.removeItem('pending_client_email');
    navigate('/', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    );
  }

  if (!client) return null;

  const idNumber = client.sa_id_number || client.passport_number;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-muted-foreground hover:text-danger transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-navy">My Profile</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Account status:</span>
            <StatusBadge status={client.client_status} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-4">

          {/* Client Profile */}
          <div>
            <h2 className="text-xs font-semibold tracking-widest text-ocean uppercase mb-3">CLIENT PROFILE</h2>
            <div className="grid grid-cols-3 gap-3">
              <Field label="First Name" value={client.first_name} />
              <Field label="Last Name" value={client.last_name} />
              <Field label="Date of Birth" value={client.date_of_birth} />
              <Field label="ID / Passport Number" value={idNumber} />
              <Field label="ID Type" value={client.identity_type} />
              <Field label="Marital Status" value={client.marital_status} />
              <Field label="Email Address" value={client.email} />
              <Field label="Mobile Number" value={client.mobile_number} />
              <Field label="Industry" value={client.industry} />
            </div>
          </div>

          {/* Address */}
          <div className="border-t border-border pt-3">
            <h2 className="text-xs font-semibold tracking-widest text-ocean uppercase mb-3">RESIDENTIAL ADDRESS</h2>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Street Address" value={client.street_address} />
              <Field label="Suburb" value={client.suburb} />
              <Field label="City" value={client.city} />
              <Field label="Province" value={client.province} />
              <Field label="Postal Code" value={client.postal_code} />
            </div>
          </div>

          {/* Financial Profile */}
          <div className="border-t border-border pt-3">
            <h2 className="text-xs font-semibold tracking-widest text-ocean uppercase mb-3">FINANCIAL PROFILE</h2>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Employment Status" value={client.employment_status} />
              <Field label="Occupation" value={client.occupation} />
              <Field label="Employer / Business" value={client.employer} />
              <Field label="Risk Profile" value={client.risk_profile} />
              <Field label="Time Horizon" value={client.time_horizon} />
              <Field label="Annual Income Band" value={client.gross_annual_income_band} />
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <Button
              onClick={() => navigate('/client-onboarding')}
              className="bg-navy hover:bg-ocean text-white px-6 h-9 text-sm rounded-sm"
            >
              Update my information
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}