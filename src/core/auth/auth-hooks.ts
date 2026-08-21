import { useAuthStore } from '@/core/auth/auth-store';
import { hasCapability } from '@/core/rbac/capability-map';
import type { Capability } from '@/core/types/domain';

export const useAuth = () => useAuthStore();

export const useCapability = (capability: Capability) => {
  const role = useAuthStore((state) => state.currentUser?.role);
  return hasCapability(role, capability);
};
