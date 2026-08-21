'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Cpu,
  Database,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  Globe2,
  Save,
  Newspaper,
  Radio,
  Share2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { ModelSelectorCombobox } from '@/components/settings/model-selector-combobox';
import { AppStorageEngine } from '@/lib/storage/app-db';
import { INTEL_TOGGLE_EVENT, useActiveLLMModel } from '@/lib/storage/intel-toggles';

export const TerminalSettingsPage: React.FC = () => {
  const [llmUrl, setLlmUrl] = useState(() => {
    const session = AppStorageEngine.getSession();
    return session.llmUrl || 'http://127.0.0.1:20128/v1';
  });
  const [llmModel, setLlmModel] = useState(() => {
    const session = AppStorageEngine.getSession();
    return session.llmModel || 'hermes';
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  // Starts true because the dropdown always fetches on mount.
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [defaultExchange, setDefaultExchange] = useState(() => {
    const session = AppStorageEngine.getSession();
    return session.selectedExchange || 'kucoin';
  });
  const [defaultTimeframe, setDefaultTimeframe] = useState(() => {
    const session = AppStorageEngine.getSession();
    return session.selectedTimeframe || '1h';
  });
  const [includeNews, setIncludeNews] = useState(() => {
    const session = AppStorageEngine.getSession();
    return session.includeNews ?? true;
  });
  const [includeSocial, setIncludeSocial] = useState(() => {
    const session = AppStorageEngine.getSession();
    return session.includeSocial ?? false;
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Fetch the model list for the currently-typed LLM URL (server-side proxy,
  // so the browser never hits the engine directly — no CORS issues).
  const loadModels = useCallback(async (url: string) => {
    try {
      const res = await fetch(`/api/llm/models?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const models: string[] = data?.models || [];
      setModelsError(null);
      setAvailableModels(models);
      // Keep stored model if available; otherwise use current or first available
      const savedModel = AppStorageEngine.getSession().llmModel;
      if (savedModel && models.includes(savedModel)) {
        setLlmModel(savedModel);
      } else if (models.length > 0) {
        setLlmModel((prev) => (models.includes(prev) ? prev : models[0]));
      }
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Failed to load models');
      setAvailableModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  // Load models on mount so the dropdown is populated immediately.
  useEffect(() => {
    const mountLoad = async () => {
      await loadModels(llmUrl);
    };
    mountLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshModels = useCallback(() => {
    setModelsLoading(true);
    loadModels(llmUrl);
  }, [loadModels, llmUrl]);

  const handleSaveSettings = () => {
    AppStorageEngine.saveSession({
      selectedExchange: defaultExchange,
      selectedTimeframe: defaultTimeframe,
      includeNews,
      includeSocial,
      llmUrl: llmUrl.trim() || 'http://127.0.0.1:20128/v1',
      llmModel,
    });
    // Wake up the header pill and the dashboard query key in this same tab.
    window.dispatchEvent(new CustomEvent(INTEL_TOGGLE_EVENT));
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
    const jsonStr = AppStorageEngine.exportFullBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `Workstation_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const res = AppStorageEngine.importFullBackup(content);
      if (res.success) {
        alert(`✅ Backup imported successfully! ${res.importedCount} keys restored.`);
        window.location.reload();
      } else {
        alert(`❌ Import failed: ${res.error || 'Invalid file format'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
            <div className="flex gap-2">
              <input
                type="text"
                value={llmUrl}
                onChange={(e) => setLlmUrl(e.target.value)}
                className="w-full bg-[#121317] border border-[#1c1d22] rounded-[9999px] px-4 py-2 text-xs text-[#e2e3e9] focus:border-[#777a88] focus:outline-none"
              />
              <button
                onClick={() => refreshModels()}
                disabled={modelsLoading}
                title="Refresh available models from this URL"
                className="shrink-0 px-3 py-2 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#cc9166] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                <RefreshCw className={`w-4 h-4 ${modelsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <span className="text-[10px] text-[#5e616e]">Default: 9router / Ollama at http://127.0.0.1:20128/v1</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9194a1] font-semibold">Institutional Model Engine</label>
            <ModelSelectorCombobox
              availableModels={availableModels}
              modelsLoading={modelsLoading}
              modelsError={modelsError}
              onRefresh={refreshModels}
              variant="full"
            />
            <span className="text-[10px] text-[#5e616e]">
              {availableModels.length > 0
                ? `${availableModels.length} models available — search by typing or select from popover`
                : 'Models are fetched automatically from the endpoint URL above'}
            </span>
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

      {/* Section 2B: News & Social Intelligence Inputs */}
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1c1d22] pb-3 text-[#cc9166] font-semibold text-xs">
          <Radio className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">QUANTITATIVE INTELLIGENCE FEEDS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#121317] border border-[#1c1d22] rounded-[10px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1c1d22] flex items-center justify-center text-[#cc9166]">
                <Newspaper className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-[#ffffff] text-xs">RSS News Intelligence</div>
                <p className="text-[10px] text-[#9194a1] font-sans">Incorporate CoinDesk & CoinTelegraph RSS briefs</p>
              </div>
            </div>
            <button
              onClick={() => setIncludeNews(!includeNews)}
              className={`px-3 py-1.5 rounded-full font-bold text-[10px] transition-all cursor-pointer border ${
                includeNews
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                  : 'bg-[#1c1d22] text-[#5e616e] border-[#2a2b32]'
              }`}
            >
              {includeNews ? 'ACTIVE' : 'DISABLED'}
            </button>
          </div>

          <div className="p-4 bg-[#121317] border border-[#1c1d22] rounded-[10px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1c1d22] flex items-center justify-center text-[#cc9166]">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-[#ffffff] text-xs">X / Twitter Social Feed</div>
                <p className="text-[10px] text-[#9194a1] font-sans">Incorporate primary movers (e.g. Trump, SEC, Whales)</p>
              </div>
            </div>
            <button
              onClick={() => setIncludeSocial(!includeSocial)}
              className={`px-3 py-1.5 rounded-full font-bold text-[10px] transition-all cursor-pointer border ${
                includeSocial
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                  : 'bg-[#1c1d22] text-[#5e616e] border-[#2a2b32]'
              }`}
            >
              {includeSocial ? 'ACTIVE' : 'DISABLED'}
            </button>
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#e2e3e9] transition-all cursor-pointer font-semibold"
              title="Export all LocalStorage settings, watchlists, paper account, and signal history"
            >
              <Download className="w-4 h-4 text-[#cc9166]" />
              <span>Export Full Backup</span>
            </button>

            <label className="flex items-center gap-1.5 px-4 py-2 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#e2e3e9] transition-all cursor-pointer font-semibold">
              <Upload className="w-4 h-4 text-[#cc9166]" />
              <span>Import Backup JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
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

