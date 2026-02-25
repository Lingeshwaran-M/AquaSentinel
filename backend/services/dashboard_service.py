"""
AquaSentinel X — Dashboard & Analytics Service
"""
import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_

from models.models import (
    Complaint, WaterBody, ComplaintStatus, SeverityPriority, RiskLevel
)
from models.schemas import DashboardStats, HeatmapPoint

logger = logging.getLogger(__name__)


async def get_dashboard_stats(db: AsyncSession) -> DashboardStats:
    """Get aggregate statistics for dashboard."""

    # Total complaints
    total_q = await db.execute(select(func.count(Complaint.id)))
    total = total_q.scalar() or 0

    # Active complaints
    active_q = await db.execute(
        select(func.count(Complaint.id)).where(
            Complaint.status.notin_([
                ComplaintStatus.resolved,
                ComplaintStatus.rejected,
            ])
        )
    )
    active = active_q.scalar() or 0

    # Resolved
    resolved_q = await db.execute(
        select(func.count(Complaint.id)).where(
            Complaint.status == ComplaintStatus.resolved
        )
    )
    resolved = resolved_q.scalar() or 0

    # Critical
    critical_q = await db.execute(
        select(func.count(Complaint.id)).where(
            Complaint.severity_priority == SeverityPriority.critical
        )
    )
    critical = critical_q.scalar() or 0

    # Overdue
    now = datetime.utcnow()
    overdue_q = await db.execute(
        select(func.count(Complaint.id)).where(
            and_(
                Complaint.sla_deadline < now,
                Complaint.status.notin_([
                    ComplaintStatus.resolved,
                    ComplaintStatus.rejected,
                ]),
            )
        )
    )
    overdue = overdue_q.scalar() or 0

    # Average resolution time (hours)
    avg_resolution_q = await db.execute(text("""
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
        FROM complaints
        WHERE resolved_at IS NOT NULL
    """))
    avg_hours = avg_resolution_q.scalar()

    # Resolution rate
    resolution_rate = (resolved / total * 100) if total > 0 else 0

    # Water bodies at risk
    at_risk_q = await db.execute(
        select(func.count(WaterBody.id)).where(
            WaterBody.risk_level.in_([RiskLevel.medium, RiskLevel.high])
        )
    )
    at_risk = at_risk_q.scalar() or 0

    return DashboardStats(
        total_complaints=total,
        active_complaints=active,
        resolved_complaints=resolved,
        critical_complaints=critical,
        overdue_complaints=overdue,
        avg_resolution_hours=round(avg_hours, 2) if avg_hours else None,
        resolution_rate=round(resolution_rate, 2),
        water_bodies_at_risk=at_risk,
    )


async def get_heatmap_data(db: AsyncSession) -> List[HeatmapPoint]:
    """Get complaint locations for heatmap visualization."""
    result = await db.execute(
        select(
            Complaint.id,
            Complaint.latitude,
            Complaint.longitude,
            Complaint.severity_score,
            Complaint.severity_priority,
        ).where(
            Complaint.status.notin_([ComplaintStatus.rejected])
        )
    )
    rows = result.fetchall()

    points = []
    for row in rows:
        points.append(HeatmapPoint(
            latitude=row[1],
            longitude=row[2],
            weight=row[3] / 100.0,  # Normalize to 0-1
            complaint_id=row[0],
            severity=row[4],
        ))

    return points


async def get_critical_alerts(
    db: AsyncSession,
    limit: int = 10,
) -> List[Complaint]:
    """Get most recent critical complaints."""
    result = await db.execute(
        select(Complaint)
        .where(Complaint.severity_priority == SeverityPriority.critical)
        .order_by(Complaint.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
