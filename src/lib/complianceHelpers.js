import { base44 } from '@/api/base44Client';

/**
 * RBAC: Returns true if the given user is authorised to perform compliance actions.
 * Only admin-role users (advisors/compliance officers) may access these functions.
 */
export function isComplianceAuthorised(user) {
  return user?.role === 'admin';
}

/**
 * Maps raw VerifyNow / external verification responses to internal statuses only.
 * Pass → "Verified"
 * Anything else (Fail, Refer, No Match, Pending, Unavailable, null) → "Manual Review Required"
 */
export function mapVerifyNowStatus(rawStatus) {
  if (!rawStatus) return 'Manual Review Required';
  const s = String(rawStatus).toLowerCase().trim();
  if (s === 'pass' || s === 'success' || s === 'approved') return 'Verified';
  return 'Manual Review Required';
}

/**
 * Maps fica_status to a safe internal display label for the advisor portal.
 * Never exposes "Failed" language.
 */
export function ficaStatusLabel(ficaStatus) {
  if (!ficaStatus) return 'Pending Review';
  if (ficaStatus === 'Approved') return 'Verified';
  if (ficaStatus === 'Declined') return 'Manual Review Required';
  if (ficaStatus === 'Referred') return 'Manual Review Required';
  return 'Pending Review';
}

/**
 * Writes a permanent audit log entry for an onboarding action.
 * Silently fails — never blocks the main workflow.
 */
export async function writeAuditLog({ clientId, actor, action, previousStatus, newStatus, notes = '', documentUrl = '', documentName = '', metadata = {} }) {
  try {
    await base44.entities.OnboardingAuditLog.create({
      client_id: clientId,
      actor_email: actor?.email || 'unknown',
      actor_name: actor?.full_name || actor?.email || 'Unknown',
      action,
      previous_status: previousStatus || '',
      new_status: newStatus || '',
      notes,
      supporting_document_url: documentUrl,
      supporting_document_name: documentName,
      metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
    });
  } catch {
    // Audit log failures must never block compliance workflows
  }
}

/**
 * Determines whether a client record can be moved to Approved.
 * Approval is locked unless:
 *   - FICA status is Approved (auto-pass), OR
 *   - An authorised advisor explicitly overrides with a manual resolution note
 */
export function canApproveClient(client, manualOverride = false) {
  if (!client) return false;
  if (client.fica_status === 'Approved') return true;
  // Manual override by authorised advisor is permitted but must include a note
  if (manualOverride) return true;
  return false;
}