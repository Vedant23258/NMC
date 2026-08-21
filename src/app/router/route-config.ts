import type { Capability } from '@/core/types/domain';

export interface NavItem {
  to: string;
  label: string;
  capability: Capability;
}

export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', capability: 'view_live_dashboard' },
  { to: '/complaints', label: 'Complaints', capability: 'view_complaints' },
  { to: '/shift-handover', label: 'Shift Handover', capability: 'manage_shift_handover' },
  { to: '/executive-overview', label: 'Executive Overview', capability: 'view_grievance_ageing' },
  { to: '/weighbridge', label: 'Weighbridge', capability: 'view_weighbridge' },
  { to: '/verification', label: 'Verification', capability: 'verify_data' },
  { to: '/anomalies', label: 'Anomalies & GIS', capability: 'manage_gis_layers' },
  { to: '/health-risk', label: 'Health Risk & NGT', capability: 'view_health_risk' },
  { to: '/registry', label: 'Registry', capability: 'view_registry' },
  { to: '/enforcement', label: 'Enforcement', capability: 'view_enforcement' },
  { to: '/reports', label: 'Reports', capability: 'view_reports' },
  { to: '/notifications', label: 'Notifications', capability: 'view_notifications' },
  { to: '/admin', label: 'Administration', capability: 'manage_users' },
];
