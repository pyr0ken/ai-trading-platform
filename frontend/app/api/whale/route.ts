import { NextResponse } from 'next/server';
import { pollWhaleAlerts } from '@/lib/whale/whale-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pollWhaleAlerts();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[API /whale] Error:', err);
    return NextResponse.json(
      { transactions: [], totalUsd: 0, count: 0, error: 'Failed to fetch whale alerts' },
      { status: 200 },
    );
  }
}
