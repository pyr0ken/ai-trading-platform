'use client';

import React from 'react';
import { NewsArticle } from '@/types/news';
import { Newspaper, ExternalLink } from 'lucide-react';

interface NewsFeedProps {
  articles?: NewsArticle[];
  isLoading?: boolean;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ articles, isLoading }) => {
  if (isLoading || !articles || articles.length === 0) {
    return (
      <div className="bg-[#040406] border border-[#e2e3e9]/20 rounded-[10px] p-6 text-[#e2e3e9] animate-pulse min-h-[220px]">
        <div className="h-5 w-44 bg-white/5 rounded-full mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-white/5 rounded-[9999px]" />
          <div className="h-16 bg-white/5 rounded-[9999px]" />
          <div className="h-16 bg-white/5 rounded-[9999px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#040406] border border-[#e2e3e9]/20 rounded-[10px] p-6 text-[#e2e3e9] space-y-4">
      <div className="flex items-center justify-between border-b border-[#e2e3e9]/20 pb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#cc9166]" />
          <span className="font-mono text-[11px] text-[#e2e3e9] tracking-[0.16em] uppercase">
            LIVE MARKET INTELLIGENCE FEED
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#9194a1] tracking-[0.16em] uppercase">
          {articles.length} HEADLINES
        </span>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {articles.map((item, idx) => (
          <a
            key={idx}
            href={item.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#08080a] hover:bg-[#2e3038] border border-[#e2e3e9]/20 hover:border-[#cc9166] p-4 rounded-[9999px] transition-all duration-200 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em]">
                  <span className="text-[#cc9166] font-medium">{item.source}</span>
                  <span className="text-[#9194a1]">•</span>
                  <span className="text-[#9194a1]">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Recent'}
                  </span>
                </div>

                <h4 className="text-sm font-sans font-normal text-[#e2e3e9] group-hover:text-[#cc9166] transition-colors leading-snug">
                  {item.title}
                </h4>

                {item.summary && (
                  <p className="text-xs font-sans text-[#9194a1] leading-relaxed line-clamp-2">
                    {item.summary}
                  </p>
                )}
              </div>

              <ExternalLink className="w-4 h-4 text-[#9194a1] group-hover:text-[#cc9166] shrink-0 mt-1 transition-colors" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
