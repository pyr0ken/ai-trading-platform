'use client';

import React from 'react';
import { ConvictionScore } from '@/types/terminal';
import { CheckCircle2, AlertCircle, ShieldAlert, Award } from 'lucide-react';

interface ConvictionBreakdownProps {
  score?: ConvictionScore;
}

export const ConvictionBreakdownComponent: React.FC<ConvictionBreakdownProps> = ({ score }) => {
  if (!score) return null;

  const gradeColors = {
    HIGH: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    MEDIUM: 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10',
    LOW: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    REJECTED: 'text-red-400 border-red-500/30 bg-red-500/10',
  };

  return (
    <div className="bg-[#121318] border border-[#2a2e39] rounded-xl p-4 text-xs font-mono space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
        <div className="flex items-center gap-2 text-[#cc9166]">
          <Award className="w-4 h-4" />
          <span className="font-bold text-sm tracking-wide">DETERMINISTIC CONVICTION SCORE</span>
        </div>
        <div className={`px-2.5 py-1 rounded-md border font-bold ${gradeColors[score.grade]}`}>
          {score.final_score} / 100 ({score.grade})
        </div>
      </div>

      {/* Veto Warnings */}
      {score.vetoes.length > 0 && (
        <div className="space-y-1.5 bg-red-500/10 border border-red-500/30 p-2.5 rounded-lg text-red-300">
          <div className="flex items-center gap-1.5 font-bold text-red-400 text-[11px]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>SOFT VETO PENALTIES APPLIED (-{score.veto_penalty} PTS):</span>
          </div>
          {score.vetoes.map((v, i) => (
            <div key={i} className="text-[10px] pl-5 list-disc">
              • <strong>{v.rule}</strong> (-{v.penalty} pts): {v.detail}
            </div>
          ))}
        </div>
      )}

      {/* 9-Filter Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {score.filters.map((f, i) => {
          const isFull = f.score >= f.max * 0.8;
          const isLow = f.penalising;

          return (
            <div
              key={i}
              className={`p-2 rounded border flex flex-col justify-between ${
                isLow
                  ? 'bg-red-500/5 border-red-500/20'
                  : isFull
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-[#181a20] border-[#2a2e39]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px]">
                <span className="flex items-center gap-1.5 text-gray-200">
                  {isLow ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  {f.name}
                </span>
                <span className={isLow ? 'text-red-400' : 'text-emerald-400'}>
                  {f.score} / {f.max}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{f.reason}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
