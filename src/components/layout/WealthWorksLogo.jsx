import React from 'react';

export default function WealthWorksLogo({ size = 'md', light = false }) {
  const sizes = {
    sm: { leaf1: 'w-3 h-1.5', leaf2: 'w-2.5 h-1.5 ml-1', leaf3: 'w-2 h-1 ml-1.5', text: 'text-xs' },
    md: { leaf1: 'w-3.5 h-2', leaf2: 'w-2.5 h-[7px] ml-1', leaf3: 'w-2 h-1.5 ml-1.5', text: 'text-sm' },
    lg: { leaf1: 'w-5 h-3', leaf2: 'w-3.5 h-2.5 ml-1', leaf3: 'w-3 h-2 ml-2', text: 'text-base' }
  };
  const s = sizes[size];
  const textColor = light ? 'text-white/75' : 'text-navy';

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-0.5">
        <div className={`${s.leaf1} bg-ocean rounded-[50%_0_50%_0] -rotate-[15deg]`} />
        <div className={`${s.leaf2} bg-teal rounded-[50%_0_50%_0] -rotate-[15deg]`} />
        <div className={`${s.leaf3} bg-sky rounded-[50%_0_50%_0] -rotate-[15deg]`} />
      </div>
      <span className={`${s.text} font-medium tracking-wide ${textColor}`}>
        wealthworks
      </span>
    </div>
  );
}