/**
 * syncEngine.ts — Motor de Sincronização Offline → Online
 * 
 * Responsabilidades:
 *  - Monitorar status de conectividade (online/offline)
 *  - Quando voltar online, processar a fila do IndexedDB
 *  - Enviar cada transação pendente para a API
 *  - Remover da fila local após sucesso
 */

import {
  getPendingTransactions,
  removePendingTransaction,
  getPendingCount,
  type PendingTransaction,
} from './offlineDB';

type SyncCallback = (status: SyncStatus) => void;

export interface SyncStatus {
  isSyncing: boolean;
  syncedCount: number;
  failedCount: number;
  totalCount: number;
  lastSyncAt: number | null;
}

let syncListeners: SyncCallback[] = [];
let isSyncing = false;

/** Registrar um listener para atualizações de sync */
export function onSyncUpdate(cb: SyncCallback) {
  syncListeners.push(cb);
  return () => {
    syncListeners = syncListeners.filter(l => l !== cb);
  };
}

function notifyListeners(status: SyncStatus) {
  syncListeners.forEach(cb => cb(status));
}

/** Verificar se está online */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Processar toda a fila de transações pendentes.
 * Tenta enviar cada uma para a API. Se falhar, mantém na fila.
 */
export async function syncPendingTransactions(): Promise<SyncStatus> {
  if (isSyncing) {
    return { isSyncing: true, syncedCount: 0, failedCount: 0, totalCount: 0, lastSyncAt: null };
  }

  if (!isOnline()) {
    return { isSyncing: false, syncedCount: 0, failedCount: 0, totalCount: 0, lastSyncAt: null };
  }

  isSyncing = true;
  const pending = await getPendingTransactions();
  
  if (pending.length === 0) {
    isSyncing = false;
    return { isSyncing: false, syncedCount: 0, failedCount: 0, totalCount: 0, lastSyncAt: Date.now() };
  }

  let syncedCount = 0;
  let failedCount = 0;

  notifyListeners({
    isSyncing: true,
    syncedCount: 0,
    failedCount: 0,
    totalCount: pending.length,
    lastSyncAt: null,
  });

  // Processar em ordem FIFO (mais antigo primeiro)
  const sorted = pending.sort((a, b) => a.createdAt - b.createdAt);

  for (const tx of sorted) {
    try {
      const fetchOptions: RequestInit = {
        method: tx.method,
        headers: { 'Content-Type': 'application/json' },
      };

      // Para DELETE, os dados vão na URL query string; para POST/PUT, vão no body
      let url = tx.endpoint;
      if (tx.method === 'DELETE') {
        // payload contém o id na url
        url = tx.endpoint;
      } else {
        fetchOptions.body = JSON.stringify(tx.payload);
      }

      const res = await fetch(url, fetchOptions);

      if (res.ok) {
        await removePendingTransaction(tx.localId!);
        syncedCount++;
      } else {
        // Erro do servidor — manter na fila para retry
        console.warn(`[Sync] Falha ao sincronizar tx ${tx.localId}: status ${res.status}`);
        failedCount++;
      }
    } catch (err) {
      // Provavelmente perdeu a internet no meio do sync
      console.warn(`[Sync] Erro de rede ao sincronizar tx ${tx.localId}:`, err);
      failedCount++;
      // Parar de processar se perdeu a rede
      if (!isOnline()) break;
    }

    // Notificar progresso
    notifyListeners({
      isSyncing: true,
      syncedCount,
      failedCount,
      totalCount: sorted.length,
      lastSyncAt: null,
    });
  }

  isSyncing = false;

  const finalStatus: SyncStatus = {
    isSyncing: false,
    syncedCount,
    failedCount,
    totalCount: sorted.length,
    lastSyncAt: Date.now(),
  };

  notifyListeners(finalStatus);
  return finalStatus;
}

/**
 * Iniciar monitoramento automático de conectividade.
 * Quando o evento 'online' dispara, tenta sincronizar.
 * Retorna uma função de cleanup.
 */
export function startAutoSync(onSyncComplete?: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    console.log('[Sync] Conexão restaurada! Iniciando sincronização...');
    const result = await syncPendingTransactions();
    if (result.syncedCount > 0 && onSyncComplete) {
      onSyncComplete();
    }
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
