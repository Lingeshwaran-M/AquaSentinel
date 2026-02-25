"""
AquaSentinel X — Geospatial Utilities
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from uuid import UUID


async def validate_location_in_water_body(
    db: AsyncSession,
    latitude: float,
    longitude: float,
) -> Optional[dict]:
    """
    Check if a GPS point falls within any registered water body boundary.
    Uses PostGIS ST_Contains for spatial validation.

    Returns matching water body info or None if outside all boundaries.
    """
    query = text("""
        SELECT id, name, type, sensitivity_score
        FROM water_bodies
        WHERE ST_Contains(
            boundary,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
        )
        LIMIT 1
    """)

    result = await db.execute(query, {"lat": latitude, "lng": longitude})
    row = result.fetchone()

    if row:
        return {
            "id": str(row[0]),
            "name": row[1],
            "type": row[2],
            "sensitivity_score": row[3],
        }
    return None


async def find_nearby_water_body(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    radius_meters: float = 500.0,
) -> Optional[dict]:
    """
    Find nearest water body within given radius.
    Fallback when GPS point is near but not exactly within boundary.
    """
    query = text("""
        SELECT id, name, type, sensitivity_score,
               ST_Distance(
                   boundary::geography,
                   ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
               ) AS distance_m
        FROM water_bodies
        WHERE ST_DWithin(
            boundary::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            :radius
        )
        ORDER BY distance_m ASC
        LIMIT 1
    """)

    result = await db.execute(
        query, {"lat": latitude, "lng": longitude, "radius": radius_meters}
    )
    row = result.fetchone()

    if row:
        return {
            "id": str(row[0]),
            "name": row[1],
            "type": row[2],
            "sensitivity_score": row[3],
            "distance_meters": round(row[4], 2),
        }
    return None


async def get_complaint_density(
    db: AsyncSession,
    water_body_id: str,
    days: int = 90,
) -> float:
    """Get complaint density for a water body over the past N days."""
    query = text("""
        SELECT COUNT(*)::FLOAT / GREATEST(
            EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / 86400, 1
        ) AS density
        FROM complaints
        WHERE water_body_id = :wb_id
          AND created_at >= NOW() - INTERVAL ':days days'
    """.replace(":days", str(days)))

    result = await db.execute(query, {"wb_id": water_body_id})
    row = result.fetchone()
    return round(row[0], 4) if row and row[0] else 0.0


async def get_water_body_geojson(db: AsyncSession, water_body_id: str) -> Optional[dict]:
    """Get water body boundary as GeoJSON."""
    query = text("""
        SELECT ST_AsGeoJSON(boundary)::json AS geojson
        FROM water_bodies
        WHERE id = :wb_id
    """)

    result = await db.execute(query, {"wb_id": water_body_id})
    row = result.fetchone()
    return row[0] if row else None


async def get_all_water_bodies_geojson(db: AsyncSession) -> list:
    """Get all water body boundaries as GeoJSON features."""
    query = text("""
        SELECT
            id, name, type, risk_level, risk_score,
            sensitivity_score, environmental_health_index,
            ST_AsGeoJSON(boundary)::json AS geojson
        FROM water_bodies
        ORDER BY name
    """)

    result = await db.execute(query)
    rows = result.fetchall()

    features = []
    for row in rows:
        features.append({
            "type": "Feature",
            "properties": {
                "id": str(row[0]),
                "name": row[1],
                "type": row[2],
                "risk_level": row[3],
                "risk_score": row[4],
                "sensitivity_score": row[5],
                "environmental_health_index": row[6],
            },
            "geometry": row[7],
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }
