import { NextResponse } from 'next/server';
import { CCXTMarketService } from '@/lib/market/ccxt-service';
import { TechnicalIndicatorEngine } from '@/lib/market/indicators';
import { MacroSentimentService } from '@/lib/market/macro-service';
import { NewsService } from '@/lib/news/news-service';
import { EconomicCalendar } from '@/lib/market/economic-calendar';
import { FullMarketContextPayload } from '@/types/analysis';
import { ProcessedTimeframeData, CalculatedIndicators } from '@/types/market';

/**
 * Process up to N items at a time to avoid memory spikes from concurrent CCXT fetches.
 */
async function runLimitedConcurrency(
  items: string[],
  fn: (tf: string) => Promise<[string, ProcessedTimeframeData]>,
  concurrency = 2
): Promise<[string, ProcessedTimeframeData][]> {
  const results: [string, ProcessedTimeframeData][] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';
  const exchange = searchParams.get('exchange') || 'kucoin';
  const primaryTimeframe = searchParams.get('timeframe') || '1h';

  try {
    const timeframes = Array.from(new Set(['5m', '15m', '1h', '4h', '1d', primaryTimeframe]));

    // 1. Fetch Ticker & Macro components first (these are lightweight)
    const [ticker, macroSentiment, derivatives, microstructure, news] = await Promise.all([
      CCXTMarketService.fetchTicker(symbol, exchange),
      MacroSentimentService.fetchMacroSentiment(),
      CCXTMarketService.fetchDerivativesMetrics(symbol, exchange),
      CCXTMarketService.fetchMicrostructure(symbol, exchange),
      NewsService.getNewsPayload(5),
    ]);

    // 2. Fetch Timeframe Candles — limit concurrency to avoid memory pileup,
    //    reduce candles from 60→40 (enough for EMA50/SMA50) to cut computation
    const CANDLE_LIMIT = 40;
    const candlesResults = await runLimitedConcurrency(
      timeframes,
      async (tf) => {
        const rawCandles = await CCXTMarketService.fetchOHLCV(symbol, tf, CANDLE_LIMIT, exchange);
        const processedCandles = TechnicalIndicatorEngine.processCandleIndicators(rawCandles);
        const keyLevels = TechnicalIndicatorEngine.extractSupportResistance(rawCandles);
        const latestClose =
          processedCandles.length > 0
            ? processedCandles[processedCandles.length - 1].close
            : ticker.price || 0;
        const latestIndicators =
          processedCandles.length > 0
            ? processedCandles[processedCandles.length - 1].indicators
            : ({} as CalculatedIndicators);

        const tfData: ProcessedTimeframeData = {
          timeframe: tf,
          candleCount: rawCandles.length,
          latestClose,
          indicators: latestIndicators,
          keyLevels,
          candles: processedCandles,
        };
        return [tf, tfData] as const;
      },
      2
    );

    const timeframesData: Record<string, ProcessedTimeframeData> = {};
    for (const [tf, tfData] of candlesResults) {
      timeframesData[tf] = tfData;
    }

    const primaryTfData = timeframesData[primaryTimeframe];
    // extractTechnicalFacts recalculates all indicators — pass pre-computed data so
    // it doesn't redo EMA/RSI/MACD/ATR/ADX from scratch on the raw candle array
    const technicalFacts = primaryTfData?.candles?.length
      ? TechnicalIndicatorEngine.extractTechnicalFacts(primaryTfData.candles, primaryTfData.indicators)
      : undefined;

    let btcCorrelation = 1.0;
    const cleanSym = symbol.toUpperCase().replace('-', '/');
    if (cleanSym !== 'BTC/USDT') {
      try {
        const btcCandles = await CCXTMarketService.fetchOHLCV('BTC/USDT', '1d', 40, exchange);
        const symbolCandles = timeframesData['1d']?.candles || [];
        
        const btcPrices: number[] = [];
        const symbolPrices: number[] = [];
        
        for (const sc of symbolCandles) {
          const matchingBtc = btcCandles.find(bc => bc.timestamp === sc.timestamp);
          if (matchingBtc) {
            symbolPrices.push(sc.close);
            btcPrices.push(matchingBtc.close);
          }
        }
        
        if (symbolPrices.length > 5) {
          btcCorrelation = TechnicalIndicatorEngine.calculatePearsonCorrelation(symbolPrices, btcPrices);
        }
      } catch (e) {
        console.warn('Failed to calculate BTC correlation:', e);
      }
    }

    if (technicalFacts) {
      technicalFacts.btcCorrelation = btcCorrelation;
    }

    const economicWarnings = EconomicCalendar.getEconomicWarnings();

    const payload: FullMarketContextPayload = {
      metadata: {
        symbol,
        exchange,
        primaryTimeframe,
        timestampUtc: new Date().toISOString(),
      },
      ticker,
      macroSentiment,
      derivatives,
      microstructure,
      news,
      timeframes: timeframesData,
      technicalFacts,
      economicWarnings,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[API /market/full-context] Error:', err);
    return NextResponse.json(
      { error: 'Failed to aggregate market data context.' },
      { status: 500 }
    );
  }
}

