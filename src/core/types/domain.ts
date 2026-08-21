export const roles = ['ccc_operator', 'sanitary_inspector', 'commissioner'] as const;

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
