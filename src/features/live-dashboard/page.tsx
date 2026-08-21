import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService, registryService } from '@/core/api/services';
import { useAuth } from '@/core/auth/auth-hooks';
import { appEnv } from '@/core/config/env';
import { createPollingClient } from '@/core/realtime/polling-client';
import { PageHeader } from '@/shared/ui/page-header';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { ErrorPanel, LoadingPanel } from '@/shared/ui/state-panels';
import { FilterBar } from '@/shared/ui/filter-bar';
import { KpiCard } from '@/shared/ui/kpi-card';
import { formatDateTime } from '@/shared/utils/format';
import { WardMap } from '@/features/live-dashboard/ward-map';

const buildClient = (token: string) =>
  createPollingClient(async ({ wardId }: { wardId?: string }) =>
    dashboardService.getSummary(token, wardId),
  );

export const DashboardPage = () => {
  const { token } = useAuth();
  const [wardId, setWardId] = useState('');
  const realtimeClient = buildClient(token!);

  const wardsQuery = useQuery({
    queryKey: ['wards'],
    queryFn: () => registryService.wards(token!),
  });

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary', wardId],
    queryFn: () => realtimeClient.getSnapshot({ wardId: wardId || undefined }),
    refetchInterval: appEnv.realtimePollMs,
  });

  return (
    <>
      <PageHeader
        title="Live Operations Dashboard"
        description="Operational overview for complaints, weighbridge movement, verification, and enforcement."
        actions={
          <Button variant="secondary" onClick={() => void summaryQuery.refetch()}>
            Refresh
          </Button>
        }
      />

      <FilterBar
        aside={
          <div className="inline-actions">
            <Badge value={summaryQuery.data?.status ?? 'idle'} tone={summaryQuery.data?.status ?? 'neutral'} />
            <span className="muted">
              Last updated {formatDateTime(summaryQuery.data?.lastUpdatedAt)}
            </span>
          </div>
        }
      >
        <label>
          Ward
          <select value={wardId} onChange={(event) => setWardId(event.target.value)}>
            <option value="">All dashboard wards</option>
            {wardsQuery.data?.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      {summaryQuery.isLoading ? <LoadingPanel /> : null}
      {summaryQuery.isError ? <ErrorPanel error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} /> : null}
      {summaryQuery.data?.data ? (
        <>
          <div className="metrics-grid">
            <KpiCard label="Active complaints" value={summaryQuery.data.data.activeComplaints} />
            <KpiCard label="Pending SLA focus items" value={summaryQuery.data.data.pendingSlaBreaches} />
            <KpiCard label="Weighbridge active vehicles" value={summaryQuery.data.data.weighbridgeActiveVehicles} helper="Allipuram live/manual feed" />
            <KpiCard label="Flagged verifications" value={summaryQuery.data.data.flaggedVerifications} />
            <KpiCard label="Open enforcement actions" value={summaryQuery.data.data.openEnforcementActions} />
          </div>

          <WardMap />

          <div className="split-layout">
            <div>
              <Card title="Ward-level overview" description="Current operational concentration across wards in dashboard scope.">
                <div className="activity-list">
                  {summaryQuery.data.data.wardOverview.map((item) => (
                    <div key={item.wardId} className="activity-item">
                      <strong>{item.wardId.toUpperCase()}</strong>
                      <p>
                        {item.complaintCount} active complaints, {item.weighbridgeTrips} weighbridge trips, {item.flaggedRecords} flagged verification records.
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div>
              <Card title="Operational alerts" description="Designed alerts only. Pending/blocked integrations remain explicitly marked.">
                <div className="alert-list">
                  {summaryQuery.data.data.alerts.map((alert) => (
                    <div key={alert.id} className="alert-item">
                      <div className="inline-actions">
                        <strong>{alert.title}</strong>
                        <Badge value={alert.severity} tone={alert.severity} />
                      </div>
                      <p>{alert.message}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <Card title="Recent activity" description="Recent dashboard-visible events across live and manual flows.">
            <div className="activity-list">
              {summaryQuery.data.data.recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <strong>{activity.title}</strong>
                  <p>{activity.description}</p>
                  <span className="muted">{formatDateTime(activity.timestamp)}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </>
  );
};
