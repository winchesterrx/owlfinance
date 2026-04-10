"use client"
import { Card, CardContent } from '@/components/ui/card'
import { UploadCloud } from 'lucide-react'

export default function ImportPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Importação Inteligente</h1>
        <p className="text-slate-500">Faça o upload do seu arquivo .CSV ou .OFX do banco.</p>
      </div>

      <div className="max-w-2xl">
        <Card className="border-dashed border-2 border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer group shadow-none">
          <CardContent className="h-64 flex flex-col items-center justify-center text-center p-6">
             <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <UploadCloud className="w-8 h-8 text-blue-500" />
             </div>
             <h3 className="text-lg font-semibold text-slate-900 mb-2">Arraste e solte o seu arquivo aqui</h3>
             <p className="text-sm text-slate-500 max-w-sm">Você também pode clicar para explorar os arquivos do computador. Os lançamentos serão sugeridos na tela.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
