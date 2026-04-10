import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = await getSessionUserId(); // Extraído do JWT
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const now = new Date();
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    
    const targetMonth = monthParam ? parseInt(monthParam) : now.getMonth() + 1;
    const targetYear = yearParam ? parseInt(yearParam) : now.getFullYear();

    // Auto Migration rápida para Carteiras
    try {
        const [cols]: any = await pool.query(`SHOW COLUMNS FROM transactions LIKE 'wallet_source'`);
        if (cols.length === 0) {
            await pool.query(`ALTER TABLE transactions ADD COLUMN wallet_source VARCHAR(100) DEFAULT 'Conta Principal'`);
        }
    } catch(e) {}

    // 1(b) Resumo por Fonte (Wallet)
    const [walletRows]: any = await pool.query(
      `SELECT wallet_source, 
              SUM(CASE WHEN type='income' THEN amount ELSE -amount END) as netBalance
       FROM transactions 
       WHERE user_id = ? AND status = 'paid'
       GROUP BY wallet_source`,
      [userId]
    );

    // 1. Saldo Líquido Total Acumulado (Até o final do mês selecionado)
    // Para simplificar, acumulado total independente do mês
    const [balanceRows]: any = await pool.query(
      `SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE -amount END) as netBalance
       FROM transactions 
       WHERE user_id = ? AND status = 'paid'`,
      [userId]
    );
    const netBalance = Number(balanceRows[0]?.netBalance || 0);

    // 2. Entradas e Saídas do Mês Selecionado
    const [monthTransRows]: any = await pool.query(
      `SELECT type, status, SUM(amount) as total
       FROM transactions 
       WHERE user_id = ? 
         AND MONTH(transaction_date) = ? 
         AND YEAR(transaction_date) = ?
       GROUP BY type, status`,
      [userId, targetMonth, targetYear]
    );

    let currentMonthIncome = 0;
    let currentMonthExpensesPaid = 0;
    let currentMonthExpensesPending = 0;

    monthTransRows.forEach((row: any) => {
      if (row.type === 'income') {
        currentMonthIncome += Number(row.total);
      } else if (row.type === 'expense') {
        if (row.status === 'paid') currentMonthExpensesPaid += Number(row.total);
        if (row.status === 'pending') currentMonthExpensesPending += Number(row.total);
      }
    });

    const totalMonthExpenses = currentMonthExpensesPaid + currentMonthExpensesPending;

    // Saldo Final do Mês (Entradas - Saídas do Mês)
    const saldoFinalMes = currentMonthIncome - totalMonthExpenses;

    // 3. Gastos por Categoria (Para o gráfico)
    const [categoryRows]: any = await pool.query(
      `SELECT category, SUM(amount) as value
       FROM transactions
       WHERE user_id = ? AND type = 'expense' 
         AND MONTH(transaction_date) = ? 
         AND YEAR(transaction_date) = ?
       GROUP BY category`,
      [userId, targetMonth, targetYear]
    );

    // Listas Solicitadas: Pendentes (Entradas/Saídas daquele mes) e Histórico Completo
    const [pendingTransactions]: any = await pool.query(
      `SELECT * FROM transactions
       WHERE user_id = ? AND status = 'pending' 
       AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?`,
      [userId, targetMonth, targetYear]
    );

    const [recentTransactions]: any = await pool.query(
      `SELECT * FROM transactions
       WHERE user_id = ? AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?
       ORDER BY id DESC LIMIT 50`,
      [userId, targetMonth, targetYear]
    );

    // 4. Despesas Fixas reais (Settings) para "Respiro"
    const [settingsRows]: any = await pool.query(
      `SELECT SUM(setting_value) as totalFixed
       FROM settings
       WHERE user_id = ? AND setting_type = 'expense' AND is_active = TRUE`,
      [userId]
    );
    const totalFixedExpenses = Number(settingsRows[0]?.totalFixed || 0);

    // Respiro: Entradas do Mês - Despesas Fixas configuradas
    const respiroFinanceiro = currentMonthIncome - totalFixedExpenses;
    
    // Projeção do Saldo: O que você tem hoje (netBalance que já inclui tudo pago) 
    // + o que falta receber este mês (pendentes) - o que falta pagar este mês (pendentes)
    const pendingIncomesAmount = monthTransRows
        .filter((r: any) => r.type === 'income' && r.status === 'pending')
        .reduce((sum: number, r: any) => sum + Number(r.total), 0);
        
    const projecaoSaldo = netBalance + pendingIncomesAmount - currentMonthExpensesPending;

    // Buscando Metas Ativas (Goals)
    let activeGoals = [];
    try {
        const [goalsRows]: any = await pool.query(`SELECT * FROM goals WHERE user_id = ? AND status = 'active'`, [userId]);
        activeGoals = goalsRows;
    } catch(e) {
        // ignora se a tabela nao existir (fallback se o script não rodou)
    }

    // Buscando Configurações Ativas para o Checklist Automático
    const [settingsList]: any = await pool.query(`SELECT * FROM settings WHERE user_id = ? AND is_active = TRUE`, [userId]);

    // Buscando Categorias Customizadas e Subcategorias
    let customCategories = [];
    try {
        const [catsRows]: any = await pool.query(`SELECT * FROM categories WHERE user_id = ? ORDER BY type ASC, name ASC`, [userId]);
        const [subCatsRows]: any = await pool.query(`
            SELECT s.* FROM subcategories s 
            JOIN categories c ON s.category_id = c.id 
            WHERE c.user_id = ? ORDER BY s.name ASC
        `, [userId]);
        customCategories = catsRows.map((cat: any) => ({
            ...cat,
            subcategories: subCatsRows.filter((sub: any) => sub.category_id === cat.id)
        }));
    } catch(e) {}

    return NextResponse.json({
      netBalance,
      walletBalances: walletRows || [],
      currentMonthIncome,
      currentMonthExpensesPaid,
      currentMonthExpensesPending,
      totalMonthExpenses,
      saldoFinalMes,
      respiroFinanceiro,
      projecaoSaldo,
      totalFixedExpenses,
      categories: categoryRows.map((r: any) => ({ name: r.category, value: Number(r.value) })),
      pendingIncomes: pendingTransactions.filter((t: any) => t.type === 'income'), // mantido para legado, mas usaremos checklist
      pendingExpenses: pendingTransactions.filter((t: any) => t.type === 'expense'),
      recentTransactions,
      activeGoals,
      settingsConfig: settingsList,
      customCategories
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

