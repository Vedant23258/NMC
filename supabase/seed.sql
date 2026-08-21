-- Swachh Nellore pilot -- starting data, mirroring what the app currently
-- ships as mock data so the transition to the real backend isn't a blank
-- slate. Run this AFTER schema.sql, in the same SQL Editor.
--
-- Note: user accounts (Commissioner, Additional Commissioner, etc.) are NOT
-- created here -- Supabase Auth users must be created through Auth, not raw
-- SQL. Invite each pilot staff member from Authentication -> Users -> Invite
-- in the dashboard; their profile row is created automatically by the
-- handle_new_auth_user trigger in schema.sql. Set their role/name/ward_scope
-- either in the invite's user metadata or by editing the profiles row after.

insert into wards (id, name, zone, population_band, operational_status, route_summary) values
  ('ward-16', 'Ward 16', 'South Zone', 'Dense mixed-use', 'active', 'Allipuram transfer route'),
  ('ward-12', 'Ward 12', 'Central Zone', 'Commercial core', 'active', 'CBD sweep route'),
  ('ward-08', 'Ward 08', 'East Zone', 'Residential', 'pending', 'Morning collection route'),
  ('ward-14', 'Ward 14', 'South Zone', 'Market cluster', 'flagged', 'Market overflow route')
on conflict (id) do nothing;

insert into vehicles (id, registration_number, type, assigned_ward_id, assigned_route, status, last_seen_at) values
  ('veh-01', 'AP39TX4172', 'Compactor', 'ward-16', 'Allipuram Loop A', 'active', '2026-08-16T09:42:00+05:30'),
  ('veh-02', 'AP39TX4620', 'Tipper', 'ward-16', 'Allipuram Loop B', 'active', '2026-08-16T09:28:00+05:30'),
  ('veh-03', 'AP39TX3188', 'Auto Tipper', 'ward-12', 'CBD Inner Route', 'pending', '2026-08-16T08:54:00+05:30'),
  ('veh-04', 'AP39TX5091', 'Compactor', 'ward-14', 'Market Enforcement Route', 'flagged', '2026-08-16T08:17:00+05:30')
on conflict (id) do nothing;

insert into complaints (id, citizen_reference, title, description, ward_id, location_label, status, priority, eta_minutes, assigned_to, category, opened_at, due_at, closed_at) values
  ('cmp-1001', 'NMC-C-240816-001', 'Overflowing community bin near market road', 'Overflow visible on carriageway edge with repeated citizen follow-up.', 'ward-16', 'Allipuram Market Road', 'assigned', 'high', 35, 'Zone Dispatch Cell', 'overflow', '2026-08-16T07:50:00+05:30', '2026-08-16T10:20:00+05:30', null),
  ('cmp-1002', 'NMC-C-240816-004', 'Missed morning collection in apartment lane', 'Residents reported no vehicle pass during scheduled collection window.', 'ward-12', 'Lakshmi Apartments Lane', 'in_progress', 'medium', 20, 'Ward 12 Mobile Crew', 'missed_collection', '2026-08-16T06:45:00+05:30', '2026-08-16T09:45:00+05:30', null),
  ('cmp-1003', 'NMC-C-240815-118', 'Illegal dumping beside drain', 'Mixed waste dumped beside secondary drain line.', 'ward-14', 'Sivaji Market Drain Edge', 'awaiting_closure', 'critical', 0, 'Enforcement Coordination', 'illegal_dumping', '2026-08-15T15:10:00+05:30', '2026-08-15T19:10:00+05:30', null)
on conflict (id) do nothing;

insert into complaint_events (complaint_id, type, actor, timestamp, note) values
  ('cmp-1001', 'created', 'Citizen channel', '2026-08-16T07:50:00+05:30', 'Complaint received through assisted intake.'),
  ('cmp-1001', 'routed', 'CCC Operator', '2026-08-16T08:02:00+05:30', 'Assigned to South Zone dispatch.'),
  ('cmp-1002', 'created', 'Citizen channel', '2026-08-16T06:45:00+05:30', 'Complaint created.'),
  ('cmp-1002', 'assigned', 'CCC Operator', '2026-08-16T07:10:00+05:30', 'Assigned to mobile collection crew.'),
  ('cmp-1002', 'status_changed', 'Sanitary Inspector', '2026-08-16T08:15:00+05:30', 'Crew dispatched and en route.'),
  ('cmp-1003', 'created', 'Citizen channel', '2026-08-15T15:10:00+05:30', 'Complaint created.'),
  ('cmp-1003', 'enforcement_linked', 'Sanitary Inspector', '2026-08-15T17:00:00+05:30', 'Linked to challan action for nearby vendor cluster.');

insert into weighbridge_entries (id, vehicle_id, vehicle_number, ward_id, location, status, weight_tonnes, time_in, time_out, feed_status) values
  ('wb-001', 'veh-01', 'AP39TX4172', 'ward-16', 'Allipuram Weighbridge', 'processing', 7.8, '2026-08-16T09:37:00+05:30', null, 'live'),
  ('wb-002', 'veh-02', 'AP39TX4620', 'ward-16', 'Allipuram Weighbridge', 'checked_out', 8.1, '2026-08-16T08:40:00+05:30', '2026-08-16T08:56:00+05:30', 'live'),
  ('wb-003', 'veh-03', 'AP39TX3188', 'ward-12', 'Allipuram Weighbridge', 'manual_review', 4.6, '2026-08-16T07:58:00+05:30', '2026-08-16T08:12:00+05:30', 'refreshing')
on conflict (id) do nothing;

insert into verification_records (id, ward_id, reporting_period, metric_name, reported_value, verified_value, variance_percent, status, anomaly_id, reviewed_by, reviewed_at) values
  ('ver-001', 'ward-16', 'Aug 2026', 'Daily collected tonnage', 8.4, 7.8, 7.1, 'verified', null, 'R. Krishnamurthy', '2026-08-16T09:10:00+05:30'),
  ('ver-002', 'ward-14', 'Aug 2026', 'Secondary transfer count', 26, 21, 19.2, 'flagged', 'ano-001', null, null),
  ('ver-003', 'ward-12', 'Aug 2026', 'Morning route completion', 14, 14, 0, 'pending', null, null, null)
on conflict (id) do nothing;

insert into anomalies (id, verification_record_id, threshold_percent, variance_percent, severity, status, note) values
  ('ano-001', 'ver-002', 15, 19.2, 'high', 'open', 'Variance beyond pilot threshold. GPS trace pending from contractor feed.')
on conflict (id) do nothing;

insert into enforcement_records (id, ward_id, vehicle_id, type, status, created_at, updated_at, subject, officer, fine_amount, fine_status, evidence_photo_attached, evidence_note) values
  ('enf-001', 'ward-14', 'veh-04', 'challan', 'in_review', '2026-08-15T17:05:00+05:30', '2026-08-16T08:45:00+05:30', 'Improper waste dumping by vendor cluster', 'SI Lakshmi Devi', 5000, 'unpaid', true, 'Photo of dumped waste beside drain, geo-tagged at time of inspection.'),
  ('enf-002', 'ward-16', null, 'sup_seizure', 'initiated', '2026-08-16T07:30:00+05:30', '2026-08-16T08:00:00+05:30', 'Unauthorized bulk waste transfer', 'EO P. Venkatesh', null, null, false, 'Awaiting field photo upload from enforcement officer.'),
  ('enf-003', 'ward-16', 'veh-01', 'challan', 'closed', '2026-08-10T09:15:00+05:30', '2026-08-12T11:00:00+05:30', 'Single-use plastic (SUP) sale at market stall', 'SI Lakshmi Devi', 1000, 'paid', true, 'Photo of seized SUP stock and challan receipt.')
on conflict (id) do nothing;

insert into reports (id, name, period_label, status, generated_at, generated_by, sign_off_required, signed_off_at, approved_at, approved_by) values
  ('rep-001', 'Ward 16 Governance Snapshot', 'Aug 2026', 'draft', '2026-08-16T08:50:00+05:30', 'System (Mock)', true, null, null, null),
  ('rep-002', 'MAUD Monthly Rollup', 'Jul 2026', 'pending_backend', null, null, true, null, null, null),
  ('rep-003', 'Complaint SLA Overview', 'Week 33, 2026', 'ready', '2026-08-16T07:15:00+05:30', 'CCC Operator', false, null, null, null)
on conflict (id) do nothing;

insert into notifications (id, channel, subject, body, status, created_at, related_entity_id) values
  ('not-001', 'dashboard', 'Ward 14 variance flagged', 'Verification variance exceeded 15% threshold and needs review.', 'delivered', '2026-08-16T09:12:00+05:30', 'ver-002'),
  ('not-002', 'sms', 'Citizen status update blocked', 'SMS/WhatsApp integration is not wired yet. Delivery remains blocked.', 'blocked', '2026-08-16T08:05:00+05:30', 'cmp-1001'),
  ('not-003', 'dashboard', 'Allipuram feed refreshing', 'Weighbridge live feed is refreshing; last stable payload received less than 2 minutes ago.', 'development_only', '2026-08-16T09:25:00+05:30', 'wb-003')
on conflict (id) do nothing;

insert into directives (id, ward_id, issued_to, issued_by, instruction, status, due_at, created_at, related_complaint_id) values
  ('dir-001', 'ward-14', 'SI Lakshmi Devi', 'Smt. Katta Himabindu', 'Close out the market-cluster illegal dumping enforcement action and confirm vendor cluster compliance by Friday.', 'open', '2026-08-21T18:00:00+05:30', '2026-08-17T10:00:00+05:30', 'cmp-1003'),
  ('dir-002', 'ward-08', 'Ward 08 Sanitary Inspector', 'Smt. Katta Himabindu', 'Provide a beat-coverage update for the pending morning collection route ahead of next Monday review.', 'in_progress', '2026-08-24T12:00:00+05:30', '2026-08-17T10:05:00+05:30', null)
on conflict (id) do nothing;

insert into health_risk_zones (id, ward_id, risk_level, health_complaint_count_7d, category, flagged_at, flagged_by) values
  ('hrz-001', 'ward-14', 'high', 6, 'sewage_overflow', '2026-08-16T11:00:00+05:30', 'Dr. Suresh Babu'),
  ('hrz-002', 'ward-08', 'medium', 3, 'stagnant_water', null, null)
on conflict (id) do nothing;

insert into ngt_compliance_items (id, site_name, ward_id, category, status, note, co_signed_by_addl_commissioner, co_signed_by_mho, updated_at) values
  ('ngt-001', 'Allipuram Legacy Dumpsite Remediation', 'ward-16', 'legacy_waste', 'data_conflict', 'Contractor''s legacy-waste note reports a different remediated tonnage than the NGT return for the same period; flagged for reconciliation before co-signing.', false, false, '2026-08-15T09:00:00+05:30'),
  ('ngt-002', 'Ward 12 Liquid Waste Treatment Indicator', 'ward-12', 'liquid_waste', 'compliant', 'Treatment indicators within NGT-specified range for the reporting period.', true, true, '2026-08-10T09:00:00+05:30')
on conflict (id) do nothing;

insert into shift_handovers (id, shift_label, outgoing_supervisor, grievances_opened, grievances_closed, still_open_high_priority, unacknowledged_assignments, note, completed_at) values
  ('sh-001', 'Morning Shift · 06:00-14:00', 'K. Bhavani', 9, 5, 1, 0, 'Ward 14 vendor-cluster dumping escalated to enforcement; incoming shift to monitor challan closure.', '2026-08-16T14:05:00+05:30')
on conflict (id) do nothing;

insert into system_health_checks (id, name, status, detail, last_checked_at) values
  ('sys-001', 'WhatsApp Business API webhook', 'red', 'Pending Meta Business verification approval.', now()),
  ('sys-002', 'GPS fleet feed (gpsindia.live / Wialon)', 'amber', 'Pending contractor data-feed access negotiation; read-only report-template login in use.', now()),
  ('sys-003', 'Weighbridge logging module', 'green', 'Live manual-entry form at Allipuram; scan-triggered capture pending hardware.', now()),
  ('sys-004', 'PostGIS ward shapefile layer', 'amber', 'Ward 16 road network live; remaining 53 wards on interim hand-digitised placeholder.', now())
on conflict (id) do nothing;

insert into forecast_points (ward_id, date, predicted_tonnage, actual_tonnage) values
  ('ward-16', '2026-08-17', 8.0, 7.8),
  ('ward-16', '2026-08-18', 8.2, null),
  ('ward-16', '2026-08-19', 8.1, null),
  ('ward-12', '2026-08-17', 4.5, 4.6),
  ('ward-12', '2026-08-18', 4.4, null)
on conflict (ward_id, date) do nothing;

insert into beat_segments (id, ward_id, street_name, beat_type, status, assigned_worker) values
  ('beat-001', 'ward-16', 'Allipuram Market Road', 'sweeping', 'confirmed', 'P. Anjaneyulu'),
  ('beat-002', 'ward-16', 'Ranganayakulapeta Cross Street', 'collection', 'submitted', 'M. Sujatha'),
  ('beat-003', 'ward-16', 'Balaji Nagar Lane 3', 'sweeping', 'not_started', 'K. Ramesh'),
  ('beat-004', 'ward-14', 'Sivaji Market Drain Edge', 'collection', 'submitted', 'S. Vijaya'),
  ('beat-005', 'ward-14', 'Old Bus Stand Road', 'sweeping', 'not_started', 'D. Prasad')
on conflict (id) do nothing;

insert into worker_attendance (id, ward_id, worker_name, checked_in, photo_submitted) values
  ('att-001', 'ward-16', 'P. Anjaneyulu', true, true),
  ('att-002', 'ward-16', 'M. Sujatha', true, true),
  ('att-003', 'ward-16', 'K. Ramesh', false, false),
  ('att-004', 'ward-14', 'S. Vijaya', true, true),
  ('att-005', 'ward-14', 'D. Prasad', true, false)
on conflict (id) do nothing;

insert into ward_day_status (ward_id, date, confirmed) values
  ('ward-16', current_date, false),
  ('ward-14', current_date, false)
on conflict (ward_id) do nothing;
