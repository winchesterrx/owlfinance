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
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="OWL Finance" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-900`}>
        <div className="flex min-h-screen">
          {hasToken && <Sidebar />}
          <main className={`flex-1 w-full ${hasToken ? 'md:w-auto md:ml-64 p-4 mt-16 md:mt-0 md:p-8' : 'w-full'} relative overflow-x-hidden`}>
            {children}
          </main>
        </div>
        {/* Registro do Service Worker para PWA */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('[PWA] Service Worker registrado:', reg.scope); })
                .catch(function(err) { console.warn('[PWA] Falha ao registrar SW:', err); });
            });
          }
        `}} />
      </body>
    </html>
  )
}
