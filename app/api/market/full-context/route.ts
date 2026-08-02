import { NextResponse } from 'next/server';
import { CCXTMarketService } from '@/lib/market/ccxt-service';
import { ForexMarketService } from '@/lib/market/forex-service';
import { TechnicalIndicatorEngine } from '@/lib/market/indicators';
import { MacroSentimentService } from '@/lib/market/macro-service';
import { NewsService } from '@/lib/news/news-service';
import { EconomicCalendar } from '@/lib/market/economic-calendar';
import { FullMarketContextPayload } from '@/types/analysis';
import { ProcessedTimeframeData, CalculatedIndicators } from '@/types/market';
import { getPipInfo } from '@/lib/constants/forex-pairs';
import { CandleData } from '@/types/market';

/**
 * Process up to N items at a time to avoid memory spikes from concurrent fetches.
 */
async function runLimitedConcurrency<T>(
  items: string[],
  fn: (tf: string) => Promise<[string, T | null]>,
  concurrency = 2
): Promise<[string, T | null][]> {
  const results: [string, T | null][] = [];
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
    const pipInfo = getPipInfo(symbol);
    const isForex = pipInfo.isForex || exchange.toLowerCase() === 'forex' || exchange.toLowerCase() === 'oanda';
    const timeframes = Array.from(new Set(['5m', '15m', '1h', '4h', '1d', primaryTimeframe]));

    // 1. Fetch Ticker & Market structure based on market type
    let ticker;
    let derivatives = null;
    let microstructure;

    if (isForex) {
      ticker = await ForexMarketService.fetchTicker(symbol);
      derivatives = {
        swapSymbol: symbol,
        fundingRate: null,
        openInterest: null,
        markPrice: ticker.price,
        indexPrice: ticker.price,
        basisPremiumPct: 0,
      };
      microstructure = {
        orderBookDepth: {
          bestBid: ticker.bid,
          bestAsk: ticker.ask,
          spread: Number((ticker.ask - ticker.bid).toFixed(pipInfo.decimals)),
          spreadPercentage: 0.01,
          bidDepthVolumeTop20: 10000,
          askDepthVolumeTop20: 10000,
          imbalanceRatio: 1.0,
          orderBookPressure: 'NEUTRAL' as const,
        },
        volumeDeltaCvd: {
          sampleTradesCount: 100,
          takerBuyVolume: 500,
          takerSellVolume: 500,
          volumeDelta: 0,
          buySellRatio: 1.0,
          cvdSignal: 'BALANCED' as const,
        },
        liquidationsStatus: 'Balanced',
      };
    } else {
      const [t, d, m] = await Promise.all([
        CCXTMarketService.fetchTicker(symbol, exchange),
        CCXTMarketService.fetchDerivativesMetrics(symbol, exchange),
        CCXTMarketService.fetchMicrostructure(symbol, exchange),
      ]);
      ticker = t;
      derivatives = d;
      microstructure = m;
    }

    const [macroSentiment, news] = await Promise.all([
      MacroSentimentService.fetchMacroSentiment(),
      NewsService.getNewsPayload(5),
    ]);

    if (!ticker || ticker.price <= 0) {
      throw new Error(`Failed to fetch ticker data for ${symbol}. Market data is currently unavailable.`);
    }

    const CANDLE_LIMIT = 250;

    const candlesResults = await runLimitedConcurrency<ProcessedTimeframeData>(
      timeframes,
      async (tf) => {
        try {
          const rawCandles: CandleData[] = isForex
            ? await ForexMarketService.fetchOHLCV(symbol, tf, CANDLE_LIMIT)
            : await CCXTMarketService.fetchOHLCV(symbol, tf, CANDLE_LIMIT, exchange, ticker.price);

          const processedCandles = TechnicalIndicatorEngine.processCandleIndicators(rawCandles);
          const keyLevels = TechnicalIndicatorEngine.extractSupportResistance(rawCandles);
          const latestClose =
            processedCandles.length > 0
              ? processedCandles[processedCandles.length - 1].close
              : ticker!.price || 0;
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
        } catch (e) {
          // ZERO-FABRICATION POLICY: do NOT synthesize candles. Mark this
          // timeframe as unavailable so the prompt shows "N/A (Data Unavailable)".
          console.warn(`[API /market/full-context] Timeframe ${tf} data unavailable:`, e instanceof Error ? e.message : e);
          return [tf, null] as const;
        }
      },
      2
    );

    // timeframes whose data source failed are omitted (not synthesized):
    // the LLM prompt builder renders them as "N/A (Data Unavailable)".
    const timeframesData: Record<string, ProcessedTimeframeData> = {};
    for (const [tf, tfData] of candlesResults) {
      if (tfData) {
        timeframesData[tf] = tfData;
      }
    }

    const primaryTfData = timeframesData[primaryTimeframe];
    // Ensure we run extractTechnicalFacts on the EXACT primary timeframe requested by user
    const technicalFacts = primaryTfData?.candles?.length
      ? TechnicalIndicatorEngine.extractTechnicalFacts(primaryTfData.candles, primaryTfData.indicators)
      : undefined;

    // Only calculate BTC correlation for crypto symbols
    let btcCorrelation = 1.0;
    if (!isForex) {
      const cleanSym = symbol.toUpperCase().replace('-', '/');
      if (cleanSym !== 'BTC/USDT') {
        try {
          const btcCandles = await CCXTMarketService.fetchOHLCV('BTC/USDT', '1d', 40, exchange);
          const symbolCandles = timeframesData['1d']?.candles || [];

          const btcMap = new Map<number, number>();
          for (const bc of btcCandles) {
            btcMap.set(bc.timestamp, bc.close);
          }

          const btcPrices: number[] = [];
          const symbolPrices: number[] = [];

          for (const sc of symbolCandles) {
            const btcClose = btcMap.get(sc.timestamp);
            if (btcClose !== undefined) {
              symbolPrices.push(sc.close);
              btcPrices.push(btcClose);
            }
          }

          if (symbolPrices.length > 5) {
            btcCorrelation = TechnicalIndicatorEngine.calculatePearsonCorrelation(symbolPrices, btcPrices);
          }
        } catch {
          // Silently skip BTC correlation for non-crypto
        }
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
