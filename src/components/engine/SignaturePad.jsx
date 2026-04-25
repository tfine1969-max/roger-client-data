import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ADVISORS } from '@/lib/constants';

const todayISO = () => new Date().toISOString().split('T')[0];

export default function SignaturePad({ advisorKey, signDate, onSignDateChange, onSignatureChange, initialData, initialType }) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState(initialType || 'draw');
  const [typedName, setTypedName] = useState(initialType === 'type' ? (initialData || '') : '');
  const [hasDrawn, setHasDrawn] = useState(false);
  const drawingRef = useRef(false);
  const advisor = ADVISORS[advisorKey] || ADVISORS.trevor;

  // Auto-populate date with today if not set
  useEffect(() => {
    if (!signDate) onSignDateChange(todayISO());
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0E4166';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // If we have existing drawn signature data, restore it
    if (initialType === 'draw' && initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasDrawn(true);
      };
      img.src = initialData;
    }
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
    if (drawingRef.current) {
      drawingRef.current = false;
      const ctx = canvasRef.current.getContext('2d');
      ctx.beginPath();
      // Save signature data
      const dataUrl = canvasRef.current.toDataURL();
      onSignatureChange(dataUrl, 'draw');
    }
  }, [onSignatureChange]);

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

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
    setTypedName('');
    onSignatureChange('', 'draw');
  };

  const handleTypedChange = (val) => {
    setTypedName(val);
    onSignatureChange(val, 'type');
  };

  const hasSig = mode === 'draw' ? hasDrawn : typedName.trim().length > 0;

  return (
    <div className="border border-border bg-card border-t-2 border-t-navy h-full">
      <div className="p-4">
        <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy mb-2.5">
          WealthWorks signature — required before sending
        </div>
        <div className="bg-amber-50 border border-amber-200 border-l-[3px] border-l-gold p-3 text-[13px] text-amber-900 leading-relaxed mb-3">
          <strong>Sign below before sending to client.</strong> This confirms the recommendation is appropriate and suitable under FAIS.
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Signing advisor</label>
            <div className="text-sm text-foreground bg-muted px-3 py-2.5 border border-border">
              {advisor.name}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Date</label>
            <input
              type="date"
              value={signDate || todayISO()}
              onChange={e => onSignDateChange(e.target.value)}
              className="w-full border border-border bg-card px-3 py-2.5 text-sm text-foreground font-raleway outline-none focus:border-ocean transition-colors"
            />
          </div>
        </div>

        <div className="border border-border overflow-hidden">
          <div className="px-3.5 py-2.5 bg-muted border-b border-border flex items-center justify-between">
            <span className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">
              {advisor.name} — WealthWorks
            </span>
            <span className="text-[11px] text-muted-foreground">Draw or type your signature</span>
          </div>

          {mode === 'draw' ? (
            <canvas
              ref={canvasRef}
              width={800}
              height={90}
              className="block w-full h-[90px] cursor-crosshair touch-none bg-white"
            />
          ) : (
            <input
              type="text"
              value={typedName}
              onChange={e => handleTypedChange(e.target.value)}
              placeholder="Type your full name to sign"
              className="w-full font-lora italic text-xl text-navy border-0 border-b border-border px-3.5 py-3 outline-none focus:border-ocean"
            />
          )}

          <div className="flex gap-2 px-3 py-2 border-t border-border bg-muted">
            <button
              onClick={() => setMode('draw')}
              className={`text-xs font-medium px-3.5 py-1.5 tracking-[.06em] uppercase ${mode === 'draw' ? 'bg-navy text-white' : 'bg-muted text-muted-foreground border border-border'}`}
            >
              ✎ Draw
            </button>
            <button
              onClick={() => setMode('type')}
              className={`text-xs font-medium px-3.5 py-1.5 tracking-[.06em] uppercase ${mode === 'type' ? 'bg-navy text-white' : 'bg-muted text-muted-foreground border border-border'}`}
            >
              Type
            </button>
            <button
              onClick={clear}
              className="text-xs font-medium px-3.5 py-1.5 tracking-[.06em] uppercase text-danger border border-border ml-auto"
            >
              Clear
            </button>
          </div>

          {hasSig && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-green-50 border-t border-green-300 text-xs font-medium text-green-800 tracking-[.06em] uppercase">
              ✓ &nbsp; Signature captured — proposal ready to send
            </div>
          )}
        </div>
      </div>
    </div>
  );
}