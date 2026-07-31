'use client';

import React from 'react';
import { Newspaper, ExternalLink, ChevronRight } from 'lucide-react';
import { NewsArticle } from '@/types/news';

interface NewsTickerProps {
  articles?: NewsArticle[];
  isLoading?: boolean;
  onViewAll?: () => void;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'Now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

function sentimentDot(score?: number): string {
  if (score === undefined) return 'bg-[#5e616e]';
  if (score >= 0.3) return 'bg-emerald-400';
  if (score <= -0.3) return 'bg-rose-400';
  return 'bg-[#777a88]';
}

export const NewsTicker: React.FC<NewsTickerProps> = ({ articles, isLoading, onViewAll }) => {
  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[2px] p-4 min-h-[220px]">
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[#cc9166]" />
            <span className="text-[11px] font-semibold text-[#cc9166] uppercase tracking-wider">
              Market News
            </span>
          </div>
        </div>
        <div className="space-y-2.5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#121317] mt-1.5 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-[#121317] rounded-[1px] w-full" />
                <div className="h-2.5 bg-[#121317] rounded-[1px] w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[2px] p-4 min-h-[120px] flex flex-col items-center justify-center text-center">
        <Newspaper className="w-5 h-5 text-[#5e616e] mb-2" />
        <p className="text-[12px] text-[#5e616e] font-sans">No news yet</p>
      </div>
    );
  }

  const topHeadlines = articles.slice(0, 3);

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[2px] p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#cc9166]" />
          <span className="text-[11px] font-semibold text-[#cc9166] uppercase tracking-wider">
            Market News
          </span>
        </div>
        <button
          onClick={onViewAll}
          className="text-[10px] font-mono uppercase tracking-wider text-[#777a88]
                     hover:text-[#cc9166] transition-colors duration-200 flex items-center gap-1 cursor-pointer"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Headlines */}
      <div className="space-y-2">
        {topHeadlines.map((article, idx) => (
          <a
            key={article.articleId || idx}
            href={article.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2.5 py-1.5 border-b border-[#1c1d22]/40 last:border-0 last:pb-0"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 mt-[7px] ${sentimentDot(article.sentimentScore)}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#e2e3e9] leading-snug group-hover:text-[#cc9166] transition-colors duration-200 line-clamp-1 font-sans">
                {article.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-mono uppercase tracking-[0.06em] text-[#5e616e]">
                  {article.source}
                </span>
                <span className="text-[9px] font-mono text-[#5e616e]">·</span>
                <span className="text-[9px] font-mono text-[#5e616e]">
                  {timeAgo(article.published_at)}
                </span>
                {article.category && article.category === 'breaking' && (
                  <>
                    <span className="text-[9px] font-mono text-rose-400">·</span>
                    <span className="text-[8px] font-mono uppercase tracking-wider text-rose-400 font-semibold">
                      Breaking
                    </span>
                  </>
                )}
              </div>
            </div>
            <ExternalLink className="w-3 h-3 text-[#5e616e] group-hover:text-[#cc9166] shrink-0 mt-1.5 transition-colors opacity-0 group-hover:opacity-100" />
          </a>
        ))}
      </div>
    </div>
  );
};
