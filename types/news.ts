/**
 * Crypto News Types
 */

export interface NewsArticle {
  title: string;
  summary: string;
  published_at?: string;
  source: string;
  url?: string;
}

export interface NewsPayload {
  summaryForPrompt: string;
  articles: NewsArticle[];
}
