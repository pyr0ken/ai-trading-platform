/**
 * /api/intel/scrape-trigger
 *
 * Called automatically when the Next.js dev server starts (via
 * instrumentation.ts) and also available as a manual endpoint.
 *
 * Spawns the x_feed_engine scraper in the background — fire-and-forget.
 * The endpoint returns immediately so it never blocks the UI.
 *
 * The scraper writes to:
 *   x_feed_engine/data/tweets_ai_feed.json   ← consumed by loadTweetFeed()
 *
 * POST /api/intel/scrape-trigger
 *   → { status: "started" | "already_running" | "skipped", pid?: number }
 */

import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

// Singleton: only one scraper process at a time.
let scraperPid: number | null = null;
let lastRunAt: number | null = null;

// Don't re-run if last scrape was less than 20 minutes ago.
const MIN_INTERVAL_MS = 20 * 60 * 1000;

export async function POST() {
  // Skip in production builds — scraper is a local dev/trading tool.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ status: 'skipped', reason: 'production' });
  }

  // Rate-limit guard.
  if (lastRunAt && Date.now() - lastRunAt < MIN_INTERVAL_MS) {
    const secondsAgo = Math.round((Date.now() - lastRunAt) / 1000);
    return NextResponse.json({
      status: 'skipped',
      reason: `ran ${secondsAgo}s ago — next allowed in ${Math.round((MIN_INTERVAL_MS - (Date.now() - lastRunAt)) / 60000)}m`,
    });
  }

  // Already running guard.
  if (scraperPid !== null) {
    return NextResponse.json({ status: 'already_running', pid: scraperPid });
  }

  // Resolve paths.
  const engineDir = path.resolve(
    process.cwd(),
    '..',
    '..',
    'market-data-ai-analyzer',
    'x_feed_engine'
  );
  const pythonExe = path.join(engineDir, '.venv', 'Scripts', 'python.exe');
  const mainPy = path.join(engineDir, 'main.py');

  if (!fs.existsSync(pythonExe) || !fs.existsSync(mainPy)) {
    return NextResponse.json(
      { status: 'skipped', reason: 'x_feed_engine not found at expected path' },
      { status: 200 }
    );
  }

  const logDir = path.join(process.cwd(), 'logs', 'x-scraper');
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `scrape-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  const child = spawn(
    pythonExe,
    ['main.py', '--non-interactive', '--auth-mode', 'existing', '--export-age-hours', '48'],
    {
      cwd: engineDir,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  scraperPid = child.pid ?? null;
  lastRunAt = Date.now();

  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);

  child.on('close', (code) => {
    scraperPid = null;
    logStream.end(`\n[exit code ${code}]\n`);
  });

  child.on('error', () => {
    scraperPid = null;
    logStream.end('\n[spawn error]\n');
  });

  return NextResponse.json({ status: 'started', pid: scraperPid, log: logFile });
}

// GET — health check: tells the UI whether scraper is running and when it last ran.
export async function GET() {
  return NextResponse.json({
    running: scraperPid !== null,
    pid: scraperPid,
    lastRunAt: lastRunAt ? new Date(lastRunAt).toISOString() : null,
    nextAllowedIn: lastRunAt
      ? Math.max(0, Math.round((MIN_INTERVAL_MS - (Date.now() - lastRunAt)) / 1000))
      : 0,
  });
}
