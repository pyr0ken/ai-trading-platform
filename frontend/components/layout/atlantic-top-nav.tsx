'use client';

import React from 'react';
import { NavTab } from './app-sidebar';

interface AtlanticTopNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onRunAnalysis?: () => void;
  isRunning?: boolean;
}

export const AtlanticTopNav: React.FC<AtlanticTopNavProps> = ({
  activeTab,
  onTabChange,
  onRunAnalysis,
  isRunning,
}) => {
  const navItems: { id: NavTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'history', label: 'Audit Log' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <nav className="w-full bg-[#08080a]/80 backdrop-blur-md border-b border-[#1c1d22] sticky top-0 z-40 px-6 py-3 select-none">
      <div className="max-w-[1216px] mx-auto flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => onTabChange('dashboard')}>
          <span className="font-ivy-presto text-[18px] text-[#e2e3e9] tracking-[0.01em]">
            market<span className="text-[#cc9166]">.ai</span>
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`text-[14px] font-sans transition-colors relative py-1 flex items-center gap-2 cursor-pointer ${
                  isActive ? 'text-[#e2e3e9] font-medium' : 'text-[#9194a1] hover:text-[#e2e3e9]'
                }`}
              >
                {isActive && <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#e2e3e9]" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {onRunAnalysis && (
            <button
              onClick={onRunAnalysis}
              disabled={isRunning}
              className="text-[13px] font-sans font-medium py-2 px-5 hidden sm:inline-flex bg-transparent border border-[#777a88] text-[#e2e3e9] rounded-[9999px] hover:border-[#e2e3e9] transition-colors"
            >
              {isRunning ? 'Analyzing...' : 'Run Analysis'}
            </button>
          )}
          <button
            onClick={() => onTabChange('dashboard')}
            className="text-[13px] font-sans font-medium py-2 px-5 bg-[#ffffff] text-[#08080a] rounded-[9999px] hover:bg-[#e2e3e9] transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};
