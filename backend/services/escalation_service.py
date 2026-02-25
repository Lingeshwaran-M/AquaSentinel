"""
AquaSentinel X — SLA & Escalation Engine

Handles automatic escalation of overdue complaints:
- Level 1: Notifies assigned officer (1 day before deadline)
- Level 2: Escalates to supervisor (when deadline passes)
- Level 3: Escalates to admin (2 days past deadline)
"""
import logging
from datetime import datetime, timedelta
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text

from models.models import (
    Complaint, ComplaintStatus, EscalationLevel,
    EscalationHistory, User, UserRole
)
from utils.notifications import notify_escalation

logger = logging.getLogger(__name__)


async def check_and_escalate(db: AsyncSession) -> List[dict]:
    """
    Check all active complaints for SLA breaches and escalate as needed.
    This should be run periodically (e.g., every hour via cron/scheduler).

    Escalation levels:
    - Level 1: Warning notification 1 day before deadline
    - Level 2: Escalate to supervisor when deadline passes
    - Level 3: Escalate to admin 2 days past deadline
    """
    now = datetime.utcnow()
    escalation_results = []

    # ─── Level 1: Warning (1 day before deadline) ──────────────
    warning_query = select(Complaint).where(
        and_(
            Complaint.sla_deadline <= now + timedelta(days=1),
            Complaint.sla_deadline > now,
            Complaint.status.notin_([
                ComplaintStatus.resolved,
                ComplaintStatus.rejected,
            ]),
            Complaint.escalation_level.is_(None),
        )
    )

    result = await db.execute(warning_query)
    warning_complaints = result.scalars().all()

    for complaint in warning_complaints:
        complaint.escalation_level = EscalationLevel.level_1
        complaint.escalated_at = now

        if complaint.assigned_officer_id:
            officer = await db.get(User, complaint.assigned_officer_id)
            if officer:
                await notify_escalation(
                    db, officer, complaint.complaint_number, "Level 1 - Warning"
                )

        escalation = EscalationHistory(
            complaint_id=complaint.id,
            to_level=EscalationLevel.level_1,
            to_officer_id=complaint.assigned_officer_id,
            reason=f"SLA deadline approaching: {complaint.sla_deadline}",
        )
        db.add(escalation)

        escalation_results.append({
            "complaint_number": complaint.complaint_number,
            "level": "level_1",
            "reason": "SLA deadline approaching",
        })

    # ─── Level 2: Escalate to Supervisor (deadline passed) ─────
    overdue_query = select(Complaint).where(
        and_(
            Complaint.sla_deadline <= now,
            Complaint.status.notin_([
                ComplaintStatus.resolved,
                ComplaintStatus.rejected,
            ]),
            Complaint.escalation_level.in_([EscalationLevel.level_1, None]),
        )
    )

    result = await db.execute(overdue_query)
    overdue_complaints = result.scalars().all()

    for complaint in overdue_complaints:
        old_level = complaint.escalation_level
        complaint.escalation_level = EscalationLevel.level_2
        complaint.escalated_at = now
        complaint.status = ComplaintStatus.escalated

        # Find supervisor
        supervisor = await _find_supervisor(db)
        if supervisor:
            await notify_escalation(
                db, supervisor, complaint.complaint_number, "Level 2 - Supervisor"
            )

        escalation = EscalationHistory(
            complaint_id=complaint.id,
            from_level=old_level,
            to_level=EscalationLevel.level_2,
            from_officer_id=complaint.assigned_officer_id,
            to_officer_id=supervisor.id if supervisor else None,
            reason=f"SLA deadline exceeded: {complaint.sla_deadline}",
        )
        db.add(escalation)

        escalation_results.append({
            "complaint_number": complaint.complaint_number,
            "level": "level_2",
            "reason": "SLA deadline exceeded - escalated to supervisor",
        })

    # ─── Level 3: Escalate to Admin (2+ days overdue) ──────────
    critical_overdue_query = select(Complaint).where(
        and_(
            Complaint.sla_deadline <= now - timedelta(days=2),
            Complaint.status.notin_([
                ComplaintStatus.resolved,
                ComplaintStatus.rejected,
            ]),
            Complaint.escalation_level == EscalationLevel.level_2,
        )
    )

    result = await db.execute(critical_overdue_query)
    critical_complaints = result.scalars().all()

    for complaint in critical_complaints:
        complaint.escalation_level = EscalationLevel.level_3
        complaint.escalated_at = now

        # Find admin
        admin = await _find_admin(db)
        if admin:
            await notify_escalation(
                db, admin, complaint.complaint_number, "Level 3 - Admin Escalation"
            )

        escalation = EscalationHistory(
            complaint_id=complaint.id,
            from_level=EscalationLevel.level_2,
            to_level=EscalationLevel.level_3,
            to_officer_id=admin.id if admin else None,
            reason=f"Critical SLA breach: {(now - complaint.sla_deadline).days} days overdue",
        )
        db.add(escalation)

        escalation_results.append({
            "complaint_number": complaint.complaint_number,
            "level": "level_3",
            "reason": f"Critical breach - {(now - complaint.sla_deadline).days} days overdue",
        })

    await db.flush()

    logger.info(f"Escalation check complete: {len(escalation_results)} actions taken")
    return escalation_results


async def _find_supervisor(db: AsyncSession) -> User:
    """Find an active supervisor."""
    result = await db.execute(
        select(User).where(
            and_(User.role == UserRole.supervisor, User.is_active == True)
        ).limit(1)
    )
    return result.scalar_one_or_none()


async def _find_admin(db: AsyncSession) -> User:
    """Find an active admin."""
    result = await db.execute(
        select(User).where(
            and_(User.role == UserRole.admin, User.is_active == True)
        ).limit(1)
    )
    return result.scalar_one_or_none()
