'use client';

import React, { useState } from 'react';
import { History, ArrowUpRight, ArrowDownRight, Eye } from 'lucide-react';
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';

interface HistorySignalTableProps {
  onSelectRecord?: (record: StoredAnalysisRecord) => void;
  isLoading?: boolean;
}

export const HistorySignalTable: React.FC<HistorySignalTableProps> = ({
  onSelectRecord = () => {},
  isLoading,
}) => {
  const [historyRecords] = useState<StoredAnalysisRecord[]>(() => {
    return AppStorageEngine.getAnalyses();
  });

  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-6 text-[#e2e3e9] animate-pulse min-h-[220px]">
        <div className="h-5 w-44 bg-[#121317] rounded-none mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-[#121317] rounded-none" />
          <div className="h-10 bg-[#121317] rounded-none" />
          <div className="h-10 bg-[#121317] rounded-none" />
        </div>
      </div>
    );
  }

  const total = historyRecords.length;
  const wins = historyRecords.filter(r => r.accuracy_evaluation?.status === 'WIN').length;
  const losses = historyRecords.filter(r => r.accuracy_evaluation?.status === 'LOSS').length;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const netPnL = historyRecords.reduce((sum, r) => sum + (r.accuracy_evaluation?.pnl_percentage || 0), 0);

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-6 text-[#e2e3e9] space-y-4">
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper uppercase">
            HISTORICAL SIGNAL AUDIT LOG
          </span>
        </div>
        <span className="text-xs text-[#9194a1] font-sans">
          {total} Stored Signals
        </span>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-3 gap-4 border border-[#1c1d22] p-3 text-center font-mono">
          <div className="border-r border-[#1c1d22] py-1">
            <div className="text-[#5e616e] text-[9px] uppercase">Win Rate</div>
            <div className="text-[15px] font-bold text-emerald-400">{winRate.toFixed(1)}%</div>
          </div>
          <div className="border-r border-[#1c1d22] py-1">
            <div className="text-[#5e616e] text-[9px] uppercase">Audited Trades</div>
            <div className="text-[15px] font-bold text-[#e2e3e9]">{wins + losses} / {total}</div>
          </div>
          <div className="py-1">
            <div className="text-[#5e616e] text-[9px] uppercase">Net returns</div>
            <div className={`text-[15px] font-bold ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netPnL >= 0 ? '+' : ''}{netPnL.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className="py-8 text-center text-xs text-[#5e616e] font-sans italic">
          No historical analysis records found. Run an AI Signal Analysis to populate audit logs!
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[380px] no-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-[#1c1d22] eyebrow-fog text-[10px] uppercase">
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">ASSET</th>
                <th className="py-2.5 px-3">DIRECTION</th>
                <th className="py-2.5 px-3">CONFIDENCE</th>
                <th className="py-2.5 px-3">ENTRY PRICE</th>
                <th className="py-2.5 px-3">RESULT</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1d22]">
              {historyRecords.map((record) => {
                const signal = record.signal || 'NEUTRAL';
                const isBuy = signal === 'BUY';
                const isSell = signal === 'SELL';

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-[#121317] transition-colors group cursor-pointer"
                    onClick={() => onSelectRecord(record)}
                  >
                    <td className="py-3 px-3 text-[#9194a1] font-mono text-[11px]">
                      {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#e2e3e9]">
                      {record.symbol} <span className="text-[#5e616e] font-normal">({record.timeframe})</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[11px] font-bold ${
                          isBuy
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500'
                            : isSell
                            ? 'bg-rose-950/80 text-rose-400 border border-rose-500'
                            : 'bg-[#121317] text-[#9194a1] border border-[#1c1d22]'
                        }`}
                      >
                        {isBuy ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                        {signal}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-[#cc9166]">
                      {record.confidence}%
                    </td>
                    <td className="py-3 px-3 font-mono text-[#e2e3e9]">
                      ${record.price}
                    </td>
                    <td className="py-3 px-3">
                      {(() => {
                        const evalData = record.accuracy_evaluation;
                        if (!evalData) return <span className="text-[#5e616e] italic">Not Evaluated</span>;
                        const status = evalData.status;
                        const pnl = evalData.pnl_percentage ?? 0;
                        if (status === 'PENDING') {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-500 animate-pulse font-mono">
                              PENDING
                            </span>
                          );
                        }
                        if (status === 'WIN') {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500 font-mono">
                              WIN (+{pnl}%)
                            </span>
                          );
                        }
                        if (status === 'LOSS') {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500 font-mono">
                              LOSS ({pnl}%)
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[10px] font-bold bg-zinc-950 text-zinc-500 border border-zinc-800 font-mono">
                            INVALIDATED
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(record);
                        }}
                        className="p-1.5 rounded-none text-[#9194a1] hover:text-[#ffffff] hover:bg-[#1c1d22] transition-colors inline-flex items-center gap-1 text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Replay</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

