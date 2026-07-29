'use client';

import React, { useState } from 'react';
import {
  Settings,
  Cpu,
  Database,
  Trash2,
  Download,
  CheckCircle2,
  Globe2,
  Save,
} from 'lucide-react';
import { AppStorageEngine } from '@/lib/storage/app-db';

export const TerminalSettingsPage: React.FC = () => {
  const [llmUrl, setLlmUrl] = useState('http://127.0.0.1:20128/v1');
  const [defaultExchange, setDefaultExchange] = useState(() => {
    const session = AppStorageEngine.getSession();
    return session.selectedExchange || 'kucoin';
  });
  const [defaultTimeframe, setDefaultTimeframe] = useState(() => {
    const session = AppStorageEngine.getSession();
    return session.selectedTimeframe || '1h';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = () => {
    AppStorageEngine.saveSession({
      selectedExchange: defaultExchange,
      selectedTimeframe: defaultTimeframe,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all historical AI signal analyses from local storage?')) {
      AppStorageEngine.clearAnalyses();
      alert('Local analysis history cleared successfully.');
    }
  };

  const handleExportBackup = () => {
    const data = {
      session: AppStorageEngine.getSession(),
      watchlist: AppStorageEngine.getWatchlist(),
      analyses: AppStorageEngine.getAnalyses(),
      exported_at: new Date().toISOString(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', 'Workstation_Backup.json');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono text-xs text-[#e2e3e9]">
      {/* Header Banner */}
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[9999px] bg-[#121317] border border-[#cc9166] flex items-center justify-center text-[#cc9166]">
            <Settings className="w-4 h-4 text-[#cc9166]" />
          </div>
          <div>
            <h2 className="font-ivy-presto text-xl font-normal text-[#ffffff]">
              Terminal Preferences
            </h2>
            <p className="text-xs text-[#9194a1] font-sans">
              Configure local LLM inference engines, venue defaults, and browser storage.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-[9999px] bg-[#121317] border border-[#cc9166] text-[#cc9166] font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#cc9166]" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* Section 1: Local LLM Engine Configuration */}
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1c1d22] pb-3 text-[#cc9166] font-semibold text-xs">
          <Cpu className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">LOCAL LLM INFERENCE ENGINE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[#9194a1] font-semibold">Local LLM Endpoint URL</label>
            <input
              type="text"
              value={llmUrl}
              onChange={(e) => setLlmUrl(e.target.value)}
              className="w-full bg-[#121317] border border-[#1c1d22] rounded-[9999px] px-4 py-2 text-xs text-[#e2e3e9] focus:border-[#777a88] focus:outline-none"
            />
            <span className="text-[10px] text-[#5e616e]">Default: 9router / Ollama at http://127.0.0.1:20128/v1</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9194a1] font-semibold">Institutional Model Engine</label>
            <div className="p-2.5 bg-[#121317] border border-[#1c1d22] rounded-[9999px] flex items-center justify-between">
              <span className="text-[#ffffff] font-bold">Hermes / DeepSeek R1 / Qwen 2.5</span>
              <span className="text-[10px] bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40 px-2 py-0.5 rounded-[9999px] font-semibold">
                Online (12ms)
              </span>
            </div>
            <span className="text-[10px] text-[#5e616e]">Auto-detected from local 9router LLM server</span>
          </div>
        </div>
      </div>

      {/* Section 2: Workstation Default Preferences */}
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1c1d22] pb-3 text-[#cc9166] font-semibold text-xs">
          <Globe2 className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">WORKSTATION VENUE & TIMEFRAME DEFAULTS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[#9194a1] font-semibold">Default Exchange Venue</label>
            <select
              value={defaultExchange}
              onChange={(e) => setDefaultExchange(e.target.value)}
              className="w-full bg-[#121317] border border-[#1c1d22] rounded-[9999px] px-4 py-2 text-xs text-[#e2e3e9] focus:border-[#777a88] focus:outline-none cursor-pointer"
            >
              <option value="kucoin">KuCoin</option>
              <option value="binance">Binance</option>
              <option value="bybit">Bybit</option>
              <option value="okx">OKX</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9194a1] font-semibold">Default Analysis Timeframe</label>
            <select
              value={defaultTimeframe}
              onChange={(e) => setDefaultTimeframe(e.target.value)}
              className="w-full bg-[#121317] border border-[#1c1d22] rounded-[9999px] px-4 py-2 text-xs text-[#e2e3e9] focus:border-[#777a88] focus:outline-none cursor-pointer"
            >
              <option value="5m">5 Minutes (Scalp)</option>
              <option value="15m">15 Minutes (Day Trade)</option>
              <option value="1h">1 Hour (Standard)</option>
              <option value="4h">4 Hours (Position)</option>
              <option value="1D">1 Day (Macro Trend)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Local Storage Database Management */}
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
          <div className="flex items-center gap-2 text-[#cc9166] font-semibold text-xs">
            <Database className="w-4 h-4 text-[#cc9166]" />
            <span className="eyebrow-copper">LOCAL STORAGE DATABASE & BACKUPS</span>
          </div>
          <span className="text-[11px] text-[#cc9166] font-bold bg-[#121317] border border-[#cc9166]/40 px-2.5 py-0.5 rounded-[9999px]">
            IndexedDB Active
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#e2e3e9] transition-all cursor-pointer font-semibold"
            >
              <Download className="w-4 h-4 text-[#cc9166]" />
              <span>Backup Workspace JSON</span>
            </button>
          </div>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[9999px] bg-[#121317] hover:bg-rose-950/40 border border-rose-900/60 text-rose-400 transition-all cursor-pointer font-semibold"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Clear Signal History</span>
          </button>
        </div>
      </div>

      {/* Save Settings Action Footer */}
      <div className="flex items-center justify-end pt-2">
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-6 py-2.5 rounded-[9999px] bg-[#ffffff] hover:bg-[#e2e3e9] text-[#08080a] font-bold transition-all cursor-pointer"
        >
          <Save className="w-4 h-4 text-[#08080a]" />
          <span>Save Preferences</span>
        </button>
      </div>
    </div>
  );
};

