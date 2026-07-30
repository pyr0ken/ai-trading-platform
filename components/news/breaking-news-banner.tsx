'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { NewsArticle } from '@/types/news';

/* ───────────────────────────────────────────────
   Constants
   ─────────────────────────────────────────────── */

const DISMISSED_KEY = 'hermes_breaking_dismissed';
const POLL_INTERVAL = 60_000; // check every 60s

function getDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

/* ───────────────────────────────────────────────
   Breaking News Banner
   ─────────────────────────────────────────────── */

export function BreakingNewsBanner() {
  const [breaking, setBreaking] = useState<NewsArticle | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [enter, setEnter] = useState(false);

  /* ── Initial fetch + polling ── */
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = () => {
      // fetch + setState inline so there's no callback reference
      fetch('/api/news?limit=15')
        .then((r) => r.ok ? r.json() : Promise.reject())
        .then((data) => {
          if (!mounted) return;
          const articles: NewsArticle[] = data.articles || [];
          const dismissedIds = getDismissedIds();
          const breakingArticle = articles.find(
            (a) => a.category === 'breaking' && a.articleId && !dismissedIds.has(a.articleId)
          );
          if (breakingArticle) {
            setBreaking(breakingArticle);
            setDismissed(false);
            setTimeout(() => {
              if (mounted) setEnter(true);
            }, 50);
          } else {
            setBreaking(null);
            setEnter(false);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) timer = setTimeout(poll, POLL_INTERVAL);
        });
    };

    poll();
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Dismiss handler ── */
  const handleDismiss = useCallback(() => {
    if (!breaking?.articleId) return;
    setBreaking(null);
    setDismissed(true);
    // Persist dismissal
    const dismissedIds = getDismissedIds();
    dismissedIds.add(breaking.articleId!);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissedIds]));
  }, [breaking, getDismissedIds]);

  if (!breaking || dismissed) return null;

  return (
    <div
      className={`mx-2 md:mx-4 mt-2 transition-all duration-300 ease-out ${
        enter ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="relative bg-gradient-to-r from-rose-950/80 via-rose-950/40 to-[#040406] border border-rose-500/30 border-l-4 border-l-rose-500 rounded-[2px] shadow-lg shadow-rose-900/10">
        {/* Animated pulse ring */}
        <div className="absolute inset-0 rounded-[2px] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/5 to-transparent animate-pulse" />
        </div>

        <div className="relative flex items-start gap-3 px-4 py-3">
          {/* Icon */}
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/30">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="absolute inset-0 rounded-full animate-ping bg-rose-500/20 opacity-75" />
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-rose-400">
                ⚡ Breaking News
              </span>
              <span className="text-[9px] font-mono text-rose-400/50">·</span>
              <span className="text-[10px] font-mono text-[#777a88]">
                {breaking.source}
              </span>
            </div>

            <a
              href={breaking.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2"
            >
              <h4 className="text-[13px] font-sans font-medium text-[#e2e3e9] group-hover:text-rose-300 transition-colors duration-200 leading-snug">
                {breaking.title}
              </h4>
              <ExternalLink className="w-3 h-3 text-rose-400/60 group-hover:text-rose-300 shrink-0 transition-colors opacity-0 group-hover:opacity-100" />
            </a>
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded-[2px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#1c1d22] transition-all duration-200 cursor-pointer mt-0.5"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
