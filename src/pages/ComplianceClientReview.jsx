import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LogOut, CheckCircle2, AlertTriangle, XCircle, Clock, FileText, User, Shield, DollarSign, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
    <p className="text-sm text-navy mt-0.5">{value || '—'}</p>
  </div>
);

const DocRow = ({ label, uploaded, url }) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
    <div className="flex items-center gap-2">
      {uploaded ? <CheckCircle2 className="w-4 h-4 text-teal shrink-0" /> : <Clock className="w-4 h-4 text-muted-foreground shrink-0" />}
      <span className="text-sm text-navy">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${uploaded ? 'bg-teal/10 text-teal border-teal/20' : 'bg-secondary text-muted-foreground border-border'}`}>
        {uploaded ? 'Uploaded' : 'Missing'}
      </span>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-ocean hover:underline font-medium">View</a>
      )}
    </div>
  </div>
);

export default function ComplianceClientReview() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ['compliance-client', clientId],
    queryFn: async () => {
      const all = await base44.entities.Clients.list();
      return all.find(c => c.id === clientId) || null;
    },
  });

  const ficaChecks = (() => {
    if (!client?.fica_checks_json) return null;
    try { return JSON.parse(client.fica_checks_json); } catch { return null; }
  })();

  const rmcpBreakdown = (() => {
    if (!client?.rmcp_score_breakdown) return null;
    try { return JSON.parse(client.rmcp_score_breakdown); } catch { return null; }
  })();

  const handleApproval = async (status) => {
    if (!client) return;
    setIsApproving(true);
    try {
      await base44.entities.Clients.update(clientId, {
        client_status: status === 'approved' ? 'Active' : 'Draft',
        verification_status: status === 'approved' ? 'Verified' : 'Manual Review',
        advisor_review_required: status !== 'approved',
        advisor_notes: notes || client.advisor_notes || '',
        advisor_approved_at: status === 'approved' ? new Date().toISOString() : null,
        advisor_approval_status: status,
      });
      queryClient.invalidateQueries({ queryKey: ['compliance-client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['compliance-clients'] });
      toast.success(status === 'approved' ? 'Client approved successfully' : 'Client returned for review');
      if (status === 'approved') navigate('/compliance-review');
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) return;
    await base44.entities.Clients.update(clientId, { advisor_notes: notes });
    queryClient.invalidateQueries({ queryKey: ['compliance-client', clientId] });
    toast.success('Notes saved');
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-navy rounded-full animate-spin" />
    </div>
  );

  if (!client) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Client not found.</p>
    </div>
  );

  const clientName = client.full_name || client.entity_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client';
  const ficaApproved = client.fica_status === 'Approved';
  const docsSubmitted = client.doc_status === 'Submitted' || client.doc_status === 'Verified';
  const alreadyApproved = client.client_status === 'Active';

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
              <p className="font-semibold text-teal text-sm">Client Approved</p>
              <p className="text-xs text-muted-foreground">This client has been approved and is Active.</p>
            </div>
          </div>
        ) : client.fica_status === 'Referred' ? (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Manual Review Required</p>
              <p className="text-xs text-amber-700">FICA verification was referred. Review all checks below before approving.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded">
            <FileText className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">Pending Review</p>
              <p className="text-xs text-blue-700">Review client details and documents before making a final decision.</p>
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

          {/* FICA Verification Results */}
          <div className="border border-border rounded bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-ocean" />
              <h3 className="text-xs font-bold tracking-wider text-navy uppercase">FICA Verification Results</h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">FICA Status</span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                  client.fica_status === 'Approved' ? 'bg-teal/10 text-teal border-teal/20' :
                  client.fica_status === 'Referred' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-secondary text-muted-foreground border-border'
                }`}>{client.fica_status || 'Pending'}</span>
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
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${client.home_affairs_verified ? 'text-teal' : 'text-red-600'}`}>{client.home_affairs_verified ? '✓ Verified' : '✗ Not verified'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">AML / PEP Clear</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${client.aml_pep_clear ? 'text-teal' : 'text-amber-700'}`}>{client.aml_pep_clear ? '✓ Clear' : '⚠ Flagged'}</span>
              </div>
            </div>

            {/* RMCP Score */}
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
                    const color = s === 'pass' ? 'text-teal' : s === 'fail' ? 'text-red-600' : s === 'flag' ? 'text-amber-700' : 'text-muted-foreground';
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{check.label || key}</span>
                        <span className={`font-semibold ${color}`}>{s === 'pass' ? '✓ Pass' : s === 'fail' ? '✗ Fail' : s === 'flag' ? '⚠ Flagged' : s === 'skipped' ? '— Skipped' : s}</span>
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
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-ocean" />
            <h3 className="text-xs font-bold tracking-wider text-navy uppercase">Documents</h3>
            <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded border ${
              client.doc_status === 'Verified' ? 'bg-teal/10 text-teal border-teal/20' :
              client.doc_status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              'bg-secondary text-muted-foreground border-border'
            }`}>{client.doc_status || 'Pending'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <DocRow label="Identity Document" uploaded={client.identity_document_uploaded || !!client.doc_identity} url={client.doc_identity} />
            <DocRow label="Proof of Address" uploaded={client.proof_of_address_uploaded || !!client.doc_proof_of_address} url={client.doc_proof_of_address} />
            <DocRow label="Income / Source of Funds" uploaded={client.income_proof_uploaded || !!client.doc_source_of_funds} url={client.doc_source_of_funds} />
            <DocRow label="Existing Policies" uploaded={client.existing_policies_uploaded || !!client.doc_existing_policies} url={client.doc_existing_policies} />
          </div>
        </div>

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
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Existing Notes</p>
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

          {!alreadyApproved && (
            <>
              <div className="border-t border-border pt-4">
                <p className="text-[10px] font-bold tracking-wider text-navy uppercase mb-3">Final Approval Decision</p>
                <p className="text-xs text-muted-foreground mb-4">This action is restricted to advisors and cannot be performed from the client portal.</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleApproval('approved')}
                    disabled={isApproving}
                    className="px-5 py-2.5 bg-teal text-white text-xs font-bold uppercase tracking-wide hover:bg-teal/90 transition-colors rounded disabled:opacity-50"
                  >
                    {isApproving ? 'Processing…' : '✓ Approve Client'}
                  </button>
                  <button
                    onClick={() => handleApproval('returned')}
                    disabled={isApproving}
                    className="px-5 py-2.5 border border-amber-300 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wide hover:bg-amber-100 transition-colors rounded disabled:opacity-50"
                  >
                    ⚠ Return for Review
                  </button>
                </div>
              </div>
            </>
          )}

          {alreadyApproved && (
            <div className="border-t border-border pt-4 flex items-center gap-2 text-teal">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold">This client has been approved</span>
              {client.advisor_approved_at && <span className="text-xs text-muted-foreground ml-2">on {formatDate(client.advisor_approved_at)}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}