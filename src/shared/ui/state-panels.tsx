import { getUserFacingError } from '@/core/api/errors';
import { Button } from '@/shared/ui/button';

export const LoadingPanel = ({ label = 'Loading operational data...' }: { label?: string }) => (
  <div className="state-panel">
    <div className="spinner" aria-hidden="true" />
    <p>{label}</p>
  </div>
);

export const EmptyPanel = ({ title, body }: { title: string; body: string }) => (
  <div className="state-panel">
    <h3>{title}</h3>
    <p>{body}</p>
  </div>
);

export const ErrorPanel = ({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) => (
  <div className="state-panel state-panel-error" role="alert">
    <h3>Unable to load this section</h3>
    <p>{getUserFacingError(error)}</p>
    {onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
  </div>
);
