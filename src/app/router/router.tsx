import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/app-shell';
import { CapabilityGate, ProtectedRoute } from '@/app/router/guards';
import { navItems } from '@/app/router/route-config';
import { useAuth } from '@/core/auth/auth-hooks';
import { hasCapability } from '@/core/rbac/capability-map';
import { LoginPage } from '@/features/login-page';
import { AdminPage } from '@/features/admin/page';
import { ComplaintsPage } from '@/features/complaints/page';
import { DashboardPage } from '@/features/live-dashboard/page';
import { EnforcementPage } from '@/features/enforcement/page';
import { ExecutiveOverviewPage } from '@/features/executive-overview/page';
import { GisAnalystPage } from '@/features/gis-analyst/page';
import { HealthRiskPage } from '@/features/health-risk/page';
import { NotificationsPage } from '@/features/notifications/page';
import { RegistryPage } from '@/features/ward-vehicle-registry/page';
import { ReportsPage } from '@/features/reporting/page';
import { ShiftHandoverPage } from '@/features/shift-handover/page';
import { VerificationPage } from '@/features/verification/page';
import { WeighbridgePage } from '@/features/weighbridge/page';

const DefaultRoute = () => {
  const { currentUser } = useAuth();
  const firstAccessible = navItems.find((item) => hasCapability(currentUser?.role, item.capability));
  return <Navigate to={firstAccessible?.to ?? '/notifications'} replace />;
};

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DefaultRoute />} />
          <Route
            path="/dashboard"
            element={
              <CapabilityGate capability="view_live_dashboard">
                <DashboardPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/complaints"
            element={
              <CapabilityGate capability="view_complaints">
                <ComplaintsPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/weighbridge"
            element={
              <CapabilityGate capability="view_weighbridge">
                <WeighbridgePage />
              </CapabilityGate>
            }
          />
          <Route
            path="/verification"
            element={
              <CapabilityGate capability="verify_data">
                <VerificationPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/registry"
            element={
              <CapabilityGate capability="view_registry">
                <RegistryPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/enforcement"
            element={
              <CapabilityGate capability="view_enforcement">
                <EnforcementPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/reports"
            element={
              <CapabilityGate capability="view_reports">
                <ReportsPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/notifications"
            element={
              <CapabilityGate capability="view_notifications">
                <NotificationsPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/shift-handover"
            element={
              <CapabilityGate capability="manage_shift_handover">
                <ShiftHandoverPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/executive-overview"
            element={
              <CapabilityGate capability="view_grievance_ageing">
                <ExecutiveOverviewPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/anomalies"
            element={
              <CapabilityGate capability="manage_gis_layers">
                <GisAnalystPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/health-risk"
            element={
              <CapabilityGate capability="view_health_risk">
                <HealthRiskPage />
              </CapabilityGate>
            }
          />
          <Route
            path="/admin"
            element={
              <CapabilityGate capability="manage_users">
                <AdminPage />
              </CapabilityGate>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
