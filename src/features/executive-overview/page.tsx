import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { complaintsService, directivesService, registryService } from '@/core/api/services';
import { useAuth, useCapability } from '@/core/auth/auth-hooks';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel, LoadingPanel } from '@/shared/ui/state-panels';
import { formatDateTime } from '@/shared/utils/format';

const AGEING_THRESHOLD_HOURS = 48;

export const ExecutiveOverviewPage = () => {
  const { token } = useAuth();
  const canIssueDirective = useCapability('issue_directive');
  const queryClient = useQueryClient();
  const [draftFor, setDraftFor] = useState<string>();
  const [instruction, setInstruction] = useState('');

  const wardsQuery = useQuery({
    queryKey: ['wards'],
    queryFn: () => registryService.wards(token!),
  });

  const complaintsQuery = useQuery({
    queryKey: ['complaints-ageing'],
    queryFn: () => complaintsService.list(token!, { pageSize: 50 }),
  });

  const directivesQuery = useQuery({
    queryKey: ['directives'],
    queryFn: () => directivesService.list(token!),
  });

  const issueMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => directivesService.create(token!, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['directives'] });
      setDraftFor(undefined);
      setInstruction('');
    },
  });

  const wardName = (wardId: string) =>
    wardsQuery.data?.find((ward) => ward.id === wardId)?.name ?? wardId.toUpperCase();

  const agedComplaints = (complaintsQuery.data?.items ?? [])
    .filter((item) => item.status !== 'closed')
    .filter((item) => {
      const openedHoursAgo = (Date.now() - new Date(item.openedAt).getTime()) / 3_600_000;
      return openedHoursAgo >= AGEING_THRESHOLD_HOURS;
    })
    .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());

  return (
    <>
      <PageHeader
        title="Grievance Ageing & Monday Review"
        description="Every open grievance older than 48 hours, ready for the weekly review without manual Excel assembly."
      />

      {complaintsQuery.isLoading ? <LoadingPanel /> : null}
      {complaintsQuery.isError ? <ErrorPanel error={complaintsQuery.error} /> : null}

      <div className="split-layout">
        <div>
          <Card title={`Aged grievances (${agedComplaints.length})`} description="Grouped oldest-first across wards and assignees.">
            {agedComplaints.length === 0 ? (
              <p className="muted">No grievance is currently older than the 48-hour review threshold.</p>
            ) : (
              agedComplaints.map((item) => (
                <div key={item.id} className="timeline-item">
                  <div className="inline-actions">
                    <strong>{item.title}</strong>
                    <Badge value={item.priority} tone={item.priority} />
                  </div>
                  <p>
                    {wardName(item.wardId)} · Opened {formatDateTime(item.openedAt)} · Assigned to{' '}
                    {item.assignedTo ?? 'Unassigned'}
                  </p>
                  {canIssueDirective ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDraftFor(item.id);
                        setInstruction('');
                      }}
                    >
                      Issue Directive
                    </Button>
                  ) : null}
                  {draftFor === item.id ? (
                    <div className="inline-actions">
                      <input
                        value={instruction}
                        onChange={(event) => setInstruction(event.target.value)}
                        placeholder="Directive instruction and expectation"
                      />
                      <Button
                        onClick={() =>
                          issueMutation.mutate({
                            wardId: item.wardId,
                            issuedTo: item.assignedTo ?? `${wardName(item.wardId)} Sanitary Inspector`,
                            instruction,
                            dueAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
                            relatedComplaintId: item.id,
                          })
                        }
                        disabled={!instruction || issueMutation.isPending}
                      >
                        Send
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </Card>
        </div>

        <div>
          <Card title="Directive tracker" description="Logged, due-dated action items replacing verbal Monday-meeting notes.">
            {directivesQuery.isLoading ? <LoadingPanel label="Loading directives..." /> : null}
            {directivesQuery.data?.map((directive) => (
              <div key={directive.id} className="timeline-item">
                <div className="inline-actions">
                  <strong>{directive.issuedTo}</strong>
                  <Badge value={directive.status} tone={directive.status} />
                </div>
                <p>{directive.instruction}</p>
                <span className="muted">
                  {wardName(directive.wardId)} · Due {formatDateTime(directive.dueAt)} · Issued by {directive.issuedBy}
                </span>
              </div>
            ))}
            {issueMutation.isError ? <ErrorPanel error={issueMutation.error} /> : null}
          </Card>
        </div>
      </div>
    </>
  );
};
