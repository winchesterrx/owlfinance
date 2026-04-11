"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Plus, Trash2, History, ChevronDown, ChevronUp, Brain, Zap } from 'lucide-react'

// Formatação Brasileira de Moeda
const formatBRL = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MetasPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', target_amount: '', current_amount: '' })
  const [expandedGoal, setExpandedGoal] = useState<number | null>(null)
  const [goalHistory, setGoalHistory] = useState<any>({})
  const [aporteForm, setAporteForm] = useState<any>({ goalId: null, amount: '' })

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals')
      const json = await res.json()
      if(Array.isArray(json)) {
        setGoals(json)
        // Auto-carregar histórico de cada meta para a previsão inteligente
        for (const goal of json) {
          try {
            const hRes = await fetch(`/api/transactions?goal_id=${goal.id}`)
            const hJson = await hRes.json()
            setGoalHistory((prev: any) => ({ ...prev, [goal.id]: Array.isArray(hJson) ? hJson : [] }))
          } catch(e) {}
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.target_amount) return

    await fetch('/api/goals', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        target_amount: parseFloat(form.target_amount),
        current_amount: form.current_amount ? parseFloat(form.current_amount) : 0
      })
    })

    setForm({ title: '', target_amount: '', current_amount: '' })
    fetchGoals()
  }

  const handleDelete = async (id: number) => {
      if(!confirm("Atenção: Deletar a meta apagará o rastreio dela, mas não apagará as despesas já debitadas no histórico das suas contas. Deseja prosseguir?")) return;
      await fetch(`/api/goals?id=${id}`, { method: 'DELETE' })
      fetchGoals()
  }

  const fetchGoalHistory = async (goalId: number) => {
      try {
          const res = await fetch(`/api/transactions?goal_id=${goalId}`)
          const json = await res.json()
          setGoalHistory((prev: any) => ({ ...prev, [goalId]: Array.isArray(json) ? json : [] }))
      } catch(e) { console.error(e) }
  }

  const toggleHistory = (goalId: number) => {
      if (expandedGoal === goalId) {
          setExpandedGoal(null)
      } else {
          setExpandedGoal(goalId)
          fetchGoalHistory(goalId)
      }
  }

  const handleAporte = async (goalId: number, goalTitle: string) => {
      if (!aporteForm.amount || Number(aporteForm.amount) <= 0) return;
      await fetch('/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
              title: `Aporte: ${goalTitle}`,
              amount: parseFloat(aporteForm.amount),
              type: 'expense',
              category: 'Metas',
              status: 'paid',
              transaction_date: new Date().toISOString().split('T')[0],
              wallet_source: 'Conta Principal',
              goal_id: goalId
          })
      })
      setAporteForm({ goalId: null, amount: '' })
      fetchGoals()
  }

  const handleDeleteAporte = async (aporteId: number, goalId: number) => {
      if(!confirm("Tem certeza que deseja excluir este aporte? O valor será devolvido à meta.")) return;
      await fetch(`/api/transactions?id=${aporteId}`, { method: 'DELETE' })
      fetchGoalHistory(goalId)
      fetchGoals()
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 flex items-center gap-3"><Target className="w-8 h-8 text-blue-600"/> Módulo de Metas</h1>
        <p className="text-slate-500">Crie seus sonhos financeiros e deixe o Dashboard rastreá-los.</p>
      </div>

      <Card className="p-6 rounded-2xl border border-slate-200 shadow-sm bg-white">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-1/3">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">O que você quer alcançar?</label>
                  <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ex: Comprar Moto" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div className="w-full md:w-1/3">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Qual o valor total? (Alvo) R$</label>
                  <input type="number" value={form.target_amount} onChange={e => setForm({...form, target_amount: e.target.value})} placeholder="Ex: 15000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div className="w-full md:w-1/3">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Já tem algo guardado? R$</label>
                  <input type="number" value={form.current_amount} onChange={e => setForm({...form, current_amount: e.target.value})} placeholder="Ex: 4500 (Opcional)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <button type="submit" className="w-full md:w-auto p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center justify-center font-bold px-6 transition-colors">
                  <Plus className="w-5 h-5 mr-2"/> Cadastrar
              </button>
          </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.length === 0 && (
            <div className="col-span-full p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-500 font-medium">
                Seu quadro de conquistas está vazio! Defina seu próximo grande objetivo acima e comece a rastrear o seu progresso.
            </div>
        )}
        {goals.map((g: any) => {
            const percentage = Math.min((Number(g.current_amount) / Number(g.target_amount)) * 100, 100);
            const faltam = Math.max(Number(g.target_amount) - Number(g.current_amount), 0);
            const history = goalHistory[g.id] || [];
            const isExpanded = expandedGoal === g.id;

            // === INTELIGÊNCIA DE PREVISÃO ===
            let avgAporte = 0;
            let mediaMensal = 0;
            let aportesMensais = 0;
            let aportesRestantes = 0;
            let mesesRestantes = 0;
            let previsaoData = '';
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

            if (history.length > 0) {
                // Total aportado via transações rastreadas
                const totalAportado = history.reduce((sum: number, h: any) => sum + Number(h.amount), 0);
                
                // Média por aporte individual
                avgAporte = totalAportado / history.length;

                // Quantos aportes faltam? (valor restante / média por aporte)
                if (avgAporte > 0 && faltam > 0) {
                    aportesRestantes = Math.ceil(faltam / avgAporte);
                }

                // Agrupar por mês para saber a cadência mensal
                const mesesUnicos = new Set(history.map((h: any) => {
                    const d = new Date(h.transaction_date);
                    return `${d.getFullYear()}-${d.getMonth()}`;
                }));
                aportesMensais = mesesUnicos.size;

                // Média mensal (quanto aporta por mês no total)
                mediaMensal = aportesMensais > 0 ? totalAportado / aportesMensais : avgAporte;

                // Previsão de data (baseada na cadência mensal)
                if (mediaMensal > 0 && faltam > 0) {
                    mesesRestantes = Math.ceil(faltam / mediaMensal);
                    const dataFinal = new Date();
                    dataFinal.setMonth(dataFinal.getMonth() + mesesRestantes);
                    previsaoData = `${monthNames[dataFinal.getMonth()]}/${dataFinal.getFullYear()}`;
                }
            }

            return (
            <Card key={g.id} className="rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden hover:border-blue-300 transition-all">
                <div className="p-5 pb-2">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <Target className="w-5 h-5 text-blue-500 shrink-0" />
                            <h3 className="font-bold text-blue-700 text-base truncate">{g.title}</h3>
                        </div>
                        <button onClick={() => handleDelete(g.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 shrink-0"><Trash2 className="w-4 h-4"/></button>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-2">
                        <span>R$ {formatBRL(Number(g.current_amount))}</span>
                        <span>Alvo: R$ {formatBRL(Number(g.target_amount))}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-3">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="text-center mb-1">
                        <span className="text-2xl font-black text-slate-800">{percentage.toFixed(1)}%</span>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Faltam R$ {formatBRL(faltam)}</p>
                    </div>
                </div>

                <div className="px-5 pb-5 space-y-3">
                    {/* === PAINEL DE INTELIGÊNCIA === */}
                    {history.length >= 2 && faltam > 0 && (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-3 space-y-2.5">
                            <div className="flex items-center gap-1.5">
                                <Brain className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">Previsão Inteligente</p>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                <div className="bg-white/70 rounded-lg py-2 px-1 text-center overflow-hidden">
                                    <p className="text-[11px] font-black text-indigo-700 truncate">{formatBRL(avgAporte)}</p>
                                    <p className="text-[7px] text-slate-500 font-bold uppercase leading-tight mt-0.5">Média/Aporte</p>
                                </div>
                                <div className="bg-white/70 rounded-lg py-2 px-1 text-center overflow-hidden">
                                    <p className="text-[11px] font-black text-indigo-700 truncate">{formatBRL(mediaMensal)}</p>
                                    <p className="text-[7px] text-slate-500 font-bold uppercase leading-tight mt-0.5">Média/Mês</p>
                                </div>
                                <div className="bg-white/70 rounded-lg py-2 px-1 text-center">
                                    <p className="text-[11px] font-black text-indigo-700">{history.length}</p>
                                    <p className="text-[7px] text-slate-500 font-bold uppercase leading-tight mt-0.5">Feitos</p>
                                </div>
                            </div>
                            <div className="bg-white/80 rounded-lg p-2.5 border border-indigo-100 space-y-1">
                                <p className="text-[11px] text-slate-700 text-center font-semibold">
                                    Faltam <span className="font-black text-indigo-700">~{aportesRestantes} aportes</span>
                                    {mesesRestantes > 0 && <span className="text-slate-400"> (~{mesesRestantes} {mesesRestantes === 1 ? 'mês' : 'meses'})</span>}
                                </p>
                                {previsaoData && (
                                    <p className="text-[10px] text-slate-500 text-center font-semibold">
                                        Conclusão: <span className="font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{previsaoData}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    {history.length === 1 && faltam > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
                            <p className="text-[10px] text-amber-700 font-semibold">
                                <Zap className="w-3 h-3 inline mr-1" />
                                +1 aporte para ativar a Previsão Inteligente
                            </p>
                        </div>
                    )}
                    {percentage >= 100 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                            <p className="text-sm font-black text-emerald-700">🎉 Meta Alcançada!</p>
                        </div>
                    )}

                    {/* Formulário de Aporte */}
                    {faltam > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center border border-blue-200 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-400/50">
                                <span className="text-xs text-blue-500 font-bold px-3 bg-blue-50 py-3 border-r border-blue-100">R$</span>
                                <input 
                                    value={aporteForm.goalId === g.id ? aporteForm.amount : ''} 
                                    onChange={e => setAporteForm({ goalId: g.id, amount: e.target.value })} 
                                    type="number" 
                                    step="0.01"
                                    placeholder="Ex: 500.00" 
                                    className="flex-1 text-sm p-3 outline-none bg-transparent min-w-0" 
                                />
                            </div>
                            <button 
                                onClick={() => handleAporte(g.id, g.title)} 
                                className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-xl shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Plus className="w-4 h-4" /> Fazer Aporte
                            </button>
                        </div>
                    )}

                    {/* Botão de Histórico */}
                    <button onClick={() => toggleHistory(g.id)} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2.5 rounded-xl transition-colors">
                        <History className="w-4 h-4" />
                        {isExpanded ? 'Ocultar Histórico' : 'Ver Histórico de Aportes'}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Lista de Aportes */}
                    {isExpanded && (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar border-t border-slate-100 pt-3">
                            {history.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-3">Nenhum aporte registrado para esta meta.</p>
                            )}
                            {history.map((h: any) => (
                                <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs group hover:border-blue-200 transition-colors">
                                    <div>
                                        <p className="font-semibold text-slate-700">{h.title}</p>
                                        <p className="text-slate-400 text-[10px]">{new Date(h.transaction_date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-blue-600">R$ {formatBRL(Number(h.amount))}</span>
                                        <button onClick={() => handleDeleteAporte(h.id, g.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir aporte">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {history.length > 0 && (
                                <div className="text-center pt-2 border-t border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase">
                                        Total: R$ {formatBRL(history.reduce((sum: number, h: any) => sum + Number(h.amount), 0))} em {history.length} aporte{history.length > 1 ? 's' : ''}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        )})}
      </div>
    </div>
  )
}
