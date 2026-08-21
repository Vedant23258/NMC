import { z } from 'zod';
import { roles } from '@/core/types/domain';

export const userDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(roles),
  wardScope: z.array(z.string()),
  title: z.string(),
  requiresSecondFactor: z.boolean(),
});

export const dashboardSummaryDtoSchema = z.object({
  activeComplaints: z.number(),
  pendingSlaBreaches: z.number(),
  weighbridgeActiveVehicles: z.number(),
  flaggedVerifications: z.number(),
  openEnforcementActions: z.number(),
  lastUpdatedAt: z.string(),
  alerts: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      message: z.string(),
    }),
  ),
  wardOverview: z.array(
    z.object({
      wardId: z.string(),
      complaintCount: z.number(),
      weighbridgeTrips: z.number(),
      flaggedRecords: z.number(),
    }),
  ),
  recentActivity: z.array(
    z.object({
      id: z.string(),
      timestamp: z.string(),
      title: z.string(),
      description: z.string(),
    }),
  ),
});
