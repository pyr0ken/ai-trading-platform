import { FullMarketContextPayload } from '@/types/analysis';
import {
  buildInstitutionalSystemPrompt,
  buildInstitutionalUserPrompt,
} from './institutional-prompt';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://127.0.0.1:20128/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'hermes';

export async function createLLMAnalysisStream(
  marketContext: FullMarketContextPayload & { symbol?: string; exchange?: string; timeframe?: string },
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const symbol = marketContext.symbol || marketContext.metadata?.symbol || 'BTC/USDT';
  const exchange = marketContext.exchange || marketContext.metadata?.exchange || 'kucoin';
  const timeframe = marketContext.timeframe || marketContext.metadata?.timeframe || '1h';

  const systemPrompt = buildInstitutionalSystemPrompt();
  const userPrompt = buildInstitutionalUserPrompt(symbol, exchange, timeframe, marketContext);

  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        stream: true,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => 'Unknown LLM Error');
      throw new Error(`LLM API returned HTTP ${response.status}: ${errText}`);
    }

    return response.body;
  } catch (err) {
    const errorObject = err as Record<string, unknown>;
    if (errorObject?.code === 'ECONNREFUSED' || errorObject?.message?.includes('fetch failed')) {
      throw new Error(
        `Local LLM server at ${LLM_BASE_URL} is unreachable (ECONNREFUSED). Please verify 9router/Hermes LLM is running.`
      );
    }
    throw err;
  }
}
