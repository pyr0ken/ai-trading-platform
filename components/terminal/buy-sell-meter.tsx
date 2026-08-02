'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Gauge, Sparkles, RotateCw } from 'lucide-react';
import { MicrostructureMetrics } from '@/types/market';

interface BuySellMeterProps {
  buyPct?: number;
  sellPct?: number;
  neutralPct?: number;
  isLoading?: boolean;
  microstructure?: MicrostructureMetrics | null;
}

export const BuySellMeter: React.FC<BuySellMeterProps> = ({
  buyPct,
  sellPct,
  neutralPct = 0,
  isLoading,
  microstructure,
}) => {
  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] flex flex-col items-center justify-center min-h-[180px] space-y-2">
        <RotateCw className="w-5 h-5 text-[#cc9166] animate-spin" />
        <span className="text-xs font-mono text-[#9194a1]">Evaluating Orderbook Imbalance...</span>
      </div>
    );
  }

  // Derive buy/sell pressure from real microstructure data when available
  let displayBuy: number | null = null;
  let displaySell: number | null = null;

  if (microstructure?.orderBookDepth?.imbalanceRatio) {
    const ratio = microstructure.orderBookDepth.imbalanceRatio;
    const total = ratio + (1 / ratio);
    displayBuy = Math.round((ratio / total) * 100);
    displaySell = 100 - displayBuy;
  } else if (buyPct !== undefined && sellPct !== undefined) {
    displayBuy = buyPct;
    displaySell = sellPct;
  }

  if (displayBuy === null || displaySell === null) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-3">
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#cc9166]" />
            <span className="eyebrow-copper">BUY VS SELL PRESSURE METER</span>
          </div>
          <span className="text-xs text-[#5e616e] font-mono">Orderbook Balance</span>
        </div>
        <div className="p-3 bg-[#121317]/50 border border-[#1c1d22] rounded-[8px] flex items-center justify-between text-xs">
          <span className="text-[#9194a1]">Buy/Sell pressure meter ready.</span>
          <span className="text-[11px] font-mono text-[#cc9166] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Run AI Quant
          </span>
        </div>
      </div>
    );
  }

  const data = [
    { name: 'Buy Pressure', value: displayBuy, color: '#ffffff' },
    { name: 'Sell Pressure', value: displaySell, color: '#f43f5e' },
    { name: 'Neutral', value: neutralPct, color: '#5e616e' },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-3">
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">
            BUY VS SELL PRESSURE METER
          </span>
        </div>
        <span className="text-xs text-[#9194a1] font-mono">
          {microstructure?.orderBookDepth?.imbalanceRatio
            ? `Orderbook: ${microstructure.orderBookDepth.orderBookPressure}`
            : 'AI Probabilistic Balance'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Donut Meter */}
        <div className="h-32 w-32 relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={48}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col text-center">
            <span className="text-sm font-bold font-mono text-[#ffffff]">{displayBuy}%</span>
            <span className="text-[9px] text-[#9194a1]">BUY</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[#e2e3e9] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white inline-block" /> Buy Pressure
            </span>
            <span className="font-bold text-white">{displayBuy}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9194a1] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Sell Pressure
            </span>
            <span className="font-bold text-rose-400">{displaySell}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
