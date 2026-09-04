# 🧠 AI Agent — Part 2: Memory, Skills & Closed-Loop Reflection

> **Module:** `backend/app/features/ai_agent/memory/` & `backend/app/features/ai_agent/skills/`  
> **Core Concepts:** 3-Tier Tiered Memory, Progressive Disclosure Skills Engine, Post-Trade Reflection.

---

## 1. 3-Tier Memory Architecture

The memory engine balances bounded prompt token usage with deep historical recall:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Working Context (Active Conversation)                    │
│    └── Sliding window of last N messages in active session. │
├─────────────────────────────────────────────────────────────┤
│ 2. Declarative User Profile (Persistent & Budgeted)         │
│    └── Hard-capped YAML/JSON in DB:                         │
│        - Max Risk Per Trade: 1.5%                           │
│        - Trading Style: Swing / Scalp (SMC & Orderflow)     │
│        - Favored Coins: BTC, ETH, SOL                       │
├─────────────────────────────────────────────────────────────┤
│ 3. Episodic Trade Reflection DB (Post-Mortem Lessons)       │
│    └── Structured summaries of resolved past signals.       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Skills Engine (Progressive Disclosure)

Rather than saturating the system prompt with thousands of lines of trading theory, skills are formatted as Markdown playbooks with YAML frontmatter:

```markdown
---
name: liquidity_sweeps
description: Use when price sweeps recent 4H/Daily swing high/low with aggressive volume or divergent delta.
---
# Liquidity Sweeps Playbook
1. Locate recent swing high/low liquidity pools.
2. Confirm wick rejection on 15m/5m timeframe.
3. Check orderbook CVD (Cumulative Volume Delta) for exhaustion.
4. Set Stop Loss beyond the wick extreme + 1.5 * ATR.
```

- **Mechanism:** The system prompt only lists the skill `name` and `description` (~25 tokens each).
- **Execution:** When relevant, the agent calls `load_trading_skill("liquidity_sweeps")` to inject the playbook on the fly.

---

## 3. Closed-Loop Reflection & Self-Correction

```
[Signal Created] ──> [Status: PENDING]
                            │
                            ▼ (Market hits SL or TP)
[Outcome: WIN / LOSS / INVALIDATED]
                            │
                            ▼
[Reflection Engine analyzes error / win factors]
                            │
                            ▼
[Lesson stored in DB: "BTC 4H: Wicks swept tight SL; widen ATR buffer to 2.0x"]
```

When analyzing the same pair in future sessions, the agent queries `recall_trade_lessons(symbol="BTC/USDT")` to avoid repeating past mistakes.
