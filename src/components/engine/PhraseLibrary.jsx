import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';

const CATEGORIES = [
  {
    name: 'Product-Level Reasons',
    phrases: [
      'Provides an appropriate balance between growth and capital preservation',
      'Suitable for the client\'s stated investment objective',
      'Aligns with the client\'s investment horizon',
      'Offers flexibility in terms of contributions and withdrawals',
      'Provides an efficient structure for long-term wealth accumulation',
      'Enables access to professionally managed investment solutions',
      'Provides an appropriate level of diversification within the product structure',
      'Suitable for the client\'s liquidity requirements',
      'Allows for ongoing portfolio management and rebalancing',
      'Offers transparency in terms of underlying holdings and costs',
      'Provides a scalable solution that can adapt to future financial needs',
      'Structured to support long-term capital growth objectives',
      'Provides access to a broad range of underlying investment options',
      'Allows for appropriate risk management within the portfolio',
      'Supports the client\'s overall financial planning strategy',
    ],
  },
  {
    name: 'Fund / Portfolio Reasons',
    phrases: [
      'Provides diversified exposure across asset classes',
      'Managed in line with the stated investment mandate',
      'Demonstrates consistency in investment approach',
      'Managed by an experienced and reputable investment team',
      'Suitable for the selected risk profile',
      'Provides exposure to both local and/or global markets as required',
      'Designed to optimise risk-adjusted returns',
      'Aligns with the client\'s long-term investment objectives',
      'Offers an appropriate balance between growth and income',
      'Provides exposure to a range of underlying securities and sectors',
      'Reduces concentration risk within the portfolio',
      'Supports capital appreciation over the selected time horizon',
      'Incorporates active or passive strategies as appropriate',
      'Designed to perform across varying market conditions',
      'Offers appropriate diversification across geographies and asset classes',
    ],
  },
  {
    name: 'Risk Alignment Reasons',
    phrases: [
      'Aligned with the client\'s conservative risk profile',
      'Aligned with the client\'s moderate risk profile',
      'Aligned with the client\'s aggressive growth objectives',
      'Provides an appropriate level of volatility given the client\'s tolerance',
      'Balances growth potential with downside risk',
      'Suitable given the client\'s capacity for loss',
      'Reflects the client\'s willingness to accept market fluctuations',
      'Structured to manage risk over the long term',
      'Provides appropriate exposure to growth assets relative to risk tolerance',
      'Designed to minimise excessive short-term volatility',
      'Supports a disciplined approach to long-term investing',
    ],
  },
  {
    name: 'Strategy / Objective Reasons',
    phrases: [
      'Supports long-term wealth creation',
      'Facilitates offshore diversification',
      'Provides exposure to global growth opportunities',
      'Supports capital preservation objectives',
      'Designed to generate income where required',
      'Protects against inflation over the long term',
      'Aligns with retirement planning objectives',
      'Supports education funding goals',
      'Diversifies overall portfolio risk',
      'Reduces reliance on a single asset class or market',
      'Enhances long-term portfolio resilience',
      'Provides access to international markets and currency diversification',
      'Enables a structured and disciplined investment approach',
      'Supports phased investment or contribution strategies',
    ],
  },
  {
    name: 'Provider / Platform Reasons',
    phrases: [
      'Reputable and established product provider',
      'Strong track record in managing client assets',
      'Offers a robust and reliable investment platform',
      'Provides access to a wide range of investment solutions',
      'Transparent fee structure',
      'Strong governance and regulatory oversight',
      'Efficient administration and reporting capabilities',
      'Provides consolidated portfolio reporting',
      'Offers flexibility in portfolio construction',
      'Well-supported by industry infrastructure and services',
    ],
  },
  {
    name: 'Cost / Fee Justification',
    phrases: [
      'Fees are competitive relative to the services provided',
      'Fees are reasonable given the level of management and oversight',
      'Costs are transparent and fully disclosed to the client',
      'The fee structure aligns with the value of advice provided',
      'Fees are appropriate for the selected product and platform',
      'Ongoing advice fee reflects continuous portfolio monitoring and support',
      'Costs are justified by the expected long-term benefits',
      'No excessive or hidden costs identified',
      'Total cost structure is in line with industry norms',
    ],
  },
  {
    name: 'Offshore-Specific Reasons',
    phrases: [
      'Provides diversification outside the South African market',
      'Reduces concentration risk to local economic conditions',
      'Offers exposure to global growth sectors and economies',
      'Provides currency diversification benefits',
      'Enhances long-term return potential',
      'Mitigates local market volatility',
      'Supports international investment strategy',
    ],
  },
  {
    name: 'Liquidity / Structure Reasons',
    phrases: [
      'Suitable given the client\'s liquidity requirements',
      'Provides access to funds when required',
      'Aligns with expected cash flow needs',
      'Balances liquidity with long-term growth',
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
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Phrase Library</span>
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