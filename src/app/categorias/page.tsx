"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderTree, Plus, Trash2, Tag, ChevronDown, AlignLeft } from 'lucide-react'

export default function CategoriasPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [catForm, setCatForm] = useState({ name: '', type: 'expense', color: '#3b82f6' })
  const [subForm, setSubForm] = useState({ name: '', category_id: null as number | null })

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const json = await res.json()
      if (Array.isArray(json)) setCategories(json)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catForm.name) return

    await fetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ action: 'create_category', ...catForm })
    })

    setCatForm({ name: '', type: 'expense', color: '#3b82f6' })
    fetchCategories()
  }

  const handleCreateSubcategory = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault()
    if (!subForm.name || subForm.category_id !== parentId) return

    await fetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ action: 'create_subcategory', category_id: parentId, name: subForm.name })
    })

    setSubForm({ name: '', category_id: null })
    fetchCategories()
  }

  const handleDeleteCategory = async (id: number) => {
      if(!confirm("Atenção: Ao excluir este Grupo Principal, todos os Subgrupos atrelados a ele também serão excluídos. (Lançamentos passados manterão o nome original). Deseja prosseguir?")) return;
      await fetch(`/api/categories?action=delete_category&id=${id}`, { method: 'DELETE' })
      fetchCategories()
  }

  const handleDeleteSubcategory = async (id: number) => {
      await fetch(`/api/categories?action=delete_subcategory&id=${id}`, { method: 'DELETE' })
      fetchCategories()
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 flex items-center gap-3"><FolderTree className="w-8 h-8 text-blue-600"/> Árvore de Categorias</h1>
        <p className="text-slate-500">Crie Grupos e Subgrupos para categorizar cada detalhe do seu extrato.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Create Category */}
          <Card className="p-6 rounded-2xl border border-slate-200 shadow-sm bg-white lg:col-span-1 h-fit sticky top-6">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500"/> Novo Grupo Principal</h2>
              <form onSubmit={handleCreateCategory} className="flex flex-col gap-4">
                  {/* Tipo Fixo */}
                  <input type="hidden" value={catForm.type} />
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Grupo</label>
                      <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Ex: Assinaturas" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50" />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Etiqueta de Cor</label>
                      <div className="flex gap-2">
                         <input type="color" value={catForm.color} onChange={e => setCatForm({...catForm, color: e.target.value})} className="h-12 w-16 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer" />
                         <div className="flex-1 border border-slate-200 rounded-xl flex items-center justify-center font-semibold text-sm" style={{ backgroundColor: catForm.color || '#fff', color: '#fff', textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>Cores Puxam Atenção</div>
                      </div>
                  </div>
                  <button type="submit" className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm font-bold flex justify-center items-center gap-2 transition-colors mt-2">
                      <Tag className="w-4 h-4"/> Criar Grupo Raiz
                  </button>
              </form>
          </Card>

          {/* List Categories */}
          <div className="lg:col-span-2 space-y-6">
              {categories.length === 0 && (
                  <div className="w-full p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-500 font-medium">
                      O seu dicionário financeiro está vazio! Crie o seu primeiro Grupo Principal ao lado.
                  </div>
              )}
              {categories.map((cat: any) => (
                  <Card key={cat.id} className="rounded-2xl border-2 shadow-sm overflow-hidden bg-white" style={{ borderColor: cat.color + '40' }}>
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: cat.color }}></div>
                          <div className="flex items-center gap-3 pl-3">
                              <span className="text-xl">📉</span>
                              <h3 className="font-bold text-slate-800 text-lg">{cat.name}</h3>
                          </div>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
                      </div>
                      
                      <div className="p-5">
                          <div className="space-y-3 mb-4">
                              {cat.subcategories.length === 0 && <p className="text-sm text-slate-400 italic flex items-center gap-2"><ChevronDown className="w-4 h-4"/> Nenhum sub-grupo cadastrado sob {cat.name}.</p>}
                              {cat.subcategories.map((sub: any) => (
                                  <div key={sub.id} className="flex justify-between items-center p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-slate-300 transition-colors">
                                      <span className="text-sm font-semibold text-slate-600 flex items-center gap-2"><AlignLeft className="w-4 h-4 text-slate-400"/> {sub.name}</span>
                                      <button onClick={() => handleDeleteSubcategory(sub.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                              ))}
                          </div>
                          
                          {/* Inline Subcategory Form */}
                          <form onSubmit={(e) => handleCreateSubcategory(e, cat.id)} className="flex gap-2">
                             <input 
                                value={subForm.category_id === cat.id ? subForm.name : ''} 
                                onChange={e => setSubForm({ category_id: cat.id, name: e.target.value })} 
                                placeholder="Criar novo sub-grupo (Ex: Netflix)" 
                                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2" 
                             />
                             <button type="submit" className="px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">+</button>
                          </form>
                      </div>
                  </Card>
              ))}
          </div>
      </div>
    </div>
  )
}
