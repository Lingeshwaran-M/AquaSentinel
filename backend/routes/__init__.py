from routes.auth import router as auth_router
from routes.complaints import router as complaints_router
from routes.water_bodies import router as water_bodies_router
from routes.dashboard import router as dashboard_router
from routes.notifications import router as notifications_router

__all__ = [
    "auth_router",
    "complaints_router",
    "water_bodies_router",
    "dashboard_router",
    "notifications_router",
]
