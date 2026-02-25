"""
AquaSentinel X — Complaint Service
Core business logic for complaint management.
"""
import os
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_
from sqlalchemy.orm import selectinload

from models.models import (
    Complaint, ComplaintMedia, ComplaintStatusLog, User,
    WaterBody, ComplaintStatus, ViolationType, UrgencyLevel,
    SeverityPriority, UserRole
)
from ai.classifier import classify_image
from ai.severity import calculate_severity, get_sla_days
from utils.geo import validate_location_in_water_body, find_nearby_water_body, get_complaint_density
from utils.notifications import (
    notify_complaint_submitted, notify_complaint_assigned
)
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def create_complaint(
    db: AsyncSession,
    citizen: User,
    category: str,
    latitude: float,
    longitude: float,
    description: Optional[str] = None,
    address: Optional[str] = None,
    image_path: Optional[str] = None,
) -> Complaint:
    """
    Full complaint creation pipeline:
    1. Validate location against water body boundaries
    2. Run AI classification on uploaded image
    3. Calculate Environmental Severity Index
    4. Set SLA deadline
    5. Auto-assign to available officer
    6. Send notifications
    """

    # ─── Step 1: Geo-Fencing Validation ────────────────────────
    water_body_info = await validate_location_in_water_body(db, latitude, longitude)

    if not water_body_info:
        # Try nearby water body (within 500m fallback)
        water_body_info = await find_nearby_water_body(db, latitude, longitude, radius_meters=500)

    if not water_body_info:
        raise ValueError(
            "The reported location is not within or near any registered water body boundary. "
            "Please select a location closer to a water body."
        )

    water_body_id = water_body_info["id"]
    sensitivity = water_body_info.get("sensitivity_score", 50)

    # ─── Step 2: AI Image Classification ───────────────────────
    ai_result = classify_image(image_path)

    # ─── Step 3: Calculate Severity ────────────────────────────
    density = await get_complaint_density(db, water_body_id)
    severity_result = calculate_severity(
        violation_type=ai_result["violation_type"],
        ai_urgency=ai_result["urgency"],
        location_sensitivity=sensitivity,
        complaint_density=density,
        water_body_type=water_body_info.get("type", "lake"),
    )

    # ─── Step 4: Determine SLA Deadline ────────────────────────
    sla_days = get_sla_days(severity_result["priority"])
    sla_deadline = datetime.utcnow() + timedelta(days=sla_days)

    # ─── Step 5: Generate Complaint Number ─────────────────────
    count_result = await db.execute(select(func.count(Complaint.id)))
    count = count_result.scalar() or 0
    complaint_number = f"AQS-{datetime.utcnow().strftime('%Y%m%d')}-{str(count + 1).zfill(5)}"

    # ─── Step 6: Create Complaint Record ───────────────────────
    complaint = Complaint(
        complaint_number=complaint_number,
        citizen_id=citizen.id,
        water_body_id=uuid.UUID(water_body_id),
        category=category,
        description=description,
        location=f"SRID=4326;POINT({longitude} {latitude})",
        latitude=latitude,
        longitude=longitude,
        address=address,
        ai_violation_type=ai_result["violation_type"],
        ai_confidence_score=ai_result["confidence_score"],
        ai_urgency=ai_result["urgency"],
        ai_processed_at=datetime.utcnow(),
        severity_score=severity_result["score"],
        severity_priority=severity_result["priority"],
        status=ComplaintStatus.ai_processed,
        sla_deadline=sla_deadline,
    )

    db.add(complaint)
    await db.flush()

    # ─── Step 7: Log initial status ────────────────────────────
    status_log = ComplaintStatusLog(
        complaint_id=complaint.id,
        new_status=ComplaintStatus.ai_processed,
        changed_by=citizen.id,
        notes=f"Complaint submitted and AI processed. Violation: {ai_result['violation_type']}, Severity: {severity_result['score']}",
    )
    db.add(status_log)

    # ─── Step 8: Auto-assign officer ───────────────────────────
    officer = await _find_available_officer(db)
    if officer:
        complaint.assigned_officer_id = officer.id
        complaint.status = ComplaintStatus.assigned

        assign_log = ComplaintStatusLog(
            complaint_id=complaint.id,
            old_status=ComplaintStatus.ai_processed,
            new_status=ComplaintStatus.assigned,
            notes=f"Auto-assigned to officer: {officer.full_name}",
        )
        db.add(assign_log)

        await notify_complaint_assigned(
            db, officer, complaint_number,
            severity_result["priority"],
            sla_deadline.strftime("%Y-%m-%d %H:%M UTC"),
        )

    # ─── Step 9: Notify citizen ────────────────────────────────
    await notify_complaint_submitted(db, citizen, complaint_number)

    await db.flush()
    logger.info(f"Complaint {complaint_number} created successfully")

    return complaint


async def get_complaint_by_id(
    db: AsyncSession,
    complaint_id: str,
) -> Optional[Complaint]:
    """Get complaint with related data."""
    result = await db.execute(
        select(Complaint)
        .options(
            selectinload(Complaint.citizen),
            selectinload(Complaint.media),
            selectinload(Complaint.status_log),
        )
        .where(Complaint.id == complaint_id)
    )
    return result.scalar_one_or_none()


async def get_complaint_by_number(
    db: AsyncSession,
    complaint_number: str,
) -> Optional[Complaint]:
    """Get complaint by complaint number."""
    result = await db.execute(
        select(Complaint)
        .options(
            selectinload(Complaint.citizen),
            selectinload(Complaint.media),
            selectinload(Complaint.status_log),
        )
        .where(Complaint.complaint_number == complaint_number)
    )
    return result.scalar_one_or_none()


async def get_complaints(
    db: AsyncSession,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    officer_id: Optional[str] = None,
    citizen_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Complaint]:
    """Get filtered list of complaints."""
    query = select(Complaint).options(
        selectinload(Complaint.citizen),
        selectinload(Complaint.media),
    )

    if status:
        query = query.where(Complaint.status == status)
    if priority:
        query = query.where(Complaint.severity_priority == priority)
    if officer_id:
        query = query.where(Complaint.assigned_officer_id == officer_id)
    if citizen_id:
        query = query.where(Complaint.citizen_id == citizen_id)

    query = query.order_by(Complaint.severity_score.desc(), Complaint.created_at.desc())
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


async def update_complaint_status(
    db: AsyncSession,
    complaint_id: str,
    new_status: str,
    changed_by: User,
    notes: Optional[str] = None,
    resolution_proof_url: Optional[str] = None,
) -> Complaint:
    """Update complaint status with audit trail."""
    complaint = await get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise ValueError("Complaint not found")

    old_status = complaint.status

    complaint.status = new_status
    if notes:
        complaint.resolution_notes = notes
    if resolution_proof_url:
        complaint.resolution_proof_url = resolution_proof_url
    if new_status == ComplaintStatus.resolved:
        complaint.resolved_at = datetime.utcnow()

    # Log status change
    status_log = ComplaintStatusLog(
        complaint_id=complaint.id,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by.id,
        notes=notes,
    )
    db.add(status_log)
    await db.flush()

    logger.info(f"Complaint {complaint.complaint_number} status: {old_status} → {new_status}")
    return complaint


async def upload_complaint_media(
    db: AsyncSession,
    complaint_id: str,
    file_url: str,
    file_type: str,
    file_name: str,
    file_size: int,
) -> ComplaintMedia:
    """Add media file to complaint."""
    media = ComplaintMedia(
        complaint_id=uuid.UUID(complaint_id),
        file_url=file_url,
        file_type=file_type,
        file_name=file_name,
        file_size_bytes=file_size,
    )
    db.add(media)
    await db.flush()
    return media


async def _find_available_officer(db: AsyncSession) -> Optional[User]:
    """Find officer with fewest active assignments."""
    query = text("""
        SELECT u.id, u.full_name, u.email,
               COUNT(c.id) FILTER (WHERE c.status NOT IN ('resolved', 'rejected')) AS active_count
        FROM users u
        LEFT JOIN complaints c ON c.assigned_officer_id = u.id
        WHERE u.role = 'officer' AND u.is_active = true
        GROUP BY u.id, u.full_name, u.email
        ORDER BY active_count ASC
        LIMIT 1
    """)
    result = await db.execute(query)
    row = result.fetchone()

    if row:
        officer_result = await db.execute(select(User).where(User.id == row[0]))
        return officer_result.scalar_one_or_none()
    return None


async def get_overdue_complaints(db: AsyncSession) -> List[Complaint]:
    """Get all complaints past their SLA deadline."""
    query = select(Complaint).where(
        and_(
            Complaint.sla_deadline < datetime.utcnow(),
            Complaint.status.notin_([
                ComplaintStatus.resolved,
                ComplaintStatus.rejected,
            ]),
        )
    ).order_by(Complaint.sla_deadline.asc())

    result = await db.execute(query)
    return result.scalars().all()
