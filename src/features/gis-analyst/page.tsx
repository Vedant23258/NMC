import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { forecastingService, maudReportService, reportingService, verificationService } from '@/core/api/services';
import { useAuth } from '@/core/auth/auth-hooks';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel, LoadingPanel } from '@/shared/ui/state-panels';
import { formatDateTime, formatNumber } from '@/shared/utils/format';

export const GisAnalystPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const anomaliesQuery = useQuery({
    queryKey: ['verification-anomalies'],
    queryFn: () => verificationService.anomalies(token!),
  });

  const forecastQuery = useQuery({
    queryKey: ['forecasting'],
    queryFn: () => forecastingService.list(token!),
  });

  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportingService.list(token!),
  });

  const generateDraftMutation = useMutation({
    mutationFn: () => maudReportService.generateDraft(token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  return (
    <>
      <PageHeader
        title="Anomaly Review, GIS & Forecasting"
        description="Data-quality engine room: dispositions anomaly flags, manages the ward geometry layer, drafts the MAUD monthly report, and runs the waste-generation forecast."
      />

      <div className="split-layout">
        <div>
          <Card title="Anomaly review queue" description="Capacity-bound and uniform-value pattern flags surfaced by the plausibility engine.">
            {anomaliesQuery.isLoading ? <LoadingPanel label="Loading anomaly queue..." /> : null}
            {anomaliesQuery.isError ? <ErrorPanel error={anomaliesQuery.error} /> : null}
            {anomaliesQuery.data?.length === 0 ? <p className="muted">No open anomalies.</p> : null}
            {anomaliesQuery.data?.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="inline-actions">
                  <strong>{item.verificationRecordId}</strong>
                  <Badge value={item.severity} tone={item.severity} />
                  <Badge value={item.status} tone={item.status} />
                </div>
                <p>
                  {formatNumber(item.variancePercent)}% variance against {item.thresholdPercent}% threshold.
                </p>
                <span className="muted">{item.note}</span>
              </div>
            ))}
          </Card>

          <Card
            title="GIS Layer Manager"
            description="PostGIS ward-boundary/geofence editor status."
          >
            <div className="banner">
              <span>
                Ward 16 pilot: real road-network geometry received from NMC and live on the
                Monitoring Wall. The remaining 53 wards' official shapefile has not yet been
                received — an interim hand-digitised boundary set is in use for those so no other
                module is blocked.
              </span>
            </div>
            <dl className="details-list">
              <dt>Ward 16</dt>
              <dd><Badge value="live" tone="active" /> Real road-network geometry (79 segments)</dd>
              <dt>Remaining 53 wards</dt>
              <dd><Badge value="pending" tone="pending" /> Interim hand-digitised placeholder</dd>
            </dl>
          </Card>
        </div>

        <div>
          <Card
            title="Report Builder — MAUD Monthly Format"
            description="Auto-populates every MAUD field from the verified ward-entry and weighbridge pipeline."
            actions={
              <Button onClick={() => generateDraftMutation.mutate()} disabled={generateDraftMutation.isPending}>
                Generate Draft
              </Button>
            }
          >
            {generateDraftMutation.isError ? <ErrorPanel error={generateDraftMutation.error} /> : null}
            {reportsQuery.data
              ?.filter((report) => report.name === 'MAUD Monthly Rollup')
              .map((report) => (
                <div key={report.id} className="timeline-item">
                  <div className="inline-actions">
                    <strong>{report.periodLabel}</strong>
                    <Badge value={report.status} tone={report.status} />
                  </div>
                  <span className="muted">
                    {report.generatedAt ? `Drafted ${formatDateTime(report.generatedAt)} by ${report.generatedBy}` : 'Not yet generated'}
                  </span>
                  {report.approvedAt ? (
                    <span className="muted">Approved by {report.approvedBy} on {formatDateTime(report.approvedAt)}</span>
                  ) : null}
                </div>
              ))}
          </Card>

          <Card title="Forecasting Console" description="statsmodels-based next-7-day tonnage prediction, retrained on new ward-entry inserts.">
            {forecastQuery.isLoading ? <LoadingPanel label="Loading forecast..." /> : null}
            {forecastQuery.data?.map((point) => (
              <div key={`${point.wardId}-${point.date}`} className="timeline-item">
                <div className="inline-actions">
                  <strong>{point.wardId.toUpperCase()}</strong>
                  <span className="muted">{point.date}</span>
                </div>
                <p>
                  Predicted {formatNumber(point.predictedTonnage)}t
                  {point.actualTonnage !== undefined ? ` · Actual ${formatNumber(point.actualTonnage)}t` : ' · Actual pending'}
                </p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
};
