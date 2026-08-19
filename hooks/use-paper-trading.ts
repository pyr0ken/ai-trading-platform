'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppStorageEngine } from '@/lib/storage/app-db';
import { PaperPosition, PaperAccount } from '@/types/paper-trading';

const fetchClientSidePrice = async (symbol: string): Promise<number | null> => {
  const cleanPair = symbol.replace('/', '').toUpperCase();
  const kucoinPair = symbol.replace('/', '-').toUpperCase();

  // Hard 8s deadline per attempt — prevents hanging fetches piling up when network is down
  const fetchWithTimeout = (url: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
  };

  try {
    const res = await fetchWithTimeout(`https://api.binance.com/api/v3/ticker/price?symbol=${cleanPair}`);
    if (res.ok) {
      const data = await res.json();
      const p = parseFloat(data.price);
      if (p > 0) return p;
    }
  } catch {
    // timeout or network error — try next source
  }

  try {
    const res = await fetchWithTimeout(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${kucoinPair}`);
    if (res.ok) {
      const json = await res.json();
      const p = parseFloat(json?.data?.price);
      if (p > 0) return p;
    }
  } catch {
    // timeout or network error
  }

  return null;
};

export function usePaperTrading() {
  const [positions, setPositions] = useState<PaperPosition[]>(() => {
    if (typeof window === 'undefined') return [];
    return AppStorageEngine.getPaperPositions();
  });
  const [account, setAccount] = useState<PaperAccount | null>(() => {
    if (typeof window === 'undefined') return null;
    return AppStorageEngine.getPaperAccount();
  });

  const refresh = useCallback(() => {
    setPositions(AppStorageEngine.getPaperPositions());
    setAccount(AppStorageEngine.getPaperAccount());
  }, []);

  useEffect(() => {
    AppStorageEngine.fetchPaperFromDb().then(() => {
      refresh();
    });
    const handleStorage = () => refresh();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleStorage);
    };
  }, [refresh]);

  const openPosition = useCallback((
    pos: Omit<PaperPosition, 'id' | 'pnl' | 'pnlPct' | 'status' | 'openedAt' | 'currentPrice'>
  ) => {
    AppStorageEngine.openPaperPosition(pos);
    refresh();
  }, [refresh]);

  const closePosition = useCallback((id: string, exitPrice: number) => {
    AppStorageEngine.closePaperPosition(id, exitPrice);
    refresh();
  }, [refresh]);

  const resetAccount = useCallback(() => {
    AppStorageEngine.resetPaperTrading();
    refresh();
  }, [refresh]);

  // Live monitoring of open positions
  // positionsRef keeps the interval stable (no teardown/rebuild every 6s)
  const positionsRef = useRef<PaperPosition[]>(positions);
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const openPositionsCount = positions.filter((p) => p.status === 'OPEN').length;

  useEffect(() => {
    if (openPositionsCount === 0) return;

    let isSubscribed = true;

    const monitorPrices = async () => {
      if (document.hidden) return;
      let updatedAny = false;
      const currentList = AppStorageEngine.getPaperPositions();
      const activePositions = currentList.filter((p) => p.status === 'OPEN');
      if (activePositions.length === 0) return;

      const pricePromises = activePositions.map(async (pos) => {
        const livePrice = await fetchClientSidePrice(pos.symbol);
        return { pos, livePrice };
      });

      const results = await Promise.all(pricePromises);

      for (const { pos, livePrice } of results) {
        if (!livePrice || !isSubscribed) continue;

        const isLong = pos.side === 'LONG';
        const hitSL = isLong ? livePrice <= pos.stopLoss : livePrice >= pos.stopLoss;
        const hitTP = isLong ? livePrice >= pos.takeProfit : livePrice <= pos.takeProfit;

        if (hitSL) {
          AppStorageEngine.closePaperPosition(pos.id, pos.stopLoss);
          updatedAny = true;
        } else if (hitTP) {
          AppStorageEngine.closePaperPosition(pos.id, pos.takeProfit);
          updatedAny = true;
        } else {
          const list = AppStorageEngine.getPaperPositions();
          const pIdx = list.findIndex((p) => p.id === pos.id);
          if (pIdx !== -1 && list[pIdx].status === 'OPEN') {
            const currentPos = list[pIdx];
            currentPos.currentPrice = livePrice;
            const diff = isLong ? livePrice - pos.entryPrice : pos.entryPrice - livePrice;
            const pnlPct = (diff / pos.entryPrice) * pos.leverage;
            currentPos.pnl = Number((pos.margin * pnlPct).toFixed(2));
            currentPos.pnlPct = Number((pnlPct * 100).toFixed(2));
            AppStorageEngine.savePaperPositions(list);
            updatedAny = true;
          }
        }
      }

      if (updatedAny && isSubscribed) {
        refresh();
      }
    };

    monitorPrices();
    const interval = setInterval(monitorPrices, 6000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [openPositionsCount, refresh]);

  return {
    positions,
    account,
    openPosition,
    closePosition,
    resetAccount,
    refresh,
  };
}
