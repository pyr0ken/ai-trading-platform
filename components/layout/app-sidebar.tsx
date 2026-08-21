'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Bot,
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
  Briefcase,
  Newspaper,
  LogOut,
  LineChart,
  Grid,
  Zap,
  Wallet,
} from 'lucide-react';
import { AppStorageEngine } from '@/lib/storage/app-db';
import { useAuth } from '@/components/providers/auth-provider';
import { getUserColor } from '@/lib/utils/user-colors';

export type NavTab = 'dashboard' | 'terminal' | 'watchlist' | 'news' | 'history' | 'settings' | 'backtest' | 'paper_portfolio';

interface AppSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface SidebarCategory {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<any>;
  }[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}) => {
  const { activeUsername, signOut } = useAuth();
  const [marketDataOpen, setMarketDataOpen] = useState(true);
  const [perfOpen, setPerfOpen] = useState(true);
  const [stats, setStats] = useState({ total: 0, winRate: 0, wins: 0, losses: 0 });
  const [fearGreed, setFearGreed] = useState({ value: 54, label: 'Neutral' });

  // Profile Popover state & ref
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Accordion state for categories
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    workstation: true,
    ai_intel: true,
    trading: true,
  });

  const toggleCategory = (catId: string) => {
    setExpandedCats((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Calculate performance stats from storage
    const fetchStats = () => {
      try {
        const analyses = AppStorageEngine.getAnalyses();
        const resolved = analyses.filter(a =>
          a.accuracy_evaluation &&
          a.accuracy_evaluation.status !== 'PENDING' &&
          a.accuracy_evaluation.status !== 'NOT_FILLED'
        );
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

    window.addEventListener('storage', fetchStats);
    window.addEventListener('app-storage-updated', fetchStats);

    const interval = setInterval(fetchStats, 5000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', fetchStats);
      window.removeEventListener('app-storage-updated', fetchStats);
    };
  }, []);

  const categories: SidebarCategory[] = [
    {
      id: 'workstation',
      label: 'Workstation',
      icon: Grid,
      items: [
        { id: 'dashboard', label: 'Executive Overview', icon: LayoutDashboard },
        { id: 'terminal', label: 'Live Terminal', icon: LineChart },
      ],
    },
    {
      id: 'ai_intel',
      label: 'AI & Intelligence',
      icon: Zap,
      items: [
        { id: 'history', label: 'Signal History', icon: History },
        { id: 'news', label: 'Market News & Social', icon: Newspaper },
      ],
    },
    {
      id: 'trading',
      label: 'Portfolio & Trading',
      icon: Wallet,
      items: [
        { id: 'watchlist', label: 'Asset Watchlist', icon: Star },
        { id: 'backtest', label: 'Strategy Backtester', icon: BarChart2 },
        { id: 'paper_portfolio', label: 'Paper Portfolio', icon: Briefcase },
      ],
    },
  ];

  return (
    <aside
      className={`bg-[#08080a] border-r border-[#1c1d22] text-[#e2e3e9] flex flex-col justify-between transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header section with brand */}
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
          ) : (
            <div className="w-full flex justify-center">
              <span className="font-ivy-presto text-[16px] text-[#cc9166] tracking-[0.01em] font-bold">
                M.AI
              </span>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-[2px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#1c1d22] transition-colors cursor-pointer hidden md:block"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Categories and Sub-items */}
        <div className="p-3 space-y-5 mt-2">
          {categories.map((cat) => {
            const isCatExpanded = expandedCats[cat.id];
            const CatIcon = cat.icon;
            const isCatActive = cat.items.some((item) => activeTab === item.id);

            return (
              <div key={cat.id} className="space-y-1">
                {/* Category Header */}
                {!collapsed ? (
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-mono tracking-[0.14em] uppercase transition-colors duration-150 cursor-pointer text-left font-bold rounded-[4px] ${
                      isCatActive
                        ? 'text-[#cc9166] bg-[#cc9166]/5'
                        : 'text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#121317]/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <CatIcon className={`w-3.5 h-3.5 ${isCatActive ? 'text-[#cc9166]' : 'text-[#5e616e]'}`} />
                      <span>{cat.label}</span>
                      {isCatActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#cc9166] shadow-[0_0_8px_rgba(204,145,102,0.8)] animate-pulse" />
                      )}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-[#5e616e] transition-transform duration-200 ${
                        isCatExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                ) : (
                  <div className="border-b border-[#1c1d22]/80 my-3" />
                )}

                {/* Sub items with tree line indentation */}
                {(!collapsed && isCatExpanded) || collapsed ? (
                  <div className={!collapsed ? 'ml-3 pl-3 border-l border-[#1c1d22] space-y-1 mt-1.5' : 'space-y-1'}>
                    {cat.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const hasBadge = item.id === 'history' && stats.total > 0;

                      return (
                        <div key={item.id} className="relative group/item">
                          <button
                            onClick={() => onTabChange(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-[13px] font-sans transition-all duration-150 cursor-pointer relative overflow-hidden ${
                              isActive
                                ? 'bg-[#121317] border border-[#1c1d22] text-[#ffffff] font-semibold shadow-sm'
                                : 'text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#121317]/50'
                            }`}
                            title={collapsed ? item.label : undefined}
                          >
                            {/* Active indicator bar */}
                            {isActive && !collapsed && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#cc9166] rounded-r-full shadow-[0_0_8px_rgba(204,145,102,0.6)]" />
                            )}

                            <div className="flex items-center gap-2.5">
                              <Icon
                                className={`w-4 h-4 shrink-0 transition-colors ${
                                  isActive ? 'text-[#cc9166]' : 'text-[#5e616e] group-hover/item:text-[#e2e3e9]'
                                }`}
                              />
                              {!collapsed && <span className="truncate">{item.label}</span>}
                            </div>
                            {!collapsed && hasBadge && (
                              <span className="text-[10px] bg-[#1c1d22] text-[#cc9166] px-1.5 py-0.5 font-mono border border-[#cc9166]/20 rounded-[4px]">
                                {stats.total}
                              </span>
                            )}
                          </button>

                          {/* CSS-only tooltip for collapsed mode */}
                          {collapsed && (
                            <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-[#121317] border border-[#1c1d22] text-[#e2e3e9] text-[11px] font-mono whitespace-nowrap opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity duration-150 z-50 rounded-[4px] shadow-lg">
                              {item.label}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Collapsible Market Indices (Fear & Greed, Gas fee) */}
        {!collapsed && (
          <div className="px-3 py-1 border-t border-[#1c1d22]/50 mt-2">
            <button
              onClick={() => setMarketDataOpen(!marketDataOpen)}
              className="w-full flex items-center justify-between text-[#5e616e] hover:text-[#e2e3e9] py-2 text-[10px] font-mono tracking-wider uppercase text-left cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-semibold">
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
                <div className="flex justify-between items-center bg-[#040406] border border-[#1c1d22] p-1.5 px-2 rounded-[6px]">
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
              <span className="flex items-center gap-1.5 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>AI Performance</span>
              </span>
              {perfOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {perfOpen && (
              <div className="space-y-2 pb-3 pt-1 text-[11px] font-mono text-[#9194a1]">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-[#040406] border border-[#1c1d22] p-2 text-center rounded-[6px]">
                    <div className="text-[9px] text-[#5e616e] uppercase">Win Rate</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{stats.winRate}%</div>
                  </div>
                  <div className="bg-[#040406] border border-[#1c1d22] p-2 text-center rounded-[6px]">
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

      {/* Stylish Interactive Account & User Profile Dropdown Box */}
      <div ref={profileRef} className="p-3 border-t border-[#1c1d22] bg-[#040406] relative">
        {/* Profile Popover Menu */}
        {profileMenuOpen && (
          <div
            className={`absolute bottom-full ${
              collapsed ? 'left-16 mb-2 w-56' : 'left-3 right-3 mb-2'
            } bg-[#121317] border border-[#1c1d22] hover:border-[#cc9166]/40 rounded-[10px] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_15px_rgba(204,145,102,0.15)] z-50 transition-all duration-200`}
          >
            <div className="px-3 py-2 border-b border-[#1c1d22] mb-1.5 flex items-center justify-between">
              <div>
                <div className="font-mono font-bold text-xs text-[#e2e3e9]">
                  @{activeUsername || 'trader'}
                </div>
                <div className="text-[10px] text-[#cc9166] font-mono flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Pro Trader Workspace
                </div>
              </div>
            </div>

            <div className="space-y-0.5">
              <button
                onClick={() => {
                  onTabChange('settings');
                  setProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#1c1d22] rounded-[6px] transition-colors cursor-pointer text-left font-sans"
              >
                <Settings className="w-4 h-4 text-[#cc9166]" />
                <span>Terminal Settings</span>
              </button>

              <button
                onClick={() => {
                  onTabChange('history');
                  setProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#1c1d22] rounded-[6px] transition-colors cursor-pointer text-left font-sans"
              >
                <History className="w-4 h-4 text-[#cc9166]" />
                <span>Signal Audit Log ({stats.total})</span>
              </button>

              <button
                onClick={() => {
                  onTabChange('watchlist');
                  setProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#1c1d22] rounded-[6px] transition-colors cursor-pointer text-left font-sans"
              >
                <Star className="w-4 h-4 text-[#cc9166]" />
                <span>Asset Watchlist</span>
              </button>

              <button
                onClick={() => {
                  onTabChange('backtest');
                  setProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#1c1d22] rounded-[6px] transition-colors cursor-pointer text-left font-sans"
              >
                <BarChart2 className="w-4 h-4 text-[#cc9166]" />
                <span>Strategy Backtester</span>
              </button>

              <div className="border-t border-[#1c1d22] my-1.5" />

              {signOut && (
                <button
                  onClick={() => {
                    signOut();
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-[6px] transition-colors cursor-pointer text-left font-sans font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Sign Out Account</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Profile Card Click Trigger */}
        {(() => {
          const userStyle = getUserColor(activeUsername);
          return !collapsed ? (
            <div
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className={`bg-[#121317] border border-[#1c1d22] hover:border-[#cc9166]/40 p-2.5 rounded-[8px] transition-all duration-300 shadow-md cursor-pointer select-none ${
                profileMenuOpen ? 'border-[#cc9166]/60 bg-[#161820]' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs uppercase shrink-0 ${userStyle.avatarBg}`}>
                    {activeUsername ? activeUsername.slice(0, 1) : 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`font-bold text-xs truncate font-mono ${userStyle.text}`}>
                      @{activeUsername || 'trader'}
                    </span>
                    <span className="text-[10px] text-[#9194a1] flex items-center gap-1 font-sans">
                      <span className={`w-1.5 h-1.5 rounded-full ${userStyle.dot} animate-pulse`} />
                      Pro Trader
                    </span>
                  </div>
                </div>

                <div className="p-1 rounded-[4px] text-[#5e616e] hover:text-[#e2e3e9]">
                  {profileMenuOpen ? <ChevronDown className="w-4 h-4 text-[#cc9166]" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                title={`Account Options (@${activeUsername || 'trader'})`}
                className={`w-10 h-10 rounded-full border text-xs font-bold uppercase flex items-center justify-center transition-all cursor-pointer shadow-md ${userStyle.avatarBg} ${
                  profileMenuOpen ? 'ring-2 ring-[#cc9166]' : ''
                }`}
              >
                {activeUsername ? activeUsername.slice(0, 1) : 'U'}
              </button>
            </div>
          );
        })()}
      </div>
    </aside>
  );
};
