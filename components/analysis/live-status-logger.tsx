'use client';

import React from 'react';
import { CheckCircle2, Loader2, Terminal, AlertCircle } from 'lucide-react';

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
    <div className="bg-[#121214] border border-[#27272a] rounded-[10px] p-4 text-xs text-[#f5f5f4] space-y-2.5 my-4">
      <div className="flex items-center justify-between border-b border-[#27272a] pb-2 mb-3">
        <div className="flex items-center gap-2 text-[#f5f5f4] font-normal">
          <Terminal className="w-3.5 h-3.5 text-[#fbe1d1]" />
          <span className="font-normal text-xs">Pipeline Execution Log</span>
        </div>
        <span className="text-[11px] text-[#71717a]">Live Status</span>
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
              className={`flex items-start gap-2.5 transition-all p-2 rounded-[12px] ${
                isInProgress
                  ? 'bg-[#3c1f17] text-[#fbe1d1] border border-[#5d2a1a]'
                  : isCompleted
                  ? 'text-[#f5f5f4] bg-[#18181b]'
                  : isFailed
                  ? 'text-rose-400 bg-rose-950/40 border border-rose-900'
                  : 'text-[#71717a] opacity-60'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-[#fbe1d1]" />}
                {isInProgress && <Loader2 className="w-3.5 h-3.5 text-[#fbe1d1] animate-spin" />}
                {isFailed && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                {isPending && <div className="w-3.5 h-3.5 rounded-full border border-[#3f3f46]" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-normal text-xs">{step.label}</span>
                  <span className="text-[10px] uppercase font-normal text-[#a1a1aa]">
                    {step.status.replace('_', ' ')}
                  </span>
                </div>
                {step.detail && (
                  <p className="text-[11px] text-[#a1a1aa] mt-0.5 font-sans leading-tight">
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
