import { base44 } from '@/api/base44Client';

export const DOCUMENT_FIELD_MAP = {
  identity_document_uploaded: 'doc_identity',
  proof_of_address_uploaded: 'doc_proof_of_address',
  income_proof_uploaded: 'doc_source_of_funds',
  existing_policies_uploaded: 'doc_existing_policies',
  cipc_registration_uploaded: 'doc_identity',
  financial_statements_uploaded: 'doc_source_of_funds',
  moi_uploaded: 'doc_existing_policies',
  trust_deed_uploaded: 'doc_identity',
  trust_proof_of_address_uploaded: 'doc_proof_of_address',
  trust_bank_statement_uploaded: 'doc_source_of_funds',
  loa_uploaded: 'doc_existing_policies',
};

export const uploadOnboardingDocument = async ({ clientId, fieldKey, file }) => {
  if (!clientId) throw new Error('Client record not found');
  if (!file) throw new Error('No file selected');

  const { file_url: fileUrl } = await base44.integrations.Core.UploadFile({ file });
  if (!fileUrl) throw new Error('Upload completed without a file URL');

  const repositoryField = DOCUMENT_FIELD_MAP[fieldKey];
  const updateData = {
    [fieldKey]: true,
    doc_submitted_at: new Date().toISOString(),
    doc_status: 'Submitted',
  };

  if (repositoryField) {
    updateData[repositoryField] = fileUrl;
  }

  await base44.entities.Clients.update(clientId, updateData);
  return { fileUrl, updateData, repositoryField };
};
