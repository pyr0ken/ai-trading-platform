import { NextRequest, NextResponse } from 'next/server';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://127.0.0.1:20128/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'hermes';

export async function POST(req: NextRequest) {
  try {
    const { question, symbol, analysisSummary } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const systemPrompt = `You are a Senior Quantitative Trading Analyst assisting a trader on a Bloomberg-style Terminal.
The user is inspecting asset ${symbol || 'BTC/USDT'}.
You have full access to the current quantitative market context and AI analysis summary.

LANGUAGE & FORMATTING RULES:
1. Detect the language of the user's question. If the user asks in Persian (فارسی), respond in fluent, professional Persian. If in English, respond in English.
2. Use Markdown formatting (bold text, bullet points, \`code\` blocks for prices/indicators) for high readability.
3. Be direct, quantitative, and concise. Explain trade setup rationale, risk levels, and indicator conditions clearly.`;

    const userPrompt = `Asset: ${symbol}
Analysis Context Summary: ${JSON.stringify(analysisSummary || {})}
User Question: "${question}"

Provide a crisp, Markdown-formatted answer in the user's language:`;

    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM Chat error: ${response.statusText}`);
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content || 'پاسخی از هوش مصنوعی دریافت نشد.';

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate chat answer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
