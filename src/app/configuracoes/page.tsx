"use client"
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, CheckCircle2, Play, Wallet, Receipt, User, Bell, Shield, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([])
  const [customCategories, setCustomCategories] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', value: '', type: 'income', category: 'Salário Líquido' })

  const fetchSettings = () => {
    fetch('/api/settings').then(res => res.json()).then(data => setSettings(data))
    fetch('/api/categories').then(res => res.json()).then(data => {
        if(Array.isArray(data)) setCustomCategories(data);
    })
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if(!form.name || !form.value) return;
    await fetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ 
        setting_name: form.name, 
        setting_value: parseFloat(form.value), 
        setting_type: form.type, 
        setting_key: form.category 
      })
    })
    setForm({ name: '', value: '', type: 'income', category: 'Salário Líquido' })
    fetchSettings()
  }

  const handleAntecipar = async (setting: any) => {
    if(!confirm(`Deseja antecipar/lançar o valor de R$ ${setting.setting_value} referente a ${setting.setting_name} agora mesmo para o Dashboard?`)) return;
    
    await fetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        title: setting.setting_name,
        amount: setting.setting_value,
        type: setting.setting_type,
        category: setting.setting_key,
        status: 'paid',
        transaction_date: new Date().toISOString().split('T')[0]
      })
    })
    alert("Lançado com sucesso!");
  }

  const incomes = settings.filter(s => s.setting_type === 'income');
  const expenses = settings.filter(s => s.setting_type === 'expense');

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Ajustes & Automação</h1>
          <p className="text-slate-500">Gerencie seu perfil, regras de recorrência e preferências do sistema.</p>
        </div>
      </div>

      {/* Seção 1: Adicionar Regra (Formato mais horizontal e contido) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
           <Wallet className="w-5 h-5 text-blue-600" />
           <h2 className="text-xl font-bold text-slate-800">Criar Nova Regra Recorrente</h2>
        </div>
        <Card className="bg-white border hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-4 items-end">
              <div className="w-full xl:w-1/6 space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Natureza</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value, category: e.target.value === 'income' ? 'Salário Líquido' : 'Utilidades'})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none">
                  <option value="income">Entrada (+)</option>
                  <option value="expense">Saída (-)</option>
                </select>
              </div>
              <div className="w-full xl:w-1/5 space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Categoria</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value, name: ''})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none">
                  {form.type === 'income' ? (
                      <>
                        <option>Salário Líquido</option>
                        <option>Vale Alimentação</option>
                        <option>Segunda Renda</option>
                      </>
                  ) : (
                      <>
                        <option value="">Grupo Principal...</option>
                        {customCategories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </>
                  )}
                </select>
              </div>
              <div className="w-full xl:w-2/5 space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Nome Específico / Subgrupo</label>
                {form.type === 'expense' ? (
                    (() => {
                        const parent = customCategories.find(c => c.type === 'expense' && c.name === form.category);
                        if(parent && parent.subcategories && parent.subcategories.length > 0) {
                            return (
                               <select required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none">
                                  <option value="">Selecione o Subgrupo...</option>
                                  {parent.subcategories.map((sub:any) => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                               </select>
                            )
                        } else {
                            return <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Sem Subgrupos Cadastrados na Categoria (Digite o Nome)" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" />
                        }
                    })()
                ) : (
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Salário Empresa X" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" />
                )}
              </div>
              <div className="w-full xl:w-1/6 space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Valor R$</label>
                <input required type="number" step="0.01" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
              <button type="submit" className="w-full xl:w-auto px-6 py-3 bg-slate-900 border border-transparent text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Seção 2: Listagem em duas colunas organizadas */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-800">Entradas Fixas (Receitas)</h2>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{incomes.length} regras</span>
          </div>
          <div className="space-y-3">
            {incomes.length === 0 && <div className="text-sm text-slate-400 p-4 border border-dashed border-slate-300 rounded-xl text-center">Nenhuma configurada.</div>}
            {incomes.map((s, i) => (
              <div key={i} className="group p-4 bg-white border border-slate-200 rounded-xl hover:border-green-300 hover:shadow-sm transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{s.setting_name}</p>
                    <p className="text-xs text-slate-500">{s.setting_key}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-bold text-green-600">R$ {Number(s.setting_value).toFixed(2)}</p>
                  <button onClick={() => handleAntecipar(s)} title="Adiantar recebimento para o mês atual" className="invisible group-hover:visible opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] uppercase font-bold text-green-700 bg-green-50 px-2 py-1 rounded transition-all hover:bg-green-100">
                    <Play className="w-3 h-3"/> Antecipar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-800">Saídas Fixas (Despesas)</h2>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{expenses.length} regras</span>
          </div>
          <div className="space-y-3">
            {expenses.length === 0 && <div className="text-sm text-slate-400 p-4 border border-dashed border-slate-300 rounded-xl text-center">Nenhuma configurada.</div>}
            {expenses.map((s, i) => (
              <div key={i} className="group p-4 bg-white border border-slate-200 rounded-xl hover:border-red-300 hover:shadow-sm transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                    <Receipt className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{s.setting_name}</p>
                    <p className="text-xs text-slate-500">{s.setting_key}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-bold text-red-600">R$ {Number(s.setting_value).toFixed(2)}</p>
                  <button onClick={() => handleAntecipar(s)} title="Pagar antecipadamente no mês atual" className="invisible group-hover:visible opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] uppercase font-bold text-red-700 bg-red-50 px-2 py-1 rounded transition-all hover:bg-red-100">
                    <Play className="w-3 h-3"/> Lançar Agora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção 3: Sugestões e Outros Ajustes (Visuais) */}
      <section className="pt-8 border-t border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Opções do Sistema</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-sm cursor-pointer transition-shadow group flex items-start gap-4">
             <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><User className="w-6 h-6" /></div>
             <div className="flex-1">
                <h3 className="font-semibold text-slate-800 text-sm mb-1">Seu Perfil</h3>
                <p className="text-xs text-slate-500 pr-2">Altere seu nome, email e defina um avatar personalizado para o seu OwlFinance.</p>
             </div>
             <ChevronRight className="w-5 h-5 text-slate-300 mt-1 group-hover:text-blue-500 transition-colors" />
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-sm cursor-pointer transition-shadow group flex items-start gap-4">
             <div className="p-3 bg-purple-50 rounded-xl text-purple-600"><Bell className="w-6 h-6" /></div>
             <div className="flex-1">
                <h3 className="font-semibold text-slate-800 text-sm mb-1 line-through opacity-70">Alertas de Meta (Em Breve)</h3>
                <p className="text-xs text-slate-500 pr-2">Receba e-mails quando você estourar o orçamento da categoria Alimentação.</p>
             </div>
             <ChevronRight className="w-5 h-5 text-slate-300 mt-1 group-hover:text-purple-500 transition-colors" />
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-sm cursor-pointer transition-shadow group flex items-start gap-4">
             <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Shield className="w-6 h-6" /></div>
             <div className="flex-1">
                <h3 className="font-semibold text-slate-800 text-sm mb-1 line-through opacity-70">Segurança & Exportação</h3>
                <p className="text-xs text-slate-500 pr-2">Faça backup dos seus dados em CSV ou ative autenticação de dois fatores.</p>
             </div>
             <ChevronRight className="w-5 h-5 text-slate-300 mt-1 group-hover:text-emerald-500 transition-colors" />
          </div>
        </div>
      </section>

    </div>
  )
}
