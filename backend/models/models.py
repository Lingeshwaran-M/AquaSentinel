"""
AquaSentinel X — SQLAlchemy ORM Models
"""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, Enum, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from datetime import datetime
import uuid
import enum

from database import Base


# ─── Enum Classes ──────────────────────────────────────────────

class WaterBodyType(str, enum.Enum):
    lake = "lake"
    river = "river"
    canal = "canal"


class ViolationType(str, enum.Enum):
    construction = "construction"
    debris_dumping = "debris_dumping"
    land_filling = "land_filling"
    pollution = "pollution"
    unknown = "unknown"


class UrgencyLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class SeverityPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    critical = "critical"


class ComplaintStatus(str, enum.Enum):
    submitted = "submitted"
    validated = "validated"
    ai_processed = "ai_processed"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    rejected = "rejected"
    escalated = "escalated"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class UserRole(str, enum.Enum):
    citizen = "citizen"
    officer = "officer"
    supervisor = "supervisor"
    admin = "admin"


class EscalationLevel(str, enum.Enum):
    level_1 = "level_1"
    level_2 = "level_2"
    level_3 = "level_3"


class NotificationChannel(str, enum.Enum):
    email = "email"
    sms = "sms"
    in_app = "in_app"


# ─── User Model ───────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    role = Column(Enum(UserRole, name="user_role"), default=UserRole.citizen)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    complaints = relationship("Complaint", back_populates="citizen", foreign_keys="Complaint.citizen_id")
    assigned_complaints = relationship("Complaint", back_populates="assigned_officer", foreign_keys="Complaint.assigned_officer_id")
    notifications = relationship("Notification", back_populates="user")


# ─── Water Body Model ─────────────────────────────────────────

class WaterBody(Base):
    __tablename__ = "water_bodies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(Enum(WaterBodyType, name="water_body_type"), nullable=False)
    boundary = Column(Geometry("POLYGON", srid=4326), nullable=False)
    area_sq_km = Column(Float)
    sensitivity_score = Column(Integer, default=50)
    district = Column(String(255))
    state = Column(String(255))
    risk_level = Column(Enum(RiskLevel, name="risk_level"), default=RiskLevel.low)
    risk_score = Column(Integer, default=0)
    environmental_health_index = Column(Integer, default=100)
    metadata_ = Column("metadata", JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    complaints = relationship("Complaint", back_populates="water_body")
    risk_history = relationship("RiskHistory", back_populates="water_body")


# ─── Complaint Model ──────────────────────────────────────────

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_number = Column(String(20), unique=True, nullable=False)
    citizen_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    water_body_id = Column(UUID(as_uuid=True), ForeignKey("water_bodies.id"))
    category = Column(Enum(WaterBodyType, name="water_body_type"), nullable=False)
    description = Column(Text)
    location = Column(Geometry("POINT", srid=4326), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(Text)

    # AI Classification
    ai_violation_type = Column(Enum(ViolationType, name="violation_type"), default=ViolationType.unknown)
    ai_confidence_score = Column(Float, default=0)
    ai_urgency = Column(Enum(UrgencyLevel, name="urgency_level"), default=UrgencyLevel.low)
    ai_processed_at = Column(DateTime)

    # Severity
    severity_score = Column(Integer, default=0)
    severity_priority = Column(Enum(SeverityPriority, name="severity_priority"), default=SeverityPriority.low)

    # Status & SLA
    status = Column(Enum(ComplaintStatus, name="complaint_status"), default=ComplaintStatus.submitted)
    assigned_officer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    sla_deadline = Column(DateTime)
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    resolution_proof_url = Column(Text)

    # Escalation
    escalation_level = Column(Enum(EscalationLevel, name="escalation_level"))
    escalated_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    citizen = relationship("User", back_populates="complaints", foreign_keys=[citizen_id])
    assigned_officer = relationship("User", back_populates="assigned_complaints", foreign_keys=[assigned_officer_id])
    water_body = relationship("WaterBody", back_populates="complaints")
    media = relationship("ComplaintMedia", back_populates="complaint", cascade="all, delete-orphan")
    status_log = relationship("ComplaintStatusLog", back_populates="complaint", cascade="all, delete-orphan")
    escalation_history = relationship("EscalationHistory", back_populates="complaint", cascade="all, delete-orphan")


# ─── Complaint Media Model ────────────────────────────────────

class ComplaintMedia(Base):
    __tablename__ = "complaint_media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    file_url = Column(Text, nullable=False)
    file_type = Column(String(20), nullable=False)
    file_name = Column(String(255))
    file_size_bytes = Column(Integer)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="media")


# ─── Escalation History Model ─────────────────────────────────

class EscalationHistory(Base):
    __tablename__ = "escalation_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    from_level = Column(Enum(EscalationLevel, name="escalation_level"))
    to_level = Column(Enum(EscalationLevel, name="escalation_level"), nullable=False)
    from_officer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    to_officer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    reason = Column(Text)
    escalated_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="escalation_history")


# ─── Notification Model ───────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"))
    channel = Column(Enum(NotificationChannel, name="notification_channel"), default=NotificationChannel.in_app)
    subject = Column(String(500))
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


# ─── Risk History Model ───────────────────────────────────────

class RiskHistory(Base):
    __tablename__ = "risk_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    water_body_id = Column(UUID(as_uuid=True), ForeignKey("water_bodies.id", ondelete="CASCADE"), nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(Enum(RiskLevel, name="risk_level"), nullable=False)
    complaint_density = Column(Float, default=0)
    construction_activity_score = Column(Integer, default=0)
    urban_growth_score = Column(Integer, default=0)
    shrinkage_score = Column(Integer, default=0)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    water_body = relationship("WaterBody", back_populates="risk_history")


# ─── Complaint Status Log ─────────────────────────────────────

class ComplaintStatusLog(Base):
    __tablename__ = "complaint_status_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    old_status = Column(Enum(ComplaintStatus, name="complaint_status"))
    new_status = Column(Enum(ComplaintStatus, name="complaint_status"), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    notes = Column(Text)
    changed_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="status_log")
