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
      <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-6 text-[#e2e3e9] animate-pulse min-h-[220px]">
        <div className="h-5 w-44 bg-[#121317] rounded-none mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-[#121317] rounded-none" />
          <div className="h-16 bg-[#121317] rounded-none" />
          <div className="h-16 bg-[#121317] rounded-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-6 text-[#e2e3e9] space-y-4">
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper uppercase">
            LIVE MARKET INTELLIGENCE FEED
          </span>
        </div>
        <span className="eyebrow-fog text-[10px] uppercase">
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
            className="block bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] hover:border-[#cc9166] p-4 rounded-none transition-all duration-200 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em]">
                  <span className="text-[#cc9166] font-medium">{item.source}</span>
                  <span className="text-[#5e616e]">•</span>
                  <span className="text-[#9194a1]">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Recent'}
                  </span>
                </div>

                <h4 className="text-sm font-ivy-presto font-normal text-[#e2e3e9] group-hover:text-[#cc9166] transition-colors leading-snug">
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
