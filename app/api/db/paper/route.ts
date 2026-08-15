import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite-client';

export async function GET() {
  try {
    const db = getDatabase();

    const accountRow = db.prepare('SELECT * FROM paper_account WHERE id = 1').get() as Record<string, unknown> | undefined;
    const positionsRows = db.prepare("SELECT * FROM paper_positions WHERE status = 'OPEN'").all() as Record<string, unknown>[];

    const account = accountRow
      ? {
          balance: accountRow.balance,
          equity: accountRow.equity,
          totalTrades: accountRow.total_trades,
          wins: accountRow.wins,
          losses: accountRow.losses,
          balanceHistory: typeof accountRow.balance_history === 'string' ? JSON.parse(accountRow.balance_history) : [],
        }
      : {
          balance: 10000,
          equity: 10000,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          balanceHistory: [{ timestamp: new Date().toISOString(), balance: 10000 }],
        };

    const positions = positionsRows.map((p) => ({
      id: p.id,
      symbol: p.symbol,
      side: p.side,
      entryPrice: p.entry_price,
      amount: p.amount,
      leverage: p.leverage,
      stopLoss: p.stop_loss ?? undefined,
      takeProfit: p.take_profit ?? undefined,
      pnl: p.pnl,
      pnlPct: p.pnl_pct,
      openedAt: p.opened_at,
    }));

    return NextResponse.json({ success: true, account, positions });
  } catch (error) {
    console.error('Error in GET /api/db/paper:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { account, positions } = body;

    const db = getDatabase();

    const transaction = db.transaction(() => {
      if (account) {
        db.prepare(`
          INSERT INTO paper_account (id, balance, equity, total_trades, wins, losses, balance_history, updated_at)
          VALUES (1, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            balance = excluded.balance,
            equity = excluded.equity,
            total_trades = excluded.total_trades,
            wins = excluded.wins,
            losses = excluded.losses,
            balance_history = excluded.balance_history,
            updated_at = datetime('now')
        `).run(
          account.balance,
          account.equity,
          account.totalTrades || 0,
          account.wins || 0,
          account.losses || 0,
          account.balanceHistory ? JSON.stringify(account.balanceHistory) : '[]'
        );
      }

      if (Array.isArray(positions)) {
        db.prepare("DELETE FROM paper_positions WHERE status = 'OPEN'").run();
        const stmt = db.prepare(`
          INSERT INTO paper_positions (id, symbol, side, entry_price, amount, leverage, stop_loss, take_profit, pnl, pnl_pct, opened_at, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
        `);

        for (const p of positions) {
          stmt.run(
            p.id,
            p.symbol,
            p.side,
            p.entryPrice,
            p.amount,
            p.leverage || 1,
            p.stopLoss ?? null,
            p.takeProfit ?? null,
            p.pnl || 0,
            p.pnlPct || 0,
            p.openedAt || new Date().toISOString()
          );
        }
      }
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/db/paper:', error);
    return NextResponse.json({ success: false, error: 'Failed to update paper trading data' }, { status: 500 });
  }
}
