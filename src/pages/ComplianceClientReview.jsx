import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, LogOut, CheckCircle2, AlertTriangle, Clock,
  FileText, User, Shield, DollarSign, ClipboardList,
  Lock, Send, History, Upload, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { isComplianceAuthorised, resolvedFicaLabel, writeAuditLog } from '@/lib/complianceHelpers';

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' });
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
    <p className="text-sm text-navy mt-0.5">{value || '—'}</p>
  </div>
);

const DocRow = ({ label, uploaded, url, onRequest }) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
    <div className="flex items-center gap-2">
      {uploaded ? <CheckCircle2 className="w-4 h-4 text-teal shrink-0" /> : <Clock className="w-4 h-4 text-muted-foreground shrink-0" />}
      <span className="text-sm text-navy">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${uploaded ? 'bg-teal/10 text-teal border-teal/20' : 'bg-secondary text-muted-foreground border-border'}`}>
        {uploaded ? 'Uploaded' : 'Missing'}
      </span>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-ocean hover:underline font-medium">View</a>}
      {!uploaded && onRequest && (
        <button onClick={onRequest} className="text-[10px] text-ocean hover:underline font-medium flex items-center gap-1">
          <Upload className="w-3 h-3" /> Request
        </button>
      )}
    </div>
  </div>
);

const AuditEntry = ({ entry }) => {
  const actionColors = {
    'Approved': 'text-teal',
    'Returned for Review': 'text-amber-700',
    'Document Request Sent': 'text-blue-700',
    'Document Uploaded by Client': 'text-ocean',
    'Document Verified': 'text-teal',
    'Notes Updated': 'text-muted-foreground',
    'Status Changed': 'text-navy',
    'Verification Override': 'text-red-700',
    'Onboarding Submitted': 'text-blue-700',
  };
  return (
    <div className="flex gap-3 py-2 border-b border-border last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-ocean mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold ${actionColors[entry.action] || 'text-navy'}`}>{entry.action}</span>
          {entry.previous_status && entry.new_status && entry.previous_status !== entry.new_status && (
            <span className="text-[10px] text-muted-foreground">{entry.previous_status} → {entry.new_status}</span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{formatDateTime(entry.created_date)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{entry.actor_name || entry.actor_email}</p>
        {entry.notes && <p className="text-xs text-navy mt-0.5 italic">"{entry.notes}"</p>}
        {entry.supporting_document_url && (
          <a href={entry.supporting_document_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-ocean hover:underline">
            📎 {entry.supporting_document_name || 'Attachment'}
          </a>
        )}
      </div>
    </div>
  );
};

const DOC_OPTIONS = [
  'Identity Document (SA ID / Passport)',
  'Proof of Address',
  'Income / Source of Funds',
  'Bank Account Confirmation',
  'CIPC Registration Certificate',
  'Memorandum of Incorporation',
  'Financial Statements',
  'Letter of Authority',
  'Other',
];

export default function ComplianceClientReview() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [notes, setNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Document request modal
  const [showDocRequest, setShowDocRequest] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [docRequestMessage, setDocRequestMessage] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));
  }, []);

  const { data: client, isLoading } = useQuery({
    queryKey: ['compliance-client', clientId],
    queryFn: async () => {
      const all = await base44.entities.Clients.list();
      return all.find(c => c.id === clientId) || null;
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-log', clientId],
    queryFn: async () => {
      const all = await base44.entities.OnboardingAuditLog.list('-created_date', 100);
      return all.filter(e => e.client_id === clientId);
    },
    enabled: !!clientId,
  });

  const { data: docRequests = [] } = useQuery({
    queryKey: ['doc-requests', clientId],
    queryFn: async () => {
      const all = await base44.entities.DocumentRequest.list('-created_date', 50);
      return all.filter(r => r.client_id === clientId);
    },
    enabled: !!clientId,
  });

  const ficaChecks = (() => {
    if (!client?.fica_checks_json) return null;
    try { return JSON.parse(client.fica_checks_json); } catch { return null; }
  })();

  const rmcpBreakdown = (() => {
    if (!client?.rmcp_score_breakdown) return null;
    try { return JSON.parse(client.rmcp_score_breakdown); } catch { return null; }
  })();

  const handleApprove = async () => {
    if (!client || !isComplianceAuthorised(currentUser)) {
      toast.error('Access denied: Only authorised advisors may approve clients.');
      return;
    }
    const needsOverride = client.verification_status !== 'Verified';
    if (needsOverride && !manualOverride) {
      toast.error('Automated verification did not pass. Enable the manual override to approve.');
      return;
    }
    if (needsOverride && !overrideReason.trim()) {
      toast.error('Please provide a reason for the manual override.');
      return;
    }
    setIsApproving(true);
    const previousStatus = client.review_status || 'Pending';
    try {
      const updateData = {
        review_status: 'Approved',
        verification_status: 'Verified',
        client_status: 'Active',
        advisor_review_required: false,
        review_decision_at: new Date().toISOString(),
        review_decision_by: currentUser.email,
        advisor_notes: notes || client.advisor_notes || '',
        advisor_approved_at: new Date().toISOString(),
      };
      if (needsOverride) {
        updateData.manual_override_reason = overrideReason;
        updateData.manual_override_by = currentUser.email;
        updateData.manual_override_at = new Date().toISOString();
      }
      await base44.entities.Clients.update(clientId, updateData);
      await writeAuditLog({
        clientId,
        actor: currentUser,
        action: needsOverride ? 'Verification Override' : 'Approved',
        previousStatus,
        newStatus: 'Approved',
        notes: notes || (needsOverride ? `Override reason: ${overrideReason}` : ''),
        metadata: { fica_status: client.fica_status, fica_reference: client.fica_reference, manual_override: needsOverride },
      });
      queryClient.invalidateQueries({ queryKey: ['compliance-client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['compliance-clients'] });
      queryClient.invalidateQueries({ queryKey: ['audit-log', clientId] });
      toast.success('Client approved and activated.');
      navigate('/compliance-review');
    } catch (err) {
      toast.error('Failed to approve: ' + err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!client || !isComplianceAuthorised(currentUser)) {
      toast.error('Access denied.');
      return;
    }
    if (!rejectionReason.trim()) {
      toast.error('A rejection reason is required.');
      return;
    }
    setIsApproving(true);
    const previousStatus = client.review_status || 'Pending';
    try {
      await base44.entities.Clients.update(clientId, {
        review_status: 'Rejected',
        client_status: 'Draft',
        advisor_review_required: true,
        review_decision_at: new Date().toISOString(),
        review_decision_by: currentUser.email,
        review_rejection_reason: rejectionReason,
        advisor_notes: notes || client.advisor_notes || '',
      });
      await writeAuditLog({
        clientId,
        actor: currentUser,
        action: 'Returned for Review',
        previousStatus,
        newStatus: 'Rejected',
        notes: `Rejection reason: ${rejectionReason}${notes ? ` | Notes: ${notes}` : ''}`,
        metadata: { fica_status: client.fica_status, fica_reference: client.fica_reference },
      });
      queryClient.invalidateQueries({ queryKey: ['compliance-client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['compliance-clients'] });
      queryClient.invalidateQueries({ queryKey: ['audit-log', clientId] });
      toast.success('Client rejected. Record updated.');
      setShowRejectForm(false);
      navigate('/compliance-review');
    } catch (err) {
      toast.error('Failed to reject: ' + err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!isComplianceAuthorised(currentUser)) {
      toast.error('Access denied.');
      return;
    }
    if (!notes.trim()) return;
    await base44.entities.Clients.update(clientId, { advisor_notes: notes });
    await writeAuditLog({
      clientId,
      actor: currentUser,
      action: 'Notes Updated',
      previousStatus: client?.client_status,
      newStatus: client?.client_status,
      notes,
    });
    queryClient.invalidateQueries({ queryKey: ['compliance-client', clientId] });
    queryClient.invalidateQueries({ queryKey: ['audit-log', clientId] });
    toast.success('Notes saved.');
    setNotes('');
  };

  const handleSendDocRequest = async () => {
    if (!isComplianceAuthorised(currentUser)) {
      toast.error('Access denied.');
      return;
    }
    if (!selectedDocs.length) {
      toast.error('Please select at least one document type.');
      return;
    }
    setIsSendingRequest(true);
    try {
      const res = await base44.functions.invoke('handleDocumentRequest', {
        clientId,
        clientEmail: client.email,
        clientName: clientName,
        documentTypes: selectedDocs,
        message: docRequestMessage,
      });
      if (res.data?.success) {
        toast.success('Document request sent to client.');
        setShowDocRequest(false);
        setSelectedDocs([]);
        setDocRequestMessage('');
        queryClient.invalidateQueries({ queryKey: ['doc-requests', clientId] });
        queryClient.invalidateQueries({ queryKey: ['audit-log', clientId] });
        queryClient.invalidateQueries({ queryKey: ['compliance-client', clientId] });
      } else {
        toast.error('Failed to send request.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send document request.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Loading / auth states
  if (!authChecked || isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-navy rounded-full animate-spin" />
    </div>
  );

  // RBAC gate — block non-admin users entirely
  if (!isComplianceAuthorised(currentUser)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-sm text-center p-8 border border-border rounded bg-card">
          <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-bold text-navy mb-2">Access Restricted</h2>
          <p className="text-sm text-muted-foreground mb-4">Compliance Review is only accessible to authorised advisors and compliance officers.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-navy text-white text-xs font-semibold rounded hover:bg-ocean transition-colors">Go Home</button>
        </div>
      </div>
    );
  }

  if (!client) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Client not found.</p>
    </div>
  );

  const clientName = client.full_name || client.entity_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client';
  const reviewStatus = client.review_status || 'Pending';
  const alreadyDecided = reviewStatus === 'Approved' || reviewStatus === 'Rejected';
  const alreadyApproved = reviewStatus === 'Approved';
  const alreadyRejected = reviewStatus === 'Rejected';
  const displayFicaLabel = resolvedFicaLabel(client);
  const autoVerified = client.verification_status === 'Verified';
  const needsManualOverride = !autoVerified;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-navy border-b border-border px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/compliance-review')} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{clientName}</h1>
            <p className="text-white/60 text-xs">Compliance Review · {client.fica_reference || 'No FICA reference'}</p>
          </div>
        </div>
        <button onClick={() => base44.auth.logout('/')} className="flex items-center gap-2 px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white transition-colors text-sm">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="flex-1 p-4 md:p-7 max-w-6xl mx-auto w-full space-y-5">

        {/* Status Banner */}
        {alreadyApproved ? (
          <div className="flex items-center gap-3 p-4 bg-teal/10 border border-teal/20 rounded">
            <CheckCircle2 className="w-5 h-5 text-teal shrink-0" />
            <div>
              <p className="font-semibold text-teal text-sm">Client Approved & Active</p>
              <p className="text-xs text-muted-foreground">Approved by {client.review_decision_by} on {formatDate(client.review_decision_at)}.</p>
            </div>
          </div>
        ) : alreadyRejected ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-700 text-sm">Client Rejected</p>
              <p className="text-xs text-red-600">Rejected by {client.review_decision_by} on {formatDate(client.review_decision_at)}.</p>
              {client.review_rejection_reason && <p className="text-xs text-red-600 mt-0.5">Reason: {client.review_rejection_reason}</p>}
            </div>
          </div>
        ) : needsManualOverride ? (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Awaiting Advisor Decision — Automated Verification Incomplete</p>
              <p className="text-xs text-amber-700">Automated checks did not fully pass. Review all data and documents, then Approve (with override) or Reject.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded">
            <FileText className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">Awaiting Advisor Decision — Verification Passed</p>
              <p className="text-xs text-blue-700">Automated checks passed. Review client details and approve or reject.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Client Details */}
          <div className="border border-border rounded bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-ocean" />
              <h3 className="text-xs font-bold tracking-wider text-navy uppercase">Client Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" value={clientName} />
              <Field label="Client Type" value={client.client_type} />
              <Field label="ID / Passport" value={client.sa_id_number || client.passport_number || client.registration_number} />
              <Field label="Date of Birth" value={client.date_of_birth} />
              <Field label="Email" value={client.email} />
              <Field label="Mobile" value={client.mobile_number} />
              <Field label="Marital Status" value={client.marital_status} />
              <Field label="Dependants" value={client.dependants} />
              <Field label="Residential Address" value={client.residential_address || [client.street_address, client.suburb, client.city].filter(Boolean).join(', ')} />
              <Field label="Employment Status" value={client.employment_status} />
              <Field label="Occupation" value={client.occupation} />
              <Field label="Industry" value={client.industry} />
            </div>
          </div>

          {/* FICA Verification Results — Internal View */}
          <div className="border border-border rounded bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-ocean" />
              <h3 className="text-xs font-bold tracking-wider text-navy uppercase">Verification Results (Internal)</h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Display Status</span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                  displayFicaLabel === 'Verified' ? 'bg-teal/10 text-teal border-teal/20' :
                  displayFicaLabel === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                  displayFicaLabel === 'Manual Review Required' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-secondary text-muted-foreground border-border'
                }`}>{displayFicaLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Automated Verification</span>
                <span className={`text-[10px] font-semibold ${autoVerified ? 'text-teal' : 'text-amber-700'}`}>
                  {client.verification_status || 'Pending'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Advisor Review Decision</span>
                <span className={`text-[10px] font-bold ${
                  reviewStatus === 'Approved' ? 'text-teal' :
                  reviewStatus === 'Rejected' ? 'text-red-600' :
                  'text-muted-foreground'
                }`}>{reviewStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Raw VerifyNow Response</span>
                <span className="text-[10px] font-mono text-navy">{client.fica_status || 'Not run'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">FICA Reference</span>
                <span className="text-xs font-mono font-semibold text-navy">{client.fica_reference || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Verified At</span>
                <span className="text-xs text-navy">{formatDate(client.fica_verified_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Home Affairs ID</span>
                <span className={`text-[10px] font-bold ${client.home_affairs_verified ? 'text-teal' : 'text-amber-700'}`}>
                  {client.home_affairs_verified ? '✓ Confirmed' : '⚠ Pending Review'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">AML / PEP Screening</span>
                <span className={`text-[10px] font-bold ${client.aml_pep_clear ? 'text-teal' : 'text-amber-700'}`}>
                  {client.aml_pep_clear ? '✓ Clear' : '⚠ Requires Review'}
                </span>
              </div>
              {client.manual_override_reason && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <p className="font-semibold text-red-700">Manual Override Applied</p>
                  <p className="text-red-600 mt-0.5">{client.manual_override_reason}</p>
                  <p className="text-red-500 text-[10px] mt-0.5">By: {client.manual_override_by} · {formatDate(client.manual_override_at)}</p>
                </div>
              )}
            </div>

            {client.rmcp_risk_score != null && (
              <div className="p-3 bg-secondary/50 border border-border rounded mt-2">
                <p className="text-[10px] font-bold tracking-wider text-navy uppercase mb-2">RMCP Risk Score</p>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-navy">{client.rmcp_risk_score}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${
                    client.rmcp_risk_band === 'Low' ? 'bg-teal/10 text-teal border-teal/20' :
                    client.rmcp_risk_band === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    client.rmcp_risk_band === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>{client.rmcp_risk_band || '—'} Risk</span>
                </div>
                {rmcpBreakdown && (
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                    <span>Client factor: <strong>{rmcpBreakdown.client_factor}</strong>/30</span>
                    <span>Geography: <strong>{rmcpBreakdown.geography_factor}</strong>/25</span>
                    <span>Product: <strong>{rmcpBreakdown.product_factor}</strong>/20</span>
                    <span>Transaction: <strong>{rmcpBreakdown.transaction_factor}</strong>/15</span>
                    <span>Behaviour: <strong>{rmcpBreakdown.behaviour_factor}</strong>/10</span>
                  </div>
                )}
              </div>
            )}

            {ficaChecks && (
              <div className="mt-3">
                <p className="text-[10px] font-bold tracking-wider text-navy uppercase mb-2">Individual Check Results</p>
                <div className="space-y-1">
                  {Object.entries(ficaChecks).map(([key, check]) => {
                    const s = check.status || 'unknown';
                    const color = s === 'pass' ? 'text-teal' : s === 'fail' ? 'text-amber-700' : s === 'flag' ? 'text-amber-700' : 'text-muted-foreground';
                    const label = s === 'pass' ? '✓ Pass' : s === 'fail' ? '⚠ Requires Review' : s === 'flag' ? '⚠ Flagged' : s === 'skipped' ? '— Skipped' : '— Pending';
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{check.label || key}</span>
                        <span className={`font-semibold ${color}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="border border-border rounded bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-ocean" />
              <h3 className="text-xs font-bold tracking-wider text-navy uppercase">Documents</h3>
              <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded border ${
                client.doc_status === 'Verified' ? 'bg-teal/10 text-teal border-teal/20' :
                client.doc_status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-secondary text-muted-foreground border-border'
              }`}>{client.doc_status || 'Pending'}</span>
            </div>
            <button
              onClick={() => setShowDocRequest(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean text-white text-[10px] font-bold uppercase tracking-wide hover:bg-navy transition-colors rounded"
            >
              <Send className="w-3 h-3" /> Request Documents
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <DocRow label="Identity Document" uploaded={client.identity_document_uploaded || !!client.doc_identity} url={client.doc_identity} onRequest={() => { setSelectedDocs(['Identity Document (SA ID / Passport)']); setShowDocRequest(true); }} />
            <DocRow label="Proof of Address" uploaded={client.proof_of_address_uploaded || !!client.doc_proof_of_address} url={client.doc_proof_of_address} onRequest={() => { setSelectedDocs(['Proof of Address']); setShowDocRequest(true); }} />
            <DocRow label="Income / Source of Funds" uploaded={client.income_proof_uploaded || !!client.doc_source_of_funds} url={client.doc_source_of_funds} onRequest={() => { setSelectedDocs(['Income / Source of Funds']); setShowDocRequest(true); }} />
            <DocRow label="Existing Policies" uploaded={client.existing_policies_uploaded || !!client.doc_existing_policies} url={client.doc_existing_policies} onRequest={() => { setSelectedDocs(['Letter of Authority']); setShowDocRequest(true); }} />
          </div>

          {/* Previous Document Requests */}
          {docRequests.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[10px] font-bold tracking-wider text-navy uppercase mb-2">Document Request History</p>
              <div className="space-y-1.5">
                {docRequests.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs p-2 bg-secondary/40 rounded">
                    <div>
                      <span className="font-medium text-navy">{(r.document_types || []).join(', ')}</span>
                      <span className="text-muted-foreground ml-2">· Sent {formatDate(r.sent_at)}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      r.status === 'Uploaded' ? 'bg-teal/10 text-teal border-teal/20' :
                      r.status === 'Reviewed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-secondary text-muted-foreground border-border'
                    }`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Document Request Modal */}
        {showDocRequest && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg max-w-md w-full p-5 shadow-xl">
              <h3 className="text-sm font-bold text-navy mb-1">Request Documents from Client</h3>
              <p className="text-xs text-muted-foreground mb-4">The client will receive a secure upload link via email.</p>
              <p className="text-[10px] font-semibold tracking-wider text-navy uppercase mb-2">Select Document Types</p>
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {DOC_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs p-1.5 border border-border rounded hover:bg-secondary/50">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(opt)}
                      onChange={() => setSelectedDocs(prev => prev.includes(opt) ? prev.filter(d => d !== opt) : [...prev, opt])}
                      className="w-3.5 h-3.5 accent-ocean"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              <p className="text-[10px] font-semibold tracking-wider text-navy uppercase mb-1">Message to Client (optional)</p>
              <textarea
                className="w-full rounded border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px] mb-4"
                placeholder="Add a note to include in the request email…"
                value={docRequestMessage}
                onChange={e => setDocRequestMessage(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowDocRequest(false); setSelectedDocs([]); setDocRequestMessage(''); }} className="px-4 py-2 border border-border text-xs font-semibold text-navy hover:bg-secondary transition-colors rounded">
                  Cancel
                </button>
                <button
                  onClick={handleSendDocRequest}
                  disabled={isSendingRequest || !selectedDocs.length}
                  className="px-4 py-2 bg-ocean text-white text-xs font-bold uppercase tracking-wide hover:bg-navy transition-colors rounded disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSendingRequest ? 'Sending…' : <><Send className="w-3 h-3" /> Send Request</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Financial Profile */}
        <div className="border border-border rounded bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-ocean" />
            <h3 className="text-xs font-bold tracking-wider text-navy uppercase">Financial Profile</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Gross Annual Income" value={client.gross_annual_income_band} />
            <Field label="Monthly Surplus" value={client.monthly_investable_surplus} />
            <Field label="Net Worth Band" value={client.net_worth_band} />
            <Field label="Total Liabilities" value={client.total_liabilities} />
            <Field label="Tax Residency" value={client.tax_residency} />
            <Field label="US Person (FATCA)" value={client.us_person_fatca} />
            <Field label="PEP Status" value={client.pep_status} />
            <Field label="Risk Profile" value={client.risk_profile} />
          </div>
        </div>

        {/* Advisor Notes + Final Approval */}
        <div className="border border-border rounded bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-ocean" />
            <h3 className="text-xs font-bold tracking-wider text-navy uppercase">Advisor Notes & Final Approval</h3>
          </div>

          {client.advisor_notes && (
            <div className="mb-3 p-3 bg-secondary/50 border border-border rounded">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Saved Notes</p>
              <p className="text-sm text-navy">{client.advisor_notes}</p>
            </div>
          )}

          <textarea
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] mb-3"
            placeholder="Add internal compliance notes (visible to advisors only)…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button onClick={handleSaveNotes} className="mb-5 px-4 py-1.5 border border-border text-xs font-semibold text-navy hover:bg-secondary transition-colors rounded">
            Save Notes
          </button>

          {/* Final decision — shown only when no decision has been made yet */}
          {!alreadyDecided && (
            <div className="border-t border-border pt-4 space-y-4">
              <p className="text-[10px] font-bold tracking-wider text-navy uppercase">Final Advisor Decision</p>
              <p className="text-xs text-muted-foreground">Actions are permanently recorded in the audit log and cannot be undone.</p>

              {/* Manual override toggle — only shown when automated verification did not pass */}
              {needsManualOverride && (
                <div className="p-3 border border-amber-200 rounded bg-amber-50">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualOverride}
                      onChange={e => setManualOverride(e.target.checked)}
                      className="w-3.5 h-3.5 accent-ocean mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">Manual Verification Override (required to approve)</p>
                      <p className="text-[10px] text-amber-700 mt-0.5">I confirm I have independently verified this client's identity and eligibility, and accept responsibility for this override.</p>
                    </div>
                  </label>
                  {manualOverride && (
                    <textarea
                      className="mt-2 w-full rounded border border-amber-300 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px]"
                      placeholder="Required: Document your reason for the manual override…"
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                    />
                  )}
                </div>
              )}

              {/* Reject form */}
              {showRejectForm && (
                <div className="p-3 border border-red-200 rounded bg-red-50">
                  <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason (required)</p>
                  <textarea
                    className="w-full rounded border border-red-300 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px]"
                    placeholder="Document the reason for rejection…"
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleReject}
                      disabled={isApproving}
                      className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-wide hover:bg-red-700 transition-colors rounded disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {isApproving ? 'Processing…' : 'Confirm Rejection'}
                    </button>
                    <button onClick={() => { setShowRejectForm(false); setRejectionReason(''); }} className="px-4 py-2 border border-border text-xs font-semibold text-navy hover:bg-secondary rounded">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!showRejectForm && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={isApproving || (needsManualOverride && !manualOverride)}
                    className="px-5 py-2.5 bg-teal text-white text-xs font-bold uppercase tracking-wide hover:bg-teal/90 transition-colors rounded disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isApproving ? 'Processing…' : 'Approve Client'}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={isApproving}
                    className="px-5 py-2.5 border border-red-300 bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wide hover:bg-red-100 transition-colors rounded disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject Client
                  </button>
                </div>
              )}
            </div>
          )}

          {alreadyApproved && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 text-teal mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-semibold">Client Approved & Active</span>
                {client.review_decision_at && <span className="text-xs text-muted-foreground ml-2">on {formatDate(client.review_decision_at)}</span>}
              </div>
              {client.manual_override_reason && (
                <p className="text-xs text-muted-foreground mt-1">⚠ Approved via manual override — {client.manual_override_reason}</p>
              )}
            </div>
          )}

          {alreadyRejected && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Client Rejected</span>
                {client.review_decision_at && <span className="text-xs text-muted-foreground ml-2">on {formatDate(client.review_decision_at)}</span>}
              </div>
              <p className="text-xs text-muted-foreground">Reason: {client.review_rejection_reason || '—'}</p>
            </div>
          )}
        </div>

        {/* Permanent Audit Log */}
        <div className="border border-border rounded bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-ocean" />
            <h3 className="text-xs font-bold tracking-wider text-navy uppercase">Audit Log</h3>
            <span className="ml-2 text-[10px] text-muted-foreground">All actions are permanent and cannot be deleted</span>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No audit entries yet for this client.</p>
          ) : (
            <div>
              {auditLogs.map(entry => <AuditEntry key={entry.id} entry={entry} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
