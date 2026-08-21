import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/llm/models?url=<base-url>
 *
 * Proxies the OpenAI-compatible `/models` endpoint of the configured LLM
 * inference engine (9router/OmniRoute, Ollama, llama.cpp, ...). The browser
 * cannot hit the engine directly (CORS), so the fetch happens server-side.
 *
 * Optional `url` query param overrides the env default, letting the Terminal
 * Settings page populate its model dropdown for the URL the user typed.
 *
 * Response: { models: string[], error?: string }
 */

const DEFAULT_BASE_URL = process.env.LLM_BASE_URL || 'http://127.0.0.1:20128/v1';

// Never follow redirects to arbitrary hosts and only allow http(s) local-ish
// endpoints — this route is a dev/trading tool proxy, not an open relay.
function isAllowedBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    return false;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedUrl = searchParams.get('url');
  const baseUrl = requestedUrl?.trim() || DEFAULT_BASE_URL;

  if (!isAllowedBaseUrl(baseUrl)) {
    return NextResponse.json(
      { models: [], error: `Refusing to fetch models from non-local URL: ${baseUrl}` },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { models: [], error: `LLM engine returned HTTP ${res.status} for /models` },
        { status: 502 }
      );
    }

    const data = await res.json();
    // OpenAI-compatible shape: { object: "list", data: [{ id, ... }] }.
    const models = Array.isArray(data?.data)
      ? data.data
          .map((m: { id?: string }) => m?.id)
          .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : [];

    return NextResponse.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { models: [], error: `Failed to reach LLM engine at ${baseUrl}: ${message}` },
      { status: 502 }
    );
  }
}
