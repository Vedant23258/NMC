import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/app-shell';
import { CapabilityGate, ProtectedRoute } from '@/app/router/guards';
import { LoginPage } from '@/features/login-page';
import { ComplaintsPage } from '@/features/complaints/page';
import { DashboardPage } from '@/features/live-dashboard/page';
import { EnforcementPage } from '@/features/enforcement/page';
import { NotificationsPage } from '@/features/notifications/page';
import { RegistryPage } from '@/features/ward-vehicle-registry/page';
import { ReportsPage } from '@/features/reporting/page';
import { VerificationPage } from '@/features/verification/page';
import { WeighbridgePage } from '@/features/weighbridge/page';

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
