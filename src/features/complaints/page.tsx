import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { complaintsService, registryService } from '@/core/api/services';
import { useAuth, useCapability } from '@/core/auth/auth-hooks';
import type { Complaint } from '@/core/types/domain';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { FilterBar } from '@/shared/ui/filter-bar';
import { PageHeader } from '@/shared/ui/page-header';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '@/shared/ui/state-panels';
import { formatDateTime, titleCase } from '@/shared/utils/format';

const columns: { status: Complaint['status']; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'assigned', label: 'Assigned' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'awaiting_closure', label: 'Field-Verified' },
  { status: 'closed', label: 'Closed' },
];

const priorityRank: Record<Complaint['priority'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
const slaHoursByPriority: Record<Complaint['priority'], number> = { critical: 4, high: 4, medium: 24, low: 72 };

const slaState = (item: Complaint): { tone: 'sla-ok' | 'sla-warning' | 'sla-breached'; label: string } => {
  if (item.status === 'closed') return { tone: 'sla-ok', label: 'Closed' };
  const remainingMs = new Date(item.dueAt).getTime() - Date.now();
  const remainingHours = remainingMs / 3_600_000;
  if (remainingHours <= 0) return { tone: 'sla-breached', label: 'SLA breached' };
  if (remainingHours <= slaHoursByPriority[item.priority] * 0.25) {
    return { tone: 'sla-warning', label: `${Math.ceil(remainingHours)}h left` };
  }
  return { tone: 'sla-ok', label: `${Math.ceil(remainingHours)}h left` };
};

export const ComplaintsPage = () => {
  const { token } = useAuth();
  const canDispatch = useCapability('dispatch_complaint');
  const canUpdate = useCapability('update_complaint');
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>();
  const [assigningId, setAssigningId] = useState<string>();
  const [assignee, setAssignee] = useState('');
  const [search, setSearch] = useState('');
  const [wardId, setWardId] = useState('');

  const wardsQuery = useQuery({
    queryKey: ['wards'],
    queryFn: () => registryService.wards(token!),
  });

  const complaintsQuery = useQuery({
    queryKey: ['complaints-board', search, wardId],
    queryFn: () => complaintsService.list(token!, { page: 1, pageSize: 100, search, wardId }),
  });

  const selectedQuery = useQuery({
    queryKey: ['complaint-detail', selectedId],
    queryFn: () => complaintsService.detail(token!, selectedId!),
    enabled: Boolean(selectedId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      complaintsService.update(token!, id, body),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['complaints-board'] });
      void queryClient.invalidateQueries({ queryKey: ['complaint-detail', variables.id] });
    },
  });

  const items = complaintsQuery.data?.items ?? [];
  const wardName = (id: string) => wardsQuery.data?.find((ward) => ward.id === id)?.name ?? id.toUpperCase();

  const grouped = columns.map((column) => ({
    ...column,
    items: items
      .filter((item) => item.status === column.status)
      .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]),
  }));

  return (
    <>
      <PageHeader
        title="Grievances"
        description="New → Assigned → In Progress → Field-Verified → Closed. Every citizen complaint converges here before it counts as resolved."
      />

      <FilterBar>
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference, location, category" />
        </label>
        <label>
          Ward
          <select value={wardId} onChange={(event) => setWardId(event.target.value)}>
            <option value="">All wards</option>
            {wardsQuery.data?.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      {complaintsQuery.isLoading ? <LoadingPanel /> : null}
      {complaintsQuery.isError ? (
        <ErrorPanel error={complaintsQuery.error} onRetry={() => void complaintsQuery.refetch()} />
      ) : null}

      {complaintsQuery.data ? (
        items.length === 0 ? (
          <EmptyPanel title="No grievances match the current filters" body="Try broadening the ward or text search criteria." />
        ) : (
          <div className="kanban-board">
            {grouped.map((column) => (
              <div key={column.status} className="kanban-column">
                <div className="kanban-column-header">
                  <span>{column.label}</span>
                  <span className="kanban-column-count">{column.items.length}</span>
                </div>
                {column.items.map((item) => {
                  const sla = slaState(item);
                  return (
                    <div
                      key={item.id}
                      className={`kanban-card priority-${item.priority}`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <span className="kanban-card-id">{item.citizenReference}</span>
                      <span className="kanban-card-title">{item.title}</span>
                      <span className="kanban-card-meta">
                        {wardName(item.wardId)} · {titleCase(item.category)}
                      </span>
                      <div className="inline-actions">
                        <Badge value={item.priority} tone={item.priority} />
                        <span className={`sla-chip ${sla.tone}`}>{sla.label}</span>
                      </div>
                      <span className="kanban-card-meta">Assigned to {item.assignedTo ?? 'Unassigned'}</span>

                      <div className="kanban-card-actions" onClick={(event) => event.stopPropagation()}>
                        <Button variant="secondary" onClick={() => setSelectedId(item.id)}>
                          Open
                        </Button>

                        {canDispatch && item.status === 'new' ? (
                          assigningId === item.id ? (
                            <>
                              <input
                                autoFocus
                                value={assignee}
                                onChange={(event) => setAssignee(event.target.value)}
                                placeholder="Ward Inspector or dispatch team"
                                style={{ minWidth: '10rem' }}
                              />
                              <Button
                                onClick={() => {
                                  updateMutation.mutate({
                                    id: item.id,
                                    body: { assignedTo: assignee || 'Zone Dispatch Cell', status: 'assigned' },
                                  });
                                  setAssigningId(undefined);
                                  setAssignee('');
                                }}
                              >
                                Confirm
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setAssigningId(item.id);
                                setAssignee(item.assignedTo ?? '');
                              }}
                            >
                              Assign
                            </Button>
                          )
                        ) : null}

                        {canUpdate && item.status === 'assigned' ? (
                          <Button
                            variant="secondary"
                            onClick={() => updateMutation.mutate({ id: item.id, body: { status: 'in_progress' } })}
                          >
                            Start Progress
                          </Button>
                        ) : null}

                        {canUpdate && item.status === 'in_progress' ? (
                          <Button
                            variant="secondary"
                            onClick={() => updateMutation.mutate({ id: item.id, body: { status: 'awaiting_closure' } })}
                          >
                            Mark Field-Verified
                          </Button>
                        ) : null}

                        {canUpdate && item.status === 'awaiting_closure' ? (
                          <Button
                            onClick={() =>
                              updateMutation.mutate({
                                id: item.id,
                                body: { status: 'closed', closedAt: new Date().toISOString() },
                              })
                            }
                          >
                            Close &amp; Notify Citizen
                          </Button>
                        ) : null}

                        {canDispatch && item.status !== 'closed' && item.priority !== 'critical' ? (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              updateMutation.mutate({
                                id: item.id,
                                body: {
                                  priority:
                                    item.priority === 'low' ? 'medium' : item.priority === 'medium' ? 'high' : 'critical',
                                },
                              })
                            }
                          >
                            Escalate
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {column.items.length === 0 ? <p className="muted">No grievances in this stage.</p> : null}
              </div>
            ))}
          </div>
        )
      ) : null}

      {updateMutation.isError ? <ErrorPanel error={updateMutation.error} /> : null}

      {selectedId ? (
        <Card title="Grievance detail" description="Routing, ETA, and full activity timeline.">
          {selectedQuery.isLoading ? <LoadingPanel label="Loading grievance detail..." /> : null}
          {selectedQuery.isError ? <ErrorPanel error={selectedQuery.error} /> : null}
          {selectedQuery.data ? (
            <div className="details-list">
              <div>
                <Badge value={selectedQuery.data.status} tone={selectedQuery.data.status} />
              </div>
              <dt>Grievance</dt>
              <dd>{selectedQuery.data.title}</dd>
              <dt>Location</dt>
              <dd>{selectedQuery.data.locationLabel}</dd>
              <dt>Ward</dt>
              <dd>{wardName(selectedQuery.data.wardId)}</dd>
              <dt>Current assignment</dt>
              <dd>{selectedQuery.data.assignedTo ?? 'Unassigned'}</dd>
              <Card title="Activity timeline">
                {selectedQuery.data.timeline.map((event) => (
                  <div key={event.id} className="timeline-item">
                    <strong>{titleCase(event.type)}</strong>
                    <p>{event.note}</p>
                    <span className="muted">
                      {event.actor} · {formatDateTime(event.timestamp)}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          ) : null}
        </Card>
      ) : null}
    </>
  );
};
