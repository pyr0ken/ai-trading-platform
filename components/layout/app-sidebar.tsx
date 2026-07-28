'use client';

import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Code2,
  Star,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'ai_assistant' | 'pine_studio' | 'watchlist' | 'history' | 'settings';

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
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai_assistant', label: 'AI Intelligence', icon: Bot },
    { id: 'pine_studio', label: 'Pine Script Studio', icon: Code2 },
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
      <div>
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

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as NavTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[2px] text-[13px] font-sans transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#121317] text-[#e2e3e9] font-medium'
                    : 'text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#121317]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#e2e3e9]' : 'text-[#5e616e]'}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {!collapsed && (
        <div className="p-4 border border-[#1c1d22] bg-[#040406] m-3 rounded-[10px] space-y-2 text-[12px] text-[#5e616e]">
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
    </aside>
  );
};
