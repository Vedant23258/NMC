import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { registryService } from '@/core/api/services';
import { useAuth } from '@/core/auth/auth-hooks';
import type { Vehicle } from '@/core/types/domain';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { DataTable, PaginationControls, type ColumnDef } from '@/shared/tables/data-table';
import { LoadingPanel } from '@/shared/ui/state-panels';
import { formatDateTime } from '@/shared/utils/format';

const vehicleColumns: ColumnDef<Vehicle>[] = [
  { key: 'number', header: 'Vehicle', render: (item) => item.registrationNumber },
  { key: 'type', header: 'Type', render: (item) => item.type },
  { key: 'ward', header: 'Assigned ward', render: (item) => item.assignedWardId.toUpperCase() },
  { key: 'route', header: 'Route', render: (item) => item.assignedRoute },
  { key: 'status', header: 'Status', render: (item) => <Badge value={item.status} tone={item.status} /> },
];

export const RegistryPage = () => {
  const { token } = useAuth();
  const [page, setPage] = useState(1);

  const wardsQuery = useQuery({
    queryKey: ['registry-wards'],
    queryFn: () => registryService.wards(token!),
  });
  const vehiclesQuery = useQuery({
    queryKey: ['registry-vehicles', page],
    queryFn: () => registryService.vehicles(token!, { page, pageSize: 8 }),
  });

  return (
    <>
      <PageHeader
        title="Ward and Vehicle Registry"
        description="Master data lookup: every ward NMC operates and every fleet vehicle assigned to it. Read-only reference — not where you take action, just where you check 'which ward is this, what's its status, which vehicle serves it.'"
      />

      <div className="registry-grid">
        <Card title="Wards">
          {wardsQuery.isLoading ? <LoadingPanel label="Loading ward registry..." /> : null}
          {wardsQuery.data?.map((ward) => (
            <div key={ward.id} className="timeline-item">
              <div className="inline-actions">
                <strong>{ward.name}</strong>
                <Badge value={ward.operationalStatus} tone={ward.operationalStatus} />
              </div>
              <p>
                {ward.zone} · {ward.populationBand}
              </p>
              <span className="muted">{ward.routeSummary ?? 'Route summary pending'}</span>
            </div>
          ))}
        </Card>

        <Card title="Vehicles">
          {vehiclesQuery.data ? (
            <>
              <DataTable columns={vehicleColumns} rows={vehiclesQuery.data.items} keyField={(item) => item.id} />
              <PaginationControls
                page={vehiclesQuery.data.page}
                pageSize={vehiclesQuery.data.pageSize}
                total={vehiclesQuery.data.total}
                onPageChange={setPage}
              />
            </>
          ) : null}
        </Card>
      </div>

      <Card title="What's not here yet" description="Gaps against the full architecture — flagged rather than hidden.">
        <p className="muted">
          No worker roster (that lives on the Ward Sanitary Inspector's My Ward Today page, scoped
          per ward). No street/beat-segment list at city level. Ward boundaries are placeholder
          geometry except Ward 16 (see the Monitoring Wall map) — vehicle GPS positions aren't
          live yet either, since the fleet data-feed access from the contractor is still pending.
        </p>
        <p className="muted">Last vehicle master refresh (mock mode): {formatDateTime('2026-08-16T09:00:00+05:30')}</p>
      </Card>
    </>
  );
};
