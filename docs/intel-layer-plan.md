# Market Intelligence Layer — Detailed Implementation Plan

Status: PLANNING (no code written yet)
Author: agent, for pyr0ken/ai-trading-platform
Date: 2026-08-05

---

## Evidence base

Measured from `logs/news-intelligence/` (21 runs, 2026-08-03 → 2026-08-05):

```
LLM succeeded :  7  (33%)
Fallback used : 14  (67%)
```

Content comparison of two adjacent runs:

| field            | `_llm_` run | `_fallback_` run |
|------------------|-------------|------------------|
| `biasConfidence` | 70          | 3                |
| `macroDrivers`   | 3 entries   | `[]`             |
| `assetImpacts`   | 4 entries   | `[]`             |

Root cause, `lib/news/news-intelligence.ts`:
- line 301 — `affectedAssets: []` hardcoded in `buildFallbackBrief`
- line 330 — `assetImpacts: []` hardcoded in the same function

The deterministic path computes sentiment but has **no asset-mapping capability**.
So two thirds of the time the main model receives a brief with no asset linkage.

`lib/llm/institutional-prompt.ts:322` injects this into every analysis prompt.

**Conclusion:** the relevance scorer (Phase 2) is not only the tweet feature — it
is the fix for the existing 67% degradation. One engine, two consumers.

---

## Architecture

```
x_feed_engine (Python)          news-service (TS)
        │                              │
        ▼                              ▼
   tweets.db  ──────┐         ┌──── RSS articles
                    │         │
                    ▼         ▼
        ┌───────────────────────────────┐
        │ Phase 1: source-registry      │  credibility weight per author
        └───────────────┬───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │ Phase 2: relevance-scorer     │  ← THE CORE
        │  item × symbol → 0.0-1.0      │     deterministic, always runs
        └───────────────┬───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │ Phase 3: intel-aggregator     │  merge tweets + news, rank, top-N
        └───────────────┬───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │ Phase 4: LLM enrichment       │  OPTIONAL — failure is a no-op
        │  top 5 items only, 8s timeout │
        └───────────────┬───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │ Phase 5: prompt injection     │
        └───────────────────────────────┘
```

Invariant: **every layer below 4 is deterministic and total.** If the LLM is
down, output quality degrades from "enriched" to "ranked" — never to empty.

---

## Phase 0 — Fix x_feed_engine

Three defects block automation.

### 0.1 Destructive DB reset
`x_feed/database.py:14` — `DROP TABLE IF EXISTS tweets` on every run.
No dedup history: a tweet seen on 3 runs is emitted 3 times.

Change: `CREATE TABLE IF NOT EXISTS`, add `UNIQUE(tweet_url)`, switch to
`INSERT OR IGNORE`. Add `--reset` flag for deliberate wipes.

### 0.2 Interactive-only entry point
`main.py:25` — bare `input()`. Cannot run under cron/systemd.

Change: `argparse` with `--non-interactive`, `--auth-mode {auto,manual,existing}`,
`--output`. Default behaviour unchanged when run bare.

### 0.3 No engagement metrics
`x_feed/scraper/feed.py:103-114` — the tweet dict has no likes/retweets/replies.
This is the cheapest available importance signal and it is discarded.

Change: extract `[data-testid="like"]`, `[data-testid="retweet"]`,
`[data-testid="reply"]` counts; parse "1.2K"/"3.4M" suffixes. Missing → 0, never
throw.

**Exit criteria:** run twice consecutively, second run inserts 0 duplicates;
`--non-interactive` completes without stdin; ≥90% of scraped tweets carry
non-null engagement.

---

## Phase 1 — Source registry

New: `lib/intel/source-registry.ts`

Static credibility weight per author, 0.0-1.0. Not sentiment — *reliability*.

| tier | weight | members |
|------|--------|---------|
| PRIMARY_MOVER | 0.90-0.98 | realDonaldTrump, elonmusk |
| INSTITUTIONAL | 0.75-0.88 | BlackRock, SECGov, CFTC, fidelity |
| EXCHANGE      | 0.70-0.82 | binance, coinbase, krakenfx |
| ONCHAIN       | 0.65-0.80 | lookonchain, glassnode, ArkhamIntel |
| MEDIA         | 0.50-0.65 | CoinDesk, Cointelegraph, WuBlockchain |
| SECURITY      | 0.60-0.75 | PeckShieldAlert, CertiKAlert, zachxbt |

Unknown author → 0.35 (present but discounted).

RSS domains mapped on the same scale so news and tweets share one currency.

**Exit criteria:** every account in `x_feed_engine/config.json` resolves to a
non-default weight; unknown handles return exactly 0.35.

---

## Phase 2 — Relevance scorer  ★ THE CORE

New: `lib/intel/relevance-scorer.ts`

Answers the question you actually asked: *is this item relevant to THIS symbol?*

```
scoreRelevance(item, symbol) -> {
  score: 0.0-1.0,
  matchedTerms: string[],
  reasons: string[]
}
```

### Symbol taxonomy

Each tradeable symbol gets a term set:

```
BTC/USDT  → direct:  bitcoin, btc, $btc, satoshi
            related: etf, halving, mining, hashrate, microstrategy
            macro:   fed, rate, inflation, dxy, risk-on

XAUT/USDT → direct:  gold, xau, bullion
            related: safe haven, central bank, reserves
            macro:   fed, rate, inflation, dxy, geopolitic, war

SOL/USDT  → direct:  solana, sol, $sol
            related: firedancer, jito, saga
            macro:   (shared crypto-beta set)
```

### Scoring model

```
base       = max over matched tiers  (direct 1.0 / related 0.55 / macro 0.30)
credibility= source-registry weight                        [Phase 1]
freshness  = exp(-age_hours / half_life)                   half_life by tier
engagement = log-scaled, capped at 1.0                     [Phase 0.3]
negation   = penalty if matched term is negated/hypothetical

score = base × (0.45 + 0.25·credibility + 0.20·freshness + 0.10·engagement)
        × (1 - negation_penalty)
```

Weights sum to 1.0 with a 0.45 floor so a direct hit from an unknown, old,
zero-engagement source still scores ≈0.45 — present but low priority.

### Cross-domain suppression — the mechanism you asked for

Explicit exclusion sets. A crypto-only term never lifts a metals symbol:

```
"Bitcoin ETF inflows hit record high"
  BTC/USDT  → 0.92   direct hit, high credibility, fresh
  XAUT/USDT → 0.15   no direct/related; weak macro echo only
  OIL       → 0.03   fully excluded
```

Cross-asset macro terms (fed, inflation, war, tariff) DO propagate, because they
genuinely move both — that is the point of the `macro` tier.

**Exit criteria (test file `tests/relevance-scorer.test.ts`):**
- Trump tariff tweet: XAUT ≥ 0.60 AND BTC ≥ 0.40
- Pure BTC-technical tweet: XAUT ≤ 0.20
- Solana outage tweet: SOL ≥ 0.80, BTC ≤ 0.35
- Unrelated (SpaceX launch): all symbols ≤ 0.15
- Negated ("no plans to ban crypto"): sentiment not inverted into false positive
- Every score in [0,1]; no NaN for any input including empty/garbage text

---

## Phase 3 — Aggregator

New: `lib/intel/intel-aggregator.ts`

Merges tweets + RSS into one ranked list per symbol.

Responsibilities:
1. Load tweets from `tweets_ai_feed.json` (path configurable, absence is fine)
2. Load articles via existing `NewsService`
3. Normalise both into a common `IntelItem` shape
4. Score every item against the requested symbol  [Phase 2]
5. Drop below threshold (default 0.25)
6. Deduplicate near-identical items (same story from 3 outlets → 1)
7. Sort by score, return top N (default 8)

Also computes a deterministic `assetImpacts` array — **this is what fills the
`[]` at news-intelligence.ts:330** and repairs the 67% fallback case.

**Exit criteria:** with the LLM entirely disabled, aggregator still returns
non-empty `assetImpacts` for a symbol with relevant items; missing tweet file
does not throw; 300 items score in <50ms.

---

## Phase 4 — Optional LLM enrichment

New: `lib/intel/intel-enricher.ts`

Runs ONLY on the top 5 ranked items. Adds nuance the lexicon cannot see:
sarcasm, implication, second-order effects.

Hard rules, mirroring the existing pattern at news-intelligence.ts:557-565:
- 8s `AbortController` timeout
- any failure (HTTP, parse, empty, no-substance) → return `null`
- caller treats `null` as "no enrichment", keeps Phase 3 output verbatim
- enrichment may only ADD fields, never overwrite deterministic scores
- never on the critical path: if it is slow, we ship without it

Cost note: 5 items instead of 300 ≈ 90%+ reduction versus naive full-feed.

**Exit criteria:** with `INTEL_LLM_ENABLED=false`, pipeline produces full output;
with a deliberately broken endpoint, output identical to disabled case; enriched
run adds fields but leaves `score` untouched.

---

## Phase 5 — Prompt injection

Modify: `lib/llm/institutional-prompt.ts` (near the existing news block, line ~322)

New section, only when items clear threshold:

```
LIVE MARKET INTELLIGENCE (relevance-filtered for BTC/USDT):
- [0.94 | @realDonaldTrump | 2h ago] "..."
    → Relevance: direct mention + macro tariff term
- [0.71 | @lookonchain | 40m ago] "..."
    → Relevance: on-chain flow, high engagement

Guidance: These are RELEVANCE-RANKED, not directives. A high score means the
item concerns this symbol — not that it implies a direction. Weigh against
technical structure; do not let a single headline override the setup.
```

That last paragraph matters — without it the model over-weights social text
against its own technical read.

**Exit criteria:** prompt contains the block when items exist and omits it
cleanly when none do; token growth bounded (top-N cap); existing prompt tests
still pass.

---

## Phase 6 — Test suite

| file | covers |
|------|--------|
| `tests/source-registry.test.ts` | tier weights, unknown default |
| `tests/relevance-scorer.test.ts` | **the scenarios above** — cross-domain core |
| `tests/intel-aggregator.test.ts` | dedup, threshold, missing-file, perf |
| `tests/intel-enricher.test.ts` | timeout, malformed, disabled → all no-op |
| `tests/intel-prompt.test.ts` | injection present/absent, token bound |

Plus a regression assertion: deterministic `assetImpacts` is non-empty where the
current fallback returns `[]`.

---

## Sequencing

```
Phase 0  (Python)  ──┐
Phase 1  (registry) ─┴─→ Phase 2 (scorer) ─→ Phase 3 (aggregator) ─→ Phase 5 (prompt)
                                                      │
                                            Phase 4 (enricher, parallel)
                                                      │
                                            Phase 6 (tests, continuous)
```

Phases 0 and 1 are independent and can be done in either order. Phase 2 depends
on 1. Phase 3 depends on 2. Phase 4 depends on 3 but nothing depends on 4 —
by design.

## Risk register

| risk | mitigation |
|------|-----------|
| X changes DOM, scraper breaks | tweets absent → aggregator degrades to news-only, no throw |
| LLM enricher down | returns null, deterministic output ships |
| Term lists go stale | centralised in one file, additive edits, covered by tests |
| Prompt bloat | hard top-N cap + token assertion in tests |
| Over-weighting social noise | explicit guidance paragraph + relevance ≠ direction framing |
