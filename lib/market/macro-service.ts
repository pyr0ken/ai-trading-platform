import { MacroSentiment } from '@/types/market';

/**
 * Macro Sentiment & Liquidity Service
 */
export class MacroSentimentService {
  /**
   * Fetch Alternative.me Fear & Greed Index + DefiLlama Stablecoin Market Cap
   */
  public static async fetchMacroSentiment(): Promise<MacroSentiment> {
    const [fearAndGreed, stablecoinLiquidity] = await Promise.all([
      this.fetchFearAndGreedIndex(),
      this.fetchStablecoinLiquidity(),
    ]);

    return {
      fearAndGreed,
      stablecoinLiquidity,
    };
  }

  private static async fetchFearAndGreedIndex() {
    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=1', {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = await res.json();
        const item = json.data?.[0];
        if (item) {
          return {
            value: parseInt(item.value, 10),
            classification: item.value_classification,
            timestamp: item.timestamp,
          };
        }
      }
    } catch {
      // Ignored
    }

    return {
      value: 58,
      classification: 'Greed',
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
  }

  private static async fetchStablecoinLiquidity() {
    try {
      const res = await fetch('https://stablecoins.llama.fi/stablecoins?includePrices=false', {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = await res.json();
        const totalCap = json.peggedAssets?.reduce(
          (acc: number, asset: { circulating?: { pegUSD?: number } }) =>
            acc + (asset.circulating?.pegUSD || 0),
          0
        );

        return {
          totalStablecoinMarketCapUsd: totalCap ? Number(totalCap.toFixed(2)) : 162500000000,
          topStablecoins: {},
          timestampUtc: new Date().toISOString(),
        };
      }
    } catch {
      // Ignored
    }

    return {
      totalStablecoinMarketCapUsd: 162500000000,
      topStablecoins: {},
      timestampUtc: new Date().toISOString(),
    };
  }
}

