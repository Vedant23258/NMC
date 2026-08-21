import type { Capability } from '@/core/types/domain';

export interface NavItem {
  to: string;
  label: string;
  capability: Capability;
}

export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', capability: 'view_live_dashboard' },
  { to: '/complaints', label: 'Complaints', capability: 'view_complaints' },
  { to: '/weighbridge', label: 'Weighbridge', capability: 'view_weighbridge' },
  { to: '/verification', label: 'Verification', capability: 'verify_data' },
  { to: '/registry', label: 'Registry', capability: 'view_registry' },
  { to: '/enforcement', label: 'Enforcement', capability: 'view_enforcement' },
  { to: '/reports', label: 'Reports', capability: 'view_reports' },
  { to: '/notifications', label: 'Notifications', capability: 'view_notifications' },
];
