'use client';

import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, TrendingUp, TrendingDown, PauseCircle, Calculator, Zap, AlertTriangle } from 'lucide-react';
import { StructuredLLMOutput } from '@/types/terminal';
import { FullMarketContextPayload } from '@/types/analysis';

interface SingleExecutionBoxProps {
  setup?: StructuredLLMOutput['trade_setup'];
  signal?: StructuredLLMOutput['signal'];
  confidence?: number;
  marketContext?: FullMarketContextPayload | null;
  isLoading?: boolean;
  onCopyToPaper?: () => void;
}

export const SingleExecutionBox: React.FC<SingleExecutionBoxProps> = ({
  setup,
  signal = 'NEUTRAL',
  confidence = 50,
  marketContext,
  isLoading = false,
}) => {
  const [accountBalance, setAccountBalance] = useState<number>(1000);
  const [riskPct, setRiskPct] = useState<number>(1);

  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-center text-[#777a88] font-mono text-xs">
        <div className="w-6 h-6 border-2 border-[#cc9166] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Analyzing Market Structure & Generating Execution Parameters...
      </div>
    );
  }

  const currentPrice = marketContext?.ticker?.price || 0;

  const effectiveSetup = setup || (currentPrice > 0 ? {
    position: 'NEUTRAL' as const,
    entry_range: [currentPrice, currentPrice],
    stop_loss: currentPrice,
    take_profit_1: currentPrice,
    take_profit_2: currentPrice,
    take_profit_3: currentPrice,
    risk_reward_ratio: 0,
    recommended_leverage: '1x',
    invalidation_point: 0,
    strategy_name: 'Standby / Awaiting Analysis',
  } : null);

  if (!effectiveSetup) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-4 text-center text-[#777a88] font-mono text-xs">
        Market Standby — Click &quot;Run AI Quant&quot; to calculate execution parameters.
      </div>
    );
  }

  const activeSetup = effectiveSetup;
  const entryMid = (activeSetup.entry_range[0] + activeSetup.entry_range[1]) / 2;
  const isLong = activeSetup.position === 'LONG';
  const isShort = activeSetup.position === 'SHORT';

  // Position Size & Risk Calculation
  const maxRiskAmount = (accountBalance * riskPct) / 100;
  const slDistanceAbs = Math.abs(entryMid - activeSetup.stop_loss);
  const positionUnits = slDistanceAbs > 0 ? maxRiskAmount / slDistanceAbs : 0;
  const notionalValue = positionUnits * entryMid;
  const leverageNum = parseInt(activeSetup.recommended_leverage?.replace(/[^0-9]/g, '') || '1', 10) || 1;
  const requiredMargin = leverageNum > 0 ? notionalValue / leverageNum : notionalValue;

  // Dynamic Risk Guard Detection
  const riskWarnings: string[] = [];

  // Check 1: Spot vs Entry distance
  if (currentPrice > 0) {
    const distPct = Math.abs((entryMid - currentPrice) / currentPrice) * 100;
    if (distPct > 5) {
      riskWarnings.push(`Entry zone is ${distPct.toFixed(1)}% away from current spot price ($${currentPrice.toLocaleString()}). Wait for pullback.`);
    }
  }

  // Check 2: Invalid TP setup
  if (currentPrice > 0 && isLong && activeSetup.take_profit_1 < currentPrice) {
    riskWarnings.push(`TP1 ($${activeSetup.take_profit_1.toLocaleString()}) is below current spot price ($${currentPrice.toLocaleString()}).`);
  }
  if (currentPrice > 0 && isShort && activeSetup.take_profit_1 > currentPrice) {
    riskWarnings.push(`TP1 ($${activeSetup.take_profit_1.toLocaleString()}) is above current spot price ($${currentPrice.toLocaleString()}).`);
  }

  // Check 3: RSI Divergence
  const tfData = marketContext?.timeframes['1h'] || marketContext?.timeframes[Object.keys(marketContext?.timeframes || {})[0]];
  const rsiVal = tfData?.indicators?.rsi_14;
  if (rsiVal && rsiVal > 70 && isLong) {
    riskWarnings.push(`RSI is in Overbought zone (${rsiVal.toFixed(1)} > 70) while AI model recommends LONG.`);
  }
  if (rsiVal && rsiVal < 30 && isShort) {
    riskWarnings.push(`RSI is in Oversold zone (${rsiVal.toFixed(1)} < 30) while AI model recommends SHORT.`);
  }

  const getSignalBadge = () => {
    if (signal === 'BUY' || isLong) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold uppercase">
          <TrendingUp className="w-4 h-4" /> LONG / BUY ({confidence}%)
        </span>
      );
    }
    if (signal === 'SELL' || isShort) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-rose-950/60 border border-rose-500/40 text-rose-400 text-xs font-mono font-bold uppercase">
          <TrendingDown className="w-4 h-4" /> SHORT / SELL ({confidence}%)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#121317] border border-[#1c1d22] text-[#9194a1] text-xs font-mono font-bold uppercase">
        <PauseCircle className="w-4 h-4 text-amber-400" /> WAIT / NEUTRAL ({confidence}%)
      </span>
    );
  };

  return (
    <div className="bg-[#040406] border border-[#1c1d22] hover:border-[#777a88]/40 rounded-[10px] p-4 space-y-4 font-mono transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-3">
          {getSignalBadge()}
          <span className="text-xs text-[#5e616e]">
            Leverage: <strong className="text-[#e2e3e9]">{activeSetup.recommended_leverage || '1x'}</strong>
          </span>
          <span className="text-xs text-[#5e616e]">
            R:R Ratio: <strong className="text-emerald-400">{activeSetup.risk_reward_ratio || 0}R</strong>
          </span>
        </div>
        <div className="text-xs text-[#5e616e] truncate">
          Strategy: <span className="text-[#cc9166]">{activeSetup.strategy_name || 'Quantitative Pullback'}</span>
        </div>
      </div>

      {/* Main Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Entry Zone */}
        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[8px] p-3 space-y-1">
          <div className="text-[10px] text-[#5e616e] uppercase tracking-wider font-semibold">Optimal Entry Zone</div>
          <div className="text-sm font-bold text-sky-400">
            ${activeSetup.entry_range[0]?.toLocaleString()} - ${activeSetup.entry_range[1]?.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#777a88]">Midpoint: ${entryMid.toLocaleString()}</div>
        </div>

        {/* Stop Loss */}
        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[8px] p-3 space-y-1">
          <div className="text-[10px] text-[#5e616e] uppercase tracking-wider font-semibold">Stop Loss (SL)</div>
          <div className="text-sm font-bold text-rose-400">${activeSetup.stop_loss?.toLocaleString()}</div>
          <div className="text-[10px] text-[#777a88]">
            Max Loss: -{Math.abs(((activeSetup.stop_loss - entryMid) / entryMid) * 100).toFixed(2)}%
          </div>
        </div>

        {/* Targets (TPs) */}
        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[8px] p-3 space-y-1">
          <div className="text-[10px] text-[#5e616e] uppercase tracking-wider font-semibold">Profit Targets (TP)</div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <span>TP1: ${activeSetup.take_profit_1?.toLocaleString()}</span>
            <span>·</span>
            <span>TP2: ${activeSetup.take_profit_2?.toLocaleString()}</span>
          </div>
          <div className="text-[10px] text-emerald-500/80">TP3 Target: ${activeSetup.take_profit_3?.toLocaleString()}</div>
        </div>
      </div>

      {/* Risk Calculator Controls */}
      <div className="bg-[#08080a]/60 border border-[#1c1d22]/80 rounded-[8px] p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-[#9194a1]">
          <span className="flex items-center gap-1.5 font-semibold text-[#e2e3e9]">
            <Calculator className="w-3.5 h-3.5 text-[#cc9166]" /> Position Risk Calculator
          </span>
          <span>
            Max Risk Amount: <strong className="text-rose-400">${maxRiskAmount.toFixed(2)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-[#5e616e]">Balance ($)</label>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Number(e.target.value))}
              className="w-full bg-[#121317] border border-[#1c1d22] rounded px-2 py-1 text-xs text-[#e2e3e9] focus:outline-none focus:border-[#cc9166]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#5e616e]">Risk (%)</label>
            <input
              type="number"
              step="0.5"
              value={riskPct}
              onChange={(e) => setRiskPct(Number(e.target.value))}
              className="w-full bg-[#121317] border border-[#1c1d22] rounded px-2 py-1 text-xs text-[#e2e3e9] focus:outline-none focus:border-[#cc9166]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#5e616e]">Units</label>
            <div className="bg-[#121317] border border-[#1c1d22] rounded px-2 py-1 text-xs text-[#e2e3e9] truncate">
              {positionUnits.toFixed(4)}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#5e616e]">Req. Margin ({activeSetup.recommended_leverage || '1x'})</label>
            <div className="bg-[#121317] border border-[#1c1d22] rounded px-2 py-1 text-xs text-amber-400 font-bold truncate">
              ${requiredMargin.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Guard Checklist (Automated Warnings) */}
      <div className="border-t border-[#1c1d22] pt-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#e2e3e9]">
          {riskWarnings.length > 0 ? (
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          <span>Automated Risk Guard Verification</span>
        </div>

        {riskWarnings.length > 0 ? (
          <div className="space-y-1">
            {riskWarnings.map((warn, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 bg-amber-950/30 border border-amber-500/30 rounded px-2.5 py-1.5 text-[11px] text-amber-300"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded px-2.5 py-1 text-[11px] text-emerald-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            No logical coherence or risk divergence issues detected. Parameters meet quant safety standards.
          </div>
        )}
      </div>
    </div>
  );
};
