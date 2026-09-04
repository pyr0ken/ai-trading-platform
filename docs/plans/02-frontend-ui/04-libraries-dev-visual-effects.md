# ✨ Frontend UI — Part 4: High-Crafted AI Visual Effects & Shaders
## Integration of `Libraries.dev` Effects (Orbs, Border Beam, Liquid Metal)

> **Inspiration & Stack:** [Libraries.dev](https://libraries.dev/) — High-crafted UI effect primitives for AI agents (`thinking-orbs`, `border-beam`, `metal-fx`, `liquid-gooey`).  
> **Target Module:** `frontend/features/ai-advisor/components/effects/` & `frontend/components/ui/`  
> **Compatibility:** React 19, Next.js 16, Tailwind CSS v4, WebGL / CSS Canvas shaders.

---

## 1. Visual Effects Suite Catalog

```
┌─────────────────────────────────────────────────────────────┐
│                 🌌 AI Visual Effects Engine                 │
├─────────────────────────────────────────────────────────────┤
│ 1. 🔮 Thinking Orb (`thinking-orbs`):                       │
│    - Glowing WebGL / CSS particle sphere in top session bar.│
│    - Glows & pulses rhythmically during LLM reasoning / tools│
│ 2. ⚡ Border Beam (`border-beam`):                           │
│    - Glowing animated light beam circulating card borders.  │
│    - Highlights active Trade Setup Cards & executing tools. │
│ 3. 🪙 Liquid Metal (`metal-fx`):                            │
│    - Luxury dark liquid metallic shader for executive cards.│
│    - Subtle reactive hover reflection on institutional tiles│
│ 4. 💧 Liquid Gooey (`liquid-gooey`):                        │
│    - Organic fluid pill transitions between active tabs.    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Component Role Mapping & Terminal Aesthetics

| Effect Component | Target Location in Terminal | Visual Behavioral Trigger |
| :--- | :--- | :--- |
| **`ThinkingOrb`** | `SessionHeaderBar` / `ThinkingState` | Pulses with copper/emerald glow while the AI Agent executes ReAct loops and tools. |
| **`BorderBeam`** | `ActionableTradeCard` | Active laser beam running around the card border when an institutional signal is confirmed. |
| **`LiquidMetal`** | `BorderedContainerFrame` / `PineScriptCard` | Premium brushed titanium & dark copper metallic shader on executive reporting cards. |
| **`LiquidGooeyPill`** | `TimeframeSelector` / `QuickCommands` | Fluid morphing pill indicator when switching between `5m`, `15m`, `1h`, `4h`. |

---

## 3. Concrete Implementation Example (`border-beam.tsx`)

```tsx
'use client';
import React from 'react';

interface BorderBeamProps {
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  size = 200,
  duration = 12,
  borderWidth = 1.5,
  colorFrom = '#cc9166',
  colorTo = '#10b981',
  className = '',
}) => {
  return (
    <div
      style={
        {
          '--size': `${size}px`,
          '--duration': `${duration}s`,
          '--border-width': `${borderWidth}px`,
          '--color-from': colorFrom,
          '--color-to': colorTo,
        } as React.CSSProperties
      }
      className={`pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent] 
      ![mask-clip:padding-box,border-box] ![mask-composite:intersect] 
      [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] 
      after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam 
      after:[animation-duration:var(--duration)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] 
      after:[offset-anchor:calc(var(--size)*0.5px)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))] ${className}`}
    />
  );
};
```
