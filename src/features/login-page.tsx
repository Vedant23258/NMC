import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { navItems } from '@/app/router/route-config';
import { useAuth } from '@/core/auth/auth-hooks';
import { appEnv } from '@/core/config/env';
import { hasCapability } from '@/core/rbac/capability-map';
import { roles, type Role } from '@/core/types/domain';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { titleCase } from '@/shared/utils/format';

const roleDescriptions: Record<Role, string> = {
  ccc_operator: 'Dispatch-focused operational access across wards.',
  ccc_shift_supervisor: 'Shift handover, oversight, and end-of-shift CCC summary.',
  sanitary_inspector: 'Verification, field oversight, and enforcement visibility.',
  additional_commissioner: 'City overview, grievance ageing, directives, and MAUD approval.',
  commissioner: 'Full read access, MAUD sign-off, and download of approved compliance reports.',
  municipal_health_officer: 'Health-risk zone monitoring and NGT/legacy-waste compliance.',
  mis_gis_analyst: 'Anomaly review, GIS layer management, MAUD report builder, forecasting.',
  system_administrator: 'User & role management, system health, configuration, audit log.',
};

const GatewayLoginForm = () => {
  const { loginWithPassword, status, lastError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Card title="Sign in">
      <p className="muted">
        Use the email and password set up for your account. If you don't have one yet, ask your
        System Administrator to invite you.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void loginWithPassword(email, password);
        }}
      >
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <Button type="submit" disabled={status === 'authenticating'}>
          {status === 'authenticating' ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      {lastError ? (
        <div className="banner banner-error" role="alert">
          <span>{lastError}</span>
          <button onClick={clearError} aria-label="Dismiss sign-in error">
            x
          </button>
        </div>
      ) : null}
    </Card>
  );
};

const MockRolePicker = () => {
  const { loginWithRole, status } = useAuth();
  return (
    <div className="login-grid">
      {roles.map((role) => (
        <Card key={role} title={titleCase(role)}>
          <p className="muted">{roleDescriptions[role]}</p>
          <Button onClick={() => void loginWithRole(role)} disabled={status === 'authenticating'}>
            {status === 'authenticating' ? 'Signing in...' : 'Continue'}
          </Button>
        </Card>
      ))}
    </div>
  );
};

export const LoginPage = () => {
  const { status, lastError, clearError, currentUser } = useAuth();
  const isGateway = appEnv.apiMode === 'gateway';

  if (status === 'authenticated') {
    const firstAccessible = navItems.find((item) => hasCapability(currentUser?.role, item.capability));
    return <Navigate to={firstAccessible?.to ?? '/notifications'} replace />;
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <p className="eyebrow">NMC Smart Sanitation Governance System</p>
        <h1>Web Dashboard Access</h1>
        <p>
          {isGateway
            ? 'Sign in with your NMC platform account.'
            : 'Development authentication is enabled. Select the dashboard role you want to simulate while the government identity service is not yet connected.'}
        </p>
        {!isGateway && lastError ? (
          <div className="banner banner-error" role="alert">
            <span>{lastError}</span>
            <button onClick={clearError} aria-label="Dismiss sign-in error">
              x
            </button>
          </div>
        ) : null}
        {isGateway ? <GatewayLoginForm /> : <MockRolePicker />}
      </div>
    </div>
  );
};
