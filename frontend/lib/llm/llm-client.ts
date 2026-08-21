import { FullMarketContextPayload } from '@/types/analysis';
import {
  buildInstitutionalSystemPrompt,
  buildInstitutionalUserPrompt,
} from './institutional-prompt';
import { logPromptToFile } from './prompt-logger';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://127.0.0.1:20128/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'hermes';

export async function createLLMAnalysisStream(
  marketContext: FullMarketContextPayload & { symbol?: string; exchange?: string; timeframe?: string; mode?: 'scalp' | 'swing' },
  signal?: AbortSignal,
  model?: string
): Promise<ReadableStream<Uint8Array>> {
  // Explicit per-request model (from Terminal Settings) wins; otherwise fall
  // back to the env var, then to the hardcoded default.
  const resolvedModel = model?.trim() || LLM_MODEL;
  const symbol = marketContext.symbol || marketContext.metadata?.symbol || 'BTC/USDT';
  const exchange = marketContext.exchange || marketContext.metadata?.exchange || 'kucoin';
  const timeframe = marketContext.timeframe || marketContext.metadata?.primaryTimeframe || '1h';
  const mode = marketContext.mode || 'swing';

  const systemPrompt = buildInstitutionalSystemPrompt();
  const userPrompt = buildInstitutionalUserPrompt(symbol, exchange, timeframe, marketContext, mode);

  // 💾 DEBUG LOG: save the EXACT prompt + full raw payload before sending to the LLM.
    // This file lets us audit what the model actually receives and catch
    // over-summarization / dropped fields. Files land in ./logs/llm-prompts/
    try {
      await logPromptToFile(
        symbol,
        exchange,
        timeframe,
        mode,
        systemPrompt,
        userPrompt,
        marketContext
      );
    } catch (logErr) {
      // Logging must NEVER break analysis — swallow and continue
      console.error('[prompt-logger] Failed to save prompt to file:', logErr);
    }

  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolvedModel,
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
    const hasFetchFailed = typeof errorObject?.message === 'string' && errorObject.message.includes('fetch failed');
    if (errorObject?.code === 'ECONNREFUSED' || hasFetchFailed) {
      throw new Error(
        `Local LLM server at ${LLM_BASE_URL} is unreachable (ECONNREFUSED). Please verify 9router/Hermes LLM is running.`
      );
    }
    throw err;
  }
}
