import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const clientId = sessionStorage.getItem('pending_client_id');
    
    const loadClient = async () => {
      try {
        const clients = await base44.entities.Clients.list();
        let found = null;
        
        if (clientId) {
          found = clients.find(c => c.id === clientId);
        }
        
        // Fallback — try to match by logged in user email
        if (!found) {
          const user = await base44.auth.me().catch(() => null);
          if (user?.email) {
            found = clients.find(c => c.email === user.email);
            if (found) {
              sessionStorage.setItem('pending_client_id', found.id);
            }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-navy mb-8">My Profile</h1>

        <div className="bg-card border border-border rounded-lg p-8 space-y-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-xl font-semibold text-navy mb-4">Personal Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {client.client_type === 'Natural Person' && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">First Name</p>
                    <p className="text-lg font-medium text-navy">{client.first_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Name</p>
                    <p className="text-lg font-medium text-navy">{client.last_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="text-lg font-medium text-navy">{client.date_of_birth || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID Type</p>
                    <p className="text-lg font-medium text-navy">{client.identity_type || '—'}</p>
                  </div>
                  {client.sa_id_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">SA ID Number</p>
                      <p className="text-lg font-medium text-navy">{client.sa_id_number}</p>
                    </div>
                  )}
                  {client.passport_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">Passport Number</p>
                      <p className="text-lg font-medium text-navy">{client.passport_number}</p>
                    </div>
                  )}
                </>
              )}
              {client.client_type === 'Company' && (
                <>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="text-lg font-medium text-navy">{client.entity_name || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Registration Number</p>
                    <p className="text-lg font-medium text-navy">{client.registration_number || '—'}</p>
                  </div>
                </>
              )}
              {client.client_type === 'Trust' && (
                <>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Trust Name</p>
                    <p className="text-lg font-medium text-navy">{client.entity_name || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Trust Number</p>
                    <p className="text-lg font-medium text-navy">{client.trust_number || '—'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t border-border pt-6">
            <h2 className="text-xl font-semibold text-navy mb-4">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="text-lg font-medium text-navy">{client.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mobile Number</p>
                <p className="text-lg font-medium text-navy">{client.mobile_number || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Residential Address</p>
                <p className="text-lg font-medium text-navy">{client.residential_address || '—'}</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="border-t border-border pt-6">
            <h2 className="text-xl font-semibold text-navy mb-4">Account Status</h2>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-medium text-navy">{client.client_status || 'Draft'}</p>
            </div>
          </div>

          {/* Action Button */}
          <div className="border-t border-border pt-6">
            <Button
              onClick={() => navigate('/client-onboarding')}
              className="w-full bg-navy hover:bg-ocean text-white py-3 rounded-sm font-medium flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}