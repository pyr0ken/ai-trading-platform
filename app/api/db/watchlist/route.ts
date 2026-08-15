import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite-client';

export async function GET() {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM watchlist ORDER BY order_index ASC').all() as any[];

    const watchlist = rows.map((r) => ({
      symbol: r.symbol,
      exchange: r.exchange,
      pinned: Boolean(r.pinned),
      favorite: Boolean(r.favorite),
      order: r.order_index,
      addedAt: r.added_at,
    }));

    return NextResponse.json({ success: true, watchlist });
  } catch (error) {
    console.error('Error in GET /api/db/watchlist:', error);
    return NextResponse.json({ success: false, watchlist: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { watchlist } = body; // Array of watchlists or single item

    if (!Array.isArray(watchlist)) {
      return NextResponse.json({ success: false, error: 'Expected array of watchlist items' }, { status: 400 });
    }

    const db = getDatabase();

    const deleteStmt = db.prepare('DELETE FROM watchlist');
    const insertStmt = db.prepare(`
      INSERT INTO watchlist (symbol, exchange, pinned, favorite, order_index, added_at)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `);

    const transaction = db.transaction((items: any[]) => {
      deleteStmt.run();
      items.forEach((item, index) => {
        insertStmt.run(
          item.symbol,
          item.exchange || 'kucoin',
          item.pinned ? 1 : 0,
          item.favorite ? 1 : 0,
          index,
          item.addedAt || null
        );
      });
    });

    transaction(watchlist);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/db/watchlist:', error);
    return NextResponse.json({ success: false, error: 'Failed to update watchlist' }, { status: 500 });
  }
}
