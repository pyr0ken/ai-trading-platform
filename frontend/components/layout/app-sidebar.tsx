'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  LineChart,
  History,
  Newspaper,
  Star,
  BarChart2,
  Briefcase,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Coins,
  Flame,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AppStorageEngine } from '@/lib/storage/app-db';
import { useAuth } from '@/components/providers/auth-provider';
import { getUserColor } from '@/lib/utils/user-colors';

export type NavTab =
  | 'dashboard'
  | 'terminal'
  | 'history'
  | 'news'
  | 'watchlist'
  | 'backtest'
  | 'paper_portfolio'
  | 'settings';

export interface AppSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSearch?: () => void;
}

interface SidebarItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  description?: string;
  badge?: string | number;
  sectionHeader?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  onOpenSearch,
}) => {
  const { activeUsername, signOut } = useAuth();
  const [stats, setStats] = useState({ total: 0, winRate: 0, wins: 0, losses: 0 });
  const [fearGreed, setFearGreed] = useState<{ value: number; label: string }>({
    value: 54,
    label: 'Neutral',
  });

  // Profile Popover state & ref
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Active section for bottom gauges tab ('gauges' | 'perf')
  const [activeGaugeTab, setActiveGaugeTab] = useState<'gauges' | 'perf'>('gauges');

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

  // Global keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const tabMap: Record<string, NavTab> = {
          '1': 'dashboard',
          '2': 'terminal',
          '3': 'history',
          '4': 'news',
          '5': 'watchlist',
          '6': 'backtest',
          '7': 'paper_portfolio',
          '8': 'settings',
        };
        const targetTab = tabMap[e.key];
        if (targetTab) {
          onTabChange(targetTab);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTabChange]);

  // Load stats and Fear & Greed index
  useEffect(() => {
    const fetchStats = () => {
      try {
        const analyses = AppStorageEngine.getAnalyses();
        const resolved = analyses.filter(
          (a) =>
            a.accuracy_evaluation &&
            a.accuracy_evaluation.status !== 'PENDING' &&
            a.accuracy_evaluation.status !== 'NOT_FILLED'
        );
        const wins = resolved.filter((a) => a.accuracy_evaluation?.status === 'WIN').length;
        const losses = resolved.filter((a) => a.accuracy_evaluation?.status === 'LOSS').length;
        const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

        setStats({
          total: analyses.length,
          wins,
          losses,
          winRate,
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
            const val = parseInt(data.data[0].value, 10);
            const label = data.data[0].value_classification;
            setFearGreed({ value: val, label });
          }
        }
      } catch {
        // Fallback default
      }
    };

    fetchStats();
    fetchFearGreed();

    window.addEventListener('storage', fetchStats);
    window.addEventListener('app-storage-updated', fetchStats);

    const interval = setInterval(fetchStats, 10000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', fetchStats);
      window.removeEventListener('app-storage-updated', fetchStats);
    };
  }, []);

  // Flat list of sidebar items with section headers
  const navItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Executive Overview',
      icon: LayoutDashboard,
      shortcut: '⌘1',
      description: 'High-level market signals & portfolio summary',
      sectionHeader: 'Workstation',
    },
    {
      id: 'terminal',
      label: 'Live Terminal',
      icon: LineChart,
      shortcut: '⌘2',
      description: 'Real-time charts, order book & AI reasoning engine',
    },
    {
      id: 'history',
      label: 'Signal Audit Log',
      icon: History,
      shortcut: '⌘3',
      badge: stats.total > 0 ? stats.total : undefined,
      description: 'Audited signal history & win/loss evaluations',
      sectionHeader: 'Intelligence',
    },
    {
      id: 'news',
      label: 'Market News & Social',
      icon: Newspaper,
      shortcut: '⌘4',
      badge: 'LIVE',
      description: 'Real-time X feed, RSS sentiment & whale alerts',
    },
    {
      id: 'watchlist',
      label: 'Asset Watchlist',
      icon: Star,
      shortcut: '⌘5',
      description: 'Custom coin tracking & key price alerts',
      sectionHeader: 'Trading',
    },
    {
      id: 'backtest',
      label: 'Strategy Backtester',
      icon: BarChart2,
      shortcut: '⌘6',
      description: 'Historical simulation & strategy accuracy',
    },
    {
      id: 'paper_portfolio',
      label: 'Paper Portfolio',
      icon: Briefcase,
      shortcut: '⌘7',
      description: 'Simulated trading performance & positions',
    },
    {
      id: 'settings',
      label: 'Terminal Settings',
      icon: Settings,
      shortcut: '⌘8',
      description: 'Model selection, API keys & terminal config',
      sectionHeader: 'System',
    },
  ];

  // Fear & Greed classification color helper
  const getFearGreedColor = (val: number) => {
    if (val <= 25) return { text: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/30' };
    if (val <= 45) return { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' };
    if (val <= 55) return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
    if (val <= 75) return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' };
    return { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
  };

  const fgColors = getFearGreedColor(fearGreed.value);

  return (
    <aside
      role="navigation"
      aria-label="Main Navigation"
      className={`bg-[#08080a] border-r border-[#1c1d22] text-[#e2e3e9] flex flex-col justify-between transition-all duration-300 z-30 select-none relative ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header & Main Nav List */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
        {/* Brand Logo & Collapse Toggle */}
        <div className="p-3.5 flex items-center justify-between border-b border-[#1c1d22]/80 bg-[#090a0d]">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#cc9166]/20 via-[#1c1d22] to-[#0d0e12] border border-[#cc9166]/40 flex items-center justify-center shadow-[0_0_12px_rgba(204,145,102,0.15)] relative shrink-0">
                <Sparkles className="w-4 h-4 text-[#cc9166] animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#08080a]" />
              </div>
              <div className="leading-none min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[14px] font-bold font-mono tracking-tight text-[#ffffff] truncate">
                    MARKET<span className="text-[#cc9166]">.AI</span>
                  </h2>
                  <span className="text-[9px] font-mono font-bold bg-[#cc9166]/15 text-[#cc9166] px-1 py-0.2 rounded border border-[#cc9166]/30 uppercase">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#5e616e] block mt-0.5 tracking-wider uppercase truncate">
                  AI Trading Engine
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center py-0.5">
              <div
                title="Market.AI Terminal"
                className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#cc9166]/20 via-[#1c1d22] to-[#0d0e12] border border-[#cc9166]/40 flex items-center justify-center shadow-[0_0_10px_rgba(204,145,102,0.2)] relative cursor-pointer"
                onClick={onToggleCollapse}
              >
                <Sparkles className="w-4.5 h-4.5 text-[#cc9166]" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#08080a] animate-pulse" />
              </div>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="p-1.5 rounded-[5px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#15161c] transition-colors cursor-pointer shrink-0 border border-transparent hover:border-[#1c1d22]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Fluid Animated Navigation List */}
        <div className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <React.Fragment key={item.id}>
                {/* Visual Section Header */}
                {item.sectionHeader && (
                  <div className={!collapsed ? 'pt-3 pb-1 px-2' : 'my-2 border-b border-[#1c1d22]/80'}>
                    {!collapsed && (
                      <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#5e616e] font-bold">
                        {item.sectionHeader}
                      </span>
                    )}
                  </div>
                )}

                <div className="relative group/item">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onTabChange(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[13px] font-sans transition-colors duration-150 cursor-pointer relative overflow-hidden group/item text-left select-none"
                  >
                    {/* Fluid Shared Background Pill Animation */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavBackgroundPill"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                        className="absolute inset-0 bg-gradient-to-r from-[#cc9166]/15 via-[#181a24] to-[#12131a] border border-[#cc9166]/35 rounded-[8px] shadow-[0_2px_12px_rgba(204,145,102,0.15)] z-0"
                      />
                    )}

                    {/* Fluid Shared Left Accent Bar */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavLeftAccentBar"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute left-0 top-2 bottom-2 w-[3.5px] bg-[#cc9166] rounded-r-full shadow-[0_0_12px_rgba(204,145,102,0.9)] z-10"
                      />
                    )}

                    {/* Button Content Layer */}
                    <div className="relative z-10 flex items-center gap-3 min-w-0">
                      <motion.div
                        animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={{ duration: 0.25 }}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-[#cc9166]'
                              : 'text-[#5e616e] group-hover/item:text-[#e2e3e9]'
                          }`}
                        />
                      </motion.div>
                      {!collapsed && (
                        <span
                          className={`truncate transition-colors ${
                            isActive
                              ? 'text-[#ffffff] font-semibold'
                              : 'text-[#9194a1] group-hover/item:text-[#e2e3e9]'
                          }`}
                        >
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!collapsed && (
                      <div className="relative z-10 flex items-center gap-2">
                        {item.badge !== undefined && (
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] border ${
                              item.badge === 'LIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                                : 'bg-[#1c1d22] text-[#cc9166] border-[#cc9166]/30'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.shortcut && (
                          <span
                            className={`text-[10px] font-mono transition-colors ${
                              isActive
                                ? 'text-[#cc9166]/90 font-bold'
                                : 'text-[#4a4c58] group-hover/item:text-[#727585]'
                            }`}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.button>

                  {/* Collapsed Mode Floating Tooltip */}
                  {collapsed && (
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-[#121318] border border-[#232530] text-[#e2e3e9] z-50 rounded-[7px] shadow-2xl opacity-0 pointer-events-none group-hover/item:opacity-100 transition-all duration-150 flex flex-col gap-0.5 min-w-[140px]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-sans font-bold text-xs text-[#ffffff]">
                          {item.label}
                        </span>
                        {item.shortcut && (
                          <span className="font-mono text-[9px] bg-[#1a1b24] text-[#cc9166] px-1 py-0.5 rounded border border-[#2c2d3a]">
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <span className="font-sans text-[10px] text-[#9194a1] leading-tight">
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Bottom Gauges & Telemetry Section */}
      {!collapsed ? (
        <div className="p-3 border-t border-[#1c1d22] bg-[#060608] space-y-2">
          <div className="flex items-center justify-between bg-[#0b0c10] border border-[#1c1d22] p-0.5 rounded-[6px]">
            <button
              onClick={() => setActiveGaugeTab('gauges')}
              className={`flex-1 py-1 text-[10px] font-mono uppercase tracking-wider rounded-[4px] transition-all cursor-pointer text-center ${
                activeGaugeTab === 'gauges'
                  ? 'bg-[#15161e] text-[#cc9166] font-bold border border-[#252733]'
                  : 'text-[#5e616e] hover:text-[#e2e3e9]'
              }`}
            >
              Market Gauges
            </button>
            <button
              onClick={() => setActiveGaugeTab('perf')}
              className={`flex-1 py-1 text-[10px] font-mono uppercase tracking-wider rounded-[4px] transition-all cursor-pointer text-center ${
                activeGaugeTab === 'perf'
                  ? 'bg-[#15161e] text-[#cc9166] font-bold border border-[#252733]'
                  : 'text-[#5e616e] hover:text-[#e2e3e9]'
              }`}
            >
              AI Accuracy
            </button>
          </div>

          {activeGaugeTab === 'gauges' ? (
            <div className="space-y-2.5 p-2 bg-[#0c0d12] border border-[#1c1d22] rounded-[7px] text-xs">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-[#9194a1] flex items-center gap-1">
                    <Coins className="w-3 h-3 text-[#cc9166]" />
                    <span>Fear & Greed</span>
                  </span>
                  <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${fgColors.text} ${fgColors.bg} border ${fgColors.border}`}>
                    {fearGreed.value} ({fearGreed.label})
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#171822] rounded-full overflow-hidden border border-[#222432]">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${fearGreed.value}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center bg-[#07080b] border border-[#191a24] p-1.5 px-2 rounded-[5px] text-[10px] font-mono">
                <span className="text-[#9194a1] flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-amber-500 animate-pulse" />
                  <span>Gas Price</span>
                </span>
                <span className="text-[#e2e3e9] font-bold">24 Gwei</span>
              </div>
            </div>
          ) : (
            <div className="p-2 bg-[#0c0d12] border border-[#1c1d22] rounded-[7px] space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-1.5 font-mono">
                <div className="bg-[#07080b] border border-[#191a24] p-1.5 text-center rounded-[5px]">
                  <div className="text-[9px] text-[#5e616e] uppercase">Win Rate</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">{stats.winRate}%</div>
                </div>
                <div className="bg-[#07080b] border border-[#191a24] p-1.5 text-center rounded-[5px]">
                  <div className="text-[9px] text-[#5e616e] uppercase">Total Runs</div>
                  <div className="text-xs font-bold text-[#e2e3e9] mt-0.5">{stats.total}</div>
                </div>
              </div>
              {stats.total > 0 ? (
                <div className="text-[9px] font-mono text-[#5e616e] text-center bg-[#07080b] py-1 border border-[#191a24] rounded-[5px]">
                  Audited: <span className="text-emerald-400 font-bold">{stats.wins} W</span> -{' '}
                  <span className="text-rose-400 font-bold">{stats.losses} L</span>
                </div>
              ) : (
                <div className="text-[9px] font-mono text-[#5e616e] text-center py-0.5">
                  No audited signals yet
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="py-2 border-t border-[#1c1d22] bg-[#060608] flex flex-col items-center gap-2">
          <div
            title={`Fear & Greed: ${fearGreed.value} (${fearGreed.label})`}
            className={`w-9 h-7 rounded-[5px] ${fgColors.bg} border ${fgColors.border} flex items-center justify-center text-[10px] font-mono font-bold ${fgColors.text} cursor-pointer`}
          >
            {fearGreed.value}
          </div>
        </div>
      )}

      {/* User Account & Profile Footer */}
      <div ref={profileRef} className="p-3 border-t border-[#1c1d22] bg-[#050507] relative">
        <AnimatePresence>
          {profileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute bottom-full ${
                collapsed ? 'left-16 mb-2 w-60' : 'left-3 right-3 mb-2'
              } bg-[#0c0d12]/95 backdrop-blur-md border border-[#232532] hover:border-[#cc9166]/40 rounded-[12px] p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(204,145,102,0.1)] z-50`}
            >
              <div className="px-3 py-2 border-b border-[#1c1d22] mb-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-xs text-[#ffffff] truncate">
                    @{activeUsername || 'trader'}
                  </div>
                  <div className="text-[10px] text-[#cc9166] font-mono flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Pro Trader Workspace
                  </div>
                </div>
                <ShieldCheck className="w-4 h-4 text-[#cc9166] shrink-0" />
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    onTabChange('settings');
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#161720] rounded-[7px] transition-colors cursor-pointer text-left font-sans"
                >
                  <Settings className="w-4 h-4 text-[#cc9166]" />
                  <span>Terminal Settings</span>
                </button>

                <button
                  onClick={() => {
                    onTabChange('history');
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#161720] rounded-[7px] transition-colors cursor-pointer text-left font-sans"
                >
                  <History className="w-4 h-4 text-[#cc9166]" />
                  <span>Signal Audit Log ({stats.total})</span>
                </button>

                <button
                  onClick={() => {
                    onTabChange('watchlist');
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#161720] rounded-[7px] transition-colors cursor-pointer text-left font-sans"
                >
                  <Star className="w-4 h-4 text-[#cc9166]" />
                  <span>Asset Watchlist</span>
                </button>

                <div className="border-t border-[#1c1d22] my-1.5" />

                {signOut && (
                  <button
                    onClick={() => {
                      signOut();
                      setProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-[7px] transition-colors cursor-pointer text-left font-sans font-medium"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out Account</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Card Trigger */}
        {(() => {
          const userStyle = getUserColor(activeUsername);
          return !collapsed ? (
            <div
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className={`bg-[#0c0d12] border border-[#1c1d22] hover:border-[#cc9166]/40 p-2.5 rounded-[9px] transition-all duration-200 shadow-md cursor-pointer select-none ${
                profileMenuOpen ? 'border-[#cc9166]/60 bg-[#12131a]' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs uppercase shrink-0 ${userStyle.avatarBg}`}
                  >
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
                  {profileMenuOpen ? (
                    <ChevronDown className="w-4 h-4 text-[#cc9166]" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
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
