'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Bot,
  Code2,
  Star,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Coins,
  TrendingUp,
  Flame,
  BarChart2,
} from 'lucide-react';
import { AppStorageEngine } from '@/lib/storage/app-db';

export type NavTab = 'dashboard' | 'ai_assistant' | 'pine_studio' | 'watchlist' | 'history' | 'settings' | 'backtest';

interface AppSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}) => {
  const [marketDataOpen, setMarketDataOpen] = useState(true);
  const [perfOpen, setPerfOpen] = useState(true);
  const [stats, setStats] = useState({ total: 0, winRate: 0, wins: 0, losses: 0 });
  const [fearGreed, setFearGreed] = useState({ value: 54, label: 'Neutral' });

  useEffect(() => {
    // Calculate performance stats from storage
    const fetchStats = () => {
      try {
        const analyses = AppStorageEngine.getAnalyses();
        const resolved = analyses.filter(a => a.accuracy_evaluation && a.accuracy_evaluation.status !== 'PENDING');
        const wins = resolved.filter(a => a.accuracy_evaluation?.status === 'WIN').length;
        const losses = resolved.filter(a => a.accuracy_evaluation?.status === 'LOSS').length;
        const winRate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
        
        setStats({
          total: analyses.length,
          wins,
          losses,
          winRate
        });
      } catch (e) {
        console.warn('Failed to load performance stats in sidebar:', e);
      }
    };

    const fetchFearGreed = async () => {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1');
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.[0]) {
            const val = parseInt(data.data[0].value);
            const label = data.data[0].value_classification;
            setFearGreed({ value: val, label });
          }
        }
      } catch {}
    };

    fetchStats();
    fetchFearGreed();

    // Refresh stats every 5 seconds in case user saves a new analysis
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai_assistant', label: 'AI Intelligence', icon: Bot },
    { id: 'pine_studio', label: 'Pine Script Studio', icon: Code2 },
    { id: 'backtest', label: 'Strategy Backtester', icon: BarChart2 },
    { id: 'watchlist', label: 'Watchlist', icon: Star },
    { id: 'history', label: 'Analysis History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`bg-[#08080a] border-r border-[#1c1d22] text-[#e2e3e9] flex flex-col justify-between transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 flex items-center justify-between border-b border-[#1c1d22]">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="leading-none">
                <h2 className="text-[15px] font-ivy-presto tracking-[0.01em] text-[#e2e3e9]">
                  Market Intelligence
                </h2>
                <span className="text-[11px] text-[#9194a1] block mt-0.5">
                  AI-Powered Terminal
                </span>
              </div>
            </div>
          ) : null}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-[2px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#1c1d22] transition-all hidden md:block"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasBadge = item.id === 'history' && stats.total > 0;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[2px] text-[13px] font-sans transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#121317] text-[#e2e3e9] font-medium'
                    : 'text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#121317]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#e2e3e9]' : 'text-[#5e616e]'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
                {!collapsed && hasBadge && (
                  <span className="text-[10px] bg-[#1c1d22] text-[#cc9166] px-1.5 py-0.5 font-mono">
                    {stats.total}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapsible Market Indices (Fear & Greed, Gas fee) */}
        {!collapsed && (
          <div className="px-3 py-1 border-t border-[#1c1d22]/50 mt-2">
            <button
              onClick={() => setMarketDataOpen(!marketDataOpen)}
              className="w-full flex items-center justify-between text-[#5e616e] hover:text-[#e2e3e9] py-2 text-[10px] font-mono tracking-wider uppercase text-left cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                <span>Market Gauges</span>
              </span>
              {marketDataOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {marketDataOpen && (
              <div className="space-y-3 pb-3 pt-1 text-[11px] font-mono text-[#9194a1]">
                {/* Fear & Greed Index */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span>Fear & Greed</span>
                    <span className="text-emerald-400 font-bold">{fearGreed.value} ({fearGreed.label})</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#121317] border border-[#1c1d22]">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500"
                      style={{ width: `${fearGreed.value}%` }}
                    />
                  </div>
                </div>

                {/* Micro Ticker Live Gas */}
                <div className="flex justify-between items-center bg-[#040406] border border-[#1c1d22] p-1.5 px-2">
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-500" />
                    <span>Gas Price</span>
                  </div>
                  <span className="text-[#e2e3e9] font-bold">24 Gwei</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Performance Stats */}
        {!collapsed && (
          <div className="px-3 py-1 border-t border-[#1c1d22]/50">
            <button
              onClick={() => setPerfOpen(!perfOpen)}
              className="w-full flex items-center justify-between text-[#5e616e] hover:text-[#e2e3e9] py-2 text-[10px] font-mono tracking-wider uppercase text-left cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>AI Performance</span>
              </span>
              {perfOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {perfOpen && (
              <div className="space-y-2 pb-3 pt-1 text-[11px] font-mono text-[#9194a1]">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-[#040406] border border-[#1c1d22] p-2 text-center">
                    <div className="text-[9px] text-[#5e616e] uppercase">Win Rate</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{stats.winRate}%</div>
                  </div>
                  <div className="bg-[#040406] border border-[#1c1d22] p-2 text-center">
                    <div className="text-[9px] text-[#5e616e] uppercase">Total Runs</div>
                    <div className="text-sm font-bold text-[#e2e3e9] mt-0.5">{stats.total}</div>
                  </div>
                </div>
                {stats.total > 0 && (
                  <div className="text-[9px] text-[#5e616e] text-center">
                    Audited: <span className="text-emerald-400 font-bold">{stats.wins} W</span> - <span className="text-rose-400 font-bold">{stats.losses} L</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        {!collapsed && (
          <div className="p-4 border border-[#1c1d22] bg-[#040406] m-3 rounded-none space-y-2 text-[12px] text-[#5e616e]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#cc9166]"></span>
                </span>
                <span className="text-[#e2e3e9] font-sans text-[12px] font-medium">System Online</span>
              </span>
              <span className="text-[10px] text-[#cc9166] uppercase tracking-wider">Active</span>
            </div>
            <p className="text-[11px] text-[#5e616e] leading-tight">
              Real-time data feed connected
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
