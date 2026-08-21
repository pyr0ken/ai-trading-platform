'use server';

import { promises as fs } from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs', 'llm-prompts');
const MAX_KEPT_FILES = Number(process.env.LLM_PROMPT_LOG_MAX_FILES || '50');

/**
 * Save the complete prompt + raw payload before it is sent to the LLM.
 * This lets us audit exactly what the model receives and catch
 * over-summarization / dropped fields.
 */
export async function logPromptToFile(
  symbol: string,
  exchange: string,
  timeframe: string,
  mode: 'scalp' | 'swing',
  systemPrompt: string,
  userPrompt: string,
  rawPayload: unknown
): Promise<string> {
  await fs.mkdir(LOG_DIR, { recursive: true });

  const timestamp = new Date().toISOString();
  const filename = `${timestamp.replace(/[:.]/g, '-')}_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${timeframe}_${mode}.json`;
  const filepath = path.join(LOG_DIR, filename);

  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        symbol,
        exchange,
        timeframe,
        mode,
        timestamp,
        systemPrompt,
        userPrompt,
        rawPayload,
        tokenEstimate: {
          systemChars: systemPrompt.length,
          userChars: userPrompt.length,
          totalChars: systemPrompt.length + userPrompt.length,
          estimatedTokens: Math.ceil((systemPrompt.length + userPrompt.length) / 4),
        },
      },
      null,
      2
    ),
    'utf-8'
  );

  // Rotate old files so the logs directory doesn't grow forever
  await rotateLogFiles();

  return filepath;
}

async function rotateLogFiles(): Promise<void> {
  try {
    const files = await fs.readdir(LOG_DIR);
    const jsonFiles = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({
        name: f,
        path: path.join(LOG_DIR, f),
        mtime: 0,
      }));

    if (jsonFiles.length <= MAX_KEPT_FILES) return;

    for (const f of jsonFiles) {
      const stat = await fs.stat(f.path);
      f.mtime = stat.mtimeMs;
    }

    jsonFiles.sort((a, b) => a.mtime - b.mtime);
    const toDelete = jsonFiles.slice(0, jsonFiles.length - MAX_KEPT_FILES);

    await Promise.all(toDelete.map((f) => fs.unlink(f.path).catch(() => {})));
  } catch (err) {
    // Logging failure must not break analysis — swallow and continue
  }
}