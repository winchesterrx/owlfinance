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
    const goalId = searchParams.get('goal_id');

    // Se filtrar por goal_id, retorna aportes dessa meta (todos os meses)
    if (goalId) {
      const [rows]: any = await pool.query(
        `SELECT * FROM transactions 
         WHERE user_id = ? AND category = 'Metas' AND title LIKE CONCAT('Aporte: ', '%')
         AND goal_id = ?
         ORDER BY transaction_date DESC`,
        [userId, goalId]
      );
      // Fallback: se goal_id não existir na coluna, buscar pelo título
      if (rows.length === 0) {
        const [fallbackRows]: any = await pool.query(
          `SELECT * FROM transactions 
           WHERE user_id = ? AND category = 'Metas'
           ORDER BY transaction_date DESC`,
          [userId]
        );
        return NextResponse.json(fallbackRows);
      }
      return NextResponse.json(rows);
    }

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
      const { month, year } = body;
      const targetMonth = month || new Date().getMonth() + 1;
      const targetYear = year || new Date().getFullYear();
      
      const [settings]: any = await pool.query(`SELECT * FROM settings WHERE user_id = ? AND is_active = TRUE`, [userId]);
      
      for (const setting of settings) {
        const tDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        
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

    // Auto-migration: adicionar coluna goal_id se não existir
    try {
      const [cols]: any = await pool.query(`SHOW COLUMNS FROM transactions LIKE 'goal_id'`);
      if (cols.length === 0) {
        await pool.query(`ALTER TABLE transactions ADD COLUMN goal_id INT DEFAULT NULL`);
      }
    } catch(e) {}

    const [result]: any = await pool.query(
      `INSERT INTO transactions (user_id, title, amount, type, category, subcategory, status, transaction_date, wallet_source, goal_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, body.title, body.amount, body.type, body.category, subcategory, body.status, body.transaction_date, walletSource, body.goal_id || null]
    );

    // Se é um Aporte de Meta, atualiza o current_amount da meta
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

    // Buscar transação original para calcular diferença em aportes
    const [original]: any = await pool.query(`SELECT * FROM transactions WHERE id = ? AND user_id = ?`, [body.id, userId]);
    if (original.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const oldTx = original[0];

    await pool.query(
      `UPDATE transactions SET title = ?, amount = ?, category = ?, subcategory = ?, status = ?, wallet_source = ? WHERE id = ? AND user_id = ?`,
      [
        body.title ?? oldTx.title,
        body.amount ?? oldTx.amount,
        body.category ?? oldTx.category,
        body.subcategory ?? oldTx.subcategory,
        body.status ?? oldTx.status,
        body.wallet_source ?? oldTx.wallet_source,
        body.id,
        userId
      ]
    );

    // Se era um aporte de meta, ajustar o current_amount da meta
    if (oldTx.goal_id && body.amount !== undefined) {
      const diff = Number(body.amount) - Number(oldTx.amount);
      if (diff !== 0) {
        await pool.query(
          `UPDATE goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?`,
          [diff, oldTx.goal_id, userId]
        );
      }
    }

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

    // Se era aporte de meta, reverter o current_amount antes de deletar
    const [rows]: any = await pool.query(`SELECT * FROM transactions WHERE id = ? AND user_id = ?`, [id, userId]);
    if (rows.length > 0 && rows[0].goal_id) {
      await pool.query(
        `UPDATE goals SET current_amount = GREATEST(current_amount - ?, 0) WHERE id = ? AND user_id = ?`,
        [rows[0].amount, rows[0].goal_id, userId]
      );
    }

    await pool.query(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [id, userId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
