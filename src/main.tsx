import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryProvider } from '@/app/providers/query-provider';
import { AppRouter } from '@/app/router/router';
import { AppErrorBoundary } from '@/core/errors/app-error-boundary';
import { useAuthStore } from '@/core/auth/auth-store';
import { appEnv } from '@/core/config/env';
import '@/styles.css';

const RELOAD_FLAG = 'nmc-msw-reload';

const bootstrap = async () => {
  if (appEnv.apiMode === 'mock') {
    const { worker } = await import('@/mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });

    // On a service worker's very first install, this page load is not yet
    // "controlled" by it, so requests would bypass the mocks entirely.
    // Reload once so the freshly-activated worker takes over.
    if (!navigator.serviceWorker.controller && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
      return;
    }
    sessionStorage.removeItem(RELOAD_FLAG);
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
