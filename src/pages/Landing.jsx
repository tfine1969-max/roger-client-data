import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Users, Briefcase } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [isCreatingTestData, setIsCreatingTestData] = useState(false);
  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === 'app.base44.com');

  const createTestData = async () => {
    setIsCreatingTestData(true);
    try {
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
    <div className="min-h-screen bg-gradient-to-b from-[#1B3A5C] via-[#e8eef4] to-background flex flex-col">

      {/* Navbar */}
      <nav className="bg-[#1B3A5C] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-white text-xl font-light tracking-widest lowercase">wealthworks</span>
          <img
            src="https://media.base44.com/images/public/69e88c566cc0939ea06624c2/b93b73a45_WWleaves.png"
            alt=""
            style={{ height: '50px', mixBlendMode: 'multiply' }}
          />
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-2xl w-full text-center">
          <img
            src="https://media.base44.com/images/public/69e88c566cc0939ea06624c2/48ec7b9f6_logo.png"
            alt="WealthWorks"
            className="mx-auto mb-5"
            style={{ width: '220px', mixBlendMode: 'multiply', background: 'transparent' }}
          />
          <h1 className="text-3xl md:text-4xl font-bold text-navy mb-2 leading-tight">
            WealthWorks Advisory Portal
          </h1>
          <p className="text-xs text-muted-foreground mb-8">
            Powered by Wealth Works (Pty) Ltd | FSP 28337
          </p>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Client Onboarding */}
            <button
              onClick={() => navigate('/client-registration')}
              className="group relative bg-white border border-navy/20 rounded-lg p-7 text-left hover:shadow-lg hover:border-navy/40 transition-all duration-200"
              style={{ boxShadow: '0 2px 12px rgba(27,58,92,0.08)' }}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-md bg-navy flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-navy mb-1">Client Onboarding</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Register as a new client and begin your onboarding journey.
                  </p>
                  <span className="inline-block px-4 py-1.5 bg-navy text-white rounded text-sm font-medium group-hover:bg-ocean transition-colors">
                    Get Started →
                  </span>
                </div>
              </div>
            </button>

            {/* Advisor Portal */}
            <button
              onClick={() => navigate('/advisor-login')}
              className="group relative bg-white border border-navy/20 rounded-lg p-7 text-left hover:shadow-lg hover:border-ocean/40 transition-all duration-200"
              style={{ boxShadow: '0 2px 12px rgba(27,58,92,0.08)' }}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-md bg-ocean flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-navy mb-1">Advisor Portal</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Log in to build and manage financial proposals for your clients.
                  </p>
                  <span className="inline-block px-4 py-1.5 bg-ocean text-white rounded text-sm font-medium group-hover:bg-sky transition-colors">
                    Access Portal →
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#1B3A5C]/10 border-t border-navy/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>Wealth Works (Pty) Ltd | FSP 28337 | Wealthworks Investments (Pty) Ltd | FSP 45624</p>
          <a
            href="https://www.wealthworks.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy font-medium hover:underline"
          >
            Visit wealthworks.co.za →
          </a>
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