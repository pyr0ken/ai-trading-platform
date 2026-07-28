'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { History, X, ExternalLink } from 'lucide-react';
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';

interface AnalysisReplayModalProps {
  onReplayAnalysis: (record: StoredAnalysisRecord) => void;
}

export const AnalysisReplayModal: React.FC<AnalysisReplayModalProps> = ({ onReplayAnalysis }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<StoredAnalysisRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHistory(AppStorageEngine.getAnalyses());
    }
  }, [isOpen]);

  const modalContent = isOpen && mounted ? (
    <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center p-4 min-h-screen">
      <div className="bg-[#18181b] border border-[#27272a] rounded-[24px] w-full max-w-3xl p-6 text-[#f5f5f4] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#fbe1d1]" />
            <h3 className="font-serif text-lg font-semibold text-[#f5f5f4]">
              Analysis History & Prediction Evaluation Replay
            </h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full text-[#71717a] hover:text-[#f5f5f4] hover:bg-[#27272a] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History Table */}
        <div className="max-h-96 overflow-y-auto space-y-2 font-mono text-xs pr-1">
          {history.length === 0 ? (
            <div className="text-center text-[#71717a] py-8">
              No historical analyses saved yet. Run your first analysis to store snapshots.
            </div>
          ) : (
            history.map((rec) => {
              const isBuy = rec.signal === 'BUY';
              const isSell = rec.signal === 'SELL';

              return (
                <div
                  key={rec.id}
                  onClick={() => {
                    onReplayAnalysis(rec);
                    setIsOpen(false);
                  }}
                  className="bg-[#121214] border border-[#27272a] hover:border-[#fbe1d1]/40 rounded-[18px] p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#f5f5f4]">{rec.symbol}</span>
                      <span className="text-[10px] text-[#71717a] uppercase">{rec.exchange} ({rec.timeframe})</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isBuy
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : isSell
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {rec.signal} ({rec.confidence}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-[#a1a1aa]">
                      Price at analysis: <strong className="text-[#f5f5f4]">${rec.price}</strong> • Date: {new Date(rec.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-[11px]">
                      <span className="text-[#71717a] block">Risk Profile</span>
                      <span className="text-[#fbe1d1] font-semibold">{rec.risk_level}</span>
                    </div>
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-xs text-[#f5f5f4] transition-all cursor-pointer">
                      <span>Replay</span>
                      <ExternalLink className="w-3 h-3 text-[#fbe1d1]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121214] hover:bg-[#27272a] border border-[#27272a] text-xs text-[#f5f5f4] transition-all cursor-pointer font-mono"
      >
        <History className="w-3.5 h-3.5 text-[#fbe1d1]" />
        <span>Analysis Replay & History</span>
      </button>

      {/* Render Portal directly under document.body */}
      {mounted && isOpen && createPortal(modalContent, document.body)}
    </div>
  );
};
