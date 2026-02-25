"""
AquaSentinel X — Dashboard & Analytics Routes
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.models import User, UserRole
from models.schemas import (
    DashboardStats, HeatmapPoint, ComplaintResponse,
    RiskScoreResponse, PublicDashboardData, WaterBodyResponse
)
from services.dashboard_service import get_dashboard_stats, get_heatmap_data, get_critical_alerts
from services.escalation_service import check_and_escalate
from ai.risk_predictor import calculate_all_risks
from utils.auth import get_current_user, require_roles
from sqlalchemy import select
from models.models import WaterBody

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics (authenticated users)."""
    return await get_dashboard_stats(db)


@router.get("/heatmap", response_model=List[HeatmapPoint])
async def heatmap_data(db: AsyncSession = Depends(get_db)):
    """Get complaint heatmap data (public)."""
    return await get_heatmap_data(db)


@router.get("/critical-alerts", response_model=List[ComplaintResponse])
async def critical_alerts(db: AsyncSession = Depends(get_db)):
    """Get critical alerts (public)."""
    complaints = await get_critical_alerts(db)
    return [ComplaintResponse.model_validate(c) for c in complaints]


@router.get("/risk-zones")
async def risk_zones(db: AsyncSession = Depends(get_db)):
    """Get risk assessment for all water bodies."""
    return await calculate_all_risks(db)


@router.get("/public", response_model=PublicDashboardData)
async def public_dashboard(db: AsyncSession = Depends(get_db)):
    """
    Public transparency dashboard with:
    - Aggregate statistics
    - Complaint heatmap
    - Critical alerts
    - Lake risk zones
    """
    stats = await get_dashboard_stats(db)
    heatmap = await get_heatmap_data(db)
    critical = await get_critical_alerts(db)
    risks = await calculate_all_risks(db)

    # Get water bodies
    wb_result = await db.execute(select(WaterBody).order_by(WaterBody.name))
    water_bodies = wb_result.scalars().all()

    return PublicDashboardData(
        stats=stats,
        heatmap_points=heatmap,
        water_bodies=[WaterBodyResponse.model_validate(wb) for wb in water_bodies],
        critical_alerts=[ComplaintResponse.model_validate(c) for c in critical],
        risk_zones=[RiskScoreResponse(
            water_body_id=r["water_body_id"],
            water_body_name=r["water_body_name"],
            risk_score=r["risk_score"],
            risk_level=r["risk_level"],
            complaint_density=r["complaint_density"],
            construction_activity_score=r["construction_activity_score"],
            urban_growth_score=r["urban_growth_score"],
            shrinkage_score=r["shrinkage_score"],
            calculated_at=r.get("calculated_at", None) or __import__("datetime").datetime.utcnow(),
        ) for r in risks],
    )


@router.post("/escalation-check")
async def run_escalation_check(
    current_user: User = Depends(
        require_roles(UserRole.admin, UserRole.supervisor)
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually trigger SLA escalation check.
    In production, this runs on a schedule (cron job).
    """
    results = await check_and_escalate(db)
    return {
        "message": f"Escalation check complete. {len(results)} actions taken.",
        "escalations": results,
    }
