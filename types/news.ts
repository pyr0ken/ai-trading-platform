/**
 * Crypto News Types — Premium Intelligence Feed
 */

export type NewsCategory =
  | 'regulatory'
  | 'market'
  | 'protocol'
  | 'breaking'
  | 'macro'
  | 'general';

export const NEWS_CATEGORIES: Record<NewsCategory, {
  label: string;
  emoji: string;
  borderColor: string;
  badgeBg: string;
}> = {
  regulatory: {
    label: 'Regulatory',
    emoji: '🏛',
    borderColor: 'border-amber-500/40',
    badgeBg: 'bg-amber-500/10 text-amber-400',
  },
  market: {
    label: 'Market',
    emoji: '📈',
    borderColor: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-500/10 text-emerald-400',
  },
  protocol: {
    label: 'Protocol',
    emoji: '🔧',
    borderColor: 'border-sky-500/40',
    badgeBg: 'bg-sky-500/10 text-sky-400',
  },
  breaking: {
    label: 'Breaking',
    emoji: '⚡',
    borderColor: 'border-rose-500/50',
    badgeBg: 'bg-rose-500/15 text-rose-400',
  },
  macro: {
    label: 'Macro',
    emoji: '🧠',
    borderColor: 'border-violet-500/40',
    badgeBg: 'bg-violet-500/10 text-violet-400',
  },
  general: {
    label: 'General',
    emoji: '📰',
    borderColor: 'border-[#1c1d22]',
    badgeBg: 'bg-[#121317] text-[#9194a1]',
  },
};

export interface NewsArticle {
  title: string;
  summary: string;
  published_at?: string;
  source: string;
  url?: string;
  sentimentScore?: number; // -1 to +1
  category?: NewsCategory;
  articleId?: string; // unique hash for bookmarking
}

export interface NewsPayload {
  summaryForPrompt: string;
  articles: NewsArticle[];
  newsSentimentIndex?: number; // average sentiment from -1 to +1
}
