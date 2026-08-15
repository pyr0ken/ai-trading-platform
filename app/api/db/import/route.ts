import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analyses = [], watchlist = [], settings = {} } = body;

    const db = getDatabase();

    const insertAnalysisStmt = db.prepare(`
      INSERT OR IGNORE INTO analyses (
        id, symbol, exchange, timeframe, price, signal, confidence, risk_level,
        json_output, markdown_report, pine_script, round_trip_cost_pct, status,
        current_price, pnl_percentage, gross_pnl_percentage, entry_fill_price, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertWatchlistStmt = db.prepare(`
      INSERT OR IGNORE INTO watchlist (symbol, exchange, pinned, favorite, order_index, added_at)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `);

    const insertSettingsStmt = db.prepare(`
      INSERT OR IGNORE INTO user_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `);

    const transaction = db.transaction(() => {
      // Import analyses
      for (const a of analyses) {
        insertAnalysisStmt.run(
          a.id,
          a.symbol,
          a.exchange || 'kucoin',
          a.timeframe || '1h',
          a.price,
          a.signal,
          a.confidence,
          a.risk_level,
          a.json_output ? JSON.stringify(a.json_output) : null,
          a.markdown_report,
          a.pine_script || null,
          a.round_trip_cost_pct || 0.30,
          a.accuracy_evaluation?.status || 'PENDING',
          a.accuracy_evaluation?.current_price ?? null,
          a.accuracy_evaluation?.pnl_percentage ?? null,
          a.accuracy_evaluation?.gross_pnl_percentage ?? null,
          a.accuracy_evaluation?.entry_fill_price ?? null,
          a.created_at || null
        );
      }

      // Import watchlist
      watchlist.forEach((w: any, idx: number) => {
        insertWatchlistStmt.run(
          w.symbol,
          w.exchange || 'kucoin',
          w.pinned ? 1 : 0,
          w.favorite ? 1 : 0,
          idx,
          w.addedAt || null
        );
      });

      // Import settings
      Object.entries(settings).forEach(([k, v]) => {
        insertSettingsStmt.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      });
    });

    transaction();

    return NextResponse.json({
      success: true,
      importedAnalyses: analyses.length,
      importedWatchlist: watchlist.length,
    });
  } catch (error) {
    console.error('Error in POST /api/db/import:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
