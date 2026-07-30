'use client';

import React, { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
}

// Global emitter — any component can push toasts
let toastId = 0;
let toastListener: ((msg: ToastMessage) => void) | null = null;

export function showToast(text: string) {
  toastListener?.({ id: ++toastId, text });
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastListener = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      // Auto-dismiss after 2.5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 2500);
    };
    return () => {
      toastListener = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-[#18181b] border border-[#27272a] text-[#f5f5f4] px-5 py-3 rounded-[14px] shadow-2xl font-mono text-xs animate-in slide-in-from-bottom-2 fade-in duration-200 pointer-events-auto"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
};
