import type { PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, useCapability } from '@/core/auth/auth-hooks';
import type { Capability } from '@/core/types/domain';
import { EmptyPanel } from '@/shared/ui/state-panels';

export const ProtectedRoute = () => {
  const { status } = useAuth();
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const CapabilityGate = ({
  capability,
  children,
}: PropsWithChildren<{ capability: Capability }>) => {
  const permitted = useCapability(capability);
  if (!permitted) {
    return (
      <EmptyPanel
        title="Access restricted"
        body="Your role does not currently have permission to open this workflow."
      />
    );
  }
  return <>{children}</>;
};
