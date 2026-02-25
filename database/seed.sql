-- =============================================================
-- AquaSentinel X — Seed Data
-- =============================================================

-- ─── ADMIN USER (password: admin123) ─────────────────────────
INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin@aquasentinel.com',
     '$2b$12$LQv3c1yqBo9SkvXS7QTJcOQw0r6tRZ9Kd9bR9K5gVjDq1JgMHxK3i',
     'System Admin', '+91-9000000001', 'admin'),
    ('a0000000-0000-0000-0000-000000000002', 'officer1@aquasentinel.com',
     '$2b$12$LQv3c1yqBo9SkvXS7QTJcOQw0r6tRZ9Kd9bR9K5gVjDq1JgMHxK3i',
     'Officer Ramesh Kumar', '+91-9000000002', 'officer'),
    ('a0000000-0000-0000-0000-000000000003', 'officer2@aquasentinel.com',
     '$2b$12$LQv3c1yqBo9SkvXS7QTJcOQw0r6tRZ9Kd9bR9K5gVjDq1JgMHxK3i',
     'Supervisor Lakshmi Devi', '+91-9000000003', 'supervisor'),
    ('a0000000-0000-0000-0000-000000000004', 'citizen@aquasentinel.com',
     '$2b$12$LQv3c1yqBo9SkvXS7QTJcOQw0r6tRZ9Kd9bR9K5gVjDq1JgMHxK3i',
     'Citizen Priya Sharma', '+91-9000000004', 'citizen');

-- ─── WATER BODIES (Bangalore area examples) ──────────────────

INSERT INTO water_bodies (id, name, type, boundary, area_sq_km, sensitivity_score, district, state) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'Bellandur Lake',
    'lake',
    ST_GeomFromText('POLYGON((77.6500 12.9350, 77.6700 12.9350, 77.6700 12.9500, 77.6500 12.9500, 77.6500 12.9350))', 4326),
    3.64,
    85,
    'Bangalore Urban',
    'Karnataka'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'Ulsoor Lake',
    'lake',
    ST_GeomFromText('POLYGON((77.6150 12.9800, 77.6250 12.9800, 77.6250 12.9880, 77.6150 12.9880, 77.6150 12.9800))', 4326),
    1.23,
    75,
    'Bangalore Urban',
    'Karnataka'
),
(
    'b0000000-0000-0000-0000-000000000003',
    'Hebbal Lake',
    'lake',
    ST_GeomFromText('POLYGON((77.5850 13.0350, 77.5980 13.0350, 77.5980 13.0450, 77.5850 13.0450, 77.5850 13.0350))', 4326),
    0.75,
    70,
    'Bangalore Urban',
    'Karnataka'
),
(
    'b0000000-0000-0000-0000-000000000004',
    'Madiwala Lake',
    'lake',
    ST_GeomFromText('POLYGON((77.6150 12.9200, 77.6280 12.9200, 77.6280 12.9320, 77.6150 12.9320, 77.6150 12.9200))', 4326),
    1.10,
    65,
    'Bangalore Urban',
    'Karnataka'
),
(
    'b0000000-0000-0000-0000-000000000005',
    'Vrishabhavathi River',
    'river',
    ST_GeomFromText('POLYGON((77.5200 12.9100, 77.5400 12.9100, 77.5400 12.9300, 77.5200 12.9300, 77.5200 12.9100))', 4326),
    5.50,
    90,
    'Bangalore Urban',
    'Karnataka'
);

-- ─── SAMPLE COMPLAINTS ──────────────────────────────────────

INSERT INTO complaints (
    id, complaint_number, citizen_id, water_body_id, category, description,
    location, latitude, longitude,
    ai_violation_type, ai_confidence_score, ai_urgency, ai_processed_at,
    severity_score, severity_priority, status, assigned_officer_id,
    sla_deadline
) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'AQS-20260225-00001',
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'lake',
    'Large-scale construction activity observed near Bellandur Lake shore. Foundation digging in progress.',
    ST_SetSRID(ST_MakePoint(77.6600, 12.9400), 4326),
    12.9400, 77.6600,
    'construction', 0.92, 'high', NOW(),
    88, 'critical', 'assigned',
    'a0000000-0000-0000-0000-000000000002',
    NOW() + INTERVAL '3 days'
),
(
    'c0000000-0000-0000-0000-000000000002',
    'AQS-20260225-00002',
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'lake',
    'Debris and garbage dumped near Ulsoor Lake. Affecting water quality.',
    ST_SetSRID(ST_MakePoint(77.6200, 12.9840), 4326),
    12.9840, 77.6200,
    'debris_dumping', 0.85, 'medium', NOW(),
    62, 'medium', 'in_progress',
    'a0000000-0000-0000-0000-000000000002',
    NOW() + INTERVAL '7 days'
),
(
    'c0000000-0000-0000-0000-000000000003',
    'AQS-20260225-00003',
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000003',
    'lake',
    'Minor pollution spotted near Hebbal Lake inlet. Appears to be sewage runoff.',
    ST_SetSRID(ST_MakePoint(77.5920, 13.0400), 4326),
    13.0400, 77.5920,
    'pollution', 0.78, 'low', NOW(),
    35, 'low', 'ai_processed',
    NULL,
    NOW() + INTERVAL '10 days'
);

-- ─── INITIAL RISK HISTORY ────────────────────────────────────

INSERT INTO risk_history (water_body_id, risk_score, risk_level, complaint_density, construction_activity_score, urban_growth_score, shrinkage_score) VALUES
    ('b0000000-0000-0000-0000-000000000001', 78, 'high', 12.5, 85, 90, 70),
    ('b0000000-0000-0000-0000-000000000002', 55, 'medium', 6.3, 40, 65, 30),
    ('b0000000-0000-0000-0000-000000000003', 42, 'medium', 3.1, 25, 50, 20),
    ('b0000000-0000-0000-0000-000000000004', 30, 'low', 1.5, 15, 35, 10),
    ('b0000000-0000-0000-0000-000000000005', 68, 'high', 8.7, 60, 75, 55);
