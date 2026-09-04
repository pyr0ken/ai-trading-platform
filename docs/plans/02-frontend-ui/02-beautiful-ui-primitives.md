# 💎 Frontend UI — Part 2: Crafted AI Agent Primitives

> **Module:** `frontend/features/ai-advisor/components/primitives/`  
> **Inspiration & Philosophy:** `Beautiful UI` (`https://www.beautifului.dev/`) — Zero-bloat copy-paste React 19 primitives with Tailwind CSS v4.

---

## 1. Component Suite Catalog

| Component File | Role & Visual Feature |
| :--- | :--- |
| `thinking-state.tsx` | Collapsible reasoning accordion with live duration counter and pulse shimmer. |
| `tool-chips.tsx` | Interactive badges showing tool status (`Running ⏳`, `Done ✓`, `Failed ✗`). |
| `approval-card.tsx` | **Human-in-the-Loop** confirmation card before executing simulated paper orders. |
| `task-rows.tsx` | Multi-step agent checklist showing step-by-step progress through ReAct iterations. |
| `context-card.tsx` | Visual preview chip showing user-selected chart time/price coordinates. |
| `chat-composer.tsx` | Multi-line auto-resizing textarea with command shortcuts and model selector. |
| `trade-action-card.tsx` | Institutional-styled financial card with $R:R$, leverage, SL/TP and 1-click execution. |

---

## 2. Sample Primitive Implementation (`thinking-state.tsx`)

```tsx
'use client';
import React, { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';

interface ThinkingStateProps {
  content: string;
  durationSeconds?: number;
  isStreaming?: boolean;
}

export const ThinkingState: React.FC<ThinkingStateProps> = ({ content, durationSeconds = 0, isStreaming = false }) => {
  const [open, setOpen] = useState(isStreaming);

  return (
    <div className="border border-[#1c1d22] bg-[#0c0d10] rounded-none p-3 text-xs font-mono text-[#9194a1] space-y-2">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left cursor-pointer hover:text-[#e2e3e9] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className={`w-3.5 h-3.5 text-[#cc9166] ${isStreaming ? 'animate-pulse' : ''}`} />
          <span>Reasoning Process ({durationSeconds.toFixed(1)}s)</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="pt-2 border-t border-[#1c1d22] font-sans text-xs text-[#9194a1] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
};
```
