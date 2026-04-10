import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Auto-migration silenciosa se a tabela não existir
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS goals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(150) NOT NULL,
                target_amount DECIMAL(10, 2) NOT NULL,
                current_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                deadline DATE,
                status ENUM('active', 'completed') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    } catch(e) {}

    const [rows]: any = await pool.query(
      `SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC`,
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

    await pool.query(
      `INSERT INTO goals (user_id, title, target_amount, current_amount, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [userId, body.title, body.target_amount, body.current_amount || 0]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const userId = await getSessionUserId();
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      
      await pool.query(`DELETE FROM goals WHERE id = ? AND user_id = ?`, [id, userId]);
      
      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
