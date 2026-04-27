import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import generateProposalPdf from '@/lib/generateProposalPdf';

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return [String(d.getDate()).padStart(2,'0'), String(d.getMonth()+1).padStart(2,'0'), d.getFullYear()].join('-')
      + ' ' + [String(d.getHours()).padStart(2,'0'), String(d.getMinutes()).padStart(2,'0')].join(':');
  } catch { return iso; }
};

export default function SignProposal() {
  const { token } = useParams();
  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);

  const [proposal, setProposal] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [riskProducts, setRiskProducts] = useState([]);
  const [state, setState] = useState('loading'); // loading | invalid | already_signed | ready | submitting | success
  const [initials, setInitials] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  // Load signature_pad from CDN
  useEffect(() => {
    if (window.SignaturePad) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/signature_pad/4.1.7/signature_pad.umd.min.js';
    script.onload = () => { if (canvasRef.current) initPad(); };
    document.head.appendChild(script);
  }, []);

  const initPad = () => {
    if (!canvasRef.current || !window.SignaturePad) return;
    if (sigPadRef.current) return;
    sigPadRef.current = new window.SignaturePad(canvasRef.current, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(14,65,102)',
    });
    resizeCanvas();
  };

  const resizeCanvas = () => {
    if (!canvasRef.current || !sigPadRef.current) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    sigPadRef.current.clear();
  };

  useEffect(() => {
    const load = async () => {
      const all = await base44.entities.Proposal.list();
      const found = all.find(p => p.signing_token === token);
      if (!found) { setState('invalid'); return; }
      if (found.status === 'Signed') { setProposal(found); setState('already_signed'); return; }

      // Load investments & risk products
      const allInv = await base44.entities.Investments.list();
      const propInv = allInv.filter(i => i.proposal_id === found.id);
      const allRp = await base44.entities.RiskProducts.list();
      const propRp = allRp.filter(r => r.proposal_id === found.id);
      const coversArr = await Promise.all(propRp.map(rp => base44.entities.RiskCovers.filter({ risk_product_id: rp.id })));
      const rpWithCovers = propRp.map((rp, i) => ({
        ...rp,
        _covers: coversArr[i] || [],
        covers: coversArr[i] || [],
        total_premium: (coversArr[i] || []).reduce((s, c) => s + (parseFloat(c.premium) || 0), 0),
      }));

      setProposal(found);
      setInvestments(propInv);
      setRiskProducts(rpWithCovers);

      // Update status to Awaiting Client Signature
      await base44.entities.Proposal.update(found.id, { status: 'Awaiting Client Signature' });
      setProposal(prev => ({ ...prev, status: 'Awaiting Client Signature' }));
      setState('ready');
    };
    load().catch(() => setState('invalid'));
  }, [token]);

  // Init pad once canvas is visible
  useEffect(() => {
    if (state === 'ready') setTimeout(initPad, 100);
  }, [state]);

  const clearPad = () => sigPadRef.current?.clear();

  const handleSubmit = async () => {
    setError('');
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      setError('Please provide your signature.'); return;
    }
    if (!initials.trim()) { setError('Please enter your initials.'); return; }
    if (!confirmed) { setError('Please confirm you have read and understood the document.'); return; }

    setState('submitting');
    const signatureData = sigPadRef.current.toDataURL('image/png');
    const signedAt = new Date().toISOString();

    await base44.entities.Proposal.update(proposal.id, {
      client_signature: signatureData,
      client_initials: initials.trim(),
      signed_at: signedAt,
      status: 'Signed',
    });

    // Generate signed PDF and upload
    const signedProposal = {
      ...proposal,
      client_signature: signatureData,
      client_initials: initials.trim(),
      signed_at: signedAt,
      status: 'Signed',
    };
    const doc = await generateProposalPdf(signedProposal, investments, riskProducts);
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `${proposal.reference || 'signed'}-signed.pdf`, { type: 'application/pdf' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    await base44.entities.Proposal.update(proposal.id, { signed_pdf_url: file_url });

    // Notify advisor
    const signedAtFmt = fmtDate(signedAt);
    await base44.integrations.Core.SendEmail({
      from_name: 'Wealthworks',
      to: 'tfine1969@gmail.com',
      subject: `Document Signed — ${proposal.client_name || ''} — ${proposal.reference || ''}`,
      body: `${proposal.client_name || 'The client'} has signed their Financial Strategy & Recommendation Report.\n\nProposal Reference: ${proposal.reference || '—'}\nSigned at: ${signedAtFmt}\n\nPlease log in to the WealthWorks portal to view the signed document on the client's profile.`,
    });

    setState('success');
  };

  if (state === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-border border-t-navy rounded-full animate-spin" />
    </div>
  );

  if (state === 'invalid') return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-navy mb-2">Link Invalid or Expired</h1>
        <p className="text-sm text-muted-foreground">This signing link is invalid or has expired. Please contact your advisor.</p>
      </div>
    </div>
  );

  if (state === 'already_signed') return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-navy mb-2">Already Signed</h1>
        <p className="text-sm text-muted-foreground">This document has already been signed. Thank you, {proposal?.client_name}.</p>
      </div>
    </div>
  );

  if (state === 'success') return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold text-navy mb-2">Document Signed Successfully</h1>
        <p className="text-sm text-muted-foreground">Thank you, {proposal?.client_name}. Your document has been signed successfully. Your advisor will be in touch.</p>
      </div>
    </div>
  );

  const firstName = (proposal?.client_name || '').split(' ')[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-navy text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg tracking-tight">wealthworks</div>
          <div className="text-[10px] text-white/60 uppercase tracking-widest">Financial Strategy Report</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/70">Prepared for</div>
          <div className="font-semibold text-sm">{proposal?.client_name}</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Intro */}
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm text-navy leading-relaxed">
            Dear <strong>{firstName}</strong>,<br /><br />
            Please review your Financial Strategy &amp; Recommendation Report below. Once you have read it, please sign and initial at the bottom to confirm your acceptance.
          </p>
        </div>

        {/* Proposal summary info */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-3">Proposal Summary</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Reference', proposal?.reference],
              ['Client', proposal?.client_name],
              ['Advisor', proposal?.advisor_name],
              ['Risk Profile', proposal?.risk_profile],
              ['Time Horizon', proposal?.time_horizon],
              ['Investments', investments.length],
            ].map(([l, v]) => (
              <div key={l}>
                <span className="text-muted-foreground uppercase text-[9px] tracking-wide font-semibold">{l}</span>
                <div className="text-navy font-medium mt-0.5">{v || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PDF download link */}
        {proposal?.proposal_pdf_url && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">Your Recommendation Report</p>
              <p className="text-xs text-blue-700 mt-0.5">Click to open and read your full report before signing.</p>
            </div>
            <a href={proposal.proposal_pdf_url} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-navy text-white text-xs font-semibold rounded-sm hover:bg-ocean transition-colors">
              Open PDF
            </a>
          </div>
        )}

        {/* SIGNING PANEL */}
        <div className="bg-card border-2 border-navy rounded-lg p-6 space-y-6">
          <h2 className="text-sm font-bold text-navy uppercase tracking-wider">Sign Your Document</h2>

          {/* Signature pad */}
          <div>
            <label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-2">Signature</label>
            <div className="border-2 border-border rounded-sm bg-white relative" style={{ height: 140 }}>
              <canvas ref={canvasRef} className="w-full h-full rounded-sm"
                onPointerDown={() => setIsDrawing(true)}
                onPointerUp={() => setIsDrawing(false)} />
              {!isDrawing && sigPadRef.current?.isEmpty() && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground italic">Draw your signature here</span>
                </div>
              )}
            </div>
            <button type="button" onClick={clearPad}
              className="mt-1.5 text-[10px] text-ocean hover:text-navy font-medium">
              Clear signature
            </button>
          </div>

          {/* Initials */}
          <div>
            <label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-2">Initials</label>
            <input
              type="text"
              value={initials}
              onChange={e => setInitials(e.target.value.toUpperCase())}
              placeholder="e.g. J.S."
              maxLength={10}
              className="w-40 h-9 border border-border rounded-sm text-sm text-navy font-bold text-center px-2 bg-white focus:outline-none focus:ring-1 focus:ring-navy"
            />
            <p className="text-[9px] text-muted-foreground mt-1">Your initials will be applied to each page of the document.</p>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-navy shrink-0" />
            <span className="text-xs text-navy leading-relaxed">
              I confirm that I have read and understood this document and accept the recommendations contained herein.
            </span>
          </label>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={state === 'submitting'}
            className="w-full py-3 bg-navy text-white font-bold text-sm uppercase tracking-wider rounded-sm hover:bg-ocean transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {state === 'submitting' ? 'Submitting...' : 'Submit Signature'}
          </button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground pb-8">
          Wealth Works (Pty) Ltd FSP 28337 · Wealthworks Investments (Pty) Ltd FSP 45624
        </p>
      </div>
    </div>
  );
}