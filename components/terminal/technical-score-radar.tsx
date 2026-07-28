'use client';

import React from 'react';
import { RadarScores } from '@/types/terminal';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { Award } from 'lucide-react';

interface TechnicalScoreRadarProps {
  scores?: RadarScores | null;
  isLoading?: boolean;
}

export const TechnicalScoreRadar: React.FC<TechnicalScoreRadarProps> = ({
  scores,
  isLoading,
}) => {
  if (isLoading || !scores) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] animate-pulse min-h-[300px]">
        <div className="h-5 w-40 bg-[#121317] rounded-[9999px] mb-4" />
        <div className="h-48 bg-[#121317] rounded-[10px]" />
      </div>
    );
  }

  const chartData = [
    { subject: 'Technical', A: scores.technical, fullMark: 100 },
    { subject: 'Momentum', A: scores.momentum, fullMark: 100 },
    { subject: 'News', A: scores.news, fullMark: 100 },
    { subject: 'Risk', A: scores.risk, fullMark: 100 },
    { subject: 'Liquidity', A: scores.liquidity, fullMark: 100 },
    { subject: 'Trend', A: scores.trend, fullMark: 100 },
  ];

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-4">
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">
            QUANT SCORES & RADAR
          </span>
        </div>
        <span className="text-xs text-[#9194a1] font-mono">Radar Matrix</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Recharts Radar Chart */}
        <div className="h-56 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid stroke="#1c1d22" />
              <PolarAngleAxis dataKey="subject" stroke="#9194a1" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#2e3038" />
              <Radar
                name="Score"
                dataKey="A"
                stroke="#cc9166"
                fill="#cc9166"
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Progress Bars */}
        <div className="space-y-2.5 text-xs font-sans">
          {chartData.map((item) => (
            <div key={item.subject} className="space-y-1">
              <div className="flex justify-between text-xs text-[#9194a1]">
                <span>{item.subject} Score</span>
                <span className="font-mono font-semibold text-[#e2e3e9]">{item.A}/100</span>
              </div>
              <div className="w-full bg-[#121317] h-2 rounded-[9999px] overflow-hidden border border-[#1c1d22]">
                <div
                  className="bg-[#cc9166] h-full rounded-[9999px] transition-all duration-500"
                  style={{ width: `${Math.min(item.A, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

