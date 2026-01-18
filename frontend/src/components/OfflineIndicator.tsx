'use client';

import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const { isOffline, wasOffline, isOnline } = useOfflineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-300 ${
        isOffline
          ? 'bg-amber-500 text-white'
          : 'bg-green-500 text-white'
      }`}
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <WifiOff className="w-5 h-5" aria-hidden="true" />
          <span className="font-medium">You&apos;re offline - Playing with cached puzzles</span>
        </>
      ) : (
        <>
          <Wifi className="w-5 h-5" aria-hidden="true" />
          <span className="font-medium">Back online - Syncing data...</span>
        </>
      )}
    </div>
  );
}
