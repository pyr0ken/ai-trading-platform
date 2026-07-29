import Parser from 'rss-parser';
import { NewsArticle, NewsPayload } from '@/types/news';

const RSS_FEEDS = [
  'https://cointelegraph.com/rss',
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
];

/**
 * Crypto News Aggregation & Sanitization Service
 */
export class NewsService {
  private static parser = new Parser({
    timeout: 3000,
  });

  private static positiveKeywords = [
    'bullish', 'surge', 'institutional', 'approved', 'buying', 'adoption', 'upgrade',
    'growth', 'inflow', 'gain', 'breakout', 'support', 'highest', 'profit', 'positive',
    'invest', 'rally', 'record high', 'green', 'skyrocket', 'momentum', 'win'
  ];

  private static negativeKeywords = [
    'bearish', 'hack', 'ban', 'lawsuit', 'dump', 'liquidation', 'regulatory', 'scam',
    'loss', 'outflow', 'drop', 'crash', 'red', 'selling', 'panic', 'deficit', 'fears',
    'sec', 'probe', 'subpoena', 'downward', 'danger', 'correction', 'slippage'
  ];

  public static scoreArticle(title: string, summary: string): number {
    let score = 0;
    const content = (title + ' ' + summary).toLowerCase();
    
    this.positiveKeywords.forEach(w => {
      if (content.includes(w)) score += 0.25;
    });
    this.negativeKeywords.forEach(w => {
      if (content.includes(w)) score -= 0.25;
    });

    return Number(Math.max(-1.0, Math.min(1.0, score)).toFixed(2));
  }

  private static sanitizeText(raw: string): string {
    if (!raw) return '';
    return raw
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static async fetchNews(limitPerSource = 3): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    const fetchPromises = RSS_FEEDS.map(async (feedUrl) => {
      try {
        const feed = await this.parser.parseURL(feedUrl);
        const sourceName = feed.title?.includes('CoinDesk') ? 'CoinDesk' : 'CoinTelegraph';

        const items = (feed.items || []).slice(0, limitPerSource);
        for (const item of items) {
          if (!item.title) continue;
          const sanitizedTitle = this.sanitizeText(item.title);
          const sanitizedSnippet = this.sanitizeText(item.contentSnippet || item.content || '');
          const truncatedSnippet =
            sanitizedSnippet.length > 280
              ? sanitizedSnippet.substring(0, 277) + '...'
              : sanitizedSnippet;

          const sentimentScore = this.scoreArticle(sanitizedTitle, truncatedSnippet);

          articles.push({
            title: sanitizedTitle,
            summary: truncatedSnippet,
            source: sourceName,
            url: item.link || '',
            published_at: item.isoDate || item.pubDate || new Date().toISOString(),
            sentimentScore,
          });
        }
      } catch {
        // Ignored
      }
    });

    await Promise.allSettled(fetchPromises);

    // Fallback static articles if RSS feeds timed out
    if (articles.length === 0) {
      articles.push(
        {
          title: 'Federal Reserve Signals Interest Rate Policy Benchmark Update',
          summary: 'Global financial liquidity expectations shift as central banks adjust macroeconomic frameworks.',
          source: 'Market Feed',
          url: 'https://cointelegraph.com',
          published_at: new Date().toISOString(),
          sentimentScore: 0.0,
        },
        {
          title: 'Bitcoin Institutional Inflows Reach Monthly High Across Major ETFS',
          summary: 'Institutional asset managers continue accumulating spot Bitcoin allocations.',
          source: 'Crypto Market',
          url: 'https://coindesk.com',
          published_at: new Date().toISOString(),
          sentimentScore: 0.5,
        }
      );
    }

    return articles.sort(
      (a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
    );
  }


  public static async getNewsPayload(limit = 5): Promise<NewsPayload> {
    const articles = await this.fetchNews(3);
    const sliced = articles.slice(0, limit);

    const summaryForPrompt = sliced
      .map(
        (a, i) =>
          `[News ${i + 1}] (${a.source}): ${a.title} - ${a.summary || 'No summary available.'} (Sentiment: ${a.sentimentScore})`
      )
      .join('\n');

    const newsSentimentIndex = sliced.length > 0
      ? Number((sliced.reduce((sum, a) => sum + (a.sentimentScore || 0), 0) / sliced.length).toFixed(2))
      : 0.0;

    return {
      articles: sliced,
      summaryForPrompt: summaryForPrompt || 'No recent market news available.',
      newsSentimentIndex,
    };
  }
}
