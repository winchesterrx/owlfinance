/**
 * useOfflineSync.ts — Hook React para suporte offline
 * 
 * Fornece para os componentes:
 *  - isOnline (boolean reativo)
 *  - pendingCount (quantas transações na fila)
 *  - isSyncing (se está sincronizando agora)
 *  - submitTransaction() — envia online ou salva offline
 *  - submitDelete() — deleta online ou agenda offline
 *  - forceSync() — sincronização manual
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  addPendingTransaction,
  getPendingCount,
  cacheDashboardData,
  getCachedDashboard,
} from './offlineDB';
import {
  isOnline as checkOnline,
  syncPendingTransactions,
  startAutoSync,
  onSyncUpdate,
} from './syncEngine';

interface UseOfflineSyncOptions {
  onSyncComplete?: () => void;
}

export function useOfflineSync(options?: UseOfflineSyncOptions) {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // ─── Monitorar estado de conectividade ────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    setOnline(checkOnline());

    const handleOnline = () => {
      if (mountedRef.current) setOnline(true);
    };
    const handleOffline = () => {
      if (mountedRef.current) setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-sync setup
    const cleanupAutoSync = startAutoSync(() => {
      // Quando o sync completar, refrescar o dashboard
      refreshPendingCount();
      options?.onSyncComplete?.();
    });

    // Listener para atualizações de sync
    const cleanupSyncListener = onSyncUpdate((status) => {
      if (!mountedRef.current) return;
      setIsSyncing(status.isSyncing);
      if (!status.isSyncing && status.syncedCount > 0) {
        setSyncToast(`✅ ${status.syncedCount} registro(s) sincronizado(s)!`);
        setTimeout(() => {
          if (mountedRef.current) setSyncToast(null);
        }, 4000);
        refreshPendingCount();
      }
    });

    // Contagem inicial
    refreshPendingCount();

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanupAutoSync();
      cleanupSyncListener();
    };
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      if (mountedRef.current) setPendingCount(count);
    } catch { }
  }, []);

  // ─── Submit inteligente (online → fetch, offline → IndexedDB) ─
  const submitTransaction = useCallback(async (
    endpoint: string,
    method: 'POST' | 'PUT',
    payload: any,
    description: string
  ): Promise<{ ok: boolean; offline: boolean; data?: any }> => {
    // Tentar enviar online primeiro
    if (checkOnline()) {
      try {
        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          return { ok: true, offline: false, data };
        }
        // Se falhou (ex: 500), salvar offline como fallback
      } catch {
        // Fetch falhou (sem rede na verdade)
      }
    }

    // Salvar offline
    await addPendingTransaction({
      endpoint,
      method,
      payload,
      createdAt: Date.now(),
      description,
    });

    await refreshPendingCount();

    return { ok: true, offline: true };
  }, [refreshPendingCount]);

  // ─── Delete inteligente ──────────────────────────────────────
  const submitDelete = useCallback(async (
    endpoint: string,
    description: string
  ): Promise<{ ok: boolean; offline: boolean }> => {
    if (checkOnline()) {
      try {
        const res = await fetch(endpoint, { method: 'DELETE' });
        if (res.ok) return { ok: true, offline: false };
      } catch { }
    }

    // Salvar offline
    await addPendingTransaction({
      endpoint,
      method: 'DELETE',
      payload: null,
      createdAt: Date.now(),
      description,
    });

    await refreshPendingCount();
    return { ok: true, offline: true };
  }, [refreshPendingCount]);

  // ─── Sync manual ─────────────────────────────────────────────
  const forceSync = useCallback(async () => {
    if (!checkOnline()) {
      setSyncToast('❌ Sem conexão. Tente novamente quando tiver internet.');
      setTimeout(() => {
        if (mountedRef.current) setSyncToast(null);
      }, 3000);
      return;
    }
    const result = await syncPendingTransactions();
    await refreshPendingCount();
    if (result.syncedCount > 0) {
      options?.onSyncComplete?.();
    }
  }, [refreshPendingCount, options]);

  // ─── Cache do Dashboard ──────────────────────────────────────
  const saveDashboardCache = useCallback(async (month: number, year: number, data: any) => {
    try {
      await cacheDashboardData(month, year, data);
    } catch (err) {
      console.warn('[Cache] Erro ao salvar cache do dashboard:', err);
    }
  }, []);

  const loadDashboardCache = useCallback(async (month: number, year: number) => {
    try {
      return await getCachedDashboard(month, year);
    } catch {
      return null;
    }
  }, []);

  return {
    isOnline: online,
    pendingCount,
    isSyncing,
    syncToast,
    submitTransaction,
    submitDelete,
    forceSync,
    saveDashboardCache,
    loadDashboardCache,
    refreshPendingCount,
  };
}
