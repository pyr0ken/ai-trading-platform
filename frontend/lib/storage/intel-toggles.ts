'use client';

/**
 * Intel source toggles — single source of truth for "should the AI see news /
 * X feed".
 *
 * WHY THIS EXISTS
 * ---------------
 * The toggles are written from three places (header quick-toggle, settings
 * page) and read from two (header, dashboard page). The browser `storage`
 * event only fires in *other* tabs, so same-tab listeners never woke up and the
 * header pill kept rendering a stale value until a full remount.
 *
 * This module owns a custom same-tab event plus a `useIntelToggles` hook, so
 * every consumer re-renders the moment any of them flips a switch.
 */

import { useState, useEffect, useCallback } from 'react';
import { AppStorageEngine } from './app-db';

export const INTEL_TOGGLE_EVENT = 'intel-toggles-changed';

export interface IntelToggles {
  includeNews: boolean;
  includeSocial: boolean;
}

export interface LLMConfig {
  llmUrl: string;
  llmModel: string;
}

/** Read current LLM config from session. SSR-safe. */
export function readLLMConfig(): LLMConfig {
  if (typeof window === 'undefined') {
    return { llmUrl: 'http://127.0.0.1:20128/v1', llmModel: 'hermes' };
  }
  const session = AppStorageEngine.getSession();
  return {
    llmUrl: session.llmUrl || 'http://127.0.0.1:20128/v1',
    llmModel: session.llmModel || 'hermes',
  };
}

/** Persist selected LLM model and notify all subscribers immediately. */
export function setLLMModel(model: string): void {
  const trimmed = model.trim();
  if (!trimmed) return;
  AppStorageEngine.saveSession({ llmModel: trimmed });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INTEL_TOGGLE_EVENT));
  }
}

/** Hook for listening to and updating the active LLM model across any component. */
export function useActiveLLMModel(): {
  llmModel: string;
  llmUrl: string;
  setModel: (model: string) => void;
} {
  const [config, setConfig] = useState<LLMConfig>({
    llmUrl: 'http://127.0.0.1:20128/v1',
    llmModel: 'hermes',
  });

  useEffect(() => {
    const sync = () => setConfig(readLLMConfig());
    sync();
    window.addEventListener(INTEL_TOGGLE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(INTEL_TOGGLE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setModel = useCallback((model: string) => {
    setLLMModel(model);
  }, []);

  return { ...config, setModel };
}

/** Read current toggles, defaulting to News ON and Social OFF. SSR-safe. */
export function readIntelToggles(): IntelToggles {
  if (typeof window === 'undefined') {
    return { includeNews: true, includeSocial: false };
  }
  const session = AppStorageEngine.getSession();
  return {
    includeNews: session.includeNews ?? true,
    includeSocial: session.includeSocial ?? false,
  };
}

/** Persist a toggle and notify every listener in this tab and others. */
export function setIntelToggle(key: keyof IntelToggles, value: boolean): void {
  AppStorageEngine.saveSession({ [key]: value });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INTEL_TOGGLE_EVENT));
  }
}

/**
 * Subscribe to toggle state.
 *
 * Initial state is the enabled default rather than the stored value so server
 * and first client render agree; the stored value lands in the mount effect.
 * This avoids a hydration mismatch on the pill's styling.
 */
export function useIntelToggles(): IntelToggles & {
  toggleIntelSource: (key: keyof IntelToggles) => void;
} {
  const [toggles, setToggles] = useState<IntelToggles>({
    includeNews: true,
    includeSocial: false,
  });

  useEffect(() => {
    const sync = () => setToggles(readIntelToggles());
    sync();
    window.addEventListener(INTEL_TOGGLE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(INTEL_TOGGLE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggleIntelSource = useCallback((key: keyof IntelToggles) => {
    setIntelToggle(key, !readIntelToggles()[key]);
  }, []);

  return { ...toggles, toggleIntelSource };
}
