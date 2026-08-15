'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  ChevronDown,
  Clock,
  TrendingUp,
  Sparkles,
  Filter,
  X,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { NewsArticle, NewsCategory, NEWS_CATEGORIES } from '@/types/news';
import { WhaleSidebar } from '@/components/whale/whale-sidebar';
import { SocialFeedLogWidget } from '@/components/news/social-feed-log-widget';

/* ──────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────── */

type SortMode = 'latest' | 'hot' | 'relevant';

interface NewsTabPageProps {
  symbol?: string;
  exchange?: string;
}

/* ──────────────────────────────────────────────────
   Bookmark helpers (localStorage-based for speed)
   ────────────────────────────────────────────────── */

const BOOKMARK_KEY = 'hermes_news_bookmarks';

const bookmarkedSetMemory = new Set<string>();

function getBookmarks(): Set<string> {
  return bookmarkedSetMemory;
}

function toggleBookmark(id: string): boolean {
  const bm = getBookmarks();
  const exists = bm.has(id);
  if (exists) bm.delete(id);
  else bm.add(id);
  return !exists;
}

/* ──────────────────────────────────────────────────
   Formatting helpers
   ────────────────────────────────────────────────── */

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function sentimentIndicator(score?: number): { icon: string; color: string; label: string } {
  if (score === undefined || score === null) return { icon: '➖', color: 'text-[#5e616e]', label: 'Neutral' };
  if (score >= 0.3) return { icon: '↗️', color: 'text-emerald-400', label: 'Bullish' };
  if (score <= -0.3) return { icon: '↘️', color: 'text-rose-400', label: 'Bearish' };
  return { icon: '➡️', color: 'text-[#777a88]', label: 'Neutral' };
}

/* ──────────────────────────────────────────────────
   Animations — injected once via <style>
   ────────────────────────────────────────────────── */

const ANIMATION_STYLES = `
@keyframes news-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes news-skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 0.7; }
}
.news-fade-in {
  animation: news-fade-in 0.35s ease-out both;
}
.news-skeleton-pulse {
  animation: news-skeleton-pulse 1.8s ease-in-out infinite;
}
`;

/* ──────────────────────────────────────────────────
   Skeleton Card
   ────────────────────────────────────────────────── */

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="news-fade-in bg-[#121317] border border-[#1c1d22] p-5 rounded-[2px]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="news-skeleton-pulse w-14 h-3 rounded-[1px] bg-[#1c1d22]" />
            <div className="news-skeleton-pulse w-10 h-3 rounded-[1px] bg-[#1c1d22]" />
          </div>
          <div className="news-skeleton-pulse w-full h-4 rounded-[1px] bg-[#1c1d22]" />
          <div className="news-skeleton-pulse w-3/4 h-4 rounded-[1px] bg-[#1c1d22]" />
          <div className="flex items-center gap-2">
            <div className="news-skeleton-pulse w-16 h-2.5 rounded-[1px] bg-[#1c1d22]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Article Card
   ────────────────────────────────────────────────── */

function ArticleCard({
  article,
  index,
  bookmarkedIds,
  onToggleBookmark,
}: {
  article: NewsArticle;
  index: number;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (id: string) => void;
}) {
  const cat = article.category ? NEWS_CATEGORIES[article.category] : NEWS_CATEGORIES.general;
  const senti = sentimentIndicator(article.sentimentScore);
  const isBookmarked = article.articleId ? bookmarkedIds.has(article.articleId) : false;
  const isBreaking = article.category === 'breaking';

  return (
    <div
      className={`news-fade-in group relative bg-[#121317] border ${
        isBreaking ? 'border-rose-500/30' : 'border-[#1c1d22]'
      } hover:border-[#cc9166]/60 transition-all duration-300 p-5 rounded-[2px] cursor-pointer`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Top row: badge + source + time + bookmark */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Category badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.06em] font-semibold rounded-[2px] ${cat.badgeBg}`}
          >
            {cat.emoji}
            {cat.label}
          </span>

          {/* Source */}
          <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-[#777a88]">
            {article.source}
          </span>

          {/* Time */}
          <span className="text-[10px] font-mono text-[#5e616e]">
            {timeAgo(article.published_at)}
          </span>
        </div>

        {/* Bookmark button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            if (article.articleId) onToggleBookmark(article.articleId);
          }}
          className={`shrink-0 p-1 rounded-[2px] transition-all duration-200 ${
            isBookmarked
              ? 'text-[#cc9166] hover:text-[#e2e3e9]'
              : 'text-[#5e616e] opacity-0 group-hover:opacity-100 hover:text-[#e2e3e9]'
          }`}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark article'}
        >
          {isBookmarked ? (
            <BookmarkCheck className="w-4 h-4" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Title (link) */}
      <a
        href={article.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <h3
          className={`font-ivy-presto text-[16px] leading-snug font-normal mb-2 transition-colors duration-200 pr-6 ${
            isBreaking
              ? 'text-rose-300 group-hover:text-rose-200'
              : 'text-[#e2e3e9] group-hover:text-[#cc9166]'
          }`}
        >
          {article.title}
        </h3>

        {/* Summary */}
        {article.summary && (
          <p className="text-[13px] text-[#9194a1] leading-relaxed line-clamp-2 mb-3 font-sans">
            {article.summary}
          </p>
        )}
      </a>

      {/* Bottom row: sentiment + open link */}
      <div className="flex items-center justify-between mt-1">
        <span className={`text-[11px] font-mono flex items-center gap-1 ${senti.color}`}>
          <span>{senti.icon}</span>
          <span>{senti.label}</span>
          {article.sentimentScore !== undefined && (
            <span className="text-[#5e616e] ml-0.5">
              ({article.sentimentScore > 0 ? '+' : ''}{article.sentimentScore?.toFixed(2)})
            </span>
          )}
        </span>

        <a
          href={article.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5e616e] hover:text-[#cc9166] transition-colors duration-200"
          title="Open original"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Sort Dropdown
   ────────────────────────────────────────────────── */

function SortDropdown({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (v: SortMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const options: { value: SortMode; label: string; icon: React.ReactNode }[] = [
    { value: 'latest', label: 'Latest', icon: <Clock className="w-3.5 h-3.5" /> },
    { value: 'hot', label: 'Hot', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { value: 'relevant', label: 'Relevant', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  const current = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#121317] border border-[#1c1d22]
                   hover:border-[#777a88] transition-all duration-200 text-[12px] font-mono
                   text-[#9194a1] hover:text-[#e2e3e9] rounded-[2px] cursor-pointer"
      >
        {current.icon}
        <span>{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-40 bg-[#121317] border border-[#1c1d22]
                        rounded-[2px] shadow-xl shadow-black/40 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-mono
                         text-left transition-all duration-150 cursor-pointer ${
                           value === opt.value
                             ? 'bg-[#1c1d22] text-[#e2e3e9]'
                             : 'text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#1c1d22]/50'
                         }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Category Pill
   ────────────────────────────────────────────────── */

function CategoryPill({
  label,
  emoji,
  count,
  active,
  accentColor,
  onClick,
}: {
  label: string;
  emoji: string;
  count: number;
  active: boolean;
  accentColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono
                 tracking-wider uppercase rounded-[2px] transition-all duration-200 cursor-pointer
                 ${
                   active
                     ? 'bg-[#1c1d22] text-[#e2e3e9] border border-[#777a88] shadow-sm'
                     : `bg-[#121317] text-[#9194a1] border border-[#1c1d22] hover:border-[#777a88] hover:text-[#e2e3e9] ${
                         accentColor || ''
                       }`
                 }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
      <span className={`text-[10px] ${active ? 'text-[#777a88]' : 'text-[#5e616e]'}`}>
        {count}
      </span>
    </button>
  );
}

/* ──────────────────────────────────────────────────
   Sentiment Summary Footer
   ────────────────────────────────────────────────── */

function SentimentFooter({ articles }: { articles: NewsArticle[] }) {
  const sentimentData = useMemo(() => {
    const withScore = articles.filter((a) => a.sentimentScore !== undefined);
    const bullish = withScore.filter((a) => (a.sentimentScore || 0) >= 0.3).length;
    const bearish = withScore.filter((a) => (a.sentimentScore || 0) <= -0.3).length;
    const neutral = withScore.length - bullish - bearish;
    const total = withScore.length || 1;
    return {
      bullishPct: Math.round((bullish / total) * 100),
      bearishPct: Math.round((bearish / total) * 100),
      neutralPct: Math.round((neutral / total) * 100),
      total: withScore.length,
    };
  }, [articles]);

  const avgSentiment = useMemo(() => {
    const withScore = articles.filter((a) => a.sentimentScore !== undefined);
    if (withScore.length === 0) return 0;
    return withScore.reduce((sum, a) => sum + (a.sentimentScore || 0), 0) / withScore.length;
  }, [articles]);

  const sentimentLabel =
    avgSentiment >= 0.2 ? 'Bullish' : avgSentiment <= -0.2 ? 'Bearish' : 'Neutral';
  const sentimentColor =
    avgSentiment >= 0.2
      ? 'text-emerald-400'
      : avgSentiment <= -0.2
      ? 'text-rose-400'
      : 'text-[#777a88]';

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[2px] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#cc9166] uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          News Sentiment Overview
        </span>
        <span className={`text-[12px] font-mono font-bold ${sentimentColor}`}>
          {sentimentLabel} ({avgSentiment > 0 ? '+' : ''}{avgSentiment.toFixed(2)})
        </span>
      </div>

      {/* Sentiment Bar */}
      <div className="w-full h-2 bg-[#121317] border border-[#1c1d22] rounded-[2px] overflow-hidden flex">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${sentimentData.bullishPct}%` }}
        />
        <div
          className="h-full bg-[#777a88] transition-all duration-500"
          style={{ width: `${sentimentData.neutralPct}%` }}
        />
        <div
          className="h-full bg-rose-500 transition-all duration-500"
          style={{ width: `${sentimentData.bearishPct}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Bullish {sentimentData.bullishPct}%
        </span>
        <span className="text-[#777a88] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#777a88]" />
          Neutral {sentimentData.neutralPct}%
        </span>
        <span className="text-rose-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Bearish {sentimentData.bearishPct}%
        </span>
      </div>

      <p className="text-[10px] font-mono text-[#5e616e] text-center border-t border-[#1c1d22] pt-3">
        Based on {sentimentData.total} articles with sentiment scores · Auto-updated every 2 minutes
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Main Component: NewsTabPage
   ────────────────────────────────────────────────── */

export function NewsTabPage({ symbol = 'BTC/USDT' }: NewsTabPageProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'all' | 'x-feed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => getBookmarks());
  const [displayCount, setDisplayCount] = useState(15);
  const searchRef = useRef<HTMLInputElement>(null);
  const [whaleOpen, setWhaleOpen] = useState(true);
  const [whaleAlertCount, setWhaleAlertCount] = useState(0);

  /* ── Fetch news (used by buttons — manual refresh) ── */
  const refreshNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/news?limit=30');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let abortController: AbortController | null = null;
    let isTabHidden = document.hidden;

    const load = async () => {
      if (!mounted || isTabHidden) return; // skip while tab hidden — interval handles retry
      abortController?.abort();
      abortController = new AbortController();
      try {
        const res = await fetch('/api/news?limit=30', { signal: abortController.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setArticles(data.articles || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load news');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    const handleVisibility = () => {
      isTabHidden = document.hidden;
      if (!isTabHidden) load(); // poll immediately when tab becomes visible
    };

    document.addEventListener('visibilitychange', handleVisibility);
    load();
    const interval = setInterval(load, 120_000);
    return () => {
      mounted = false;
      clearInterval(interval);
      abortController?.abort();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  /* ── Filter + sort ── */
  const displayArticles = useMemo(() => {
    let filtered = [...articles];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((a) => a.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.summary && a.summary.toLowerCase().includes(q)) ||
          a.source.toLowerCase().includes(q)
      );
    }

    switch (sortMode) {
      case 'latest':
        filtered.sort(
          (a, b) =>
            new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
        );
        break;
      case 'hot':
        filtered.sort((a, b) => {
          const aScore = Math.abs(a.sentimentScore || 0) * 2;
          const bScore = Math.abs(b.sentimentScore || 0) * 2;
          const aTime = new Date(a.published_at || 0).getTime() / 100_000;
          const bTime = new Date(b.published_at || 0).getTime() / 100_000;
          return bScore + bTime - (aScore + aTime);
        });
        break;
      case 'relevant':
        filtered.sort((a, b) => {
          const aRelevance =
            (a.category === 'breaking' ? 5 : 0) + Math.abs(a.sentimentScore || 0) * 3;
          const bRelevance =
            (b.category === 'breaking' ? 5 : 0) + Math.abs(b.sentimentScore || 0) * 3;
          return bRelevance - aRelevance;
        });
        break;
    }

    return filtered;
  }, [articles, selectedCategory, searchQuery, sortMode]);

  const paginatedArticles = useMemo(
    () => displayArticles.slice(0, displayCount),
    [displayArticles, displayCount]
  );

  const hasMore = displayArticles.length > displayCount;

  /* ── Bookmark toggle ── */
  const handleToggleBookmark = useCallback((id: string) => {
    const nowBookmarked = toggleBookmark(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (nowBookmarked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /* ── Category counts ── */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: articles.length };
    for (const cat of Object.keys(NEWS_CATEGORIES) as NewsCategory[]) {
      counts[cat] = articles.filter((a) => a.category === cat).length;
    }
    return counts;
  }, [articles]);

  /* ── Clear search ── */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    searchRef.current?.focus();
  }, []);

  /* ── ⌘K shortcut ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ── Render ── */
  return (
    <>
      <style>{ANIMATION_STYLES}</style>

      <div className="flex gap-0 max-w-[1400px] mx-auto w-full items-stretch">
        {/* ═══ Left: News Content ═══ */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* ═══ Header ═══ */}
          <div className="bg-[#040406] border border-[#1c1d22] rounded-[2px] p-6 md:p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[13px] font-sans font-semibold text-[#cc9166] uppercase tracking-wider">
                    📰 News Intelligence
                  </span>
                  {!isLoading && (
                    <span className="text-[10px] font-mono text-[#5e616e] bg-[#121317] px-2 py-0.5 rounded-[2px] border border-[#1c1d22]">
                      {articles.length} articles · 5 feeds
                    </span>
                  )}
                </div>
                <h2 className="font-ivy-presto text-[28px] md:text-[32px] font-normal text-[#ffffff] leading-tight">
                  Market Intelligence Feed
                </h2>
                <p className="text-[13px] text-[#9194a1] mt-1 font-sans max-w-xl">
                  Curated crypto &amp; macroeconomic news — automatically categorized by AI for trading decisions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Whale toggle button */}
                <button
                  onClick={() => setWhaleOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-2 border transition-all duration-200 text-[11px] font-mono rounded-[2px] cursor-pointer ${
                    whaleOpen
                      ? 'bg-[#121317] border-[#cc9166]/40 text-[#cc9166] hover:border-[#cc9166]'
                      : 'bg-[#121317] border-[#1c1d22] text-[#5e616e] hover:border-[#777a88] hover:text-[#e2e3e9]'
                  }`}
                  title={whaleOpen ? 'Hide Whale Alerts' : 'Show Whale Alerts'}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Whale</span>
                  {whaleAlertCount > 0 && (
                    <span className="text-[9px] font-mono bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-[2px]">
                      {whaleAlertCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={refreshNews}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#121317] border border-[#1c1d22]
                             hover:border-[#777a88] transition-all duration-200 text-[12px] font-mono
                             text-[#9194a1] hover:text-[#e2e3e9] rounded-[2px] disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
                </button>
              </div>
            </div>
          </div>

        {/* ═══ Search + Sort Bar ═══ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5e616e] pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search headlines, sources…  (⌘K)"
              className="w-full bg-[#121317] border border-[#1c1d22] hover:border-[#777a88]
                         focus:border-[#cc9166]/50 focus:outline-none transition-all duration-200
                         rounded-[2px] pl-10 pr-9 py-2.5 text-[13px] font-sans text-[#e2e3e9]
                         placeholder:text-[#5e616e]"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5e616e]
                           hover:text-[#e2e3e9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <SortDropdown value={sortMode} onChange={setSortMode} />
        </div>

        {/* ═══ Category Filter Pills ═══ */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#5e616e] uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </span>

          <CategoryPill
            label="All"
            emoji="📰"
            count={categoryCounts['all']}
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          />

          {(Object.keys(NEWS_CATEGORIES) as NewsCategory[]).map((cat) => (
            <CategoryPill
              key={cat}
              label={NEWS_CATEGORIES[cat].label}
              emoji={NEWS_CATEGORIES[cat].emoji}
              count={categoryCounts[cat] || 0}
              active={selectedCategory === cat}
              accentColor={
                cat === 'breaking'
                  ? 'border-rose-500/40 text-rose-300'
                  : cat === 'regulatory'
                  ? 'border-amber-500/30 text-amber-300'
                  : undefined
              }
              onClick={() => setSelectedCategory(cat)}
            />
          ))}

          {/* X / Twitter feed tab */}
          <CategoryPill
            label="X Feed"
            emoji="𝕏"
            count={0}
            active={selectedCategory === 'x-feed'}
            accentColor="border-[#cc9166]/40 text-[#cc9166]"
            onClick={() => setSelectedCategory('x-feed')}
          />
        </div>

        {/* ═══ Error State ═══ */}
        {error && (
          <div className="bg-rose-950/30 border border-rose-500/30 p-5 rounded-[2px] flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-rose-300 mb-1 font-sans">
                News Feed Error
              </p>
              <p className="text-[12px] text-rose-400/70 font-mono">{error}</p>
            </div>
            <button
              onClick={refreshNews}
              className="px-3 py-1.5 border border-rose-500/40 text-rose-300 text-[11px]
                         font-mono hover:bg-rose-950/40 transition-all duration-200 rounded-[2px] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ═══ Loading State ═══ */}
        {isLoading && articles.length === 0 && selectedCategory !== 'x-feed' && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        )}

        {/* ═══ X / Twitter Feed View ═══ */}
        {selectedCategory === 'x-feed' && (
          <SocialFeedLogWidget symbol={symbol} />
        )}

        {/* ═══ Empty State ═══ */}
        {!isLoading && !error && displayArticles.length === 0 && selectedCategory !== 'x-feed' && (
          <div className="bg-[#040406] border border-[#1c1d22] rounded-[2px] p-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="font-ivy-presto text-[22px] text-[#e2e3e9] mb-2">
              No news in this category
            </h3>
            <p className="text-[13px] text-[#9194a1] font-sans mb-6 max-w-md mx-auto">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different search term.`
                : 'Nothing here yet. New articles appear as they\'re published.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="btn-slash-pill"
                >
                  Show All Categories
                </button>
              )}
              {searchQuery && (
                <button onClick={clearSearch} className="btn-slash-pill">
                  Clear Search
                </button>
              )}
              <button onClick={refreshNews} className="btn-slash-ghost text-[12px]">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* ═══ Article Cards ═══ */}
        {!isLoading && !error && paginatedArticles.length > 0 && selectedCategory !== 'x-feed' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono text-[#5e616e]">
                Showing{' '}
                <span className="text-[#e2e3e9]">{paginatedArticles.length}</span>
                {displayArticles.length > paginatedArticles.length && (
                  <>
                    {' '}of{' '}
                    <span className="text-[#e2e3e9]">{displayArticles.length}</span>
                  </>
                )}{' '}
                articles
                {selectedCategory !== 'all' && (
                  <>
                    {' '}in{' '}
                    <span className="text-[#cc9166]">
                      {NEWS_CATEGORIES[selectedCategory as NewsCategory]?.label}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="space-y-2.5">
              {paginatedArticles.map((article, idx) => (
                <ArticleCard
                  key={article.articleId || idx}
                  article={article}
                  index={idx}
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-2 pb-6">
                <button
                  onClick={() => setDisplayCount((p) => p + 15)}
                  className="px-6 py-3 bg-[#121317] border border-[#1c1d22] hover:border-[#777a88]
                             transition-all duration-200 text-[12px] font-mono text-[#9194a1]
                             hover:text-[#e2e3e9] rounded-[2px] flex items-center gap-2 cursor-pointer"
                >
                  <span>Load More</span>
                  <span className="text-[10px] text-[#5e616e]">
                    ({displayArticles.length - displayCount} remaining)
                  </span>
                </button>
              </div>
            )}

          {/* ═══ Sentiment Summary Footer ═══ */}
          <SentimentFooter articles={articles} />
          </>
        )}
        </div>{/* end left: news content */}

        {/* ═══ Right: Whale Alert Sidebar ═══ */}
        {whaleOpen && (
          <WhaleSidebar
            open={true}
            onClose={() => setWhaleOpen(false)}
            onCountChange={setWhaleAlertCount}
            mode="inline"
          />
        )}
      </div>
    </>
  );
}
