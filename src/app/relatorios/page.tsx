"use client"
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { 
  BarChart3, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, 
  Calendar, Flame, Crown, Zap, Activity, PieChart as PieChartIcon, 
  DollarSign, Hash, Trophy, AlertTriangle
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ComposedChart, Line
} from 'recharts'

const formatBRL = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const CATEGORY_COLORS = ['#ef4444', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export default function RelatoriosPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then(res => res.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 animate-pulse">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
        <BarChart3 className="w-8 h-8 text-white" />
      </div>
      <p className="text-slate-400 font-medium">Analisando seus dados financeiros...</p>
    </div>
  )

  if (!data || data.error) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <AlertTriangle className="w-12 h-12 text-amber-400" />
      <p className="text-slate-500 font-medium">Não foi possível carregar os relatórios.</p>
    </div>
  )

  // ═══ PROCESSAR DADOS ═══════════════════════════════════════════
  
  // Evolução mensal
  const monthMap = new Map();
  data.monthly.forEach((row: any) => {
    const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { 
        name: `${MONTH_NAMES[row.month - 1]}/${String(row.year).slice(2)}`, 
        entradas: 0, saidas: 0, saldo: 0, 
        sortKey: key 
      });
    }
    const entry = monthMap.get(key);
    if (row.type === 'income') entry.entradas = Number(row.total);
    else entry.saidas = Number(row.total);
    entry.saldo = entry.entradas - entry.saidas;
  });
  const monthlyData = Array.from(monthMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Evolução do saldo acumulado
  let cumBalance = 0;
  const balanceEvolution = monthlyData.map(m => {
    cumBalance += m.saldo;
    return { ...m, acumulado: cumBalance };
  });

  // Categorias
  const categoryData = (data.categories || []).map((c: any, i: number) => ({
    name: c.category,
    value: Number(c.total),
    count: c.count,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }));

  // Padrão por dia da semana
  const dayMap = new Map();
  DAY_NAMES.forEach((name, i) => dayMap.set(i + 1, { name, entradas: 0, saidas: 0 }));
  (data.dailyPattern || []).forEach((row: any) => {
    const entry = dayMap.get(row.day_of_week);
    if (entry) {
      if (row.type === 'income') entry.entradas += Number(row.total);
      else entry.saidas += Number(row.total);
    }
  });
  const dailyData = Array.from(dayMap.values());

  // Totais gerais
  const totalIncome = (data.overall || []).find((r: any) => r.type === 'income');
  const totalExpense = (data.overall || []).find((r: any) => r.type === 'expense');
  const totalIncomeVal = Number(totalIncome?.total || 0);
  const totalExpenseVal = Number(totalExpense?.total || 0);
  const totalTxCount = Number(totalIncome?.count || 0) + Number(totalExpense?.count || 0);
  const avgMonthlyExpense = totalExpenseVal / (data.activeMonthsCount || 1);
  const avgMonthlyIncome = totalIncomeVal / (data.activeMonthsCount || 1);

  // Estatísticas
  const avgIncome = (data.averages || []).find((r: any) => r.type === 'income');
  const avgExpense = (data.averages || []).find((r: any) => r.type === 'expense');

  // Melhor mês (maior saldo positivo)
  const bestMonth = monthlyData.length > 0 
    ? monthlyData.reduce((best, m) => m.saldo > best.saldo ? m : best, monthlyData[0]) 
    : null;

  // Pior mês (maior déficit)
  const worstMonth = monthlyData.length > 0 
    ? monthlyData.reduce((worst, m) => m.saldo < worst.saldo ? m : worst, monthlyData[0]) 
    : null;

  // Dia mais caro
  const mostExpensiveDay = dailyData.reduce((max, d) => d.saidas > max.saidas ? d : max, dailyData[0]);

  // Taxa de economia
  const savingsRate = totalIncomeVal > 0 ? ((totalIncomeVal - totalExpenseVal) / totalIncomeVal * 100) : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-700">
      
      {/* ═══ HEADER ÉPICO ═══ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-8 md:p-10 shadow-2xl shadow-blue-950/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTEwIDEwaDQwdjQwSDEweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=')] opacity-60" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Relatórios</h1>
              <p className="text-blue-300/80 text-sm font-medium">Inteligência financeira dos últimos 12 meses</p>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* ═══ SUMMARY CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Entradas 12m */}
        <Card className="group relative overflow-hidden p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-2">
              <ArrowUpRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-500" /> Entradas (12m)
            </div>
            <p className="text-lg md:text-2xl font-black text-emerald-600">R$ {formatBRL(totalIncomeVal)}</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium">Média: R$ {formatBRL(avgMonthlyIncome)}/mês</p>
          </div>
        </Card>

        {/* Total Saídas 12m */}
        <Card className="group relative overflow-hidden p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-red-200 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-2">
              <ArrowDownRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-red-500" /> Saídas (12m)
            </div>
            <p className="text-lg md:text-2xl font-black text-red-600">R$ {formatBRL(totalExpenseVal)}</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium">Média: R$ {formatBRL(avgMonthlyExpense)}/mês</p>
          </div>
        </Card>

        {/* Taxa de Economia */}
        <Card className="group relative overflow-hidden p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-2">
              <Wallet className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-500" /> Taxa de Economia
            </div>
            <p className={`text-lg md:text-2xl font-black ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 0 ? 'text-amber-500' : 'text-red-600'}`}>
              {savingsRate.toFixed(1)}%
            </p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium">
              {savingsRate >= 20 ? '🏆 Excelente!' : savingsRate >= 10 ? '👍 Bom' : savingsRate >= 0 ? '⚠️ Atenção' : '🚨 Deficitário'}
            </p>
          </div>
        </Card>

        {/* Total de Transações */}
        <Card className="group relative overflow-hidden p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-2">
              <Hash className="w-3 h-3 md:w-3.5 md:h-3.5 text-purple-500" /> Transações
            </div>
            <p className="text-lg md:text-2xl font-black text-purple-600">{totalTxCount}</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium">em {data.activeMonthsCount} meses ativos</p>
          </div>
        </Card>
      </div>

      {/* ═══ INSIGHTS RÁPIDOS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {bestMonth && (
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider">Melhor Mês</p>
              <p className="font-black text-emerald-800 text-sm truncate">{bestMonth.name}</p>
              <p className="text-xs text-emerald-600 font-semibold">+R$ {formatBRL(bestMonth.saldo)}</p>
            </div>
          </div>
        )}
        {worstMonth && worstMonth.saldo < 0 && (
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-2xl">
            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-red-600/70 tracking-wider">Mês Mais Difícil</p>
              <p className="font-black text-red-800 text-sm truncate">{worstMonth.name}</p>
              <p className="text-xs text-red-600 font-semibold">-R$ {formatBRL(Math.abs(worstMonth.saldo))}</p>
            </div>
          </div>
        )}
        {mostExpensiveDay && mostExpensiveDay.saidas > 0 && (
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-amber-600/70 tracking-wider">Dia Mais Caro</p>
              <p className="font-black text-amber-800 text-sm truncate">{mostExpensiveDay.name}-feira</p>
              <p className="text-xs text-amber-600 font-semibold">R$ {formatBRL(mostExpensiveDay.saidas)} nos últimos 3m</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ GRÁFICO PRINCIPAL: EVOLUÇÃO MENSAL ═══ */}
      <Card className="p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" /> Evolução Mensal
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Entradas vs Saídas dos últimos 12 meses</p>
          </div>
        </div>
        {monthlyData.length > 0 ? (
          <div className="w-full h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEntrada" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSaida" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }} 
                  formatter={(value: any, name: string) => [`R$ ${formatBRL(Number(value))}`, name === 'entradas' ? '⬆ Entradas' : name === 'saidas' ? '⬇ Saídas' : '📊 Saldo']}
                  labelStyle={{ fontWeight: 700 }}
                />
                <Bar dataKey="entradas" name="entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} opacity={0.85} />
                <Bar dataKey="saidas" name="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} opacity={0.85} />
                <Line type="monotone" dataKey="saldo" name="saldo" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3, strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">Sem dados suficientes para visualizar</div>
        )}
      </Card>

      {/* ═══ SALDO ACUMULADO ═══ */}
      <Card className="p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="text-lg font-bold text-slate-800">Tendência do Saldo</h2>
            <p className="text-xs text-slate-400">Evolução acumulada do saldo ao longo dos meses</p>
          </div>
        </div>
        {balanceEvolution.length > 0 ? (
          <div className="w-full h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceEvolution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }} 
                  formatter={(value: any) => [`R$ ${formatBRL(Number(value))}`, '💰 Acumulado']}
                />
                <Area type="monotone" dataKey="acumulado" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradBalance)" dot={{ fill: '#6366f1', r: 3, strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">Dados insuficientes</div>
        )}
      </Card>

      {/* ═══ CATEGORIAS + DIA DA SEMANA ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        
        {/* Top Categorias */}
        <Card className="p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-orange-500" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Top Categorias de Gastos</h2>
              <p className="text-xs text-slate-400">Ranking dos últimos 12 meses</p>
            </div>
          </div>
          {categoryData.length > 0 ? (
            <div className="space-y-4">
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                      {categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', fontSize: '11px' }} 
                      formatter={(value: any) => [`R$ ${formatBRL(Number(value))}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {categoryData.map((cat: any, i: number) => {
                  const percent = totalExpenseVal > 0 ? (cat.value / totalExpenseVal * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0" style={{ backgroundColor: cat.fill }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700 truncate">{cat.name}</p>
                          <p className="text-sm font-bold text-slate-800 shrink-0 ml-2">R$ {formatBRL(cat.value)}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%`, backgroundColor: cat.fill }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">{percent.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">Nenhuma categoria registrada</div>
          )}
        </Card>

        {/* Padrão por Dia da Semana */}
        <Card className="p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-cyan-500" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Padrão Semanal</h2>
              <p className="text-xs text-slate-400">Gastos por dia da semana (últimos 3 meses)</p>
            </div>
          </div>
          {dailyData.some(d => d.saidas > 0 || d.entradas > 0) ? (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', fontSize: '11px' }} 
                    formatter={(value: any, name: string) => [`R$ ${formatBRL(Number(value))}`, name === 'entradas' ? '⬆ Entradas' : '⬇ Saídas']}
                  />
                  <Bar dataKey="entradas" name="entradas" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} opacity={0.85} />
                  <Bar dataKey="saidas" name="saidas" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={24} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">Dados insuficientes</div>
          )}
        </Card>
      </div>

      {/* ═══ MAIORES TRANSAÇÕES ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        
        {/* Maiores Saídas */}
        <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 border-b border-red-100">
            <h3 className="font-bold text-red-800 flex items-center gap-2 text-sm">
              <Crown className="w-4 h-4" /> Top 5 Maiores Saídas
            </h3>
            <p className="text-[10px] text-red-500 font-medium mt-0.5">Maiores despesas individuais em 12 meses</p>
          </div>
          <div className="p-4 space-y-2">
            {(data.biggestExpenses || []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma saída registrada.</p>
            )}
            {(data.biggestExpenses || []).map((tx: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50/30 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-black text-xs shrink-0">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{tx.title}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">{tx.category} · {new Date(tx.transaction_date).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className="text-sm font-bold text-red-600 shrink-0">R$ {formatBRL(Number(tx.amount))}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Maiores Entradas */}
        <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 border-b border-emerald-100">
            <h3 className="font-bold text-emerald-800 flex items-center gap-2 text-sm">
              <Crown className="w-4 h-4" /> Top 5 Maiores Entradas
            </h3>
            <p className="text-[10px] text-emerald-500 font-medium mt-0.5">Maiores receitas individuais em 12 meses</p>
          </div>
          <div className="p-4 space-y-2">
            {(data.biggestIncomes || []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma entrada registrada.</p>
            )}
            {(data.biggestIncomes || []).map((tx: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{tx.title}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">{tx.category} · {new Date(tx.transaction_date).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600 shrink-0">R$ {formatBRL(Number(tx.amount))}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ═══ ESTATÍSTICAS AVANÇADAS ═══ */}
      <Card className="p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="w-5 h-5 text-violet-500" />
          <div>
            <h2 className="text-lg font-bold text-slate-800">Estatísticas Avançadas</h2>
            <p className="text-xs text-slate-400">Métricas dos últimos 12 meses</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
            <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-1">Média por Entrada</p>
            <p className="text-lg font-black text-emerald-700">R$ {formatBRL(Number(avgIncome?.avg_amount || 0))}</p>
          </div>
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
            <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider mb-1">Média por Saída</p>
            <p className="text-lg font-black text-red-700">R$ {formatBRL(Number(avgExpense?.avg_amount || 0))}</p>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
            <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-1">Maior Entrada</p>
            <p className="text-lg font-black text-emerald-700">R$ {formatBRL(Number(avgIncome?.max_amount || 0))}</p>
          </div>
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
            <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider mb-1">Maior Saída</p>
            <p className="text-lg font-black text-red-700">R$ {formatBRL(Number(avgExpense?.max_amount || 0))}</p>
          </div>
        </div>
      </Card>

      {/* ═══ TABELA DE RESUMO MENSAL ═══ */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-slate-500" /> Resumo Mensal Detalhado
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs uppercase text-slate-500 tracking-wider bg-slate-50/50">
              <tr>
                <th className="p-3 md:p-4 font-semibold">Mês</th>
                <th className="p-3 md:p-4 font-semibold text-right">Entradas</th>
                <th className="p-3 md:p-4 font-semibold text-right">Saídas</th>
                <th className="p-3 md:p-4 font-semibold text-right">Saldo</th>
                <th className="p-3 md:p-4 font-semibold text-center hidden md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum dado disponível</td></tr>
              )}
              {[...monthlyData].reverse().map((m, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 md:p-4 font-bold text-slate-700">{m.name}</td>
                  <td className="p-3 md:p-4 text-right font-semibold text-emerald-600">R$ {formatBRL(m.entradas)}</td>
                  <td className="p-3 md:p-4 text-right font-semibold text-red-600">R$ {formatBRL(m.saidas)}</td>
                  <td className={`p-3 md:p-4 text-right font-bold ${m.saldo >= 0 ? 'text-blue-600' : 'text-red-700'}`}>
                    {m.saldo >= 0 ? '+' : '-'}R$ {formatBRL(Math.abs(m.saldo))}
                  </td>
                  <td className="p-3 md:p-4 text-center hidden md:table-cell">
                    <span className={`text-[9px] uppercase font-bold px-2 py-1 rounded-md ${m.saldo >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {m.saldo >= 0 ? '✓ Positivo' : '✗ Déficit'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
