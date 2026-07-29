'use client';

import React from 'react';
import { StructuredLLMOutput } from '@/types/terminal';
import { Target, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  LabelList,
} from 'recharts';

interface SignalVisualizerChartProps {
  data?: StructuredLLMOutput | null;
  currentPrice?: number;
}

export const SignalVisualizerChart: React.FC<SignalVisualizerChartProps> = ({
  data,
  currentPrice = 67420.5,
}) => {
  const setup = data?.trade_setup;
  const isLong = setup?.position !== 'SHORT';

  const rawMin = setup?.entry_range?.[0] ?? (isLong ? currentPrice * 0.995 : currentPrice * 1.005);
  const rawMax = setup?.entry_range?.[1] ?? (isLong ? currentPrice * 1.005 : currentPrice * 0.995);
  const rawSL = setup?.stop_loss ?? (isLong ? currentPrice * 0.97 : currentPrice * 1.03);
  const rawTP1 = setup?.take_profit_1 ?? (isLong ? currentPrice * 1.02 : currentPrice * 0.98);
  const rawTP2 = setup?.take_profit_2 ?? (isLong ? currentPrice * 1.04 : currentPrice * 0.96);
  const rawTP3 = setup?.take_profit_3 ?? (isLong ? currentPrice * 1.06 : currentPrice * 0.94);

  const entryMin = Number(rawMin);
  const entryMax = Number(rawMax);
  const stopLoss = Number(rawSL);
  const tp1 = Number(rawTP1);
  const tp2 = Number(rawTP2);
  const tp3 = Number(rawTP3);
  const currP = Number(currentPrice);

  const getPctDiff = (targetPrice: number) => {
    const diff = ((targetPrice - currP) / currP) * 100;
    return (diff >= 0 ? '+' : '') + diff.toFixed(2) + '%';
  };

  // Structured dataset (Without Live Price row)
  const chartRows = [
    { level: 'TP3 Target', price: tp3, color: '#84cc16', badge: getPctDiff(tp3) },
    { level: 'TP2 Target', price: tp2, color: '#14b8a6', badge: getPctDiff(tp2) },
    { level: 'TP1 Target', price: tp1, color: '#10b981', badge: getPctDiff(tp1) },
    { level: 'Entry Range', price: entryMax, color: '#3b82f6', badge: `$${entryMin} - $${entryMax}` },
    { level: 'Stop Loss', price: stopLoss, color: '#f43f5e', badge: getPctDiff(stopLoss) },
  ];

  const minVal = Math.floor(Math.min(stopLoss, entryMin, tp1, tp2, tp3) * 0.98);
  const maxVal = Math.ceil(Math.max(stopLoss, entryMax, tp1, tp2, tp3) * 1.02);

  return (
    <div className="bg-[#18181b]/95 border border-[#27272a] backdrop-blur-xl rounded-[24px] p-6 text-[#f5f5f4] shadow-2xl space-y-5 hover:border-[#fbe1d1]/40 transition-all duration-300">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272a] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2a140d] border border-[#5d2a1a] flex items-center justify-center text-[#fbe1d1]">
            <Target className="w-5 h-5 text-[#fbe1d1]" />
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold text-[#f5f5f4]">
              QUANT RECHARTS TARGET MAP
            </h3>
            <span className="text-xs text-[#71717a] font-mono">
              Pure Target Level Channels • Entry Zone, SL & Take Profit Targets
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs shadow-md ${
              isLong
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}
          >
            {isLong ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {isLong ? 'BULLISH LONG' : 'BEARISH SHORT'} {setup?.recommended_leverage ? `(${setup.recommended_leverage})` : ''}
          </span>

          <div className="flex items-center gap-1 bg-[#121214] border border-[#27272a] px-3.5 py-1.5 rounded-full text-[#a1a1aa]">
            <Zap className="w-4 h-4 text-[#fbe1d1]" />
            <span>R:R <strong className="text-[#f5f5f4]">{setup?.risk_reward_ratio || '2.8'}R</strong></span>
          </div>
        </div>
      </div>

      {/* Recharts Target Bar Canvas */}
      <div className="h-[380px] bg-[#0c0a09] border border-[#27272a] rounded-[20px] p-5 font-mono text-xs relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartRows}
            margin={{ top: 20, right: 140, left: 20, bottom: 10 }}
            barCategoryGap="25%"
          >
            <XAxis
              type="number"
              domain={[minVal, maxVal]}
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickFormatter={(val) => `$${val.toLocaleString()}`}
            />
            <YAxis
              type="category"
              dataKey="level"
              stroke="#71717a"
              tick={{ fill: '#f5f5f4', fontSize: 12, fontWeight: 'bold' }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                borderColor: '#27272a',
                borderRadius: '14px',
                color: '#f5f5f4',
                fontSize: '12px',
                padding: '12px',
              }}
              formatter={(val) => {
                if (val === undefined || val === null) return ['', 'Price Level'];
                return [`$${Number(val).toLocaleString()}`, 'Price Level'];
              }}
            />
            <Bar dataKey="price" radius={[0, 10, 10, 0]} barSize={28}>
              {chartRows.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList
                dataKey="price"
                position="right"
                formatter={(val) => {
                  if (val === undefined || val === null) return '';
                  return `$${Number(val).toLocaleString()}`;
                }}
                style={{ fill: '#f5f5f4', fontSize: '11px', fontWeight: 'bold' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
