import { http, HttpResponse } from 'msw';
import {
  anomalies,
  auditLog,
  beatSegments,
  complaints,
  directives,
  enforcementRecords,
  forecastPoints,
  getDashboardSummary,
  healthRiskZones,
  ngtComplianceItems,
  notifications,
  platformUsers,
  reports,
  shiftHandovers,
  systemHealthChecks,
  users,
  vehicles,
  verificationRecords,
  wardDayStatuses,
  wards,
  weighbridgeEntries,
  workerAttendance,
} from '@/mocks/data/db';

const api = '/api';

const getTokenRole = (request: Request) => {
  const auth = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return undefined;
  const [, role] = auth.split('token-');
  return role as keyof typeof users | undefined;
};

const requireUser = (request: Request) => {
  const role = getTokenRole(request);
  if (!role || !users[role]) {
    return HttpResponse.json({ message: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
  }
  return users[role];
};

const paginate = <T>(items: T[], url: URL) => {
  const page = Number(url.searchParams.get('page') ?? 1);
  const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
};

const filterCommon = <T>(items: T[], url: URL) => {
  const search = url.searchParams.get('search')?.toLowerCase().trim();
  const wardId = url.searchParams.get('wardId');
  const status = url.searchParams.get('status');
  return items.filter((item) => {
    const record = item as Record<string, unknown>;
    const matchesSearch =
      !search ||
      JSON.stringify(record)
        .toLowerCase()
        .includes(search);
    const matchesWard =
      !wardId || record.wardId === wardId || record.assignedWardId === wardId;
    const matchesStatus = !status || record.status === status;
    return matchesSearch && matchesWard && matchesStatus;
  });
};

export const handlers = [
  http.post(`${api}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { role: keyof typeof users };
    const user = users[body.role];
    if (!user) {
      return HttpResponse.json({ message: 'Unknown role', code: 'invalid_role' }, { status: 422 });
    }
    return HttpResponse.json({
      token: `token-${user.role}`,
      user,
    });
  }),

  http.get(`${api}/auth/me`, ({ request }) => {
    const result = requireUser(request);
    if (result instanceof HttpResponse) return result;
    return HttpResponse.json(result);
  }),

  http.post(`${api}/auth/logout`, () => HttpResponse.json({ ok: true })),

  http.post(`${api}/auth/2fa/verify`, async ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const body = (await request.json()) as { code: string };
    const verified = user.role === 'commissioner' && body.code === '240816';
    return HttpResponse.json({
      verified,
      message: verified ? 'Commissioner sign-off verified.' : 'Invalid verification code for mock sign-off.',
    });
  }),

  http.get(`${api}/dashboard/summary`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(getDashboardSummary());
  }),

  http.get(`${api}/complaints`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const url = new URL(request.url);
    return HttpResponse.json(paginate(filterCommon(complaints, url), url));
  }),

  http.get(`${api}/complaints/:id`, ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const item = complaints.find((record) => record.id === params.id);
    if (!item) return HttpResponse.json({ message: 'Complaint not found' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.patch(`${api}/complaints/:id`, async ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const item = complaints.find((record) => record.id === params.id);
    if (!item) return HttpResponse.json({ message: 'Complaint not found' }, { status: 404 });
    const body = (await request.json()) as Partial<typeof item>;
    Object.assign(item, body);
    item.timeline = [
      ...item.timeline,
      {
        id: crypto.randomUUID(),
        type: 'status_changed',
        actor: users[getTokenRole(request) ?? 'ccc_operator'].name,
        timestamp: '2026-08-16T09:50:00+05:30',
        note: 'Complaint updated from dashboard.',
      },
    ];
    return HttpResponse.json(item);
  }),

  http.get(`${api}/weighbridge`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const url = new URL(request.url);
    return HttpResponse.json(paginate(filterCommon(weighbridgeEntries, url), url));
  }),

  http.get(`${api}/weighbridge/:id`, ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const item = weighbridgeEntries.find((record) => record.id === params.id);
    if (!item) return HttpResponse.json({ message: 'Weighbridge entry not found' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.get(`${api}/verification`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const url = new URL(request.url);
    return HttpResponse.json(paginate(filterCommon(verificationRecords, url), url));
  }),

  http.get(`${api}/verification/anomalies`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(anomalies);
  }),

  http.get(`${api}/verification/:id`, ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const item = verificationRecords.find((record) => record.id === params.id);
    if (!item) return HttpResponse.json({ message: 'Verification record not found' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.get(`${api}/registry/wards`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(wards);
  }),

  http.get(`${api}/registry/vehicles`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const url = new URL(request.url);
    return HttpResponse.json(paginate(filterCommon(vehicles, url), url));
  }),

  http.get(`${api}/enforcement`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const url = new URL(request.url);
    return HttpResponse.json(paginate(filterCommon(enforcementRecords, url), url));
  }),

  http.get(`${api}/enforcement/:id`, ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const item = enforcementRecords.find((record) => record.id === params.id);
    if (!item) return HttpResponse.json({ message: 'Enforcement record not found' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.get(`${api}/reports`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(reports);
  }),

  http.post(`${api}/reports/:id/sign-off`, ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    if (user.role !== 'commissioner') {
      return HttpResponse.json({ message: 'Forbidden', code: 'forbidden' }, { status: 403 });
    }
    const report = reports.find((item) => item.id === params.id);
    if (!report) return HttpResponse.json({ message: 'Report not found' }, { status: 404 });
    report.signedOffAt = '2026-08-16T10:00:00+05:30';
    report.status = 'ready';
    return HttpResponse.json({
      entityId: report.id,
      entityType: 'report',
      action: 'commissioner_sign_off',
      actor: user.name,
      timestamp: report.signedOffAt,
      result: 'approved',
    });
  }),

  http.get(`${api}/notifications`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(notifications);
  }),

  http.get(`${api}/directives`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(directives);
  }),

  http.post(`${api}/directives`, async ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const body = (await request.json()) as Record<string, unknown>;
    const directive = {
      id: `dir-${crypto.randomUUID().slice(0, 8)}`,
      wardId: String(body.wardId ?? ''),
      issuedTo: String(body.issuedTo ?? ''),
      issuedBy: user.name,
      instruction: String(body.instruction ?? ''),
      status: 'open' as const,
      dueAt: String(body.dueAt ?? new Date().toISOString()),
      createdAt: new Date().toISOString(),
      relatedComplaintId: body.relatedComplaintId ? String(body.relatedComplaintId) : undefined,
    };
    directives.unshift(directive);
    return HttpResponse.json(directive, { status: 201 });
  }),

  http.get(`${api}/health-risk`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(healthRiskZones);
  }),

  http.post(`${api}/health-risk/flag`, async ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const body = (await request.json()) as { wardId: string };
    const zone = healthRiskZones.find((item) => item.wardId === body.wardId);
    if (!zone) return HttpResponse.json({ message: 'Ward not found in health-risk register' }, { status: 404 });
    zone.riskLevel = 'high';
    zone.flaggedAt = new Date().toISOString();
    zone.flaggedBy = user.name;
    return HttpResponse.json(zone);
  }),

  http.get(`${api}/ngt-compliance`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(ngtComplianceItems);
  }),

  http.post(`${api}/ngt-compliance/:id/co-sign`, ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const item = ngtComplianceItems.find((record) => record.id === params.id);
    if (!item) return HttpResponse.json({ message: 'Compliance item not found' }, { status: 404 });
    if (user.role === 'municipal_health_officer') item.coSignedByMho = true;
    if (user.role === 'additional_commissioner') item.coSignedByAddlCommissioner = true;
    item.updatedAt = new Date().toISOString();
    return HttpResponse.json(item);
  }),

  http.get(`${api}/shift-handover`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(shiftHandovers);
  }),

  http.post(`${api}/shift-handover/:id/complete`, async ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const item = shiftHandovers.find((record) => record.id === params.id);
    if (!item) return HttpResponse.json({ message: 'Shift handover not found' }, { status: 404 });
    const body = (await request.json()) as { note?: string };
    if (body.note) item.note = body.note;
    item.completedAt = new Date().toISOString();
    return HttpResponse.json(item);
  }),

  http.get(`${api}/system-health`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(systemHealthChecks);
  }),

  http.get(`${api}/admin/users`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(platformUsers);
  }),

  http.post(`${api}/admin/users`, async ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const body = (await request.json()) as { name: string; role: string; wardScope: string[] };
    if (!body.name || !body.role) {
      return HttpResponse.json({ message: 'Name and role are required' }, { status: 422 });
    }
    const created = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      name: body.name,
      role: body.role as keyof typeof users,
      wardScope: body.wardScope ?? [],
      accountStatus: 'active' as const,
      lastLoginAt: undefined,
    };
    platformUsers.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(`${api}/admin/users/:id`, async ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const item = platformUsers.find((record) => record.id === params.id);
    if (!item) return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    const body = (await request.json()) as Partial<typeof item>;
    Object.assign(item, body);
    return HttpResponse.json(item);
  }),

  http.get(`${api}/admin/audit-log`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(auditLog);
  }),

  http.get(`${api}/forecasting`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const url = new URL(request.url);
    const wardId = url.searchParams.get('wardId');
    return HttpResponse.json(wardId ? forecastPoints.filter((point) => point.wardId === wardId) : forecastPoints);
  }),

  http.post(`${api}/reports/:id/approve`, ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    if (user.role !== 'additional_commissioner') {
      return HttpResponse.json({ message: 'Forbidden', code: 'forbidden' }, { status: 403 });
    }
    const report = reports.find((item) => item.id === params.id);
    if (!report) return HttpResponse.json({ message: 'Report not found' }, { status: 404 });
    report.approvedAt = new Date().toISOString();
    report.approvedBy = user.name;
    return HttpResponse.json(report);
  }),

  http.get(`${api}/ward-today/segments`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const url = new URL(request.url);
    const wardId = url.searchParams.get('wardId');
    return HttpResponse.json(wardId ? beatSegments.filter((segment) => segment.wardId === wardId) : beatSegments);
  }),

  http.get(`${api}/ward-today/attendance`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const url = new URL(request.url);
    const wardId = url.searchParams.get('wardId');
    return HttpResponse.json(wardId ? workerAttendance.filter((record) => record.wardId === wardId) : workerAttendance);
  }),

  http.get(`${api}/ward-today/status`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const url = new URL(request.url);
    const wardId = url.searchParams.get('wardId');
    return HttpResponse.json(wardId ? wardDayStatuses.filter((status) => status.wardId === wardId) : wardDayStatuses);
  }),

  http.post(`${api}/ward-today/attendance/:id/mark-absent`, ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const record = workerAttendance.find((item) => item.id === params.id);
    if (!record) return HttpResponse.json({ message: 'Worker not found' }, { status: 404 });
    record.checkedIn = false;
    return HttpResponse.json(record);
  }),

  http.post(`${api}/ward-today/segments/:id/reassign`, async ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const segment = beatSegments.find((item) => item.id === params.id);
    if (!segment) return HttpResponse.json({ message: 'Beat segment not found' }, { status: 404 });
    const body = (await request.json()) as { assignedWorker: string };
    segment.assignedWorker = body.assignedWorker;
    return HttpResponse.json(segment);
  }),

  http.post(`${api}/ward-today/confirm-day`, async ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const body = (await request.json()) as { wardId: string };
    let status = wardDayStatuses.find((item) => item.wardId === body.wardId);
    if (!status) {
      status = { wardId: body.wardId, date: new Date().toISOString().slice(0, 10), confirmed: false };
      wardDayStatuses.push(status);
    }
    status.confirmed = true;
    status.confirmedAt = new Date().toISOString();
    status.confirmedBy = user.name;
    return HttpResponse.json(status);
  }),

  http.post(`${api}/reports/generate-maud-draft`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    if (user.role !== 'mis_gis_analyst') {
      return HttpResponse.json({ message: 'Forbidden', code: 'forbidden' }, { status: 403 });
    }
    const draft = {
      id: `rep-${crypto.randomUUID().slice(0, 8)}`,
      name: 'MAUD Monthly Rollup',
      periodLabel: new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date()),
      status: 'draft' as const,
      generatedAt: new Date().toISOString(),
      generatedBy: user.name,
      signOffRequired: true,
    };
    reports.unshift(draft);
    return HttpResponse.json(draft, { status: 201 });
  }),
];
