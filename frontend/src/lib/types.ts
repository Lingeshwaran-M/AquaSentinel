// ─── User Types ──────────────────────────────────────────────
export interface User {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    role: 'citizen' | 'officer' | 'supervisor' | 'admin';
    is_active: boolean;
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

// ─── Complaint Types ─────────────────────────────────────────
export interface Complaint {
    id: string;
    complaint_number: string;
    citizen_id: string;
    water_body_id?: string;
    category: 'lake' | 'river' | 'canal';
    description?: string;
    latitude: number;
    longitude: number;
    address?: string;
    ai_violation_type: string;
    ai_confidence_score: number;
    ai_urgency: 'low' | 'medium' | 'high';
    severity_score: number;
    severity_priority: 'low' | 'medium' | 'critical';
    status: string;
    assigned_officer_id?: string;
    sla_deadline?: string;
    resolved_at?: string;
    resolution_notes?: string;
    resolution_proof_url?: string;
    created_at: string;
    updated_at: string;
    citizen?: User;
    media?: Media[];
    status_log?: StatusLog[];
}

export interface Media {
    id: string;
    file_url: string;
    file_type: string;
    file_name?: string;
    file_size_bytes?: number;
    uploaded_at: string;
}

export interface StatusLog {
    id: string;
    old_status?: string;
    new_status: string;
    changed_by?: string;
    notes?: string;
    changed_at: string;
}

// ─── Water Body Types ────────────────────────────────────────
export interface WaterBody {
    id: string;
    name: string;
    type: 'lake' | 'river' | 'canal';
    area_sq_km?: number;
    sensitivity_score: number;
    district?: string;
    state?: string;
    risk_level: 'low' | 'medium' | 'high';
    risk_score: number;
    environmental_health_index: number;
    created_at: string;
}

// ─── Dashboard Types ─────────────────────────────────────────
export interface DashboardStats {
    total_complaints: number;
    active_complaints: number;
    resolved_complaints: number;
    critical_complaints: number;
    overdue_complaints: number;
    avg_resolution_hours?: number;
    resolution_rate: number;
    water_bodies_at_risk: number;
}

export interface HeatmapPoint {
    latitude: number;
    longitude: number;
    weight: number;
    complaint_id?: string;
    severity?: string;
}

export interface RiskScore {
    water_body_id: string;
    water_body_name: string;
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high';
    complaint_density: number;
    construction_activity_score: number;
    urban_growth_score: number;
    shrinkage_score: number;
    calculated_at: string;
}

// ─── Notification Types ──────────────────────────────────────
export interface Notification {
    id: string;
    complaint_id?: string;
    channel: string;
    subject?: string;
    message: string;
    is_read: boolean;
    sent_at: string;
}
