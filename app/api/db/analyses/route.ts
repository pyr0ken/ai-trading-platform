import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getDatabase } from '@/lib/db/sqlite-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 1. Try Supabase first if available
    try {
      const supabase = getSupabaseServerClient();
      let query = supabase
        .from('analyses')
        .select(`
          *,
          profiles (
            username
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const records = data.map((row: Record<string, unknown> & { profiles?: { username?: string } }) => ({
          id: String(row.id),
          user_id: row.user_id ? String(row.user_id) : undefined,
          username: row.profiles?.username || 'omid',
          symbol: String(row.symbol),
          exchange: String(row.exchange),
          timeframe: String(row.timeframe),
          price: Number(row.price),
          signal: String(row.signal),
          confidence: Number(row.confidence),
          risk_level: String(row.risk_level),
          json_output: row.json_output || null,
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

        return NextResponse.json({ success: true, records, source: 'supabase' });
      }
    } catch {
      // Fallback to SQLite
    }

    // 2. SQLite Fallback
    const db = getDatabase();
    let sqliteQuery = 'SELECT * FROM analyses';
    const params: (string | number)[] = [];

    if (symbol) {
      sqliteQuery += ' WHERE symbol = ?';
      params.push(symbol);
    }

    sqliteQuery += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sqliteQuery).all(...params) as Record<string, unknown>[];

    const records = rows.map((row) => ({
      id: String(row.id),
      username: 'omid',
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

    return NextResponse.json({ success: true, records, source: 'sqlite' });
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
    const rawBody = await request.json();
    const items = Array.isArray(rawBody) ? rawBody : [rawBody];

    if (items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    
    // Resolve fallback user ID once
    let defaultUserId = '';
    try {
      const supabase = getSupabaseServerClient();
      const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1);
      if (firstProfile && firstProfile.length > 0) {
        defaultUserId = firstProfile[0].id;
      }
    } catch {}

    const supabaseRows: Record<string, unknown>[] = [];

    for (const item of items) {
      if (!item.symbol || item.price === undefined || !item.signal) continue;

      let id = item.id;
      if (!id || !uuidRegex.test(id)) {
        id = typeof window !== 'undefined' && window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
      }

      let targetUserId = item.user_id;
      if (!targetUserId || targetUserId === '11111111-1111-4111-a111-111111111111' || targetUserId.startsWith('user-')) {
        targetUserId = defaultUserId;
      }

      if (!targetUserId) continue;

      supabaseRows.push({
        id,
        user_id: targetUserId,
        symbol: item.symbol,
        exchange: item.exchange || 'kucoin',
        timeframe: item.timeframe || '1h',
        price: item.price,
        signal: item.signal,
        confidence: item.confidence || 75,
        risk_level: item.risk_level || 'MEDIUM',
        json_output: item.json_output || null,
        markdown_report: item.markdown_report || '',
        pine_script: item.pine_script || null,
        round_trip_cost_pct: item.round_trip_cost_pct ?? 0.30,
        status: item.accuracy_evaluation?.status || item.status || 'PENDING',
        entry_fill_price: item.accuracy_evaluation?.entry_fill_price ?? item.entry_fill_price ?? null,
        current_price: item.accuracy_evaluation?.current_price ?? item.current_price ?? null,
        pnl_percentage: item.accuracy_evaluation?.pnl_percentage ?? item.pnl_percentage ?? null,
        gross_pnl_percentage: item.accuracy_evaluation?.gross_pnl_percentage ?? item.gross_pnl_percentage ?? null,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (supabaseRows.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid analysis records to save' }, { status: 400 });
    }

    // 1. Try Supabase Batch Upsert
    try {
      const supabase = getSupabaseServerClient();
      const { error } = await supabase.from('analyses').upsert(supabaseRows, { onConflict: 'id' });
      if (!error) {
        return NextResponse.json({ success: true, count: supabaseRows.length, source: 'supabase' });
      }
    } catch (e) {
      console.warn('Supabase batch catch:', e);
    }

    // 2. SQLite Fallback
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO analyses (
        id, symbol, exchange, timeframe, price, signal, confidence, risk_level,
        json_output, markdown_report, pine_script, round_trip_cost_pct, status,
        current_price, pnl_percentage, gross_pnl_percentage, entry_fill_price, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), datetime('now'))
    `);

    const transaction = db.transaction(() => {
      for (const item of supabaseRows) {
        stmt.run(
          item.id,
          item.symbol,
          item.exchange,
          item.timeframe,
          item.price,
          item.signal,
          item.confidence,
          item.risk_level,
          item.json_output ? JSON.stringify(item.json_output) : null,
          item.markdown_report,
          item.pine_script,
          item.round_trip_cost_pct,
          item.status,
          item.current_price,
          item.pnl_percentage,
          item.gross_pnl_percentage,
          item.entry_fill_price,
          item.created_at
        );
      }
    });
    transaction();

    return NextResponse.json({ success: true, count: supabaseRows.length, source: 'sqlite' });
  } catch (error) {
    console.error('Error in POST /api/db/analyses:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save analyses' },
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

    // 1. Try Supabase PATCH
    try {
      const supabase = getSupabaseServerClient();
      const { error } = await supabase
        .from('analyses')
        .update({
          status: accuracy_evaluation.status,
          current_price: accuracy_evaluation.current_price ?? null,
          pnl_percentage: accuracy_evaluation.pnl_percentage ?? null,
          gross_pnl_percentage: accuracy_evaluation.gross_pnl_percentage ?? null,
          entry_fill_price: accuracy_evaluation.entry_fill_price ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (!error) {
        return NextResponse.json({ success: true, id, source: 'supabase' });
      }
    } catch {
      // Fallback
    }

    // 2. SQLite Fallback
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

    return NextResponse.json({ success: true, id, source: 'sqlite' });
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

    // 1. Try Supabase DELETE
    try {
      const supabase = getSupabaseServerClient();
      if (id) {
        await supabase.from('analyses').delete().eq('id', id);
      } else {
        await supabase.from('analyses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
    } catch {
      // Fallback
    }

    // 2. SQLite Fallback
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
