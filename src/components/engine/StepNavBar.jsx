import React from 'react';
import { Check, ArrowLeft } from 'lucide-react';

const STEPS = [
  { key: 'client_details',  num: '01', label: 'Client Details' },
  { key: 'recommendations', num: '02', label: 'Recommendations' },
  { key: 'suitability',     num: '03', label: 'Review' },
  { key: 'review',          num: '04', label: 'Sign & Send' },
];

const STEP_INDEX = { client_details: 1, recommendations: 2, suitability: 3, review: 4 };

export default function StepNavBar({ activeStep, completedSteps = [], onStepClick, onBackToInbox }) {
  const stepNum = STEP_INDEX[activeStep] || 1;
  const progressPct = stepNum * 25;

  return (
    <>
      {/* Progress bar row */}
      <div className="bg-navy px-6 pb-3 pt-1">
        <div className="w-full bg-white/20 rounded-full h-1.5">
          <div
            className="bg-forest h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-white/50 text-[9px] mt-1">Step {stepNum} of 4</p>
      </div>

      {/* Tab navbar */}
      <div className="bg-card border-b border-border px-4 md:px-6">
        <div className="flex items-center">
          {onBackToInbox && (
            <button
              onClick={onBackToInbox}
              className="flex items-center gap-1.5 px-3 py-3 text-[11px] font-semibold tracking-[.08em] uppercase text-muted-foreground hover:text-navy border-b-2 border-transparent whitespace-nowrap shrink-0 mr-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Inbox
            </button>
          )}
          <div className="w-px h-5 bg-border shrink-0 mr-2" />
          {STEPS.map((step) => {
            const isActive = activeStep === step.key;
            const isDone   = completedSteps.includes(step.key);
            return (
              <button
                key={step.key}
                onClick={() => onStepClick(step.key)}
                className={`px-5 py-3 text-[11px] font-semibold tracking-[.08em] uppercase border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'border-navy text-navy'
                    : isDone
                    ? 'border-teal/50 text-teal hover:text-teal'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {isDone && !isActive ? (
                  <Check className="w-3 h-3 text-teal" />
                ) : (
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                    isActive ? 'bg-navy text-white' : 'bg-border text-muted-foreground'
                  }`}>
                    {step.num}
                  </span>
                )}
                {step.num} · {step.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}