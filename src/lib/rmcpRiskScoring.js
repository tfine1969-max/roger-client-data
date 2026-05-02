const asArray = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const hasAny = (values, terms) => asArray(values).some(value => terms.some(term => lower(value).includes(term)));
const fieldHas = (value, terms) => terms.some(term => lower(value).includes(term));

const bandFromScore = (score) => {
  if (score >= 81) return 'Prohibited';
  if (score >= 61) return 'High';
  if (score >= 31) return 'Medium';
  return 'Low';
};

const scoreTransactionVolume = (formData, clientType) => {
  const values = [
    formData.monthly_investable_surplus,
    formData.gross_annual_income_band,
    formData.net_worth_band,
    formData.gross_annual_turnover,
    formData.total_assets_band,
    formData.trust_asset_value_band,
    formData.trust_income_band,
  ].map(lower);

  if (values.some(v => v.includes('over r50') || v.includes('over r20') || v.includes('r20m') || v.includes('over r10') || v.includes('r10m'))) return 15;
  if (values.some(v => v.includes('r15,000') || v.includes('r15 000') || v.includes('r5m') || v.includes('r3m'))) return 10;
  if (values.some(v => v.includes('r5,000') || v.includes('r5 000') || v.includes('r2m') || v.includes('r1m'))) return 5;

  if (clientType !== 'individual' && fieldHas(formData.entity_total_liabilities || formData.total_liabilities, ['over', 'r1m', 'r3m'])) return 5;
  return 0;
};

export const calculateRmcpScore = ({
  formData = {},
  clientType = 'individual',
  amlMatch = false,
  idVerified = true,
  documentIssue = false,
  faceMatchPassed = true,
  addressVerified = true,
  cipcVerified = true,
  roleChecks = [],
} = {}) => {
  const advisoryNeeds = [
    ...asArray(formData.advisory_needs),
    ...asArray(formData.entity_source_of_funds),
    ...asArray(formData.trust_source_of_funds),
    ...asArray(formData.source_of_funds),
  ];
  const roleAmlMatch = asArray(roleChecks).some(role => role.aml_clear === false);
  const roleIdFail = asArray(roleChecks).some(role => role.id_verified === false);

  let clientFactor = 0;
  if (formData.pep_status === 'Yes' || formData.entity_pep === 'Yes' || formData.trustee_pep === 'Yes') clientFactor = 30;
  else if (formData.pep_status === 'Related to PEP') clientFactor = 20;
  else if (amlMatch || roleAmlMatch) clientFactor = 25;
  else if (formData.us_person_fatca === 'Yes' || formData.entity_fatca === 'Yes' || formData.trust_fatca === 'Yes') clientFactor = 10;
  else if (clientType !== 'individual') clientFactor = 5;

  let geographyFactor = 0;
  if (hasAny(advisoryNeeds, ['offshore']) || fieldHas(formData.primary_investment_objective, ['offshore'])) geographyFactor = 25;
  else if (fieldHas(formData.tax_residency || formData.entity_tax_residency, ['other country only'])) geographyFactor = 20;
  else if (fieldHas(formData.tax_residency || formData.entity_tax_residency, ['other', 'foreign'])) geographyFactor = 10;

  let productFactor = 0;
  if (hasAny(advisoryNeeds, ['tax planning', 'donation', 'inheritance'])) productFactor = Math.max(productFactor, 20);
  if (hasAny(advisoryNeeds, ['offshore'])) productFactor = Math.max(productFactor, 15);
  if (hasAny(advisoryNeeds, ['estate', 'business assurance', 'trust', 'source of funds'])) productFactor = Math.max(productFactor, 10);
  if (hasAny(advisoryNeeds, ['life', 'risk cover', 'retirement', 'investment'])) productFactor = Math.max(productFactor, 8);
  if (productFactor === 0) productFactor = clientType === 'individual' ? 5 : 8;

  const transactionFactor = scoreTransactionVolume(formData, clientType);

  let behaviourFactor = 0;
  if (!idVerified || roleIdFail) behaviourFactor = 10;
  else if (!cipcVerified) behaviourFactor = 10;
  else {
    if (documentIssue) behaviourFactor += 5;
    if (!addressVerified) behaviourFactor += 4;
    if (!faceMatchPassed) behaviourFactor += 3;
  }
  behaviourFactor = Math.min(10, behaviourFactor);

  const breakdown = {
    client_factor: clientFactor,
    geography_factor: geographyFactor,
    product_factor: productFactor,
    transaction_factor: transactionFactor,
    behaviour_factor: behaviourFactor,
  };
  const score = Object.values(breakdown).reduce((total, value) => total + value, 0);

  return {
    score,
    band: bandFromScore(score),
    breakdown,
    scoredAt: new Date().toISOString(),
  };
};

export const buildRmcpUpdate = (rmcpResult) => ({
  rmcp_risk_score: rmcpResult.score,
  rmcp_risk_band: rmcpResult.band,
  rmcp_scored_at: rmcpResult.scoredAt,
  rmcp_score_breakdown: JSON.stringify(rmcpResult.breakdown),
});
