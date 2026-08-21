import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { registryService, weighbridgeService } from '@/core/api/services';
import { useAuth } from '@/core/auth/auth-hooks';
import type { WeighbridgeEntry } from '@/core/types/domain';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { FilterBar } from '@/shared/ui/filter-bar';
import { PageHeader } from '@/shared/ui/page-header';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '@/shared/ui/state-panels';
import { DataTable, PaginationControls, type ColumnDef } from '@/shared/tables/data-table';
import { formatDateTime, formatNumber } from '@/shared/utils/format';

const columns: ColumnDef<WeighbridgeEntry>[] = [
  { key: 'vehicle', header: 'Vehicle', render: (item) => item.vehicleNumber },
  { key: 'ward', header: 'Ward', render: (item) => item.wardId.toUpperCase() },
  { key: 'weight', header: 'Weight', render: (item) => `${formatNumber(item.weightTonnes)} t` },
  { key: 'status', header: 'Status', render: (item) => <Badge value={item.status} tone={item.status} /> },
  { key: 'feed', header: 'Feed', render: (item) => <Badge value={item.feedStatus} tone={item.feedStatus} /> },
  { key: 'timeIn', header: 'Time in', render: (item) => formatDateTime(item.timeIn) },
];

export const WeighbridgePage = () => {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [wardId, setWardId] = useState('');
  const [selectedId, setSelectedId] = useState<string>();

  const wardsQuery = useQuery({
    queryKey: ['wards'],
    queryFn: () => registryService.wards(token!),
  });

  const listQuery = useQuery({
    queryKey: ['weighbridge', page, search, wardId],
    queryFn: () => weighbridgeService.list(token!, { page, pageSize: 8, search, wardId }),
  });

  const detailQuery = useQuery({
    queryKey: ['weighbridge-detail', selectedId],
    queryFn: () => weighbridgeService.detail(token!, selectedId!),
    enabled: Boolean(selectedId),
  });

  return (
    <>
      <PageHeader
        title="Weighbridge Monitoring"
        description="Live and manual review visibility for Allipuram weighbridge activity. QR scanning is intentionally not implemented."
      />

      <FilterBar>
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Vehicle or location" />
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

      {listQuery.isLoading ? <LoadingPanel /> : null}
      {listQuery.isError ? <ErrorPanel error={listQuery.error} /> : null}
      {listQuery.data ? (
        <div className="split-layout">
          <div>
            <DataTable
              columns={columns}
              rows={listQuery.data.items}
              keyField={(item) => item.id}
              onRowClick={(item) => setSelectedId(item.id)}
            />
            <PaginationControls
              page={listQuery.data.page}
              pageSize={listQuery.data.pageSize}
              total={listQuery.data.total}
              onPageChange={setPage}
            />
          </div>
          <Card title="Weighbridge detail">
            {!selectedId ? <EmptyPanel title="Select an entry" body="Choose a weighbridge row to inspect status, timings, and feed freshness." /> : null}
            {detailQuery.data ? (
              <dl className="details-list">
                <dt>Vehicle</dt>
                <dd>{detailQuery.data.vehicleNumber}</dd>
                <dt>Location</dt>
                <dd>{detailQuery.data.location}</dd>
                <dt>Ward</dt>
                <dd>{detailQuery.data.wardId.toUpperCase()}</dd>
                <dt>Weight</dt>
                <dd>{formatNumber(detailQuery.data.weightTonnes)} tonnes</dd>
                <dt>Time in</dt>
                <dd>{formatDateTime(detailQuery.data.timeIn)}</dd>
                <dt>Time out</dt>
                <dd>{formatDateTime(detailQuery.data.timeOut)}</dd>
              </dl>
            ) : null}
          </Card>
        </div>
      ) : null}
    </>
  );
};
