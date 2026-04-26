import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Landing() {
  const navigate = useNavigate();
  const [isCreatingTestData, setIsCreatingTestData] = useState(false);
  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === 'app.base44.com');

  const createTestData = async () => {
    setIsCreatingTestData(true);
    try {
      // Create test client
      const client = await base44.entities.Clients.create({
        client_source: 'Onboarding',
        client_type: 'Natural Person',
        identity_type: 'SA ID',
        first_name: 'Test',
        last_name: 'Client',
        full_name: 'Test Client',
        sa_id_number: '9012015800086',
        date_of_birth: '1990-12-01',
        email: 'testclient@wealthworks.local',
        mobile_number: '+27821234567',
        residential_address: '123 Test Street, Johannesburg, 2000',
        identity_verified: true,
        proof_of_address_verified: true,
        source_of_funds_confirmed: true,
        beneficial_ownership_verified: true,
        otp_verified: true,
        client_status: 'Onboarded',
        onboarding_complete: true,
      });

      // Create linked proposal
      await base44.entities.Proposals.create({
        client_id: client.id,
        advisor_name: 'Trevor Fine',
        reference: `WW-P-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        proposal_status: 'Pending Review',
        pdf_status: 'No PDF',
        advisor_signature_completed: false,
        client_signature_completed: false,
        client_initials_completed: false,
        document_version: 1,
      });

      toast.success('Test client and proposal created');
    } catch (error) {
      toast.error(error.message || 'Failed to create test data');
    } finally {
      setIsCreatingTestData(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy via-blue-50 to-background flex flex-col">
      {/* Header */}
      <div className="bg-navy border-b border-border/30 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <img src="https://media.base44.com/images/public/69e88c566cc0939ea06624c2/48ec7b9f6_logo.png" alt="WealthWorks" className="h-10 brightness-0 invert" />
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <div className="flex justify-center mb-6">
            <img src="https://media.base44.com/images/public/69e88c566cc0939ea06624c2/48ec7b9f6_logo.png" alt="WealthWorks" style={{ width: '200px' }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-navy mb-4">
            Financial Proposal Platform
          </h2>
          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            Streamline client onboarding, build personalized proposals, and manage financial recommendations with ease.
          </p>

          {/* Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Onboarding Button */}
            <button
              onClick={() => navigate('/client-registration')}
              className="group relative overflow-hidden bg-white border-2 border-navy rounded-lg p-8 hover:shadow-lg transition-all"
            >
              <div className="relative z-10">
                <div className="text-5xl mb-4">👤</div>
                <h3 className="text-2xl font-bold text-navy mb-2">Client Onboarding</h3>
                <p className="text-muted-foreground mb-4">
                  Register as a new client and begin your onboarding journey
                </p>
                <div className="inline-block px-6 py-2 bg-navy text-white rounded font-medium text-sm hover:bg-ocean transition-colors">
                  Get Started →
                </div>
              </div>
              <div className="absolute inset-0 bg-navy/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Advisor Portal Button */}
            <button
              onClick={() => navigate('/advisor-login')}
              className="group relative overflow-hidden bg-white border-2 border-ocean rounded-lg p-8 hover:shadow-lg transition-all"
            >
              <div className="relative z-10">
                <div className="text-5xl mb-4">💼</div>
                <h3 className="text-2xl font-bold text-ocean mb-2">Advisor Portal</h3>
                <p className="text-muted-foreground mb-4">
                  Log in to build and manage financial proposals
                </p>
                <div className="inline-block px-6 py-2 bg-ocean text-white rounded font-medium text-sm hover:bg-sky transition-colors">
                  Access Portal →
                </div>
              </div>
              <div className="absolute inset-0 bg-ocean/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-card border-t border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>WealthWorks Advisor Portal — FSP 28337</p>
          {isDev && (
            <button
              onClick={createTestData}
              disabled={isCreatingTestData}
              className="px-3 py-1 text-xs bg-warn/20 text-warn border border-warn/30 rounded hover:bg-warn/30 disabled:opacity-50"
            >
              {isCreatingTestData ? 'Creating...' : 'Dev: Seed Test Data'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}