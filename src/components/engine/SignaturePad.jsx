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
    <div className="border border-border bg-card border-t-2 border-t-navy h-full flex flex-col rounded-lg">
      <div className="p-3 flex flex-col flex-1">
        <div className="text-[9px] font-bold tracking-[.06em] uppercase text-navy mb-1.5">
          Advisor Signature
        </div>
        <div className="bg-amber-50 border border-amber-200 border-l-[3px] border-l-gold px-2 py-1 text-[9px] text-amber-900 leading-snug mb-2">
          Sign to confirm this recommendation is appropriate under FAIS.
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="space-y-0.5">
            <label className="text-[8px] font-semibold tracking-[.06em] uppercase text-navy">Signing advisor</label>
            <div className="text-[10px] text-foreground bg-muted px-2 py-1 border border-border">
              {advisor.name}
            </div>
          </div>
          <div className="space-y-0.5">
            <label className="text-[8px] font-semibold tracking-[.06em] uppercase text-navy">Date</label>
            <input
              type="date"
              value={signDate || todayISO()}
              onChange={e => onSignDateChange(e.target.value)}
              className="w-full border border-border bg-card px-2 py-1 text-[10px] text-foreground font-raleway outline-none focus:border-ocean transition-colors"
              style={{ colorScheme: 'light' }}
            />
            {(signDate || todayISO()) && (
              <p className="text-[8px] text-muted-foreground">
                {(() => { const d = new Date(signDate || todayISO()); return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`; })()}
              </p>
            )}
          </div>
        </div>

        <div className="border border-border overflow-hidden flex-1 flex flex-col">
          <div className="px-2 py-1 bg-muted border-b border-border flex items-center justify-between">
            <span className="text-[8px] font-medium tracking-[.14em] uppercase text-navy">
              {advisor.name} — WealthWorks
            </span>
            <span className="text-[8px] text-muted-foreground">Draw or type</span>
          </div>

          {mode === 'draw' ? (
            <canvas
              ref={canvasRef}
              width={800}
              height={48}
              className="block w-full h-[48px] cursor-crosshair touch-none bg-white"
            />
          ) : (
            <input
              type="text"
              value={typedName}
              onChange={e => handleTypedChange(e.target.value)}
              placeholder="Type your full name to sign"
              className="w-full font-lora italic text-base text-navy border-0 border-b border-border px-2 py-1.5 outline-none focus:border-ocean"
            />
          )}

          <div className="flex gap-1 px-2 py-1 border-t border-border bg-muted">
            <button
              onClick={() => setMode('draw')}
              className={`text-[8px] font-medium px-2 py-0.5 tracking-[.06em] uppercase ${mode === 'draw' ? 'bg-navy text-white' : 'bg-muted text-muted-foreground border border-border'}`}
            >
              ✎ Draw
            </button>
            <button
              onClick={() => setMode('type')}
              className={`text-[8px] font-medium px-2 py-0.5 tracking-[.06em] uppercase ${mode === 'type' ? 'bg-navy text-white' : 'bg-muted text-muted-foreground border border-border'}`}
            >
              Type
            </button>
            <button
              onClick={clear}
              className="text-[8px] font-medium px-2 py-0.5 tracking-[.06em] uppercase text-danger border border-border ml-auto"
            >
              Clear
            </button>
          </div>

          {hasSig && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border-t border-green-300 text-[8px] font-medium text-green-800 tracking-[.06em] uppercase">
              ✓ Signature captured — ready to send
            </div>
          )}
        </div>
      </div>
    </div>
  );
}