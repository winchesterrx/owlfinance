"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Target, Settings, Upload, Wallet, FolderTree, Menu, X, LogOut, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/importar', label: 'Importar', icon: Upload },
  { href: '/categorias', label: 'Categorias', icon: FolderTree },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
  }

  return (
    <>
      {/* Botão Nav Mobile Flutuante */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4 shadow-sm">
          <div className="flex items-center gap-2">
             <Wallet className="w-6 h-6 text-blue-600" />
             <h1 className="text-lg font-bold tracking-widest text-slate-900">OWL<span className="text-blue-600">FINANCE</span></h1>
          </div>
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
             {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
      </div>

      {/* Overlay Escuro para Mobile */}
      {isOpen && (
         <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity" />
      )}

      {/* Trazendo o aside verdadeiro */}
      <aside className={cn(
        "w-64 h-full bg-white border-r border-slate-200 fixed left-0 top-0 flex flex-col p-6 z-50 transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
      <div className="flex items-center gap-3 mb-10 pl-2 mt-4 md:mt-0">
        <Wallet className="w-8 h-8 text-blue-600" />
        <h1 className="text-xl font-bold tracking-widest text-slate-900">OWL<span className="text-blue-600">FINANCE</span></h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-medium",
                isActive 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      
      <div className="mt-auto pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase">
               Me
             </div>
             <div>
               <p className="text-sm font-semibold text-slate-900">Sua Conta</p>
               <p className="text-[10px] text-slate-500 truncate w-32">Configurações Ativas</p>
             </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sair da Conta">
             <LogOut className="w-5 h-5"/>
          </button>
        </div>
      </div>
    </aside>
    </>
  )
}
