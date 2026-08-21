'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, EyeOff, Maximize2, Minimize2, LucideIcon } from 'lucide-react';
import { WidgetId } from '@/types/layout';

interface WidgetCardProps {
  id?: WidgetId;
  title?: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'copper' | 'emerald' | 'rose' | 'slate';
  icon?: LucideIcon;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  collapsible?: boolean;
  onHideWidget?: (id: WidgetId) => void;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  id,
  title,
  subtitle,
  badge,
  badgeColor = 'copper',
  icon: Icon,
  children,
  headerAction,
  collapsible = false,
  onHideWidget,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  noPadding = false,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getBadgeStyle = () => {
    switch (badgeColor) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold';
      case 'rose':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold';
      case 'slate':
        return 'bg-[#161822] text-[#9194a1] border-[#222432] font-semibold';
      case 'copper':
      default:
        return 'bg-[#cc9166]/10 text-[#cc9166] border-[#cc9166]/30 font-bold';
    }
  };

  return (
    <div
      className={`bg-[#0a0b0e] border border-[#1b1c24] hover:border-[#cc9166]/30 rounded-[10px] transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] relative flex flex-col overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50 overflow-y-auto bg-[#0a0b0e]' : ''
      } ${className}`}
    >
      {/* Optional Card Header if title or icon supplied */}
      {(title || Icon || headerAction || collapsible || badge) && (
        <div
          className={`flex items-center justify-between px-4 py-3 border-b border-[#1b1c24] bg-gradient-to-r from-[#0c0d13] to-[#08080a] select-none ${headerClassName}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="p-1 rounded-[6px] bg-[#cc9166]/10 border border-[#cc9166]/20 text-[#cc9166] shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
            {title && (
              <h3 className="text-xs font-mono font-bold tracking-wide uppercase text-[#ffffff] truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="text-[11px] text-[#9194a1] hidden sm:inline-block truncate">
                · {subtitle}
              </span>
            )}
            {badge && (
              <span
                className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-[4px] border ${getBadgeStyle()}`}
              >
                {badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {headerAction}

            {collapsible && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1 text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#161822] rounded transition-all cursor-pointer"
                title={collapsed ? 'Expand Widget' : 'Collapse Widget'}
              >
                {collapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#161822] rounded transition-all cursor-pointer hidden sm:block"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {id && onHideWidget && (
              <button
                onClick={() => onHideWidget(id)}
                className="p-1 text-[#5e616e] hover:text-rose-400 hover:bg-rose-950/30 rounded transition-all cursor-pointer"
                title="Hide Widget"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Card Content Body */}
      {!collapsed && (
        <div className={`${noPadding ? '' : 'p-3 md:p-4'} ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
};
