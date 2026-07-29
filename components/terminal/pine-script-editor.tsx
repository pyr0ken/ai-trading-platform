'use client';

import React, { useState, useEffect } from 'react';
import { Code2, Copy, Check, Download, RefreshCw, Terminal, Edit3, Eye, Sliders } from 'lucide-react';
import { StructuredLLMOutput } from '@/types/terminal';
import { generateAdvancedPineScriptCode, PineCustomizationOptions } from '@/lib/tradingview/pine-generator';

interface PineScriptEditorProps {
  data?: StructuredLLMOutput | null;
  symbol: string;
  isLoading?: boolean;
}

export const PineScriptEditor: React.FC<PineScriptEditorProps> = ({ data, symbol, isLoading }) => {
  const [copied, setCopied] = useState(false);
  const [scriptVersion, setScriptVersion] = useState(1);
  const [options, setOptions] = useState<PineCustomizationOptions>({
    version: 'v5',
    useAdxFilter: false,
    fastEma: 20,
    slowEma: 50,
    useTrailingStop: false,
  });

  const generatedCode = generateAdvancedPineScriptCode(data ?? null, symbol, options);
  const [editableCode, setEditableCode] = useState(generatedCode);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setEditableCode(generatedCode);
    });
  }, [generatedCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = editableCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    const cleanSym = symbol.replace('/', '_').toUpperCase();
    const blob = new Blob([editableCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AI_Signal_${cleanSym}.pine`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerate = () => {
    const fresh = generateAdvancedPineScriptCode(data ?? null, symbol, options);
    setEditableCode(fresh);
    setScriptVersion((v) => v + 1);
  };

  // Syntax highlighting helper for Pine Script v5
  const renderHighlightedCode = (code: string) => {
    const lines = code.split('\n');
    return lines.map((line, idx) => {
      const highlighted = line
        // Comments
        .replace(/(\/\/.+$)/g, '<span class="text-[#5e616e] italic">$1</span>')
        // Pine Script Keywords
        .replace(/\b(indicator|strategy|plot|plotshape|plotcandle|line|label|table|alertcondition)\b/g, '<span class="text-[#cc9166] font-bold">$1</span>')
        .replace(/\b(if|else|for|while|var|varip|return)\b/g, '<span class="text-rose-400 font-semibold">$1</span>')
        .replace(/\b(ta\.ema|ta\.sma|ta\.rsi|ta\.vwap|ta\.atr|ta\.crossover|ta\.crossunder)\b/g, '<span class="text-[#38bdf8] font-semibold">$1</span>')
        .replace(/\b(color\.green|color\.red|color\.blue|color\.new|color\.white|color\.gray)\b/g, '<span class="text-emerald-400">$1</span>')
        .replace(/\b(true|false|na)\b/g, '<span class="text-[#cc9166] font-semibold">$1</span>')
        .replace(/\b(title|shorttitle|overlay|color|style|linewidth|location|size|text|textcolor)\b(?=\=)/g, '<span class="text-[#e2e3e9]">$1</span>');

      return (
        <div key={idx} className="flex items-start hover:bg-[#121317] px-2 py-0.5 rounded font-mono text-[11px]">
          <span className="w-8 text-right pr-3 text-[#5e616e] select-none shrink-0 font-mono text-[10px]">
            {idx + 1}
          </span>
          <span
            className="flex-1 whitespace-pre-wrap text-[#e2e3e9]"
            dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }}
          />
        </div>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] animate-pulse space-y-4">
        <div className="h-6 w-48 bg-[#121317] rounded-[9999px]" />
        <div className="h-44 bg-[#121317] rounded-[10px]" />
      </div>
    );
  }

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">
            TRADINGVIEW PINE SCRIPT V5 ALGO EDITOR
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-[9999px] bg-[#121317] border border-[#1c1d22] text-xs text-[#cc9166] font-mono hover:bg-[#1c1d22] transition-all cursor-pointer"
          >
            {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{isEditing ? 'Syntax View' : 'Edit Mode'}</span>
          </button>
          <span className="text-[10px] text-[#cc9166] font-mono bg-[#121317] border border-[#cc9166]/40 px-2.5 py-0.5 rounded-[9999px]">
            v5 Pine Engine
          </span>
        </div>
      </div>

      <p className="text-xs text-[#9194a1] leading-relaxed">
        Interactive Pine Script Editor with syntax color highlighting. Customize indicators, EMA levels, VWAP bands, and alert conditions.
      </p>

      {/* Pine Script Settings Panel */}
      <div className="bg-[#121317] border border-[#1c1d22] p-4 rounded-none space-y-3 font-sans text-xs">
        <div className="flex items-center gap-1.5 font-bold text-[#cc9166] uppercase text-[10px] tracking-wider mb-1">
          <Sliders className="w-3.5 h-3.5 text-[#cc9166]" />
          <span>Interactive Script Customization</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Version and EMAs input */}
          <div className="space-y-3">
            <div>
              <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Pine Script Version</label>
              <select
                value={options.version}
                onChange={(e) => setOptions(prev => ({ ...prev, version: e.target.value as 'v4' | 'v5' }))}
                className="w-full bg-[#08080a] border border-[#1c1d22] px-2.5 py-1.5 text-white font-mono outline-none"
              >
                <option value="v5">Version 5 (v5 - Modern)</option>
                <option value="v4">Version 4 (v4 - Legacy)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Fast EMA</label>
                <input
                  type="number"
                  value={options.fastEma}
                  onChange={(e) => setOptions(prev => ({ ...prev, fastEma: parseInt(e.target.value) || 20 }))}
                  className="w-full bg-[#08080a] border border-[#1c1d22] px-2 py-1 text-white font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Slow EMA</label>
                <input
                  type="number"
                  value={options.slowEma}
                  onChange={(e) => setOptions(prev => ({ ...prev, slowEma: parseInt(e.target.value) || 50 }))}
                  className="w-full bg-[#08080a] border border-[#1c1d22] px-2 py-1 text-white font-mono text-center"
                />
              </div>
            </div>
          </div>

          {/* ADX Filter */}
          <div className="flex flex-col justify-between">
            <div>
              <label className="block text-[#5e616e] text-[9px] uppercase mb-1">ADX Trend Filter</label>
              <p className="text-[10px] text-[#5e616e] leading-snug mb-2">
                Only trigger breakout shapes when ADX value is above 20 (reduces fakeouts).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOptions(prev => ({ ...prev, useAdxFilter: !prev.useAdxFilter }))}
              className={`w-full py-2 px-3 border text-center font-bold font-sans cursor-pointer text-[10px] ${
                options.useAdxFilter
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                  : 'bg-[#08080a] border-[#1c1d22] text-[#5e616e]'
              }`}
            >
              {options.useAdxFilter ? 'ADX FILTER ACTIVE' : 'ADX FILTER INACTIVE'}
            </button>
          </div>

          {/* Trailing Stop */}
          <div className="flex flex-col justify-between">
            <div>
              <label className="block text-[#5e616e] text-[9px] uppercase mb-1">Trailing Stop Loss</label>
              <p className="text-[10px] text-[#5e616e] leading-snug mb-2">
                Plot dynamic trailing stop bounds tracking the price action highs and lows.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOptions(prev => ({ ...prev, useTrailingStop: !prev.useTrailingStop }))}
              className={`w-full py-2 px-3 border text-center font-bold font-sans cursor-pointer text-[10px] ${
                options.useTrailingStop
                  ? 'bg-amber-950/60 text-amber-400 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                  : 'bg-[#08080a] border-[#1c1d22] text-[#5e616e]'
              }`}
            >
              {options.useTrailingStop ? 'TRAILING STOP ACTIVE' : 'TRAILING STOP INACTIVE'}
            </button>
          </div>
        </div>
      </div>

      {/* Editor Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121317] border border-[#1c1d22] p-2.5 rounded-[10px]">
        <div className="flex items-center gap-2 text-xs font-mono text-[#ffffff]">
          <Terminal className="w-4 h-4 text-[#cc9166]" />
          <span>{symbol.replace('/', '')}_AI_v{scriptVersion}.pine</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            title="Reset & Regenerate Script"
            className="p-1.5 rounded-[9999px] bg-[#08080a] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#9194a1] hover:text-[#e2e3e9] transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDownload}
            title="Download .pine File"
            className="flex items-center gap-1 px-3 py-1 rounded-[9999px] bg-[#08080a] hover:bg-[#1c1d22] border border-[#1c1d22] text-xs text-[#9194a1] hover:text-[#e2e3e9] transition-all cursor-pointer font-mono"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-[9999px] text-xs font-medium transition-all cursor-pointer ${
              copied
                ? 'bg-[#121317] text-[#cc9166] border border-[#cc9166]'
                : 'bg-[#ffffff] hover:bg-[#e2e3e9] text-[#08080a]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#cc9166]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Script</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Editor Window */}
      {isEditing ? (
        <div className="relative bg-[#08080a] border border-[#1c1d22] focus-within:border-[#777a88] rounded-[10px] p-3 max-h-80 overflow-y-auto font-mono text-[11px] text-[#e2e3e9] leading-relaxed">
          <textarea
            value={editableCode}
            onChange={(e) => setEditableCode(e.target.value)}
            spellCheck={false}
            className="w-full h-72 bg-transparent text-[#e2e3e9] focus:outline-none resize-none font-mono text-xs leading-relaxed"
          />
        </div>
      ) : (
        <div className="relative bg-[#08080a] border border-[#1c1d22] rounded-[10px] py-3 max-h-80 overflow-y-auto">
          {renderHighlightedCode(editableCode)}
        </div>
      )}

      {/* Usage Guide */}
      <div className="bg-[#121317] border border-[#1c1d22] rounded-[10px] p-3.5 text-xs text-[#5e616e] space-y-1">
        <span className="text-[#e2e3e9] font-semibold text-[11px] block">
          How to load in TradingView:
        </span>
        <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#9194a1]">
          <li>Click <strong>Copy Script</strong> above.</li>
          <li>Open TradingView and click <strong>Pine Editor</strong> at the bottom.</li>
          <li>Paste the code into the editor and click <strong>Add to Chart</strong>.</li>
        </ol>
      </div>
    </div>
  );
};
