"""
AquaSentinel X — Risk Prediction Engine (Lake-Level)

For each water body, calculates Risk Score (0–100) based on:
- Past complaint density         (30%)
- Construction activity nearby   (25%)
- Urban growth trend             (25%)
- Lake shrinkage trend           (20%)

Risk Classification:
- High Risk:   score >= 70
- Medium Risk:  score >= 40
- Low Risk:     score < 40
"""
import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

RISK_WEIGHTS = {
    "complaint_density": 0.30,
    "construction_activity": 0.25,
    "urban_growth": 0.25,
    "shrinkage": 0.20,
}


async def calculate_water_body_risk(
    db: AsyncSession,
    water_body_id: str,
) -> dict:
    """
    Calculate risk score for a specific water body.

    In production, this would pull data from:
    - Historical complaint database
    - Satellite imagery change detection
    - Urban planning/development permits API
    - NDWI (Normalized Difference Water Index) analysis

    Currently uses complaint history + simulated environmental data.
    """

    # 1. Complaint Density Score (30%)
    complaint_query = text("""
        SELECT
            COUNT(*) AS total_complaints,
            COUNT(*) FILTER (WHERE ai_violation_type = 'construction') AS construction_count,
            COUNT(*) FILTER (WHERE severity_priority = 'critical') AS critical_count,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS recent_count
        FROM complaints
        WHERE water_body_id = :wb_id
    """)

    result = await db.execute(complaint_query, {"wb_id": water_body_id})
    row = result.fetchone()

    total_complaints = row[0] if row else 0
    construction_count = row[1] if row else 0
    critical_count = row[2] if row else 0
    recent_count = row[3] if row else 0

    # Normalize complaint density (0-100)
    complaint_density_score = min(total_complaints * 5, 100)

    # 2. Construction Activity Score (25%)
    # Based on construction-type complaints and their frequency
    construction_score = min(construction_count * 15, 100)

    # 3. Urban Growth Score (25%)
    # In production: satellite imagery analysis
    # Currently: simulated based on recent complaint patterns
    urban_growth_score = min(recent_count * 10, 100)

    # 4. Lake Shrinkage Score (20%)
    # In production: NDWI analysis from satellite data
    # Currently: simulated based on critical complaint ratio
    if total_complaints > 0:
        shrinkage_score = min(int((critical_count / total_complaints) * 100), 100)
    else:
        shrinkage_score = 0

    # Calculate weighted risk score
    risk_score = int(
        complaint_density_score * RISK_WEIGHTS["complaint_density"]
        + construction_score * RISK_WEIGHTS["construction_activity"]
        + urban_growth_score * RISK_WEIGHTS["urban_growth"]
        + shrinkage_score * RISK_WEIGHTS["shrinkage"]
    )

    risk_score = min(risk_score, 100)

    # Determine risk level
    if risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 40:
        risk_level = "medium"
    else:
        risk_level = "low"

    result = {
        "water_body_id": water_body_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "complaint_density": round(total_complaints / max(1, 90) * 30, 4),  # per 30 days
        "construction_activity_score": construction_score,
        "urban_growth_score": urban_growth_score,
        "shrinkage_score": shrinkage_score,
        "details": {
            "total_complaints": total_complaints,
            "construction_complaints": construction_count,
            "critical_complaints": critical_count,
            "recent_complaints_30d": recent_count,
        },
    }

    logger.info(f"Risk score for {water_body_id}: {risk_score} ({risk_level})")
    return result


async def calculate_all_risks(db: AsyncSession) -> List[dict]:
    """Calculate risk scores for all water bodies."""
    wb_query = text("SELECT id, name FROM water_bodies ORDER BY name")
    result = await db.execute(wb_query)
    water_bodies = result.fetchall()

    risks = []
    for wb in water_bodies:
        risk = await calculate_water_body_risk(db, str(wb[0]))
        risk["water_body_name"] = wb[1]
        risks.append(risk)

    # Update water bodies with calculated risk
    for risk in risks:
        update_query = text("""
            UPDATE water_bodies
            SET risk_score = :score, risk_level = :level, updated_at = NOW()
            WHERE id = :wb_id
        """)
        await db.execute(update_query, {
            "score": risk["risk_score"],
            "level": risk["risk_level"],
            "wb_id": risk["water_body_id"],
        })

    return sorted(risks, key=lambda x: x["risk_score"], reverse=True)
