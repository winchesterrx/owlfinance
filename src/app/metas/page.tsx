"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Plus, Trash2, History, ChevronDown, ChevronUp } from 'lucide-react'

// Formatação Brasileira de Moeda
const formatBRL = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MetasPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', target_amount: '', current_amount: '' })
  const [expandedGoal, setExpandedGoal] = useState<number | null>(null)
  const [goalHistory, setGoalHistory] = useState<any>({})

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals')
      const json = await res.json()
      if(Array.isArray(json)) setGoals(json)
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
            const faltam = Number(g.target_amount) - Number(g.current_amount);
            const history = goalHistory[g.id] || [];
            const isExpanded = expandedGoal === g.id;

            return (
            <Card key={g.id} className="rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden hover:border-blue-300 transition-all">
                <CardHeader className="pb-2">
                    <CardTitle className="text-blue-700 flex justify-between items-center text-lg">
                        <span className="flex items-center"><Target className="w-5 h-5 mr-2 text-blue-500" /> {g.title}</span>
                        <button onClick={() => handleDelete(g.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4"/></button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between text-xs text-slate-500 font-semibold">
                        <span>R$ {formatBRL(Number(g.current_amount))} salvos</span>
                        <span>Alvo: R$ {formatBRL(Number(g.target_amount))}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 relative overflow-hidden">
                        <div className="bg-blue-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="text-center">
                        <span className="text-2xl font-black text-slate-800">{percentage.toFixed(1)}%</span>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Faltam R$ {formatBRL(Math.max(faltam, 0))}</p>
                    </div>

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
                </CardContent>
            </Card>
        )})}
      </div>
    </div>
  )
}
