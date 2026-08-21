import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryProvider } from '@/app/providers/query-provider';
import { AppRouter } from '@/app/router/router';
import { AppErrorBoundary } from '@/core/errors/app-error-boundary';
import { useAuthStore } from '@/core/auth/auth-store';
import { appEnv } from '@/core/config/env';
import '@/styles.css';

const bootstrap = async () => {
  if (appEnv.apiMode === 'mock') {
    const { worker } = await import('@/mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
  await useAuthStore.getState().restore();
};

void bootstrap().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <QueryProvider>
          <AppRouter />
        </QueryProvider>
      </AppErrorBoundary>
    </React.StrictMode>,
  );
});
