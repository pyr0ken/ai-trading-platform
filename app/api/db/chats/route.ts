import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysisId');
    const symbol = searchParams.get('symbol');

    const db = getDatabase();
    let query = 'SELECT * FROM chat_messages';
    const params: string[] = [];

    if (analysisId) {
      query += ' WHERE analysis_id = ?';
      params.push(analysisId);
    } else if (symbol) {
      query += ' WHERE symbol = ?';
      params.push(symbol);
    }

    query += ' ORDER BY timestamp ASC';

    const rows = db.prepare(query).all(...params) as any[];

    return NextResponse.json({ success: true, chats: rows });
  } catch (error) {
    console.error('Error in GET /api/db/chats:', error);
    return NextResponse.json({ success: false, chats: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, analysis_id, symbol, role, content, timestamp } = body;

    if (!id || !symbol || !role || !content) {
      return NextResponse.json({ success: false, error: 'Missing required chat fields' }, { status: 400 });
    }

    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO chat_messages (id, analysis_id, symbol, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `);

    stmt.run(id, analysis_id || null, symbol, role, content, timestamp || null);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error in POST /api/db/chats:', error);
    return NextResponse.json({ success: false, error: 'Failed to save chat message' }, { status: 500 });
  }
}
