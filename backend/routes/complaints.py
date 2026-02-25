"""
AquaSentinel X — Complaint Routes
"""
import os
import uuid
import aiofiles
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.models import User, UserRole
from models.schemas import (
    ComplaintCreate, ComplaintResponse, ComplaintDetail,
    ComplaintStatusUpdate, MediaResponse
)
from services.complaint_service import (
    create_complaint, get_complaint_by_id, get_complaint_by_number,
    get_complaints, update_complaint_status, upload_complaint_media,
)
from utils.auth import get_current_user, require_roles
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.post("/", response_model=ComplaintResponse, status_code=201)
async def submit_complaint(
    category: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    description: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a new complaint with image upload.
    Triggers full pipeline: geo-validation → AI classification → severity scoring → SLA → assignment.
    """
    image_path = None

    # Handle file upload
    if image:
        # Validate file type
        allowed_types = {"image/jpeg", "image/png", "image/webp", "video/mp4"}
        if image.content_type not in allowed_types:
            raise HTTPException(400, "Invalid file type. Allowed: JPEG, PNG, WebP, MP4")

        # Validate file size
        contents = await image.read()
        if len(contents) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(400, f"File too large. Max: {settings.MAX_UPLOAD_SIZE_MB}MB")

        # Save file
        file_ext = image.filename.split(".")[-1] if image.filename else "jpg"
        file_name = f"{uuid.uuid4()}.{file_ext}"
        upload_dir = os.path.join(settings.UPLOAD_DIR, "complaints")
        os.makedirs(upload_dir, exist_ok=True)
        image_path = os.path.join(upload_dir, file_name)

        async with aiofiles.open(image_path, "wb") as f:
            await f.write(contents)

    try:
        complaint = await create_complaint(
            db=db,
            citizen=current_user,
            category=category,
            latitude=latitude,
            longitude=longitude,
            description=description,
            address=address,
            image_path=image_path,
        )

        # Save media reference
        if image_path:
            file_type = "video" if image.content_type.startswith("video") else "image"
            await upload_complaint_media(
                db=db,
                complaint_id=str(complaint.id),
                file_url=f"/uploads/complaints/{file_name}",
                file_type=file_type,
                file_name=image.filename or file_name,
                file_size=len(contents),
            )

        return ComplaintResponse.model_validate(complaint)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[ComplaintResponse])
async def list_complaints(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List complaints. Citizens see their own; officers see assigned; admins see all."""
    citizen_id = None
    officer_id = None

    if current_user.role == UserRole.citizen:
        citizen_id = str(current_user.id)
    elif current_user.role == UserRole.officer:
        officer_id = str(current_user.id)
    # supervisors and admins see all

    complaints = await get_complaints(
        db, status=status, priority=priority,
        officer_id=officer_id, citizen_id=citizen_id,
        limit=limit, offset=offset,
    )

    return [ComplaintResponse.model_validate(c) for c in complaints]


@router.get("/track/{complaint_number}", response_model=ComplaintDetail)
async def track_complaint(
    complaint_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Track complaint status by complaint number (public endpoint)."""
    complaint = await get_complaint_by_number(db, complaint_number)
    if not complaint:
        raise HTTPException(404, "Complaint not found")

    return ComplaintDetail.model_validate(complaint)


@router.get("/{complaint_id}", response_model=ComplaintDetail)
async def get_complaint(
    complaint_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed complaint information."""
    complaint = await get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise HTTPException(404, "Complaint not found")

    # Access control
    if current_user.role == UserRole.citizen and complaint.citizen_id != current_user.id:
        raise HTTPException(403, "Access denied")

    return ComplaintDetail.model_validate(complaint)


@router.patch("/{complaint_id}/status", response_model=ComplaintResponse)
async def update_status(
    complaint_id: str,
    update: ComplaintStatusUpdate,
    current_user: User = Depends(
        require_roles(UserRole.officer, UserRole.supervisor, UserRole.admin)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Update complaint status (officers/admins only)."""
    try:
        complaint = await update_complaint_status(
            db=db,
            complaint_id=complaint_id,
            new_status=update.status,
            changed_by=current_user,
            notes=update.notes,
            resolution_proof_url=update.resolution_proof_url,
        )
        return ComplaintResponse.model_validate(complaint)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/{complaint_id}/media", response_model=MediaResponse)
async def add_media(
    complaint_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload additional media to a complaint."""
    contents = await file.read()
    file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
    file_name = f"{uuid.uuid4()}.{file_ext}"
    upload_dir = os.path.join(settings.UPLOAD_DIR, "complaints")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file_name)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(contents)

    file_type = "video" if file.content_type and file.content_type.startswith("video") else "image"

    media = await upload_complaint_media(
        db=db,
        complaint_id=complaint_id,
        file_url=f"/uploads/complaints/{file_name}",
        file_type=file_type,
        file_name=file.filename or file_name,
        file_size=len(contents),
    )

    return MediaResponse.model_validate(media)
