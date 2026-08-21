// Single import point every page/feature uses. Dispatches to mock-services.ts
// (MSW, default) or gateway-services.ts (real Supabase backend) based on
// VITE_API_MODE, so no calling code needs to know which one is active.
import { appEnv } from '@/core/config/env';
import type { Role, User } from '@/core/types/domain';
import * as gatewayImpl from '@/core/api/gateway-services';
import * as mockImpl from '@/core/api/mock-services';

const isGateway = () => appEnv.apiMode === 'gateway';

export interface LoginCredentials {
  role?: Role; // mock mode
  email?: string; // gateway mode
  password?: string; // gateway mode
}

// authService keeps a hand-written adapter rather than the generic dispatch
// below: mock login takes a role (dev role-picker) and gateway login takes
// real credentials, so the two modes genuinely need different inputs, not
// just a different implementation of the same call.
export const authService = {
  login: async (credentials: LoginCredentials): Promise<{ token: string; user: User }> => {
    if (isGateway()) {
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required.');
      }
      return gatewayImpl.authService.login(credentials.email, credentials.password);
    }
    if (!credentials.role) throw new Error('Role is required in mock mode.');
    return mockImpl.authService.login(credentials.role);
  },
  // Gateway-only: Supabase persists its own session, so restoring on reload
  // doesn't need a token round-tripped through our own storage.
  restoreSession: async () => (isGateway() ? gatewayImpl.authService.restoreSession() : undefined),
  me: async (token: string) => (isGateway() ? gatewayImpl.authService.me(token) : mockImpl.authService.me(token)),
  logout: async (token: string) =>
    isGateway() ? gatewayImpl.authService.logout(token) : mockImpl.authService.logout(token),
  verifySecondFactor: async (token: string, code: string) =>
    isGateway()
      ? gatewayImpl.authService.verifySecondFactor(token, code)
      : mockImpl.authService.verifySecondFactor(token, code),
};

// Every other service has an identical call signature in both
// implementations, so a straight ternary per export is enough.
export const dashboardService = isGateway() ? gatewayImpl.dashboardService : mockImpl.dashboardService;
export const complaintsService = isGateway() ? gatewayImpl.complaintsService : mockImpl.complaintsService;
export const weighbridgeService = isGateway() ? gatewayImpl.weighbridgeService : mockImpl.weighbridgeService;
export const verificationService = isGateway() ? gatewayImpl.verificationService : mockImpl.verificationService;
export const registryService = isGateway() ? gatewayImpl.registryService : mockImpl.registryService;
export const enforcementService = isGateway() ? gatewayImpl.enforcementService : mockImpl.enforcementService;
export const reportingService = isGateway() ? gatewayImpl.reportingService : mockImpl.reportingService;
export const notificationsService = isGateway() ? gatewayImpl.notificationsService : mockImpl.notificationsService;
export const directivesService = isGateway() ? gatewayImpl.directivesService : mockImpl.directivesService;
export const healthRiskService = isGateway() ? gatewayImpl.healthRiskService : mockImpl.healthRiskService;
export const ngtComplianceService = isGateway() ? gatewayImpl.ngtComplianceService : mockImpl.ngtComplianceService;
export const shiftHandoverService = isGateway() ? gatewayImpl.shiftHandoverService : mockImpl.shiftHandoverService;
export const systemHealthService = isGateway() ? gatewayImpl.systemHealthService : mockImpl.systemHealthService;
export const adminService = isGateway() ? gatewayImpl.adminService : mockImpl.adminService;
export const forecastingService = isGateway() ? gatewayImpl.forecastingService : mockImpl.forecastingService;
export const wardTodayService = isGateway() ? gatewayImpl.wardTodayService : mockImpl.wardTodayService;
export const maudReportService = isGateway() ? gatewayImpl.maudReportService : mockImpl.maudReportService;
