import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CapabilityGate, ProtectedRoute } from '@/app/router/guards';
import { useAuthStore } from '@/core/auth/auth-store';
import { ComplaintsPage } from '@/features/complaints/page';
import { DashboardPage } from '@/features/live-dashboard/page';
import { LoginPage } from '@/features/login-page';
import { ReportsPage } from '@/features/reporting/page';
import { WeighbridgePage } from '@/features/weighbridge/page';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
  act(() => {
    useAuthStore.setState({
      token: null,
      currentUser: null,
      status: 'anonymous',
      lastError: undefined,
    });
  });
});
afterAll(() => server.close());

describe('authentication flows', () => {
  it('logs in, restores session, and logs out', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getAllByRole('button', { name: /continue/i })[0]);
    await waitFor(() => expect(useAuthStore.getState().status).toBe('authenticated'));
    expect(useAuthStore.getState().token).toBeTruthy();

    useAuthStore.setState({ token: null, currentUser: null, status: 'anonymous' });
    await act(async () => {
      await useAuthStore.getState().restore();
    });
    expect(useAuthStore.getState().currentUser?.role).toBe('ccc_operator');

    await act(async () => {
      await useAuthStore.getState().logout();
    });
    expect(useAuthStore.getState().status).toBe('anonymous');
  });
});

describe('route and permission protection', () => {
  it('redirects anonymous users from protected routes', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login target</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/secure" element={<div>Secure content</div>} />
        </Route>
      </Routes>,
      { route: '/secure' },
    );

    expect(await screen.findByText('Login target')).toBeInTheDocument();
  });

  it('blocks capability-gated content for insufficient roles', () => {
    act(() => {
      useAuthStore.setState({
        token: 'token-ccc_operator',
        status: 'authenticated',
        currentUser: {
          id: 'user-ccc-1',
          name: 'Aparna S.',
          role: 'ccc_operator',
          wardScope: ['ward-16'],
          title: 'CCC Operator',
          requiresSecondFactor: false,
        },
      });
    });

    renderWithProviders(
      <CapabilityGate capability="view_reports">
        <div>Secret reports</div>
      </CapabilityGate>,
    );

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });
});

describe('module rendering', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({
        token: 'token-commissioner',
        status: 'authenticated',
        currentUser: {
          id: 'user-commissioner-1',
          name: 'Dr. Meera Iyer',
          role: 'commissioner',
          wardScope: ['all'],
          title: 'Municipal Commissioner',
          requiresSecondFactor: true,
        },
      });
    });
  });

  it('renders the dashboard module', async () => {
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByRole('heading', { name: /live operations dashboard/i })).toBeInTheDocument();
    expect(await screen.findByText('Pending SLA focus items')).toBeInTheDocument();
  });

  it('renders complaint detail workspace', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ComplaintsPage />);
    await user.click(await screen.findByText('NMC-C-240816-001'));
    expect(await screen.findByText(/complaint detail/i)).toBeInTheDocument();
  });

  it('renders the weighbridge module', async () => {
    renderWithProviders(<WeighbridgePage />);
    expect(await screen.findByText(/allipuram weighbridge/i)).toBeInTheDocument();
  });

  it('supports the commissioner sign-off flow', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsPage />);
    await user.click((await screen.findAllByRole('button', { name: /commissioner sign-off/i }))[0]);
    await user.type(screen.getByLabelText(/verification code/i), '240816');
    await user.click(screen.getByRole('button', { name: /confirm sign-off/i }));
    expect(await screen.findByText(/recorded for rep-001/i)).toBeInTheDocument();
  });
});
