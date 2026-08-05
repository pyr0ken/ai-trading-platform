import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadTweetFeed } from '@/lib/intel/intel-aggregator';

/**
 * The scraper seeds its SQLite schema with a dummy row (user "u", text "t")
 * before its first real run. That row must never reach the model: fabricated
 * social intelligence is worse than none.
 */

const dirs: string[] = [];

function writeFeed(contents: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'feed-'));
  dirs.push(dir);
  const file = join(dir, 'tweets_ai_feed.json');
  writeFileSync(file, JSON.stringify(contents), 'utf-8');
  return file;
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

const PLACEHOLDER = {
  target_account: 'u',
  user: 'u',
  tweet_url: 'https://x.com/u/status/1',
  text: 't',
  content_text: 't',
  quoted_text: null,
  timestamp: '2026-08-04T00:00:00Z',
};

const REAL = {
  target_account: 'realDonaldTrump',
  user: 'realDonaldTrump',
  tweet_url: 'https://x.com/realDonaldTrump/status/123',
  text: 'We are imposing new tariffs on all steel imports effective Monday.',
  timestamp: '2026-08-05T00:00:00Z',
  like_count: 1000,
  retweet_count: 200,
  reply_count: 50,
};

describe('loadTweetFeed', () => {
  it('rejects the scraper placeholder row', async () => {
    const feed = await loadTweetFeed(writeFeed([PLACEHOLDER]));
    expect(feed).toEqual([]);
  });

  it('keeps real tweets and drops placeholders in a mixed feed', async () => {
    const feed = await loadTweetFeed(writeFeed([PLACEHOLDER, REAL]));
    expect(feed).toHaveLength(1);
    expect(feed[0].target_account).toBe('realDonaldTrump');
  });

  it('never fabricates tweets when the file is missing', async () => {
    const feed = await loadTweetFeed(join(tmpdir(), 'does-not-exist-xyz.json'));
    expect(feed).toEqual([]);
  });

  it('never fabricates tweets when the file is empty', async () => {
    expect(await loadTweetFeed(writeFeed([]))).toEqual([]);
  });

  it('survives malformed JSON without throwing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'feed-'));
    dirs.push(dir);
    const file = join(dir, 'bad.json');
    writeFileSync(file, '{ this is not json', 'utf-8');
    expect(await loadTweetFeed(file)).toEqual([]);
  });

  it('accepts tweets that only populate content_text', async () => {
    const feed = await loadTweetFeed(
      writeFeed([{ ...REAL, text: undefined, content_text: REAL.text }])
    );
    expect(feed).toHaveLength(1);
  });
});
