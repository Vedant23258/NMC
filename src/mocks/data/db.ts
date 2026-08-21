import type {
  Anomaly,
  Complaint,
  DashboardSummary,
  EnforcementRecord,
  NotificationRecord,
  ReportRecord,
  User,
  Vehicle,
  VerificationRecord,
  Ward,
  WeighbridgeEntry,
} from '@/core/types/domain';

export const users: Record<User['role'], User> = {
  ccc_operator: {
    id: 'user-ccc-1',
    name: 'Aparna S.',
    role: 'ccc_operator',
    wardScope: ['ward-16', 'ward-12', 'ward-08'],
    title: 'CCC Operator',
    requiresSecondFactor: false,
  },
  sanitary_inspector: {
    id: 'user-inspector-1',
    name: 'R. Krishnamurthy',
    role: 'sanitary_inspector',
    wardScope: ['ward-16', 'ward-14'],
    title: 'Sanitary Inspector',
    requiresSecondFactor: false,
  },
  commissioner: {
    id: 'user-commissioner-1',
    name: 'Dr. Meera Iyer',
    role: 'commissioner',
    wardScope: ['all'],
    title: 'Municipal Commissioner',
    requiresSecondFactor: true,
  },
};

export const wards: Ward[] = [
  { id: 'ward-16', name: 'Ward 16', zone: 'South Zone', populationBand: 'Dense mixed-use', operationalStatus: 'active', routeSummary: 'Allipuram transfer route' },
  { id: 'ward-12', name: 'Ward 12', zone: 'Central Zone', populationBand: 'Commercial core', operationalStatus: 'active', routeSummary: 'CBD sweep route' },
  { id: 'ward-08', name: 'Ward 08', zone: 'East Zone', populationBand: 'Residential', operationalStatus: 'pending', routeSummary: 'Morning collection route' },
  { id: 'ward-14', name: 'Ward 14', zone: 'South Zone', populationBand: 'Market cluster', operationalStatus: 'flagged', routeSummary: 'Market overflow route' },
];

export const vehicles: Vehicle[] = [
  { id: 'veh-01', registrationNumber: 'AP39TX4172', type: 'Compactor', assignedWardId: 'ward-16', assignedRoute: 'Allipuram Loop A', status: 'active', lastSeenAt: '2026-08-16T09:42:00+05:30' },
  { id: 'veh-02', registrationNumber: 'AP39TX4620', type: 'Tipper', assignedWardId: 'ward-16', assignedRoute: 'Allipuram Loop B', status: 'active', lastSeenAt: '2026-08-16T09:28:00+05:30' },
  { id: 'veh-03', registrationNumber: 'AP39TX3188', type: 'Auto Tipper', assignedWardId: 'ward-12', assignedRoute: 'CBD Inner Route', status: 'pending', lastSeenAt: '2026-08-16T08:54:00+05:30' },
  { id: 'veh-04', registrationNumber: 'AP39TX5091', type: 'Compactor', assignedWardId: 'ward-14', assignedRoute: 'Market Enforcement Route', status: 'flagged', lastSeenAt: '2026-08-16T08:17:00+05:30' },
];

export const complaints: Complaint[] = [
  {
    id: 'cmp-1001',
    citizenReference: 'NMC-C-240816-001',
    title: 'Overflowing community bin near market road',
    description: 'Overflow visible on carriageway edge with repeated citizen follow-up.',
    wardId: 'ward-16',
    locationLabel: 'Allipuram Market Road',
    status: 'assigned',
    priority: 'high',
    etaMinutes: 35,
    assignedTo: 'Zone Dispatch Cell',
    category: 'overflow',
    openedAt: '2026-08-16T07:50:00+05:30',
    dueAt: '2026-08-16T10:20:00+05:30',
    timeline: [
      { id: 'evt-1', type: 'created', actor: 'Citizen channel', timestamp: '2026-08-16T07:50:00+05:30', note: 'Complaint received through assisted intake.' },
      { id: 'evt-2', type: 'routed', actor: 'CCC Operator', timestamp: '2026-08-16T08:02:00+05:30', note: 'Assigned to South Zone dispatch.' },
    ],
  },
  {
    id: 'cmp-1002',
    citizenReference: 'NMC-C-240816-004',
    title: 'Missed morning collection in apartment lane',
    description: 'Residents reported no vehicle pass during scheduled collection window.',
    wardId: 'ward-12',
    locationLabel: 'Lakshmi Apartments Lane',
    status: 'in_progress',
    priority: 'medium',
    etaMinutes: 20,
    assignedTo: 'Ward 12 Mobile Crew',
    category: 'missed_collection',
    openedAt: '2026-08-16T06:45:00+05:30',
    dueAt: '2026-08-16T09:45:00+05:30',
    timeline: [
      { id: 'evt-3', type: 'created', actor: 'Citizen channel', timestamp: '2026-08-16T06:45:00+05:30', note: 'Complaint created.' },
      { id: 'evt-4', type: 'assigned', actor: 'CCC Operator', timestamp: '2026-08-16T07:10:00+05:30', note: 'Assigned to mobile collection crew.' },
      { id: 'evt-5', type: 'status_changed', actor: 'Sanitary Inspector', timestamp: '2026-08-16T08:15:00+05:30', note: 'Crew dispatched and en route.' },
    ],
  },
  {
    id: 'cmp-1003',
    citizenReference: 'NMC-C-240815-118',
    title: 'Illegal dumping beside drain',
    description: 'Mixed waste dumped beside secondary drain line.',
    wardId: 'ward-14',
    locationLabel: 'Sivaji Market Drain Edge',
    status: 'awaiting_closure',
    priority: 'critical',
    etaMinutes: 0,
    assignedTo: 'Enforcement Coordination',
    category: 'illegal_dumping',
    openedAt: '2026-08-15T15:10:00+05:30',
    dueAt: '2026-08-15T19:10:00+05:30',
    timeline: [
      { id: 'evt-6', type: 'created', actor: 'Citizen channel', timestamp: '2026-08-15T15:10:00+05:30', note: 'Complaint created.' },
      { id: 'evt-7', type: 'enforcement_linked', actor: 'Sanitary Inspector', timestamp: '2026-08-15T17:00:00+05:30', note: 'Linked to challan action for nearby vendor cluster.' },
    ],
  },
];

export const weighbridgeEntries: WeighbridgeEntry[] = [
  { id: 'wb-001', vehicleId: 'veh-01', vehicleNumber: 'AP39TX4172', wardId: 'ward-16', location: 'Allipuram Weighbridge', status: 'processing', weightTonnes: 7.8, timeIn: '2026-08-16T09:37:00+05:30', feedStatus: 'live' },
  { id: 'wb-002', vehicleId: 'veh-02', vehicleNumber: 'AP39TX4620', wardId: 'ward-16', location: 'Allipuram Weighbridge', status: 'checked_out', weightTonnes: 8.1, timeIn: '2026-08-16T08:40:00+05:30', timeOut: '2026-08-16T08:56:00+05:30', feedStatus: 'live' },
  { id: 'wb-003', vehicleId: 'veh-03', vehicleNumber: 'AP39TX3188', wardId: 'ward-12', location: 'Allipuram Weighbridge', status: 'manual_review', weightTonnes: 4.6, timeIn: '2026-08-16T07:58:00+05:30', timeOut: '2026-08-16T08:12:00+05:30', feedStatus: 'refreshing' },
];

export const verificationRecords: VerificationRecord[] = [
  { id: 'ver-001', wardId: 'ward-16', reportingPeriod: 'Aug 2026', metricName: 'Daily collected tonnage', reportedValue: 8.4, verifiedValue: 7.8, variancePercent: 7.1, status: 'verified', reviewedBy: 'R. Krishnamurthy', reviewedAt: '2026-08-16T09:10:00+05:30' },
  { id: 'ver-002', wardId: 'ward-14', reportingPeriod: 'Aug 2026', metricName: 'Secondary transfer count', reportedValue: 26, verifiedValue: 21, variancePercent: 19.2, status: 'flagged', anomalyId: 'ano-001' },
  { id: 'ver-003', wardId: 'ward-12', reportingPeriod: 'Aug 2026', metricName: 'Morning route completion', reportedValue: 14, verifiedValue: 14, variancePercent: 0, status: 'pending' },
];

export const anomalies: Anomaly[] = [
  { id: 'ano-001', verificationRecordId: 'ver-002', thresholdPercent: 15, variancePercent: 19.2, severity: 'high', status: 'open', note: 'Variance beyond pilot threshold. GPS trace pending from contractor feed.' },
];

export const enforcementRecords: EnforcementRecord[] = [
  { id: 'enf-001', wardId: 'ward-14', vehicleId: 'veh-04', type: 'challan', status: 'in_review', createdAt: '2026-08-15T17:05:00+05:30', updatedAt: '2026-08-16T08:45:00+05:30', subject: 'Improper waste dumping by vendor cluster', officer: 'SI Lakshmi Devi' },
  { id: 'enf-002', wardId: 'ward-16', type: 'sup_seizure', status: 'initiated', createdAt: '2026-08-16T07:30:00+05:30', updatedAt: '2026-08-16T08:00:00+05:30', subject: 'Unauthorized bulk waste transfer', officer: 'EO P. Venkatesh' },
];

export const reports: ReportRecord[] = [
  { id: 'rep-001', name: 'Ward 16 Governance Snapshot', periodLabel: 'Aug 2026', status: 'draft', generatedAt: '2026-08-16T08:50:00+05:30', generatedBy: 'System (Mock)', signOffRequired: true },
  { id: 'rep-002', name: 'MAUD Monthly Rollup', periodLabel: 'Jul 2026', status: 'pending_backend', signOffRequired: true },
  { id: 'rep-003', name: 'Complaint SLA Overview', periodLabel: 'Week 33, 2026', status: 'ready', generatedAt: '2026-08-16T07:15:00+05:30', generatedBy: 'CCC Operator', signOffRequired: false },
];

export const notifications: NotificationRecord[] = [
  { id: 'not-001', channel: 'dashboard', subject: 'Ward 14 variance flagged', body: 'Verification variance exceeded 15% threshold and needs review.', status: 'delivered', createdAt: '2026-08-16T09:12:00+05:30', relatedEntityId: 'ver-002' },
  { id: 'not-002', channel: 'sms', subject: 'Citizen status update blocked', body: 'SMS/WhatsApp integration is not wired yet. Delivery remains blocked.', status: 'blocked', createdAt: '2026-08-16T08:05:00+05:30', relatedEntityId: 'cmp-1001' },
  { id: 'not-003', channel: 'dashboard', subject: 'Allipuram feed refreshing', body: 'Weighbridge live feed is refreshing; last stable payload received less than 2 minutes ago.', status: 'development_only', createdAt: '2026-08-16T09:25:00+05:30', relatedEntityId: 'wb-003' },
];

export const getDashboardSummary = (): DashboardSummary => ({
  activeComplaints: complaints.filter((item) => item.status !== 'closed').length,
  pendingSlaBreaches: complaints.filter((item) => item.status !== 'closed' && item.priority !== 'low').length,
  weighbridgeActiveVehicles: weighbridgeEntries.filter((item) => item.status !== 'checked_out').length,
  flaggedVerifications: verificationRecords.filter((item) => item.status === 'flagged').length,
  openEnforcementActions: enforcementRecords.filter((item) => item.status !== 'closed').length,
  lastUpdatedAt: '2026-08-16T09:45:00+05:30',
  alerts: [
    { id: 'alert-1', title: 'Variance threshold breached', severity: 'high', message: 'Ward 14 reporting variance is above the configured 15% threshold.' },
    { id: 'alert-2', title: 'Pending citizen delivery integration', severity: 'medium', message: 'Citizen outbound status updates remain blocked on notification integration.' },
  ],
  wardOverview: wards.map((ward) => ({
    wardId: ward.id,
    complaintCount: complaints.filter((item) => item.wardId === ward.id && item.status !== 'closed').length,
    weighbridgeTrips: weighbridgeEntries.filter((item) => item.wardId === ward.id).length,
    flaggedRecords: verificationRecords.filter((item) => item.wardId === ward.id && item.status === 'flagged').length,
  })),
  recentActivity: [
    { id: 'ra-1', timestamp: '2026-08-16T09:37:00+05:30', title: 'Vehicle entered Allipuram weighbridge', description: 'Compactor AP39TX4172 checked in for processing.' },
    { id: 'ra-2', timestamp: '2026-08-16T09:12:00+05:30', title: 'Verification anomaly flagged', description: 'Ward 14 transfer count moved to flagged review.' },
    { id: 'ra-3', timestamp: '2026-08-16T08:02:00+05:30', title: 'Complaint routed', description: 'Overflow complaint near Market Road assigned to South Zone dispatch.' },
  ],
});
