import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService, systemHealthService } from '@/core/api/services';
import { useAuth } from '@/core/auth/auth-hooks';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel, LoadingPanel } from '@/shared/ui/state-panels';
import { DataTable, type ColumnDef } from '@/shared/tables/data-table';
import { formatDateTime, titleCase } from '@/shared/utils/format';
import { roles } from '@/core/types/domain';
import type { AuditLogEntry, PlatformUser, Role } from '@/core/types/domain';

const userColumns = (
  onToggle: (user: PlatformUser) => void,
): ColumnDef<PlatformUser>[] => [
  { key: 'name', header: 'Name', render: (item) => item.name },
  { key: 'role', header: 'Role', render: (item) => titleCase(item.role) },
  { key: 'wards', header: 'Ward scope', render: (item) => item.wardScope.map((w) => w.toUpperCase()).join(', ') },
  { key: 'status', header: 'Status', render: (item) => <Badge value={item.accountStatus} tone={item.accountStatus} /> },
  { key: 'lastLogin', header: 'Last login', render: (item) => formatDateTime(item.lastLoginAt) },
  {
    key: 'actions',
    header: 'Actions',
    render: (item) => (
      <Button variant="secondary" onClick={() => onToggle(item)}>
        {item.accountStatus === 'active' ? 'Deactivate' : 'Reactivate'}
      </Button>
    ),
  },
];

const auditColumns: ColumnDef<AuditLogEntry>[] = [
  { key: 'timestamp', header: 'When', render: (item) => formatDateTime(item.timestamp) },
  { key: 'actor', header: 'Actor', render: (item) => `${item.actor} (${titleCase(item.role)})` },
  { key: 'action', header: 'Action', render: (item) => titleCase(item.action) },
  { key: 'entity', header: 'Entity', render: (item) => `${titleCase(item.entityType)} · ${item.entityId}` },
  { key: 'detail', header: 'Detail', render: (item) => item.detail },
];

export const AdminPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showAddUser, setShowAddUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>(roles[0]);
  const [newWardScope, setNewWardScope] = useState('');

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminService.users(token!),
  });

  const createUserMutation = useMutation({
    mutationFn: () =>
      adminService.createUser(token!, {
        name: newName,
        role: newRole,
        wardScope: newWardScope
          .split(',')
          .map((ward) => ward.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowAddUser(false);
      setNewName('');
      setNewRole(roles[0]);
      setNewWardScope('');
    },
  });

  const healthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: () => systemHealthService.list(token!),
  });

  const auditQuery = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => adminService.auditLog(token!),
  });

  const toggleMutation = useMutation({
    mutationFn: (user: PlatformUser) =>
      adminService.setUserStatus(
        token!,
        user.id,
        user.accountStatus === 'active' ? 'deactivated' : 'active',
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <>
      <PageHeader
        title="Administration"
        description="User & role management, integration/system health, configuration, and the platform's append-only audit log."
      />

      <Card
        title="User & Role Management"
        actions={
          <Button variant="secondary" onClick={() => setShowAddUser((value) => !value)}>
            {showAddUser ? 'Cancel' : 'Add User'}
          </Button>
        }
      >
        {showAddUser ? (
          <div className="inline-actions">
            <label>
              Name
              <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Full name" />
            </label>
            <label>
              Role
              <select value={newRole} onChange={(event) => setNewRole(event.target.value as Role)}>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {titleCase(role)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ward scope
              <input
                value={newWardScope}
                onChange={(event) => setNewWardScope(event.target.value)}
                placeholder="ward-16, ward-12 (or 'all')"
              />
            </label>
            <Button
              onClick={() => createUserMutation.mutate()}
              disabled={!newName || createUserMutation.isPending}
            >
              Create Account
            </Button>
          </div>
        ) : null}
        {createUserMutation.isError ? <ErrorPanel error={createUserMutation.error} /> : null}
        {usersQuery.isLoading ? <LoadingPanel /> : null}
        {usersQuery.isError ? <ErrorPanel error={usersQuery.error} /> : null}
        {usersQuery.data ? (
          <DataTable
            columns={userColumns((user) => toggleMutation.mutate(user))}
            rows={usersQuery.data}
            keyField={(item) => item.id}
          />
        ) : null}
        {toggleMutation.isError ? <ErrorPanel error={toggleMutation.error} /> : null}
      </Card>

      <Card title="Integration & System Health" description="Status per external dependency the platform relies on.">
        {healthQuery.isLoading ? <LoadingPanel /> : null}
        <div className="details-grid">
          {healthQuery.data?.map((check) => (
            <Card key={check.id} title={check.name} actions={<Badge value={check.status} tone={check.status} />}>
              <p className="muted">{check.detail}</p>
              <span className="muted">Last checked {formatDateTime(check.lastCheckedAt)}</span>
            </Card>
          ))}
        </div>
      </Card>

      <Card
        title="Configuration"
        description="SLA-timer thresholds, anomaly-detection sensitivity, and ward-capacity plausibility bounds live here once the backend configuration store is wired."
      >
        <div className="banner">
          <span>
            Configuration is designed but not yet backend-connected. Values shown are the pilot defaults
            referenced elsewhere in the architecture: High priority SLA 4h, Medium 24h, Low 72h; ward-entry
            plausibility band ±15%.
          </span>
        </div>
      </Card>

      <Card title="Audit Log" description="Searchable, filterable, append-only log of every state-changing action across the platform.">
        {auditQuery.isLoading ? <LoadingPanel /> : null}
        {auditQuery.data ? (
          <DataTable columns={auditColumns} rows={auditQuery.data} keyField={(item) => item.id} />
        ) : null}
      </Card>
    </>
  );
};
