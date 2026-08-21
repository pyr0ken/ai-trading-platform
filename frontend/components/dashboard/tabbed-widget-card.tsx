'use client';

import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { WidgetId } from '@/types/layout';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string;
  content: React.ReactNode;
}

interface TabbedWidgetCardProps {
  id?: WidgetId;
  tabs: TabItem[];
  defaultTabId?: string;
  onHideWidget?: (id: WidgetId) => void;
  className?: string;
}

export const TabbedWidgetCard: React.FC<TabbedWidgetCardProps> = ({
  tabs,
  defaultTabId,
  className = '',
}) => {
  const [activeTabId, setActiveTabId] = useState<string>(
    defaultTabId && tabs.some((t) => t.id === defaultTabId) ? defaultTabId : tabs[0]?.id || ''
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <div
      className={`bg-[#040406] border border-[#1c1d22] hover:border-[#777a88]/40 rounded-[10px] transition-all duration-300 shadow-lg relative flex flex-col overflow-hidden ${className}`}
    >
      {/* Header Bar with Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1c1d22]/80 bg-[#08080a]/80 select-none overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-mono transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#121317] text-[#cc9166] border border-[#cc9166]/30 font-semibold shadow-sm'
                    : 'text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#121317]/50 border border-transparent'
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#cc9166]' : 'text-[#777a88]'}`} />}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-[9999px] border font-medium ${
                      isActive
                        ? 'bg-[#cc9166]/10 text-[#cc9166] border-[#cc9166]/30'
                        : 'bg-[#121317] text-[#777a88] border-[#1c1d22]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 w-full min-w-0">{activeTab?.content}</div>
    </div>
  );
};
