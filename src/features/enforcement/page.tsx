import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enforcementService, registryService } from '@/core/api/services';
import { useAuth } from '@/core/auth/auth-hooks';
import type { EnforcementRecord } from '@/core/types/domain';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { FilterBar } from '@/shared/ui/filter-bar';
import { PageHeader } from '@/shared/ui/page-header';
import { DataTable, type ColumnDef } from '@/shared/tables/data-table';
import { formatDateTime, titleCase } from '@/shared/utils/format';

const formatFine = (item: EnforcementRecord) =>
  item.fineAmount === undefined ? '—' : `₹${item.fineAmount.toLocaleString('en-IN')}`;

const columns: ColumnDef<EnforcementRecord>[] = [
  { key: 'type', header: 'Type', render: (item) => titleCase(item.type) },
  { key: 'subject', header: 'Subject', render: (item) => item.subject },
  { key: 'ward', header: 'Ward', render: (item) => item.wardId.toUpperCase() },
  { key: 'status', header: 'Status', render: (item) => <Badge value={item.status} tone={item.status} /> },
  {
    key: 'fine',
    header: 'Fine',
    render: (item) => (
      <>
        {formatFine(item)}
        {item.fineStatus ? <Badge value={item.fineStatus} tone={item.fineStatus === 'paid' ? 'active' : item.fineStatus === 'waived' ? 'pending' : 'unavailable'} /> : null}
      </>
    ),
  },
  { key: 'photo', header: 'Evidence', render: (item) => <Badge value={item.evidencePhotoAttached ? 'attached' : 'pending'} tone={item.evidencePhotoAttached ? 'active' : 'pending'} /> },
  { key: 'officer', header: 'Officer', render: (item) => item.officer },
];

export const EnforcementPage = () => {
  const { token } = useAuth();
  const [wardId, setWardId] = useState('');
  const [selectedId, setSelectedId] = useState<string>();

  const wardsQuery = useQuery({
    queryKey: ['wards'],
    queryFn: () => registryService.wards(token!),
  });
  const listQuery = useQuery({
    queryKey: ['enforcement', wardId],
    queryFn: () => enforcementService.list(token!, { wardId, page: 1, pageSize: 20 }),
  });
  const detailQuery = useQuery({
    queryKey: ['enforcement-detail', selectedId],
    queryFn: () => enforcementService.detail(token!, selectedId!),
    enabled: Boolean(selectedId),
  });

  return (
    <>
      <PageHeader
        title="Enforcement"
        description="SUP seizure, BWG, and challan visibility aligned to the system architecture without inventing extra process types."
      />
      <FilterBar>
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
      <div className="split-layout">
        <div>
          {listQuery.data ? (
            <DataTable columns={columns} rows={listQuery.data.items} keyField={(item) => item.id} onRowClick={(item) => setSelectedId(item.id)} />
          ) : null}
        </div>
        <Card title="Record detail">
          {detailQuery.data ? (
            <dl className="details-list">
              <dt>Type</dt>
              <dd>{titleCase(detailQuery.data.type)}</dd>
              <dt>Status</dt>
              <dd>{titleCase(detailQuery.data.status)}</dd>
              <dt>Officer</dt>
              <dd>{detailQuery.data.officer}</dd>
              <dt>Fine amount</dt>
              <dd>
                {formatFine(detailQuery.data)}
                {detailQuery.data.fineStatus ? ` · ${titleCase(detailQuery.data.fineStatus)}` : ''}
                {detailQuery.data.type !== 'challan' ? ' (not applicable to this action type)' : ''}
              </dd>
              <dt>Photo evidence</dt>
              <dd>
                {detailQuery.data.evidencePhotoAttached ? 'Attached' : 'Not yet attached'}
                {detailQuery.data.evidenceNote ? ` — ${detailQuery.data.evidenceNote}` : ''}
              </dd>
              <dt>Created</dt>
              <dd>{formatDateTime(detailQuery.data.createdAt)}</dd>
              <dt>Updated</dt>
              <dd>{formatDateTime(detailQuery.data.updatedAt)}</dd>
            </dl>
          ) : (
            <p className="muted">Select an enforcement record to review its current status.</p>
          )}
        </Card>
      </div>
    </>
  );
};
