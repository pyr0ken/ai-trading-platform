import type { WhaleTransaction } from './types';
import { STORAGE_KEY, MAX_HISTORY } from './config';

/* ───────────────────────────────────────────────
   Client-side whale history (localStorage)
   ─────────────────────────────────────────────── */

export function getWhaleHistory(): WhaleTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addWhaleHistory(tx: WhaleTransaction): void {
  const history = getWhaleHistory();
  // dedup by id
  if (history.some((h) => h.id === tx.id)) return;
  history.unshift(tx);
  // trim
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearWhaleHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
