import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/auth-hooks';
import { roles, type Role } from '@/core/types/domain';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { titleCase } from '@/shared/utils/format';

export const LoginPage = () => {
  const { login, status, lastError, clearError } = useAuth();
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  return (
    <div className="login-page">
      <div className="login-panel">
        <p className="eyebrow">NMC Smart Sanitation Governance System</p>
        <h1>Web Dashboard Access</h1>
        <p>
          Development authentication is enabled. Select the dashboard role you want to
          simulate while the government identity service is not yet connected.
        </p>
        {lastError ? (
          <div className="banner banner-error" role="alert">
            <span>{lastError}</span>
            <button onClick={clearError} aria-label="Dismiss sign-in error">
              x
            </button>
          </div>
        ) : null}
        <div className="login-grid">
          {roles.map((role) => (
            <Card key={role} title={titleCase(role)}>
              <p className="muted">
                {role === 'ccc_operator' && 'Dispatch-focused operational access across wards.'}
                {role === 'sanitary_inspector' &&
                  'Verification, field oversight, and enforcement visibility.'}
                {role === 'commissioner' &&
                  'Full read access plus second-step report sign-off flow.'}
              </p>
              <Button onClick={() => void login(role as Role)} disabled={status === 'authenticating'}>
                {status === 'authenticating' ? 'Signing in...' : 'Continue'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
