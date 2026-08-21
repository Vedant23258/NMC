import { http, HttpResponse } from 'msw';
import {
  anomalies,
  complaints,
  enforcementRecords,
  getDashboardSummary,
  notifications,
  reports,
  users,
  vehicles,
  verificationRecords,
  wards,
  weighbridgeEntries,
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

  http.get(`${api}/verification/:id`, ({ params, request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    const item = verificationRecords.find((record) => record.id === params.id);
    if (!item) return HttpResponse.json({ message: 'Verification record not found' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.get(`${api}/verification/anomalies`, ({ request }) => {
    const user = requireUser(request);
    if (user instanceof HttpResponse) return user;
    return HttpResponse.json(anomalies);
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
];
