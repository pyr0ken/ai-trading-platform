/**
 * Next.js Server Instrumentation
 *
 * This file runs once when the Next.js server starts (both dev and prod).
 * We use it to fire the x_feed_engine scraper in the background so that
 * by the time the trader opens the dashboard, the tweet feed is fresh.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only trigger scraper on the Node.js runtime (not edge).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // Skip in production.
  if (process.env.NODE_ENV === 'production') return;

  // Small delay — let the server fully bind its port before we call ourselves.
  await new Promise((r) => setTimeout(r, 3000));

  try {
    const port = process.env.PORT ?? '3000';
    const res = await fetch(`http://localhost:${port}/api/intel/scrape-trigger`, {
      method: 'POST',
    });
    const data = await res.json();
    console.log('[x_feed_engine] startup trigger:', data.status, data.reason ?? data.pid ?? '');
  } catch {
    // Server might not be ready yet — not fatal, trader can scrape manually.
    console.warn('[x_feed_engine] startup trigger failed (server not ready)');
  }
}
