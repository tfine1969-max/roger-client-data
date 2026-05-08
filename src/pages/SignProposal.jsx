import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import generateProposalPdf from "@/lib/generateProposalPdf";

export default function SignProposal() {
  const { proposalId } = useParams();
  const [status, setStatus] = useState("loading");
  const [proposal, setProposal] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [initials, setInitials] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => { loadProposal(); }, [proposalId]);

  useEffect(() => {
    if (status === 'ready') setTimeout(initPad, 100);
  }, [status]);

  const initPad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = '#0E4166';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let drawing = false;
    const empty = { current: true };
    sigPadRef.current = {
      isEmpty: () => empty.current,
      clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); empty.current = true; setIsDrawing(false); },
      toDataURL: () => canvas.toDataURL('image/png'),
    };

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
      if (!proposalId) { setDebugInfo('No proposalId in URL params'); setStatus("invalid"); return; }
      setDebugInfo(`Loading proposal: ${proposalId}`);
      const res = await base44.functions.invoke('signProposal', { action: 'load', proposalId });
      const found = res.data?.proposal;
      if (!found) { setDebugInfo('Proposal not found'); setStatus("invalid"); return; }
      setDebugInfo(`Found: ${found.id} — ${found.status}`);
      if (found.status === 'Signed') { setProposal(found); setStatus("already_signed"); return; }
      setProposal(found);
      setStatus("ready");
    } catch (err) {
      setDebugInfo(`Error: ${err?.message || JSON.stringify(err)}`);
      setStatus("error");
    }
  };

  const handleSubmit = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) { alert('Please draw your signature before submitting.'); return; }
    if (!initials.trim()) { alert('Please enter your initials.'); return; }
    if (!agreed) { alert('Please confirm that you have read and accept this document.'); return; }

    setSubmitting(true);
    const timeoutId = setTimeout(() => { setSubmitting(false); alert('Submission timed out. Please try again.'); }, 60000);

    try {
      const signatureBase64 = sigPadRef.current.toDataURL();
      const initialsValue = initials.trim().toUpperCase();
      const signedAt = new Date().toISOString();
      const signatureData = { clientSignature: signatureBase64, clientInitials: initialsValue, signedAt };

      let signedPdfUrl = null;
      try {
        const related = await base44.functions.invoke('signProposal', { action: 'getRelated', proposalId: proposal.id });
        const { investments, riskProducts } = related.data;
        const doc = await generateProposalPdf(proposal, investments, riskProducts, signatureData);
        const pdfBlob = doc.output('blob');
        const safeName = (proposal.client_name || '').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
        const signedFilename = safeName ? `${safeName}_${proposal.reference || proposal.id}-signed.pdf` : `${proposal.reference || proposal.id}-signed.pdf`;
        const pdfFile = new File([pdfBlob], signedFilename, { type: 'application/pdf' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
        signedPdfUrl = file_url;
      } catch (pdfErr) { console.warn('PDF generation failed (non-blocking):', pdfErr); }

      await base44.functions.invoke('signProposal', { action: 'submit', proposalId: proposal.id, clientInitials: initialsValue, signedAt, signedPdfUrl });

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

  // ── Status pages ────────────────────────────────────────────────────────────

  if (status === "loading") return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-10">
      <div className="w-8 h-8 border-4 border-border border-t-navy rounded-full animate-spin mb-4" />
      <p className="text-muted-foreground text-sm">Loading your document...</p>
      <p className="text-muted-foreground/60 text-[11px] mt-2 font-mono">{debugInfo}</p>
    </div>
  );

  if (status === "error") return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-10">
      <p className="text-xl font-bold text-navy mb-2">Something went wrong</p>
      <p className="text-muted-foreground text-sm mb-4">Please contact your advisor.</p>
      <p className="text-[11px] font-mono bg-muted text-muted-foreground px-3 py-2 rounded max-w-lg break-all">{debugInfo}</p>
    </div>
  );

  if (status === "invalid") return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-10">
      <div className="text-5xl mb-4">🔒</div>
      <p className="text-xl font-bold text-navy mb-2">Link Invalid or Expired</p>
      <p className="text-muted-foreground text-sm mb-4">This signing link is invalid or has expired. Please contact your advisor.</p>
      <p className="text-[11px] font-mono bg-muted text-muted-foreground px-3 py-2 rounded max-w-lg break-all text-left">{debugInfo}</p>
    </div>
  );

  if (status === "already_signed") return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-10">
      <div className="text-5xl mb-4">✅</div>
      <p className="text-xl font-bold text-green-700 mb-2">Document Already Signed</p>
      <p className="text-muted-foreground text-sm">This document has already been signed. Thank you, {proposal?.client_name}.</p>
    </div>
  );

  if (status === "success") return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-10">
      <div className="text-5xl mb-4">🎉</div>
      <p className="text-xl font-bold text-green-700 mb-2">Document Signed Successfully</p>
      <p className="text-muted-foreground text-sm">Thank you, {proposal?.client_name}. Your signed document has been submitted to your advisor.</p>
    </div>
  );

  // ── Ready — signing UI ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-10 px-5">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-navy text-white rounded-t-xl px-6 py-5 mb-0.5">
          <p className="text-[11px] uppercase tracking-widest text-white/70 mb-1">
            Wealthworks Investments (Pty) Ltd · FSP 45624
          </p>
          <p className="text-lg font-bold">Financial Strategy &amp; Recommendation Report</p>
          <p className="text-[12px] text-white/70 mt-1">Ref: {proposal?.reference || proposal?.id}</p>
        </div>

        {/* Intro */}
        <div className="bg-card border border-border border-t-0 px-6 py-5 mb-0.5">
          <p className="text-foreground text-sm leading-relaxed">
            Dear <strong>{(proposal?.client_name || '').split(' ')[0] || 'Client'}</strong>,<br /><br />
            Please review your Financial Strategy &amp; Recommendation Report. Once you have read it, please sign and initial below to confirm your acceptance.
          </p>
        </div>

        {/* PDF link */}
        {proposal?.proposal_pdf_url && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 border-t-0 px-6 py-4 mb-0.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 m-0">Your Recommendation Report</p>
              <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5">Click to open and read your full report before signing</p>
            </div>
            <a href={proposal.proposal_pdf_url} target="_blank" rel="noopener noreferrer"
              className="bg-navy text-white text-[12px] font-bold px-4 py-2 hover:bg-ocean transition-colors whitespace-nowrap">
              Open PDF
            </a>
          </div>
        )}

        {/* Signing panel */}
        <div className="bg-card border-2 border-navy rounded-b-xl px-6 py-7">
          <p className="text-sm font-bold text-navy mb-5 pb-3 border-b border-border">Sign Document</p>

          {/* Signature canvas */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Your Signature</label>
            <div className="border border-border bg-white rounded-lg overflow-hidden relative h-36">
              <canvas ref={canvasRef} className="w-full h-full block touch-none cursor-crosshair" />
              {!isDrawing && (!sigPadRef.current || sigPadRef.current.isEmpty()) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-muted-foreground text-sm italic">Draw your signature here</span>
                </div>
              )}
            </div>
            <button onClick={() => sigPadRef.current?.clear()}
              className="text-muted-foreground text-[11px] mt-1 hover:text-foreground transition-colors bg-transparent border-none cursor-pointer p-0">
              Clear signature
            </button>
          </div>

          {/* Initials */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Initials</label>
            <input
              type="text"
              value={initials}
              onChange={e => setInitials(e.target.value.toUpperCase())}
              placeholder="e.g. JP"
              maxLength={6}
              className="w-28 px-3 py-2.5 border border-input bg-background text-base font-bold tracking-[4px] text-center uppercase rounded-lg focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 text-sm text-foreground mb-6 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 flex-shrink-0 accent-navy" />
            I confirm that I have read and understood this document and accept the recommendations and terms contained herein.
          </label>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 bg-navy text-white text-sm font-bold uppercase tracking-widest hover:bg-ocean transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT SIGNATURE'}
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Wealth Works (Pty) Ltd FSP 28337 · Wealthworks Investments (Pty) Ltd FSP 45624
        </p>
      </div>
    </div>
  );
}