import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const db = getDatabase();

    let query = 'SELECT * FROM analyses';
    const params: (string | number)[] = [];

    if (symbol) {
      query += ' WHERE symbol = ?';
      params.push(symbol);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

    const records = rows.map((row) => ({
      id: String(row.id),
      symbol: String(row.symbol),
      exchange: String(row.exchange),
      timeframe: String(row.timeframe),
      price: Number(row.price),
      signal: String(row.signal),
      confidence: Number(row.confidence),
      risk_level: String(row.risk_level),
      json_output: row.json_output ? JSON.parse(String(row.json_output)) : null,
      markdown_report: String(row.markdown_report),
      pine_script: row.pine_script ? String(row.pine_script) : undefined,
      created_at: String(row.created_at),
      round_trip_cost_pct: Number(row.round_trip_cost_pct ?? 0.3),
      accuracy_evaluation: row.status !== 'PENDING' || row.current_price !== null ? {
        status: String(row.status) as 'PENDING' | 'WIN' | 'LOSS' | 'INVALIDATED' | 'NOT_FILLED',
        current_price: row.current_price !== null ? Number(row.current_price) : undefined,
        pnl_percentage: row.pnl_percentage !== null ? Number(row.pnl_percentage) : undefined,
        gross_pnl_percentage: row.gross_pnl_percentage !== null ? Number(row.gross_pnl_percentage) : undefined,
        entry_fill_price: row.entry_fill_price !== null ? Number(row.entry_fill_price) : undefined,
      } : undefined,
    }));

    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error('Error in GET /api/db/analyses:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      symbol,
      exchange = 'kucoin',
      timeframe = '1h',
      price,
      signal,
      confidence,
      risk_level,
      json_output,
      markdown_report,
      pine_script,
      round_trip_cost_pct = 0.30,
      created_at,
    } = body;

    if (!id || !symbol || price === undefined || !signal) {
      return NextResponse.json(
        { success: false, error: 'Missing required analysis fields' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO analyses (
        id, symbol, exchange, timeframe, price, signal, confidence, risk_level,
        json_output, markdown_report, pine_script, round_trip_cost_pct, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), datetime('now'))
    `);

    stmt.run(
      id,
      symbol,
      exchange,
      timeframe,
      price,
      signal,
      confidence,
      risk_level,
      json_output ? JSON.stringify(json_output) : null,
      markdown_report,
      pine_script || null,
      round_trip_cost_pct,
      created_at || null
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error in POST /api/db/analyses:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save analysis' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, accuracy_evaluation } = body;

    if (!id || !accuracy_evaluation) {
      return NextResponse.json(
        { success: false, error: 'Missing id or accuracy_evaluation' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const stmt = db.prepare(`
      UPDATE analyses SET
        status = ?,
        current_price = ?,
        pnl_percentage = ?,
        gross_pnl_percentage = ?,
        entry_fill_price = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      accuracy_evaluation.status,
      accuracy_evaluation.current_price ?? null,
      accuracy_evaluation.pnl_percentage ?? null,
      accuracy_evaluation.gross_pnl_percentage ?? null,
      accuracy_evaluation.entry_fill_price ?? null,
      id
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error in PATCH /api/db/analyses:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update analysis evaluation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const db = getDatabase();

    if (id) {
      db.prepare('DELETE FROM analyses WHERE id = ?').run(id);
    } else {
      db.prepare('DELETE FROM analyses').run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/db/analyses:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete analyses' },
      { status: 500 }
    );
  }
}
