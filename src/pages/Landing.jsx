import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy via-blue-50 to-background flex flex-col">
      {/* Header */}
      <div className="bg-navy border-b border-border/30 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-white">WealthWorks</h1>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
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
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>WealthWorks Advisor Portal — FSP 28337</p>
        </div>
      </div>
    </div>
  );
}