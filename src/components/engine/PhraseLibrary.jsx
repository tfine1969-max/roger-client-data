import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';

// Personalised Client Message categories only — for use in the Personalised Message to Client section.
// Do NOT add technical investment, income, or risk reasons here.
const CATEGORIES = [
  {
    name: 'Client-Friendly',
    phrases: [
      'This recommendation has been structured to align with your specific financial goals and long-term objectives.',
      'The selected solution is designed to support your financial needs while managing risk appropriately.',
      'The strategy reflects your investment preferences and overall financial position.',
      'This approach ensures your portfolio remains aligned with your evolving financial objectives.',
      'The recommendation has been tailored to suit your individual circumstances.',
      'This solution provides a balance between growth, flexibility, and long-term sustainability.',
      'The structure allows for ongoing management as your needs change over time.',
      'This recommendation supports a disciplined and consistent financial planning approach.',
    ],
  },
  {
    name: 'Personalised Narrative',
    phrases: [
      'Based on our discussions, this recommendation reflects your preference for long-term growth and financial stability.',
      'Taking into account your current financial position, this solution is designed to provide a structured path towards achieving your goals.',
      'This recommendation has been carefully considered to ensure it remains aligned with your risk tolerance and future plans.',
      'Your investment strategy has been structured to provide flexibility while maintaining a clear long-term direction.',
      'This approach ensures that your portfolio remains aligned with both your short-term and long-term priorities.',
      'The recommendation reflects the need to balance growth opportunities with appropriate risk management.',
      'This solution has been selected to support your financial objectives while remaining adaptable over time.',
    ],
  },
];

// The trigger button shown inline next to the textarea label
export function LibraryButton({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold text-ocean border border-ocean/40 rounded-sm hover:bg-ocean/10 transition-colors"
    >
      <BookOpen className="w-2.5 h-2.5" />
      Library
    </button>
  );
}

// The drawer/modal
export default function PhraseLibrary({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[380px] bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-navy border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-white/70" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Client Message Library</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[9px] text-muted-foreground px-4 py-2 border-b border-border shrink-0">
          Click any phrase to append it to the text field.
        </p>

        <div className="flex flex-1 overflow-hidden">
          {/* Category tabs */}
          <div className="w-[110px] border-r border-border overflow-y-auto shrink-0 bg-muted/40">
            {CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(i)}
                className={`w-full text-left px-2.5 py-2.5 text-[9px] font-medium leading-snug transition-colors border-b border-border ${
                  activeCategory === i
                    ? 'bg-navy text-white'
                    : 'text-navy hover:bg-muted'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Phrases */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {CATEGORIES[activeCategory].phrases.map((phrase, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(phrase)}
                className="w-full text-left px-2.5 py-2 text-[10px] text-navy bg-background border border-border rounded-sm hover:border-ocean hover:bg-ocean/5 transition-colors leading-snug"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}