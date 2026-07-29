/**
 * Crypto News Types
 */

export interface NewsArticle {
  title: string;
  summary: string;
  published_at?: string;
  source: string;
  url?: string;
  sentimentScore?: number; // -1 to +1
}

export interface NewsPayload {
  summaryForPrompt: string;
  articles: NewsArticle[];
  newsSentimentIndex?: number; // average sentiment from -1 to +1
}
