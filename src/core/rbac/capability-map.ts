import type { Capability, Role } from '@/core/types/domain';

const cccOperatorCapabilities: Capability[] = [
  'view_live_dashboard',
  'view_complaints',
  'dispatch_complaint',
  'update_complaint',
  'view_weighbridge',
  'view_notifications',
];

export const roleCapabilities: Record<Role, Capability[]> = {
  ccc_operator: cccOperatorCapabilities,
  ccc_shift_supervisor: [
    ...cccOperatorCapabilities,
    'manage_shift_handover',
    'view_ccc_summary',
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
    'view_ward_today',
    'confirm_ward_day',
  ],
  additional_commissioner: [
    'view_live_dashboard',
    'view_complaints',
    'dispatch_complaint',
    'view_weighbridge',
    'view_registry',
    'view_enforcement',
    'view_reports',
    'view_ccc_summary',
    'view_grievance_ageing',
    'issue_directive',
    'approve_maud',
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
    'view_audit_log',
  ],
  municipal_health_officer: [
    'view_live_dashboard',
    'view_health_risk',
    'flag_health_risk',
    'manage_ngt_compliance',
    'view_notifications',
  ],
  mis_gis_analyst: [
    'view_anomalies',
    'verify_data',
    'manage_gis_layers',
    'view_forecasting',
    'build_maud_report',
    'view_reports',
    'view_registry',
    'view_notifications',
  ],
  system_administrator: [
    'manage_users',
    'view_system_health',
    'manage_configuration',
    'view_audit_log',
  ],
  maud_viewer: ['view_reports'],
};

export const hasCapability = (role: Role | undefined, capability: Capability) =>
  !!role && roleCapabilities[role].includes(capability);
