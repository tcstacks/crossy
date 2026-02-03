import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ReactElement, ReactNode } from 'react';

/**
 * Creates a new QueryClient configured for testing
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface WrapperProps {
  children: ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  queryClient?: QueryClient;
  withRouter?: boolean;
  withAuth?: boolean;
  withQuery?: boolean;
}

/**
 * Creates a wrapper component with all providers
 */
const createWrapper = (options: CustomRenderOptions = {}) => {
  const {
    initialEntries = ['/'],
    queryClient = createTestQueryClient(),
    withRouter = true,
    withAuth = true,
    withQuery = true,
  } = options;

  return function Wrapper({ children }: WrapperProps) {
    let wrapped = children;

    if (withAuth) {
      wrapped = <AuthProvider>{wrapped}</AuthProvider>;
    }

    if (withQuery) {
      wrapped = <QueryClientProvider client={queryClient}>{wrapped}</QueryClientProvider>;
    }

    if (withRouter) {
      wrapped = <MemoryRouter initialEntries={initialEntries}>{wrapped}</MemoryRouter>;
    }

    return <>{wrapped}</>;
  };
};

/**
 * Renders a component with all providers (QueryClient, Router, Auth)
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } => {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const result = render(ui, {
    wrapper: createWrapper({ ...options, queryClient }),
    ...options,
  });
  return { ...result, queryClient };
};

/**
 * Renders a component with just the router
 */
export const renderWithRouter = (
  ui: ReactElement,
  options: { initialEntries?: string[] } & Omit<RenderOptions, 'wrapper'> = {}
) => {
  const { initialEntries = ['/'], ...renderOptions } = options;
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    ),
    ...renderOptions,
  });
};

/**
 * Renders a component with BrowserRouter (for tests that need actual browser history)
 */
export const renderWithBrowserRouter = (
  ui: ReactElement,
  options: Omit<RenderOptions, 'wrapper'> = {}
) => {
  return render(ui, {
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    ...options,
  });
};

/**
 * Renders a component with QueryClient only
 */
export const renderWithQuery = (
  ui: ReactElement,
  options: { queryClient?: QueryClient } & Omit<RenderOptions, 'wrapper'> = {}
) => {
  const queryClient = options.queryClient ?? createTestQueryClient();
  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
      ...options,
    }),
    queryClient,
  };
};

/**
 * Wait for a condition to be true
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> => {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

/**
 * Flush all pending promises
 */
export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create a deferred promise for testing async operations
 */
export const createDeferred = <T,>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
};

// Re-export everything from testing-library
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
