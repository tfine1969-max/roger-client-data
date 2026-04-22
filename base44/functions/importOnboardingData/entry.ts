import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Accept onboarding data from external portal and create/update proposal
 * Maps dynamic onboarding structure to Proposal entity
 */
Deno.serve(async (req) => {
  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { onboardingData, proposalId } = payload;

    if (!onboardingData) {
      return Response.json({ error: 'Missing onboarding data' }, { status: 400 });
    }

    // Map onboarding data to proposal fields
    const proposalData = {
      // Client type and basic info
      client_type: onboardingData.client_type || 'natural_person',
      client_name: onboardingData.client_name || '',
      identification_type: onboardingData.identification_type,
      client_id_number: onboardingData.client_id_number,
      client_dob: onboardingData.client_dob,
      client_email: onboardingData.client_email,
      client_mobile: onboardingData.client_mobile,
      client_tax_residency: onboardingData.client_tax_residency,
      
      // Company-specific
      company_registration_number: onboardingData.company_registration_number,
      company_trading_name: onboardingData.company_trading_name,
      company_incorporation_country: onboardingData.company_incorporation_country,
      company_incorporation_date: onboardingData.company_incorporation_date,
      company_vat_number: onboardingData.company_vat_number,
      company_industry: onboardingData.company_industry,
      
      // Trust-specific
      trust_name: onboardingData.trust_name,
      trust_registration_number: onboardingData.trust_registration_number,
      trust_formation_country: onboardingData.trust_formation_country,
      trust_creation_date: onboardingData.trust_creation_date,
      trust_purpose: onboardingData.trust_purpose,
      
      // Store full onboarding data for audit trail
      onboarding_import_data: onboardingData,
      
      // Notes
      notes: onboardingData.notes,
    };

    let result;

    if (proposalId) {
      // Update existing proposal
      await base44.entities.Proposal.update(proposalId, proposalData);
      result = await base44.entities.Proposal.filter({ id: proposalId });
      return Response.json({ 
        success: true, 
        message: 'Proposal updated with onboarding data',
        proposal: result[0],
        proposalId 
      });
    } else {
      // Create new proposal
      const reference = `WW-P-${new Date().getFullYear()}-${Math.floor(3000 + Math.random() * 999)}`;
      const newProposal = {
        ...proposalData,
        reference,
        needs_array: onboardingData.needs_array || [],
        needs_identified: onboardingData.needs_identified || '',
        status: 'new',
        phase: 'client_details',
      };
      
      const created = await base44.entities.Proposal.create(newProposal);
      return Response.json({ 
        success: true, 
        message: 'Proposal created from onboarding data',
        proposal: created,
        proposalId: created.id 
      });
    }
  } catch (error) {
    console.error('Error importing onboarding data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});