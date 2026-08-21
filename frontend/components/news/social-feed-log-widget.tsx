/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect } from 'react';
import { Share2, ShieldCheck, Heart, Repeat, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

interface EnrichedTweet {
  tweet_url: string;
  text: string;
  target_account: string;
  timestamp: string;
  like_count?: number;
  retweet_count?: number;
  sourceProfile?: {
    tier: string;
    weight: number;
    note: string;
  };
  relevanceScore?: number;
  tier?: string;
  explanation?: string;
}

interface SocialFeedLogWidgetProps {
  symbol?: string;
}

export const SocialFeedLogWidget: React.FC<SocialFeedLogWidgetProps> = ({ symbol = 'BTC/USDT' }) => {
  const [tweets, setTweets] = useState<EnrichedTweet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTweets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intel/tweets?symbol=${encodeURIComponent(symbol)}&limit=25`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTweets(data.tweets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tweets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTweets();
  }, [symbol]);

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-5 space-y-4 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">X / TWITTER SOCIAL INTELLIGENCE LOG</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9194a1] bg-[#121317] border border-[#1c1d22] px-2.5 py-0.5 rounded-full">
            Symbol: <span className="text-[#ffffff] font-bold">{symbol}</span>
          </span>
          <button
            onClick={fetchTweets}
            disabled={isLoading}
            className="p-1 rounded-full bg-[#121317] border border-[#1c1d22] hover:border-[#cc9166] text-[#9194a1] hover:text-[#e2e3e9] transition-all cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#cc9166]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tweet Feed List */}
      {isLoading ? (
        <div className="p-8 text-center text-[#5e616e] space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#cc9166]" />
          <p>Loading X feed intelligence log...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-[8px] text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading tweet feed: {error}</span>
        </div>
      ) : tweets.length === 0 ? (
        <div className="p-6 text-center text-[#5e616e] bg-[#121317]/50 rounded-[8px] border border-[#1c1d22]">
          No scraped tweets found in database. Run scraper in <code className="text-[#cc9166]">x_feed_engine</code> to populate real-time X feed.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {tweets.map((t, idx) => {
            const isPrimary = t.sourceProfile?.tier === 'PRIMARY_MOVER';
            const relScore = Math.round((t.relevanceScore ?? 0) * 100);
            const isHighRel = relScore >= 60;

            return (
              <div
                key={idx}
                className="p-3 bg-[#121317] border border-[#1c1d22] hover:border-[#cc9166]/40 rounded-[8px] space-y-2 transition-all"
              >
                {/* User Header & Badges */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#ffffff] font-sans">@{t.target_account}</span>
                    {isPrimary && (
                      <span className="flex items-center gap-1 bg-amber-950/80 text-amber-300 border border-amber-500/50 px-2 py-0.2 text-[9px] rounded-full font-bold">
                        <ShieldCheck className="w-3 h-3" /> PRIMARY MOVER
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={`px-2 py-0.5 rounded-full font-bold border ${
                      isHighRel
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : 'bg-[#1c1d22] text-[#9194a1] border-[#2a2b32]'
                    }`}>
                      Relevance: {relScore}%
                    </span>
                  </div>
                </div>

                {/* Tweet Text */}
                <p className="text-xs text-[#e2e3e9] font-sans leading-relaxed">
                  {t.text}
                </p>

                {/* Engagement & Link Footer */}
                <div className="flex items-center justify-between text-[10px] text-[#5e616e] pt-1 border-t border-[#1c1d22]/60">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[#9194a1]">
                      <Heart className="w-3 h-3 text-rose-400" /> {t.like_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-[#9194a1]">
                      <Repeat className="w-3 h-3 text-emerald-400" /> {t.retweet_count ?? 0}
                    </span>
                  </div>
                  {t.tweet_url && (
                    <a
                      href={t.tweet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#cc9166] hover:underline"
                    >
                      <span>View on X</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
