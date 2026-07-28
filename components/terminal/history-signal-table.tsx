'use client';

import React, { useEffect, useState } from 'react';
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
  const [historyRecords, setHistoryRecords] = useState<StoredAnalysisRecord[]>([]);

  useEffect(() => {
    setHistoryRecords(AppStorageEngine.getAnalyses());
  }, []);

  if (isLoading) {
    return (
      <div className="bg-[#090909] border border-[#474747]/40 rounded-[19.2px] p-6 text-[#f7f9fa] animate-pulse min-h-[220px]">
        <div className="h-5 w-44 bg-white/5 rounded-full mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-white/5 rounded-[9999px]" />
          <div className="h-10 bg-white/5 rounded-[9999px]" />
          <div className="h-10 bg-white/5 rounded-[9999px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#090909] border border-[#474747]/40 rounded-[19.2px] p-6 text-[#f7f9fa] space-y-4">
      <div className="flex items-center justify-between border-b border-[#474747]/40 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#af50ff]" />
          <span className="font-stamp text-xs text-[#f0f0f0] tracking-[0.2em] uppercase">
            HISTORICAL SIGNAL AUDIT LOG
          </span>
        </div>
        <span className="text-xs text-[#828384] font-sans">
          {historyRecords.length} Stored Signals
        </span>
      </div>

      {historyRecords.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#828384] font-sans italic">
          No historical analysis records found. Run an AI Signal Analysis to populate audit logs!
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[380px] no-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-[#474747]/40 font-stamp text-[10px] text-[#828384] uppercase tracking-[0.1em]">
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">ASSET</th>
                <th className="py-2.5 px-3">DIRECTION</th>
                <th className="py-2.5 px-3">CONFIDENCE</th>
                <th className="py-2.5 px-3">ENTRY PRICE</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#474747]/40">
              {historyRecords.map((record) => {
                const signal = record.signal || 'NEUTRAL';
                const isBuy = signal === 'BUY';
                const isSell = signal === 'SELL';

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-[#423738]/30 transition-colors group cursor-pointer"
                    onClick={() => onSelectRecord(record)}
                  >
                    <td className="py-3 px-3 text-[#828384] font-mono text-[11px]">
                      {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#f7f9fa]">
                      {record.symbol} <span className="text-[#828384] font-normal">({record.timeframe})</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[6px] text-[11px] font-medium ${
                          isBuy
                            ? 'bg-[#af50ff] text-[#090909] font-semibold'
                            : isSell
                            ? 'bg-[#423738] text-rose-300 border border-rose-900/50'
                            : 'bg-[#090909] text-[#828384] border border-[#474747]'
                        }`}
                      >
                        {isBuy ? <ArrowUpRight className="w-3 h-3 text-[#090909]" /> : <ArrowDownRight className="w-3 h-3 text-rose-300" />}
                        {signal}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-[#af50ff]">
                      {record.confidence}%
                    </td>
                    <td className="py-3 px-3 font-mono text-[#f7f9fa]">
                      ${record.price}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(record);
                        }}
                        className="p-1.5 rounded-[6px] text-[#828384] hover:text-[#f7f9fa] hover:bg-white/10 transition-colors inline-flex items-center gap-1 text-[11px]"
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

