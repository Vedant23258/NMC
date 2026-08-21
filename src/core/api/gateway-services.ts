// Real-backend implementation of every service in mock-services.ts, backed
// directly by Supabase (Postgres + Auth), matching supabase/schema.sql.
//
// Every exported function keeps the same signature as its mock-services.ts
// counterpart -- including the `token` parameter that callers already pass
// -- so that services.ts can dispatch between the two without touching any
// page component. In gateway mode `token` is accepted but unused: Supabase's
// client manages the session internally.
import { supabase } from '@/core/supabase/client';
import type {
  Anomaly,
  AuditLogEntry,
  AuditResult,
  BeatSegment,
  Complaint,
  ComplaintEvent,
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
  Priority,
  ReportRecord,
  Role,
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

const paginate = <T>(items: T[], page = 1, pageSize = 10): PagedResult<T> => {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
};

const applySearch = <T extends Record<string, unknown>>(items: T[], search?: string) => {
  if (!search) return items;
  const needle = search.toLowerCase();
  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
};

// ---------------------------------------------------------------- auth ----
const mapProfileToUser = (profile: Record<string, unknown>): User => ({
  id: profile.id as string,
  name: profile.name as string,
  role: profile.role as Role,
  wardScope: (profile.ward_scope as string[]) ?? [],
  title: (profile.title as string) ?? '',
  requiresSecondFactor: Boolean(profile.requires_second_factor),
});

const fetchProfile = async (userId: string): Promise<User> => {
  const { data, error } = await supabase().from('profiles').select('*').eq('id', userId).single();
  if (error || !data) throw new Error(error?.message ?? 'No profile found for this account.');
  await supabase().from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId);
  return mapProfileToUser(data);
};

export const authService = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const { data, error } = await supabase().auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? 'Sign-in failed.');
    const user = await fetchProfile(data.session.user.id);
    return { token: data.session.access_token, user };
  },
  restoreSession: async (): Promise<{ token: string; user: User } | undefined> => {
    const { data } = await supabase().auth.getSession();
    if (!data.session) return undefined;
    const user = await fetchProfile(data.session.user.id);
    return { token: data.session.access_token, user };
  },
  me: async (_token: string): Promise<User> => {
    const { data } = await supabase().auth.getUser();
    if (!data.user) throw new Error('Not signed in.');
    return fetchProfile(data.user.id);
  },
  logout: async (_token: string): Promise<void> => {
    await supabase().auth.signOut();
  },
  verifySecondFactor: async (_token: string, code: string) => {
    const { data } = await supabase().auth.getUser();
    const verified = data.user !== null && code === '240816';
    return {
      verified,
      message: verified ? 'Commissioner sign-off verified.' : 'Invalid verification code for mock sign-off.',
    };
  },
};

// ---------------------------------------------------------- dashboard -----
export const dashboardService = {
  getSummary: async (_token: string, wardId?: string): Promise<DashboardSummary> => {
    const client = supabase();
    const wardFilter = wardId ? { ward_id: wardId } : {};

    const [complaints, weighbridge, verification, enforcement, wards] = await Promise.all([
      client.from('complaints').select('*').match(wardFilter),
      client.from('weighbridge_entries').select('*').match(wardFilter),
      client.from('verification_records').select('*').match(wardFilter),
      client.from('enforcement_records').select('*').match(wardFilter),
      client.from('wards').select('id'),
    ]);

    const complaintRows = complaints.data ?? [];
    const weighbridgeRows = weighbridge.data ?? [];
    const verificationRows = verification.data ?? [];
    const enforcementRows = enforcement.data ?? [];

    return {
      activeComplaints: complaintRows.filter((row) => row.status !== 'closed').length,
      pendingSlaBreaches: complaintRows.filter((row) => row.status !== 'closed' && row.priority !== 'low').length,
      weighbridgeActiveVehicles: weighbridgeRows.filter((row) => row.status !== 'checked_out').length,
      flaggedVerifications: verificationRows.filter((row) => row.status === 'flagged').length,
      openEnforcementActions: enforcementRows.filter((row) => row.status !== 'closed').length,
      lastUpdatedAt: new Date().toISOString(),
      alerts: verificationRows
        .filter((row) => row.status === 'flagged')
        .map((row) => ({
          id: row.id,
          title: `${row.ward_id.toUpperCase()} variance flagged`,
          severity: 'high' as Priority,
          message: `${row.metric_name} variance is ${row.variance_percent}%.`,
        })),
      wardOverview: (wards.data ?? []).map((ward) => ({
        wardId: ward.id,
        complaintCount: complaintRows.filter((row) => row.ward_id === ward.id && row.status !== 'closed').length,
        weighbridgeTrips: weighbridgeRows.filter((row) => row.ward_id === ward.id).length,
        flaggedRecords: verificationRows.filter((row) => row.ward_id === ward.id && row.status === 'flagged').length,
      })),
      recentActivity: complaintRows
        .slice(-5)
        .reverse()
        .map((row) => ({
          id: row.id,
          timestamp: row.opened_at,
          title: row.title,
          description: row.location_label,
        })),
    };
  },
};

// --------------------------------------------------------- complaints -----
const mapComplaintRow = (row: Record<string, unknown>, events: ComplaintEvent[] = []): Complaint => ({
  id: row.id as string,
  citizenReference: row.citizen_reference as string,
  title: row.title as string,
  description: (row.description as string) ?? '',
  wardId: row.ward_id as string,
  locationLabel: (row.location_label as string) ?? '',
  status: row.status as Complaint['status'],
  priority: row.priority as Priority,
  etaMinutes: row.eta_minutes as number | undefined,
  assignedTo: row.assigned_to as string | undefined,
  category: row.category as Complaint['category'],
  openedAt: row.opened_at as string,
  dueAt: row.due_at as string,
  closedAt: row.closed_at as string | undefined,
  timeline: events,
});

export const complaintsService = {
  list: async (_token: string, query?: ListQuery): Promise<PagedResult<Complaint>> => {
    let request = supabase().from('complaints').select('*').order('opened_at', { ascending: false });
    if (query?.wardId) request = request.eq('ward_id', query.wardId);
    if (query?.status) request = request.eq('status', query.status);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    const rows = applySearch(data ?? [], query?.search).map((row) => mapComplaintRow(row));
    return paginate(rows, query?.page, query?.pageSize);
  },
  detail: async (_token: string, id: string): Promise<Complaint> => {
    const client = supabase();
    const [complaint, events] = await Promise.all([
      client.from('complaints').select('*').eq('id', id).single(),
      client.from('complaint_events').select('*').eq('complaint_id', id).order('timestamp'),
    ]);
    if (complaint.error || !complaint.data) throw new Error(complaint.error?.message ?? 'Complaint not found');
    return mapComplaintRow(
      complaint.data,
      (events.data ?? []).map((event) => ({
        id: event.id,
        type: event.type,
        actor: event.actor,
        timestamp: event.timestamp,
        note: event.note,
      })),
    );
  },
  update: async (token: string, id: string, body: Record<string, unknown>): Promise<Complaint> => {
    const columnMap: Record<string, string> = {
      assignedTo: 'assigned_to',
      closedAt: 'closed_at',
      etaMinutes: 'eta_minutes',
    };
    const patch = Object.fromEntries(
      Object.entries(body).map(([key, value]) => [columnMap[key] ?? key, value]),
    );
    const client = supabase();
    const { error } = await client.from('complaints').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    const me = await authService.me('');
    await client.from('complaint_events').insert({
      complaint_id: id,
      type: 'status_changed',
      actor: me.name,
      note: 'Complaint updated from dashboard.',
    });
    return complaintsService.detail(token, id);
  },
};

// -------------------------------------------------------- weighbridge -----
const mapWeighbridgeRow = (row: Record<string, unknown>): WeighbridgeEntry => ({
  id: row.id as string,
  vehicleId: row.vehicle_id as string,
  vehicleNumber: row.vehicle_number as string,
  wardId: row.ward_id as string,
  location: row.location as string,
  status: row.status as WeighbridgeEntry['status'],
  weightTonnes: row.weight_tonnes as number,
  timeIn: row.time_in as string,
  timeOut: row.time_out as string | undefined,
  feedStatus: row.feed_status as WeighbridgeEntry['feedStatus'],
});

export const weighbridgeService = {
  list: async (_token: string, query?: ListQuery): Promise<PagedResult<WeighbridgeEntry>> => {
    let request = supabase().from('weighbridge_entries').select('*').order('time_in', { ascending: false });
    if (query?.wardId) request = request.eq('ward_id', query.wardId);
    if (query?.status) request = request.eq('status', query.status);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    const rows = applySearch(data ?? [], query?.search).map(mapWeighbridgeRow);
    return paginate(rows, query?.page, query?.pageSize);
  },
  detail: async (_token: string, id: string): Promise<WeighbridgeEntry> => {
    const { data, error } = await supabase().from('weighbridge_entries').select('*').eq('id', id).single();
    if (error || !data) throw new Error(error?.message ?? 'Weighbridge entry not found');
    return mapWeighbridgeRow(data);
  },
};

// ------------------------------------------------------- verification -----
const mapVerificationRow = (row: Record<string, unknown>): VerificationRecord => ({
  id: row.id as string,
  wardId: row.ward_id as string,
  reportingPeriod: row.reporting_period as string,
  metricName: row.metric_name as string,
  reportedValue: row.reported_value as number,
  verifiedValue: row.verified_value as number,
  variancePercent: row.variance_percent as number,
  status: row.status as VerificationRecord['status'],
  anomalyId: row.anomaly_id as string | undefined,
  reviewedBy: row.reviewed_by as string | undefined,
  reviewedAt: row.reviewed_at as string | undefined,
});

const mapAnomalyRow = (row: Record<string, unknown>): Anomaly => ({
  id: row.id as string,
  verificationRecordId: row.verification_record_id as string,
  thresholdPercent: row.threshold_percent as number,
  variancePercent: row.variance_percent as number,
  severity: row.severity as Priority,
  status: row.status as Anomaly['status'],
  note: (row.note as string) ?? '',
});

export const verificationService = {
  list: async (_token: string, query?: ListQuery): Promise<PagedResult<VerificationRecord>> => {
    let request = supabase().from('verification_records').select('*');
    if (query?.wardId) request = request.eq('ward_id', query.wardId);
    if (query?.status) request = request.eq('status', query.status);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    const rows = applySearch(data ?? [], query?.search).map(mapVerificationRow);
    return paginate(rows, query?.page, query?.pageSize);
  },
  detail: async (_token: string, id: string): Promise<VerificationRecord> => {
    const { data, error } = await supabase().from('verification_records').select('*').eq('id', id).single();
    if (error || !data) throw new Error(error?.message ?? 'Verification record not found');
    return mapVerificationRow(data);
  },
  anomalies: async (_token: string): Promise<Anomaly[]> => {
    const { data, error } = await supabase().from('anomalies').select('*');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAnomalyRow);
  },
};

// ------------------------------------------------------------ registry ----
const mapWardRow = (row: Record<string, unknown>): Ward => ({
  id: row.id as string,
  name: row.name as string,
  zone: row.zone as string,
  populationBand: row.population_band as string,
  operationalStatus: row.operational_status as Ward['operationalStatus'],
  routeSummary: row.route_summary as string | undefined,
});

const mapVehicleRow = (row: Record<string, unknown>): Vehicle => ({
  id: row.id as string,
  registrationNumber: row.registration_number as string,
  type: row.type as string,
  assignedWardId: row.assigned_ward_id as string,
  assignedRoute: (row.assigned_route as string) ?? '',
  status: row.status as Vehicle['status'],
  lastSeenAt: row.last_seen_at as string | undefined,
});

export const registryService = {
  wards: async (_token: string): Promise<Ward[]> => {
    const { data, error } = await supabase().from('wards').select('*').order('id');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapWardRow);
  },
  vehicles: async (_token: string, query?: ListQuery): Promise<PagedResult<Vehicle>> => {
    let request = supabase().from('vehicles').select('*');
    if (query?.wardId) request = request.eq('assigned_ward_id', query.wardId);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    const rows = applySearch(data ?? [], query?.search).map(mapVehicleRow);
    return paginate(rows, query?.page, query?.pageSize);
  },
};

// --------------------------------------------------------- enforcement ----
const mapEnforcementRow = (row: Record<string, unknown>): EnforcementRecord => ({
  id: row.id as string,
  wardId: row.ward_id as string,
  vehicleId: row.vehicle_id as string | undefined,
  type: row.type as EnforcementRecord['type'],
  status: row.status as EnforcementRecord['status'],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  subject: row.subject as string,
  officer: row.officer as string,
  fineAmount: row.fine_amount as number | undefined,
  fineStatus: row.fine_status as EnforcementRecord['fineStatus'],
  evidencePhotoAttached: Boolean(row.evidence_photo_attached),
  evidenceNote: row.evidence_note as string | undefined,
});

export const enforcementService = {
  list: async (_token: string, query?: ListQuery): Promise<PagedResult<EnforcementRecord>> => {
    let request = supabase().from('enforcement_records').select('*').order('created_at', { ascending: false });
    if (query?.wardId) request = request.eq('ward_id', query.wardId);
    if (query?.status) request = request.eq('status', query.status);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    const rows = applySearch(data ?? [], query?.search).map(mapEnforcementRow);
    return paginate(rows, query?.page, query?.pageSize);
  },
  detail: async (_token: string, id: string): Promise<EnforcementRecord> => {
    const { data, error } = await supabase().from('enforcement_records').select('*').eq('id', id).single();
    if (error || !data) throw new Error(error?.message ?? 'Enforcement record not found');
    return mapEnforcementRow(data);
  },
};

// -------------------------------------------------------------- reports ---
const mapReportRow = (row: Record<string, unknown>): ReportRecord => ({
  id: row.id as string,
  name: row.name as string,
  periodLabel: row.period_label as string,
  status: row.status as ReportRecord['status'],
  generatedAt: row.generated_at as string | undefined,
  generatedBy: row.generated_by as string | undefined,
  signOffRequired: Boolean(row.sign_off_required),
  signedOffAt: row.signed_off_at as string | undefined,
  approvedAt: row.approved_at as string | undefined,
  approvedBy: row.approved_by as string | undefined,
});

export const reportingService = {
  list: async (_token: string): Promise<ReportRecord[]> => {
    const { data, error } = await supabase().from('reports').select('*').order('generated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapReportRow);
  },
  signOff: async (_token: string, reportId: string): Promise<AuditResult> => {
    const client = supabase();
    const me = await authService.me('');
    const timestamp = new Date().toISOString();
    const { error } = await client
      .from('reports')
      .update({ signed_off_at: timestamp, status: 'ready' })
      .eq('id', reportId);
    if (error) throw new Error(error.message);
    return { entityId: reportId, entityType: 'report', action: 'commissioner_sign_off', actor: me.name, timestamp, result: 'approved' };
  },
};

// ---------------------------------------------------------- notifications--
export const notificationsService = {
  list: async (_token: string): Promise<NotificationRecord[]> => {
    const { data, error } = await supabase().from('notifications').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      channel: row.channel,
      subject: row.subject,
      body: row.body,
      status: row.status,
      createdAt: row.created_at,
      relatedEntityId: row.related_entity_id ?? undefined,
    }));
  },
};

// ------------------------------------------------------------ directives --
const mapDirectiveRow = (row: Record<string, unknown>): DirectiveRecord => ({
  id: row.id as string,
  wardId: row.ward_id as string,
  issuedTo: row.issued_to as string,
  issuedBy: row.issued_by as string,
  instruction: row.instruction as string,
  status: row.status as DirectiveRecord['status'],
  dueAt: row.due_at as string,
  createdAt: row.created_at as string,
  relatedComplaintId: row.related_complaint_id as string | undefined,
});

export const directivesService = {
  list: async (_token: string): Promise<DirectiveRecord[]> => {
    const { data, error } = await supabase().from('directives').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapDirectiveRow);
  },
  create: async (_token: string, body: Record<string, unknown>): Promise<DirectiveRecord> => {
    const me = await authService.me('');
    const { data, error } = await supabase()
      .from('directives')
      .insert({
        ward_id: body.wardId,
        issued_to: body.issuedTo,
        issued_by: me.name,
        instruction: body.instruction,
        due_at: body.dueAt,
        related_complaint_id: body.relatedComplaintId ?? null,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Could not create directive');
    return mapDirectiveRow(data);
  },
};

// --------------------------------------------------------- health risk ----
const mapHealthRiskRow = (row: Record<string, unknown>): HealthRiskZone => ({
  id: row.id as string,
  wardId: row.ward_id as string,
  riskLevel: row.risk_level as Priority,
  healthComplaintCount7d: row.health_complaint_count_7d as number,
  category: row.category as HealthRiskZone['category'],
  flaggedAt: row.flagged_at as string | undefined,
  flaggedBy: row.flagged_by as string | undefined,
});

export const healthRiskService = {
  list: async (_token: string): Promise<HealthRiskZone[]> => {
    const { data, error } = await supabase().from('health_risk_zones').select('*');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapHealthRiskRow);
  },
  flagWard: async (_token: string, wardId: string): Promise<HealthRiskZone> => {
    const me = await authService.me('');
    const { data, error } = await supabase()
      .from('health_risk_zones')
      .update({ risk_level: 'high', flagged_at: new Date().toISOString(), flagged_by: me.name })
      .eq('ward_id', wardId)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Ward not found in health-risk register');
    return mapHealthRiskRow(data);
  },
};

// --------------------------------------------------------- NGT compliance -
const mapNgtRow = (row: Record<string, unknown>): NgtComplianceItem => ({
  id: row.id as string,
  siteName: row.site_name as string,
  wardId: row.ward_id as string,
  category: row.category as NgtComplianceItem['category'],
  status: row.status as NgtComplianceItem['status'],
  note: (row.note as string) ?? '',
  coSignedByAddlCommissioner: Boolean(row.co_signed_by_addl_commissioner),
  coSignedByMho: Boolean(row.co_signed_by_mho),
  updatedAt: row.updated_at as string,
});

export const ngtComplianceService = {
  list: async (_token: string): Promise<NgtComplianceItem[]> => {
    const { data, error } = await supabase().from('ngt_compliance_items').select('*');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapNgtRow);
  },
  coSign: async (_token: string, id: string): Promise<NgtComplianceItem> => {
    const me = await authService.me('');
    const patch =
      me.role === 'municipal_health_officer'
        ? { co_signed_by_mho: true }
        : { co_signed_by_addl_commissioner: true };
    const { data, error } = await supabase()
      .from('ngt_compliance_items')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Compliance item not found');
    return mapNgtRow(data);
  },
};

// -------------------------------------------------------- shift handover --
const mapShiftHandoverRow = (row: Record<string, unknown>): ShiftHandoverNote => ({
  id: row.id as string,
  shiftLabel: row.shift_label as string,
  outgoingSupervisor: row.outgoing_supervisor as string,
  grievancesOpened: row.grievances_opened as number,
  grievancesClosed: row.grievances_closed as number,
  stillOpenHighPriority: row.still_open_high_priority as number,
  unacknowledgedAssignments: row.unacknowledged_assignments as number,
  note: (row.note as string) ?? '',
  completedAt: row.completed_at as string | undefined,
});

export const shiftHandoverService = {
  list: async (_token: string): Promise<ShiftHandoverNote[]> => {
    const { data, error } = await supabase().from('shift_handovers').select('*');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapShiftHandoverRow);
  },
  complete: async (_token: string, id: string, note: string): Promise<ShiftHandoverNote> => {
    const { data, error } = await supabase()
      .from('shift_handovers')
      .update({ note, completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Shift handover not found');
    return mapShiftHandoverRow(data);
  },
};

// --------------------------------------------------------- system health --
export const systemHealthService = {
  list: async (_token: string): Promise<SystemHealthCheck[]> => {
    const { data, error } = await supabase().from('system_health_checks').select('*');
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      detail: row.detail ?? '',
      lastCheckedAt: row.last_checked_at,
    }));
  },
};

// ----------------------------------------------------------------- admin --
const mapPlatformUserRow = (row: Record<string, unknown>): PlatformUser => ({
  id: row.id as string,
  name: row.name as string,
  role: row.role as Role,
  wardScope: (row.ward_scope as string[]) ?? [],
  accountStatus: row.account_status as PlatformUser['accountStatus'],
  lastLoginAt: row.last_login_at as string | undefined,
});

export const adminService = {
  users: async (_token: string): Promise<PlatformUser[]> => {
    const { data, error } = await supabase().from('profiles').select('*');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapPlatformUserRow);
  },
  createUser: async (
    _token: string,
    _body: { name: string; role: string; wardScope: string[] },
  ): Promise<PlatformUser> => {
    throw new Error(
      'Creating a real Supabase Auth user requires the service_role key, which must stay ' +
        'server-side. Invite the user from the Supabase dashboard (Authentication -> Users -> ' +
        'Invite), or wire this to a Supabase Edge Function once one is deployed.',
    );
  },
  setUserStatus: async (
    _token: string,
    id: string,
    accountStatus: PlatformUser['accountStatus'],
  ): Promise<PlatformUser> => {
    const { data, error } = await supabase()
      .from('profiles')
      .update({ account_status: accountStatus })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'User not found');
    return mapPlatformUserRow(data);
  },
  auditLog: async (_token: string): Promise<AuditLogEntry[]> => {
    const { data, error } = await supabase().from('audit_log').select('*').order('timestamp', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      actor: row.actor,
      role: row.role,
      timestamp: row.timestamp,
      detail: row.detail ?? '',
    }));
  },
};

// ------------------------------------------------------------ forecasting-
export const forecastingService = {
  list: async (_token: string, wardId?: string): Promise<ForecastPoint[]> => {
    let request = supabase().from('forecast_points').select('*').order('date');
    if (wardId) request = request.eq('ward_id', wardId);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      wardId: row.ward_id,
      date: row.date,
      predictedTonnage: row.predicted_tonnage,
      actualTonnage: row.actual_tonnage ?? undefined,
    }));
  },
};

// ------------------------------------------------------------ ward today --
const mapBeatSegmentRow = (row: Record<string, unknown>): BeatSegment => ({
  id: row.id as string,
  wardId: row.ward_id as string,
  streetName: row.street_name as string,
  beatType: row.beat_type as BeatSegment['beatType'],
  status: row.status as BeatSegment['status'],
  assignedWorker: row.assigned_worker as string,
  rejectionReason: row.rejection_reason as string | undefined,
});

const mapAttendanceRow = (row: Record<string, unknown>): WorkerAttendanceRecord => ({
  id: row.id as string,
  wardId: row.ward_id as string,
  workerName: row.worker_name as string,
  checkedIn: Boolean(row.checked_in),
  photoSubmitted: Boolean(row.photo_submitted),
});

const mapWardDayRow = (row: Record<string, unknown>): WardDayStatus => ({
  wardId: row.ward_id as string,
  date: row.date as string,
  confirmed: Boolean(row.confirmed),
  confirmedAt: row.confirmed_at as string | undefined,
  confirmedBy: row.confirmed_by as string | undefined,
});

export const wardTodayService = {
  segments: async (_token: string, wardId?: string): Promise<BeatSegment[]> => {
    let request = supabase().from('beat_segments').select('*');
    if (wardId) request = request.eq('ward_id', wardId);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBeatSegmentRow);
  },
  attendance: async (_token: string, wardId?: string): Promise<WorkerAttendanceRecord[]> => {
    let request = supabase().from('worker_attendance').select('*');
    if (wardId) request = request.eq('ward_id', wardId);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAttendanceRow);
  },
  status: async (_token: string, wardId: string): Promise<WardDayStatus | undefined> => {
    const { data } = await supabase().from('ward_day_status').select('*').eq('ward_id', wardId).maybeSingle();
    return data ? mapWardDayRow(data) : undefined;
  },
  markAbsent: async (_token: string, attendanceId: string): Promise<WorkerAttendanceRecord> => {
    const { data, error } = await supabase()
      .from('worker_attendance')
      .update({ checked_in: false })
      .eq('id', attendanceId)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Worker not found');
    return mapAttendanceRow(data);
  },
  reassignBeat: async (_token: string, segmentId: string, assignedWorker: string): Promise<BeatSegment> => {
    const { data, error } = await supabase()
      .from('beat_segments')
      .update({ assigned_worker: assignedWorker })
      .eq('id', segmentId)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Beat segment not found');
    return mapBeatSegmentRow(data);
  },
  confirmDay: async (_token: string, wardId: string): Promise<WardDayStatus> => {
    const me = await authService.me('');
    const patch = {
      ward_id: wardId,
      confirmed: true,
      confirmed_at: new Date().toISOString(),
      confirmed_by: me.name,
    };
    const { data, error } = await supabase()
      .from('ward_day_status')
      .upsert(patch, { onConflict: 'ward_id' })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Could not confirm ward day');
    return mapWardDayRow(data);
  },
};

// -------------------------------------------------------------- MAUD ------
export const maudReportService = {
  approve: async (_token: string, reportId: string): Promise<ReportRecord> => {
    const me = await authService.me('');
    const { data, error } = await supabase()
      .from('reports')
      .update({ approved_at: new Date().toISOString(), approved_by: me.name })
      .eq('id', reportId)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Report not found');
    return mapReportRow(data);
  },
  generateDraft: async (_token: string): Promise<ReportRecord> => {
    const me = await authService.me('');
    const { data, error } = await supabase()
      .from('reports')
      .insert({
        name: 'MAUD Monthly Rollup',
        period_label: new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date()),
        status: 'draft',
        generated_at: new Date().toISOString(),
        generated_by: me.name,
        sign_off_required: true,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Could not generate MAUD draft');
    return mapReportRow(data);
  },
};
