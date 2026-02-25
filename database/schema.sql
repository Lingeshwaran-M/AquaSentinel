-- =============================================================
-- AquaSentinel X — Database Schema
-- PostgreSQL 15+ with PostGIS extension
-- =============================================================

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM TYPES ──────────────────────────────────────────────

CREATE TYPE water_body_type AS ENUM ('lake', 'river', 'canal');
CREATE TYPE violation_type AS ENUM ('construction', 'debris_dumping', 'land_filling', 'pollution', 'unknown');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE severity_priority AS ENUM ('low', 'medium', 'critical');
CREATE TYPE complaint_status AS ENUM (
    'submitted', 'validated', 'ai_processed', 'assigned',
    'in_progress', 'resolved', 'rejected', 'escalated'
);
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE user_role AS ENUM ('citizen', 'officer', 'supervisor', 'admin');
CREATE TYPE escalation_level AS ENUM ('level_1', 'level_2', 'level_3');
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'in_app');

-- ─── USERS ───────────────────────────────────────────────────

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ─── WATER BODIES ────────────────────────────────────────────

CREATE TABLE water_bodies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type water_body_type NOT NULL,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    area_sq_km DECIMAL(10, 4),
    sensitivity_score INTEGER DEFAULT 50 CHECK (sensitivity_score BETWEEN 0 AND 100),
    district VARCHAR(255),
    state VARCHAR(255),
    risk_level risk_level DEFAULT 'low',
    risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    environmental_health_index INTEGER DEFAULT 100 CHECK (environmental_health_index BETWEEN 0 AND 100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_water_bodies_boundary ON water_bodies USING GIST(boundary);
CREATE INDEX idx_water_bodies_type ON water_bodies(type);
CREATE INDEX idx_water_bodies_risk ON water_bodies(risk_level);

-- ─── COMPLAINTS ──────────────────────────────────────────────

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_number VARCHAR(20) UNIQUE NOT NULL,
    citizen_id UUID NOT NULL REFERENCES users(id),
    water_body_id UUID REFERENCES water_bodies(id),
    category water_body_type NOT NULL,
    description TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    address TEXT,

    -- AI Classification Results
    ai_violation_type violation_type DEFAULT 'unknown',
    ai_confidence_score DECIMAL(5, 4) DEFAULT 0,
    ai_urgency urgency_level DEFAULT 'low',
    ai_processed_at TIMESTAMPTZ,

    -- Severity Index
    severity_score INTEGER DEFAULT 0 CHECK (severity_score BETWEEN 0 AND 100),
    severity_priority severity_priority DEFAULT 'low',

    -- SLA & Status
    status complaint_status DEFAULT 'submitted',
    assigned_officer_id UUID REFERENCES users(id),
    sla_deadline TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    resolution_proof_url TEXT,

    -- Escalation
    escalation_level escalation_level,
    escalated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_complaints_location ON complaints USING GIST(location);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX idx_complaints_officer ON complaints(assigned_officer_id);
CREATE INDEX idx_complaints_water_body ON complaints(water_body_id);
CREATE INDEX idx_complaints_severity ON complaints(severity_priority);
CREATE INDEX idx_complaints_sla ON complaints(sla_deadline);
CREATE INDEX idx_complaints_number ON complaints(complaint_number);

-- ─── COMPLAINT MEDIA ─────────────────────────────────────────

CREATE TABLE complaint_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(20) NOT NULL, -- 'image' or 'video'
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_complaint ON complaint_media(complaint_id);

-- ─── ESCALATION HISTORY ──────────────────────────────────────

CREATE TABLE escalation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    from_level escalation_level,
    to_level escalation_level NOT NULL,
    from_officer_id UUID REFERENCES users(id),
    to_officer_id UUID REFERENCES users(id),
    reason TEXT,
    escalated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escalation_complaint ON escalation_history(complaint_id);

-- ─── NOTIFICATIONS ───────────────────────────────────────────

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    complaint_id UUID REFERENCES complaints(id),
    channel notification_channel DEFAULT 'in_app',
    subject VARCHAR(500),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ─── RISK HISTORY (for trend tracking) ───────────────────────

CREATE TABLE risk_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    water_body_id UUID NOT NULL REFERENCES water_bodies(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_level risk_level NOT NULL,
    complaint_density DECIMAL(10, 4) DEFAULT 0,
    construction_activity_score INTEGER DEFAULT 0,
    urban_growth_score INTEGER DEFAULT 0,
    shrinkage_score INTEGER DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_history_water_body ON risk_history(water_body_id);

-- ─── STATUS AUDIT LOG ────────────────────────────────────────

CREATE TABLE complaint_status_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    old_status complaint_status,
    new_status complaint_status NOT NULL,
    changed_by UUID REFERENCES users(id),
    notes TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_status_log_complaint ON complaint_status_log(complaint_id);

-- ─── HELPER FUNCTIONS ────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_water_bodies_updated_at
    BEFORE UPDATE ON water_bodies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate complaint number
CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS TRIGGER AS $$
DECLARE
    seq_num INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO seq_num FROM complaints;
    NEW.complaint_number := 'AQS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complaint_number
    BEFORE INSERT ON complaints
    FOR EACH ROW
    WHEN (NEW.complaint_number IS NULL OR NEW.complaint_number = '')
    EXECUTE FUNCTION generate_complaint_number();
