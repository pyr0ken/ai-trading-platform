'use client';

import React, { useEffect, useState } from 'react';
import { X, Info } from 'lucide-react';

interface ToastMessage {
  id: number;
  text: string;
  duration?: number;
}

// Global emitter — any component can push toasts
let toastId = 0;
let toastListener: ((msg: ToastMessage) => void) | null = null;

export function showToast(text: string, duration = 5000) {
  toastListener?.({ id: ++toastId, text, duration });
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastListener = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      // Auto-dismiss after msg.duration (default 5s)
      const dur = msg.duration || 5000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, dur);
    };
    return () => {
      toastListener = null;
    };
  }, []);

  const handleClose = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[99999] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
      {toasts.map((t) => {
        const duration = t.duration || 5000;
        return (
          <div
            key={t.id}
            className="bg-[#121317] border border-[#1c1d22] text-[#e2e3e9] rounded-[10px] shadow-[0_12px_40px_rgba(0,0,0,0.6)] font-sans text-xs pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 relative group"
          >
            {/* Top progress bar representing toast lifetime */}
            <div
              className="absolute top-0 left-0 h-[2px] bg-[#cc9166]"
              style={{
                width: '100%',
                animation: `shrinkWidth ${duration}ms linear forwards`,
              }}
            />

            <div className="p-4 flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-[#cc9166]/10 border border-[#cc9166]/30 flex items-center justify-center shrink-0">
                <Info className="w-3 h-3 text-[#cc9166]" />
              </div>

              <div className="flex-1 space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#cc9166] block">
                  System Notification
                </span>
                <p className="text-xs text-[#e2e3e9] leading-relaxed font-mono">
                  {t.text}
                </p>
              </div>

              <button
                onClick={() => handleClose(t.id)}
                className="p-1 rounded-full text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#1c1d22] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
