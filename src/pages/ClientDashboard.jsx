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

  const clientType = client.client_type || 'Natural Person';
  const isTrust = clientType === 'Trust';
  const isCompany = clientType === 'Company';
  const isEntity = isTrust || isCompany;
  const onboardingRoute = isTrust ? '/client-onboarding-trust' : isCompany ? '/client-onboarding-company' : '/client-onboarding';

  const advisoryNeedsStr = Array.isArray(client.advisory_needs) && client.advisory_needs.length > 0
    ? client.advisory_needs.join(', ')
    : '—';

  const fullAddress = [client.street_address, client.suburb, client.city, client.province, client.postal_code]
    .filter(Boolean).join(', ') || '—';

  // Trustees or directors lists
  const personsList = Array.isArray(client.trustees_list)
    ? client.trustees_list
    : Array.isArray(client.directors_list)
    ? client.directors_list
    : [];

  const personsLabel = isTrust ? 'TRUSTEES' : isCompany ? 'DIRECTORS' : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <button onClick={handleLogout} className="flex items-center gap-2 text-muted-foreground hover:text-danger transition-colors text-sm">
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">
              {isEntity ? (client.entity_name || 'Entity Profile') : `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'My Profile'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{clientType}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <StatusBadge status={client.client_status} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-4">

          {/* ── ENTITY PROFILE (Trust / Company) ── */}
          {isEntity && (
            <>
              <div>
                <h2 className="text-xs font-semibold tracking-widest text-ocean uppercase mb-3">
                  {isTrust ? 'TRUST DETAILS' : 'COMPANY DETAILS'}
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {isTrust ? (
                    <>
                      <Field label="Trust Name" value={client.entity_name} />
                      <Field label="Registration Number (IT)" value={client.trust_number} />
                      <Field label="Trust Deed Date" value={client.trust_deed_date} />
                    </>
                  ) : (
                    <>
                      <Field label="Company Name" value={client.entity_name} />
                      <Field label="Registration Number (CIPC)" value={client.registration_number} />
                      <Field label="VAT Number" value={client.vat_number} />
                    </>
                  )}
                  <Field label="Registered Address" value={fullAddress} />
                  <Field label="Contact Email" value={client.email} />
                  <Field label="Contact Mobile" value={client.mobile_number} />
                  <Field label="Risk Profile" value={client.risk_profile} />
                  <Field label="Time Horizon" value={client.time_horizon} />
                  <Field label="Advisory Needs" value={advisoryNeedsStr} />
                </div>
              </div>

              {/* Trustees / Directors list */}
              {personsList.length > 0 && (
                <div className="border-t border-border pt-3">
                  <h2 className="text-xs font-semibold tracking-widest text-ocean uppercase mb-3">{personsLabel}</h2>
                  <div className="space-y-2">
                    {personsList.map((p, idx) => {
                      const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.full_name || '—';
                      const title = p.title ? `${p.title} ` : '';
                      const idNum = p.id_number || p.sa_id_number || '—';
                      return (
                        <div key={idx} className="flex items-center gap-6 border border-border rounded px-3 py-2 bg-background text-sm">
                          <span className="text-muted-foreground text-xs w-20 shrink-0">{isTrust ? 'Trustee' : 'Director'} {idx + 1}</span>
                          <span className="font-medium text-navy">{title}{fullName}</span>
                          <span className="text-muted-foreground font-mono text-xs">{idNum}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── INDIVIDUAL PROFILE ── */}
          {!isEntity && (
            <>
              <div>
                <h2 className="text-xs font-semibold tracking-widest text-ocean uppercase mb-3">CLIENT PROFILE</h2>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="First Name" value={client.first_name} />
                  <Field label="Last Name" value={client.last_name} />
                  <Field label="Date of Birth" value={client.date_of_birth} />
                  <Field label="ID / Passport Number" value={client.sa_id_number || client.passport_number} />
                  <Field label="ID Type" value={client.identity_type} />
                  <Field label="Marital Status" value={client.marital_status} />
                  <Field label="Email Address" value={client.email} />
                  <Field label="Mobile Number" value={client.mobile_number} />
                </div>
              </div>
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
            </>
          )}

          {/* Actions */}
          <div className="border-t border-border pt-3">
            <Button
              onClick={() => navigate(onboardingRoute)}
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