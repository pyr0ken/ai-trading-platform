import Parser from 'rss-parser';
import { NewsArticle, NewsPayload, NewsCategory } from '@/types/news';
import { analyzeSentimentDeterministic } from './news-lexicon';

const RSS_FEEDS: { url: string; label: string }[] = [
  { url: 'https://cointelegraph.com/rss', label: 'CoinTelegraph' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', label: 'CoinDesk' },
  { url: 'https://cryptoslate.com/feed/', label: 'CryptoSlate' },
  { url: 'https://theblockcrypto.com/rss.xml', label: 'The Block' },
  { url: 'https://bitcoinmagazine.com/.rss/full/', label: 'Bitcoin Magazine' },
];

const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  regulatory: [
    'sec', 'etf', 'regulation', 'regulatory', 'ban', 'banned', 'lawsuit',
    'cftc', 'congress', 'senate', 'bill', 'legal', 'compliance',
    'approved', 'deny', 'denied', 'enforcement', 'sanction', 'money laundering',
    'kyc', 'aml', 'sec chair', 'commissioner', 'hearing', 'testimony',
  ],
  market: [
    'price', 'bullish', 'bearish', 'rally', 'dump', 'inflow', 'outflow',
    'market cap', 'volume', 'liquidation', 'trading', 'etf inflow',
    'etf outflow', 'bitcoin etf', 'spot etf', 'adoption', 'institutional',
    'surge', 'plunge', 'breakout', 'correction', 'ath', 'all-time high',
    'support', 'resistance', 'buying pressure', 'selling pressure',
  ],
  protocol: [
    'upgrade', 'mainnet', 'testnet', 'fork', 'hard fork', 'launch',
    'protocol', 'layer 2', 'l2', 'scaling', 'defi', 'smart contract',
    'audit', 'exploit', 'hack', 'vulnerability', 'tokenomics',
    'airdrop', 'staking', 'validator', 'consensus', 'rollup',
    'ethereum upgrade', 'solana', 'ecosystem',
  ],
  breaking: [
    'hack', 'exploit', 'crash', 'emergency', 'urgent', 'flash',
    'breach', 'critical', 'panic', 'liquidation cascade',
    'unexpected', 'shock', 'dramatic', 'collapse',
  ],
  macro: [
    'fed', 'federal reserve', 'interest rate', 'rate hike', 'rate cut',
    'inflation', 'cpi', 'ppi', 'gdp', 'dxy', 'dollar index',
    'dollar', 'treasury', 'bond yield', 'stock market', 'sp500',
    's&p 500', 'nasdaq', 'jobs report', 'nonfarm payrolls', 'nfp',
    'recession', 'economic', 'central bank', 'monetary policy',
    'quantitative easing', 'tightening', 'liquidity',
  ],
  general: [], // catch-all, no specific keywords needed
};

const CATEGORY_WEIGHTS: Record<NewsCategory, number> = {
  breaking: 3.0, // breaking overrides almost everything
  regulatory: 2.0,
  market: 1.5,
  protocol: 1.0,
  macro: 1.0,
  general: 0.5,
};

/**
 * Categorize a news article based on keyword matching with weighted scoring.
 */
function categorizeArticle(title: string, summary: string): NewsCategory {
  const content = `${title} ${summary}`.toLowerCase();

  const scores: Record<string, number> = {};
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0;
    for (const kw of keywords) {
      if (content.includes(kw)) {
        scores[category] += CATEGORY_WEIGHTS[category as NewsCategory];
      }
    }
  }

  // If breaking has any match, it wins
  if (scores['breaking'] > 0) return 'breaking';

  // Pick highest score, minimum threshold 1
  let best: NewsCategory = 'general';
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = cat as NewsCategory;
    }
  }

  return bestScore >= 1 ? best : 'general';
}

/**
 * Generate a short unique ID for an article (for bookmarking).
 */
function generateArticleId(url: string, title: string): string {
  const raw = `${url || ''}${title}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `news_${Math.abs(hash).toString(36)}`;
}

/**
 * Crypto News Aggregation & Sanitization Service
 */
export class NewsService {
  private static parser = new Parser({
    timeout: 3000,
  });

  private static cachedPayload: { articles: NewsArticle[]; fetchedAt: number } | null = null;
  private static inFlightPromise: Promise<NewsArticle[]> | null = null;
  private static readonly CACHE_TTL_MS = 60_000; // 1 minute

  private static async getCachedArticles(): Promise<NewsArticle[]> {
    const now = Date.now();
    if (this.cachedPayload && now - this.cachedPayload.fetchedAt < this.CACHE_TTL_MS) {
      return this.cachedPayload.articles;
    }
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }
    this.inFlightPromise = (async () => {
      try {
        const articles = await this.fetchNews(6);
        this.cachedPayload = { articles, fetchedAt: Date.now() };
        return articles;
      } finally {
        this.inFlightPromise = null;
      }
    })();
    return this.inFlightPromise;
  }

  /**
   * Public accessor for the shared, de-duplicated article cache.
   *
   * Both the UI feed (`/api/news`) and the news-intelligence layer read
   * through this so a single RSS round-trip serves both. Without it the
   * intelligence pass would re-fetch every feed on each brief regeneration.
   */
  public static async getArticles(): Promise<NewsArticle[]> {
    return this.getCachedArticles();
  }

  /**
   * Deterministic sentiment score for an article, in [-1..1].
   *
   * Delegates to the financial lexicon engine, which handles negation
   * ("not panic selling"), outcome-aware regulatory phrases ("SEC approves"
   * vs "SEC sues"), phrase weighting, and hedging detection. The previous
   * flat ±0.25 keyword counter mis-signed a measurable share of headlines.
   */
  public static scoreArticle(title: string, summary: string): number {
    return analyzeSentimentDeterministic(title, summary).score;
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

  public static async fetchNews(limitPerSource = 4): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    const fetchPromises = RSS_FEEDS.map(async (feed) => {
      try {
        const parsed = await this.parser.parseURL(feed.url);
        const sourceName = feed.label;

        const items = (parsed.items || []).slice(0, limitPerSource);
        for (const item of items) {
          if (!item.title) continue;
          const sanitizedTitle = this.sanitizeText(item.title);
          const sanitizedSnippet = this.sanitizeText(item.contentSnippet || item.content || '');
          const truncatedSnippet =
            sanitizedSnippet.length > 280
              ? sanitizedSnippet.substring(0, 277) + '...'
              : sanitizedSnippet;

          const sentimentScore = this.scoreArticle(sanitizedTitle, truncatedSnippet);
          const category = categorizeArticle(sanitizedTitle, truncatedSnippet);
          const articleId = generateArticleId(item.link || '', sanitizedTitle);

          articles.push({
            title: sanitizedTitle,
            summary: truncatedSnippet,
            source: sourceName,
            url: item.link || '',
            published_at: item.isoDate || item.pubDate || new Date().toISOString(),
            sentimentScore,
            category,
            articleId,
          });
        }
      } catch {
        // Ignored — individual feed failure doesn't block others
      }
    });

    await Promise.allSettled(fetchPromises);

    // Return empty array if all RSS feeds failed — NEVER return fake hardcoded articles
    return articles.sort(
      (a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
    );
  }


  public static async getNewsPayload(limit = 5): Promise<NewsPayload> {
    const articles = await this.getCachedArticles();
    const sliced = articles.slice(0, limit);

    const summaryForPrompt = sliced
      .map(
        (a, i) =>
          `[News ${i + 1}] (${a.source}) [${a.category?.toUpperCase() || 'GENERAL'}]: ${a.title} - ${a.summary || 'No summary available.'} (Sentiment: ${a.sentimentScore})`
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
