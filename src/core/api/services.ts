import { z } from 'zod';
import { httpClient } from '@/core/api/http-client';
import type {
  Anomaly,
  AuditResult,
  Complaint,
  DashboardSummary,
  EnforcementRecord,
  ListQuery,
  NotificationRecord,
  PagedResult,
  ReportRecord,
  User,
  Vehicle,
  VerificationRecord,
  Ward,
  WeighbridgeEntry,
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
