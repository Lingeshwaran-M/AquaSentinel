"""
AquaSentinel X — Pydantic Schemas for API Request/Response
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


# ─── Enums ─────────────────────────────────────────────────────

class WaterBodyTypeEnum(str, Enum):
    lake = "lake"
    river = "river"
    canal = "canal"


class ViolationTypeEnum(str, Enum):
    construction = "construction"
    debris_dumping = "debris_dumping"
    land_filling = "land_filling"
    pollution = "pollution"
    unknown = "unknown"


class UrgencyLevelEnum(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class SeverityPriorityEnum(str, Enum):
    low = "low"
    medium = "medium"
    critical = "critical"


class ComplaintStatusEnum(str, Enum):
    submitted = "submitted"
    validated = "validated"
    ai_processed = "ai_processed"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    rejected = "rejected"
    escalated = "escalated"


class RiskLevelEnum(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class UserRoleEnum(str, Enum):
    citizen = "citizen"
    officer = "officer"
    supervisor = "supervisor"
    admin = "admin"


# ─── Auth Schemas ──────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=2)
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str]
    role: UserRoleEnum
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Water Body Schemas ────────────────────────────────────────

class WaterBodyResponse(BaseModel):
    id: UUID
    name: str
    type: WaterBodyTypeEnum
    area_sq_km: Optional[float]
    sensitivity_score: int
    district: Optional[str]
    state: Optional[str]
    risk_level: RiskLevelEnum
    risk_score: int
    environmental_health_index: int
    created_at: datetime

    class Config:
        from_attributes = True


class WaterBodyWithBoundary(WaterBodyResponse):
    boundary_geojson: Optional[dict] = None


# ─── Complaint Schemas ─────────────────────────────────────────

class ComplaintCreate(BaseModel):
    category: WaterBodyTypeEnum
    description: Optional[str] = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address: Optional[str] = None


class ComplaintResponse(BaseModel):
    id: UUID
    complaint_number: str
    citizen_id: UUID
    water_body_id: Optional[UUID]
    category: WaterBodyTypeEnum
    description: Optional[str]
    latitude: float
    longitude: float
    address: Optional[str]

    # AI results
    ai_violation_type: ViolationTypeEnum
    ai_confidence_score: float
    ai_urgency: UrgencyLevelEnum

    # Severity
    severity_score: int
    severity_priority: SeverityPriorityEnum

    # Status/SLA
    status: ComplaintStatusEnum
    assigned_officer_id: Optional[UUID]
    sla_deadline: Optional[datetime]
    resolved_at: Optional[datetime]
    resolution_notes: Optional[str]
    resolution_proof_url: Optional[str]

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComplaintDetail(ComplaintResponse):
    citizen: Optional[UserResponse] = None
    media: Optional[List["MediaResponse"]] = None
    status_log: Optional[List["StatusLogResponse"]] = None


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatusEnum
    notes: Optional[str] = None
    resolution_proof_url: Optional[str] = None


# ─── Media Schemas ─────────────────────────────────────────────

class MediaResponse(BaseModel):
    id: UUID
    file_url: str
    file_type: str
    file_name: Optional[str]
    file_size_bytes: Optional[int]
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ─── Status Log Schemas ───────────────────────────────────────

class StatusLogResponse(BaseModel):
    id: UUID
    old_status: Optional[ComplaintStatusEnum]
    new_status: ComplaintStatusEnum
    changed_by: Optional[UUID]
    notes: Optional[str]
    changed_at: datetime

    class Config:
        from_attributes = True


# ─── AI Classification Schemas ─────────────────────────────────

class AIClassificationResult(BaseModel):
    violation_type: ViolationTypeEnum
    confidence_score: float = Field(ge=0, le=1)
    urgency: UrgencyLevelEnum


class SeverityResult(BaseModel):
    score: int = Field(ge=0, le=100)
    priority: SeverityPriorityEnum
    breakdown: dict


# ─── Risk Schemas ──────────────────────────────────────────────

class RiskScoreResponse(BaseModel):
    water_body_id: UUID
    water_body_name: str
    risk_score: int
    risk_level: RiskLevelEnum
    complaint_density: float
    construction_activity_score: int
    urban_growth_score: int
    shrinkage_score: int
    calculated_at: datetime

    class Config:
        from_attributes = True


# ─── Notification Schemas ──────────────────────────────────────

class NotificationResponse(BaseModel):
    id: UUID
    complaint_id: Optional[UUID]
    channel: str
    subject: Optional[str]
    message: str
    is_read: bool
    sent_at: datetime

    class Config:
        from_attributes = True


# ─── Dashboard / Analytics Schemas ─────────────────────────────

class DashboardStats(BaseModel):
    total_complaints: int
    active_complaints: int
    resolved_complaints: int
    critical_complaints: int
    overdue_complaints: int
    avg_resolution_hours: Optional[float]
    resolution_rate: float
    water_bodies_at_risk: int


class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    weight: float
    complaint_id: Optional[UUID] = None
    severity: Optional[str] = None


class PublicDashboardData(BaseModel):
    stats: DashboardStats
    heatmap_points: List[HeatmapPoint]
    water_bodies: List[WaterBodyResponse]
    critical_alerts: List[ComplaintResponse]
    risk_zones: List[RiskScoreResponse]


# Fix forward references
TokenResponse.model_rebuild()
ComplaintDetail.model_rebuild()
