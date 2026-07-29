'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppStorageEngine } from '@/lib/storage/app-db';
import { PaperPosition, PaperAccount } from '@/types/paper-trading';

const fetchClientSidePrice = async (symbol: string): Promise<number | null> => {
  const cleanPair = symbol.replace('/', '').toUpperCase();
  const kucoinPair = symbol.replace('/', '-').toUpperCase();

  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${cleanPair}`);
    if (res.ok) {
      const data = await res.json();
      const p = parseFloat(data.price);
      if (p > 0) return p;
    }
  } catch {}

  try {
    const res = await fetch(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${kucoinPair}`);
    if (res.ok) {
      const json = await res.json();
      const p = parseFloat(json?.data?.price);
      if (p > 0) return p;
    }
  } catch {}

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
  useEffect(() => {
    const activeOpen = positions.filter(p => p.status === 'OPEN');
    if (activeOpen.length === 0) return;

    let isSubscribed = true;

    const monitorPrices = async () => {
      let updatedAny = false;
      const currentList = AppStorageEngine.getPaperPositions();

      for (const pos of currentList) {
        if (pos.status !== 'OPEN') continue;

        const livePrice = await fetchClientSidePrice(pos.symbol);
        if (!livePrice || !isSubscribed) continue;

        // Check if Stop Loss or Take Profit is hit
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
          // Update current price & floating PnL
          const list = AppStorageEngine.getPaperPositions();
          const pIdx = list.findIndex(p => p.id === pos.id);
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

    // Run immediately and then on a 6-second interval
    monitorPrices();
    const interval = setInterval(monitorPrices, 6000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [positions, refresh]);

  return {
    positions,
    account,
    openPosition,
    closePosition,
    resetAccount,
    refresh,
  };
}
