'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Gauge } from 'lucide-react';

interface BuySellMeterProps {
  buyPct?: number;
  sellPct?: number;
  neutralPct?: number;
  isLoading?: boolean;
}

export const BuySellMeter: React.FC<BuySellMeterProps> = ({
  buyPct = 74,
  sellPct = 26,
  neutralPct = 0,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] animate-pulse min-h-[200px]">
        <div className="h-4 w-32 bg-[#121317] rounded-[9999px] mb-3" />
        <div className="h-28 bg-[#121317] rounded-[10px]" />
      </div>
    );
  }

  const data = [
    { name: 'Buy Pressure', value: buyPct, color: '#ffffff' },
    { name: 'Sell Pressure', value: sellPct, color: '#f43f5e' },
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
        <span className="text-xs text-[#9194a1] font-mono">Market Balance</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Recharts Pie Donut Meter */}
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
            <span className="text-sm font-bold font-mono text-[#ffffff]">{buyPct}%</span>
            <span className="text-[9px] text-[#9194a1]">BUY</span>
          </div>
        </div>

        {/* Meter Legend */}
        <div className="flex-1 space-y-2 text-xs font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[9999px] bg-[#ffffff]" />
              <span className="text-[#9194a1]">Buy Force</span>
            </div>
            <span className="font-mono font-semibold text-[#ffffff]">{buyPct}%</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[9999px] bg-rose-500" />
              <span className="text-[#9194a1]">Sell Force</span>
            </div>
            <span className="font-mono font-semibold text-rose-400">{sellPct}%</span>
          </div>

          {neutralPct > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[9999px] bg-[#5e616e]" />
                <span className="text-[#9194a1]">Neutral</span>
              </div>
              <span className="font-mono font-semibold text-[#9194a1]">{neutralPct}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

