"""
AquaSentinel X — FastAPI Main Application
AI-Driven Water Body Encroachment Monitoring & Enforcement Platform
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from routes import (
    auth_router,
    complaints_router,
    water_bodies_router,
    dashboard_router,
    notifications_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("🌊 AquaSentinel X starting up...")
    logger.info(f"   Version: {settings.APP_VERSION}")
    logger.info(f"   Debug: {settings.DEBUG}")

    # Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "complaints"), exist_ok=True)

    # Load AI model
    from ai.classifier import load_model
    load_model(settings.AI_MODEL_PATH)

    logger.info("🚀 AquaSentinel X ready!")

    yield

    logger.info("🌊 AquaSentinel X shutting down...")


# ─── Create FastAPI App ───────────────────────────────────────

app = FastAPI(
    title="AquaSentinel X API",
    description=(
        "AI-Driven Water Body Encroachment Monitoring & Enforcement Platform.\n\n"
        "## Features\n"
        "- 🗺️ Citizen complaint submission with GPS validation\n"
        "- 🤖 AI-powered violation classification\n"
        "- 📊 Environmental Severity Index scoring\n"
        "- ⏰ Automated SLA tracking & escalation\n"
        "- 🔮 Lake-level risk prediction\n"
        "- 📧 Email/SMS notification system\n"
        "- 📈 Public transparency dashboard\n"
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS Middleware ──────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static Files (uploads) ──────────────────────────────────

if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ─── Register Routes ─────────────────────────────────────────

app.include_router(auth_router, prefix="/api")
app.include_router(complaints_router, prefix="/api")
app.include_router(water_bodies_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")


# ─── Health Check ─────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "AquaSentinel X API",
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
