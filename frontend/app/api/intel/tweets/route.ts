import { NextResponse } from 'next/server';
import { loadTweetFeed } from '@/lib/intel/social-intel';
import { getSourceProfile } from '@/lib/intel/source-registry';
import { scoreRelevance } from '@/lib/intel/relevance-scorer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTC/USDT';
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const tweets = (await loadTweetFeed()).slice(0, limit);

    // Enrich tweets with source credibility and relevance for the symbol
    const enrichedTweets = tweets.map((t) => {
      const sourceProf = getSourceProfile(t.target_account);
      const relResult = scoreRelevance({
        text: t.text || '',
        source: t.target_account || 'unknown',
        publishedAt: t.timestamp || new Date().toISOString(),
        engagement: {
          likes: t.like_count ?? 0,
          retweets: t.retweet_count ?? 0,
          replies: t.reply_count ?? 0,
        },
      }, symbol);

      return {
        ...t,
        sourceProfile: sourceProf,
        relevanceScore: relResult.score,
        tier: relResult.tier,
        reasons: relResult.reasons,
      };
    });

    return NextResponse.json({
      symbol,
      totalCount: enrichedTweets.length,
      tweets: enrichedTweets,
    });
  } catch (err) {
    console.error('[API /api/intel/tweets] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch tweets feed.' },
      { status: 500 }
    );
  }
}
