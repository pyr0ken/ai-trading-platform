/**
 * Intel Enricher — OPTIONAL LLM layer on top of deterministic ranking.
 *
 * THE ARCHITECTURAL RULE THIS ENFORCES
 * ------------------------------------
 * Measured from logs/news-intelligence/: the existing Stage-1 LLM fails 67% of
 * the time (14 of 21 runs). A naive multi-LLM chain multiplies that failure
 * rate — two chained layers at 33% success each succeed together only ~11% of
 * the time.
 *
 * So this layer is strictly additive. It NEVER gates, filters, or reorders the
 * deterministic output. On any failure — timeout, HTTP error, malformed JSON,
 * hallucinated item ids — it returns the input unchanged. The caller cannot
 * tell the difference between "LLM was never configured" and "LLM died", and
 * in both cases the trader still gets the full deterministic ranking.
 *
 * WHAT IT ADDS WHEN IT WORKS
 * --------------------------
 * 1. `interpretation` — what the item actually means for the asset, including
 *    sarcasm and implication that keyword matching cannot see.
 * 2. `directionHint` — BULLISH / BEARISH / NEUTRAL per item.
 * 3. `narrative` — one paragraph tying the items together.
 *
 * COST CONTROL
 * ------------
 * Only the top N already-ranked items are sent (default 5), not the whole
 * feed. The deterministic scorer does the expensive filtering for free.
 */

import { IntelItem } from './intel-aggregator';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type DirectionHint = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

/** An IntelItem plus the fields the LLM may add. */
export interface EnrichedIntelItem extends IntelItem {
  interpretation?: string;
  directionHint?: DirectionHint;
}

export interface EnrichmentResult {
  items: EnrichedIntelItem[];
  /** Cross-item synthesis. Empty string when enrichment did not run. */
  narrative: string;
  /** True only when the LLM ran AND returned usable content. */
  enriched: boolean;
  /** Why enrichment did not happen, for logging. Null on success. */
  skipReason: string | null;
}

export interface EnrichOptions {
  /** Hard wall-clock budget. Past this the deterministic result is used. */
  timeoutMs?: number;
  /** How many top-ranked items to send. */
  maxItems?: number;
  /** Override the endpoint; defaults to the same base URL as news intelligence. */
  baseUrl?: string;
  /** Override the model id. */
  model?: string;
  /** Injectable fetch, for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Default timeout.
 *
 * Deliberately tight. This layer is a bonus; the analysis pipeline must not
 * stall waiting for it. 8s is roughly 2x the observed p50 latency of the
 * existing brief call, so a healthy model comfortably finishes while a
 * degraded one is cut off fast.
 */
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_ITEMS = 5;

const LLM_BASE_URL =
  process.env.NEXT_PUBLIC_LLM_BASE_URL ||
  process.env.LLM_BASE_URL ||
  'http://localhost:1234/v1';

const LLM_MODEL = process.env.NEXT_PUBLIC_LLM_MODEL || process.env.LLM_MODEL || 'local-model';

/* ------------------------------------------------------------------ *
 * Prompt construction
 * ------------------------------------------------------------------ */

function buildSystemPrompt(): string {
  return [
    'You are a market intelligence analyst. You receive pre-filtered news and social posts',
    'that a deterministic scorer already judged relevant to one trading symbol.',
    '',
    'Your job is interpretation, NOT filtering. For each item explain what it means for the',
    'asset in one sentence, and give a direction. Read implication and sarcasm: "great, another',
    '\'temporary\' halt" is bearish despite the positive words.',
    '',
    'Respond with STRICT JSON only, no prose and no code fences:',
    '{',
    '  "items": [{ "id": "<echo the id exactly>", "interpretation": "<one sentence>",',
    '              "direction": "BULLISH" | "BEARISH" | "NEUTRAL" }],',
    '  "narrative": "<2-3 sentences tying the items together>"',
    '}',
    '',
    'Rules:',
    '- Echo each id EXACTLY as given. Never invent ids.',
    '- If an item is genuinely ambiguous, use NEUTRAL. Do not guess.',
    '- Ground every claim in the supplied text. Never add outside facts.',
  ].join('\n');
}

function buildUserPrompt(items: IntelItem[], symbol: string): string {
  const lines = items.map((item, i) => {
    const age = item.publishedAt ? ` | published ${item.publishedAt}` : '';
    const rel = item.relevance !== undefined ? ` | relevance ${item.relevance.toFixed(2)}` : '';
    const eng = item.engagement
      ? ` | ${item.engagement.likes} likes, ${item.engagement.retweets} RT`
      : '';
    return [
      `[${i + 1}] id: ${item.id}`,
      `    source: ${item.source} (${item.kind})${rel}${age}${eng}`,
      `    text: ${item.text.slice(0, 400)}`,
    ].join('\n');
  });

  return [
    `SYMBOL UNDER ANALYSIS: ${symbol}`,
    '',
    `ITEMS (${items.length}, already ranked by relevance):`,
    ...lines,
    '',
    `Interpret each item specifically for ${symbol}. Return the JSON object described above.`,
  ].join('\n');
}

/* ------------------------------------------------------------------ *
 * Response parsing
 * ------------------------------------------------------------------ */

/** Extract the first balanced JSON object from a model response. */
function extractJsonObject(raw: string): Record<string, unknown> | null {
  if (typeof raw !== 'string') return null;

  // Strip code fences the model may add despite instructions.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const text = fenced ? fenced[1] : raw;

  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

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
        try {
          const parsed = JSON.parse(text.slice(start, i + 1));
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function coerceDirection(raw: unknown): DirectionHint | undefined {
  if (typeof raw !== 'string') return undefined;
  const upper = raw.trim().toUpperCase();
  if (upper === 'BULLISH' || upper === 'BEARISH' || upper === 'NEUTRAL') return upper;
  return undefined;
}

/**
 * Merge LLM annotations onto the deterministic items.
 *
 * Matching is by exact id against the ORIGINAL list. Any id the model invents
 * is discarded — a hallucinated item must never reach the trading prompt. The
 * returned array preserves the input order and length exactly.
 */
export function mergeEnrichment(
  original: IntelItem[],
  parsed: Record<string, unknown> | null
): { items: EnrichedIntelItem[]; narrative: string; matched: number } {
  if (!parsed) return { items: original, narrative: '', matched: 0 };

  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const byId = new Map<string, { interpretation?: string; directionHint?: DirectionHint }>();

  for (const entry of rawItems) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;

    const id = typeof rec.id === 'string' ? rec.id.trim() : '';
    if (!id) continue;

    const interpretation =
      typeof rec.interpretation === 'string' && rec.interpretation.trim()
        ? rec.interpretation.trim().slice(0, 300)
        : undefined;

    const directionHint = coerceDirection(rec.direction);
    if (!interpretation && !directionHint) continue;

    byId.set(id, { interpretation, directionHint });
  }

  let matched = 0;
  const items: EnrichedIntelItem[] = original.map((item) => {
    const hit = byId.get(item.id);
    if (!hit) return item;
    matched++;
    return { ...item, ...hit };
  });

  const narrative =
    typeof parsed.narrative === 'string' ? parsed.narrative.trim().slice(0, 800) : '';

  return { items, narrative, matched };
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Attempt to enrich ranked items with LLM interpretation.
 *
 * ALWAYS RESOLVES. Never throws, never rejects. On any failure path the
 * original items come back untouched with `enriched: false` and a populated
 * `skipReason`.
 */
export async function enrichIntel(
  items: IntelItem[],
  symbol: string,
  options: EnrichOptions = {}
): Promise<EnrichmentResult> {
  const passthrough = (reason: string): EnrichmentResult => ({
    items,
    narrative: '',
    enriched: false,
    skipReason: reason,
  });

  if (!Array.isArray(items) || items.length === 0) {
    return passthrough('no items to enrich');
  }
  if (!symbol || typeof symbol !== 'string') {
    return passthrough('no symbol supplied');
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const baseUrl = options.baseUrl ?? LLM_BASE_URL;
  const model = options.model ?? LLM_MODEL;
  const doFetch = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);

  if (!doFetch) return passthrough('fetch unavailable in this runtime');

  // Only the strongest items are worth the tokens; the scorer already ranked them.
  const subset = items.slice(0, maxItems);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await doFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(subset, symbol) },
        ],
        temperature: 0.1,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return passthrough(`LLM HTTP ${res.status}`);

    const data = await res.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return passthrough('LLM returned empty content');
    }

    const parsed = extractJsonObject(content);
    if (!parsed) return passthrough('LLM output was not parseable JSON');

    // Merge against the FULL list so items beyond maxItems survive unchanged.
    const { items: merged, narrative, matched } = mergeEnrichment(items, parsed);

    // Zero matches means the model echoed nothing we recognise. Treat the whole
    // pass as failed rather than shipping an empty narrative as if it were real.
    if (matched === 0 && !narrative) {
      return passthrough('LLM returned no recognisable item ids');
    }

    return { items: merged, narrative, enriched: true, skipReason: null };
  } catch (err) {
    const isAbort = (err as Error)?.name === 'AbortError';
    return passthrough(isAbort ? `LLM timed out after ${timeoutMs}ms` : 'LLM request failed');
  } finally {
    clearTimeout(timer);
  }
}
