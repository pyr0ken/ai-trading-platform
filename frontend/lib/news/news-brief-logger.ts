'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { NewsArticle, NewsIntelligenceBrief } from '@/types/news';

const LOG_DIR = path.resolve(process.cwd(), 'logs', 'news-intelligence');
const MAX_KEPT_FILES = Number(process.env.NEWS_BRIEF_LOG_MAX_FILES || '30');

/**
 * Persist a generated news brief alongside the articles it was derived from.
 *
 * Mirrors the llm-prompts logging pattern so briefs can be audited the same
 * way: you can confirm the model's macro read was grounded in real headlines
 * and catch drift between the deterministic and LLM passes.
 *
 * Logging must NEVER break analysis — all failures are swallowed by callers.
 */
export async function logNewsBrief(
  brief: NewsIntelligenceBrief,
  articles: NewsArticle[]
): Promise<string> {
  await fs.mkdir(LOG_DIR, { recursive: true });

  const timestamp = brief.generatedAt || new Date().toISOString();
  const mode = brief.isFallback ? 'fallback' : 'llm';
  const filename = `${timestamp.replace(/[:.]/g, '-')}_${mode}_${articles.length}articles.json`;
  const filepath = path.join(LOG_DIR, filename);

  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        generatedAt: timestamp,
        source: mode,
        aggregateBias: brief.aggregateBias,
        biasConfidence: brief.biasConfidence,
        counts: {
          articles: articles.length,
          macroDrivers: brief.macroDrivers.length,
          assetImpacts: brief.assetImpacts.length,
          eventRisks: brief.eventRisks.length,
          articleImpacts: brief.articleImpacts.length,
        },
        brief,
        sourceArticles: articles.map((a) => ({
          articleId: a.articleId,
          title: a.title,
          source: a.source,
          category: a.category,
          publishedAt: a.published_at,
          url: a.url,
        })),
      },
      null,
      2
    ),
    'utf-8'
  );

  await rotateLogFiles();

  return filepath;
}

/**
 * Keep the log directory bounded. Oldest files are removed first.
 */
async function rotateLogFiles(): Promise<void> {
  try {
    const files = await fs.readdir(LOG_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    if (jsonFiles.length <= MAX_KEPT_FILES) return;

    const withTimes = await Promise.all(
      jsonFiles.map(async (name) => {
        const full = path.join(LOG_DIR, name);
        try {
          const stat = await fs.stat(full);
          return { path: full, mtime: stat.mtimeMs };
        } catch {
          return { path: full, mtime: 0 };
        }
      })
    );

    withTimes.sort((a, b) => a.mtime - b.mtime);
    const toDelete = withTimes.slice(0, withTimes.length - MAX_KEPT_FILES);

    await Promise.all(toDelete.map((f) => fs.unlink(f.path).catch(() => {})));
  } catch {
    // Rotation failure is non-fatal.
  }
}
