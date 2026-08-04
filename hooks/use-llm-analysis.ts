'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FullMarketContextPayload } from '@/types/analysis';
import { LogStep } from '@/components/analysis/live-status-logger';
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';
import { generateAdvancedPineScriptCode } from '@/lib/tradingview/pine-generator';
import { computeConvictionScore } from '@/lib/analysis/conviction-scorer';
import { validateAndCorrectPlaybook } from '@/lib/analysis/playbook-validator';

export function useLLMAnalysis() {
  const [analysisText, setAnalysisTextState] = useState<string>('');

  const setAnalysisText = useCallback((text: string) => {
    setAnalysisTextState(text);
  }, []);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [logSteps, setLogSteps] = useState<LogStep[]>([
    {
      id: 'step-1',
      label: 'Initializing Exchange API & CCXT Data Engine',
      status: 'pending',
    },
    {
      id: 'step-2',
      label: 'Fetching OHLCV Candlesticks, Order Book & Volume Delta (CVD)',
      status: 'pending',
    },
    {
      id: 'step-3',
      label: 'Calculating Server-Side Technical Indicators (EMA 7/20/50, RSI, MACD, S&R)',
      status: 'pending',
    },
    {
      id: 'step-4',
      label: 'Aggregating Fear & Greed Index and News Feeds',
      status: 'pending',
    },
    {
      id: 'step-5',
      label: 'Connecting to Local LLM Engine (http://127.0.0.1:20128/v1)',
      status: 'pending',
    },
    {
      id: 'step-6',
      label: 'Streaming AI Analysis & Trade Signal Payload',
      status: 'pending',
    },
  ]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const autoSaveToLocalStorage = useCallback((text: string, contextPayload: FullMarketContextPayload) => {
    if (!text) return;
    try {
      let parsedJson = null;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedJson = JSON.parse(jsonMatch[1]);
      }

      if (parsedJson) {
        // Step 1: Validate and auto-correct model targets/SL against deterministic zones
        const validation = validateAndCorrectPlaybook(contextPayload, parsedJson);
        parsedJson.validation = validation;

        // Step 2: Compute deterministic 9-filter conviction score & soft-vetoes
        const conviction = computeConvictionScore(contextPayload, parsedJson);
        parsedJson.conviction = conviction;

        // Sync model's subjective confidence with deterministic score
        parsedJson.confidence = conviction.final_score;
      }

      const sym = contextPayload.metadata?.symbol || 'BTC/USDT';
      const pineCode = generateAdvancedPineScriptCode(parsedJson, sym);

      const record: StoredAnalysisRecord = {
        id: 'analysis_' + Date.now(),
        symbol: sym,
        exchange: contextPayload.metadata?.exchange || 'kucoin',
        timeframe: contextPayload.metadata?.primaryTimeframe || '1h',
        price: contextPayload.ticker?.price || 0,
        signal: parsedJson?.playbook?.bias || parsedJson?.signal || 'NEUTRAL',
        confidence: parsedJson?.confidence || 75,
        risk_level: parsedJson?.risk_level || 'MEDIUM',
        json_output: parsedJson,
        markdown_report: text,
        pine_script: pineCode,
        created_at: new Date().toISOString(),
        accuracy_evaluation: {
          status: 'PENDING',
          current_price: contextPayload.ticker?.price || 0,
          pnl_percentage: 0,
        },
      };
      AppStorageEngine.saveAnalysis(record);
    } catch (e) {
      console.warn('[useLLMAnalysis] Failed to auto-save analysis to local storage:', e);
    }
  }, []);

  const triggerAnalysis = useCallback(async (contextPayload: FullMarketContextPayload) => {
    if (!contextPayload) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setIsStreaming(true);
    setAnalysisText('');
    setError(null);

    setLogSteps([
      {
        id: 'step-1',
        label: 'Initializing Exchange API & CCXT Data Engine',
        status: 'completed',
        detail: `Connected to ${contextPayload.metadata?.exchange?.toUpperCase() || 'EXCHANGE'} exchange`,
      },
      {
        id: 'step-2',
        label: 'Fetching OHLCV Candlesticks, Order Book & Volume Delta (CVD)',
        status: 'completed',
        detail: `Fetched price $${contextPayload.ticker?.price} across multi-timeframe candles`,
      },
      {
        id: 'step-3',
        label: 'Calculating Server-Side Technical Indicators (EMA 7/20/50, RSI, MACD, S&R)',
        status: 'completed',
        detail: 'Computed EMA 7/20/50/200, RSI 14, MACD, Bollinger Bands, ATR & S&R levels',
      },
      {
        id: 'step-4',
        label: 'Aggregating Fear & Greed Index and News Feeds',
        status: 'completed',
        detail: `Fear & Greed Index: ${contextPayload.macroSentiment?.fearAndGreed?.value ?? 50}`,
      },
      {
        id: 'step-5',
        label: 'Connecting to Local LLM Engine (http://127.0.0.1:20128/v1)',
        status: 'in_progress',
        detail: 'Sending quantitative payload to 9router Hermes LLM...',
      },
      {
        id: 'step-6',
        label: 'Streaming AI Analysis & Trade Signal Payload',
        status: 'pending',
      },
    ]);

    try {
      const currentSymbol = contextPayload.metadata?.symbol || 'BTC/USDT';
      const allAnalyses = AppStorageEngine.getAnalyses();
      const symbolAnalyses = allAnalyses
        .filter((rec) => rec.symbol.toUpperCase() === currentSymbol.toUpperCase())
        .slice(0, 5)
        .map((rec) => {
          const isNonTradeSignal = rec.signal === 'NEUTRAL' || rec.signal === 'HOLD';
          return {
            signal: rec.signal,
            confidence: rec.confidence,
            price: rec.price,
            created_at: rec.created_at,
            status: isNonTradeSignal ? 'NO_TRADE' : (rec.accuracy_evaluation?.status || 'PENDING'),
            pnl_percentage: isNonTradeSignal ? 0 : (rec.accuracy_evaluation?.pnl_percentage ?? 0),
          };
        });

      const enrichedPayload = {
        ...contextPayload,
        recentHistoricalSignals: symbolAnalyses,
      };

      const response = await fetch('/api/analysis/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrichedPayload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errMsg = `LLM Stream HTTP error ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
          if (errData.details) errMsg += ` \nDetails: ${Array.isArray(errData.details) ? errData.details.join('\n') : errData.details}`;
        } catch {}
        throw new Error(errMsg);
      }

      setLogSteps((prev) =>
        prev.map((step) =>
          step.id === 'step-5'
            ? { ...step, status: 'completed', detail: 'Local LLM connected successfully.' }
            : step.id === 'step-6'
            ? { ...step, status: 'in_progress', detail: 'Streaming dual JSON & Markdown tokens...' }
            : step
        )
      );

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('text/event-stream')) {
        const text = await response.text();
        setAnalysisText(text);
        setIsLoading(false);
        setIsStreaming(false);
        autoSaveToLocalStorage(text, contextPayload);
        setLogSteps((prev) =>
          prev.map((step) =>
            step.id === 'step-6' ? { ...step, status: 'completed', detail: 'Standalone analysis loaded.' } : step
          )
        );
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body reader unavailable.');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      let pendingBatch = '';
      let rafId: number | null = null;

      const flushPending = () => {
        if (pendingBatch) {
          const chunk = pendingBatch;
          pendingBatch = '';
          setAnalysisTextState((prev) => prev + chunk);
        }
        rafId = null;
      };

      const scheduleFlush = () => {
        if (rafId === null) {
          rafId = requestAnimationFrame(flushPending);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            if (rafId !== null) cancelAnimationFrame(rafId);
            flushPending();
            setIsStreaming(false);
            autoSaveToLocalStorage(accumulatedText, contextPayload);
            setLogSteps((prev) =>
              prev.map((step) =>
                step.id === 'step-6'
                  ? { ...step, status: 'completed', detail: 'Full analysis stream finished.' }
                  : step
              )
            );
            return;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.replace('data: ', ''));
              const tokenContent = json.choices?.[0]?.delta?.content || json.content || '';
              if (tokenContent) {
                accumulatedText += tokenContent;
                pendingBatch += tokenContent;
                scheduleFlush();
              }
              if (json.error) {
                setError(json.error);
                setLogSteps((prev) =>
                  prev.map((step) =>
                    step.id === 'step-6'
                      ? { ...step, status: 'failed', detail: json.error }
                      : step
                  )
                );
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }
      if (rafId !== null) cancelAnimationFrame(rafId);
      flushPending();
      setIsStreaming(false);
      autoSaveToLocalStorage(accumulatedText, contextPayload);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[useLLMAnalysis] Exception:', err);
        setError(err.message || 'Error connecting to local LLM server');
        setLogSteps((prev) =>
          prev.map((step) =>
            step.id === 'step-5' || step.id === 'step-6'
              ? { ...step, status: 'failed', detail: err.message }
              : step
          )
        );
      } else if (err && typeof err === 'object' && 'name' in err && err.name !== 'AbortError') {
        const errMsg = 'message' in err && typeof err.message === 'string' ? err.message : 'Error connecting to local LLM server';
        console.error('[useLLMAnalysis] Exception:', err);
        setError(errMsg);
        setLogSteps((prev) =>
          prev.map((step) =>
            step.id === 'step-5' || step.id === 'step-6'
              ? { ...step, status: 'failed', detail: errMsg }
              : step
          )
        );
      }
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [autoSaveToLocalStorage, setAnalysisText]);

  return {
    analysisText,
    setAnalysisText,
    isStreaming,
    isLoading,
    error,
    logSteps,
    runAnalysis: triggerAnalysis,
    stopAnalysis: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsLoading(false);
      setIsStreaming(false);
      setLogSteps((prev) =>
        prev.map((step) =>
          step.status === 'in_progress'
            ? { ...step, status: 'failed', detail: 'Cancelled by user' }
            : step
        )
      );
    },
    resetAnalysis: () => {
      setAnalysisTextState('');
      setError(null);
      setIsLoading(false);
      setIsStreaming(false);
      setLogSteps((prev) => prev.map(s => ({ ...s, status: 'pending', detail: undefined })));
    }
  };
}
