import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import WealthWorksLogo from '@/components/layout/WealthWorksLogo';
import { parseRandValue, formatRand } from '@/lib/constants';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientSign() {
  const urlParams = new URLSearchParams(window.location.search);
  const proposalId = urlParams.get('id');
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('draw');
  const [typedName, setTypedName] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signed, setSigned] = useState(false);
  const drawingRef = useRef(false);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['client-proposal', proposalId],
    queryFn: () => base44.entities.Proposal.filter({ id: proposalId }),
    select: d => d[0],
    enabled: !!proposalId,
  });

  const signMutation = useMutation({
    mutationFn: async (sigData) => {
      await base44.entities.Proposal.update(proposalId, {
        client_signature_data: sigData,
        client_signed_date: new Date().toISOString().split('T')[0],
        status: 'client_signed'
      });
    },
    onSuccess: () => {
      setSigned(true);
      toast.success('Thank you — your signature has been recorded');
    }
  });

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0E4166';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) * sx, y: (cy - r.top) * sy };
  }, []);

  const handleStart = useCallback((e) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }, [mode, getPos]);

  const handleMove = useCallback((e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasDrawn(true);
  }, [getPos]);

  const handleEnd = useCallback(() => {
    drawingRef.current = false;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);
    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
    };
  }, [handleStart, handleMove, handleEnd]);

  const clearSig = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
    setTypedName('');
  };

  const handleSign = () => {
    let sigData = '';
    if (mode === 'draw') {
      sigData = canvasRef.current.toDataURL();
    } else {
      sigData = typedName;
    }
    if (!sigData) return;
    signMutation.mutate(sigData);
  };

  const hasSig = mode === 'draw' ? hasDrawn : typedName.trim().length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-navy" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-lg font-medium text-navy mb-2">Proposal not found</h2>
          <p className="text-sm text-muted-foreground">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  if (signed || proposal.status === 'client_signed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-forest" />
          </div>
          <h2 className="text-xl font-medium text-navy mb-2">Thank you</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your signature has been recorded for proposal <strong>{proposal.reference}</strong>. 
            Your advisor will be in touch.
          </p>
        </div>
      </div>
    );
  }

  const t1 = parseRandValue(proposal.rec1_premium);
  const t2 = parseRandValue(proposal.rec2_premium);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-navy px-6 py-4 flex items-center justify-between">
        <WealthWorksLogo size="md" light />
        <span className="text-[9px] text-white/36">FSP 28337</span>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="text-[9px] font-medium tracking-[.14em] uppercase text-ocean mb-1">Financial proposal</div>
        <h1 className="text-xl font-medium text-navy mb-1">{proposal.reference}</h1>
        <p className="text-sm text-muted-foreground mb-6">Prepared for {proposal.client_name}</p>

        {/* Summary */}
        <div className="border border-border bg-card p-5 mb-6">
          <div className="text-[9px] font-medium tracking-[.12em] uppercase text-navy mb-3">Proposal summary</div>
          <SRow label="Needs identified" value={proposal.needs_identified} />
          <SRow label="Risk profile" value={proposal.risk_profile} />
          <SRow label="Budget" value={proposal.monthly_budget} />

          {proposal.rec1_category && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-[9px] font-medium tracking-[.12em] uppercase text-navy mb-2">{proposal.rec1_category}</div>
              <SRow label="Provider" value={proposal.rec1_provider} />
              <SRow label="Cover" value={proposal.rec1_amount} />
              <SRow label="Monthly" value={proposal.rec1_premium} />
            </div>
          )}
          {proposal.rec2_category && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-[9px] font-medium tracking-[.12em] uppercase text-navy mb-2">{proposal.rec2_category}</div>
              <SRow label="Provider" value={proposal.rec2_provider} />
              <SRow label="Cover" value={proposal.rec2_amount} />
              <SRow label="Monthly" value={proposal.rec2_premium} />
            </div>
          )}

          <div className="mt-3 pt-3 border-t-2 border-navy flex justify-between text-sm">
            <span className="font-medium text-navy">Total monthly</span>
            <span className="font-medium text-navy">{t1 + t2 > 0 ? formatRand(t1 + t2) : '—'}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          {proposal.proposal_pdf_url && (
            <a href={proposal.proposal_pdf_url} target="_blank" rel="noopener noreferrer"
              className="block w-full bg-muted text-center py-3 text-sm text-ocean font-medium border border-border hover:bg-blue-50 transition-colors">
              📄 Download proposal PDF
            </a>
          )}
          {proposal.quote_file_url && (
            <a href={proposal.quote_file_url} target="_blank" rel="noopener noreferrer"
              className="block w-full bg-muted text-center py-3 text-sm text-ocean font-medium border border-border hover:bg-blue-50 transition-colors">
              📄 Download product quote PDF
            </a>
          )}
        </div>

        {/* Signature */}
        <div className="border border-border bg-card border-t-2 border-t-gold">
          <div className="p-5">
            <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy mb-2">
              Client acceptance
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              By signing below, you confirm that you have read and understand the recommendations outlined in this proposal.
            </p>

            <div className="border border-border overflow-hidden">
              <div className="px-3.5 py-2.5 bg-muted border-b border-border flex items-center justify-between">
                <span className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">
                  {proposal.client_name}
                </span>
                <span className="text-[11px] text-muted-foreground">Draw or type</span>
              </div>

              {mode === 'draw' ? (
                <canvas ref={canvasRef} width={800} height={100}
                  className="block w-full h-[100px] cursor-crosshair touch-none bg-white" />
              ) : (
                <input type="text" value={typedName} onChange={e => setTypedName(e.target.value)}
                  placeholder="Type your full name"
                  className="w-full font-lora italic text-xl text-navy border-0 border-b border-border px-3.5 py-3 outline-none" />
              )}

              <div className="flex gap-2 px-3 py-2 border-t border-border bg-muted">
                <button onClick={() => setMode('draw')}
                  className={`text-xs font-medium px-3.5 py-1.5 uppercase ${mode === 'draw' ? 'bg-navy text-white' : 'text-muted-foreground border border-border'}`}>
                  ✎ Draw
                </button>
                <button onClick={() => setMode('type')}
                  className={`text-xs font-medium px-3.5 py-1.5 uppercase ${mode === 'type' ? 'bg-navy text-white' : 'text-muted-foreground border border-border'}`}>
                  Type
                </button>
                <button onClick={clearSig}
                  className="text-xs font-medium px-3.5 py-1.5 uppercase text-danger border border-border ml-auto">
                  Clear
                </button>
              </div>
            </div>

            <button
              onClick={handleSign}
              disabled={!hasSig || signMutation.isPending}
              className={`w-full mt-4 py-3.5 text-[13px] font-medium tracking-[.08em] uppercase transition-colors ${
                hasSig ? 'bg-gold text-white hover:bg-gold/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {signMutation.isPending ? 'Submitting...' : 'Sign & accept proposal'}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6 leading-relaxed">
          This proposal does not constitute a binding offer. Subject to underwriting where applicable.<br />
          Wealth Works (Pty) Ltd — FSP 28337 · Wealthworks Investments (Pty) Ltd — FSP 45624
        </p>
      </div>
    </div>
  );
}

function SRow({ label, value }) {
  return (
    <div className="flex justify-between text-[11px] py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-navy">{value || '—'}</span>
    </div>
  );
}