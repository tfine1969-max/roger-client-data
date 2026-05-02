import React from 'react';
import { AlertTriangle } from 'lucide-react';

const FicaComplianceSummary = ({ proposal, client }) => {
  if (!proposal || !client) return null;

  const parseFicaChecks = (value) => {
    if (!value) return null;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return null;
    }
  };

  const getFailureReasons = () => {
    const reasons = [];
    if (client.fica_failure_reason) reasons.push(client.fica_failure_reason);

    const checks = parseFicaChecks(client.fica_checks_json);
    if (!checks) return [...new Set(reasons)].filter(Boolean);

    Object.entries(checks).forEach(([key, check]) => {
      if (!check) return;
      if (Array.isArray(check)) {
        check.forEach(item => {
          const name = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.name || key;
          if (item.id_verified === false) reasons.push(`${name}: ID verification failed`);
          if (item.aml_clear === false) reasons.push(`${name}: AML / PEP match detected`);
        });
        return;
      }
      if (typeof check === 'object') {
        if (check.status === 'fail') reasons.push(`${check.label || key}: ${check.reason || check.note || 'Failed'}`);
        if (check.status === 'flag') reasons.push(`${check.label || key}: ${check.reason || check.note || 'Requires review'}`);
      } else if (check === false) {
        reasons.push(`${key}: failed`);
      }
    });

    if (checks.cipc === false) reasons.push('CIPC registration could not be verified');
    return [...new Set(reasons)].filter(Boolean);
  };

  const getFicaStatusStyle = (status) => {
    if (status === 'Approved') return { bg: '#f0fdf4', text: '#166534', label: 'Verified' };
    if (status === 'Referred') return { bg: '#fef3c7', text: '#b45309', label: 'EDD Required' };
    if (status === 'Declined') return { bg: '#fef2f2', text: '#991b1b', label: 'Not Verified' };
    return { bg: '#f3f4f6', text: '#6b7280', label: 'Pending' };
  };

  const getRiskBandColor = (band) => {
    if (band === 'Low') return '#166534';
    if (band === 'Medium') return '#b45309';
    if (band === 'High' || band === 'Prohibited') return '#991b1b';
    return '#6b7280';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const ficaStatus = client.fica_status || proposal.fica_status;
  const failureReasons = getFailureReasons();

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
      {/* Alert Banner for Referred/Declined */}
      {(ficaStatus === 'Referred' || ficaStatus === 'Declined') && (
        <div style={{ background: '#fee2e2', borderBottom: '1px solid #fecdd3', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle className="w-5 h-5" style={{ color: '#991b1b', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
            Enhanced Due Diligence required — contact client before proceeding with any advice.
          </p>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-xs font-semibold tracking-widest text-ocean uppercase mb-4">FICA & AML Compliance Summary</h3>

        <div className="grid grid-cols-4 gap-4">
          {/* FICA Status */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">FICA Status</p>
            {ficaStatus ? (
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 4,
                  background: getFicaStatusStyle(ficaStatus).bg,
                  color: getFicaStatusStyle(ficaStatus).text,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {getFicaStatusStyle(ficaStatus).label}
              </div>
            ) : (
              <p className="text-sm font-medium text-navy">—</p>
            )}
          </div>

          {/* FICA Reference */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">FICA Reference</p>
            <p className="text-sm font-medium text-navy font-mono">{client.fica_reference || proposal.fica_reference || '—'}</p>
          </div>

          {/* Risk Band */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Risk Band</p>
            {client.fica_risk_band || proposal.fica_risk_band ? (
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 4,
                  background: '#f3f4f6',
                  color: getRiskBandColor(client.fica_risk_band || proposal.fica_risk_band),
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {client.fica_risk_band || proposal.fica_risk_band}
              </div>
            ) : (
              <p className="text-sm font-medium text-navy">—</p>
            )}
          </div>

          {/* Verified On */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Verified On</p>
            <p className="text-sm font-medium text-navy">{formatDate(client.fica_verified_at || proposal.fica_verified_at)}</p>
          </div>

          {/* RMCP Score */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">RMCP Score</p>
            <p className="text-sm font-medium text-navy">
              {(client.client_type === 'Company' || client.client_type === 'Trust')
                ? 'N/A — entity client'
                : (client.rmcp_risk_score || proposal.rmcp_risk_score)
                  ? `${client.rmcp_risk_score || proposal.rmcp_risk_score} / 100`
                  : '—'}
            </p>
          </div>

          {/* Re-verification Due */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Re-verification Due</p>
            <p className="text-sm font-medium text-navy">
              {client.fica_next_reverification_date ? formatDate(client.fica_next_reverification_date) : 'Not yet set'}
            </p>
          </div>

          {/* Home Affairs Verified */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Home Affairs Verified</p>
            <p className="text-sm font-medium text-navy">{client.home_affairs_verified ? 'Yes' : 'No'}</p>
          </div>

          {/* AML Clear */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">AML Clear</p>
            <p className="text-sm font-medium text-navy">{client.aml_pep_clear ? 'Yes' : 'No'}</p>
          </div>

          {/* Offshore Exposure */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Offshore Exposure</p>
            <p className="text-sm font-medium text-navy">{proposal.offshore_exposure ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {failureReasons.length > 0 && (
          <div className="mt-4 p-3 rounded border" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#9a3412' }}>
              FICA Check Reasons
            </p>
            <ul className="space-y-1 m-0 pl-4">
              {failureReasons.map((reason, idx) => (
                <li key={idx} className="text-xs" style={{ color: '#7c2d12' }}>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default FicaComplianceSummary;
