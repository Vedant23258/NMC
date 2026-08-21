import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/core/api/services';
import { useAuth } from '@/core/auth/auth-hooks';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { formatDateTime, titleCase } from '@/shared/utils/format';

export const NotificationsPage = () => {
  const { token } = useAuth();
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(token!),
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Internal status centre for dashboard-visible delivery and block states. WhatsApp is intentionally not implemented."
      />
      <Card title="Delivery status">
        {query.data?.map((item) => (
          <div key={item.id} className="timeline-item">
            <div className="inline-actions">
              <strong>{item.subject}</strong>
              <Badge value={item.status} tone={item.status} />
            </div>
            <p>{item.body}</p>
            <span className="muted">
              {titleCase(item.channel)} · {formatDateTime(item.createdAt)}
            </span>
          </div>
        ))}
      </Card>
    </>
  );
};
