"use client"
import { useState } from 'react'
import { Wallet, UserPlus } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        })

        const data = await res.json()
        if(!res.ok) {
            setError(data.error || 'Erro ao realizar cadastro')
            setLoading(false)
            return;
        }

        window.location.href = '/'
    }

    return (
        <div className="min-h-screen -m-4 md:-m-8 bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="flex items-center justify-center gap-3 mb-10">
                    <Wallet className="w-10 h-10 text-blue-600" />
                    <h1 className="text-3xl font-bold tracking-widest text-slate-900">OWL<span className="text-blue-600">FINANCE</span></h1>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Criar nova conta</h2>

                    {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium border border-red-100">{error}</div>}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Seu Nome</label>
                            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Senha Segura</label>
                            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50" />
                        </div>

                        <button disabled={loading} type="submit" className="w-full py-3 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors flex justify-center items-center gap-2 mt-4">
                            {loading ? 'Criando...' : <><UserPlus className="w-5 h-5"/> Criar Conta Livre</>}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        Já tem uma conta? <Link href="/login" className="text-blue-600 font-bold hover:underline">Faça login</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
