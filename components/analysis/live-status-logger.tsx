'use client';

import React from 'react';
import { CheckCircle2, RotateCw, Terminal, AlertCircle, Sparkles } from 'lucide-react';

export interface LogStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

interface LiveStatusLoggerProps {
  steps: LogStep[];
}

export const LiveStatusLogger: React.FC<LiveStatusLoggerProps> = ({ steps }) => {
  return (
    <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4 text-xs text-[#e2e3e9] space-y-3 font-mono shadow-lg">
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-2.5">
        <div className="flex items-center gap-2 text-[#e2e3e9] font-medium">
          <Terminal className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">PIPELINE EXECUTION LOG</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#cc9166]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="uppercase">Live Pipeline</span>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const isPending = step.status === 'pending';
          const isInProgress = step.status === 'in_progress';
          const isCompleted = step.status === 'completed';
          const isFailed = step.status === 'failed';

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 transition-all p-3 rounded-[8px] border font-sans ${
                isInProgress
                  ? 'bg-amber-950/40 text-amber-200 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)] animate-pulse'
                  : isCompleted
                  ? 'text-[#e2e3e9] bg-[#121317] border-[#1c1d22]'
                  : isFailed
                  ? 'text-red-400 bg-red-950/40 border-red-500/50'
                  : 'text-[#5e616e] bg-[#040406]/50 border-[#1c1d22]/50 opacity-60'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isInProgress && <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />}
                {isFailed && <AlertCircle className="w-4 h-4 text-red-400" />}
                {isPending && <div className="w-4 h-4 rounded-full border border-[#1c1d22]" />}
              </div>

              <div className="flex-1 min-w-0 font-mono">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-[#e2e3e9]">{step.label}</span>
                  <span
                    className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-[4px] border ${
                      isCompleted
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : isInProgress
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                        : isFailed
                        ? 'bg-red-950/80 text-red-400 border-red-500/60'
                        : 'bg-[#121317] text-[#5e616e] border-[#1c1d22]'
                    }`}
                  >
                    {step.status.replace('_', ' ')}
                  </span>
                </div>
                {step.detail && (
                  <p className="text-[11px] text-[#9194a1] mt-1 font-sans leading-relaxed">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
