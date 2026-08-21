export const roles = [
  'ccc_operator',
  'ccc_shift_supervisor',
  'sanitary_inspector',
  'additional_commissioner',
  'commissioner',
  'municipal_health_officer',
  'mis_gis_analyst',
  'system_administrator',
  'maud_viewer',
] as const;

export type Role = (typeof roles)[number];

export const capabilities = [
  'view_live_dashboard',
  'view_complaints',
  'dispatch_complaint',
  'update_complaint',
  'view_weighbridge',
  'verify_data',
  'view_anomalies',
  'view_enforcement',
  'view_registry',
  'view_reports',
  'sign_off_reports',
  'view_notifications',
  'manage_shift_handover',
  'view_ccc_summary',
  'view_grievance_ageing',
  'issue_directive',
  'approve_maud',
  'view_health_risk',
  'flag_health_risk',
  'manage_ngt_compliance',
  'manage_gis_layers',
  'view_forecasting',
  'build_maud_report',
  'manage_users',
  'view_system_health',
  'manage_configuration',
  'view_audit_log',
] as const;

export type Capability = (typeof capabilities)[number];

export type EntityStatus =
  | 'active'
  | 'pending'
  | 'resolved'
  | 'flagged'
  | 'closed'
  | 'stale'
  | 'unavailable'
  | 'draft'
  | 'verified';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface User {
  id: string;
  name: string;
  role: Role;
  wardScope: string[];
  title: string;
  requiresSecondFactor: boolean;
}

export interface Ward {
  id: string;
  name: string;
  zone: string;
  populationBand: string;
  operationalStatus: EntityStatus;
  routeSummary?: string;
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  type: string;
  assignedWardId: string;
  assignedRoute: string;
  status: EntityStatus;
  lastSeenAt?: string;
}

export interface ComplaintEvent {
  id: string;
  type: string;
  actor: string;
  timestamp: string;
  note: string;
}

export interface Complaint {
  id: string;
  citizenReference: string;
  title: string;
  description: string;
  wardId: string;
  locationLabel: string;
  status: 'new' | 'assigned' | 'in_progress' | 'awaiting_closure' | 'closed';
  priority: Priority;
  etaMinutes?: number;
  assignedTo?: string;
  category: 'garbage' | 'overflow' | 'missed_collection' | 'illegal_dumping';
  openedAt: string;
  dueAt: string;
  closedAt?: string;
  timeline: ComplaintEvent[];
}

export interface WeighbridgeEntry {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  wardId: string;
  location: string;
  status: 'checked_in' | 'processing' | 'checked_out' | 'manual_review';
  weightTonnes: number;
  timeIn: string;
  timeOut?: string;
  feedStatus: 'live' | 'refreshing' | 'stale';
}

export interface VerificationRecord {
  id: string;
  wardId: string;
  reportingPeriod: string;
  metricName: string;
  reportedValue: number;
  verifiedValue: number;
  variancePercent: number;
  status: 'pending' | 'verified' | 'flagged';
  anomalyId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Anomaly {
  id: string;
  verificationRecordId: string;
  thresholdPercent: number;
  variancePercent: number;
  severity: Priority;
  status: 'open' | 'under_review' | 'resolved';
  note: string;
}

export interface EnforcementRecord {
  id: string;
  wardId: string;
  vehicleId?: string;
  type: 'sup_seizure' | 'bwg' | 'challan';
  status: 'initiated' | 'in_review' | 'closed';
  createdAt: string;
  updatedAt: string;
  subject: string;
  officer: string;
}

export interface ReportRecord {
  id: string;
  name: string;
  periodLabel: string;
  status: 'ready' | 'pending_backend' | 'draft';
  generatedAt?: string;
  generatedBy?: string;
  signOffRequired: boolean;
  signedOffAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface NotificationRecord {
  id: string;
  channel: 'dashboard' | 'sms' | 'whatsapp';
  subject: string;
  body: string;
  status: 'queued' | 'blocked' | 'delivered' | 'development_only';
  createdAt: string;
  relatedEntityId?: string;
}

export interface DashboardSummary {
  activeComplaints: number;
  pendingSlaBreaches: number;
  weighbridgeActiveVehicles: number;
  flaggedVerifications: number;
  openEnforcementActions: number;
  lastUpdatedAt: string;
  alerts: Array<{
    id: string;
    title: string;
    severity: Priority;
    message: string;
  }>;
  wardOverview: Array<{
    wardId: string;
    complaintCount: number;
    weighbridgeTrips: number;
    flaggedRecords: number;
  }>;
  recentActivity: Array<{
    id: string;
    timestamp: string;
    title: string;
    description: string;
  }>;
}

export interface AuditResult {
  entityId: string;
  entityType: string;
  action: string;
  actor: string;
  timestamp: string;
  result: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  wardId?: string;
  status?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface DirectiveRecord {
  id: string;
  wardId: string;
  issuedTo: string;
  issuedBy: string;
  instruction: string;
  status: 'open' | 'in_progress' | 'closed';
  dueAt: string;
  createdAt: string;
  relatedComplaintId?: string;
}

export interface HealthRiskZone {
  id: string;
  wardId: string;
  riskLevel: Priority;
  healthComplaintCount7d: number;
  category: 'stagnant_water' | 'sewage_overflow' | 'dead_animal' | 'disease_linked';
  flaggedAt?: string;
  flaggedBy?: string;
}

export interface NgtComplianceItem {
  id: string;
  siteName: string;
  wardId: string;
  category: 'legacy_waste' | 'liquid_waste';
  status: 'compliant' | 'in_remediation' | 'data_conflict' | 'non_compliant';
  note: string;
  coSignedByAddlCommissioner: boolean;
  coSignedByMho: boolean;
  updatedAt: string;
}

export interface ShiftHandoverNote {
  id: string;
  shiftLabel: string;
  outgoingSupervisor: string;
  grievancesOpened: number;
  grievancesClosed: number;
  stillOpenHighPriority: number;
  unacknowledgedAssignments: number;
  note: string;
  completedAt?: string;
}

export interface SystemHealthCheck {
  id: string;
  name: string;
  status: 'green' | 'amber' | 'red';
  detail: string;
  lastCheckedAt: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  role: Role;
  wardScope: string[];
  accountStatus: 'active' | 'deactivated';
  lastLoginAt?: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  role: Role;
  timestamp: string;
  detail: string;
}

export interface ForecastPoint {
  wardId: string;
  date: string;
  predictedTonnage: number;
  actualTonnage?: number;
}
