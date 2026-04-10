import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [rows]: any = await pool.query(
      `SELECT * FROM settings WHERE user_id = ? ORDER BY setting_type DESC, created_at ASC`,
      [userId]
    );
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Body: { setting_key, setting_value, setting_name, setting_type }
    await pool.query(
      `INSERT INTO settings (user_id, setting_key, setting_value, setting_name, setting_type)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, body.setting_key, body.setting_value, body.setting_name, body.setting_type]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
