import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getDatabase } from '@/lib/db/sqlite-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 1. Try Supabase GET
    try {
      const supabase = getSupabaseServerClient();
      let accountQuery = supabase.from('paper_accounts').select('*');
      let positionsQuery = supabase
        .from('paper_positions')
        .select(`
          *,
          profiles (
            username
          )
        `)
        .eq('status', 'OPEN');

      if (userId) {
        accountQuery = accountQuery.eq('user_id', userId);
        positionsQuery = positionsQuery.eq('user_id', userId);
      }

      const [accountRes, positionsRes] = await Promise.all([
        accountQuery.limit(1),
        positionsQuery,
      ]);

      if (!accountRes.error && accountRes.data && accountRes.data.length > 0) {
        const accRow = accountRes.data[0];
        const account = {
          balance: Number(accRow.balance),
          equity: Number(accRow.equity),
          totalTrades: Number(accRow.total_trades ?? 0),
          wins: Number(accRow.wins ?? 0),
          losses: Number(accRow.losses ?? 0),
          balanceHistory: Array.isArray(accRow.balance_history) ? accRow.balance_history : [],
        };

        const positions = (positionsRes.data || []).map((p: Record<string, unknown> & { profiles?: { username?: string } }) => ({
          id: String(p.id),
          userId: String(p.user_id),
          username: p.profiles?.username || 'trader',
          symbol: String(p.symbol),
          side: String(p.side),
          entryPrice: Number(p.entry_price),
          amount: Number(p.amount),
          leverage: Number(p.leverage ?? 1),
          stopLoss: p.stop_loss ? Number(p.stop_loss) : undefined,
          takeProfit: p.take_profit ? Number(p.take_profit) : undefined,
          pnl: Number(p.pnl ?? 0),
          pnlPct: Number(p.pnl_pct ?? 0),
          openedAt: String(p.opened_at),
        }));

        return NextResponse.json({ success: true, account, positions, source: 'supabase' });
      }
    } catch {
      // Fallback
    }

    // 2. SQLite Fallback
    const db = getDatabase();

    const accountRow = db.prepare('SELECT * FROM paper_account WHERE id = 1').get() as Record<string, unknown> | undefined;
    const positionsRows = db.prepare("SELECT * FROM paper_positions WHERE status = 'OPEN'").all() as Record<string, unknown>[];

    const account = accountRow
      ? {
          balance: Number(accountRow.balance),
          equity: Number(accountRow.equity),
          totalTrades: Number(accountRow.total_trades ?? 0),
          wins: Number(accountRow.wins ?? 0),
          losses: Number(accountRow.losses ?? 0),
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
      id: String(p.id),
      symbol: String(p.symbol),
      side: String(p.side),
      entryPrice: Number(p.entry_price),
      amount: Number(p.amount),
      leverage: Number(p.leverage ?? 1),
      stopLoss: p.stop_loss !== null ? Number(p.stop_loss) : undefined,
      takeProfit: p.take_profit !== null ? Number(p.take_profit) : undefined,
      pnl: Number(p.pnl ?? 0),
      pnlPct: Number(p.pnl_pct ?? 0),
      openedAt: String(p.opened_at),
    }));

    return NextResponse.json({ success: true, account, positions, source: 'sqlite' });
  } catch (error) {
    console.error('Error in GET /api/db/paper:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { account, positions, user_id } = body;

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    // Resolve user_id
    let targetUserId = user_id;
    try {
      const supabase = getSupabaseServerClient();
      if (!targetUserId || !uuidRegex.test(targetUserId)) {
        const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1);
        if (firstProfile && firstProfile.length > 0) {
          targetUserId = firstProfile[0].id;
        }
      }

      if (targetUserId && uuidRegex.test(targetUserId)) {
        // Fetch or create account row in paper_accounts for targetUserId
        const { data: accData } = await supabase.from('paper_accounts').select('id').eq('user_id', targetUserId).single();
        let accountId = accData?.id;

        if (!accountId && account) {
          const { data: newAcc } = await supabase
            .from('paper_accounts')
            .upsert({
              user_id: targetUserId,
              balance: account.balance,
              equity: account.equity,
              total_trades: account.totalTrades || 0,
              wins: account.wins || 0,
              losses: account.losses || 0,
              balance_history: account.balanceHistory || [],
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            .select('id')
            .single();
          accountId = newAcc?.id;
        }

        if (accountId && Array.isArray(positions)) {
          const formattedPositions = positions.map((p: Record<string, unknown> & { id?: string; symbol?: string; side?: string; entryPrice?: number; amount?: number; leverage?: number; stopLoss?: number; takeProfit?: number; pnl?: number; pnlPct?: number; openedAt?: string }) => {
            let posId = p.id;
            if (!posId || !uuidRegex.test(posId)) {
              posId = typeof window !== 'undefined' && window.crypto?.randomUUID
                ? window.crypto.randomUUID()
                : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                    const r = (Math.random() * 16) | 0;
                    const v = c === 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                  });
            }
            return {
              id: posId,
              account_id: accountId,
              user_id: targetUserId,
              symbol: p.symbol,
              side: p.side,
              entry_price: p.entryPrice,
              amount: p.amount,
              leverage: p.leverage || 1,
              stop_loss: p.stopLoss ?? null,
              take_profit: p.takeProfit ?? null,
              pnl: p.pnl || 0,
              pnl_pct: p.pnlPct || 0,
              status: 'OPEN',
              opened_at: p.openedAt || new Date().toISOString(),
            };
          });

          await supabase.from('paper_positions').upsert(formattedPositions, { onConflict: 'id' });
        }
      }
    } catch (e) {
      console.warn('Paper Supabase POST warn:', e);
    }

    // 2. SQLite Fallback
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
