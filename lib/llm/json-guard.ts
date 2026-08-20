import { z } from 'zod';

export const SignalSchema = z.object({
  signal: z.enum(['BUY', 'SELL', 'HOLD', 'NEUTRAL']),
  confidence: z.number().min(0).max(100),
  risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  market_phase: z.string(),
  probabilities: z.object({
    bullish: z.number(),
    bearish: z.number(),
    sideways: z.number(),
  }),
  trade_setup: z.object({
    position: z.enum(['LONG', 'SHORT', 'NEUTRAL']),
    entry_range: z.tuple([z.number(), z.number()]),
    stop_loss: z.number(),
    take_profit_1: z.number(),
    take_profit_2: z.number(),
    take_profit_3: z.number(),
    risk_reward_ratio: z.number(),
  }),
});

/**
 * Attempts to extract, clean, and parse JSON from a raw string, repairing truncated elements if possible.
 */
export function tryRepairJSON(raw: string): string {
  let cleaned = raw.trim();

  // Extract JSON contents if wrapped in markdown code blocks
  const jsonMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    cleaned = jsonMatch[1].trim();
  } else if (cleaned.includes('```')) {
    // If there's an open markdown code block but no closing one
    const partialMatch = cleaned.match(/```json\s*([\s\S]*)/);
    if (partialMatch && partialMatch[1]) {
      cleaned = partialMatch[1].trim();
    }
  }

  // If there are trailing characters like a closing code block, clean them
  cleaned = cleaned.replace(/```$/, '').trim();

  // Attempt standard JSON parse
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Attempt balancing curly braces for truncated LLM JSON stream
    const openBraces = (cleaned.match(/\{/g) || []).length;
    let closeBraces = (cleaned.match(/\}/g) || []).length;
    
    // Balance braces
    while (openBraces > closeBraces) {
      cleaned += '}';
      closeBraces++;
    }

    // Attempt balancing brackets
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    let closeBrackets = (cleaned.match(/\]/g) || []).length;
    while (openBrackets > closeBrackets) {
      cleaned += ']';
      closeBrackets++;
    }

    // Clean up trailing commas immediately preceding closing braces or brackets
    cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch {
      // If still invalid, try to find a valid JSON substring matching the outermost curly braces
      const firstCurly = cleaned.indexOf('{');
      const lastCurly = cleaned.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        const candidate = cleaned.substring(firstCurly, lastCurly + 1);
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          return '';
        }
      }
      return '';
    }
  }
}

/**
 * Robust, fail-safe JSON extractor that parses JSON from LLM output across multiple format strategies
 * (```json blocks, generic markdown code blocks, raw { ... } bracket matches).
 */
export function extractAndParseJSON(text: string): Record<string, unknown> | null {
  if (!text) return null;

  // Strategy 1: Explicit ```json ... ``` code block
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonMatch && jsonMatch[1]) {
    const repaired = tryRepairJSON(jsonMatch[1]);
    if (repaired) {
      try {
        return JSON.parse(repaired);
      } catch {}
    }
  }

  // Strategy 2: Generic ``` ... ``` code block containing curly braces
  const genericMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (genericMatch && genericMatch[1] && genericMatch[1].includes('{')) {
    const repaired = tryRepairJSON(genericMatch[1]);
    if (repaired) {
      try {
        return JSON.parse(repaired);
      } catch {}
    }
  }

  // Strategy 3: Direct bracket extraction from first '{' to last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.substring(firstBrace, lastBrace + 1);
    const repaired = tryRepairJSON(candidate);
    if (repaired) {
      try {
        return JSON.parse(repaired);
      } catch {}
    }
  }

  // Strategy 4: Full text repair fallback
  const repaired = tryRepairJSON(text);
  if (repaired) {
    try {
      return JSON.parse(repaired);
    } catch {}
  }

  return null;
}
