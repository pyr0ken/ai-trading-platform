'use client';

import React from 'react';

interface BorderedContainerFrameProps {
  children: React.ReactNode;
  className?: string;
}

export const BorderedContainerFrame: React.FC<BorderedContainerFrameProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`relative border border-[#e2e3e9]/30 bg-transparent rounded-[9999px] p-6 ${className}`}>
      {/* 4 Corner Electric Cobalt (#cc9166) dots */}
      <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-[#cc9166] shadow-[0_0_8px_#cc9166]" />
      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#cc9166] shadow-[0_0_8px_#cc9166]" />
      <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-[#cc9166] shadow-[0_0_8px_#cc9166]" />
      <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-[#cc9166] shadow-[0_0_8px_#cc9166]" />
      {children}
    </div>
  );
};
