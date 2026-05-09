import { base44 } from '@/api/base44Client';

/**
 * RBAC: Only admin-role users may perform compliance actions.
 */
export function isComplianceAuthorised(user) {
  return user?.role === 'admin';
}

/**
 * verification_status — reflects automated checks only (never set by advisor).
 * Maps raw VerifyNow response to internal label.
 */
export function mapVerifyNowStatus(rawStatus) {
  if (!rawStatus) return 'Pending';
  const s = String(rawStatus).toLowerCase().trim();
  if (s === 'pass' || s === 'success' || s === 'approved') return 'Verified';
  return 'Manual Review';
}

/**
 * Resolves the display FICA status for the advisor portal.
 * Once an advisor has approved (review_status === 'Approved'), always show Verified.
 * Otherwise fall back to the automated verification_status label.
 */
export function resolvedFicaLabel(client) {
  if (!client) return 'Pending Review';
  if (client.review_status === 'Approved') return 'Verified';
  if (client.review_status === 'Rejected') return 'Rejected';
  // Automated fallback
  const vs = client.verification_status;
  if (vs === 'Verified') return 'Verified';
  if (vs === 'Manual Review') return 'Manual Review Required';
  return 'Pending Review';
}

/**
 * Legacy helper — kept for any callers that pass raw fica_status directly.
 * Prefer resolvedFicaLabel(client) where possible.
 */
export function ficaStatusLabel(ficaStatus) {
  if (!ficaStatus) return 'Pending Review';
  if (ficaStatus === 'Approved') return 'Verified';
  if (ficaStatus === 'Declined' || ficaStatus === 'Referred') return 'Manual Review Required';
  return 'Pending Review';
}

/**
 * Writes a permanent audit log entry. Silently fails — never blocks workflows.
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
 * Determines whether approval is allowed.
 * Approval is always permitted by an authorised advisor — verification_status is advisory,
 * not a hard gate. If verification failed, the advisor must provide a manual override reason.
 */
export function canApproveClient(client, manualOverride = false) {
  if (!client) return false;
  if (client.verification_status === 'Verified') return true;
  if (manualOverride) return true;
  return false;
}