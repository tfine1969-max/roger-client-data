import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { key: 'client_details', num: '01', label: 'Client Details' },
  { key: 'recommendations', num: '02', label: 'Recommendations' },
  { key: 'suitability', num: '03', label: 'Review' },
  { key: 'review', num: '04', label: 'Review & Send' },
];

export default function StepNavBar({ activeStep, completedSteps = [], onStepClick }) {
  return (
    <div className="bg-card border-b border-border px-4 md:px-6">
      <div className="flex">
        {STEPS.map((step) => {
          const isActive = activeStep === step.key;
          const isDone = completedSteps.includes(step.key);
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
  );
}