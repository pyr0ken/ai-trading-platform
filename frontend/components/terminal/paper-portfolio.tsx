'use client';

import React, { useState, useEffect } from 'react';
import { usePaperTrading } from '@/hooks/use-paper-trading';
import { AppStorageEngine } from '@/lib/storage/app-db';
import {
  Wallet,
  TrendingUp,
  XCircle,
  Play,
  RotateCcw,
  History,
  Lock,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface PaperPortfolioProps {
  currentPrice?: number;
  symbol?: string;
}

export const PaperPortfolio: React.FC<PaperPortfolioProps> = ({ currentPrice, symbol }) => {
  const {
    positions,
    account,
    openPosition,
    closePosition,
    resetAccount,
  } = usePaperTrading();

  const [watchlistSymbols] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const list = AppStorageEngine.getWatchlist();
      return list.map((item) => item.symbol);
    } catch {
      return [];
    }
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    if (symbol) return symbol;
    if (typeof window === 'undefined') return 'BTC/USDT';
    try {
      const list = AppStorageEngine.getWatchlist();
      return list.length > 0 ? list[0].symbol : 'BTC/USDT';
    } catch {
      return 'BTC/USDT';
    }
  });

  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [margin, setMargin] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(10);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  
  const [orderExecuted, setOrderExecuted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'performance'>('open');

  // Load parent prices first if available, otherwise fetch from Binance
  useEffect(() => {
    if (currentPrice && symbol) {
      setTimeout(() => {
        setSelectedSymbol(symbol);
        setEntryPrice(currentPrice);
        if (side === 'LONG') {
          setStopLoss(Number((currentPrice * 0.98).toFixed(2)));
          setTakeProfit(Number((currentPrice * 1.05).toFixed(2)));
        } else {
          setStopLoss(Number((currentPrice * 1.02).toFixed(2)));
          setTakeProfit(Number((currentPrice * 0.95).toFixed(2)));
        }
      }, 0);
      return;
    }

    const initPrices = async () => {
      try {
        const cleanPair = selectedSymbol.replace('/', '').toUpperCase();
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${cleanPair}`);
        if (res.ok) {
          const data = await res.json();
          const price = parseFloat(data.price);
          if (price > 0) {
            setEntryPrice(Number(price.toFixed(2)));
            if (side === 'LONG') {
              setStopLoss(Number((price * 0.98).toFixed(2)));
              setTakeProfit(Number((price * 1.05).toFixed(2)));
            } else {
              setStopLoss(Number((price * 1.02).toFixed(2)));
              setTakeProfit(Number((price * 0.95).toFixed(2)));
            }
          }
        }
      } catch {}
    };

    initPrices();
  }, [selectedSymbol, side, currentPrice, symbol]);

  const handleOpenOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryPrice || entryPrice <= 0) {
      setValidationError('Please specify a valid Entry Price.');
      return;
    }
    if (!stopLoss || stopLoss <= 0) {
      setValidationError('Please specify a valid Stop Loss Price.');
      return;
    }
    if (!takeProfit || takeProfit <= 0) {
      setValidationError('Please specify a valid Take Profit Price.');
      return;
    }

    setValidationError(null);

    const quantity = (margin * leverage) / entryPrice;

    openPosition({
      symbol: selectedSymbol,
      exchange: 'binance',
      side,
      entryPrice,
      quantity,
      leverage,
      stopLoss,
      takeProfit,
      margin,
    });

    setOrderExecuted(true);
    setTimeout(() => setOrderExecuted(false), 3000);
  };

  const openPositions = positions.filter((p) => p.status === 'OPEN');
  const closedPositions = positions.filter((p) => p.status === 'CLOSED');

  // Compute stats
  const totalMarginAllocated = openPositions.reduce((sum, p) => sum + p.margin, 0);
  const floatingPnL = openPositions.reduce((sum, p) => sum + p.pnl, 0);
  const equity = account ? account.balance + floatingPnL : 10000;

  return (
    <div className="space-y-6 font-mono text-xs text-[#e2e3e9]">
      {/* Account Info Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#040406] border border-[#1c1d22] p-4 rounded-none">
        <div className="space-y-1">
          <span className="text-[#5e616e] text-[9px] uppercase block">Cash Balance</span>
          <div className="flex items-center gap-1.5 text-base font-bold text-[#ffffff]">
            <Wallet className="w-4 h-4 text-[#cc9166]" />
            ${account?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[#5e616e] text-[9px] uppercase block">Account Equity</span>
          <div className="flex items-center gap-1.5 text-base font-bold text-[#ffffff]">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            ${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[#5e616e] text-[9px] uppercase block">Open Floating PnL</span>
          <div
            className={`text-base font-bold flex items-center gap-1 mt-0.5 ${
              floatingPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {floatingPnL >= 0 ? '+' : ''}
            ${floatingPnL.toFixed(2)}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[#5e616e] text-[9px] uppercase block">Margin In Use</span>
          <div className="flex items-center gap-1.5 text-base font-bold text-[#9194a1]">
            <Lock className="w-4 h-4 text-[#5e616e]" />
            ${totalMarginAllocated.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Order Panel */}
        <div className="lg:col-span-4 bg-[#040406] border border-[#1c1d22] p-4 rounded-none space-y-4">
          <div className="text-[10px] uppercase font-bold text-[#cc9166] border-b border-[#1c1d22]/50 pb-1.5 flex items-center gap-1">
            <Play className="w-3.5 h-3.5 fill-current" />
            Instant Simulation Order
          </div>

          <form onSubmit={handleOpenOrder} className="space-y-4">
            <div>
              <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Asset Symbol</label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full bg-[#121317] border border-[#1c1d22] px-3 py-2 text-[#ffffff] font-bold outline-none uppercase"
              >
                {watchlistSymbols.length > 0 ? (
                  watchlistSymbols.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="BTC/USDT">BTC/USDT</option>
                    <option value="ETH/USDT">ETH/USDT</option>
                    <option value="SOL/USDT">SOL/USDT</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Order Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('LONG')}
                  className={`py-2 px-3 border text-center font-bold font-sans cursor-pointer ${
                    side === 'LONG'
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                      : 'bg-[#121317] border-[#1c1d22] text-[#9194a1]'
                  }`}
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SHORT')}
                  className={`py-2 px-3 border text-center font-bold font-sans cursor-pointer ${
                    side === 'SHORT'
                      ? 'bg-rose-950/60 text-rose-400 border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                      : 'bg-[#121317] border-[#1c1d22] text-[#9194a1]'
                  }`}
                >
                  SHORT
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Entry Price ($)</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="w-full bg-[#121317] border border-[#1c1d22] px-3 py-2 text-[#ffffff] font-bold outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Margin ($)</label>
                <input
                  type="number"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full bg-[#121317] border border-[#1c1d22] px-2.5 py-1.5 text-[#ffffff] font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Leverage (x)</label>
                <input
                  type="number"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full bg-[#121317] border border-[#1c1d22] px-2.5 py-1.5 text-[#ffffff] font-bold outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-emerald-500 text-[9px] uppercase mb-1">Take Profit ($)</label>
                <input
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(Number(e.target.value))}
                  className="w-full bg-[#121317] border border-emerald-500/30 px-2.5 py-1.5 text-emerald-400 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-rose-500 text-[9px] uppercase mb-1">Stop Loss ($)</label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="w-full bg-[#121317] border border-rose-500/30 px-2.5 py-1.5 text-rose-400 font-bold outline-none"
                />
              </div>
            </div>

            {validationError && (
              <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 p-2.5 text-center font-bold">
                {validationError}
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3 font-bold font-sans transition-all cursor-pointer uppercase text-xs tracking-wider ${
                orderExecuted
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500'
                  : 'bg-[#cc9166] text-[#08080a] hover:bg-[#d6a27e]'
              }`}
            >
              {orderExecuted ? '✓ Position Opened' : 'Open Active Position'}
            </button>
          </form>
        </div>

        {/* Right Side: Position Tables */}
        <div className="lg:col-span-8 bg-[#040406] border border-[#1c1d22] p-4 rounded-none flex flex-col min-h-[400px]">
          {/* Tab Navigation */}
          <div className="flex border-b border-[#1c1d22] mb-4 text-[10px] font-mono">
            <button
              onClick={() => setActiveTab('open')}
              className={`pb-2 px-4 border-b-2 font-bold cursor-pointer uppercase tracking-wider ${
                activeTab === 'open' ? 'border-[#cc9166] text-[#cc9166]' : 'border-transparent text-[#5e616e] hover:text-[#e2e3e9]'
              }`}
            >
              Open Positions ({openPositions.length})
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`pb-2 px-4 border-b-2 font-bold cursor-pointer uppercase tracking-wider ${
                activeTab === 'closed' ? 'border-[#cc9166] text-[#cc9166]' : 'border-transparent text-[#5e616e] hover:text-[#e2e3e9]'
              }`}
            >
              Trade History ({closedPositions.length})
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`pb-2 px-4 border-b-2 font-bold cursor-pointer uppercase tracking-wider ${
                activeTab === 'performance' ? 'border-[#cc9166] text-[#cc9166]' : 'border-transparent text-[#5e616e] hover:text-[#e2e3e9]'
              }`}
            >
              Account Performance
            </button>
          </div>

          {/* Positions tables */}
          <div className="flex-1 overflow-x-auto">
            {activeTab === 'open' && (
              <>
                {openPositions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#5e616e]">
                    <Wallet className="w-10 h-10 mb-2 stroke-[1]" />
                    <div className="font-bold uppercase text-[9px] text-[#9194a1] mb-1">No Open Positions</div>
                    <p className="max-w-[280px] text-[11px] leading-relaxed">
                      Use the order form on the left or zapping AI recommendations to deploy mock capital into open trades.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left font-mono">
                    <thead>
                      <tr className="border-b border-[#1c1d22] text-[#5e616e] text-[9px] uppercase">
                        <th className="pb-2">Asset</th>
                        <th className="pb-2">Side</th>
                        <th className="pb-2">Lev</th>
                        <th className="pb-2">Margin</th>
                        <th className="pb-2">Entry</th>
                        <th className="pb-2">Mark Price</th>
                        <th className="pb-2 text-right">PnL</th>
                        <th className="pb-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openPositions.map((pos) => {
                        const isLong = pos.side === 'LONG';
                        return (
                          <tr key={pos.id} className="border-b border-[#1c1d22]/50 hover:bg-[#121317]/30 text-[11px]">
                            <td className="py-2.5 font-bold uppercase">{pos.symbol}</td>
                            <td className="py-2.5">
                              <span className={isLong ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                {pos.side}
                              </span>
                            </td>
                            <td className="py-2.5">{pos.leverage}x</td>
                            <td className="py-2.5">${pos.margin}</td>
                            <td className="py-2.5">${pos.entryPrice}</td>
                            <td className="py-2.5">${pos.currentPrice.toFixed(2)}</td>
                            <td
                              className={`py-2.5 text-right font-bold ${
                                pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {pos.pnl >= 0 ? '+' : ''}
                              ${pos.pnl.toFixed(2)} ({pos.pnlPct}%)
                            </td>
                            <td className="py-2.5 text-center">
                              <button
                                onClick={() => closePosition(pos.id, pos.currentPrice)}
                                className="text-rose-400 hover:text-rose-300 font-bold px-2 py-0.5 border border-rose-500/20 bg-rose-950/20 hover:bg-rose-900/30 transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Close
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {activeTab === 'closed' && (
              <>
                {closedPositions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#5e616e]">
                    <History className="w-10 h-10 mb-2 stroke-[1]" />
                    <div className="font-bold uppercase text-[9px] text-[#9194a1] mb-1">No Historical Trades</div>
                    <p className="max-w-[280px] text-[11px] leading-relaxed">
                      Closed positions will appear here to log aggregate auditing history.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left font-mono">
                    <thead>
                      <tr className="border-b border-[#1c1d22] text-[#5e616e] text-[9px] uppercase">
                        <th className="pb-2">Asset</th>
                        <th className="pb-2">Side</th>
                        <th className="pb-2">Lev</th>
                        <th className="pb-2">Margin</th>
                        <th className="pb-2">Entry</th>
                        <th className="pb-2">Exit</th>
                        <th className="pb-2 text-right">Realized PnL</th>
                        <th className="pb-2 text-right">Time Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedPositions.map((pos) => {
                        const isLong = pos.side === 'LONG';
                        return (
                          <tr key={pos.id} className="border-b border-[#1c1d22]/50 text-[11px]">
                            <td className="py-2.5 font-bold uppercase">{pos.symbol}</td>
                            <td className="py-2.5">
                              <span className={isLong ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                {pos.side}
                              </span>
                            </td>
                            <td className="py-2.5">{pos.leverage}x</td>
                            <td className="py-2.5">${pos.margin}</td>
                            <td className="py-2.5">${pos.entryPrice}</td>
                            <td className="py-2.5">${pos.currentPrice}</td>
                            <td
                              className={`py-2.5 text-right font-bold ${
                                pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {pos.pnl >= 0 ? '+' : ''}
                              ${pos.pnl} ({pos.pnlPct}%)
                            </td>
                            <td className="py-2.5 text-right text-[#5e616e]">
                              {pos.closedAt ? new Date(pos.closedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }) : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6 pt-2">
                {/* Visual Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#121317] border border-[#1c1d22] p-3 text-center">
                    <div className="text-[9px] text-[#5e616e] uppercase">Win Rate</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
                      {account ? Math.round((account.wins / (account.totalTrades || 1)) * 100) : 0}
                      <Percent className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>

                  <div className="bg-[#121317] border border-[#1c1d22] p-3 text-center">
                    <div className="text-[9px] text-[#5e616e] uppercase">Total Positions</div>
                    <div className="text-xl font-bold text-[#ffffff] mt-1">{account?.totalTrades || 0} Trades</div>
                  </div>

                  <div className="bg-[#121317] border border-[#1c1d22] p-3 text-center">
                    <div className="text-[9px] text-[#5e616e] uppercase">Net Profit ($)</div>
                    <div
                      className={`text-xl font-bold mt-1 ${
                        account && account.balance >= 10000 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {account && account.balance >= 10000 ? '+' : ''}
                      {account ? (account.balance - 10000).toFixed(2) : 0}
                    </div>
                  </div>

                  <div className="bg-[#121317] border border-[#1c1d22] p-3 text-center">
                    <div className="text-[9px] text-[#5e616e] uppercase">Audited Ratio</div>
                    <div className="text-xl font-bold mt-1 text-[#e2e3e9]">
                      <span className="text-emerald-400">{account?.wins || 0} W</span>
                      <span className="text-[#5e616e] mx-1">/</span>
                      <span className="text-rose-400">{account?.losses || 0} L</span>
                    </div>
                  </div>
                </div>

                {/* Equity Curve Chart */}
                {account && account.balanceHistory.length > 1 && (
                  <div className="w-full">
                    <div className="text-[9px] text-[#5e616e] uppercase mb-2">Simulated Equity Growth</div>
                    <div className="w-full h-[180px] bg-[#08080a] border border-[#1c1d22] p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={account.balanceHistory.map((pt, i) => ({ name: `T-${i}`, balance: pt.balance }))} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorAccountBalance" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#cc9166" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#cc9166" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#1c1d22" strokeDasharray="3 3" />
                          <XAxis dataKey="name" stroke="#5e616e" fontSize={9} />
                          <YAxis stroke="#5e616e" fontSize={9} domain={['dataMin - 50', 'dataMax + 50']} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#08080a', borderColor: '#1c1d22' }}
                            itemStyle={{ color: '#e2e3e9', fontSize: 11 }}
                            labelStyle={{ color: '#5e616e', fontSize: 9 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="#cc9166"
                            fillOpacity={1}
                            fill="url(#colorAccountBalance)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-[#1c1d22]/30">
                  <button
                    onClick={resetAccount}
                    className="flex items-center gap-1.5 py-2 px-4 border border-rose-500/20 bg-rose-950/20 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 transition-all font-bold uppercase tracking-wider text-[10px] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Simulation Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
