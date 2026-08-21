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
        description="Registry views stay GIS-ready while not inventing unsupported ward boundary integrations."
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

      <Card title="Integration posture" description="Ready for future GIS and live route master integration without coupling to placeholder geometry.">
        <p className="muted">Last vehicle master refresh visible in mock mode: {formatDateTime('2026-08-16T09:00:00+05:30')}</p>
      </Card>
    </>
  );
};
