"use client"
import { useEffect, useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Shield, Zap, AlertTriangle,
  Calculator, Send, Bot, User, Loader2, Sparkles, PiggyBank, Building2,
  Landmark, BadgePercent, Coins, ArrowUpRight, ArrowDownRight, RefreshCw, Info
} from 'lucide-react'

const formatBRL = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const formatCrypto = (value: number) => {
  if (value >= 1000) return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export default function InvestimentosPage() {
  const [marketData, setMarketData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Simulador
  const [desiredIncome, setDesiredIncome] = useState('')
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('conservative')
  const [simResults, setSimResults] = useState<any[]>([])

  // Chat IA
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [aiError, setAiError] = useState<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const fetchMarketData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/investments', { cache: 'no-store' });
      const json = await res.json();
      if (!json.error) setMarketData(json);
    } catch (err) {
      console.error('[Investments] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchMarketData();
    // Auto-refresh a cada 5 minutos
    const interval = setInterval(() => fetchMarketData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages])

  // ═══ SIMULAÇÃO ═══════════════════════════════════════════════
  const runSimulation = () => {
    const monthlyTarget = parseFloat(desiredIncome);
    if (!monthlyTarget || monthlyTarget <= 0 || !marketData) return;

    const selic = marketData.rates.selicAnual / 100;
    const cdi = marketData.rates.cdiAnual / 100;
    const poupancaAnual = marketData.rates.poupancaAnual / 100;

    const results = [];

    // 1. Tesouro SELIC (IR 15% para >720 dias)
    const tesouroNetAnual = selic * (1 - 0.15);
    const tesouroNetMensal = tesouroNetAnual / 12;
    const tesouroPrincipal = monthlyTarget / tesouroNetMensal;
    results.push({
      name: 'Tesouro SELIC',
      icon: Landmark,
      principal: tesouroPrincipal,
      monthlyYield: tesouroNetMensal * 100,
      annualYield: tesouroNetAnual * 100,
      risk: 'Muito Baixo',
      riskLevel: 1,
      taxFree: false,
      irRate: 15,
      color: 'emerald',
      description: 'Renda fixa do governo federal. Liquidez diária.',
      suitable: ['conservative', 'moderate', 'aggressive'],
    });

    // 2. CDB 100% CDI (IR 15%)
    const cdbNetAnual = cdi * (1 - 0.15);
    const cdbNetMensal = cdbNetAnual / 12;
    const cdbPrincipal = monthlyTarget / cdbNetMensal;
    results.push({
      name: 'CDB 100% CDI',
      icon: Building2,
      principal: cdbPrincipal,
      monthlyYield: cdbNetMensal * 100,
      annualYield: cdbNetAnual * 100,
      risk: 'Baixo',
      riskLevel: 1,
      taxFree: false,
      irRate: 15,
      color: 'blue',
      description: 'Renda fixa bancária com proteção do FGC.',
      suitable: ['conservative', 'moderate', 'aggressive'],
    });

    // 3. LCI/LCA 90% CDI (Isento de IR)
    const lciAnual = cdi * 0.90;
    const lciMensal = lciAnual / 12;
    const lciPrincipal = monthlyTarget / lciMensal;
    results.push({
      name: 'LCI/LCA 90% CDI',
      icon: BadgePercent,
      principal: lciPrincipal,
      monthlyYield: lciMensal * 100,
      annualYield: lciAnual * 100,
      risk: 'Baixo',
      riskLevel: 1,
      taxFree: true,
      irRate: 0,
      color: 'teal',
      description: 'Isento de IR. Proteção do FGC. Carência de 90 dias.',
      suitable: ['conservative', 'moderate', 'aggressive'],
    });

    // 4. Poupança (Isenta)
    const poupMensal = poupancaAnual / 12;
    const poupPrincipal = monthlyTarget / poupMensal;
    results.push({
      name: 'Poupança',
      icon: PiggyBank,
      principal: poupPrincipal,
      monthlyYield: poupMensal * 100,
      annualYield: poupancaAnual * 100,
      risk: 'Muito Baixo',
      riskLevel: 0,
      taxFree: true,
      irRate: 0,
      color: 'orange',
      description: 'Isenta de IR. Liquidez imediata. Menor rendimento.',
      suitable: ['conservative'],
    });

    // 5. FIIs (Fundos Imobiliários)
    const fiiMensal = 0.0085; // ~0.85% ao mês (média do IFIX)
    const fiiPrincipal = monthlyTarget / fiiMensal;
    results.push({
      name: 'FIIs (Imobiliários)',
      icon: Building2,
      principal: fiiPrincipal,
      monthlyYield: fiiMensal * 100,
      annualYield: fiiMensal * 12 * 100,
      risk: 'Moderado',
      riskLevel: 2,
      taxFree: true,
      irRate: 0,
      color: 'violet',
      description: 'Dividendos isentos de IR. Renda mensal. Risco de mercado.',
      suitable: ['moderate', 'aggressive'],
    });

    // 6. Ações Dividendos
    const divAnual = 0.07; // ~7% dividend yield anual
    const divMensal = divAnual / 12;
    const divPrincipal = monthlyTarget / divMensal;
    results.push({
      name: 'Ações (Dividendos)',
      icon: TrendingUp,
      principal: divPrincipal,
      monthlyYield: divMensal * 100,
      annualYield: divAnual * 100,
      risk: 'Alto',
      riskLevel: 3,
      taxFree: false,
      irRate: 15,
      color: 'rose',
      description: 'Renda variável. Dividendos isentos mas ganho de capital tributado.',
      suitable: ['aggressive'],
    });

    // Filtrar por perfil de risco
    const filtered = results.filter(r => r.suitable.includes(riskProfile));
    setSimResults(filtered.sort((a, b) => a.principal - b.principal));
  }

  useEffect(() => {
    if (desiredIncome && marketData) runSimulation();
  }, [desiredIncome, riskProfile, marketData])

  // ═══ CHAT IA ═══════════════════════════════════════════════════
  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    setAiError(null);

    try {
      const marketContext = marketData ? `
SELIC: ${marketData.indicators.selic.value}% a.a.
CDI: ${marketData.indicators.cdi.value}% a.a.
IPCA: ${marketData.indicators.ipca.value}% no mês
Dólar: R$ ${marketData.indicators.dolar.value}
Bitcoin: R$ ${marketData.crypto?.bitcoin?.price ? formatBRL(marketData.crypto.bitcoin.price) : 'N/A'}
Ethereum: R$ ${marketData.crypto?.ethereum?.price ? formatBRL(marketData.crypto.ethereum.price) : 'N/A'}
Poupança: ~${marketData.rates.poupancaAnual}% a.a.
      `.trim() : '';

      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput, marketContext })
      });
      const json = await res.json();

      if (json.setup || json.error) {
        setAiError(json);
        const errorMsg: ChatMessage = {
          role: 'system',
          content: json.message || json.error || 'Erro desconhecido',
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, errorMsg]);
      } else {
        const aiMsg: ChatMessage = { role: 'assistant', content: json.response, timestamp: Date.now() };
        setChatMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = { role: 'system', content: 'Falha na conexão com o assistente.', timestamp: Date.now() };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  }

  // ═══ RENDER ═══════════════════════════════════════════════════
  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 animate-pulse">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
        <TrendingUp className="w-8 h-8 text-white" />
      </div>
      <p className="text-slate-400 font-medium">Conectando aos mercados...</p>
    </div>
  )

  const indicators = marketData?.indicators || {};
  const crypto = marketData?.crypto || null;

  const quickQuestions = [
    'Quero R$100 de renda passiva mensal, o que fazer?',
    'Qual investimento mais seguro hoje?',
    'Tesouro SELIC ou CDB, qual é melhor?',
    'Com minha renda atual, quanto posso investir por mês?',
    'FIIs são bons pra renda passiva?',
    'Como montar uma reserva de emergência?',
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-700">

      {/* ═══ HEADER ═══ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-900 via-orange-950 to-yellow-900 p-8 md:p-10 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTEwIDEwaDQwdjQwSDEweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=')] opacity-60" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Investimentos</h1>
                <p className="text-amber-300/80 text-sm font-medium">Simulador + Cotações ao Vivo + Assistente IA</p>
              </div>
            </div>
          </div>
          <button onClick={() => fetchMarketData(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/10 transition-colors self-start">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar Cotações'}
          </button>
        </div>
        <div className="absolute -right-10 -top-10 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      {/* ═══ INDICADORES DO MERCADO ═══ */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-blue-500" /> Indicadores Econômicos
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(indicators).map((ind: any, i: number) => (
            <Card key={i} className="group p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{ind.label}</p>
                <p className="text-xl md:text-2xl font-black text-slate-800">
                  {ind.label === 'Dólar PTAX' ? 'R$ ' : ''}{typeof ind.value === 'number' ? ind.value.toFixed(2) : ind.value}{ind.label !== 'Dólar PTAX' ? ind.suffix : ''}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{ind.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ═══ CRYPTO ═══ */}
      {crypto && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" /> Criptomoedas
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.values(crypto).map((coin: any, i: number) => (
              <Card key={i} className="p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{coin.symbol}</span>
                    <span className="text-xs font-medium text-slate-500 hidden md:inline">{coin.name}</span>
                  </div>
                  {coin.change24h !== 0 && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${coin.change24h >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                      {coin.change24h >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                      {Math.abs(coin.change24h).toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-lg md:text-xl font-black text-slate-800">R$ {formatCrypto(coin.price)}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Variação 24h</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SIMULADOR DE RENDA PASSIVA ═══ */}
      <Card className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 p-6 border-b border-emerald-100">
          <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
            <Calculator className="w-6 h-6" /> Simulador de Renda Passiva
          </h2>
          <p className="text-sm text-emerald-700/70 mt-1">Descubra quanto você precisa investir para gerar a renda mensal que deseja</p>
        </div>
        <div className="p-6">
          {/* Inputs */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Quanto quer receber por mês?</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-sm">R$</span>
                <input
                  type="number"
                  value={desiredIncome}
                  onChange={e => setDesiredIncome(e.target.value)}
                  placeholder="Ex: 100, 500, 1000..."
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-emerald-200 rounded-xl text-lg font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                />
              </div>
            </div>
            <div className="md:w-80">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Perfil de Risco</label>
              <div className="flex bg-white border-2 border-slate-200 rounded-xl overflow-hidden h-[58px]">
                <button onClick={() => setRiskProfile('conservative')} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${riskProfile === 'conservative' ? 'bg-emerald-600 text-white shadow-inner' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <Shield className="w-3.5 h-3.5" /> Conservador
                </button>
                <button onClick={() => setRiskProfile('moderate')} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold transition-all border-l border-r border-slate-200 ${riskProfile === 'moderate' ? 'bg-blue-600 text-white shadow-inner' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <Zap className="w-3.5 h-3.5" /> Moderado
                </button>
                <button onClick={() => setRiskProfile('aggressive')} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${riskProfile === 'aggressive' ? 'bg-rose-600 text-white shadow-inner' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <TrendingUp className="w-3.5 h-3.5" /> Arrojado
                </button>
              </div>
            </div>
          </div>

          {/* Resultados */}
          {simResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold text-slate-600">
                  Para receber <span className="text-emerald-600">R$ {formatBRL(parseFloat(desiredIncome))}/mês</span>, você precisa investir:
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {simResults.map((r, i) => {
                  const Icon = r.icon;
                  const colorMap: any = {
                    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
                    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100', badge: 'bg-blue-100 text-blue-700' },
                    teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', iconBg: 'bg-teal-100', badge: 'bg-teal-100 text-teal-700' },
                    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconBg: 'bg-orange-100', badge: 'bg-orange-100 text-orange-700' },
                    violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-100', badge: 'bg-violet-100 text-violet-700' },
                    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', iconBg: 'bg-rose-100', badge: 'bg-rose-100 text-rose-700' },
                  };
                  const c = colorMap[r.color] || colorMap.blue;
                  
                  return (
                    <Card key={i} className={`p-5 rounded-2xl border-2 ${c.border} ${c.bg} shadow-sm hover:shadow-md transition-all relative overflow-hidden group`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${c.text}`} />
                          </div>
                          <div>
                            <h4 className={`font-bold text-sm ${c.text}`}>{r.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.badge}`}>
                                {r.risk}
                              </span>
                              {r.taxFree && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                  Isento IR
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Investimento necessário</p>
                        <p className="text-2xl font-black text-slate-800">R$ {formatBRL(r.principal)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-white/60 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Rend. Mensal</p>
                          <p className={`text-sm font-black ${c.text}`}>{r.monthlyYield.toFixed(2)}%</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Rend. Anual</p>
                          <p className={`text-sm font-black ${c.text}`}>{r.annualYield.toFixed(2)}%</p>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-relaxed">{r.description}</p>
                      {!r.taxFree && (
                        <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
                          <Info className="w-2.5 h-2.5" /> IR regressivo: {r.irRate}% (após 2 anos)
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  <strong>Aviso:</strong> Os cálculos são estimativas baseadas em taxas atuais. Rendimentos passados não garantem retornos futuros. 
                  FIIs e ações possuem risco de mercado. Consulte um assessor de investimentos para decisões personalizadas.
                </p>
              </div>
            </div>
          )}

          {!desiredIncome && (
            <div className="py-8 text-center">
              <DollarSign className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Digite acima o valor de renda mensal que você deseja receber</p>
              <p className="text-xs text-slate-300 mt-1">O simulador calculará quanto investir em cada tipo de ativo</p>
            </div>
          )}
        </div>
      </Card>

      {/* ═══ ASSISTENTE IA ═══ */}
      <Card className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-violet-900 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-60" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                OWL Advisor <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-purple-300/80 text-sm font-medium">Assistente financeiro inteligente com IA</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-5 space-y-4 bg-slate-50/50 custom-scrollbar">
          {chatMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="font-bold text-slate-700 mb-1">Olá! Sou o OWL Advisor 🦉</h3>
              <p className="text-sm text-slate-400 mb-6 max-w-md">
                Pergunte qualquer coisa sobre investimentos, renda passiva, ou planejamento financeiro. 
                Tenho acesso aos seus dados financeiros e cotações em tempo real.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setChatInput(q); }}
                    className="text-left px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 font-medium hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role !== 'user' && (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-indigo-100' : 'bg-amber-100'}`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-indigo-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-md' 
                  : msg.role === 'assistant'
                    ? 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
                    : 'bg-amber-50 border border-amber-200 text-amber-800 rounded-bl-md'
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className={`text-[9px] mt-1.5 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-300'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
              )}
            </div>
          ))}

          {chatLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  <span className="text-sm text-slate-400">Analisando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Pergunte sobre investimentos, renda passiva, planejamento..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-all"
              disabled={chatLoading}
            />
            <button
              onClick={sendMessage}
              disabled={chatLoading || !chatInput.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl transition-colors flex items-center gap-2 font-bold text-sm shadow-sm"
            >
              {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Powered by Google Gemini AI · Dados do Banco Central & CoinGecko · Não constitui recomendação de investimento
          </p>
        </div>
      </Card>

    </div>
  )
}
