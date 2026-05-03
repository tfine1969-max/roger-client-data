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
const TEST_DATA_VERSION = 'Test data v2';
// ─────────────────────────────────────────────────────────────

const testDocUrl = (slug, doc) => `https://wealthworks.test/documents/${slug}/${doc}.pdf`;
const makeFicaReference = (seed) => `FICA-2026-${seed}-ZA`;

const enrichTestProfile = (profile, index) => {
  const slug = profile.email.split('@')[0].replace(/\./g, '-');
  const now = new Date().toISOString();
  const isIndividual = profile.onboarding.client_type === 'Natural Person';
  const isTrust = profile.onboarding.client_type === 'Trust';
  const isCompany = profile.onboarding.client_type === 'Company';
  const common = {
    client_source: 'Onboarding',
    email: profile.email,
    mobile_number: profile.mobile,
    doc_identity: testDocUrl(slug, 'identity'),
    doc_identity_name: `${slug}-identity-front.pdf`,
    doc_identity_back: testDocUrl(slug, 'identity-back'),
    doc_identity_back_name: `${slug}-identity-back.pdf`,
    doc_proof_of_address: testDocUrl(slug, 'proof-of-address'),
    doc_proof_of_address_name: `${slug}-proof-of-address.pdf`,
    doc_source_of_funds: testDocUrl(slug, 'source-of-funds'),
    doc_source_of_funds_name: `${slug}-source-of-funds.pdf`,
    doc_existing_policies: testDocUrl(slug, 'existing-policies'),
    doc_existing_policies_name: `${slug}-existing-policies.pdf`,
    doc_status: 'Submitted',
    doc_submitted_at: now,
    fica_status: 'Approved',
    fica_reference: makeFicaReference(23000 + index * 137),
    fica_risk_band: profile.onboarding.risk_profile === 'Aggressive' ? 'High' : 'Medium',
    fica_verified_at: now,
    home_affairs_verified: true,
    aml_pep_clear: true,
    rmcp_risk_score: profile.onboarding.risk_profile === 'Aggressive' ? 68 : profile.onboarding.risk_profile === 'Growth' ? 53 : 38,
    rmcp_risk_band: profile.onboarding.risk_profile === 'Aggressive' ? 'High' : 'Medium',
    rmcp_scored_at: now,
    rmcp_score_breakdown: JSON.stringify({ client_factor: 0, geography_factor: 25, product_factor: 15, transaction_factor: 10, behaviour_factor: 3 }),
    fica_checks_json: JSON.stringify({
      home_affairs_id: { status: 'pass', label: 'Home Affairs ID' },
      aml_pep_screen: { status: 'pass', label: 'AML / PEP screen' },
      consumer_trace: { status: 'pass', label: 'Address verification' },
      document_auth: { status: 'pass', label: 'Document authentication' },
      risk_score: { status: 'pass', label: 'Risk classification' },
    }),
  };
  const individualDefaults = isIndividual ? {
    title: profile.label.startsWith('Sarah') ? 'Ms' : 'Mr',
    full_name: profile.label,
    marital_status: profile.label.startsWith('Sarah') ? 'Single' : 'Married',
    dependants: profile.label.startsWith('Sarah') ? '0' : '2',
    employment_status: 'Employed',
    occupation: profile.label.startsWith('Sarah') ? 'Investment Analyst' : 'Senior Project Manager',
    employer: profile.label.startsWith('Sarah') ? 'Cape Capital Partners' : 'Petersen Engineering',
    industry: 'Financial Services',
    source_of_funds: ['Salary', 'Investment returns'],
    sa_tax_number: profile.label.startsWith('Sarah') ? '9234567890' : '8012345678',
    tax_residency: 'South Africa only',
    us_person_fatca: 'No',
    pep_status: 'No',
    net_worth_band: profile.label.startsWith('Sarah') ? 'R2m - R5m' : 'R1m - R2m',
    total_liabilities: profile.label.startsWith('Sarah') ? 'Under R500,000' : 'R500k - R1m',
    existing_financial_products: [
      { provider: 'Allan Gray', product_type: 'Unit trust / CIS', product_name: 'Balanced Fund', current_value: '850000', monthly_contribution: '10000', notes: 'Core investment portfolio' },
      { provider: 'Discovery', product_type: 'Retirement annuity', product_name: 'RA', current_value: '620000', monthly_contribution: '7500', notes: 'Retirement savings' },
    ],
    products_list: [
      { provider: 'Allan Gray', product_type: 'Unit trust / CIS', product_name: 'Balanced Fund', current_value: '850000', monthly_contribution: '10000', notes: 'Core investment portfolio' },
      { provider: 'Discovery', product_type: 'Retirement annuity', product_name: 'RA', current_value: '620000', monthly_contribution: '7500', notes: 'Retirement savings' },
    ],
    loa_uploaded: true,
    loa_authorised: true,
    will_in_place: 'Yes',
    identity_document_uploaded: true,
    identity_document_front_uploaded: true,
    identity_document_front_uploaded_name: `${slug}-identity-front.pdf`,
    identity_document_back_uploaded: true,
    identity_document_back_uploaded_name: `${slug}-identity-back.pdf`,
    proof_of_address_uploaded: true,
    income_proof_uploaded: true,
    existing_policies_uploaded: true,
    liquidity_requirement: 'Access within 3 years',
    client_signature_name: profile.label,
    client_signature_date: now.split('T')[0],
  } : {};
  const trustDefaults = isTrust ? {
    trust_type: profile.label.startsWith('Blue') ? 'Inter Vivos Trust' : 'Testamentary Trust',
    trust_deed_date: profile.label.startsWith('Blue') ? '2015-06-15' : '2018-09-20',
    contact_trustee_name: profile.trustees?.[0] ? `${profile.trustees[0].first_name} ${profile.trustees[0].last_name}` : '',
    trust_deed_uploaded: true,
    loa_uploaded: true,
    trust_proof_of_address_uploaded: true,
    trust_bank_statement_uploaded: true,
    trust_purpose: profile.label.startsWith('Blue') ? 'Family wealth preservation and intergenerational planning' : 'Legacy investment and beneficiary support',
    trust_source_of_funds: ['Trust income', 'Investment returns'],
    entity_source_of_funds: ['Trust income', 'Investment returns'],
    beneficiary_declaration: profile.label.startsWith('Blue') ? 'James Petersen, Mary Petersen, Petersen children' : 'David Green, Linda Green, Green Legacy beneficiaries',
    entity_tax_number: profile.label.startsWith('Blue') ? '9123456780' : '9345678901',
    entity_tax_residency: 'South Africa only',
    entity_fatca: 'No',
    entity_pep: 'No',
    trust_asset_value_band: profile.label.startsWith('Blue') ? 'R2m - R10m' : 'R10m - R50m',
    trust_income_band: 'R750,000 - R1.5m',
    entity_total_liabilities: 'R500k - R1m',
    entity_existing_products: 'Existing local unit trust portfolio, offshore endowment and money market account.',
    existing_products_notes: 'Existing local unit trust portfolio, offshore endowment and money market account.',
    entity_loa_uploaded: true,
    entity_loa_authorised: true,
    liquidity_requirement: 'Long-term - no immediate need',
  } : {};
  const companyDefaults = isCompany ? {
    vat_number: profile.label.startsWith('Alpha') ? '4123456789' : '4321098765',
    cipc_registration_uploaded: true,
    moi_uploaded: true,
    proof_of_address_uploaded: true,
    financial_statements_uploaded: true,
    business_activity: profile.label.startsWith('Alpha') ? 'Investment holding company and advisory services' : 'Property and investment holding company',
    entity_source_of_funds: ['Business income', 'Investment returns'],
    ubo_declaration: profile.directors?.map((d, idx) => `${d.first_name} ${d.last_name} - ${idx === 0 ? '55' : idx === 1 ? '30' : '15'}%`).join('; '),
    entity_tax_number: profile.label.startsWith('Alpha') ? '9012345678' : '8901234567',
    entity_tax_residency: 'South Africa only',
    entity_fatca: 'No',
    entity_pep: 'No',
    gross_annual_turnover: profile.label.startsWith('Alpha') ? 'R5m - R20m' : 'R20m - R50m',
    total_assets_band: profile.label.startsWith('Alpha') ? 'R10m - R50m' : 'Over R50m',
    entity_total_liabilities: 'R1m - R3m',
    existing_products_notes: 'Corporate money market account, local equity portfolio and key-person risk policies.',
    entity_loa_uploaded: true,
    entity_loa_authorised: true,
    liquidity_requirement: 'Access within 3 years',
  } : {};
  const trustees = profile.trustees?.map((person, idx) => ({
    ...person,
    id_uploaded: true,
    addr_uploaded: true,
    id_file_url: testDocUrl(slug, `trustee-${idx + 1}-id`),
    id_file_name: `${slug}-trustee-${idx + 1}-id.pdf`,
    id_front_uploaded: true,
    id_front_file_url: testDocUrl(slug, `trustee-${idx + 1}-id-front`),
    id_front_file_name: `${slug}-trustee-${idx + 1}-id-front.pdf`,
    id_back_uploaded: true,
    id_back_file_url: testDocUrl(slug, `trustee-${idx + 1}-id-back`),
    id_back_file_name: `${slug}-trustee-${idx + 1}-id-back.pdf`,
    addr_file_url: testDocUrl(slug, `trustee-${idx + 1}-address`),
    addr_file_name: `${slug}-trustee-${idx + 1}-address.pdf`,
  }));
  const directors = profile.directors?.map((person, idx) => ({
    ...person,
    id_uploaded: true,
    addr_uploaded: true,
    id_file_url: testDocUrl(slug, `director-${idx + 1}-id`),
    id_file_name: `${slug}-director-${idx + 1}-id.pdf`,
    id_front_uploaded: true,
    id_front_file_url: testDocUrl(slug, `director-${idx + 1}-id-front`),
    id_front_file_name: `${slug}-director-${idx + 1}-id-front.pdf`,
    id_back_uploaded: true,
    id_back_file_url: testDocUrl(slug, `director-${idx + 1}-id-back`),
    id_back_file_name: `${slug}-director-${idx + 1}-id-back.pdf`,
    addr_file_url: testDocUrl(slug, `director-${idx + 1}-address`),
    addr_file_name: `${slug}-director-${idx + 1}-address.pdf`,
  }));
  const relatedUploadFlags = {
    ...(trustees || []).reduce((acc, _, idx) => ({
      ...acc,
      [`trustee_${idx}_id_uploaded`]: true,
      [`trustee_${idx}_id_front_uploaded`]: true,
      [`trustee_${idx}_id_back_uploaded`]: true,
      [`trustee_${idx}_addr_uploaded`]: true,
    }), {}),
    ...(directors || []).reduce((acc, _, idx) => ({
      ...acc,
      [`director_${idx}_id_uploaded`]: true,
      [`director_${idx}_id_front_uploaded`]: true,
      [`director_${idx}_id_back_uploaded`]: true,
      [`director_${idx}_addr_uploaded`]: true,
    }), {}),
  };
  return {
    ...profile,
    trustees,
    directors,
    onboarding: { ...common, ...individualDefaults, ...trustDefaults, ...companyDefaults, ...relatedUploadFlags, ...profile.onboarding },
  };
};

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
  {
    label: 'Lerato Mokoena',
    sub: 'Individual',
    email: 'lerato.individual@test.co.za',
    mobile: '0825550101',
    onboarding: {
      client_type: 'Natural Person',
      identity_type: 'SA ID',
      first_name: 'Lerato',
      last_name: 'Mokoena',
      sa_id_number: '8803145123084',
      date_of_birth: '1988-03-14',
      mobile_number: '0825550101',
      street_address: '14 Oak Avenue',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'Gauteng',
      postal_code: '2196',
      risk_profile: 'Cautious',
      time_horizon: '3-5 years',
      advisory_needs: ['Retirement planning', 'Life & risk cover'],
      gross_annual_income_band: 'R350,000 - R750,000',
      monthly_investable_surplus: 'R5,000 - R15,000',
      primary_investment_objective: 'Income generation',
    },
  },
  {
    label: 'Anika van Wyk',
    sub: 'Individual',
    email: 'anika.individual@test.co.za',
    mobile: '0825550102',
    onboarding: {
      client_type: 'Natural Person',
      identity_type: 'SA ID',
      first_name: 'Anika',
      last_name: 'van Wyk',
      sa_id_number: '9007250459087',
      date_of_birth: '1990-07-25',
      mobile_number: '0825550102',
      street_address: '9 Vineyard Close',
      suburb: 'Stellenbosch',
      city: 'Stellenbosch',
      province: 'Western Cape',
      postal_code: '7600',
      risk_profile: 'Growth',
      time_horizon: '10+ years',
      advisory_needs: ['Local and offshore investments', 'Estate planning', 'Tax planning'],
      gross_annual_income_band: 'R1.5m - R3m',
      monthly_investable_surplus: 'R15,000 - R50,000',
      primary_investment_objective: 'Moderate growth',
    },
  },
  {
    label: 'Ubuntu Education Trust',
    sub: '2 trustees',
    email: 'ubuntu.trust@test.co.za',
    mobile: '0825550103',
    onboarding: {
      client_type: 'Trust',
      identity_type: 'Trust',
      entity_name: 'Ubuntu Education Trust',
      trust_number: 'IT2468/2020',
      street_address: '3 Library Lane',
      suburb: 'Rosebank',
      city: 'Johannesburg',
      province: 'Gauteng',
      postal_code: '2196',
      risk_profile: 'Moderate',
      time_horizon: '5-10 years',
      advisory_needs: ['Education planning', 'Local and offshore investments', 'Tax planning'],
      gross_annual_income_band: 'R750,000 - R1.5m',
      monthly_investable_surplus: 'R15,000 - R50,000',
      primary_investment_objective: 'Moderate growth',
    },
    trustees: [
      { title: 'Ms', first_name: 'Nomsa', last_name: 'Khumalo', identity_type: 'SA ID', id_number: '7902210459088', date_of_birth: '21-02-1979', gender: 'Female', marital_status: 'Married', nationality: 'South African', email: 'nomsa.khumalo@test.co.za', mobile: '0825550111', street_address: '3 Library Lane', suburb: 'Rosebank', city: 'Johannesburg', province: 'Gauteng', postal_code: '2196' },
      { title: 'Mr', first_name: 'Sipho', last_name: 'Khumalo', identity_type: 'SA ID', id_number: '7609185009085', date_of_birth: '18-09-1976', gender: 'Male', marital_status: 'Married', nationality: 'South African', email: 'sipho.khumalo@test.co.za', mobile: '0825550112', street_address: '3 Library Lane', suburb: 'Rosebank', city: 'Johannesburg', province: 'Gauteng', postal_code: '2196' },
    ],
  },
  {
    label: 'Silver Oaks Trust',
    sub: '3 trustees',
    email: 'silver.trust@test.co.za',
    mobile: '0825550104',
    onboarding: {
      client_type: 'Trust',
      identity_type: 'Trust',
      entity_name: 'Silver Oaks Trust',
      trust_number: 'IT9753/2012',
      street_address: '41 Oak Crescent',
      suburb: 'Umhlanga',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      postal_code: '4320',
      risk_profile: 'Growth',
      time_horizon: '10+ years',
      advisory_needs: ['Estate planning', 'Local and offshore investments', 'Business assurance'],
      gross_annual_income_band: 'Over R3m',
      monthly_investable_surplus: 'Over R50,000',
      primary_investment_objective: 'Aggressive growth',
    },
    trustees: [
      { title: 'Mr', first_name: 'Andre', last_name: 'Botha', identity_type: 'SA ID', id_number: '6904125009081', date_of_birth: '12-04-1969', gender: 'Male', marital_status: 'Married', nationality: 'South African', email: 'andre.botha@test.co.za', mobile: '0825550121', street_address: '41 Oak Crescent', suburb: 'Umhlanga', city: 'Durban', province: 'KwaZulu-Natal', postal_code: '4320' },
      { title: 'Mrs', first_name: 'Elna', last_name: 'Botha', identity_type: 'SA ID', id_number: '7208060459080', date_of_birth: '06-08-1972', gender: 'Female', marital_status: 'Married', nationality: 'South African', email: 'elna.botha@test.co.za', mobile: '0825550122', street_address: '41 Oak Crescent', suburb: 'Umhlanga', city: 'Durban', province: 'KwaZulu-Natal', postal_code: '4320' },
      { title: 'Ms', first_name: 'Rene', last_name: 'Botha', identity_type: 'SA ID', id_number: '9511220459086', date_of_birth: '22-11-1995', gender: 'Female', marital_status: 'Single', nationality: 'South African', email: 'rene.botha@test.co.za', mobile: '0825550123', street_address: '11 Lagoon Drive', suburb: 'Umhlanga', city: 'Durban', province: 'KwaZulu-Natal', postal_code: '4320' },
    ],
  },
  {
    label: 'Cedar Capital',
    sub: '(Pty) Ltd - 2 directors',
    email: 'cedar.company@test.co.za',
    mobile: '0825550105',
    onboarding: {
      client_type: 'Company',
      identity_type: 'Registration',
      entity_name: 'Cedar Capital (Pty) Ltd',
      registration_number: '2021/654321/07',
      street_address: '18 Fredman Drive',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'Gauteng',
      postal_code: '2196',
      risk_profile: 'Moderate',
      time_horizon: '5-10 years',
      advisory_needs: ['Local and offshore investments', 'Business assurance'],
      gross_annual_income_band: 'R1.5m - R3m',
      monthly_investable_surplus: 'R15,000 - R50,000',
      primary_investment_objective: 'Moderate growth',
    },
    directors: [
      { title: 'Mr', first_name: 'Jason', last_name: 'Miller', identity_type: 'SA ID', id_number: '8202035009082', date_of_birth: '03-02-1982', gender: 'Male', marital_status: 'Married', nationality: 'South African', email: 'jason.miller@test.co.za', mobile: '0825550131', street_address: '18 Fredman Drive', suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng', postal_code: '2196' },
      { title: 'Ms', first_name: 'Ayesha', last_name: 'Khan', identity_type: 'SA ID', id_number: '8705170459089', date_of_birth: '17-05-1987', gender: 'Female', marital_status: 'Single', nationality: 'South African', email: 'ayesha.khan@test.co.za', mobile: '0825550132', street_address: '26 Oxford Road', suburb: 'Rosebank', city: 'Johannesburg', province: 'Gauteng', postal_code: '2196' },
    ],
  },
  {
    label: 'Orion Property Group',
    sub: '(Pty) Ltd - 3 directors',
    email: 'orion.company@test.co.za',
    mobile: '0825550106',
    onboarding: {
      client_type: 'Company',
      identity_type: 'Registration',
      entity_name: 'Orion Property Group (Pty) Ltd',
      registration_number: '2016/246810/07',
      street_address: '2 Dock Road',
      suburb: 'Waterfront',
      city: 'Cape Town',
      province: 'Western Cape',
      postal_code: '8001',
      risk_profile: 'Aggressive',
      time_horizon: '10+ years',
      advisory_needs: ['Local and offshore investments', 'Tax planning', 'Business assurance'],
      gross_annual_income_band: 'Over R3m',
      monthly_investable_surplus: 'Over R50,000',
      primary_investment_objective: 'Aggressive growth',
    },
    directors: [
      { title: 'Mr', first_name: 'Gareth', last_name: 'Jacobs', identity_type: 'SA ID', id_number: '7806305009087', date_of_birth: '30-06-1978', gender: 'Male', marital_status: 'Married', nationality: 'South African', email: 'gareth.jacobs@test.co.za', mobile: '0825550141', street_address: '2 Dock Road', suburb: 'Waterfront', city: 'Cape Town', province: 'Western Cape', postal_code: '8001' },
      { title: 'Ms', first_name: 'Megan', last_name: 'Daniels', identity_type: 'SA ID', id_number: '8409110459083', date_of_birth: '11-09-1984', gender: 'Female', marital_status: 'Married', nationality: 'South African', email: 'megan.daniels@test.co.za', mobile: '0825550142', street_address: '19 High Level Road', suburb: 'Green Point', city: 'Cape Town', province: 'Western Cape', postal_code: '8005' },
      { title: 'Mr', first_name: 'Nkululeko', last_name: 'Maseko', identity_type: 'SA ID', id_number: '9004025009084', date_of_birth: '02-04-1990', gender: 'Male', marital_status: 'Single', nationality: 'South African', email: 'nkululeko.maseko@test.co.za', mobile: '0825550143', street_address: '77 Main Road', suburb: 'Claremont', city: 'Cape Town', province: 'Western Cape', postal_code: '7708' },
    ],
  },
].map(enrichTestProfile);

export default function ClientRegistration() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [entityType, setEntityType] = useState('Individual');
  const [selectedTestEmail, setSelectedTestEmail] = useState('');
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
    if (profile.onboarding?.products_list) sessionStorage.setItem('test_products_seed', JSON.stringify(profile.onboarding.products_list));
    setSelectedTestEmail(profile.email);
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
      const seedRaw = sessionStorage.getItem('test_onboarding_seed');
      const trusteeSeed = sessionStorage.getItem('test_trustees_seed');
      const directorSeed = sessionStorage.getItem('test_directors_seed');
      const productsSeed = sessionStorage.getItem('test_products_seed');
      const testProfileUpdate = TEST_MODE && isTestEmail(formData.email) && seedRaw
        ? {
            ...JSON.parse(seedRaw),
            email: formData.email,
            mobile_number: formData.mobile,
            full_name: JSON.parse(seedRaw).client_type === 'Natural Person'
              ? `${JSON.parse(seedRaw).first_name || ''} ${JSON.parse(seedRaw).last_name || ''}`.trim()
              : undefined,
            trustees_list: trusteeSeed ? JSON.parse(trusteeSeed) : undefined,
            directors_list: directorSeed ? JSON.parse(directorSeed) : undefined,
            products_list: productsSeed ? JSON.parse(productsSeed) : JSON.parse(seedRaw).products_list,
            trustee_documents_json: trusteeSeed ? JSON.stringify(JSON.parse(trusteeSeed).map((t, idx) => ({
              trustee_index: idx,
              name: `${t.first_name} ${t.last_name}`,
              id_file_url: t.id_file_url || '',
              id_file_name: t.id_file_name || '',
              id_front_file_url: t.id_front_file_url || '',
              id_front_file_name: t.id_front_file_name || '',
              id_back_file_url: t.id_back_file_url || '',
              id_back_file_name: t.id_back_file_name || '',
              addr_file_url: t.addr_file_url || '',
              addr_file_name: t.addr_file_name || '',
            }))) : undefined,
            director_documents_json: directorSeed ? JSON.stringify(JSON.parse(directorSeed).map((d, idx) => ({
              director_index: idx,
              name: `${d.first_name} ${d.last_name}`,
              id_file_url: d.id_file_url || '',
              id_file_name: d.id_file_name || '',
              id_front_file_url: d.id_front_file_url || '',
              id_front_file_name: d.id_front_file_name || '',
              id_back_file_url: d.id_back_file_url || '',
              id_back_file_name: d.id_back_file_name || '',
              addr_file_url: d.addr_file_url || '',
              addr_file_name: d.addr_file_name || '',
            }))) : undefined,
          }
        : {};
      await base44.entities.Clients.update(clientId, {
        client_type: clientTypeMap[entityType] || 'Natural Person',
        ...testProfileUpdate,
      });

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
                Select from {TEST_PROFILES.length} full profiles to auto-fill every onboarding step. <code className="bg-amber-100 px-1 rounded font-mono">@test.co.za</code> emails skip OTP automatically.
              </p>
              <p className="text-[11px] font-semibold text-amber-800 mb-2">{TEST_DATA_VERSION}</p>
              <select
                value={selectedTestEmail}
                onChange={(e) => {
                  const profile = TEST_PROFILES.find(p => p.email === e.target.value);
                  if (profile) handleQuickFill(profile);
                }}
                className="w-full h-10 px-3 bg-white border border-amber-300 rounded text-sm text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Choose test data set...</option>
                {TEST_PROFILES.map((profile) => (
                  <option key={profile.email} value={profile.email}>
                    {profile.label} - {profile.sub}
                  </option>
                ))}
              </select>
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
