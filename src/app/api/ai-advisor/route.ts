import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSessionUserId } from '@/lib/auth';
import pool from '@/lib/db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'GEMINI_API_KEY não configurada',
        setup: true,
        message: 'Configure a variável GEMINI_API_KEY no arquivo .env para ativar o assistente IA. Obtenha sua chave gratuita em https://aistudio.google.com/apikey'
      }, { status: 400 });
    }

    const { message, marketContext } = await request.json();
    if (!message) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });

    // Buscar contexto financeiro do usuário
    let userFinancialContext = '';
    try {
      const [balanceRows]: any = await pool.query(
        `SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END) as netBalance FROM transactions WHERE user_id = ? AND status = 'paid'`,
        [userId]
      );
      const [monthRows]: any = await pool.query(
        `SELECT type, SUM(amount) as total FROM transactions WHERE user_id = ? AND MONTH(transaction_date) = MONTH(CURDATE()) AND YEAR(transaction_date) = YEAR(CURDATE()) GROUP BY type`,
        [userId]
      );
      const [goalsRows]: any = await pool.query(
        `SELECT title, target_amount, current_amount FROM goals WHERE user_id = ? AND status = 'active'`,
        [userId]
      );

      const balance = Number(balanceRows[0]?.netBalance || 0);
      const monthIncome = Number(monthRows.find((r: any) => r.type === 'income')?.total || 0);
      const monthExpense = Number(monthRows.find((r: any) => r.type === 'expense')?.total || 0);
      const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome * 100).toFixed(1) : '0';

      userFinancialContext = `
PERFIL FINANCEIRO DO USUÁRIO (dados reais do sistema):
- Saldo acumulado total: R$ ${balance.toFixed(2)}
- Renda do mês atual: R$ ${monthIncome.toFixed(2)}
- Gastos do mês atual: R$ ${monthExpense.toFixed(2)}
- Taxa de economia: ${savingsRate}%
- Sobra mensal estimada: R$ ${(monthIncome - monthExpense).toFixed(2)}
${goalsRows.length > 0 ? `- Metas ativas: ${goalsRows.map((g: any) => `${g.title} (${((Number(g.current_amount)/Number(g.target_amount))*100).toFixed(0)}% de R$${Number(g.target_amount).toFixed(2)})`).join(', ')}` : '- Sem metas financeiras ativas'}
      `.trim();
    } catch (e) {
      userFinancialContext = 'Dados financeiros do usuário não disponíveis no momento.';
    }

    // Configurar Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `Você é o **OWL Advisor 🦉**, assistente financeiro inteligente do sistema OWL Finance.

REGRAS OBRIGATÓRIAS:
1. Responda SEMPRE em português brasileiro
2. Seja conciso e prático (máximo 4-5 parágrafos curtos)
3. Use emojis moderadamente para dar destaque visual
4. Foque na realidade do mercado brasileiro: Tesouro Direto, FIIs, CDB, LCI/LCA, Poupança, ações da B3
5. SEMPRE considere impostos (IR regressivo, IOF, isenções de FIIs/LCI/LCA/Poupança)
6. Priorize segurança: sugira opções conservadoras primeiro, depois moderadas e arrojadas
7. NUNCA recomende investir dinheiro de emergência ou que a pessoa não pode perder
8. Use dados reais quando fornecidos no contexto
9. Formate valores em BRL (R$)
10. Se perguntarem sobre crypto, alerte sobre a alta volatilidade
11. Quando fizer cálculos, mostre a conta de forma simples

DADOS DE MERCADO ATUAIS:
${marketContext || 'Dados de mercado não disponíveis no momento.'}

${userFinancialContext}

IMPORTANTE: Você tem acesso aos dados financeiros REAIS do usuário acima. Use essas informações para personalizar suas respostas. Por exemplo, se o usuário pergunta "quanto investir", considere a sobra mensal dele.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Pergunta do usuário: ${message}` }
    ]);

    const response = result.response;
    const text = response.text();

    return NextResponse.json({ 
      response: text,
      model: 'gemini-2.0-flash'
    });
  } catch (error: any) {
    console.error('[AI Advisor] Error:', error);
    
    if (error.message?.includes('API_KEY')) {
      return NextResponse.json({ 
        error: 'Chave de API inválida',
        setup: true,
        message: 'A GEMINI_API_KEY configurada parece ser inválida. Verifique em https://aistudio.google.com/apikey'
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Erro ao processar sua pergunta. Tente novamente.',
      details: error.message 
    }, { status: 500 });
  }
}
