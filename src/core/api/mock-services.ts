import { z } from 'zod';
import { httpClient } from '@/core/api/http-client';
import { roles } from '@/core/types/domain';
import type {
  Anomaly,
  AuditLogEntry,
  AuditResult,
  BeatSegment,
  Complaint,
  DashboardSummary,
  DirectiveRecord,
  EnforcementRecord,
  ForecastPoint,
  HealthRiskZone,
  ListQuery,
  NgtComplianceItem,
  NotificationRecord,
  PagedResult,
  PlatformUser,
  ReportRecord,
  ShiftHandoverNote,
  SystemHealthCheck,
  User,
  Vehicle,
  VerificationRecord,
  Ward,
  WardDayStatus,
  WeighbridgeEntry,
  WorkerAttendanceRecord,
} from '@/core/types/domain';
import { dashboardSummaryDtoSchema, userDtoSchema } from '@/core/types/dto';

const complaintSchema = z.object({
  id: z.string(),
  citizenReference: z.string(),
  title: z.string(),
  description: z.string(),
  wardId: z.string(),
  locationLabel: z.string(),
  status: z.enum(['new', 'assigned', 'in_progress', 'awaiting_closure', 'closed']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  etaMinutes: z.number().optional(),
  assignedTo: z.string().optional(),
  category: z.enum(['garbage', 'overflow', 'missed_collection', 'illegal_dumping']),
  openedAt: z.string(),
  dueAt: z.string(),
  closedAt: z.string().optional(),
  timeline: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      actor: z.string(),
      timestamp: z.string(),
      note: z.string(),
    }),
  ),
});

const weighbridgeSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  vehicleNumber: z.string(),
  wardId: z.string(),
  location: z.string(),
  status: z.enum(['checked_in', 'processing', 'checked_out', 'manual_review']),
  weightTonnes: z.number(),
  timeIn: z.string(),
  timeOut: z.string().optional(),
  feedStatus: z.enum(['live', 'refreshing', 'stale']),
});

const verificationSchema = z.object({
  id: z.string(),
  wardId: z.string(),
  reportingPeriod: z.string(),
  metricName: z.string(),
  reportedValue: z.number(),
  verifiedValue: z.number(),
  variancePercent: z.number(),
  status: z.enum(['pending', 'verified', 'flagged']),
  anomalyId: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
});

const anomalySchema = z.object({
  id: z.string(),
  verificationRecordId: z.string(),
  thresholdPercent: z.number(),
  variancePercent: z.number(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['open', 'under_review', 'resolved']),
  note: z.string(),
});

const enforcementSchema = z.object({
  id: z.string(),
  wardId: z.string(),
  vehicleId: z.string().optional(),
  type: z.enum(['sup_seizure', 'bwg', 'challan']),
  status: z.enum(['initiated', 'in_review', 'closed']),
  createdAt: z.string(),
  updatedAt: z.string(),
  subject: z.string(),
  officer: z.string(),
  fineAmount: z.number().optional(),
  fineStatus: z.enum(['unpaid', 'paid', 'waived']).optional(),
  evidencePhotoAttached: z.boolean(),
  evidenceNote: z.string().optional(),
});

const wardSchema = z.object({
  id: z.string(),
  name: z.string(),
  zone: z.string(),
  populationBand: z.string(),
  operationalStatus: z.enum([
    'active',
    'pending',
    'resolved',
    'flagged',
    'closed',
    'stale',
    'unavailable',
    'draft',
    'verified',
  ]),
  routeSummary: z.string().optional(),
});

const vehicleSchema = z.object({
  id: z.string(),
  registrationNumber: z.string(),
  type: z.string(),
  assignedWardId: z.string(),
  assignedRoute: z.string(),
  status: z.enum([
    'active',
    'pending',
    'resolved',
    'flagged',
    'closed',
    'stale',
    'unavailable',
    'draft',
    'verified',
  ]),
  lastSeenAt: z.string().optional(),
});

const reportSchema = z.object({
  id: z.string(),
  name: z.string(),
  periodLabel: z.string(),
  status: z.enum(['ready', 'pending_backend', 'draft']),
  generatedAt: z.string().optional(),
  generatedBy: z.string().optional(),
  signOffRequired: z.boolean(),
  signedOffAt: z.string().optional(),
  approvedAt: z.string().optional(),
  approvedBy: z.string().optional(),
});

const directiveSchema = z.object({
  id: z.string(),
  wardId: z.string(),
  issuedTo: z.string(),
  issuedBy: z.string(),
  instruction: z.string(),
  status: z.enum(['open', 'in_progress', 'closed']),
  dueAt: z.string(),
  createdAt: z.string(),
  relatedComplaintId: z.string().optional(),
});

const healthRiskZoneSchema = z.object({
  id: z.string(),
  wardId: z.string(),
  riskLevel: z.enum(['critical', 'high', 'medium', 'low']),
  healthComplaintCount7d: z.number(),
  category: z.enum(['stagnant_water', 'sewage_overflow', 'dead_animal', 'disease_linked']),
  flaggedAt: z.string().optional(),
  flaggedBy: z.string().optional(),
});

const ngtComplianceSchema = z.object({
  id: z.string(),
  siteName: z.string(),
  wardId: z.string(),
  category: z.enum(['legacy_waste', 'liquid_waste']),
  status: z.enum(['compliant', 'in_remediation', 'data_conflict', 'non_compliant']),
  note: z.string(),
  coSignedByAddlCommissioner: z.boolean(),
  coSignedByMho: z.boolean(),
  updatedAt: z.string(),
});

const shiftHandoverSchema = z.object({
  id: z.string(),
  shiftLabel: z.string(),
  outgoingSupervisor: z.string(),
  grievancesOpened: z.number(),
  grievancesClosed: z.number(),
  stillOpenHighPriority: z.number(),
  unacknowledgedAssignments: z.number(),
  note: z.string(),
  completedAt: z.string().optional(),
});

const systemHealthSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['green', 'amber', 'red']),
  detail: z.string(),
  lastCheckedAt: z.string(),
});

const platformUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(roles),
  wardScope: z.array(z.string()),
  accountStatus: z.enum(['active', 'deactivated']),
  lastLoginAt: z.string().optional(),
});

const auditLogEntrySchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  actor: z.string(),
  role: z.enum(roles),
  timestamp: z.string(),
  detail: z.string(),
});

const beatSegmentSchema = z.object({
  id: z.string(),
  wardId: z.string(),
  streetName: z.string(),
  beatType: z.enum(['sweeping', 'collection']),
  status: z.enum(['not_started', 'submitted', 'confirmed']),
  assignedWorker: z.string(),
  rejectionReason: z.string().optional(),
});

const workerAttendanceSchema = z.object({
  id: z.string(),
  wardId: z.string(),
  workerName: z.string(),
  checkedIn: z.boolean(),
  photoSubmitted: z.boolean(),
});

const wardDayStatusSchema = z.object({
  wardId: z.string(),
  date: z.string(),
  confirmed: z.boolean(),
  confirmedAt: z.string().optional(),
  confirmedBy: z.string().optional(),
});

const forecastPointSchema = z.object({
  wardId: z.string(),
  date: z.string(),
  predictedTonnage: z.number(),
  actualTonnage: z.number().optional(),
});

const notificationSchema = z.object({
  id: z.string(),
  channel: z.enum(['dashboard', 'sms', 'whatsapp']),
  subject: z.string(),
  body: z.string(),
  status: z.enum(['queued', 'blocked', 'delivered', 'development_only']),
  createdAt: z.string(),
  relatedEntityId: z.string().optional(),
});

const auditSchema = z.object({
  entityId: z.string(),
  entityType: z.string(),
  action: z.string(),
  actor: z.string(),
  timestamp: z.string(),
  result: z.string(),
});

const pagedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });

const parse = <T>(schema: z.ZodType<T>, payload: unknown) => schema.parse(payload);

const toSearchParams = (query?: ListQuery) => {
  const params = new URLSearchParams();
  if (!query) return '';
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const raw = params.toString();
  return raw ? `?${raw}` : '';
};

export const authService = {
  login: async (role: User['role']) => {
    const response = await httpClient<{ token: string; user: unknown }>('/auth/login', {
      method: 'POST',
      body: { role },
    });
    return {
      token: response.token,
      user: parse(userDtoSchema, response.user),
    };
  },
  me: async (token: string) => parse(userDtoSchema, await httpClient('/auth/me', { token })),
  logout: async (token: string) => {
    await httpClient('/auth/logout', { method: 'POST', token });
  },
  verifySecondFactor: async (token: string, code: string) =>
    httpClient<{ verified: boolean; message: string }>('/auth/2fa/verify', {
      method: 'POST',
      token,
      body: { code },
    }),
};

export const dashboardService = {
  getSummary: async (token: string, wardId?: string): Promise<DashboardSummary> =>
    parse(
      dashboardSummaryDtoSchema,
      await httpClient(`/dashboard/summary${toSearchParams({ wardId })}`, { token }),
    ),
};

export const complaintsService = {
  list: async (token: string, query?: ListQuery): Promise<PagedResult<Complaint>> =>
    parse(
      pagedSchema(complaintSchema),
      await httpClient(`/complaints${toSearchParams(query)}`, { token }),
    ),
  detail: async (token: string, id: string): Promise<Complaint> =>
    parse(complaintSchema, await httpClient(`/complaints/${id}`, { token })),
  update: async (token: string, id: string, body: Record<string, unknown>) =>
    parse(complaintSchema, await httpClient(`/complaints/${id}`, { method: 'PATCH', token, body })),
};

export const weighbridgeService = {
  list: async (token: string, query?: ListQuery): Promise<PagedResult<WeighbridgeEntry>> =>
    parse(
      pagedSchema(weighbridgeSchema),
      await httpClient(`/weighbridge${toSearchParams(query)}`, { token }),
    ),
  detail: async (token: string, id: string): Promise<WeighbridgeEntry> =>
    parse(weighbridgeSchema, await httpClient(`/weighbridge/${id}`, { token })),
};

export const verificationService = {
  list: async (token: string, query?: ListQuery): Promise<PagedResult<VerificationRecord>> =>
    parse(
      pagedSchema(verificationSchema),
      await httpClient(`/verification${toSearchParams(query)}`, { token }),
    ),
  detail: async (token: string, id: string): Promise<VerificationRecord> =>
    parse(verificationSchema, await httpClient(`/verification/${id}`, { token })),
  anomalies: async (token: string): Promise<Anomaly[]> =>
    parse(z.array(anomalySchema), await httpClient('/verification/anomalies', { token })),
};

export const registryService = {
  wards: async (token: string): Promise<Ward[]> =>
    parse(z.array(wardSchema), await httpClient('/registry/wards', { token })),
  vehicles: async (token: string, query?: ListQuery): Promise<PagedResult<Vehicle>> =>
    parse(
      pagedSchema(vehicleSchema),
      await httpClient(`/registry/vehicles${toSearchParams(query)}`, { token }),
    ),
};

export const enforcementService = {
  list: async (token: string, query?: ListQuery): Promise<PagedResult<EnforcementRecord>> =>
    parse(
      pagedSchema(enforcementSchema),
      await httpClient(`/enforcement${toSearchParams(query)}`, { token }),
    ),
  detail: async (token: string, id: string): Promise<EnforcementRecord> =>
    parse(enforcementSchema, await httpClient(`/enforcement/${id}`, { token })),
};

export const reportingService = {
  list: async (token: string): Promise<ReportRecord[]> =>
    parse(z.array(reportSchema), await httpClient('/reports', { token })),
  signOff: async (token: string, reportId: string): Promise<AuditResult> =>
    parse(auditSchema, await httpClient(`/reports/${reportId}/sign-off`, { method: 'POST', token })),
};

export const notificationsService = {
  list: async (token: string): Promise<NotificationRecord[]> =>
    parse(z.array(notificationSchema), await httpClient('/notifications', { token })),
};

export const directivesService = {
  list: async (token: string): Promise<DirectiveRecord[]> =>
    parse(z.array(directiveSchema), await httpClient('/directives', { token })),
  create: async (token: string, body: Record<string, unknown>): Promise<DirectiveRecord> =>
    parse(directiveSchema, await httpClient('/directives', { method: 'POST', token, body })),
};

export const healthRiskService = {
  list: async (token: string): Promise<HealthRiskZone[]> =>
    parse(z.array(healthRiskZoneSchema), await httpClient('/health-risk', { token })),
  flagWard: async (token: string, wardId: string): Promise<HealthRiskZone> =>
    parse(
      healthRiskZoneSchema,
      await httpClient('/health-risk/flag', { method: 'POST', token, body: { wardId } }),
    ),
};

export const ngtComplianceService = {
  list: async (token: string): Promise<NgtComplianceItem[]> =>
    parse(z.array(ngtComplianceSchema), await httpClient('/ngt-compliance', { token })),
  coSign: async (token: string, id: string): Promise<NgtComplianceItem> =>
    parse(
      ngtComplianceSchema,
      await httpClient(`/ngt-compliance/${id}/co-sign`, { method: 'POST', token }),
    ),
};

export const shiftHandoverService = {
  list: async (token: string): Promise<ShiftHandoverNote[]> =>
    parse(z.array(shiftHandoverSchema), await httpClient('/shift-handover', { token })),
  complete: async (token: string, id: string, note: string): Promise<ShiftHandoverNote> =>
    parse(
      shiftHandoverSchema,
      await httpClient(`/shift-handover/${id}/complete`, { method: 'POST', token, body: { note } }),
    ),
};

export const systemHealthService = {
  list: async (token: string): Promise<SystemHealthCheck[]> =>
    parse(z.array(systemHealthSchema), await httpClient('/system-health', { token })),
};

export const adminService = {
  users: async (token: string): Promise<PlatformUser[]> =>
    parse(z.array(platformUserSchema), await httpClient('/admin/users', { token })),
  createUser: async (
    token: string,
    body: { name: string; role: string; wardScope: string[] },
  ): Promise<PlatformUser> =>
    parse(platformUserSchema, await httpClient('/admin/users', { method: 'POST', token, body })),
  setUserStatus: async (
    token: string,
    id: string,
    accountStatus: PlatformUser['accountStatus'],
  ): Promise<PlatformUser> =>
    parse(
      platformUserSchema,
      await httpClient(`/admin/users/${id}`, { method: 'PATCH', token, body: { accountStatus } }),
    ),
  auditLog: async (token: string): Promise<AuditLogEntry[]> =>
    parse(z.array(auditLogEntrySchema), await httpClient('/admin/audit-log', { token })),
};

export const forecastingService = {
  list: async (token: string, wardId?: string): Promise<ForecastPoint[]> =>
    parse(
      z.array(forecastPointSchema),
      await httpClient(`/forecasting${toSearchParams({ wardId })}`, { token }),
    ),
};

export const wardTodayService = {
  segments: async (token: string, wardId?: string): Promise<BeatSegment[]> =>
    parse(
      z.array(beatSegmentSchema),
      await httpClient(`/ward-today/segments${toSearchParams({ wardId })}`, { token }),
    ),
  attendance: async (token: string, wardId?: string): Promise<WorkerAttendanceRecord[]> =>
    parse(
      z.array(workerAttendanceSchema),
      await httpClient(`/ward-today/attendance${toSearchParams({ wardId })}`, { token }),
    ),
  status: async (token: string, wardId: string): Promise<WardDayStatus | undefined> =>
    parse(
      z.array(wardDayStatusSchema),
      await httpClient(`/ward-today/status${toSearchParams({ wardId })}`, { token }),
    ).at(0),
  markAbsent: async (token: string, attendanceId: string): Promise<WorkerAttendanceRecord> =>
    parse(
      workerAttendanceSchema,
      await httpClient(`/ward-today/attendance/${attendanceId}/mark-absent`, { method: 'POST', token }),
    ),
  reassignBeat: async (token: string, segmentId: string, assignedWorker: string): Promise<BeatSegment> =>
    parse(
      beatSegmentSchema,
      await httpClient(`/ward-today/segments/${segmentId}/reassign`, {
        method: 'POST',
        token,
        body: { assignedWorker },
      }),
    ),
  confirmDay: async (token: string, wardId: string): Promise<WardDayStatus> =>
    parse(
      wardDayStatusSchema,
      await httpClient('/ward-today/confirm-day', { method: 'POST', token, body: { wardId } }),
    ),
};

export const maudReportService = {
  approve: async (token: string, reportId: string): Promise<ReportRecord> =>
    parse(reportSchema, await httpClient(`/reports/${reportId}/approve`, { method: 'POST', token })),
  generateDraft: async (token: string): Promise<ReportRecord> =>
    parse(reportSchema, await httpClient('/reports/generate-maud-draft', { method: 'POST', token })),
};
