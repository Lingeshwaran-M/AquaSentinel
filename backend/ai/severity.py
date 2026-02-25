"""
AquaSentinel X — Environmental Severity Index (ESI) Engine

Calculates severity score (0–100) based on:
- Violation type weight    (40%)
- AI urgency level         (20%)
- Location sensitivity     (15%)
- Complaint density        (15%)
- Environmental impact     (10%)

Priority mapping:
- Critical (Red):   score >= 70
- Medium (Yellow):  score >= 40
- Low (Green):      score < 40
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Weight Configuration ──────────────────────────────────────

WEIGHTS = {
    "violation_type": 0.40,
    "ai_urgency": 0.20,
    "location_sensitivity": 0.15,
    "complaint_density": 0.15,
    "environmental_impact": 0.10,
}

# ─── Violation Type Scores ─────────────────────────────────────

VIOLATION_SCORES = {
    "construction": 95,
    "land_filling": 85,
    "pollution": 80,
    "debris_dumping": 60,
    "unknown": 30,
}

# ─── Urgency Scores ───────────────────────────────────────────

URGENCY_SCORES = {
    "high": 100,
    "medium": 60,
    "low": 25,
}

# ─── Environmental Impact by Violation ─────────────────────────

ENVIRONMENTAL_IMPACT = {
    "construction": 90,
    "land_filling": 85,
    "pollution": 95,
    "debris_dumping": 55,
    "unknown": 30,
}


def calculate_severity(
    violation_type: str,
    ai_urgency: str,
    location_sensitivity: int = 50,
    complaint_density: float = 0.0,
    water_body_type: str = "lake",
) -> dict:
    """
    Calculate Environmental Severity Index.

    Args:
        violation_type: Type of violation detected by AI
        ai_urgency: Urgency level from AI classification
        location_sensitivity: Sensitivity score of water body (0-100)
        complaint_density: Number of complaints per day in the zone
        water_body_type: Type of water body

    Returns:
        {
            "score": int (0-100),
            "priority": str ("low" | "medium" | "critical"),
            "breakdown": dict with individual component scores
        }
    """
    # 1. Violation Type Score (40%)
    violation_score = VIOLATION_SCORES.get(violation_type, 30)

    # 2. AI Urgency Score (20%)
    urgency_score = URGENCY_SCORES.get(ai_urgency, 25)

    # 3. Location Sensitivity Score (15%)
    sensitivity_score = min(max(location_sensitivity, 0), 100)

    # 4. Complaint Density Score (15%)
    # Normalize density: 0 complaints/day = 0, 10+ = 100
    density_score = min(complaint_density * 10, 100)

    # 5. Environmental Impact Score (10%)
    impact_score = ENVIRONMENTAL_IMPACT.get(violation_type, 30)

    # Water body type multiplier
    water_body_multiplier = {
        "lake": 1.0,
        "river": 1.1,
        "canal": 0.85,
    }.get(water_body_type, 1.0)

    # Calculate weighted score
    raw_score = (
        violation_score * WEIGHTS["violation_type"]
        + urgency_score * WEIGHTS["ai_urgency"]
        + sensitivity_score * WEIGHTS["location_sensitivity"]
        + density_score * WEIGHTS["complaint_density"]
        + impact_score * WEIGHTS["environmental_impact"]
    )

    # Apply water body multiplier
    final_score = min(int(raw_score * water_body_multiplier), 100)

    # Determine priority
    if final_score >= 70:
        priority = "critical"
    elif final_score >= 40:
        priority = "medium"
    else:
        priority = "low"

    breakdown = {
        "violation_type_score": round(violation_score * WEIGHTS["violation_type"], 2),
        "urgency_score": round(urgency_score * WEIGHTS["ai_urgency"], 2),
        "sensitivity_score": round(sensitivity_score * WEIGHTS["location_sensitivity"], 2),
        "density_score": round(density_score * WEIGHTS["complaint_density"], 2),
        "impact_score": round(impact_score * WEIGHTS["environmental_impact"], 2),
        "water_body_multiplier": water_body_multiplier,
        "raw_score": round(raw_score, 2),
        "final_score": final_score,
    }

    result = {
        "score": final_score,
        "priority": priority,
        "breakdown": breakdown,
    }

    logger.info(
        f"ESI calculated: {final_score} ({priority}) for {violation_type} violation"
    )
    return result


def get_sla_days(priority: str) -> int:
    """Get SLA deadline in days based on priority."""
    sla_map = {
        "critical": 3,
        "medium": 7,
        "low": 10,
    }
    return sla_map.get(priority, 10)
