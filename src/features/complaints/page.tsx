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
import { DataTable, PaginationControls, type ColumnDef } from '@/shared/tables/data-table';
import { formatDateTime, titleCase } from '@/shared/utils/format';

const columns: ColumnDef<Complaint>[] = [
  { key: 'reference', header: 'Reference', render: (item) => item.citizenReference },
  { key: 'title', header: 'Complaint', render: (item) => <div><strong>{item.title}</strong><p className="muted">{item.locationLabel}</p></div> },
  { key: 'ward', header: 'Ward', render: (item) => item.wardId.toUpperCase() },
  { key: 'status', header: 'Status', render: (item) => <Badge value={item.status} tone={item.status} /> },
  { key: 'priority', header: 'Priority', render: (item) => <Badge value={item.priority} tone={item.priority} /> },
  { key: 'due', header: 'Due', render: (item) => formatDateTime(item.dueAt) },
];

export const ComplaintsPage = () => {
  const { token } = useAuth();
  const canDispatch = useCapability('dispatch_complaint');
  const canUpdate = useCapability('update_complaint');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>();
  const [search, setSearch] = useState('');
  const [wardId, setWardId] = useState('');
  const [status, setStatus] = useState('');

  const wardsQuery = useQuery({
    queryKey: ['wards'],
    queryFn: () => registryService.wards(token!),
  });

  const complaintsQuery = useQuery({
    queryKey: ['complaints', page, search, wardId, status],
    queryFn: () =>
      complaintsService.list(token!, {
        page,
        pageSize: 8,
        search,
        wardId,
        status,
      }),
  });

  const selectedQuery = useQuery({
    queryKey: ['complaint-detail', selectedId],
    queryFn: () => complaintsService.detail(token!, selectedId!),
    enabled: Boolean(selectedId),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => complaintsService.update(token!, selectedId!, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['complaints'] });
      void queryClient.invalidateQueries({ queryKey: ['complaint-detail', selectedId] });
    },
  });

  return (
    <>
      <PageHeader
        title="Complaints"
        description="List, track, route, and close sanitation complaints without assuming unsupported backend workflows."
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
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In progress</option>
            <option value="awaiting_closure">Awaiting closure</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </FilterBar>

      {complaintsQuery.isLoading ? <LoadingPanel /> : null}
      {complaintsQuery.isError ? <ErrorPanel error={complaintsQuery.error} onRetry={() => void complaintsQuery.refetch()} /> : null}
      {complaintsQuery.data ? (
        <div className="split-layout">
          <div>
            {complaintsQuery.data.items.length ? (
              <>
                <DataTable
                  columns={columns}
                  rows={complaintsQuery.data.items}
                  keyField={(item) => item.id}
                  onRowClick={(item) => setSelectedId(item.id)}
                />
                <PaginationControls
                  page={complaintsQuery.data.page}
                  pageSize={complaintsQuery.data.pageSize}
                  total={complaintsQuery.data.total}
                  onPageChange={setPage}
                />
              </>
            ) : (
              <EmptyPanel title="No complaints match the current filters" body="Try broadening the ward, status, or text search criteria." />
            )}
          </div>

          <Card title="Complaint detail" description="Routing, ETA, closure, and activity timeline.">
            {!selectedId ? <EmptyPanel title="Select a complaint" body="Choose a row to review its operational timeline and available actions." /> : null}
            {selectedQuery.isLoading ? <LoadingPanel label="Loading complaint detail..." /> : null}
            {selectedQuery.isError ? <ErrorPanel error={selectedQuery.error} /> : null}
            {selectedQuery.data ? (
              <div className="details-list">
                <div>
                  <Badge value={selectedQuery.data.status} tone={selectedQuery.data.status} />
                </div>
                <dt>Complaint</dt>
                <dd>{selectedQuery.data.title}</dd>
                <dt>Location</dt>
                <dd>{selectedQuery.data.locationLabel}</dd>
                <dt>Ward</dt>
                <dd>{selectedQuery.data.wardId.toUpperCase()}</dd>
                <dt>ETA</dt>
                <dd>{selectedQuery.data.etaMinutes ? `${selectedQuery.data.etaMinutes} minutes` : 'Not assigned'}</dd>
                <dt>Current assignment</dt>
                <dd>{selectedQuery.data.assignedTo ?? 'Unassigned'}</dd>
                {(canDispatch || canUpdate) && (
                  <>
                    <div className="inline-actions">
                      {canDispatch ? (
                        <Button
                          onClick={() => updateMutation.mutate({ assignedTo: 'South Zone Dispatch', status: 'assigned' })}
                        >
                          Route
                        </Button>
                      ) : null}
                      {canUpdate ? (
                        <Button
                          variant="secondary"
                          onClick={() => updateMutation.mutate({ status: 'closed', closedAt: new Date().toISOString() })}
                        >
                          Close
                        </Button>
                      ) : null}
                    </div>
                    {updateMutation.isError ? <ErrorPanel error={updateMutation.error} /> : null}
                  </>
                )}
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
        </div>
      ) : null}
    </>
  );
};
