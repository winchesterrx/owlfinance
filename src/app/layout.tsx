import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Sidebar } from '@/components/layout/Sidebar'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'OwlFinance | Seu painel inteligente',
  description: 'Gerenciador financeiro focado em alta performance e design premium',
  manifest: '/manifest.json'
}

import { cookies } from 'next/headers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const hasToken = cookies().has('owl_session')
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-900`}>
        <div className="flex min-h-screen">
          {hasToken && <Sidebar />}
          <main className={`flex-1 w-full ${hasToken ? 'md:w-auto md:ml-64 p-4 mt-16 md:mt-0 md:p-8' : 'w-full'} relative overflow-x-hidden`}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
