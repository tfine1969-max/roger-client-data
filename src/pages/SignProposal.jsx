import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import generateProposalPdf from "@/lib/generateProposalPdf";

export default function SignProposal() {
  const { proposalId } = useParams();
  const [status, setStatus] = useState("loading");
  // status: loading | invalid | already_signed | ready | submitting | success | error
  const [proposal, setProposal] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [initials, setInitials] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadProposal();
  }, [proposalId]);

  // Init signature pad once canvas is visible
  useEffect(() => {
    if (status === 'ready') {
      setTimeout(initPad, 100);
    }
  }, [status]);

  const initPad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let drawing = false;
    let points = [];
    const empty = { current: true };
    sigPadRef.current = { isEmpty: () => empty.current, clear: () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      empty.current = true;
      setIsDrawing(false);
    }, toDataURL: () => canvas.toDataURL('image/png') };

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    };
    const start = (e) => { e.preventDefault(); drawing = true; empty.current = false; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); setIsDrawing(true); };
    const move = (e) => { e.preventDefault(); if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const end = (e) => { e.preventDefault(); drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
  };

  const loadProposal = async () => {
    try {
      if (!proposalId) {
        setDebugInfo('No proposalId in URL params');
        setStatus("invalid");
        return;
      }

      setDebugInfo(`Loading proposal: ${proposalId}`);
      const res = await base44.functions.invoke('signProposal', { action: 'load', proposalId });
      const found = res.data?.proposal;

      if (!found) {
        setDebugInfo('Proposal not found');
        setStatus("invalid");
        return;
      }

      setDebugInfo(`Found: ${found.id} — ${found.status}`);

      if (found.status === 'Signed') {
        setProposal(found);
        setStatus("already_signed");
        return;
      }

      setProposal(found);
      setStatus("ready");

    } catch (err) {
      setDebugInfo(`Error: ${err?.message || JSON.stringify(err)}`);
      setStatus("error");
    }
  };

  const handleSubmit = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert('Please draw your signature before submitting.');
      return;
    }
    if (!initials.trim()) {
      alert('Please enter your initials.');
      return;
    }
    if (!agreed) {
      alert('Please confirm that you have read and accept this document.');
      return;
    }

    setSubmitting(true);

    const timeoutId = setTimeout(() => {
      setSubmitting(false);
      alert('Submission timed out. Please check your connection and try again.');
    }, 60000);

    try {
      const signatureBase64 = sigPadRef.current.toDataURL();
      const initialsValue = initials.trim().toUpperCase();
      const signedAt = new Date().toISOString();

      const signatureData = {
        clientSignature: signatureBase64,
        clientInitials: initialsValue,
        signedAt,
      };

      // STEP 1 — Generate signed PDF client-side with embedded signature
      let signedPdfUrl = null;
      try {
        const related = await base44.functions.invoke('signProposal', {
          action: 'getRelated',
          proposalId: proposal.id,
        });
        const { investments, riskProducts } = related.data;

        const doc = await generateProposalPdf(proposal, investments, riskProducts, signatureData);
        const pdfBlob = doc.output('blob');
        const safeName = (proposal.client_name || '').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
        const signedFilename = safeName ? `${safeName}_${proposal.reference || proposal.id}-signed.pdf` : `${proposal.reference || proposal.id}-signed.pdf`;
        const pdfFile = new File([pdfBlob], signedFilename, { type: 'application/pdf' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
        signedPdfUrl = file_url;
      } catch (pdfErr) {
        console.warn('PDF generation failed (non-blocking):', pdfErr);
      }

      // STEP 2 — Save to DB + notify advisor via backend (service role bypasses RLS)
      await base44.functions.invoke('signProposal', {
        action: 'submit',
        proposalId: proposal.id,
        clientInitials: initialsValue,
        signedAt,
        signedPdfUrl,
      });

      clearTimeout(timeoutId);
      setSubmitting(false);
      setStatus('success');
    } catch (err) {
      clearTimeout(timeoutId);
      setSubmitting(false);
      setDebugInfo(`Submit error: ${err?.message || JSON.stringify(err)}`);
      alert(`Submission failed: ${err?.message || 'Unknown error. Please try again.'}`);
    }
  };

  // ── States ──────────────────────────────────────────────────────────────────

  if (status === "loading") return (
    <div style={pageStyle}>
      <div style={{ width: 32, height: 32, border: '4px solid #e2e8f0', borderTopColor: '#1e3a5f', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
      <p style={{ color: '#64748b', fontSize: 14 }}>Loading your document...</p>
      <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 8 }}>{debugInfo}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (status === "error") return (
    <div style={pageStyle}>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>Something went wrong</p>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Please contact your advisor.</p>
      <p style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, maxWidth: 500, wordBreak: 'break-all' }}>{debugInfo}</p>
    </div>
  );

  if (status === "invalid") return (
    <div style={pageStyle}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>Link Invalid or Expired</p>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>This signing link is invalid or has expired. Please contact your advisor.</p>
      <p style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, maxWidth: 500, wordBreak: 'break-all', textAlign: 'left' }}>
        Debug: {debugInfo}
      </p>
    </div>
  );

  if (status === "already_signed") return (
    <div style={pageStyle}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#166534', marginBottom: 8 }}>Document Already Signed</p>
      <p style={{ color: '#64748b', fontSize: 13 }}>This document has already been signed. Thank you, {proposal?.client_name}.</p>
    </div>
  );

  if (status === "success") return (
    <div style={pageStyle}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#166534', marginBottom: 8 }}>Document Signed Successfully</p>
      <p style={{ color: '#64748b', fontSize: 13 }}>Thank you, {proposal?.client_name}. Your signed document has been submitted to your advisor.</p>
    </div>
  );

  // ── Ready — signing UI ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: '#1e3a5f', color: '#fff', borderRadius: '12px 12px 0 0', padding: '24px 32px', marginBottom: 2 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.7 }}>
            Wealthworks Investments (Pty) Ltd · FSP 45624
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700 }}>Financial Strategy &amp; Recommendation Report</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.7 }}>Ref: {proposal?.reference || proposal?.id}</p>
        </div>

        {/* Intro */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', padding: '28px 32px', marginBottom: 2 }}>
          <p style={{ color: '#334155', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            Dear <strong>{(proposal?.client_name || '').split(' ')[0] || 'Client'}</strong>,<br /><br />
            Please review your Financial Strategy &amp; Recommendation Report. Once you have read it, please sign and initial below to confirm your acceptance.
          </p>
        </div>

        {/* PDF link */}
        {proposal?.proposal_pdf_url && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderTop: 'none', padding: '16px 32px', marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e40af' }}>Your Recommendation Report</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#3b82f6' }}>Click to open and read your full report before signing</p>
            </div>
            <a href={proposal.proposal_pdf_url} target="_blank" rel="noopener noreferrer"
              style={{ background: '#1e3a5f', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              Open PDF
            </a>
          </div>
        )}

        {/* Signing panel */}
        <div style={{ background: '#fff', border: '2px solid #1e3a5f', borderRadius: '0 0 12px 12px', padding: '32px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
            Sign Document
          </p>

          {/* Signature canvas */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Your Signature</label>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff', position: 'relative', height: 140 }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair' }} />
              {!isDrawing && (!sigPadRef.current || sigPadRef.current.isEmpty()) && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>Draw your signature here</span>
                </div>
              )}
            </div>
            <button onClick={() => sigPadRef.current?.clear()}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', marginTop: 4, padding: 0 }}>
              Clear signature
            </button>
          </div>

          {/* Initials */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Initials</label>
            <input
              type="text"
              value={initials}
              onChange={e => setInitials(e.target.value.toUpperCase())}
              placeholder="e.g. JP"
              maxLength={6}
              style={{ width: 120, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16, fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}
            />
          </div>

          {/* Confirmation checkbox */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#334155', marginBottom: 24, cursor: 'pointer' }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#1e3a5f', flexShrink: 0, width: 16, height: 16 }} />
            I confirm that I have read and understood this document and accept the recommendations and terms contained herein.
          </label>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              background: submitting ? '#94a3b8' : '#1e3a5f',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '14px 24px', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.8px', textTransform: 'uppercase',
              width: '100%', cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT SIGNATURE'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 24 }}>
          Wealth Works (Pty) Ltd FSP 28337 · Wealthworks Investments (Pty) Ltd FSP 45624
        </p>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: '#f8fafc', textAlign: 'center', padding: 40,
};

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700,
  letterSpacing: '1px', textTransform: 'uppercase',
  color: '#64748b', marginBottom: 8,
};