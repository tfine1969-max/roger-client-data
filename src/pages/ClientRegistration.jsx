import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────
// 🧪 TEST MODE — Set to false before go-live
const TEST_MODE = true;
// ─────────────────────────────────────────────────────────────

const TEST_PROFILES = [
  {
    label: 'James Petersen',
    sub: 'Individual',
    email: 'james.individual@test.co.za',
    mobile: '0821234567',
    onboarding: {
      client_type: 'Natural Person',
      identity_type: 'SA ID',
      first_name: 'James',
      last_name: 'Petersen',
      sa_id_number: '8001015009087',
      date_of_birth: '1980-01-01',
      mobile_number: '0821234567',
      street_address: '12 Oak Avenue',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'Gauteng',
      postal_code: '2196',
      risk_profile: 'Moderate',
      time_horizon: '5–10 years',
      advisory_needs: ['Local and offshore investments', 'Retirement planning'],
      gross_annual_income_band: 'R750,000 – R1.5m',
      monthly_investable_surplus: 'R15,000 – R50,000',
      primary_investment_objective: 'Moderate growth',
    },
  },
  {
    label: 'Sarah Nkosi',
    sub: 'Individual',
    email: 'sarah.individual@test.co.za',
    mobile: '0839876543',
    onboarding: {
      client_type: 'Natural Person',
      identity_type: 'SA ID',
      first_name: 'Sarah',
      last_name: 'Nkosi',
      sa_id_number: '9203220459083',
      date_of_birth: '1992-03-22',
      mobile_number: '0839876543',
      street_address: '45 Protea Street',
      suburb: 'Cape Town',
      city: 'Cape Town',
      province: 'Western Cape',
      postal_code: '8001',
      risk_profile: 'Growth',
      time_horizon: '10+ years',
      advisory_needs: ['Local and offshore investments', 'Estate planning'],
      gross_annual_income_band: 'R750,000 – R1.5m',
      monthly_investable_surplus: 'Over R50,000',
      primary_investment_objective: 'Aggressive growth',
    },
  },
  {
    label: 'Blue Family Trust',
    sub: '2 trustees',
    email: 'blue.trust@test.co.za',
    mobile: '0821234567',
    onboarding: {
      client_type: 'Trust',
      identity_type: 'Trust',
      entity_name: 'Blue Family Trust',
      trust_number: 'IT1234/2015',
      street_address: '8 Willow Road',
      suburb: 'Pretoria',
      city: 'Pretoria',
      province: 'Gauteng',
      postal_code: '0181',
      risk_profile: 'Cautious',
      time_horizon: '3–5 years',
      advisory_needs: ['Estate planning', 'Tax planning'],
      gross_annual_income_band: 'Over R3m',
      monthly_investable_surplus: 'Over R50,000',
      primary_investment_objective: 'Income generation',
    },
    trustees: [
      { title: 'Mr', first_name: 'James', last_name: 'Petersen', identity_type: 'SA ID', id_number: '8001015009087', date_of_birth: '01-01-1980', gender: 'Male', marital_status: 'Married', nationality: 'South African', email: 'james.petersen@test.co.za', mobile: '0821234567', street_address: '12 Oak Avenue', suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng', postal_code: '2196' },
      { title: 'Mrs', first_name: 'Mary', last_name: 'Petersen', identity_type: 'SA ID', id_number: '7605120089082', date_of_birth: '12-05-1976', gender: 'Female', marital_status: 'Married', nationality: 'South African', email: 'mary.petersen@test.co.za', mobile: '0821234568', street_address: '12 Oak Avenue', suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng', postal_code: '2196' },
    ],
  },
  {
    label: 'Green Legacy Trust',
    sub: '3 trustees',
    email: 'green.trust@test.co.za',
    mobile: '0821234567',
    onboarding: {
      client_type: 'Trust',
      identity_type: 'Trust',
      entity_name: 'Green Legacy Trust',
      trust_number: 'IT5678/2018',
      street_address: '22 Fern Lane',
      suburb: 'Durban',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      postal_code: '4001',
      risk_profile: 'Aggressive',
      time_horizon: '10+ years',
      advisory_needs: ['Local and offshore investments', 'Retirement planning', 'Estate planning'],
      gross_annual_income_band: 'Over R3m',
      monthly_investable_surplus: 'Over R50,000',
      primary_investment_objective: 'Aggressive growth',
    },
    trustees: [
      { title: 'Mr', first_name: 'David', last_name: 'Green', identity_type: 'SA ID', id_number: '7703085009081', date_of_birth: '08-03-1977', gender: 'Male', marital_status: 'Married', nationality: 'South African', email: 'david.green@test.co.za', mobile: '0831234567', street_address: '22 Fern Lane', suburb: 'Durban', city: 'Durban', province: 'KwaZulu-Natal', postal_code: '4001' },
      { title: 'Mrs', first_name: 'Linda', last_name: 'Green', identity_type: 'SA ID', id_number: '8106150089086', date_of_birth: '15-06-1981', gender: 'Female', marital_status: 'Married', nationality: 'South African', email: 'linda.green@test.co.za', mobile: '0831234568', street_address: '22 Fern Lane', suburb: 'Durban', city: 'Durban', province: 'KwaZulu-Natal', postal_code: '4001' },
      { title: 'Mr', first_name: 'Kevin', last_name: 'Dlamini', identity_type: 'SA ID', id_number: '8809205009083', date_of_birth: '20-09-1988', gender: 'Male', marital_status: 'Single', nationality: 'South African', email: 'kevin.dlamini@test.co.za', mobile: '0831234569', street_address: '5 Palm Street', suburb: 'Durban', city: 'Durban', province: 'KwaZulu-Natal', postal_code: '4052' },
    ],
  },
  {
    label: 'Alpha Investments',
    sub: '(Pty) Ltd · 2 directors',
    email: 'alpha.company@test.co.za',
    mobile: '0821234567',
    onboarding: {
      client_type: 'Company',
      identity_type: 'Registration',
      entity_name: 'Alpha Investments (Pty) Ltd',
      registration_number: '2015/123456/07',
      street_address: '100 West Street',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'Gauteng',
      postal_code: '2196',
      risk_profile: 'Growth',
      time_horizon: '5–10 years',
      advisory_needs: ['Local and offshore investments', 'Tax planning'],
      gross_annual_income_band: 'Over R3m',
      monthly_investable_surplus: 'Over R50,000',
      primary_investment_objective: 'Aggressive growth',
    },
    directors: [
      { title: 'Mr', first_name: 'Michael', last_name: 'Adams', identity_type: 'SA ID', id_number: '7504105009089', date_of_birth: '10-04-1975', gender: 'Male', marital_status: 'Married', nationality: 'South African', email: 'michael.adams@test.co.za', mobile: '0841234567', street_address: '100 West Street', suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng', postal_code: '2196' },
      { title: 'Ms', first_name: 'Priya', last_name: 'Patel', identity_type: 'SA ID', id_number: '8307220459081', date_of_birth: '22-07-1983', gender: 'Female', marital_status: 'Single', nationality: 'South African', email: 'priya.patel@test.co.za', mobile: '0841234568', street_address: '34 Elm Close', suburb: 'Johannesburg', city: 'Johannesburg', province: 'Gauteng', postal_code: '2001' },
    ],
  },
  {
    label: 'Beta Holdings',
    sub: '(Pty) Ltd · 3 directors',
    email: 'beta.company@test.co.za',
    mobile: '0821234567',
    onboarding: {
      client_type: 'Company',
      identity_type: 'Registration',
      entity_name: 'Beta Holdings (Pty) Ltd',
      registration_number: '2018/789012/07',
      street_address: '55 Bree Street',
      suburb: 'Cape Town',
      city: 'Cape Town',
      province: 'Western Cape',
      postal_code: '8001',
      risk_profile: 'Moderate',
      time_horizon: '3–5 years',
      advisory_needs: ['Local and offshore investments', 'Retirement planning', 'Tax planning'],
      gross_annual_income_band: 'Over R3m',
      monthly_investable_surplus: 'Over R50,000',
      primary_investment_objective: 'Moderate growth',
    },
    directors: [
      { title: 'Mr', first_name: 'Robert', last_name: 'Chen', identity_type: 'SA ID', id_number: '7901155009082', date_of_birth: '15-01-1979', gender: 'Male', marital_status: 'Married', nationality: 'South African', email: 'robert.chen@test.co.za', mobile: '0851234567', street_address: '55 Bree Street', suburb: 'Cape Town', city: 'Cape Town', province: 'Western Cape', postal_code: '8001' },
      { title: 'Ms', first_name: 'Fatima', last_name: 'Moosa', identity_type: 'SA ID', id_number: '8504280459084', date_of_birth: '28-04-1985', gender: 'Female', marital_status: 'Single', nationality: 'South African', email: 'fatima.moosa@test.co.za', mobile: '0851234568', street_address: '18 Signal Hill Road', suburb: 'Cape Town', city: 'Cape Town', province: 'Western Cape', postal_code: '8001' },
      { title: 'Mr', first_name: 'Themba', last_name: 'Zulu', identity_type: 'SA ID', id_number: '9112085009086', date_of_birth: '08-12-1991', gender: 'Male', marital_status: 'Single', nationality: 'South African', email: 'themba.zulu@test.co.za', mobile: '0851234569', street_address: '7 Blouberg Rise', suburb: 'Cape Town', city: 'Cape Town', province: 'Western Cape', postal_code: '7441' },
    ],
  },
];

export default function ClientRegistration() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [entityType, setEntityType] = useState('Individual');
  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Quick-fill: populate email, mobile, password fields and store onboarding seed
  const handleQuickFill = (profile) => {
    setFormData({
      email: profile.email,
      mobile: profile.mobile,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
    });
    // Set entity type based on profile
    const ct = profile.onboarding?.client_type || 'Natural Person';
    if (ct === 'Trust') setEntityType('Trust');
    else if (ct === 'Company') setEntityType('Company');
    else setEntityType('Individual');
    // Store onboarding seed so ClientOnboarding can pre-populate
    sessionStorage.setItem('test_onboarding_seed', JSON.stringify(profile.onboarding));
    if (profile.trustees) sessionStorage.setItem('test_trustees_seed', JSON.stringify(profile.trustees));
    if (profile.directors) sessionStorage.setItem('test_directors_seed', JSON.stringify(profile.directors));
    toast.success(`Filled with ${profile.label} test data`);
  };

  const isTestEmail = (email) => email.toLowerCase().trim().endsWith('@test.co.za');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.mobile || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Check if a client record already exists for this email
      const allClients = await base44.entities.Clients.list();
      const existing = allClients.find(c => {
        const clientEmail = (c.email || c.client_email || '').toLowerCase().trim();
        return clientEmail === formData.email.toLowerCase().trim();
      });

      let clientId;

      if (existing) {
        clientId = existing.id;
        toast.success('Welcome back. Continue your onboarding.');
      } else {
        const clientRecord = await base44.entities.Clients.create({
          email: formData.email,
          mobile_number: formData.mobile,
          client_status: 'Draft',
          otp_verified: false,
        });
        clientId = clientRecord.id;
      }

      sessionStorage.setItem('pending_client_id', clientId);
      sessionStorage.setItem('pending_client_email', formData.email);
      sessionStorage.setItem('pending_entity_type', entityType);

      // Persist entity type on the client record
      const clientTypeMap = { Individual: 'Natural Person', Trust: 'Trust', Company: 'Company' };
      await base44.entities.Clients.update(clientId, { client_type: clientTypeMap[entityType] || 'Natural Person' });

      const onboardingRoute = entityType === 'Trust' ? '/client-onboarding-trust'
        : entityType === 'Company' ? '/client-onboarding-company'
        : '/client-onboarding';

      // TEST MODE: skip OTP for @test.co.za emails
      if (TEST_MODE && isTestEmail(formData.email)) {
        await base44.entities.Clients.update(clientId, { otp_verified: true });
        toast.success('Test email — OTP skipped. Proceeding to onboarding.');
        navigate(onboardingRoute, { replace: true });
      } else {
        toast.success('Account created. Verify your OTP to continue.');
        // Store destination so OTP page knows where to redirect
        sessionStorage.setItem('pending_onboarding_route', onboardingRoute);
        navigate('/client-otp', { replace: true });
      }
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
        <div className="w-full max-w-lg">

          {/* ── TEST MODE BANNER ── */}
          {TEST_MODE && (
            <div className="mb-4 border-2 border-amber-400 bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🧪</span>
                <span className="font-bold text-amber-800 text-sm tracking-wide uppercase">TEST MODE — Remove before go-live</span>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                Click a profile to auto-fill all fields. <code className="bg-amber-100 px-1 rounded font-mono">@test.co.za</code> emails skip OTP automatically.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TEST_PROFILES.map((profile) => (
                  <button
                    key={profile.email}
                    type="button"
                    onClick={() => handleQuickFill(profile)}
                    className="text-left px-3 py-2 bg-white border border-amber-300 rounded hover:bg-amber-100 hover:border-amber-500 transition-all"
                  >
                    <div className="text-xs font-semibold text-amber-900">{profile.label}</div>
                    <div className="text-[10px] text-amber-600">{profile.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-lg p-8">
            <h1 className="text-3xl font-bold text-navy mb-2">Create Account</h1>
            <p className="text-muted-foreground mb-8">Register to begin your onboarding</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Entity Type */}
              <div>
                <Label className="text-sm font-semibold text-navy">I am registering as</Label>
                <div className="flex gap-2 mt-1.5">
                  {['Individual', 'Trust', 'Company'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEntityType(type)}
                      className={`flex-1 py-2 text-sm font-medium border rounded-sm transition-all ${
                        entityType === type ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-navy">Email Address</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="mt-1.5 rounded-sm"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-navy">Mobile Number</Label>
                <Input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="+27 ..."
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

              <div>
                <Label className="text-sm font-semibold text-navy">Confirm Password</Label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
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
                {isLoading ? 'Checking account...' : 'Register'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <button onClick={() => navigate('/client-login')} className="text-navy hover:underline font-medium">
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}