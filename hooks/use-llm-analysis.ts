'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FullMarketContextPayload } from '@/types/analysis';
import { LogStep } from '@/components/analysis/live-status-logger';
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';
import { generateAdvancedPineScriptCode } from '@/lib/tradingview/pine-generator';
import { computeConvictionScore } from '@/lib/analysis/conviction-scorer';
import { validateAndCorrectPlaybook } from '@/lib/analysis/playbook-validator';
import { evaluateNoTradeGate } from '@/lib/analysis/no-trade-gate';
import { buildCostModel } from '@/lib/analysis/trading-costs';
import { normaliseSetupPaths } from '@/lib/analysis/setup-resolver';

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
      // Captured inside the parse block, read when building the record below,
      // so the resolver later charges the cost this signal actually faced.
      let roundTripCostPct: number | undefined;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedJson = JSON.parse(jsonMatch[1]);
      }

      if (parsedJson) {
        // Step 1: Validate and auto-correct model targets/SL against deterministic zones
        const validation = validateAndCorrectPlaybook(contextPayload, parsedJson);
        parsedJson.validation = validation;

        /**
         * Step 2: the no-trade gate.
         *
         * Runs after validation so it judges the CORRECTED prices, and before
         * conviction so its penalties can feed the score. This is the layer that
         * lets the platform decline a trade: a target that cannot clear a 0.30%
         * round trip is refused here no matter how confident the model sounded,
         * because taking it has negative expected value by arithmetic.
         */
        const costModel = contextPayload.costModel
          ?? buildCostModel(contextPayload.metadata?.exchange || 'kucoin', contextPayload.microstructure);
        roundTripCostPct = costModel?.roundTripCostPct;
        const gate = evaluateNoTradeGate(contextPayload, parsedJson, costModel);
        parsedJson.gate = gate;

        // Step 3: Compute deterministic 9-filter conviction score & soft-vetoes
        const conviction = computeConvictionScore(contextPayload, parsedJson);

        // The gate's penalties are additive on top of the filter score: a setup
        // that survives the filters can still be thin after costs.
        const gateAdjusted = Math.max(0, Math.round(conviction.final_score - gate.totalPenalty));
        conviction.final_score = gateAdjusted;
        if (gate.findings.length > 0) {
          conviction.vetoes = [
            ...(conviction.vetoes || []),
            ...gate.findings.map((f) => ({
              rule: `${f.tier}:${f.rule}`,
              penalty: f.penalty,
              detail: f.detail,
            })),
          ];
        }
        parsedJson.conviction = conviction;

        /**
         * Enforce the gate's verdict on the playbook the UI reads.
         *
         * Without this the gate would be advisory only — the card would still
         * render a tradeable setup while the findings sat unread in a side field.
         */
        if (gate.decision !== 'ALLOW' && parsedJson.playbook?.actionable) {
          parsedJson.playbook.actionable.status =
            gate.decision === 'NO_TRADE' ? 'NO_TRADE' : 'WAIT_FOR_ZONE';
          parsedJson.playbook.actionable.reasoning =
            `${gate.summary}\n\n${parsedJson.playbook.actionable.reasoning ?? ''}`.trim();
          if (gate.decision === 'NO_TRADE') {
            parsedJson.playbook.actionable.setup = null;
          }
        }
        if (gate.decision === 'NO_TRADE') {
          // Keep the top-level signal consistent with the refusal so downstream
          // consumers (history table, resolver, sidebar stats) do not record a
          // trade that the platform declined to take.
          parsedJson.signal = 'NEUTRAL';
        }

        // Sync model's subjective confidence with deterministic score
        parsedJson.confidence = conviction.final_score;

        /**
         * Step 5: mirror the final setup into BOTH schema paths.
         *
         * Runs last so it reflects every correction above: validator price
         * snapping, gate refusals, and the NO_TRADE clearing. After this the
         * auto-resolver — which historically read only `trade_setup` — sees the
         * same object the gate and scorer judged, so no signal can be analysed
         * and displayed yet silently excluded from the win-rate statistics.
         */
        normaliseSetupPaths(parsedJson);
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
        ...(typeof roundTripCostPct === 'number' && Number.isFinite(roundTripCostPct)
          ? { round_trip_cost_pct: roundTripCostPct }
          : {}),
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
        label: 'Aggregating Macro Sentiment',
        status: 'completed',
        detail: `Fear & Greed Index: ${contextPayload.macroSentiment?.fearAndGreed?.value ?? 50}`,
      },
      {
        id: 'step-4a',
        label: 'Scoring & Ranking RSS News Intelligence',
        status: 'completed',
        detail: contextPayload.newsIntelligence
          ? `Scanned ${contextPayload.newsIntelligence.brief.sourceArticleCount} articles | Macro Bias: ${contextPayload.newsIntelligence.brief.aggregateBias}`
          : 'RSS News Feed: Disabled or Unavailable',
        subItems: contextPayload.newsIntelligence?.rankedArticles?.slice(0, 2).map((a) => ({
          source: a.source || 'RSS News',
          text: a.title,
          badge: `${Math.round(a.relevance ?? 50)}% REL`,
        })),
      },
      {
        id: 'step-4b',
        label: 'X/Twitter Primary Mover Feed & Cross-Domain Relevance Filter',
        status: 'completed',
        detail: contextPayload.socialIntel
          ? `Scanned ${contextPayload.socialIntel.counts.considered} items -> Surfaced ${contextPayload.socialIntel.counts.kept} relevant posts${
              contextPayload.socialIntel.enriched ? ' (LLM Enriched)' : ''
            }`
          : 'X/Twitter Social Feed: Disabled or Unavailable',
        subItems: contextPayload.socialIntel?.items?.slice(0, 3).map((item) => ({
          source: item.source,
          text: item.text,
          badge: `${Math.round((item.relevance || 0) * 100)}% REL`,
          url: item.url,
        })),
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

      // Send the model selected in Terminal Settings (saved in the session)
      // so the analysis stream route uses the same engine the trader chose.
      const session = AppStorageEngine.getSession();
      const selectedModel = session.llmModel?.trim() || undefined;

      const response = await fetch('/api/analysis/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          selectedModel ? { ...enrichedPayload, model: selectedModel } : enrichedPayload
        ),
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
