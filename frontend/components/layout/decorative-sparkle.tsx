'use client';

import React from 'react';

interface DecorativeSparkleProps {
  className?: string;
  size?: number;
}

export const DecorativeSparkle: React.FC<DecorativeSparkleProps> = ({
  className = '',
  size = 40,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 inline-block text-[#cc9166] transition-transform duration-700 hover:rotate-45 ${className}`}
      style={{ transform: 'rotate(-4deg)' }}
    >
      {/* 6-point asterisk with 1.5px stroke in #cc9166 */}
      <line x1="20" y1="4" x2="20" y2="36" stroke="#cc9166" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6.14" y1="12" x2="33.86" y2="28" stroke="#cc9166" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6.14" y1="28" x2="33.86" y2="12" stroke="#cc9166" strokeWidth="1.5" strokeLinecap="round" />
      {/* Center micro core dot */}
      <circle cx="20" cy="20" r="1.5" fill="#cc9166" />
    </svg>
  );
};
