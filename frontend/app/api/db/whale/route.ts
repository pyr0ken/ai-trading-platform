import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite-client';

export async function GET() {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM whale_transactions ORDER BY timestamp DESC LIMIT 100').all() as Record<string, unknown>[];

    const transactions = rows.map((r) => ({
      id: r.id,
      token: r.token,
      amount: r.amount,
      valueUsd: r.value_usd,
      fromAddress: r.from_address,
      toAddress: r.to_address,
      fromLabel: r.from_label,
      toLabel: r.to_label,
      direction: r.direction,
      severity: r.severity,
      timestamp: r.timestamp,
    }));

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('Error in GET /api/db/whale:', error);
    return NextResponse.json({ success: false, transactions: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactions } = body;

    if (!Array.isArray(transactions)) {
      return NextResponse.json({ success: false, error: 'Expected transactions array' }, { status: 400 });
    }

    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO whale_transactions (
        id, token, amount, value_usd, from_address, to_address, from_label, to_label, direction, severity, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const t of transactions) {
        stmt.run(
          t.id,
          t.token,
          t.amount,
          t.valueUsd,
          t.fromAddress || null,
          t.toAddress || null,
          t.fromLabel || 'Unknown',
          t.toLabel || 'Unknown',
          t.direction,
          t.severity,
          t.timestamp
        );
      }
    });

    transaction();

    return NextResponse.json({ success: true, count: transactions.length });
  } catch (error) {
    console.error('Error in POST /api/db/whale:', error);
    return NextResponse.json({ success: false, error: 'Failed to save whale transactions' }, { status: 500 });
  }
}
