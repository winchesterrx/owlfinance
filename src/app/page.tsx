"use client"
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Plus, CreditCard, FileText, CheckCircle2, Trash2, Target, CircleDashed, Receipt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend } from 'recharts'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [date, setDate] = useState(new Date())

  const [entradaForm, setEntradaForm] = useState({ category: 'Salário Líquido', description: '', amount: '' })
  const [saidaForm, setSaidaForm] = useState({ description: '', amount: '', category: '', subcategory: '', sourceWallet: 'Conta Principal' })
  const [aporteForm, setAporteForm] = useState({ amount: '', goalId: null })

  const fetchDashboard = async (targetDate: Date) => {
    const month = targetDate.getMonth() + 1
    const year = targetDate.getFullYear()
    try {
      const res = await fetch(`/api/dashboard?month=${month}&year=${year}`, { cache: 'no-store' })
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchDashboard(date)
  }, [date])

  const nextMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))
  const prevMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`

  const handleAddTransaction = async (type: 'income' | 'expense') => {
    const form = type === 'income' ? entradaForm : saidaForm;
    if (!form.amount) return;

    await fetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        title: form.description || (type === 'income' ? 'Entrada' : 'Despesa'),
        amount: parseFloat(form.amount),
        type,
        category: form.category,
        subcategory: (form as any).subcategory || null,
        status: 'paid',
        transaction_date: date.toISOString().split('T')[0],
        wallet_source: type === 'income' ? (form.description || 'Geral') : (saidaForm.sourceWallet || 'Conta Principal')
      })
    })

    if (type === 'income') setEntradaForm({ category: 'Salário Líquido', description: '', amount: '' })
    else setSaidaForm({ ...saidaForm, category: '', subcategory: '', description: '', amount: '' })
    
    fetchDashboard(date)
  }

  const handleChecklistSubmit = async (setting: any) => {
      // Optimistic UI Update (Resposta Instantânea Visual)
      const fakeId = Date.now();
      const fakeTransaction = {
          id: fakeId,
          title: setting.setting_name,
          amount: setting.setting_value,
          type: setting.setting_type,
          category: setting.setting_key,
          subcategory: setting.setting_name,
          status: 'paid',
          transaction_date: date.toISOString().split('T')[0],
          wallet_source: setting.setting_type === 'income' ? setting.setting_name : 'Conta Principal'
      };
      setData((prev: any) => ({
          ...prev,
          recentTransactions: [...prev.recentTransactions, fakeTransaction],
          currentMonthIncome: setting.setting_type === 'income' ? prev.currentMonthIncome + Number(setting.setting_value) : prev.currentMonthIncome,
          totalMonthExpenses: setting.setting_type === 'expense' ? prev.totalMonthExpenses + Number(setting.setting_value) : prev.totalMonthExpenses,
          netBalance: setting.setting_type === 'income' ? prev.netBalance + Number(setting.setting_value) : prev.netBalance - Number(setting.setting_value)
      }));

      await fetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(fakeTransaction)
      })
      fetchDashboard(date)
  }

  const handleDelete = async (id: number, bypassConfirm = false) => {
    if(!bypassConfirm && !confirm("Tem certeza que deseja desmarcar e apagar este lançamento?")) return;
    
    // Optimistic UI Update (Exclusão Instantânea Visual)
    const t = data.recentTransactions.find((x:any) => x.id === id);
    if (t) {
       setData((prev: any) => ({
           ...prev,
           recentTransactions: prev.recentTransactions.filter((x:any) => x.id !== id),
           currentMonthIncome: t.type === 'income' ? prev.currentMonthIncome - Number(t.amount) : prev.currentMonthIncome,
           totalMonthExpenses: t.type === 'expense' ? prev.totalMonthExpenses - Number(t.amount) : prev.totalMonthExpenses,
           netBalance: t.type === 'income' ? prev.netBalance - Number(t.amount) : prev.netBalance + Number(t.amount)
       }));
    }

    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
    fetchDashboard(date)
  }

  const handleAporte = async (goalId: number, goalTitle: string) => {
      if(!aporteForm.amount) return;
      await fetch('/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
              title: `Aporte: ${goalTitle}`,
              amount: parseFloat(aporteForm.amount),
              type: 'expense',
              category: 'Metas',
              status: 'paid',
              transaction_date: date.toISOString().split('T')[0],
              wallet_source: saidaForm.sourceWallet || 'Conta Principal',
              goal_id: goalId
          })
      })
      setAporteForm({ amount: '', goalId: null })
      fetchDashboard(date)
  }

  if (!data) return <div className="h-full flex items-center justify-center text-slate-400 font-medium animate-pulse">Sincronizando dados automáticos...</div>

  const comprometimentoPercent = data.currentMonthIncome > 0 
    ? Math.min((data.totalMonthExpenses / data.currentMonthIncome) * 100, 100)
    : 0;

  const PIE_COLORS = ['#ef4444', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

  const availableWallets = data.walletBalances.length > 0 ? data.walletBalances.map((w:any) => w.wallet_source) : ['Conta Principal'];

  const isItemPaidChecklist = (settingName: string, type: string) => {
      return data.recentTransactions.find((t: any) => t.title === settingName && t.type === type && new Date(t.transaction_date).getMonth() === date.getMonth());
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">

      {/* Header & Date Selector - Ultra Compacto no Mobile */}
      <div className="flex flex-row items-center justify-between gap-2 bg-white p-2 md:p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
           <Wallet className="w-5 h-5 md:w-6 md:h-6 text-blue-600 shrink-0" />
           <h1 className="hidden md:block text-2xl font-bold tracking-tight text-slate-900">Dashboard de Contas</h1>
           <span className="md:hidden font-bold text-slate-900 text-sm">Dashboard</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 scale-90 md:scale-100 origin-right">
           <button onClick={prevMonth} className="p-1.5 md:p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"><ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-slate-600"/></button>
           <span className="font-semibold text-slate-800 min-w-[100px] md:min-w-[120px] text-center text-sm md:text-base">{monthName}</span>
           <button onClick={nextMonth} className="p-1.5 md:p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"><ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-600"/></button>
        </div>
      </div>


      <div className="flex flex-col gap-4 md:gap-6">
        {/* 4 Cards Principais - Mini no Mobile (2x2) - Ordem 3 no mobile, Ordem 1 no Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 order-3 md:order-1">
          <Card className="p-2 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="flex items-center gap-1 text-slate-500 mb-0.5 md:mb-2 text-[9px] md:text-sm font-medium"><TrendingUp className="w-2.5 h-2.5 md:w-4 md:h-4 text-green-500"/> <span className="truncate uppercase md:normal-case">Entradas</span></div>
             <div className="text-sm md:text-2xl font-bold text-green-600">R$ {data.currentMonthIncome.toFixed(2)}</div>
          </Card>
          <Card className="p-2 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="flex items-center gap-1 text-slate-500 mb-0.5 md:mb-2 text-[9px] md:text-sm font-medium"><TrendingDown className="w-2.5 h-2.5 md:w-4 md:h-4 text-red-500"/> <span className="truncate uppercase md:normal-case">Saídas</span></div>
             <div className="text-sm md:text-2xl font-bold text-red-600">R$ {data.totalMonthExpenses.toFixed(2)}</div>
          </Card>
          <Card className="p-2 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-1 text-slate-500 mb-0.5 md:mb-2 text-[9px] md:text-sm font-medium"><Wallet className="w-2.5 h-2.5 md:w-4 md:h-4 text-blue-500"/> <span className="truncate uppercase md:normal-case">Saldo</span></div>
             <div className="text-sm md:text-2xl font-bold text-blue-600 mb-0.5 md:mb-1">R$ {data.netBalance.toFixed(2)}</div>
          </Card>
          <Card className="p-2 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-1 text-slate-500 mb-0.5 md:mb-2 text-[9px] md:text-sm font-medium"><Wallet className="w-2.5 h-2.5 md:w-4 md:h-4 text-emerald-500"/> <span className="truncate uppercase md:normal-case">Principal</span></div>
             <div className="text-sm md:text-2xl font-bold text-emerald-600">R$ {Number(data.walletBalances.find((w:any) => w.wallet_source === 'Conta Principal')?.netBalance || 0).toFixed(2)}</div>
          </Card>
        </div>

        {/* MÓDULO WALLETS & INSIGHTS DA RENDA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 order-3 md:order-1">
         <Card className="p-5 rounded-2xl border border-slate-200 shadow-sm col-span-2">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wider">Divisão de Saldo por Carteiras (Wallets)</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                {data.walletBalances.map((wallet: any, idx: number) => (
                    <div key={idx} className="min-w-[150px] p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 font-semibold uppercase mb-1 truncate">{wallet.wallet_source}</p>
                        <p className="text-lg font-bold text-slate-800">R$ {Number(wallet.netBalance).toFixed(2)}</p>
                    </div>
                ))}
            </div>
         </Card>

        <Card className="p-5 rounded-2xl border border-slate-200 shadow-sm col-span-1">
           <div className="flex items-center justify-between mb-2">
             <div className="text-slate-500 text-sm font-medium">Comprometimento de Renda</div>
           </div>
           <div className={`text-2xl font-bold mb-1 ${comprometimentoPercent < 50 ? 'text-green-600' : comprometimentoPercent < 80 ? 'text-amber-500' : 'text-red-600'}`}>
             {comprometimentoPercent.toFixed(1)}%
           </div>
           <div className="text-xs text-slate-400 mb-4">Das entradas engolidas por saídas</div>
           <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
             <div className={`h-full transition-all duration-1000 ${comprometimentoPercent < 50 ? 'bg-green-500' : comprometimentoPercent < 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${comprometimentoPercent}%` }}></div>
           </div>
        </Card>
      </div>

        {/* MÓDULO ANALÍTICO E GRÁFICOS */}
        <div className="order-4 md:order-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-10 mb-4">Inteligência Financeira</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gráfico 1: Destino da Renda (Donut) */}
          <Card className="p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
              <h3 className="w-full font-semibold text-slate-800 mb-2">Raio-X da Renda Onde Foi Gasta</h3>
              {data.categories && data.categories.length > 0 ? (
                  <div className="w-full h-56 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                             <Pie data={data.categories} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                                {data.categories.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                             </Pie>
                             <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '#e2e8f0', fontSize: '12px' }} formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`} />
                         </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-xl font-black text-slate-800">R$ {data.currentMonthIncome.toFixed(0)}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400">Renda Base</span>
                      </div>
                  </div>
              ) : (
                  <div className="w-full h-56 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl mt-2">Nenhum gasto fatiado</div>
              )}
          </Card>

          {/* Gráfico 2: Evolução Diária do Mês */}
          <Card className="p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1">
              <h3 className="w-full font-semibold text-slate-800 mb-2">Comportamento Diário</h3>
              {data.recentTransactions.length > 0 ? (
                  <div className="w-full h-56">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={Array.from(data.recentTransactions.reduce((acc: Map<number, any>, t: any) => {
                              const d = new Date(t.transaction_date).getUTCDate();
                              const exist = acc.get(d) || { name: `Dia ${d}`, ganho: 0, gasto: 0 };
                              if(t.type === 'income') exist.ganho += Number(t.amount);
                              else exist.gasto += Number(t.amount);
                              acc.set(d, exist);
                              return acc;
                          }, new Map()).values()).sort((a: any, b: any) => Number(a.name.replace('Dia ','')) - Number(b.name.replace('Dia ','')))} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                              <defs>
                                  <linearGradient id="colorGanho" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                  <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                              </defs>
                              <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10}} tickLine={false} axisLine={false} />
                              <YAxis tick={{fill: '#94a3b8', fontSize: 10}} tickLine={false} axisLine={false}/>
                              <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                              <Area type="monotone" dataKey="ganho" name="Entradas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorGanho)" />
                              <Area type="monotone" dataKey="gasto" name="Saídas" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorGasto)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              ) : (
                  <div className="w-full h-56 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl mt-2">Sem atividade neste mês</div>
              )}
          </Card>

          {/* Gráfico 3: Distribuição das Carteiras */}
          <Card className="p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1">
              <h3 className="w-full font-semibold text-slate-800 mb-2">Poder de Fogo (Carteiras)</h3>
              {data.walletBalances.length > 0 ? (
                  <div className="w-full h-56">
                      <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={data.walletBalances.map((w:any) => ({ name: w.wallet_source, Saldo: Number(w.netBalance) }))} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10}} tickLine={false} axisLine={false} />
                                <YAxis tick={{fill: '#94a3b8', fontSize: 10}} tickLine={false} axisLine={false}/>
                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} cursor={{fill: '#f8fafc'}}/>
                                <Bar dataKey="Saldo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                           </BarChart>
                      </ResponsiveContainer>
                  </div>
              ) : (
                  <div className="w-full h-56 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl mt-2">Carteiras Vazias</div>
              )}
          </Card>
        </div>
      </div>

        {/* --- PAINÉIS UNIFICADOS: ENTRADAS E SAÍDAS --- PRIORIDADE NO MOBILE (ORDER-1 NO CONTAINER) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 order-1 md:order-3 mt-0 md:mt-8">
         
         {/* --- PAINEL UNIFICADO DE SAÍDAS --- INVERTIDO NO MOBILE PRA VIR PRIMEIRO */}
         <Card className="flex flex-col rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white order-1 md:order-2">
            <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between">
                <h2 className="font-bold text-red-800 flex items-center gap-2"><TrendingDown className="w-5 h-5"/> Saídas do Mês</h2>
            </div>
            <div className="p-5 space-y-6">
                
                {/* Lançamento Manual Embutido */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lançamento Avulso (Extra)</p>
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <input value={saidaForm.description} onChange={e => setSaidaForm({...saidaForm, description: e.target.value})} placeholder="Descrição" className="w-2/3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-red-500/50" />
                            <input value={saidaForm.amount} onChange={e => setSaidaForm({...saidaForm, amount: e.target.value})} type="number" placeholder="Valor R$" className="w-1/3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-red-500/50" />
                        </div>
                        <select value={saidaForm.category} onChange={e => setSaidaForm({...saidaForm, category: e.target.value, subcategory: ''})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-red-500/50">
                            <option value="">Selecione o Grupo Principal...</option>
                            {(data.customCategories || []).filter((c:any) => c.type === 'expense').map((c:any) => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                        {(() => {
                           const parent = (data.customCategories || []).find((c:any) => c.type === 'expense' && c.name === saidaForm.category);
                           if(parent && parent.subcategories.length > 0) {
                               return (
                                  <select value={saidaForm.subcategory} onChange={e => setSaidaForm({...saidaForm, subcategory: e.target.value})} className="w-full p-2.5 bg-red-50/50 border border-red-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-red-500/50">
                                      <option value="">Selecione um Subgrupo...</option>
                                      {parent.subcategories.map((sub:any) => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                                  </select>
                               )
                           }
                           return null;
                        })()}
                        <div className="w-full flex items-center border border-slate-200 bg-slate-50 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-red-500/50 mt-1">
                            <span className="px-2 text-[10px] font-bold text-slate-400 bg-slate-100 border-r border-slate-200 h-full flex items-center">VIA</span>
                            <select value={saidaForm.sourceWallet} onChange={e => setSaidaForm({...saidaForm, sourceWallet: e.target.value})} className="w-full py-2.5 px-2 bg-transparent text-sm text-slate-700 font-semibold outline-none">
                                <option>Conta Principal</option>
                                {availableWallets.filter((w:string) => w !== 'Conta Principal').map((w:string, i:number) => <option key={i}>{w}</option>)}
                            </select>
                        </div>
                        <button onClick={() => handleAddTransaction('expense')} className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-sm flex justify-center items-center gap-2 transition-colors mt-2"><Plus className="w-4 h-4"/> Adicionar Pelo Painel</button>
                    </div>
                </div>

                {/* Lista de Saídas Configurada (Acordeões Dinâmicos) */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Contas Fixas {'&'} Previsões</h3>
                    {(() => {
                        const expenseSettings = data.settingsConfig.filter((s:any) => s.setting_type === 'expense');
                        if (expenseSettings.length === 0) return <p className="text-sm text-slate-400 py-2">Nenhuma conta fixa configurada.</p>;
                        
                        // Agrupar por Categorias
                        const grouped = expenseSettings.reduce((acc:any, curr:any) => {
                            if (!acc[curr.setting_key]) acc[curr.setting_key] = [];
                            acc[curr.setting_key].push(curr);
                            return acc;
                        }, {});

                        return Object.keys(grouped).map((groupName, i) => {
                            const items = grouped[groupName];
                            const allPaid = items.every((it:any) => isItemPaidChecklist(it.setting_name, 'expense', it.setting_key));
                            
                            return (
                                <details key={i} className="group border border-slate-200 bg-slate-50 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden open:bg-slate-100 transition-colors">
                                    <summary className="flex items-center justify-between p-3 cursor-pointer select-none">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${allPaid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                {allPaid ? <CheckCircle2 className="w-5 h-5"/> : <Receipt className="w-5 h-5"/>}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-700 text-sm">{groupName}</h4>
                                                <p className="text-[10px] text-slate-500 uppercase">{items.length} itens vinculados</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                                    </summary>
                                    <div className="p-3 pt-0 space-y-2 border-t border-slate-200 bg-white">
                                        {items.map((s:any) => {
                                            const paidItem = isItemPaidChecklist(s.setting_name, 'expense', s.setting_key);
                                            return (
                                                <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${paidItem ? 'bg-green-50/50 border-green-100' : 'bg-slate-50 border-slate-200'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!paidItem} 
                                                            onChange={() => paidItem ? handleDelete(paidItem.id, true) : handleChecklistSubmit(s)} 
                                                            className="w-4 h-4 accent-red-600 cursor-pointer"
                                                        />
                                                        <p className={`text-xs font-semibold ${paidItem ? 'text-green-700 line-through opacity-60' : 'text-slate-700'}`}>{s.setting_name}</p>
                                                    </div>
                                                    <span className={`text-xs font-bold ${paidItem ? 'text-green-600/50' : 'text-red-600'}`}>R$ {Number(s.setting_value).toFixed(2)}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </details>
                            )
                        })
                    })()}
                </div>
            </div>
         </Card>

         {/* --- PAINEL UNIFICADO DE ENTRADAS --- MOVIDO PRA DEPOIS DO DE SAIDAS NO MOBILE */}
         <Card className="flex flex-col rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white order-2 md:order-1">
            <div className="bg-green-50 p-4 border-b border-green-100 flex items-center justify-between">
                <h2 className="font-bold text-green-800 flex items-center gap-2"><TrendingUp className="w-5 h-5"/> Entradas do Mês</h2>
            </div>
            <div className="p-5 space-y-6">
                
                {/* Lançamento Manual Embutido */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lançamento Avulso (Extra)</p>
                    <div className="flex flex-col gap-3">
                        <select value={entradaForm.category} onChange={e => setEntradaForm({...entradaForm, category: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-green-500/50">
                            <option>Salário Líquido</option>
                            <option>Vale Alimentação</option>
                            <option>Freelance / Extra</option>
                            <option>Rendimento</option>
                        </select>
                        <input value={entradaForm.description} onChange={e => setEntradaForm({...entradaForm, description: e.target.value})} placeholder="Nome (Ex: Conta Itaú)" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-green-500/50" />
                        <div className="flex gap-3">
                            <input value={entradaForm.amount} onChange={e => setEntradaForm({...entradaForm, amount: e.target.value})} type="number" placeholder="Valor R$" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-green-500/50" />
                            <button onClick={() => handleAddTransaction('income')} className="px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm flex items-center justify-center transition-colors"><Plus className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>

                {/* Lista de Entradas Configurada */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Previsões (Configuradas)</h3>
                    {data.settingsConfig.filter((s:any) => s.setting_type === 'income').length === 0 && <p className="text-sm text-slate-400 py-2">Nenhuma previsão configurada.</p>}
                    {data.settingsConfig.filter((s:any) => s.setting_type === 'income').map((s:any) => {
                        const paidItem = isItemPaidChecklist(s.setting_name, 'income');
                        return (
                        <div key={s.id} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${paidItem ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-200 hover:border-green-300'}`}>
                            <div className="flex items-center gap-3 pl-1">
                                <input 
                                    type="checkbox" 
                                    checked={!!paidItem} 
                                    onChange={() => paidItem ? handleDelete(paidItem.id, true) : handleChecklistSubmit(s)} 
                                    className="w-5 h-5 accent-green-600 cursor-pointer shrink-0"
                                />
                                <div>
                                    <p className={`font-semibold text-sm ${paidItem ? 'text-green-700 line-through opacity-70' : 'text-slate-800'}`}>{s.setting_name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase">{s.setting_key}</p>
                                </div>
                            </div>
                            <span className={`font-bold text-sm ${paidItem ? 'text-green-600/50 line-through' : 'text-green-600'}`}>R$ {Number(s.setting_value).toFixed(2)}</span>
                        </div>
                    )})}
                </div>
            </div>
         </Card>

      </div>
      </div>

      {/* METAS (GOALS) EMBUTIDAS */}
      <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-10">Metas em Andamento</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {(!data.activeGoals || data.activeGoals.length === 0) && (
             <div className="w-full xl:col-span-3 p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
                Nenhuma meta financeira configurada no banco de dados. 
             </div>
          )}
          {data.activeGoals && data.activeGoals.map((g: any) => {
              const p = Math.min((Number(g.current_amount) / Number(g.target_amount)) * 100, 100);
              return (
                  <Card key={g.id} className="p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2"><Target className="w-5 h-5 text-blue-500"/><h3 className="font-bold text-slate-800">{g.title}</h3></div>
                          <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{p.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mb-2 font-medium"><span>Acumulado: R$ {Number(g.current_amount).toFixed(2)}</span><span>Alvo: R$ {Number(g.target_amount).toFixed(2)}</span></div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${p}%` }}></div></div>
                      
                      <div className="flex gap-2 items-center border border-slate-100 rounded-lg p-2 bg-slate-50 transition-colors focus-within:border-blue-300">
                          <input value={aporteForm.goalId === g.id ? aporteForm.amount : ''} onChange={e => setAporteForm({ goalId: g.id, amount: e.target.value })} type="number" placeholder="Aporte R$" className="w-full text-sm p-2 outline-none bg-transparent" />
                          <button onClick={() => handleAporte(g.id, g.title)} className="bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded shadow-sm hover:bg-blue-700 whitespace-nowrap">Aportar R$</button>
                      </div>
                  </Card>
              )
          })}
      </div>

      {/* --- EXTRATO DETALHADO COMPLETO MODO TABELA --- */}
      <div className="flex items-center gap-2 mt-10 mb-5">
         <FileText className="w-6 h-6 text-slate-400" />
         <h2 className="text-xl font-bold tracking-tight text-slate-900">Extrato Detalhado do Mês</h2>
      </div>
      
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white mb-10">
        <div className="overflow-x-auto w-full custom-scrollbar pb-2">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <tr>
                        <th className="p-4 rounded-tl-2xl">Tipo</th>
                        <th className="p-4">Data / Hora</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4">Origem</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-right rounded-tr-2xl">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    {data.recentTransactions.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-medium">Nenhuma movimentação neste mês.</td></tr>}
                    {data.recentTransactions.map((t:any) => (
                        <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group relative">
                            <td className="p-4 w-16">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                </div>
                            </td>
                            <td className="p-4 text-slate-500 font-medium whitespace-nowrap">{new Date(t.transaction_date).toLocaleDateString()}</td>
                            <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{t.title}</td>
                            <td className="p-4 whitespace-nowrap">
                                <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-full shadow-sm">
                                    {t.wallet_source || 'Conta Principal'}
                                </span>
                            </td>
                            <td className="p-4 text-slate-500 text-xs uppercase font-semibold whitespace-nowrap">
                                {t.category}{t.subcategory ? ` > ${t.subcategory}` : ''}
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`font-bold text-base ${t.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                                        {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                                    </span>
                                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold ${t.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {t.status === 'paid' ? 'Efetivado' : 'Aguardando'}
                                    </span>
                                </div>
                                <button onClick={() => handleDelete(t.id)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 p-2 shadow-sm border border-slate-200 rounded-lg transition-all bg-white z-10">
                                    <Trash2 className="w-4 h-4"/>
                                </button>
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
