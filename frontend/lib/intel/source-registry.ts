/**
 * Source Credibility Registry
 *
 * Assigns every intelligence source a credibility weight in [0, 1]. This is
 * NOT a sentiment or direction signal — it answers a narrower question: when
 * this source says something, how much should the ranking trust it?
 *
 * WHY A SHARED SCALE
 * ------------------
 * Tweets and RSS articles arrive from different pipelines but compete for the
 * same limited slots in the model prompt. Without one common currency, a
 * throwaway tweet and a wire-service report are indistinguishable to the
 * ranker. Both are mapped onto this single 0-1 scale so they can be sorted
 * against each other honestly.
 *
 * WHAT THE WEIGHT MEANS
 * ---------------------
 * High weight = this account/outlet moves markets or reports facts that hold
 * up. A head of state announcing tariffs (0.96) genuinely reprices assets. An
 * aggregator republishing someone else's scoop (0.52) usually does not.
 *
 * High weight does NOT mean "believe the direction". A Trump tweet scores high
 * because it MATTERS, not because it is correct. Direction is decided later by
 * the model reading the text.
 */

/** Credibility tiers, ordered from most to least market-moving. */
export type SourceTier =
  | 'MACRO_SHOCK'     // Geopolitical / central-bank / regulatory — bypass keyword filter entirely
  | 'PRIMARY_MOVER'
  | 'INSTITUTIONAL'
  | 'EXCHANGE'
  | 'ONCHAIN'
  | 'SECURITY'
  | 'MEDIA'
  | 'UNKNOWN';

export interface SourceProfile {
  /** Canonical handle (tweets) or feed label (RSS), lowercased. */
  readonly id: string;
  readonly tier: SourceTier;
  /** Credibility weight in [0, 1]. */
  readonly weight: number;
  /** Short note on why this weight — keeps future edits honest. */
  readonly note: string;
}

/**
 * Weight applied to any source not in the registry.
 *
 * Deliberately low but non-zero: an unknown account saying something highly
 * relevant should still surface below known sources, not vanish. Zero would
 * make the whole item score zero regardless of content.
 */
export const UNKNOWN_SOURCE_WEIGHT = 0.35;

/**
 * Nominal centre of each tier. Individual sources deviate within their band.
 * Exposed for tests and for reasoning about new additions.
 */
export const TIER_BASELINE: Record<SourceTier, number> = {
  MACRO_SHOCK:   0.97,
  PRIMARY_MOVER: 0.94,
  INSTITUTIONAL: 0.82,
  EXCHANGE: 0.76,
  ONCHAIN: 0.72,
  SECURITY: 0.68,
  MEDIA: 0.58,
  UNKNOWN: UNKNOWN_SOURCE_WEIGHT,
};

/**
 * The registry.
 *
 * Every handle listed in x_feed_engine/config.json appears here so no
 * configured account silently falls through to the unknown default.
 */
const PROFILES: readonly SourceProfile[] = [
  // ── MACRO_SHOCK ─────────────────────────────────────────────────────────
  // These accounts bypass keyword filtering entirely. A war declaration,
  // sanctions order, or Fed rate-hike has no crypto keyword but reprices
  // gold, BTC, and risk assets within minutes. Every tweet goes into the
  // MACRO SHOCK SIGNALS block regardless of asset match.
  { id: 'realdonaldtrump',   tier: 'MACRO_SHOCK',   weight: 0.97, note: 'Head of state; tariff, sanctions, and policy posts move FX, metals, and risk assets within minutes' },
  { id: 'potus',             tier: 'MACRO_SHOCK',   weight: 0.96, note: 'Official White House account; executive orders and major policy' },
  { id: 'federalreserve',    tier: 'MACRO_SHOCK',   weight: 0.97, note: 'Fed rate decisions and forward guidance are the single largest macro driver' },
  { id: 'eucentbank',        tier: 'MACRO_SHOCK',   weight: 0.93, note: 'ECB policy shifts EUR and global risk sentiment' },
  { id: 'bankofengland',     tier: 'MACRO_SHOCK',   weight: 0.91, note: 'BoE decisions move GBP and correlate with risk appetite' },
  { id: 'secgov_official',   tier: 'MACRO_SHOCK',   weight: 0.94, note: 'ETF approvals, enforcement actions, and trading halts are legally binding and directly move crypto' },
  { id: 'cftc',              tier: 'MACRO_SHOCK',   weight: 0.90, note: 'Derivatives regulator; position limits and enforcement orders affect perp venues' },
  { id: 'un_news',           tier: 'MACRO_SHOCK',   weight: 0.88, note: 'UN Security Council resolutions and war/ceasefire declarations drive gold and safe-haven flows' },
  { id: 'reuters',           tier: 'MACRO_SHOCK',   weight: 0.87, note: 'Fastest tier-1 newswire; breaking geopolitical and macro scoops' },
  { id: 'axios',             tier: 'MACRO_SHOCK',   weight: 0.84, note: 'Fast political reporting; White House and Congress scoops' },
  { id: 'marketwatch',       tier: 'MACRO_SHOCK',   weight: 0.82, note: 'Fed, CPI, and macro data releases' },

  // ── PRIMARY_MOVER ─────────────────────────────────────────────────────
  // Individuals whose posts reprice assets directly, regardless of accuracy.
  { id: 'elonmusk',         tier: 'PRIMARY_MOVER', weight: 0.90, note: 'Demonstrated single-tweet repricing of DOGE/BTC; high noise ratio caps this below Trump' },

  // ── INSTITUTIONAL ─────────────────────────────────────────────────────
  // Regulators and asset managers. Slow but authoritative; rarely retracted.
  // secgov and cftc are covered by MACRO_SHOCK above at higher weight.
  { id: 'secgov',    tier: 'INSTITUTIONAL', weight: 0.88, note: 'SECGov — alias for scraper handle; deduped at aggregation' },
  { id: 'blackrock', tier: 'INSTITUTIONAL', weight: 0.84, note: 'Largest ETF issuer; flow announcements shift spot demand' },
  { id: 'fidelity',  tier: 'INSTITUTIONAL', weight: 0.80, note: 'Major custodian and ETF issuer' },
  { id: 'grayscale', tier: 'INSTITUTIONAL', weight: 0.76, note: 'Large trust issuer; unlock/conversion events matter' },

  // ── EXCHANGE ──────────────────────────────────────────────────────────
  // Venue operators. Authoritative on listings, halts, and outages.
  { id: 'binance', tier: 'EXCHANGE', weight: 0.80, note: 'Largest venue; listing and halt notices are actionable facts' },
  { id: 'coinbase', tier: 'EXCHANGE', weight: 0.80, note: 'Primary US venue; listings move mid-caps sharply' },
  { id: 'cz_binance', tier: 'EXCHANGE', weight: 0.78, note: 'Founder voice; historically market-moving' },
  { id: 'brian_armstrong', tier: 'EXCHANGE', weight: 0.74, note: 'Coinbase CEO; policy and product signals' },
  { id: 'krakenfx', tier: 'EXCHANGE', weight: 0.72, note: 'Established venue, lower listing impact than the top two' },
  { id: 'bybit_official', tier: 'EXCHANGE', weight: 0.70, note: 'Major derivatives venue' },

  // ── ONCHAIN ───────────────────────────────────────────────────────────
  // Flow analytics. Verifiable against the chain, hence high trust.
  { id: 'lookonchain', tier: 'ONCHAIN', weight: 0.78, note: 'Whale flow calls are independently verifiable on-chain' },
  { id: 'glassnode', tier: 'ONCHAIN', weight: 0.76, note: 'Rigorous methodology; slower cadence' },
  { id: 'arkhamintel', tier: 'ONCHAIN', weight: 0.74, note: 'Entity attribution with public evidence' },
  { id: 'nansen_ai', tier: 'ONCHAIN', weight: 0.72, note: 'Wallet labelling and smart-money flows' },
  { id: 'spotonchain', tier: 'ONCHAIN', weight: 0.70, note: 'Flow alerts; occasional false positives' },

  // ── SECURITY ──────────────────────────────────────────────────────────
  // Exploit and fraud alerts. Immediate, asset-specific downside.
  { id: 'peckshieldalert', tier: 'SECURITY', weight: 0.74, note: 'Exploit alerts are near-real-time and asset-specific' },
  { id: 'certikalert', tier: 'SECURITY', weight: 0.72, note: 'Audit-firm alerts on active incidents' },
  { id: 'zachxbt', tier: 'SECURITY', weight: 0.70, note: 'Fraud investigations; high accuracy, irregular cadence' },

  // ── MEDIA ─────────────────────────────────────────────────────────────
  // Reporting. Usually second-hand; already priced in by publication time.
  { id: 'coindesk', tier: 'MEDIA', weight: 0.64, note: 'Original reporting; occasional market-moving scoops' },
  { id: 'theblock__', tier: 'MEDIA', weight: 0.62, note: 'Institutional-leaning original reporting' },
  { id: 'the block', tier: 'MEDIA', weight: 0.62, note: 'RSS label for the same outlet as theblock__' },
  { id: 'wublockchain', tier: 'MEDIA', weight: 0.62, note: 'Fast on Asia-session news, ahead of Western outlets' },
  { id: 'cointelegraph', tier: 'MEDIA', weight: 0.56, note: 'High volume, more speculation per article' },
  { id: 'watcherguru', tier: 'MEDIA', weight: 0.54, note: 'Fast aggregator; headline-first, low original sourcing' },
  { id: 'db_news', tier: 'MEDIA', weight: 0.52, note: 'Aggregator; republishes other outlets with little original sourcing' },
  { id: 'cryptoslate', tier: 'MEDIA', weight: 0.52, note: 'RSS feed; mostly aggregated coverage' },
  { id: 'bitcoin magazine', tier: 'MEDIA', weight: 0.54, note: 'BTC-focused; editorial slant is structurally bullish' },
  { id: 'cryptohayes', tier: 'MEDIA', weight: 0.58, note: 'Macro essays; thesis-driven rather than factual reporting' },
  { id: 'saylor', tier: 'MEDIA', weight: 0.56, note: 'Permanently BTC-bullish by mandate; treat as sentiment, not information' },
  { id: 'vitalikbuterin', tier: 'MEDIA', weight: 0.66, note: 'Authoritative on Ethereum protocol, not on price' },
];

/** Fast lookup, built once at module load. */
const REGISTRY: ReadonlyMap<string, SourceProfile> = new Map(
  PROFILES.map((p) => [p.id, p])
);

/**
 * Normalise a raw source identifier for lookup.
 *
 * Handles the shapes that actually reach us: '@Handle', 'https://x.com/Handle',
 * 'CoinDesk', 'www.coindesk.com'. Everything collapses to a lowercase key.
 */
export function normaliseSourceId(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';

  let s = raw.trim().toLowerCase();
  if (!s) return '';

  // Pull the handle out of a status URL or profile link.
  const urlMatch = s.match(/(?:twitter\.com|x\.com)\/([a-z0-9_]+)/);
  if (urlMatch) return urlMatch[1];

  // Strip a leading @.
  s = s.replace(/^@+/, '');

  // Reduce a bare domain to its registrable name: www.coindesk.com -> coindesk
  const domainMatch = s.match(/^(?:www\.)?([a-z0-9-]+)\.[a-z.]{2,}$/);
  if (domainMatch) return domainMatch[1];

  return s;
}

/**
 * Resolve a source to its profile. Unknown sources get a synthetic UNKNOWN
 * profile rather than null, so callers never need a null branch.
 */
export function getSourceProfile(raw: string | null | undefined): SourceProfile {
  const id = normaliseSourceId(raw);
  const hit = REGISTRY.get(id);
  if (hit) return hit;

  return {
    id: id || 'unknown',
    tier: 'UNKNOWN',
    weight: UNKNOWN_SOURCE_WEIGHT,
    note: 'Not in registry; discounted but not excluded',
  };
}

/** Credibility weight in [0, 1] for a source. Convenience over getSourceProfile. */
export function getSourceWeight(raw: string | null | undefined): number {
  return getSourceProfile(raw).weight;
}

/** True when the source is a registered market mover (used for urgency flags). */
export function isPrimaryMover(raw: string | null | undefined): boolean {
  const tier = getSourceProfile(raw).tier;
  return tier === 'PRIMARY_MOVER' || tier === 'MACRO_SHOCK';
}

/** All registered profiles. Exposed for tests and diagnostics. */
export function listRegisteredSources(): readonly SourceProfile[] {
  return PROFILES;
}
