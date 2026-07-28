'use client';

import React from 'react';

interface TerminalHeaderProps {
  symbol: string;
  exchange: string;
  timeframe: string;
  onRefresh: () => void;
  isFetching?: boolean;
  onSelectCoin?: (symbol: string) => void;
  onReplayAnalysis?: (record: any) => void;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = () => {
  // Ultra-clean header: branding & icon removed as requested
  return null;
};
