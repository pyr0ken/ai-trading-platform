import type { WhaleTransaction } from './types';
import { MAX_HISTORY } from './config';

let cachedWhaleHistory: WhaleTransaction[] = [];

export function getWhaleHistory(): WhaleTransaction[] {
  return cachedWhaleHistory;
}

export function addWhaleHistory(tx: WhaleTransaction): void {
  if (cachedWhaleHistory.some((h) => h.id === tx.id)) return;
  cachedWhaleHistory.unshift(tx);
  if (cachedWhaleHistory.length > MAX_HISTORY) cachedWhaleHistory.length = MAX_HISTORY;

  fetch('/api/db/whale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions: [tx] }),
  }).catch(() => {});
}

export function clearWhaleHistory(): void {
  cachedWhaleHistory = [];
}
