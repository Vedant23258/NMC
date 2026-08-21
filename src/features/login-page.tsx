import { Navigate } from 'react-router-dom';
import { navItems } from '@/app/router/route-config';
import { useAuth } from '@/core/auth/auth-hooks';
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
  commissioner: 'Full read access plus second-step report sign-off flow.',
  municipal_health_officer: 'Health-risk zone monitoring and NGT/legacy-waste compliance.',
  mis_gis_analyst: 'Anomaly review, GIS layer management, MAUD report builder, forecasting.',
  system_administrator: 'User & role management, system health, configuration, audit log.',
  maud_viewer: 'Read-only access to approved and signed MAUD compliance reports.',
};

export const LoginPage = () => {
  const { login, status, lastError, clearError, currentUser } = useAuth();
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
              <p className="muted">{roleDescriptions[role]}</p>
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
