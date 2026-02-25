"""
AquaSentinel X — Water Bodies & GeoJSON Routes
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.models import WaterBody
from models.schemas import WaterBodyResponse, WaterBodyWithBoundary
from utils.geo import get_water_body_geojson, get_all_water_bodies_geojson

router = APIRouter(prefix="/water-bodies", tags=["Water Bodies"])


@router.get("/", response_model=List[WaterBodyResponse])
async def list_water_bodies(db: AsyncSession = Depends(get_db)):
    """List all registered water bodies."""
    result = await db.execute(
        select(WaterBody).order_by(WaterBody.name)
    )
    water_bodies = result.scalars().all()
    return [WaterBodyResponse.model_validate(wb) for wb in water_bodies]


@router.get("/geojson")
async def get_geojson(db: AsyncSession = Depends(get_db)):
    """Get all water body boundaries as GeoJSON FeatureCollection."""
    return await get_all_water_bodies_geojson(db)


@router.get("/{water_body_id}", response_model=WaterBodyWithBoundary)
async def get_water_body(
    water_body_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get water body details with boundary GeoJSON."""
    result = await db.execute(
        select(WaterBody).where(WaterBody.id == water_body_id)
    )
    wb = result.scalar_one_or_none()
    if not wb:
        raise HTTPException(404, "Water body not found")

    response = WaterBodyWithBoundary.model_validate(wb)
    response.boundary_geojson = await get_water_body_geojson(db, water_body_id)
    return response
