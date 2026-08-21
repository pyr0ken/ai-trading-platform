/**
 * Financial News Lexicon & Deterministic Sentiment Engine
 *
 * Replaces naive keyword counting with:
 *  1. Weighted financial phrases (multi-word patterns beat single tokens)
 *  2. Negation handling — "not panic selling" must not score as bearish
 *  3. Outcome-aware regulatory patterns — "SEC approves" != "SEC sues"
 *  4. Time decay — a 3-day-old opinion piece must not weigh like a 10-minute-old hack
 *  5. Impact magnitude separate from direction (a huge bullish event and a mild
 *     bullish event share a sign but not a magnitude)
 *
 * ZERO-FABRICATION: every score is derived from the article text supplied.
 * No defaults are invented when text is missing — callers get 0 with
 * confidence 0 so downstream layers can label it "N/A".
 */

/** Direction-bearing phrase with a weight in [0..1]. */
interface WeightedPhrase {
  /** Lowercase phrase to match. Multi-word phrases are matched as substrings. */
  phrase: string;
  /** Magnitude contribution in [0..1]. Higher = stronger claim. */
  weight: number;
}

/**
 * Bullish phrases. Ordered loosely by specificity — longer, outcome-bearing
 * phrases carry more weight than bare adjectives.
 */
const BULLISH_PHRASES: WeightedPhrase[] = [
  // Regulatory outcomes (highest conviction — these are facts, not opinions)
  { phrase: 'etf approved', weight: 1.0 },
  { phrase: 'sec approves', weight: 1.0 },
  { phrase: 'approves spot', weight: 1.0 },
  { phrase: 'wins lawsuit', weight: 0.9 },
  { phrase: 'lawsuit dismissed', weight: 0.9 },
  { phrase: 'charges dropped', weight: 0.85 },
  { phrase: 'regulatory clarity', weight: 0.7 },
  { phrase: 'greenlight', weight: 0.75 },
  { phrase: 'green light', weight: 0.75 },

  // Capital flow (hard data)
  { phrase: 'etf inflow', weight: 0.85 },
  { phrase: 'net inflow', weight: 0.8 },
  { phrase: 'record inflow', weight: 0.9 },
  { phrase: 'accumulation', weight: 0.65 },
  { phrase: 'whale accumulation', weight: 0.75 },
  { phrase: 'institutional buying', weight: 0.85 },
  { phrase: 'institutional adoption', weight: 0.8 },
  { phrase: 'treasury purchase', weight: 0.8 },
  { phrase: 'buys bitcoin', weight: 0.75 },
  { phrase: 'adds to holdings', weight: 0.7 },

  // Price action
  { phrase: 'all-time high', weight: 0.8 },
  { phrase: 'record high', weight: 0.8 },
  { phrase: 'breaks resistance', weight: 0.7 },
  { phrase: 'bullish breakout', weight: 0.75 },
  { phrase: 'breakout', weight: 0.5 },
  { phrase: 'rally', weight: 0.55 },
  { phrase: 'surge', weight: 0.6 },
  { phrase: 'soars', weight: 0.65 },
  { phrase: 'jumps', weight: 0.5 },
  { phrase: 'climbs', weight: 0.45 },
  { phrase: 'rebound', weight: 0.5 },
  { phrase: 'recovery', weight: 0.45 },

  // Macro tailwinds
  { phrase: 'rate cut', weight: 0.8 },
  { phrase: 'dovish', weight: 0.7 },
  { phrase: 'quantitative easing', weight: 0.75 },
  { phrase: 'liquidity injection', weight: 0.7 },
  { phrase: 'inflation cools', weight: 0.65 },
  { phrase: 'inflation eases', weight: 0.65 },
  { phrase: 'weaker dollar', weight: 0.6 },
  { phrase: 'dollar weakens', weight: 0.6 },

  // Protocol / fundamentals
  { phrase: 'mainnet launch', weight: 0.6 },
  { phrase: 'successful upgrade', weight: 0.65 },
  { phrase: 'partnership', weight: 0.5 },
  { phrase: 'integration', weight: 0.45 },
  { phrase: 'bullish', weight: 0.6 },
  { phrase: 'optimistic', weight: 0.45 },
];

/**
 * Bearish phrases. Note: bare regulator names (`sec`, `cftc`) are deliberately
 * ABSENT — a regulator appearing in a headline says nothing about direction.
 * Only outcome-bearing regulatory phrases are scored.
 */
const BEARISH_PHRASES: WeightedPhrase[] = [
  // Security incidents (highest conviction, immediate)
  { phrase: 'exploit', weight: 1.0 },
  { phrase: 'hacked', weight: 1.0 },
  { phrase: 'hack', weight: 0.95 },
  { phrase: 'stolen', weight: 0.9 },
  { phrase: 'drained', weight: 0.9 },
  { phrase: 'rug pull', weight: 0.95 },
  { phrase: 'security breach', weight: 0.95 },
  { phrase: 'vulnerability', weight: 0.6 },

  // Regulatory outcomes
  { phrase: 'sec sues', weight: 0.95 },
  { phrase: 'sec charges', weight: 0.9 },
  { phrase: 'lawsuit filed', weight: 0.8 },
  { phrase: 'enforcement action', weight: 0.85 },
  { phrase: 'etf denied', weight: 0.95 },
  { phrase: 'etf rejected', weight: 0.95 },
  { phrase: 'banned', weight: 0.9 },
  { phrase: 'crackdown', weight: 0.85 },
  { phrase: 'subpoena', weight: 0.7 },
  { phrase: 'investigation', weight: 0.55 },
  { phrase: 'fined', weight: 0.7 },
  { phrase: 'sanctions', weight: 0.75 },
  { phrase: 'delisting', weight: 0.8 },
  { phrase: 'money laundering', weight: 0.75 },

  // Capital flow
  { phrase: 'etf outflow', weight: 0.85 },
  { phrase: 'net outflow', weight: 0.8 },
  { phrase: 'record outflow', weight: 0.9 },
  { phrase: 'capitulation', weight: 0.85 },
  { phrase: 'whale dumping', weight: 0.8 },
  { phrase: 'sells bitcoin', weight: 0.7 },

  // Price action
  { phrase: 'liquidation cascade', weight: 0.95 },
  { phrase: 'flash crash', weight: 0.95 },
  { phrase: 'crash', weight: 0.85 },
  { phrase: 'collapse', weight: 0.85 },
  { phrase: 'plunge', weight: 0.75 },
  { phrase: 'plummet', weight: 0.75 },
  { phrase: 'sell-off', weight: 0.65 },
  { phrase: 'selloff', weight: 0.65 },
  { phrase: 'dumps', weight: 0.7 },
  { phrase: 'slumps', weight: 0.6 },
  { phrase: 'tumbles', weight: 0.65 },
  { phrase: 'breaks support', weight: 0.75 },
  { phrase: 'bearish breakdown', weight: 0.8 },
  { phrase: 'death cross', weight: 0.7 },
  { phrase: 'correction', weight: 0.45 },
  { phrase: 'pullback', weight: 0.4 },

  // Macro headwinds
  { phrase: 'rate hike', weight: 0.8 },
  { phrase: 'raise rates', weight: 0.8 },
  { phrase: 'hawkish', weight: 0.7 },
  { phrase: 'quantitative tightening', weight: 0.75 },
  { phrase: 'inflation rises', weight: 0.65 },
  { phrase: 'hot inflation', weight: 0.7 },
  { phrase: 'rising yields', weight: 0.65 },
  { phrase: 'yields climb', weight: 0.6 },
  { phrase: 'stronger dollar', weight: 0.6 },
  { phrase: 'dollar strengthens', weight: 0.6 },
  { phrase: 'recession', weight: 0.7 },
  { phrase: 'bear market', weight: 0.7 },

  // Sentiment
  { phrase: 'bearish', weight: 0.6 },
  { phrase: 'panic', weight: 0.75 },
  { phrase: 'fear', weight: 0.5 },
  { phrase: 'uncertainty', weight: 0.4 },
];

/**
 * Negation cues. When one of these appears within NEGATION_WINDOW characters
 * BEFORE a matched phrase, that phrase's contribution is inverted.
 *
 * Real example this fixes:
 *   "sell-off points to thin volume, NOT panic selling"
 *   -> without negation: -0.5 (wrong, doubly penalised)
 *   -> with negation: "panic" is negated, only "sell-off" scores
 */
const NEGATION_CUES = [
  'not ',
  "n't ",
  'no ',
  'never ',
  'without ',
  'denies ',
  'denied ',
  'rejects ',
  'rejected ',
  'dismisses ',
  'dismissed ',
  'avoids ',
  'avoided ',
  'unlikely ',
  'far from ',
  'rather than ',
  'instead of ',
  'despite ',
  'contrary to ',
  'no evidence of ',
  'fails to ',
  'failed to ',
  'stops short of ',
];

/** How far back (in characters) to look for a negation cue. */
const NEGATION_WINDOW = 45;

/**
 * Hedging cues. These reduce confidence — the article is speculating,
 * not reporting. "Bitcoin MAY find a bottom" is weaker than "Bitcoin FOUND a bottom".
 */
const HEDGE_CUES = [
  'may ',
  'might ',
  'could ',
  'possibly ',
  'potentially ',
  'appears to ',
  'seems to ',
  'analysts say',
  'analysts expect',
  'predicts ',
  'forecast',
  'speculation',
  'rumor',
  'rumour',
  'reportedly',
  'if ',
  'expected to ',
];

/** Result of deterministic sentiment analysis on a single article. */
export interface LexiconSentiment {
  /** Direction and strength in [-1..1]. 0 means no directional evidence found. */
  score: number;
  /** Absolute magnitude of the strongest signal found, in [0..1]. */
  impactMagnitude: number;
  /** Confidence in [0..1] — lowered by hedging, raised by multiple agreeing signals. */
  confidence: number;
  /** Phrases that fired, for auditability. */
  matchedPhrases: string[];
  /** Whether hedging language was detected. */
  isHedged: boolean;
  /** Number of phrases whose sign was flipped by a negation cue. */
  negatedCount: number;
}

/**
 * Check whether a negation cue appears shortly before `index` in `text`.
 */
function isNegated(text: string, index: number): boolean {
  const windowStart = Math.max(0, index - NEGATION_WINDOW);
  const window = text.slice(windowStart, index);
  return NEGATION_CUES.some((cue) => window.includes(cue));
}

/**
 * Detect hedging/speculative framing anywhere in the text.
 */
function detectHedging(text: string): boolean {
  return HEDGE_CUES.some((cue) => text.includes(cue));
}

/**
 * Score a single directional phrase list against text, honouring negation.
 * Returns the accumulated weight and the phrases that fired.
 */
function scorePhrases(
  text: string,
  phrases: WeightedPhrase[]
): { total: number; negatedTotal: number; matched: string[]; negated: number } {
  let total = 0;
  let negatedTotal = 0;
  let negated = 0;
  const matched: string[] = [];

  for (const { phrase, weight } of phrases) {
    const index = text.indexOf(phrase);
    if (index === -1) continue;

    if (isNegated(text, index)) {
      // A negated bullish phrase contributes bearishly (and vice versa),
      // but at reduced weight — negation is weaker evidence than assertion.
      negatedTotal += weight * 0.5;
      negated += 1;
      matched.push(`!${phrase}`);
    } else {
      total += weight;
      matched.push(phrase);
    }
  }

  return { total, negatedTotal, matched, negated };
}

/**
 * Deterministic, negation-aware, magnitude-preserving sentiment analysis.
 *
 * Design notes:
 *  - Direction comes from the NET of bullish vs bearish evidence.
 *  - Magnitude is the strongest single signal, not the sum — one confirmed hack
 *    matters more than five mild adjectives.
 *  - Saturating normalisation (x / (x + k)) keeps long articles from
 *    automatically pegging to ±1.
 */
export function analyzeSentimentDeterministic(title: string, summary: string): LexiconSentiment {
  const text = `${title || ''} ${summary || ''}`.toLowerCase().trim();

  if (!text) {
    return {
      score: 0,
      impactMagnitude: 0,
      confidence: 0,
      matchedPhrases: [],
      isHedged: false,
      negatedCount: 0,
    };
  }

  const bull = scorePhrases(text, BULLISH_PHRASES);
  const bear = scorePhrases(text, BEARISH_PHRASES);

  // Negated bullish evidence pushes bearish, and vice versa.
  const bullishTotal = bull.total + bear.negatedTotal;
  const bearishTotal = bear.total + bull.negatedTotal;

  const net = bullishTotal - bearishTotal;
  const gross = bullishTotal + bearishTotal;

  if (gross === 0) {
    return {
      score: 0,
      impactMagnitude: 0,
      confidence: 0,
      matchedPhrases: [],
      isHedged: detectHedging(text),
      negatedCount: 0,
    };
  }

  // Saturating normalisation: k=2.0 means net evidence of 2.0 maps to ~0.5.
  const SATURATION_K = 2.0;
  const rawScore = net / (Math.abs(net) + SATURATION_K);

  // Magnitude = strongest single phrase weight found on either side.
  const allWeights = [
    ...BULLISH_PHRASES.filter((p) => text.includes(p.phrase)).map((p) => p.weight),
    ...BEARISH_PHRASES.filter((p) => text.includes(p.phrase)).map((p) => p.weight),
  ];
  const impactMagnitude = allWeights.length > 0 ? Math.max(...allWeights) : 0;

  const isHedged = detectHedging(text);
  const matchedCount = bull.matched.length + bear.matched.length;

  // Confidence rises with agreeing evidence, falls with hedging and with
  // conflicting signals (high gross but low |net| = mixed article).
  const agreementRatio = Math.abs(net) / gross; // 1 = unanimous, 0 = perfectly conflicted
  let confidence = Math.min(1, (matchedCount / 4) * 0.5 + agreementRatio * 0.5);
  if (isHedged) confidence *= 0.6;

  const score = isHedged ? rawScore * 0.7 : rawScore;

  return {
    score: Number(Math.max(-1, Math.min(1, score)).toFixed(3)),
    impactMagnitude: Number(impactMagnitude.toFixed(3)),
    confidence: Number(confidence.toFixed(3)),
    matchedPhrases: [...bull.matched, ...bear.matched],
    isHedged,
    negatedCount: bull.negated + bear.negated,
  };
}

/**
 * Time-decay multiplier for news freshness.
 *
 * Uses exponential decay with a configurable half-life. Breaking news decays
 * fast (a 6h-old "hack" headline is already priced in); background/macro
 * analysis decays slowly (a Fed policy shift stays relevant for days).
 *
 * @param publishedAt ISO timestamp string
 * @param halfLifeHours hours after which weight halves
 * @param nowMs optional injected clock for deterministic tests
 * @returns multiplier in (0..1]; 1.0 when the article is brand new
 */
export function computeTimeDecay(
  publishedAt: string | undefined,
  halfLifeHours: number,
  nowMs: number = Date.now()
): number {
  if (!publishedAt) return 0.5; // unknown age -> neutral-ish penalty, never invented as fresh

  const publishedMs = new Date(publishedAt).getTime();
  if (!Number.isFinite(publishedMs)) return 0.5;

  const ageHours = Math.max(0, (nowMs - publishedMs) / 3_600_000);
  const decay = Math.pow(0.5, ageHours / halfLifeHours);

  return Number(Math.max(0.01, Math.min(1, decay)).toFixed(4));
}

/** Half-life in hours per news category. Breaking news goes stale fastest. */
export const CATEGORY_HALF_LIFE_HOURS: Record<string, number> = {
  breaking: 4,
  market: 8,
  regulatory: 36,
  macro: 48,
  protocol: 24,
  general: 12,
};

/**
 * Resolve the half-life for a category, defaulting to the `general` bucket.
 */
export function halfLifeForCategory(category: string | undefined): number {
  if (!category) return CATEGORY_HALF_LIFE_HOURS.general;
  return CATEGORY_HALF_LIFE_HOURS[category] ?? CATEGORY_HALF_LIFE_HOURS.general;
}
