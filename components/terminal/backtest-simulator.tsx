'use client';

import React, { useState, useEffect } from 'react';
import { FullMarketContextPayload } from '@/types/analysis';
import {
  Play,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  BarChart2,
  Briefcase,
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

interface BacktestSimulatorProps {
  marketContext?: FullMarketContextPayload | null;
  latestTradeSetup?: {
    position: 'LONG' | 'SHORT' | 'NEUTRAL';
    entry_range?: [number, number];
    stop_loss?: number;
    take_profit_1?: number;
    recommended_leverage?: string;
  } | null;
}

interface BacktestTrade {
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  outcome: 'WIN' | 'LOSS';
  time: string;
}

interface EquityCurvePoint {
  name: string;
  balance: number;
}

export const BacktestSimulator: React.FC<BacktestSimulatorProps> = ({
  marketContext,
  latestTradeSetup,
}) => {
  const [startBalance, setStartBalance] = useState<number>(10000);
  const [position, setPosition] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  const [leverage, setLeverage] = useState<number>(5);
  const riskPerTrade = 100; // 100% of equity allocated per trade

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<{
    totalTrades: number;
    winRate: number;
    netProfit: number;
    netProfitPct: number;
    finalBalance: number;
    maxDrawdown: number;
    tradeHistory: BacktestTrade[];
    equityCurve: EquityCurvePoint[];
  } | null>(null);

  // Auto-populate when trade setup arrives
  useEffect(() => {
    if (latestTradeSetup && latestTradeSetup.position !== 'NEUTRAL') {
      const entry = latestTradeSetup.entry_range 
        ? (latestTradeSetup.entry_range[0] + latestTradeSetup.entry_range[1]) / 2 
        : marketContext?.ticker?.price || 0;
      
      const lev = parseInt(latestTradeSetup.recommended_leverage || '5');

      // Wrap state updates in microtask / setTimeout to prevent synchronous react render warnings
      setTimeout(() => {
        setPosition(latestTradeSetup.position === 'LONG' ? 'LONG' : 'SHORT');
        setEntryPrice(Number(entry.toFixed(2)));
        setStopLoss(latestTradeSetup.stop_loss || 0);
        setTakeProfit(latestTradeSetup.take_profit_1 || 0);
        setLeverage(isNaN(lev) ? 5 : lev);
      }, 0);
    } else if (marketContext?.ticker?.price) {
      setTimeout(() => {
        setEntryPrice(marketContext.ticker.price);
        setStopLoss(Number((marketContext.ticker.price * 0.98).toFixed(2)));
        setTakeProfit(Number((marketContext.ticker.price * 1.05).toFixed(2)));
      }, 0);
    }
  }, [latestTradeSetup, marketContext]);

  const handleRunBacktest = () => {
    if (!marketContext) return;
    
    // Get candles for the primary timeframe (reverse chronological to chronological)
    const tf = marketContext.metadata.primaryTimeframe;
    const rawCandles = marketContext.timeframes[tf]?.candles || [];
    if (rawCandles.length < 10) return;

    setIsRunning(true);

    // Sort candles chronologically (just in case they are reversed)
    const candles = [...rawCandles].sort((a, b) => a.timestamp - b.timestamp);

    let balance = startBalance;
    let peakBalance = startBalance;
    let maxDD = 0;
    const tradeHistory: BacktestTrade[] = [];
    const equityCurve: EquityCurvePoint[] = [{ name: 'Start', balance: startBalance }];

    let activeTrade: {
      entryIndex: number;
      entryPrice: number;
      entryTime: string;
      size: number;
    } | null = null;

    // Simulation loop
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const timeStr = new Date(candle.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });

      if (!activeTrade) {
        // Look for entry trigger
        // We simulate a limit order at entryPrice
        const hitEntry = candle.low <= entryPrice && candle.high >= entryPrice;
        if (hitEntry) {
          const tradeSize = (balance * (riskPerTrade / 100));
          activeTrade = {
            entryIndex: i,
            entryPrice: entryPrice,
            entryTime: timeStr,
            size: tradeSize,
          };
        }
      } else {
        // Trade is active, check exits
        if (position === 'LONG') {
          // Check Stop Loss
          const hitSL = candle.low <= stopLoss;
          // Check Take Profit
          const hitTP = candle.high >= takeProfit;

          if (hitSL && hitTP) {
            // High volatility candle, assume worst case (hit SL)
            const pnlPct = ((stopLoss - activeTrade.entryPrice) / activeTrade.entryPrice) * leverage;
            const pnl = activeTrade.size * pnlPct;
            balance += pnl;
            tradeHistory.push({
              type: 'LONG',
              entryPrice: activeTrade.entryPrice,
              exitPrice: stopLoss,
              pnl,
              pnlPct: pnlPct * 100,
              outcome: 'LOSS',
              time: timeStr,
            });
            activeTrade = null;
          } else if (hitSL) {
            const pnlPct = ((stopLoss - activeTrade.entryPrice) / activeTrade.entryPrice) * leverage;
            const pnl = activeTrade.size * pnlPct;
            balance += pnl;
            tradeHistory.push({
              type: 'LONG',
              entryPrice: activeTrade.entryPrice,
              exitPrice: stopLoss,
              pnl,
              pnlPct: pnlPct * 100,
              outcome: 'LOSS',
              time: timeStr,
            });
            activeTrade = null;
          } else if (hitTP) {
            const pnlPct = ((takeProfit - activeTrade.entryPrice) / activeTrade.entryPrice) * leverage;
            const pnl = activeTrade.size * pnlPct;
            balance += pnl;
            tradeHistory.push({
              type: 'LONG',
              entryPrice: activeTrade.entryPrice,
              exitPrice: takeProfit,
              pnl,
              pnlPct: pnlPct * 100,
              outcome: 'WIN',
              time: timeStr,
            });
            activeTrade = null;
          }
        } else {
          // SHORT Position
          const hitSL = candle.high >= stopLoss;
          const hitTP = candle.low <= takeProfit;

          if (hitSL && hitTP) {
            const pnlPct = ((activeTrade.entryPrice - stopLoss) / activeTrade.entryPrice) * leverage;
            const pnl = activeTrade.size * pnlPct;
            balance += pnl;
            tradeHistory.push({
              type: 'SHORT',
              entryPrice: activeTrade.entryPrice,
              exitPrice: stopLoss,
              pnl,
              pnlPct: pnlPct * 100,
              outcome: 'LOSS',
              time: timeStr,
            });
            activeTrade = null;
          } else if (hitSL) {
            const pnlPct = ((activeTrade.entryPrice - stopLoss) / activeTrade.entryPrice) * leverage;
            const pnl = activeTrade.size * pnlPct;
            balance += pnl;
            tradeHistory.push({
              type: 'SHORT',
              entryPrice: activeTrade.entryPrice,
              exitPrice: stopLoss,
              pnl,
              pnlPct: pnlPct * 100,
              outcome: 'LOSS',
              time: timeStr,
            });
            activeTrade = null;
          } else if (hitTP) {
            const pnlPct = ((activeTrade.entryPrice - takeProfit) / activeTrade.entryPrice) * leverage;
            const pnl = activeTrade.size * pnlPct;
            balance += pnl;
            tradeHistory.push({
              type: 'SHORT',
              entryPrice: activeTrade.entryPrice,
              exitPrice: takeProfit,
              pnl,
              pnlPct: pnlPct * 100,
              outcome: 'WIN',
              time: timeStr,
            });
            activeTrade = null;
          }
        }
      }

      // Record equity curve point
      equityCurve.push({
        name: timeStr,
        balance: Number(balance.toFixed(2)),
      });

      // Calculate drawdown
      if (balance > peakBalance) peakBalance = balance;
      const dd = ((peakBalance - balance) / peakBalance) * 100;
      if (dd > maxDD) maxDD = dd;
    }

    const wins = tradeHistory.filter((t) => t.outcome === 'WIN').length;
    const winRate = tradeHistory.length > 0 ? (wins / tradeHistory.length) * 100 : 0;
    const netProfit = balance - startBalance;
    const netProfitPct = (netProfit / startBalance) * 100;

    setResults({
      totalTrades: tradeHistory.length,
      winRate: Math.round(winRate),
      netProfit: Number(netProfit.toFixed(2)),
      netProfitPct: Number(netProfitPct.toFixed(2)),
      finalBalance: Number(balance.toFixed(2)),
      maxDrawdown: Number(maxDD.toFixed(2)),
      tradeHistory,
      equityCurve,
    });

    setIsRunning(false);
  };

  const handleReset = () => {
    setResults(null);
  };

  return (
    <div className="bg-[#040406] border border-[#1c1d22] p-5 text-[#e2e3e9] space-y-5 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <span className="eyebrow-copper flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-[#cc9166]" />
          HISTORICAL STRATEGY BACKTESTER
        </span>
        <span className="text-[10px] text-[#5e616e]">Simulation Engine</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Parameters Form */}
        <div className="lg:col-span-4 space-y-4 bg-[#08080a] border border-[#1c1d22] p-4 rounded-none">
          <div className="text-[10px] uppercase font-bold text-[#cc9166] border-b border-[#1c1d22]/50 pb-1.5 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5" />
            Test Parameters
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Starting Capital ($)</label>
              <input
                type="number"
                value={startBalance}
                onChange={(e) => setStartBalance(Number(e.target.value))}
                className="w-full bg-[#121317] border border-[#1c1d22] px-3 py-2 text-[#ffffff] font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPosition('LONG')}
                  className={`py-2 px-3 border text-center font-bold font-sans cursor-pointer ${
                    position === 'LONG'
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                      : 'bg-[#121317] border-[#1c1d22] text-[#9194a1]'
                  }`}
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('SHORT')}
                  className={`py-2 px-3 border text-center font-bold font-sans cursor-pointer ${
                    position === 'SHORT'
                      ? 'bg-rose-950/60 text-rose-400 border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                      : 'bg-[#121317] border-[#1c1d22] text-[#9194a1]'
                  }`}
                >
                  SHORT
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Entry Price ($)</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
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

            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunBacktest}
                disabled={isRunning || !entryPrice || !stopLoss || !takeProfit}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#cc9166] text-[#08080a] font-bold hover:bg-[#d6a27e] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase text-xs tracking-wider"
              >
                <Play className="w-4 h-4 fill-current" />
                Run Simulation
              </button>
            </div>
          </div>
        </div>

        {/* Results Screen */}
        <div className="lg:col-span-8 flex flex-col min-h-[380px] bg-[#08080a] border border-[#1c1d22] p-4">
          {!results ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#5e616e]">
              <BarChart2 className="w-12 h-12 stroke-[1] mb-2" />
              <div className="font-bold uppercase text-[10px] text-[#9194a1] mb-1">No Simulation Active</div>
              <p className="max-w-[320px] text-[11px] leading-relaxed">
                Configure your Entry, TP, and SL limits on the left and hit &quot;Run Simulation&quot; to backtest against the active timeframe candles.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#121317] border border-[#1c1d22] p-3 rounded-none">
                  <div className="text-[9px] text-[#5e616e] uppercase">Net Return</div>
                  <div
                    className={`text-lg font-bold mt-1 ${
                      results.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {results.netProfit >= 0 ? '+' : ''}${results.netProfit} ({results.netProfitPct}%)
                  </div>
                </div>

                <div className="bg-[#121317] border border-[#1c1d22] p-3 rounded-none">
                  <div className="text-[9px] text-[#5e616e] uppercase">Win Rate</div>
                  <div className="text-lg font-bold text-[#ffffff] mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {results.winRate}%
                  </div>
                </div>

                <div className="bg-[#121317] border border-[#1c1d22] p-3 rounded-none">
                  <div className="text-[9px] text-[#5e616e] uppercase">Max Drawdown</div>
                  <div className="text-lg font-bold text-rose-400 mt-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    {results.maxDrawdown}%
                  </div>
                </div>

                <div className="bg-[#121317] border border-[#1c1d22] p-3 rounded-none">
                  <div className="text-[9px] text-[#5e616e] uppercase">Total Positions</div>
                  <div className="text-lg font-bold text-[#e2e3e9] mt-1">{results.totalTrades} Trades</div>
                </div>
              </div>

              {/* Equity Curve Chart */}
              <div className="flex-1 min-h-[200px]">
                <div className="text-[9px] text-[#5e616e] uppercase mb-2">Simulated Equity Curve</div>
                <div className="w-full h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.equityCurve} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#cc9166" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#cc9166" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1c1d22" strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#5e616e" fontSize={9} />
                      <YAxis stroke="#5e616e" fontSize={9} domain={['dataMin - 100', 'dataMax + 100']} />
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
                        fill="url(#colorBalance)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Footer Controls */}
              <div className="flex items-center justify-between border-t border-[#1c1d22]/50 pt-3">
                <span className="text-[10px] text-[#5e616e]">
                  Active Asset: {marketContext?.metadata?.symbol || ''} ({marketContext?.metadata?.primaryTimeframe || ''})
                </span>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[10px] text-[#9194a1] hover:text-[#ffffff] transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Simulation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
