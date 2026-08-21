import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { appEnv } from '@/core/config/env';

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const QueryProvider = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>
    {children}
    {appEnv.enableDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
  </QueryClientProvider>
);
