import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { healthRiskService, ngtComplianceService, registryService } from '@/core/api/services';
import { useAuth, useCapability } from '@/core/auth/auth-hooks';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel, LoadingPanel } from '@/shared/ui/state-panels';
import { formatDateTime } from '@/shared/utils/format';

export const HealthRiskPage = () => {
  const { token, currentUser } = useAuth();
  const canFlag = useCapability('flag_health_risk');
  const queryClient = useQueryClient();

  const wardsQuery = useQuery({
    queryKey: ['wards'],
    queryFn: () => registryService.wards(token!),
  });

  const healthRiskQuery = useQuery({
    queryKey: ['health-risk'],
    queryFn: () => healthRiskService.list(token!),
  });

  const ngtQuery = useQuery({
    queryKey: ['ngt-compliance'],
    queryFn: () => ngtComplianceService.list(token!),
  });

  const flagMutation = useMutation({
    mutationFn: (wardId: string) => healthRiskService.flagWard(token!, wardId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['health-risk'] }),
  });

  const coSignMutation = useMutation({
    mutationFn: (id: string) => ngtComplianceService.coSign(token!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['ngt-compliance'] }),
  });

  const wardName = (wardId: string) =>
    wardsQuery.data?.find((ward) => ward.id === wardId)?.name ?? wardId.toUpperCase();

  return (
    <>
      <PageHeader
        title="Health Risk Monitor & NGT Compliance"
        description="Ward health-linked grievance density, health-risk zone flagging, and legacy/liquid-waste NGT filing status."
      />

      <div className="split-layout">
        <div>
          <Card title="Health risk zones" description="Wards flagged by health-linked complaint density over a rolling 7-day window.">
            {healthRiskQuery.isLoading ? <LoadingPanel /> : null}
            {healthRiskQuery.isError ? <ErrorPanel error={healthRiskQuery.error} /> : null}
            {healthRiskQuery.data?.map((zone) => (
              <div key={zone.id} className="timeline-item">
                <div className="inline-actions">
                  <strong>{wardName(zone.wardId)}</strong>
                  <Badge value={zone.riskLevel} tone={zone.riskLevel} />
                </div>
                <p>
                  {zone.healthComplaintCount7d} health-linked complaints (7d) · category: {zone.category.replace(/_/g, ' ')}
                </p>
                <span className="muted">
                  {zone.flaggedAt ? `Flagged by ${zone.flaggedBy} on ${formatDateTime(zone.flaggedAt)}` : 'Not yet flagged as a priority zone'}
                </span>
                {canFlag && zone.riskLevel !== 'high' ? (
                  <Button variant="secondary" onClick={() => flagMutation.mutate(zone.wardId)} disabled={flagMutation.isPending}>
                    Flag Ward as Health-Risk Zone
                  </Button>
                ) : null}
              </div>
            ))}
            {flagMutation.isError ? <ErrorPanel error={flagMutation.error} /> : null}
          </Card>
        </div>

        <div>
          <Card title="NGT / Legacy Waste Compliance" description="Remediation-site status and liquid-waste treatment indicators, co-signed by the MHO and Additional Commissioner.">
            {ngtQuery.isLoading ? <LoadingPanel /> : null}
            {ngtQuery.data?.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="inline-actions">
                  <strong>{item.siteName}</strong>
                  <Badge value={item.status} tone={item.status} />
                </div>
                <p>{item.note}</p>
                <span className="muted">
                  {wardName(item.wardId)} · Updated {formatDateTime(item.updatedAt)} · MHO co-sign:{' '}
                  {item.coSignedByMho ? 'Yes' : 'Pending'} · Addl. Commissioner co-sign:{' '}
                  {item.coSignedByAddlCommissioner ? 'Yes' : 'Pending'}
                </span>
                {(currentUser?.role === 'municipal_health_officer' && !item.coSignedByMho) ||
                (currentUser?.role === 'additional_commissioner' && !item.coSignedByAddlCommissioner) ? (
                  <Button onClick={() => coSignMutation.mutate(item.id)} disabled={coSignMutation.isPending}>
                    Co-sign Filing
                  </Button>
                ) : null}
              </div>
            ))}
            {coSignMutation.isError ? <ErrorPanel error={coSignMutation.error} /> : null}
          </Card>
        </div>
      </div>
    </>
  );
};
