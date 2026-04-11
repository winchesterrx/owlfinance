"use client"
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, CheckCircle2, Play, Wallet, Receipt, User, Bell, Shield, ChevronRight, Pencil, Trash2, X, Save } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([])
  const [customCategories, setCustomCategories] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', value: '', type: 'income', category: 'Salário Líquido' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', value: '', category: '' })

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

  const handleDeleteSetting = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;
    await fetch(`/api/settings?id=${id}`, { method: 'DELETE' });
    fetchSettings();
  }

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditForm({ name: s.setting_name, value: String(s.setting_value), category: s.setting_key });
  }

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', value: '', category: '' });
  }

  const handleSaveEdit = async (s: any) => {
    await fetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        id: s.id,
        setting_name: editForm.name,
        setting_value: parseFloat(editForm.value),
        setting_key: editForm.category
      })
    });
    setEditingId(null);
    fetchSettings();
  }

  const incomes = settings.filter(s => s.setting_type === 'income');
  const expenses = settings.filter(s => s.setting_type === 'expense');

  const renderSettingItem = (s: any, colorClass: string, accentColor: string) => {
    const isEditing = editingId === s.id;
    
    if (isEditing) {
      return (
        <div key={s.id} className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-600 uppercase">Editando Regra</p>
            <button onClick={cancelEdit} className="p-1 hover:bg-blue-100 rounded-lg transition-colors"><X className="w-4 h-4 text-blue-400" /></button>
          </div>
          <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Nome" className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/50" />
          <div className="flex gap-3">
            <input value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} placeholder="Categoria" className="w-1/2 p-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/50" />
            <input type="number" step="0.01" value={editForm.value} onChange={e => setEditForm({...editForm, value: e.target.value})} placeholder="Valor R$" className="w-1/2 p-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div className="flex gap-2">
            <button onClick={cancelEdit} className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 font-semibold rounded-lg text-xs hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={() => handleSaveEdit(s)} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"><Save className="w-3.5 h-3.5" /> Salvar</button>
          </div>
        </div>
      );
    }

    return (
      <div key={s.id} className={`group p-4 bg-white border border-slate-200 rounded-xl hover:border-${accentColor}-300 hover:shadow-sm transition-all flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-${accentColor}-50 flex items-center justify-center border border-${accentColor}-100`}>
            {s.setting_type === 'income' ? <CheckCircle2 className={`w-5 h-5 text-${accentColor}-500`} /> : <Receipt className={`w-5 h-5 text-${accentColor}-500`} />}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{s.setting_name}</p>
            <p className="text-xs text-slate-500">{s.setting_key}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className={`font-bold text-${accentColor}-600`}>R$ {Number(s.setting_value).toFixed(2)}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => handleAntecipar(s)} title="Lançar agora" className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 hover:text-green-700 bg-slate-50 hover:bg-green-50 px-2 py-1 rounded transition-all">
              <Play className="w-3 h-3"/>
            </button>
            <button onClick={() => startEdit(s)} title="Editar" className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
              <Pencil className="w-3.5 h-3.5"/>
            </button>
            <button onClick={() => handleDeleteSetting(s.id)} title="Excluir" className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Ajustes {'&'} Automação</h1>
          <p className="text-slate-500">Gerencie seu perfil, regras de recorrência e preferências do sistema.</p>
        </div>
      </div>

      {/* Seção 1: Adicionar Regra */}
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

      {/* Seção 2: Listagem */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-800">Entradas Fixas (Receitas)</h2>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{incomes.length} regras</span>
          </div>
          <div className="space-y-3">
            {incomes.length === 0 && <div className="text-sm text-slate-400 p-4 border border-dashed border-slate-300 rounded-xl text-center">Nenhuma configurada.</div>}
            {incomes.map(s => renderSettingItem(s, 'green', 'green'))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-800">Saídas Fixas (Despesas)</h2>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{expenses.length} regras</span>
          </div>
          <div className="space-y-3">
            {expenses.length === 0 && <div className="text-sm text-slate-400 p-4 border border-dashed border-slate-300 rounded-xl text-center">Nenhuma configurada.</div>}
            {expenses.map(s => renderSettingItem(s, 'red', 'red'))}
          </div>
        </div>
      </section>

      {/* Seção 3: Opções do Sistema */}
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

          <div className="md:col-span-2 p-5 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="z-10 flex-1">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">📱 Instale no seu Celular (App Nativo)</h3>
                <p className="text-sm text-blue-100 opacity-90 leading-relaxed mb-4">
                   O OwlFinance foi projetado como um PWA (Progressive Web App). Isso significa que você pode instalá-lo como um aplicativo real de celular direto da sua tela inicial:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                   <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm">
                      <strong className="block text-white mb-1">Para iPhone (Safari)</strong>
                      1. Toque no ícone de &quot;Compartilhar&quot; (quadrado com seta pra cima).<br/>
                      2. Role para baixo e toque em &quot;Adicionar à Tela de Início&quot;.
                   </div>
                   <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm">
                      <strong className="block text-white mb-1">Para Android (Chrome)</strong>
                      1. Toque nos &quot;3 pontinhos&quot; no canto superior direito.<br/>
                      2. Toque em &quot;Adicionar à Tela Inicial&quot; ou &quot;Instalar Aplicativo&quot;.
                   </div>
                </div>
             </div>
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
                <h3 className="font-semibold text-slate-800 text-sm mb-1 line-through opacity-70">Segurança {'&'} Exportação</h3>
                <p className="text-xs text-slate-500 pr-2">Faça backup dos seus dados em CSV ou ative autenticação de dois fatores.</p>
             </div>
             <ChevronRight className="w-5 h-5 text-slate-300 mt-1 group-hover:text-emerald-500 transition-colors" />
          </div>
        </div>
      </section>

    </div>
  )
}
