import { NextRequest, NextResponse } from 'next/server';
import { createLLMAnalysisStream } from '@/lib/llm/llm-client';

export async function HEAD() {
  const llmBaseUrl = process.env.LLM_BASE_URL || 'http://127.0.0.1:20128/v1';
  try {
    const res = await fetch(`${llmBaseUrl}/models`, { method: 'GET' });
    if (res.ok) {
      return new NextResponse(null, { status: 200 });
    }
  } catch {}
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const rawPayload = await req.json();

    const symbol = rawPayload.symbol || rawPayload.metadata?.symbol;
    const exchange = rawPayload.exchange || rawPayload.metadata?.exchange || 'kucoin';
    const timeframe = rawPayload.timeframe || rawPayload.metadata?.primaryTimeframe || rawPayload.metadata?.timeframe || '1h';
    const mode = rawPayload.mode || 'swing';

    if (!rawPayload || !symbol) {
      return NextResponse.json(
        { error: 'Invalid market context payload: missing symbol' },
        { status: 400 }
      );
    }

    const marketContext = {
      ...rawPayload,
      symbol,
      exchange,
      timeframe,
      mode,
    };

    // Get stream from LLM Client
    const llmStream = await createLLMAnalysisStream(marketContext, req.signal);

    return new Response(llmStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in /api/analysis/stream:', error);
    const message = error instanceof Error ? error.message : 'Failed to stream LLM analysis';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
