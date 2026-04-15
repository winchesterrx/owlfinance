import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Totais mensais dos últimos 12 meses
    const [monthlyRows]: any = await pool.query(`
      SELECT 
        YEAR(transaction_date) as year,
        MONTH(transaction_date) as month,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY YEAR(transaction_date), MONTH(transaction_date), type
      ORDER BY year, month
    `, [userId]);

    // 2. Top categorias (despesas) dos últimos 12 meses
    const [categoryRows]: any = await pool.query(`
      SELECT 
        category,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY category
      ORDER BY total DESC
      LIMIT 10
    `, [userId]);

    // 3. Padrão de gastos por dia da semana (últimos 3 meses)
    const [dailyRows]: any = await pool.query(`
      SELECT 
        DAYOFWEEK(transaction_date) as day_of_week,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      GROUP BY DAYOFWEEK(transaction_date), type
    `, [userId]);

    // 4. Totais gerais (12 meses)
    const [overallRows]: any = await pool.query(`
      SELECT 
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY type
    `, [userId]);

    // 5. Estatísticas de valores
    const [avgRows]: any = await pool.query(`
      SELECT 
        type,
        AVG(amount) as avg_amount,
        MAX(amount) as max_amount,
        MIN(amount) as min_amount
      FROM transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY type
    `, [userId]);

    // 6. Maiores transações individuais
    const [biggestExpenses]: any = await pool.query(`
      SELECT title, amount, category, transaction_date, wallet_source
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      ORDER BY amount DESC
      LIMIT 5
    `, [userId]);

    const [biggestIncomes]: any = await pool.query(`
      SELECT title, amount, category, transaction_date, wallet_source
      FROM transactions
      WHERE user_id = ? AND type = 'income' AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      ORDER BY amount DESC
      LIMIT 5
    `, [userId]);

    // 7. Contagem de meses ativos para calcular médias
    const [activeMonths]: any = await pool.query(`
      SELECT COUNT(DISTINCT CONCAT(YEAR(transaction_date), '-', MONTH(transaction_date))) as months
      FROM transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    `, [userId]);

    return NextResponse.json({
      monthly: monthlyRows,
      categories: categoryRows,
      dailyPattern: dailyRows,
      overall: overallRows,
      averages: avgRows,
      biggestExpenses,
      biggestIncomes,
      activeMonthsCount: activeMonths[0]?.months || 1
    });
  } catch (error: any) {
    console.error('Reports API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
