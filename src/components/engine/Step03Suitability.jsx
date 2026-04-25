import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import SignaturePad from '@/components/engine/SignaturePad';

export default function Step03Suitability({ data, onFieldChange, onSignatureChange, advisorKey, onNext }) {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Overall Suitability Rationale */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-[10px] font-semibold tracking-wider uppercase text-navy mb-2">Overall Suitability Rationale</h2>
        {data.investment_rationale !== undefined && (
          <div className="mb-3">
            <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">Investment Suitability</p>
            <Textarea
              value={data.investment_rationale || ''}
              onChange={e => onFieldChange('investment_rationale', e.target.value)}
              placeholder="Why are the recommended investments suitable for this client's profile, objectives and risk tolerance..."
              className="rounded-sm min-h-[80px] text-xs leading-relaxed"
            />
          </div>
        )}
        <div>
          <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">Risk Cover Suitability</p>
          <Textarea
            value={data.risk_cover_rationale || ''}
            onChange={e => onFieldChange('risk_cover_rationale', e.target.value)}
            placeholder="Why is the recommended risk cover suitable for this client's needs and circumstances..."
            className="rounded-sm min-h-[80px] text-xs leading-relaxed"
          />
        </div>
      </div>

      {/* Personalised Message */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-[10px] font-semibold tracking-wider uppercase text-navy mb-2">Personalised Message to Client</h2>
        <Textarea
          value={data.personal_message || ''}
          onChange={e => onFieldChange('personal_message', e.target.value)}
          placeholder="e.g. Dear A.B., Based on your answers I have prepared the following recommendation..."
          className="rounded-sm min-h-[100px] text-[13px] leading-relaxed"
        />
      </div>

      {/* Advisor Signature */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-[10px] font-semibold tracking-wider uppercase text-navy mb-3">Advisor Signature</h2>
        <SignaturePad
          advisorKey={advisorKey}
          signDate={data.sign_date}
          onSignDateChange={v => onFieldChange('sign_date', v)}
          onSignatureChange={onSignatureChange}
          initialData={data.advisor_signature_data}
          initialType={data.advisor_signature_type}
        />
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        className="w-full bg-navy text-white py-3.5 text-[11px] font-semibold tracking-[.1em] uppercase hover:bg-ocean transition-colors flex items-center justify-center gap-2"
      >
        Next: Review & Send →
      </button>
    </div>
  );
}