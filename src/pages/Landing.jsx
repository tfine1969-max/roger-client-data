import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1B3A5C] via-[#e8eef4] to-background flex flex-col">
      <nav className="px-6 py-3" style={{ backgroundColor: 'rgb(38, 84, 124)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/69e88c566cc0939ea06624c2/b93b73a45_WWleaves.png"
              alt=""
              style={{ height: '36px' }}
            />
            <span className="text-xl font-light tracking-widest lowercase">
              <span style={{ color: '#ffffff' }}>wealth</span><span style={{ color: '#4A9BAF' }}>works</span>
            </span>
          </div>

          <a
            href="https://www.wealthworks.co.za"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#ffffff', fontSize: 13, textDecoration: 'none', letterSpacing: '0.04em',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 4,
              border: '1.5px solid rgba(255,255,255,0.7)',
              background: 'transparent', transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#4BBFBF'; e.currentTarget.style.borderColor = '#4BBFBF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'; }}
          >
            Visit wealthworks.co.za
          </a>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-8">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    Get Started
                  </span>
                </div>
              </div>
            </button>

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
                    Access Portal
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 text-center text-xs text-muted-foreground">
        <p>Wealth Works (Pty) Ltd | FSP 28337 | Wealthworks Investments (Pty) Ltd | FSP 45624</p>
      </div>
    </div>
  );
}
