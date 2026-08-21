import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { registryService, wardTodayService } from '@/core/api/services';
import { useAuth, useCapability } from '@/core/auth/auth-hooks';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { FilterBar } from '@/shared/ui/filter-bar';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel, LoadingPanel } from '@/shared/ui/state-panels';
import { formatDateTime, titleCase } from '@/shared/utils/format';

export const WardTodayPage = () => {
  const { token, currentUser } = useAuth();
  const canConfirmDay = useCapability('confirm_ward_day');
  const queryClient = useQueryClient();
  const inspectorWards = (currentUser?.wardScope ?? []).filter((ward) => ward !== 'all');
  const [wardId, setWardId] = useState(inspectorWards[0] ?? '');

  const wardsQuery = useQuery({
    queryKey: ['wards'],
    queryFn: () => registryService.wards(token!),
  });

  const segmentsQuery = useQuery({
    queryKey: ['ward-today-segments', wardId],
    queryFn: () => wardTodayService.segments(token!, wardId),
    enabled: Boolean(wardId),
  });

  const attendanceQuery = useQuery({
    queryKey: ['ward-today-attendance', wardId],
    queryFn: () => wardTodayService.attendance(token!, wardId),
    enabled: Boolean(wardId),
  });

  const statusQuery = useQuery({
    queryKey: ['ward-today-status', wardId],
    queryFn: () => wardTodayService.status(token!, wardId),
    enabled: Boolean(wardId),
  });

  const markAbsentMutation = useMutation({
    mutationFn: (attendanceId: string) => wardTodayService.markAbsent(token!, attendanceId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['ward-today-attendance', wardId] }),
  });

  const confirmDayMutation = useMutation({
    mutationFn: () => wardTodayService.confirmDay(token!, wardId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['ward-today-status', wardId] }),
  });

  const segments = segmentsQuery.data ?? [];
  const allAtLeastSubmitted = segments.length > 0 && segments.every((segment) => segment.status !== 'not_started');
  const wardName = wardsQuery.data?.find((ward) => ward.id === wardId)?.name ?? wardId.toUpperCase();

  return (
    <>
      <PageHeader
        title="My Ward Today"
        description="Beat completion status, worker attendance, and the end-of-day two-role confirmation lock-in."
      />

      <FilterBar>
        <label>
          Ward
          <select value={wardId} onChange={(event) => setWardId(event.target.value)}>
            {inspectorWards.length === 0 ? <option value="">No ward assigned</option> : null}
            {inspectorWards.map((id) => (
              <option key={id} value={id}>
                {wardsQuery.data?.find((ward) => ward.id === id)?.name ?? id.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      {!wardId ? (
        <p className="muted">No ward is currently assigned to your account.</p>
      ) : (
        <div className="split-layout">
          <div>
            <Card
              title={`${wardName} beat board`}
              description="Grey = not started, amber = submitted (awaiting confirmation), green = confirmed."
            >
              {segmentsQuery.isLoading ? <LoadingPanel /> : null}
              {segmentsQuery.isError ? <ErrorPanel error={segmentsQuery.error} /> : null}
              {segments.map((segment) => (
                <div key={segment.id} className="timeline-item">
                  <div className="inline-actions">
                    <strong>{segment.streetName}</strong>
                    <Badge value={segment.status} tone={segment.status === 'confirmed' ? 'active' : segment.status === 'submitted' ? 'pending' : 'unavailable'} />
                  </div>
                  <p>
                    {titleCase(segment.beatType)} beat · Assigned to {segment.assignedWorker}
                  </p>
                </div>
              ))}
            </Card>

            <Card
              title="Confirm Day"
              description="Second of the two required roles: worker/gang submits, Inspector confirms. Locks the entry once confirmed."
              actions={
                statusQuery.data?.confirmed ? <Badge value="confirmed" tone="active" /> : null
              }
            >
              {statusQuery.data?.confirmed ? (
                <p className="muted">
                  Confirmed by {statusQuery.data.confirmedBy} on {formatDateTime(statusQuery.data.confirmedAt)}.
                </p>
              ) : (
                <>
                  <p className="muted">
                    {allAtLeastSubmitted
                      ? 'Every assigned street segment shows at least submitted status.'
                      : 'Some street segments have not yet been started. Confirm Day unlocks once every segment is at least submitted.'}
                  </p>
                  {canConfirmDay ? (
                    <Button
                      onClick={() => confirmDayMutation.mutate()}
                      disabled={!allAtLeastSubmitted || confirmDayMutation.isPending}
                    >
                      Confirm Day
                    </Button>
                  ) : null}
                </>
              )}
              {confirmDayMutation.isError ? <ErrorPanel error={confirmDayMutation.error} /> : null}
            </Card>
          </div>

          <div>
            <Card title="Worker attendance roster" description="Photo check-in status per worker for today's beats.">
              {attendanceQuery.isLoading ? <LoadingPanel label="Loading attendance..." /> : null}
              {attendanceQuery.data?.map((record) => (
                <div key={record.id} className="timeline-item">
                  <div className="inline-actions">
                    <strong>{record.workerName}</strong>
                    <Badge value={record.checkedIn ? 'active' : 'unavailable'} tone={record.checkedIn ? 'active' : 'unavailable'} />
                  </div>
                  <p>{record.photoSubmitted ? 'Completion photo submitted' : 'No completion photo yet'}</p>
                  {record.checkedIn ? (
                    <Button variant="secondary" onClick={() => markAbsentMutation.mutate(record.id)} disabled={markAbsentMutation.isPending}>
                      Report Absentee
                    </Button>
                  ) : null}
                </div>
              ))}
              {markAbsentMutation.isError ? <ErrorPanel error={markAbsentMutation.error} /> : null}
            </Card>
          </div>
        </div>
      )}
    </>
  );
};
