'use client';

import { useEffect, useCallback, useState } from 'react';
import { actionQueue } from '@/lib/offlineStorage';
import { api } from '@/lib/api';

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncPendingActions = useCallback(async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      setSyncError(null);

      const actions = await actionQueue.getAll();

      if (actions.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(`Syncing ${actions.length} pending actions...`);

      for (const action of actions) {
        try {
          switch (action.type) {
            case 'save_history':
              await api.savePuzzleHistory(action.payload as Parameters<typeof api.savePuzzleHistory>[0]);
              break;
            // Add more action types as needed
            default:
              console.warn(`Unknown action type: ${action.type}`);
          }

          // Remove successfully synced action
          await actionQueue.remove(action.id);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          // Keep the action in the queue to retry later
        }
      }

      console.log('Sync completed');
    } catch (error) {
      console.error('Failed to sync pending actions:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    // Sync on component mount if online
    if (navigator.onLine) {
      syncPendingActions();
    }

    // Listen for reconnection events
    const handleReconnect = () => {
      console.log('Detected reconnection, syncing pending actions...');
      syncPendingActions();
    };

    window.addEventListener('app:reconnected', handleReconnect);

    return () => {
      window.removeEventListener('app:reconnected', handleReconnect);
    };
  }, [syncPendingActions]);

  return {
    isSyncing,
    syncError,
    syncPendingActions,
  };
}
