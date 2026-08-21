'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onRefresh?: () => void;
  isFetching?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isFetching }) => {
  const [mounted, setMounted] = useState(false);
  const [llmOnline, setLlmOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLlmStatus = async () => {
      try {
        const res = await fetch('/api/analysis/stream', { method: 'HEAD' });
        setLlmOnline(res.status !== 500);
      } catch {
        setLlmOnline(false);
      } finally {
        setMounted(true);
      }
    };
    checkLlmStatus();
  }, []);

  return (
    <header className="w-full bg-[#0c0a09] border-b border-[#1c1917] text-[#f5f5f4] px-6 py-4">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        {/* Steep Dark Brand Mark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f5f5f4] text-[#0c0a09] flex items-center justify-center font-serif text-base italic font-bold">
            S
          </div>
          <div>
            <h1 className="font-serif text-xl tracking-tight font-normal text-[#f5f5f4]">
              Steep Market Intelligence
            </h1>
          </div>
        </div>

        {/* Status & Navigation */}
        <div className="flex items-center gap-4">
          {/* Local LLM Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] text-xs text-[#a1a1aa] font-medium">
            <Cpu className="w-3.5 h-3.5 text-[#f5f5f4]" />
            <span>Hermes 20128:</span>
            <span className="flex items-center gap-1.5 font-semibold text-[#f5f5f4]">
              {mounted && (
                <>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      llmOnline === true ? 'bg-emerald-400' : llmOnline === false ? 'bg-amber-400' : 'bg-stone-500'
                    }`}
                  />
                  <span>{llmOnline === true ? 'Active' : llmOnline === false ? 'Standalone' : 'Checking...'}</span>
                </>
              )}
            </span>
          </div>

          {/* Refresh Pill Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f5f5f4] hover:bg-[#e7e7e4] text-[#0c0a09] text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Refresh Payload</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
