"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Plus, Trash2 } from 'lucide-react'

export default function MetasPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', target_amount: '', current_amount: '' })

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
            return (
            <Card key={g.id} className="rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
                <CardHeader className="pb-2">
                    <CardTitle className="text-blue-700 flex justify-between items-center text-lg">
                        <span className="flex items-center"><Target className="w-5 h-5 mr-2 text-blue-500" /> {g.title}</span>
                        <button onClick={() => handleDelete(g.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between text-xs text-slate-500 mb-2 font-semibold">
                        <span>R$ {Number(g.current_amount).toFixed(2)} salvos</span>
                        <span>Alvo: R$ {Number(g.target_amount).toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 relative overflow-hidden">
                        <div className="bg-blue-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="mt-4 text-center">
                        <span className="text-2xl font-black text-slate-800">{percentage.toFixed(1)}%</span>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Faltam R$ {(Number(g.target_amount) - Number(g.current_amount)).toFixed(2)}</p>
                    </div>
                </CardContent>
            </Card>
        )})}
      </div>
    </div>
  )
}
