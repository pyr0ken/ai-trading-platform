'use client';

import React, { useState, useCallback } from 'react';
import { History, ArrowUpRight, ArrowDownRight, Eye, Trash2, RotateCw, RefreshCw, Sparkles } from 'lucide-react';
import { formatPrice } from '@/lib/utils/price-format';
import { getUserColor } from '@/lib/utils/user-colors';
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';
import { resolvePendingSignals } from '@/hooks/use-auto-resolver';
import { showToast } from '@/components/terminal/toast';

interface HistorySignalTableProps {
  onSelectRecord?: (record: StoredAnalysisRecord) => void;
  isLoading?: boolean;
}

export const HistorySignalTable: React.FC<HistorySignalTableProps> = ({
  onSelectRecord = () => {},
  isLoading,
}) => {
  const [records, setRecords] = useState<StoredAnalysisRecord[]>(() => {
    return AppStorageEngine.getAnalyses();
  });
  const [isAuditing, setIsAuditing] = useState(false);

  const refreshRecords = useCallback(() => {
    setRecords(AppStorageEngine.getAnalyses());
  }, []);

  React.useEffect(() => {
    AppStorageEngine.fetchAnalysesFromDb().then((fetched) => {
      setRecords(fetched);
    });
    const handleStorageChange = () => {
      setRecords(AppStorageEngine.getAnalyses());
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('app-storage-updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('app-storage-updated', handleStorageChange);
    };
  }, []);

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    AppStorageEngine.deleteAnalysis(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    AppStorageEngine.clearAnalyses();
    setRecords([]);
  }, []);

  const handleAuditSignals = async () => {
    setIsAuditing(true);
    showToast('🔍 Auditing historical signals against exchange candles...');
    try {
      const count = await resolvePendingSignals();
      refreshRecords();
      if (count > 0) {
        showToast(`✅ Successfully evaluated ${count} pending signal(s)!`);
      } else {
        showToast('ℹ️ All pending signals are up to date.');
      }
    } catch (e) {
      console.error('Audit failed:', e);
      showToast('⚠️ Signal audit encountered an issue.');
    } finally {
      setIsAuditing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] flex flex-col items-center justify-center min-h-[180px] space-y-2">
        <RotateCw className="w-5 h-5 text-[#cc9166] animate-spin" />
        <span className="text-xs font-mono text-[#9194a1]">Loading Historical Analysis Signals...</span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9]">
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#cc9166]" />
            <span className="eyebrow-copper uppercase">HISTORICAL SIGNAL AUDIT LOG</span>
          </div>
          <span className="text-xs text-[#9194a1] font-sans">0 Stored Signals</span>
        </div>
        <div className="py-8 text-center text-xs text-[#5e616e] font-sans italic">
          No historical analysis records found. Run an AI Signal Analysis to populate audit logs!
        </div>
      </div>
    );
  }

  const total = records.length;
  const pendingCount = records.filter(
    (r) => !r.accuracy_evaluation || r.accuracy_evaluation.status === 'PENDING'
  ).length;
  const wins = records.filter((r) => r.accuracy_evaluation?.status === 'WIN').length;
  const losses = records.filter((r) => r.accuracy_evaluation?.status === 'LOSS').length;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const netPnL = records.reduce((sum, r) => sum + (r.accuracy_evaluation?.pnl_percentage || 0), 0);

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper uppercase">
            HISTORICAL SIGNAL AUDIT LOG
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual Re-Audit Button */}
          <button
            onClick={handleAuditSignals}
            disabled={isAuditing}
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-medium text-[#cc9166] hover:text-white bg-[#121317] hover:bg-[#1c1d22] border border-[#cc9166]/40 hover:border-[#cc9166] rounded-[6px] transition-all cursor-pointer disabled:opacity-50"
            title="Evaluate pending signals against historical exchange candles"
          >
            <RefreshCw className={`w-3 h-3 ${isAuditing ? 'animate-spin text-amber-400' : 'text-[#cc9166]'}`} />
            <span>{isAuditing ? 'Auditing...' : `Audit Signals (${pendingCount} Pending)`}</span>
          </button>

          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase font-bold tracking-wider text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/50 rounded-[6px] transition-colors cursor-pointer"
            title="Clear All History"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-4 gap-3 border border-[#1c1d22] bg-[#08080a] p-3 text-center font-mono rounded-[8px]">
          <div className="border-r border-[#1c1d22] py-1">
            <div className="text-[#5e616e] text-[9px] uppercase">Win Rate</div>
            <div className="text-[15px] font-bold text-emerald-400">{winRate.toFixed(1)}%</div>
          </div>
          <div className="border-r border-[#1c1d22] py-1">
            <div className="text-[#5e616e] text-[9px] uppercase">Audited Trades</div>
            <div className="text-[15px] font-bold text-[#e2e3e9]">
              {wins + losses} / {total}
            </div>
          </div>
          <div className="border-r border-[#1c1d22] py-1">
            <div className="text-[#5e616e] text-[9px] uppercase">Pending Evaluation</div>
            <div className="text-[15px] font-bold text-amber-400">{pendingCount}</div>
          </div>
          <div className="py-1">
            <div className="text-[#5e616e] text-[9px] uppercase">Net returns</div>
            <div className={`text-[15px] font-bold ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netPnL >= 0 ? '+' : ''}{netPnL.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto max-h-[380px] custom-scrollbar">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead>
            <tr className="border-b border-[#1c1d22] eyebrow-fog text-[10px] uppercase font-mono">
              <th className="py-2.5 px-3">TIMESTAMP</th>
              <th className="py-2.5 px-3">TRADER</th>
              <th className="py-2.5 px-3">ASSET</th>
              <th className="py-2.5 px-3">DIRECTION</th>
              <th className="py-2.5 px-3">CONFIDENCE</th>
              <th className="py-2.5 px-3">ENTRY PRICE</th>
              <th className="py-2.5 px-3">RESULT</th>
              <th className="py-2.5 px-3 text-right w-[100px]">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1d22] font-mono">
            {records.map((record) => {
              const isLong = record.signal.toUpperCase().includes('LONG') || record.signal.toUpperCase().includes('BUY');
              const evalStatus = record.accuracy_evaluation?.status || 'PENDING';
              const pnl = record.accuracy_evaluation?.pnl_percentage;
              const userStyle = getUserColor(record.username);

              return (
                <tr
                  key={record.id}
                  onClick={() => onSelectRecord(record)}
                  className="hover:bg-[#121317] transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 text-[#9194a1] text-[11px]">
                    {new Date(record.created_at).toLocaleString('en-GB', {
                      timeZone: 'UTC',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} UTC
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[11px] font-mono font-bold shadow-sm ${userStyle.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${userStyle.dot}`} />
                      @{record.username || 'anonymous'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-[#e2e3e9]">
                    {record.symbol}
                    <span className="text-[10px] text-[#5e616e] ml-1.5 uppercase">
                      {record.timeframe}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        isLong ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {record.signal}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#e2e3e9]">{record.confidence}%</td>
                  <td className="py-3 px-3 font-bold">{formatPrice(record.price)}</td>
                  <td className="py-3 px-3">
                    {evalStatus === 'WIN' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 font-mono">
                        🎯 WIN ({pnl !== undefined && pnl > 0 ? `+${pnl}%` : `${pnl}%`})
                      </span>
                    )}
                    {evalStatus === 'LOSS' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-500/40 font-mono">
                        🔻 LOSS ({pnl}% )
                      </span>
                    )}
                    {evalStatus === 'INVALIDATED' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-[#121317] text-[#9194a1] border border-[#1c1d22] font-mono">
                        ⚪ INVALIDATED
                      </span>
                    )}
                    {evalStatus === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-500/40 font-mono">
                        ⏳ PENDING
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(record);
                        }}
                        className="p-1.5 text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#1c1d22] rounded transition-colors"
                        title="Replay Analysis"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(record.id, e)}
                        className="p-1.5 text-[#5e616e] hover:text-rose-400 hover:bg-[#1c1d22] rounded transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
