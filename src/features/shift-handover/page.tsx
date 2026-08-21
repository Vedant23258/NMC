import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shiftHandoverService } from '@/core/api/services';
import { useAuth } from '@/core/auth/auth-hooks';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel, LoadingPanel } from '@/shared/ui/state-panels';
import { formatDateTime } from '@/shared/utils/format';

export const ShiftHandoverPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [draftNote, setDraftNote] = useState<Record<string, string>>({});

  const handoverQuery = useQuery({
    queryKey: ['shift-handover'],
    queryFn: () => shiftHandoverService.list(token!),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      shiftHandoverService.complete(token!, id, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shift-handover'] });
    },
  });

  return (
    <>
      <PageHeader
        title="Shift Handover"
        description="Auto-populated outgoing-shift summary. Review open high-priority tickets and complete the handover before signing off."
      />

      {handoverQuery.isLoading ? <LoadingPanel /> : null}
      {handoverQuery.isError ? <ErrorPanel error={handoverQuery.error} onRetry={() => void handoverQuery.refetch()} /> : null}

      <div className="details-grid">
        {handoverQuery.data?.map((item) => (
          <Card
            key={item.id}
            title={item.shiftLabel}
            description={`Outgoing supervisor: ${item.outgoingSupervisor}`}
          >
            <dl className="details-list">
              <dt>Grievances opened</dt>
              <dd>{item.grievancesOpened}</dd>
              <dt>Grievances closed</dt>
              <dd>{item.grievancesClosed}</dd>
              <dt>Still open, High priority</dt>
              <dd>{item.stillOpenHighPriority}</dd>
              <dt>Unacknowledged assignments</dt>
              <dd>{item.unacknowledgedAssignments}</dd>
              <dt>Completed at</dt>
              <dd>{item.completedAt ? formatDateTime(item.completedAt) : 'Not yet completed'}</dd>
            </dl>
            <label>
              Handover note
              <textarea
                rows={3}
                value={draftNote[item.id] ?? item.note}
                onChange={(event) => setDraftNote((prev) => ({ ...prev, [item.id]: event.target.value }))}
              />
            </label>
            <Button
              onClick={() =>
                completeMutation.mutate({ id: item.id, note: draftNote[item.id] ?? item.note })
              }
              disabled={completeMutation.isPending}
            >
              Complete Handover
            </Button>
          </Card>
        ))}
      </div>
      {completeMutation.isError ? <ErrorPanel error={completeMutation.error} /> : null}
    </>
  );
};
