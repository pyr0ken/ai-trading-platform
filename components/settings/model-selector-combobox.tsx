'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Cpu, Search, Check, ChevronDown, Sparkles, X, RefreshCw } from 'lucide-react';
import { useActiveLLMModel, setLLMModel } from '@/lib/storage/intel-toggles';

interface ModelSelectorComboboxProps {
  availableModels?: string[];
  modelsLoading?: boolean;
  modelsError?: string | null;
  onRefresh?: () => void;
  className?: string;
  variant?: 'full' | 'compact';
}

export const ModelSelectorCombobox: React.FC<ModelSelectorComboboxProps> = ({
  availableModels: propModels,
  modelsLoading: propLoading,
  modelsError: propError,
  onRefresh: propRefresh,
  className = '',
  variant = 'full',
}) => {
  const { llmModel, llmUrl } = useActiveLLMModel();
  const [internalModels, setInternalModels] = useState<string[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Self-fetch model list if not passed from parent
  const fetchModels = useCallback(async () => {
    setInternalLoading(true);
    try {
      const res = await fetch(`/api/llm/models?url=${encodeURIComponent(llmUrl)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data?.models)) {
        setInternalModels(data.models);
        setInternalError(null);
      } else {
        setInternalError(data?.error || 'Failed to fetch models');
      }
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setInternalLoading(false);
    }
  }, [llmUrl]);

  useEffect(() => {
    if (!propModels || propModels.length === 0) {
      fetchModels();
    }
  }, [propModels, fetchModels]);

  const availableModels = propModels && propModels.length > 0 ? propModels : internalModels;
  const modelsLoading = propLoading !== undefined ? propLoading : internalLoading;
  const modelsError = propError !== undefined ? propError : internalError;
  const onRefresh = propRefresh || fetchModels;

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter models case-insensitively
  const filteredModels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableModels;
    return availableModels.filter((m) => m.toLowerCase().includes(query));
  }, [availableModels, searchQuery]);

  const handleSelectModel = (model: string) => {
    setLLMModel(model);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' && filteredModels.length > 0) {
      handleSelectModel(filteredModels[0]);
    }
  };

  if (variant === 'compact') {
    return (
      <div ref={containerRef} className={`relative inline-block ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] hover:border-[#cc9166]/50 text-xs font-mono transition-all cursor-pointer group"
          title="Active Model — Click to switch"
        >
          <Cpu className="w-3.5 h-3.5 text-[#cc9166] group-hover:rotate-12 transition-transform" />
          <span className="text-[#e2e3e9] font-bold truncate max-w-[120px]">
            {llmModel}
          </span>
          <ChevronDown className={`w-3 h-3 text-[#5e616e] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-[#08080a] border border-[#1c1d22] rounded-[12px] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-[#1c1d22]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#9194a1] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#cc9166]" /> Select AI Model
              </span>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={modelsLoading}
                  className="p-1 text-[#cc9166] hover:bg-[#121317] rounded cursor-pointer disabled:opacity-50"
                  title="Refresh models list"
                >
                  <RefreshCw className={`w-3 h-3 ${modelsLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {/* Search Input Box */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5e616e]" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Filter models..."
                autoFocus
                className="w-full bg-[#121317] border border-[#1c1d22] focus:border-[#cc9166]/60 rounded-[6px] pl-8 pr-7 py-1.5 text-xs text-[#e2e3e9] placeholder-[#5e616e] focus:outline-none font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5e616e] hover:text-[#e2e3e9]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Models Scroll List */}
            <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5">
              {modelsLoading ? (
                <div className="p-4 text-center text-xs text-[#5e616e] animate-pulse">
                  Loading available models...
                </div>
              ) : filteredModels.length > 0 ? (
                filteredModels.map((m) => {
                  const isSelected = m === llmModel;
                  return (
                    <button
                      key={m}
                      onClick={() => handleSelectModel(m)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs font-mono transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#1c1d22] text-[#cc9166] font-bold border border-[#cc9166]/40'
                          : 'text-[#e2e3e9] hover:bg-[#121317]'
                      }`}
                    >
                      <span className="truncate">{m}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#cc9166] shrink-0 ml-2" />}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-[#5e616e]">
                  No models match &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full / Settings Dialog Combobox Variant
  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Combobox Trigger Input / Button */}
      <div className="relative flex items-center">
        <Cpu className="w-4 h-4 absolute left-3 text-[#cc9166] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : llmModel}
          onFocus={() => {
            setIsOpen(true);
            setSearchQuery('');
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search or type model name..."
          className="w-full bg-[#121317] border border-[#1c1d22] focus:border-[#cc9166] rounded-[9999px] pl-9 pr-9 py-2 text-xs font-mono text-[#e2e3e9] placeholder-[#5e616e] focus:outline-none transition-all cursor-text"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 text-[#5e616e] hover:text-[#e2e3e9] cursor-pointer"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Popover / Dialog List */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-[#08080a] border border-[#1c1d22] rounded-[12px] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-[#1c1d22]">
            <span className="text-[11px] font-mono text-[#9194a1] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#cc9166]" />
              {availableModels.length > 0
                ? `${filteredModels.length} of ${availableModels.length} models available`
                : 'Custom or Auto-detected Models'}
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-[#5e616e] hover:text-[#e2e3e9] flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear search
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
            {modelsLoading ? (
              <div className="p-4 text-center text-xs text-[#5e616e] animate-pulse">
                Fetching models from engine endpoint...
              </div>
            ) : modelsError ? (
              <div className="p-3 text-center text-xs text-rose-400 bg-rose-950/20 rounded-[6px] border border-rose-900/40">
                {modelsError}
              </div>
            ) : filteredModels.length > 0 ? (
              filteredModels.map((m) => {
                const isSelected = m === llmModel;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectModel(m)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-xs font-mono transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#1c1d22] text-[#cc9166] font-bold border border-[#cc9166]/40'
                        : 'text-[#e2e3e9] hover:bg-[#121317]'
                    }`}
                  >
                    <span className="truncate">{m}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#cc9166] shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : searchQuery.trim() ? (
              <div className="space-y-2 p-2">
                <div className="text-center text-xs text-[#5e616e]">
                  No pre-listed model matches &quot;{searchQuery}&quot;
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectModel(searchQuery.trim())}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[8px] bg-[#121317] hover:bg-[#1c1d22] border border-[#cc9166]/40 text-[#cc9166] text-xs font-mono cursor-pointer"
                >
                  <span>Use custom model &quot;{searchQuery.trim()}&quot;</span>
                </button>
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-[#5e616e]">
                No models detected. Type a model name above to use it.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
