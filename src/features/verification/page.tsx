import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { registryService, verificationService } from '@/core/api/services';
import { useAuth } from '@/core/auth/auth-hooks';
import type { VerificationRecord } from '@/core/types/domain';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { FilterBar } from '@/shared/ui/filter-bar';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel, LoadingPanel } from '@/shared/ui/state-panels';
import { DataTable, PaginationControls, type ColumnDef } from '@/shared/tables/data-table';
import { formatNumber } from '@/shared/utils/format';

const columns: ColumnDef<VerificationRecord>[] = [
  { key: 'metric', header: 'Metric', render: (item) => item.metricName },
  { key: 'ward', header: 'Ward', render: (item) => item.wardId.toUpperCase() },
  { key: 'reported', header: 'Reported', render: (item) => formatNumber(item.reportedValue) },
  { key: 'verified', header: 'Verified', render: (item) => formatNumber(item.verifiedValue) },
  { key: 'variance', header: 'Variance', render: (item) => `${formatNumber(item.variancePercent)}%` },
  { key: 'status', header: 'Status', render: (item) => <Badge value={item.status} tone={item.status} /> },
];

export const VerificationPage = () => {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [wardId, setWardId] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string>();

  const wardsQuery = useQuery({
    queryKey: ['wards'],
    queryFn: () => registryService.wards(token!),
  });

  const listQuery = useQuery({
    queryKey: ['verification', page, search, wardId, status],
    queryFn: () => verificationService.list(token!, { page, pageSize: 8, search, wardId, status }),
  });

  const anomaliesQuery = useQuery({
    queryKey: ['verification-anomalies'],
    queryFn: () => verificationService.anomalies(token!),
  });

  const detailQuery = useQuery({
    queryKey: ['verification-detail', selectedId],
    queryFn: () => verificationService.detail(token!, selectedId!),
    enabled: Boolean(selectedId),
  });

  return (
    <>
      <PageHeader
        title="Verification and Anomalies"
        description="Review reported versus verified figures and surface backend-provided anomaly flags."
      />
      <FilterBar>
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Metric or period" />
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
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="flagged">Flagged</option>
          </select>
        </label>
      </FilterBar>

      <div className="split-layout">
        <div>
          {listQuery.isLoading ? <LoadingPanel /> : null}
          {listQuery.isError ? <ErrorPanel error={listQuery.error} /> : null}
          {listQuery.data ? (
            <>
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
            </>
          ) : null}
        </div>
        <div>
          <Card title="Selected verification record">
            {detailQuery.data ? (
              <dl className="details-list">
                <dt>Metric</dt>
                <dd>{detailQuery.data.metricName}</dd>
                <dt>Reporting period</dt>
                <dd>{detailQuery.data.reportingPeriod}</dd>
                <dt>Variance</dt>
                <dd>{formatNumber(detailQuery.data.variancePercent)}%</dd>
                <dt>Reviewed by</dt>
                <dd>{detailQuery.data.reviewedBy ?? 'Pending review'}</dd>
              </dl>
            ) : (
              <p className="muted">Select a verification row to inspect its review state.</p>
            )}
          </Card>
          <Card title="Anomaly queue" description="Threshold configuration remains replaceable and backend-driven.">
            {anomaliesQuery.isLoading ? <LoadingPanel label="Loading anomaly queue..." /> : null}
            {anomaliesQuery.data?.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="inline-actions">
                  <strong>{item.verificationRecordId}</strong>
                  <Badge value={item.severity} tone={item.severity} />
                </div>
                <p>{formatNumber(item.variancePercent)}% variance against {item.thresholdPercent}% threshold.</p>
                <span className="muted">{item.note}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
};
