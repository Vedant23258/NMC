import type { Capability, Role } from '@/core/types/domain';

export const roleCapabilities: Record<Role, Capability[]> = {
  ccc_operator: [
    'view_live_dashboard',
    'view_complaints',
    'dispatch_complaint',
    'update_complaint',
    'view_weighbridge',
    'view_notifications',
  ],
  sanitary_inspector: [
    'view_live_dashboard',
    'view_complaints',
    'update_complaint',
    'view_weighbridge',
    'verify_data',
    'view_anomalies',
    'view_enforcement',
    'view_registry',
    'view_notifications',
  ],
  commissioner: [
    'view_live_dashboard',
    'view_complaints',
    'view_weighbridge',
    'verify_data',
    'view_anomalies',
    'view_enforcement',
    'view_registry',
    'view_reports',
    'sign_off_reports',
    'view_notifications',
  ],
};

export const hasCapability = (role: Role | undefined, capability: Capability) =>
  !!role && roleCapabilities[role].includes(capability);
