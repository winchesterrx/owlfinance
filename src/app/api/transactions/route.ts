import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().getMonth() + 1;
    const year = searchParams.get('year') || new Date().getFullYear();

    const [rows]: any = await pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = ? AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?
       ORDER BY transaction_date DESC`,
      [userId, month, year]
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

    if (body.action === 'populate') {
      const { month, year } = body; // Aceita mes e ano para sincronizar
      const targetMonth = month || new Date().getMonth() + 1;
      const targetYear = year || new Date().getFullYear();
      
      const [settings]: any = await pool.query(`SELECT * FROM settings WHERE user_id = ? AND is_active = TRUE`, [userId]);
      
      for (const setting of settings) {
        const tDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        
        // Verifica se já não existe uma transação recorrente com esse titulo neste mes e ano
        const [existing]: any = await pool.query(
          `SELECT id FROM transactions WHERE user_id = ? AND title = ? AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ? AND is_recurring = TRUE`,
          [userId, setting.setting_name, targetMonth, targetYear]
        );

        if (existing.length === 0) {
          await pool.query(
            `INSERT INTO transactions (user_id, title, amount, type, category, status, transaction_date, is_recurring)
             VALUES (?, ?, ?, ?, ?, 'pending', ?, TRUE)`,
            [userId, setting.setting_name, setting.setting_value, setting.setting_type, setting.setting_key, tDate]
          );
        }
      }
      return NextResponse.json({ success: true, message: 'Sincronizado!' });
    }

    const walletSource = body.wallet_source || 'Conta Principal';
    const subcategory = body.subcategory || null;

    const [result]: any = await pool.query(
      `INSERT INTO transactions (user_id, title, amount, type, category, subcategory, status, transaction_date, wallet_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, body.title, body.amount, body.type, body.category, subcategory, body.status, body.transaction_date, walletSource]
    );

    // Se é um Aporte de Meta, subtrai da carteira atualizando o alvo também
    if (body.goal_id && body.type === 'expense') {
        await pool.query(
            `UPDATE goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?`,
            [body.amount, body.goal_id, userId]
        );
    }

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await pool.query(
      `UPDATE transactions SET status = ?, amount = ? WHERE id = ? AND user_id = ?`,
      [body.status, body.amount, body.id, userId]
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
    await pool.query(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [id, userId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
