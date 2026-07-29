'use client';

import React from 'react';

import { StoredAnalysisRecord } from '@/lib/storage/app-db';

interface TerminalHeaderProps {
  symbol: string;
  exchange: string;
  timeframe: string;
  onRefresh: () => void;
  isFetching?: boolean;
  onSelectCoin?: (symbol: string) => void;
  onReplayAnalysis?: (record: StoredAnalysisRecord) => void;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = () => {
  // Ultra-clean header: branding & icon removed as requested
  return null;
};
