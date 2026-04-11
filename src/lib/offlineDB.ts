/**
 * offlineDB.ts — Abstração do IndexedDB para suporte offline do OWL Finance
 * 
 * Dois object stores:
 *  1. pending_transactions — Fila de transações criadas offline aguardando sincronização
 *  2. dashboard_cache      — Cache dos dados do dashboard (último snapshot válido)
 */

const DB_NAME = 'owlfinance_offline';
const DB_VERSION = 1;

const STORE_PENDING = 'pending_transactions';
const STORE_CACHE = 'dashboard_cache';

// ─── Abrir / Criar banco ───────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // Fila de transações pendentes
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        const store = db.createObjectStore(STORE_PENDING, {
          keyPath: 'localId',
          autoIncrement: true,
        });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Cache do dashboard
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'cacheKey' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════════
//  PENDING TRANSACTIONS (Fila offline)
// ═══════════════════════════════════════════════════════════════════

export interface PendingTransaction {
  localId?: number;
  endpoint: string;        // ex: '/api/transactions'
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;             // body que seria enviado pro fetch
  createdAt: number;        // Date.now()
  description: string;      // resumo legível: "Saída: Uber R$ 25,00"
}

/** Adicionar uma transação na fila offline */
export async function addPendingTransaction(tx: Omit<PendingTransaction, 'localId'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_PENDING, 'readwrite');
    const store = txn.objectStore(STORE_PENDING);
    const request = store.add(tx);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

/** Listar todas as transações pendentes (FIFO) */
export async function getPendingTransactions(): Promise<PendingTransaction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_PENDING, 'readonly');
    const store = txn.objectStore(STORE_PENDING);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Contar pendentes */
export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_PENDING, 'readonly');
    const store = txn.objectStore(STORE_PENDING);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Remover uma transação pendente pelo localId (após sync bem-sucedido) */
export async function removePendingTransaction(localId: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_PENDING, 'readwrite');
    const store = txn.objectStore(STORE_PENDING);
    const request = store.delete(localId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Limpar toda a fila (após sync completo) */
export async function clearPendingTransactions(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_PENDING, 'readwrite');
    const store = txn.objectStore(STORE_PENDING);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD CACHE (Snapshot dos dados)
// ═══════════════════════════════════════════════════════════════════

export interface DashboardCacheEntry {
  cacheKey: string;   // ex: "dashboard_4_2026"
  data: any;          // o JSON inteiro do dashboard
  cachedAt: number;   // Date.now()
}

/** Salvar o snapshot do dashboard no cache */
export async function cacheDashboardData(month: number, year: number, data: any): Promise<void> {
  const db = await openDB();
  const cacheKey = `dashboard_${month}_${year}`;
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_CACHE, 'readwrite');
    const store = txn.objectStore(STORE_CACHE);
    const request = store.put({ cacheKey, data, cachedAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Buscar snapshot do cache */
export async function getCachedDashboard(month: number, year: number): Promise<any | null> {
  const db = await openDB();
  const cacheKey = `dashboard_${month}_${year}`;
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_CACHE, 'readonly');
    const store = txn.objectStore(STORE_CACHE);
    const request = store.get(cacheKey);
    request.onsuccess = () => {
      const result = request.result as DashboardCacheEntry | undefined;
      resolve(result ? result.data : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Limpar todo o cache */
export async function clearDashboardCache(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_CACHE, 'readwrite');
    const store = txn.objectStore(STORE_CACHE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
