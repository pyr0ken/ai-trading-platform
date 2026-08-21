import { NextResponse } from 'next/server';
import { NewsService } from '@/lib/news/news-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '5', 10);

  try {
    const payload = await NewsService.getNewsPayload(limit);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[API /news] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch market news.' },
      { status: 500 }
    );
  }
}
