import { QueryClient, type DefaultOptions } from '@tanstack/react-query'

/**
 * Default options for TanStack Query
 *
 * Configuration:
 * - staleTime: 5 minutes - data is considered fresh for 5 minutes
 * - gcTime: 10 minutes - unused data is garbage collected after 10 minutes
 * - retry: 1 - failed queries are retried once
 * - refetchOnWindowFocus: false - don't refetch when window regains focus (game context)
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Data freshness - 5 minutes
    staleTime: 5 * 60 * 1000,

    // Cache time (formerly cacheTime) - 10 minutes
    gcTime: 10 * 60 * 1000,

    // Retry failed requests once
    retry: 1,

    // Don't refetch on window focus (not ideal for games)
    refetchOnWindowFocus: false,

    // Refetch on reconnect
    refetchOnReconnect: true,
  },
  mutations: {
    // Retry failed mutations once
    retry: 1,
  },
}

/**
 * Global QueryClient instance for TanStack Query
 */
export const queryClient = new QueryClient({
  defaultOptions,
})
