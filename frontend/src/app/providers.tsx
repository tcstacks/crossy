'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  const token = useGameStore((state) => state.token);

  // Sync token with API client
  useEffect(() => {
    api.setToken(token);
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
