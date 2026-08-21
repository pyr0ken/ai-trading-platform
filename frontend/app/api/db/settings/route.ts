import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite-client';

export async function GET() {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM user_settings').all() as { key: string; value: string }[];

    const settings: Record<string, unknown> = {};
    rows.forEach((r) => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error in GET /api/db/settings:', error);
    return NextResponse.json({ success: false, settings: {} }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `);

    const transaction = db.transaction((obj: Record<string, unknown>) => {
      Object.entries(obj).forEach(([key, val]) => {
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        stmt.run(key, valStr);
      });
    });

    transaction(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/db/settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
