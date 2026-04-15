import { NextResponse } from 'next/server';

// ═══ ENDPOINTS PÚBLICOS (SEM API KEY) ═══════════════════════════
const BCB_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';
const COINGECKO = 'https://api.coingecko.com/api/v3';

// Séries do Banco Central do Brasil
const BCB_SERIES = {
  selic: 432,      // Taxa SELIC Meta (% a.a.)
  cdi: 4389,       // CDI acumulado no mês (% a.m.)
  ipca: 433,       // IPCA (% mensal)
  dolar: 1,        // Dólar PTAX Compra
  poupanca: 25,    // Rendimento Poupança (% a.m.)
};

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { 
      signal: controller.signal, 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(id);
    return null;
  }
}

export async function GET() {
  try {
    // Buscar tudo em paralelo
    const [selicData, cdiData, ipcaData, dolarData, poupancaData, cryptoData] = await Promise.allSettled([
      fetchWithTimeout(`${BCB_BASE}.${BCB_SERIES.selic}/dados/ultimos/1?formato=json`),
      fetchWithTimeout(`${BCB_BASE}.${BCB_SERIES.cdi}/dados/ultimos/1?formato=json`),
      fetchWithTimeout(`${BCB_BASE}.${BCB_SERIES.ipca}/dados/ultimos/1?formato=json`),
      fetchWithTimeout(`${BCB_BASE}.${BCB_SERIES.dolar}/dados/ultimos/1?formato=json`),
      fetchWithTimeout(`${BCB_BASE}.${BCB_SERIES.poupanca}/dados/ultimos/1?formato=json`),
      fetchWithTimeout(`${COINGECKO}/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=brl&include_24hr_change=true`),
    ]);

    const extractBCB = (result: PromiseSettledResult<any>) => {
      if (result.status === 'fulfilled' && result.value && Array.isArray(result.value)) {
        const item = result.value[result.value.length - 1];
        return { value: parseFloat(item.valor), date: item.data };
      }
      return null;
    };

    const selic = extractBCB(selicData);
    const cdi = extractBCB(cdiData);
    const ipca = extractBCB(ipcaData);
    const dolar = extractBCB(dolarData);
    const poupanca = extractBCB(poupancaData);

    const crypto = cryptoData.status === 'fulfilled' && cryptoData.value ? cryptoData.value : null;

    // ═══ TAXAS ANUAIS PARA SIMULAÇÃO ═══
    // SELIC = taxa anual direta
    const selicAnual = selic?.value ?? 14.25;  // Fallback
    // CDI anualizado ≈ SELIC - 0.10
    const cdiAnual = selic ? selicAnual - 0.10 : 14.15;
    // Poupança: quando SELIC > 8.5% = 0.5%/mês + TR ≈ ~7.2%/ano
    const poupancaAnual = selicAnual > 8.5 ? 6.17 : selicAnual * 0.70;

    return NextResponse.json({
      indicators: {
        selic: { 
          value: selicAnual, 
          label: 'SELIC', 
          suffix: '% a.a.', 
          date: selic?.date,
          description: 'Taxa básica de juros'
        },
        cdi: { 
          value: cdiAnual, 
          label: 'CDI', 
          suffix: '% a.a.', 
          date: cdi?.date,
          description: 'Certificado Depósito Interbancário'
        },
        ipca: { 
          value: ipca?.value ?? 0.43, 
          label: 'IPCA', 
          suffix: '% mês', 
          date: ipca?.date,
          description: 'Inflação oficial'
        },
        dolar: { 
          value: dolar?.value ?? 5.70, 
          label: 'Dólar PTAX', 
          suffix: 'BRL', 
          date: dolar?.date,
          description: 'Cotação de referência'
        },
      },
      crypto: crypto ? {
        bitcoin: { 
          price: crypto.bitcoin?.brl ?? 0, 
          change24h: crypto.bitcoin?.brl_24h_change ?? 0,
          name: 'Bitcoin', symbol: 'BTC'
        },
        ethereum: { 
          price: crypto.ethereum?.brl ?? 0, 
          change24h: crypto.ethereum?.brl_24h_change ?? 0,
          name: 'Ethereum', symbol: 'ETH'
        },
        solana: { 
          price: crypto.solana?.brl ?? 0, 
          change24h: crypto.solana?.brl_24h_change ?? 0,
          name: 'Solana', symbol: 'SOL'
        },
        bnb: { 
          price: crypto.binancecoin?.brl ?? 0, 
          change24h: crypto.binancecoin?.brl_24h_change ?? 0,
          name: 'BNB', symbol: 'BNB'
        },
      } : null,
      rates: {
        selicAnual,
        cdiAnual,
        poupancaAnual,
        // IR Regressivo (tabela para simulação)
        irTable: [
          { period: 'Até 180 dias', rate: 22.5 },
          { period: '181 a 360 dias', rate: 20.0 },
          { period: '361 a 720 dias', rate: 17.5 },
          { period: 'Acima de 720 dias', rate: 15.0 },
        ]
      },
      fetchedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Investments API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
