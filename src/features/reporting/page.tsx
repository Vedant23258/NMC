import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, maudReportService, reportingService } from '@/core/api/services';
import { useAuth, useCapability } from '@/core/auth/auth-hooks';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel } from '@/shared/ui/state-panels';
import { formatDateTime } from '@/shared/utils/format';

export const ReportsPage = () => {
  const { token, currentUser } = useAuth();
  const canSignOff = useCapability('sign_off_reports');
  const canApprove = useCapability('approve_maud');
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>();
  const [code, setCode] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [auditMessage, setAuditMessage] = useState('');

  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportingService.list(token!),
  });

  const approveMutation = useMutation({
    mutationFn: (reportId: string) => maudReportService.approve(token!, reportId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const signOffMutation = useMutation({
    mutationFn: async () => {
      const verification = await authService.verifySecondFactor(token!, code);
      if (!verification.verified) {
        throw new Error(verification.message);
      }
      return reportingService.signOff(token!, selectedId!);
    },
    onSuccess: async (result) => {
      setAuditMessage(`${result.action} recorded for ${result.entityId} at ${formatDateTime(result.timestamp)}.`);
      setDialogOpen(false);
      setCode('');
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  return (
    <>
      <PageHeader
        title="Reports"
        description="Reporting workflows acknowledge that MAUD template integration is not wired yet and remain clearly marked in the UI."
      />

      <div className="details-grid">
        {reportsQuery.data?.map((report) => (
          <Card
            key={report.id}
            title={report.name}
            description={`${report.periodLabel} · ${report.generatedBy ?? 'Backend generation pending'}`}
            actions={<Badge value={report.status} tone={report.status} />}
          >
            <p className="muted">Generated: {formatDateTime(report.generatedAt)}</p>
            <p className="muted">
              Sign-off required: {report.signOffRequired ? 'Yes' : 'No'}
            </p>
            {report.approvedAt ? (
              <p className="muted">Approved by {report.approvedBy} on {formatDateTime(report.approvedAt)}</p>
            ) : null}
            {report.status === 'pending_backend' ? (
              <div className="banner">
                <span>MAUD auto-fill integration is not yet wired.</span>
              </div>
            ) : null}
            {canApprove && report.name === 'MAUD Monthly Rollup' && !report.approvedAt ? (
              <Button
                variant="secondary"
                onClick={() => approveMutation.mutate(report.id)}
                disabled={approveMutation.isPending}
              >
                Approve &amp; Forward to Commissioner
              </Button>
            ) : null}
            {canSignOff && report.signOffRequired ? (
              <Button
                onClick={() => {
                  setSelectedId(report.id);
                  setDialogOpen(true);
                }}
              >
                Commissioner sign-off
              </Button>
            ) : null}
          </Card>
        ))}
      </div>

      {auditMessage ? <div className="banner"><span>{auditMessage}</span></div> : null}
      {approveMutation.isError ? <ErrorPanel error={approveMutation.error} /> : null}

      {dialogOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="signoff-title">
            <h2 id="signoff-title">Commissioner second-step verification</h2>
            <p className="muted">
              Mock 2FA is enabled for development only. Use code <strong>240816</strong> to simulate backend confirmation for {currentUser?.name}.
            </p>
            <label>
              Verification code
              <input value={code} onChange={(event) => setCode(event.target.value)} />
            </label>
            {signOffMutation.isError ? <ErrorPanel error={signOffMutation.error} /> : null}
            <div className="inline-actions">
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => signOffMutation.mutate()} disabled={!code}>
                Confirm sign-off
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
