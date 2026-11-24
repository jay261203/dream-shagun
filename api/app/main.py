import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import events, health, me, moments, publishing, wedding_settings, weddings

logger = logging.getLogger("dream_shagun")

app = FastAPI(title="Dream Shagun API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",") if o.strip()],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
    """Log the real error, tell the caller nothing about it."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse({"detail": "Something went wrong"}, status_code=500)


app.include_router(health.router)
app.include_router(me.router)
app.include_router(weddings.router)
app.include_router(events.router)
app.include_router(moments.router)
app.include_router(wedding_settings.router)
app.include_router(publishing.router)
