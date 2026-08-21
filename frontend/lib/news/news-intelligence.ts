/**
 * News Intelligence Service — Two-Stage Analysis Layer
 *
 * STAGE 1 (this file): analyse ALL fetched articles ONCE per cache window and
 * produce a structured `NewsIntelligenceBrief`. The expensive LLM pass is
 * amortised across every symbol and every request inside that window, so it
 * never sits on the critical path of an individual trade analysis.
 *
 * STAGE 2 (institutional-prompt.ts): the main analyst model receives the brief
 * already filtered down to the traded symbol, alongside candle data.
 *
 * Reliability contract:
 *  - The LLM pass is ALWAYS optional. On timeout, network failure, malformed
 *    JSON, or schema violation we fall back to the deterministic lexicon brief
 *    and flag `isFallback: true`. The system never blocks and never goes blind.
 *  - ZERO-FABRICATION: no invented headlines, no invented sentiment. When there
 *    are no articles we return an empty brief and the prompt renders
 *    "N/A (Data Unavailable)".
 */

import {
  NewsArticle,
  NewsIntelligenceBrief,
  SymbolNewsContext,
  SymbolRankedArticle,
  AssetImpact,
  ArticleImpact,
  RegimeBias,
  ImpactDirection,
  TimeSensitivity,
  MacroDriver,
  EventRisk,
} from '@/types/news';
import { NewsService } from './news-service';
import {
  analyzeSentimentDeterministic,
  computeTimeDecay,
  halfLifeForCategory,
} from './news-lexicon';
import {
  scoreArticleRelevance,
  extractBaseAsset,
  MIN_EFFECTIVE_WEIGHT,
} from './news-relevance';
import { logNewsBrief } from './news-brief-logger';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://127.0.0.1:20128/v1';
const LLM_MODEL = process.env.NEWS_LLM_MODEL || process.env.LLM_MODEL || 'hermes';

/**
 * Runtime-resolved configuration.
 *
 * These are read on every access rather than captured at module load so that
 * env changes (tests, hot reload, ops toggles) take effect without a restart.
 * Module-level capture silently ignored `NEWS_LLM_ENABLED=false` set after
 * import, which made the kill-switch unusable.
 */
const config = {
  /** How long a generated brief stays valid. News does not move that fast. */
  get briefTtlMs(): number {
    return Number(process.env.NEWS_BRIEF_TTL_MS || 8 * 60_000);
  },
  /** Hard ceiling on the Stage-1 LLM call. Exceeding this triggers fallback. */
  get llmTimeoutMs(): number {
    return Number(process.env.NEWS_LLM_TIMEOUT_MS || 20_000);
  },
  /** How many articles to feed the intelligence pass. */
  get articlesForBrief(): number {
    return Number(process.env.NEWS_BRIEF_ARTICLE_COUNT || 20);
  },
  /** How many ranked articles to surface in the final prompt per symbol. */
  get maxPromptArticles(): number {
    return Number(process.env.NEWS_PROMPT_ARTICLE_COUNT || 6);
  },
  /** Set NEWS_LLM_ENABLED=false to run deterministic-only (no Stage-1 LLM call). */
  get llmEnabled(): boolean {
    return process.env.NEWS_LLM_ENABLED !== 'false';
  },
};

interface CachedBrief {
  brief: NewsIntelligenceBrief;
  articles: NewsArticle[];
  generatedAtMs: number;
}

/* ------------------------------------------------------------------ *
 * Schema validation helpers — never trust LLM output shape.
 * ------------------------------------------------------------------ */

const VALID_BIAS: RegimeBias[] = ['RISK_ON', 'RISK_OFF', 'NEUTRAL'];
const VALID_DIRECTION: ImpactDirection[] = ['BULLISH', 'BEARISH', 'NEUTRAL'];
const VALID_SENSITIVITY: TimeSensitivity[] = ['IMMEDIATE', 'HOURS', 'DAYS', 'BACKGROUND'];

function asFiniteNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asBias(value: unknown): RegimeBias {
  const s = asString(value).toUpperCase();
  return (VALID_BIAS as string[]).includes(s) ? (s as RegimeBias) : 'NEUTRAL';
}

function asDirection(value: unknown): ImpactDirection {
  const s = asString(value).toUpperCase();
  return (VALID_DIRECTION as string[]).includes(s) ? (s as ImpactDirection) : 'NEUTRAL';
}

function asSensitivity(value: unknown): TimeSensitivity {
  const s = asString(value).toUpperCase();
  return (VALID_SENSITIVITY as string[]).includes(s) ? (s as TimeSensitivity) : 'BACKGROUND';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => asString(v).toUpperCase())
    .filter((v) => v.length > 0 && v.length <= 12);
}

/**
 * Extract the first balanced JSON object from raw LLM text.
 * Handles ```json fences, leading prose, and trailing commentary.
 */
function extractJsonObject(raw: string): unknown | null {
  if (!raw) return null;

  // Strip code fences if present.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;

  const start = candidate.indexOf('{');
  if (start === -1) return null;

  // Walk forward tracking brace depth, ignoring braces inside strings.
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

/**
 * Coerce arbitrary parsed JSON into a valid NewsIntelligenceBrief.
 * Any field that fails validation is replaced with a safe default rather than
 * throwing — a partially-usable brief beats no brief.
 */
function coerceBrief(
  parsed: unknown,
  articles: NewsArticle[],
  generatedAt: string
): NewsIntelligenceBrief {
  const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  const knownIds = new Set(articles.map((a) => a.articleId).filter(Boolean) as string[]);

  const macroDrivers: MacroDriver[] = Array.isArray(obj.macroDrivers)
    ? obj.macroDrivers
        .slice(0, 6)
        .map((d) => {
          const o = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
          return {
            driver: asString(o.driver, 'Unspecified driver'),
            direction: asDirection(o.direction),
            weight: clamp(Math.round(asFiniteNumber(o.weight, 0)), 0, 100),
            horizon: asString(o.horizon, 'unknown'),
          };
        })
        .filter((d) => d.driver !== 'Unspecified driver')
    : [];

  const assetImpacts: AssetImpact[] = Array.isArray(obj.assetImpacts)
    ? obj.assetImpacts
        .slice(0, 12)
        .map((a) => {
          const o = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
          return {
            asset: asString(o.asset).toUpperCase(),
            impact: asDirection(o.impact),
            magnitude: clamp(Math.round(asFiniteNumber(o.magnitude, 0)), 0, 100),
            rationale: asString(o.rationale, 'No rationale supplied'),
          };
        })
        .filter((a) => a.asset.length > 0 && a.asset.length <= 12)
    : [];

  const eventRisks: EventRisk[] = Array.isArray(obj.eventRisks)
    ? obj.eventRisks
        .slice(0, 6)
        .map((e) => {
          const o = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
          return {
            event: asString(o.event),
            whenUtc: asString(o.whenUtc, 'unspecified'),
            ifPassed: asString(o.ifPassed, 'unspecified'),
            ifFailed: asString(o.ifFailed, 'unspecified'),
          };
        })
        .filter((e) => e.event.length > 0)
    : [];

  // Only keep per-article verdicts whose IDs we actually sent — this blocks
  // hallucinated article references from entering the pipeline.
  const articleImpacts: ArticleImpact[] = Array.isArray(obj.articles)
    ? obj.articles
        .map((a) => {
          const o = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
          return {
            articleId: asString(o.articleId),
            trueSentiment: clamp(asFiniteNumber(o.trueSentiment, 0), -1, 1),
            impactScore: clamp(Math.round(asFiniteNumber(o.impactScore, 0)), 0, 100),
            affectedAssets: asStringArray(o.affectedAssets),
            timeSensitivity: asSensitivity(o.timeSensitivity),
          };
        })
        .filter((a) => a.articleId.length > 0 && knownIds.has(a.articleId))
    : [];

  return {
    aggregateBias: asBias(obj.aggregateBias),
    biasConfidence: clamp(Math.round(asFiniteNumber(obj.biasConfidence, 0)), 0, 100),
    macroDrivers,
    assetImpacts,
    eventRisks,
    articleImpacts,
    generatedAt,
    isFallback: false,
    sourceArticleCount: articles.length,
  };
}

/* ------------------------------------------------------------------ *
 * Deterministic fallback brief — the safety net.
 * ------------------------------------------------------------------ */

/**
 * Build a brief using only the deterministic lexicon. Used when the Stage-1
 * LLM call is disabled, unreachable, slow, or returns unusable output.
 *
 * The output is intentionally conservative: it reports aggregate direction and
 * per-article sentiment but claims no macro reasoning it cannot justify.
 */
function buildFallbackBrief(articles: NewsArticle[], generatedAt: string): NewsIntelligenceBrief {
  const nowMs = Date.parse(generatedAt) || Date.now();

  const articleImpacts: ArticleImpact[] = articles.map((a) => {
    const lex = analyzeSentimentDeterministic(a.title, a.summary);
    const decay = computeTimeDecay(a.published_at, halfLifeForCategory(a.category), nowMs);
    const sensitivity: TimeSensitivity =
      a.category === 'breaking'
        ? 'IMMEDIATE'
        : a.category === 'market'
          ? 'HOURS'
          : a.category === 'macro' || a.category === 'regulatory'
            ? 'DAYS'
            : 'BACKGROUND';

    return {
      articleId: a.articleId || '',
      trueSentiment: lex.score,
      impactScore: Math.round(clamp(lex.impactMagnitude * 100 * decay, 0, 100)),
      affectedAssets: [],
      timeSensitivity: sensitivity,
    };
  });

  // Freshness- and magnitude-weighted aggregate direction.
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const impact = articleImpacts[i];
    const decay = computeTimeDecay(a.published_at, halfLifeForCategory(a.category), nowMs);
    const w = Math.max(0.01, impact.impactScore / 100) * decay;
    weightedSum += impact.trueSentiment * w;
    weightTotal += w;
  }
  const aggregate = weightTotal > 0 ? weightedSum / weightTotal : 0;

  const bias: RegimeBias =
    aggregate > 0.12 ? 'RISK_ON' : aggregate < -0.12 ? 'RISK_OFF' : 'NEUTRAL';

  // Confidence scales with how much evidence we actually had.
  const evidenceRatio = articles.length > 0 ? Math.min(1, weightTotal / articles.length) : 0;
  const biasConfidence = Math.round(clamp(Math.abs(aggregate) * 100 * evidenceRatio, 0, 60));

  return {
    aggregateBias: bias,
    biasConfidence,
    macroDrivers: [],
    assetImpacts: [],
    eventRisks: [],
    articleImpacts,
    generatedAt,
    isFallback: true,
    sourceArticleCount: articles.length,
  };
}

/** Empty brief for the genuine no-data case. */
function buildEmptyBrief(generatedAt: string): NewsIntelligenceBrief {
  return {
    aggregateBias: 'NEUTRAL',
    biasConfidence: 0,
    macroDrivers: [],
    assetImpacts: [],
    eventRisks: [],
    articleImpacts: [],
    generatedAt,
    isFallback: true,
    sourceArticleCount: 0,
  };
}

/* ------------------------------------------------------------------ *
 * Stage-1 prompt construction.
 * ------------------------------------------------------------------ */

function buildBriefSystemPrompt(): string {
  return `You are a macro research analyst at a crypto trading desk. You read raw news and output ONLY a strict JSON object describing the current market regime.

RULES:
1. Output ONLY the JSON object. No prose, no markdown fences, no commentary.
2. Ground every claim in the supplied articles. NEVER invent events, numbers, or headlines.
3. Correct naive sentiment: "sell-off is thin volume, NOT panic" is mildly bearish, not catastrophic. "SEC approves ETF" is bullish despite containing "SEC".
4. Separate DIRECTION from MAGNITUDE. A confirmed exploit and a speculative opinion piece can share a sign but never a magnitude.
5. Distinguish reported FACTS from ANALYST SPECULATION. Hedged forecasts ("may", "could") get lower impactScore.
6. Only list an asset in assetImpacts if the articles give real evidence for it.
7. Use the exact articleId values supplied. Do not invent IDs.

SCHEMA:
{
  "aggregateBias": "RISK_ON" | "RISK_OFF" | "NEUTRAL",
  "biasConfidence": 0-100,
  "macroDrivers": [{ "driver": string, "direction": "BULLISH"|"BEARISH"|"NEUTRAL", "weight": 0-100, "horizon": string }],
  "assetImpacts": [{ "asset": string, "impact": "BULLISH"|"BEARISH"|"NEUTRAL", "magnitude": 0-100, "rationale": string }],
  "eventRisks": [{ "event": string, "whenUtc": string, "ifPassed": string, "ifFailed": string }],
  "articles": [{ "articleId": string, "trueSentiment": -1..1, "impactScore": 0-100, "affectedAssets": [string], "timeSensitivity": "IMMEDIATE"|"HOURS"|"DAYS"|"BACKGROUND" }]
}`;
}

function buildBriefUserPrompt(articles: NewsArticle[], nowIso: string): string {
  const lines = articles.map((a, i) => {
    const lex = analyzeSentimentDeterministic(a.title, a.summary);
    const ageHours = a.published_at
      ? ((Date.parse(nowIso) - Date.parse(a.published_at)) / 3_600_000).toFixed(1)
      : 'unknown';

    return [
      `[${i + 1}] id=${a.articleId || 'MISSING'}`,
      `    source=${a.source} category=${a.category || 'general'} age=${ageHours}h`,
      `    title: ${a.title}`,
      `    summary: ${a.summary || '(none)'}`,
      `    lexicon_hint: score=${lex.score} magnitude=${lex.impactMagnitude} hedged=${lex.isHedged} negations=${lex.negatedCount}`,
    ].join('\n');
  });

  return `CURRENT UTC TIME: ${nowIso}
ARTICLE COUNT: ${articles.length}

The lexicon_hint values come from a keyword engine and may be WRONG. Use them only as a starting point; your reading of the text is authoritative.

ARTICLES:
${lines.join('\n\n')}

Output the JSON object now.`;
}

/* ------------------------------------------------------------------ *
 * The service.
 * ------------------------------------------------------------------ */

export class NewsIntelligenceService {
  private static cached: CachedBrief | null = null;
  private static inFlight: Promise<CachedBrief> | null = null;

  /**
   * Get (or generate) the current shared brief.
   * Concurrent callers share one in-flight generation — no thundering herd.
   */
  private static async getBrief(): Promise<CachedBrief> {
    const now = Date.now();

    if (this.cached && now - this.cached.generatedAtMs < config.briefTtlMs) {
      return this.cached;
    }
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = (async () => {
      try {
        const result = await this.generateBrief();
        this.cached = result;
        return result;
      } catch (err) {
        // Absolute last resort: an empty brief so callers still get a shape.
        console.error('[NewsIntelligence] Brief generation failed entirely:', err);
        const generatedAt = new Date().toISOString();
        const fallback: CachedBrief = {
          brief: buildEmptyBrief(generatedAt),
          articles: [],
          generatedAtMs: Date.now(),
        };
        this.cached = fallback;
        return fallback;
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  /**
   * Fetch articles then run Stage-1 analysis, falling back to deterministic
   * output on any LLM problem.
   */
  private static async generateBrief(): Promise<CachedBrief> {
    const generatedAt = new Date().toISOString();
    const articles = await NewsService.getArticles();
    const selected = articles.slice(0, config.articlesForBrief);

    if (selected.length === 0) {
      return {
        brief: buildEmptyBrief(generatedAt),
        articles: [],
        generatedAtMs: Date.now(),
      };
    }

    let brief = buildFallbackBrief(selected, generatedAt);

    if (config.llmEnabled) {
      const llmBrief = await this.runLlmPass(selected, generatedAt);
      if (llmBrief) {
        // Merge: keep deterministic per-article entries for any article the
        // LLM skipped, so no article silently loses its sentiment.
        const llmIds = new Set(llmBrief.articleImpacts.map((a) => a.articleId));
        const merged = [
          ...llmBrief.articleImpacts,
          ...brief.articleImpacts.filter((a) => a.articleId && !llmIds.has(a.articleId)),
        ];
        brief = { ...llmBrief, articleImpacts: merged };
      }
    }

    // Audit trail — mirrors the llm-prompts logging pattern. Never fatal.
    try {
      await logNewsBrief(brief, selected);
    } catch (logErr) {
      console.error('[NewsIntelligence] Failed to log brief:', logErr);
    }

    return { brief, articles: selected, generatedAtMs: Date.now() };
  }

  /**
   * Single Stage-1 LLM call. Returns null on ANY failure so the caller can
   * keep the deterministic brief.
   */
  private static async runLlmPass(
    articles: NewsArticle[],
    generatedAt: string
  ): Promise<NewsIntelligenceBrief | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.llmTimeoutMs);

    try {
      const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            { role: 'system', content: buildBriefSystemPrompt() },
            { role: 'user', content: buildBriefUserPrompt(articles, generatedAt) },
          ],
          temperature: 0.1,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn(`[NewsIntelligence] LLM returned HTTP ${res.status}; using deterministic brief.`);
        return null;
      }

      const data = await res.json();
      const content: unknown = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        console.warn('[NewsIntelligence] LLM returned empty content; using deterministic brief.');
        return null;
      }

      const parsed = extractJsonObject(content);
      if (!parsed) {
        console.warn('[NewsIntelligence] Could not parse JSON from LLM output; using deterministic brief.');
        return null;
      }

      const brief = coerceBrief(parsed, articles, generatedAt);

      // Sanity gate: a brief with no usable content is worse than the
      // deterministic one, which at least carries per-article sentiment.
      const hasSubstance =
        brief.macroDrivers.length > 0 ||
        brief.assetImpacts.length > 0 ||
        brief.articleImpacts.length > 0;

      if (!hasSubstance) {
        console.warn('[NewsIntelligence] LLM brief had no usable content; using deterministic brief.');
        return null;
      }

      return brief;
    } catch (err) {
      const isAbort = (err as Error)?.name === 'AbortError';
      console.warn(
        `[NewsIntelligence] LLM pass ${isAbort ? 'timed out' : 'failed'}; using deterministic brief.`
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Build the symbol-specific news context injected into the main prompt.
   *
   * @param symbol traded pair, e.g. "XAUT/USDT"
   * @param btcCorrelation Pearson correlation vs BTC, used to discount
   *        Bitcoin-driven news for weakly-correlated assets. Pass 1.0 for BTC.
   */
  public static async getSymbolNewsContext(
    symbol: string,
    btcCorrelation: number
  ): Promise<SymbolNewsContext> {
    const { brief, articles } = await this.getBrief();
    const nowMs = Date.parse(brief.generatedAt) || Date.now();
    const base = extractBaseAsset(symbol);

    const impactById = new Map(brief.articleImpacts.map((a) => [a.articleId, a]));

    const ranked: SymbolRankedArticle[] = [];

    for (const article of articles) {
      const relevance = scoreArticleRelevance(article, symbol, btcCorrelation);
      const decay = computeTimeDecay(
        article.published_at,
        halfLifeForCategory(article.category),
        nowMs
      );
      const effectiveWeight = Number((relevance.score * decay).toFixed(1));

      if (effectiveWeight < MIN_EFFECTIVE_WEIGHT) continue;

      const lex = analyzeSentimentDeterministic(article.title, article.summary);
      const impact = article.articleId ? impactById.get(article.articleId) : undefined;

      ranked.push({
        title: article.title,
        source: article.source,
        publishedAt: article.published_at,
        category: article.category,
        lexiconSentiment: lex.score,
        llmSentiment: impact && !brief.isFallback ? impact.trueSentiment : null,
        relevance: relevance.score,
        effectiveWeight,
        timeSensitivity: impact?.timeSensitivity ?? 'BACKGROUND',
        relevanceReason: relevance.reason,
      });
    }

    ranked.sort((a, b) => b.effectiveWeight - a.effectiveWeight);
    const top = ranked.slice(0, config.maxPromptArticles);

    // Weighted sentiment across the articles that reached the prompt.
    //
    // Articles with zero directional signal are EXCLUDED from the average
    // rather than counted as neutral votes. Including them dilutes genuine
    // signal toward zero: six headlines where one is clearly bearish and five
    // are factually neutral should not read as "market is neutral".
    // We still report how many carried signal so the model can judge breadth.
    let weightedSum = 0;
    let weightTotal = 0;
    let directionalCount = 0;
    for (const r of top) {
      const sentiment = r.llmSentiment ?? r.lexiconSentiment;
      if (sentiment === 0) continue;
      const w = Math.max(0.01, r.effectiveWeight / 100);
      weightedSum += sentiment * w;
      weightTotal += w;
      directionalCount += 1;
    }
    const weightedSentiment = weightTotal > 0 ? Number((weightedSum / weightTotal).toFixed(3)) : 0;

    // Direct impact entry for this asset, if the brief produced one.
    const directImpact =
      brief.assetImpacts.find((a) => a.asset === base) ??
      brief.assetImpacts.find((a) => base.includes(a.asset) || a.asset.includes(base)) ??
      null;

    // Correlation-adjusted BTC read — only meaningful for non-BTC assets.
    let correlationAdjustedBtcImpact: SymbolNewsContext['correlationAdjustedBtcImpact'] = null;
    if (base !== 'BTC' && base !== 'XBT') {
      const btcImpact = brief.assetImpacts.find((a) => a.asset === 'BTC');
      const absCorr = Math.min(1, Math.abs(btcCorrelation));
      const adjustedMagnitude = btcImpact ? Math.round(btcImpact.magnitude * absCorr) : 0;

      let verdict: string;
      if (!btcImpact) {
        verdict = 'no BTC-specific impact in brief';
      } else if (absCorr < 0.3) {
        verdict = `NEGLIGIBLE — ${base} is decoupled from BTC (corr ${btcCorrelation.toFixed(2)})`;
      } else if (absCorr < 0.6) {
        verdict = `PARTIAL — ${btcImpact.impact} at ${adjustedMagnitude}/100 after correlation scaling`;
      } else {
        verdict = `STRONG — ${btcImpact.impact} at ${adjustedMagnitude}/100, ${base} tracks BTC closely`;
      }

      correlationAdjustedBtcImpact = {
        correlation: Number(btcCorrelation.toFixed(3)),
        adjustedMagnitude,
        verdict,
      };
    }

    return {
      symbol,
      brief,
      rankedArticles: top,
      directImpact,
      correlationAdjustedBtcImpact,
      weightedSentiment,
      directionalArticleCount: directionalCount,
      totalArticlesConsidered: articles.length,
    };
  }

  /** Test/ops hook: drop the cached brief so the next call regenerates. */
  public static invalidateCache(): void {
    this.cached = null;
  }
}
