"""Settings read from environment variables.

Locally they come from api/.env, then api/.env.local on top of it, so a file with the LOCAL Supabase values can sit
beside your hosted ones without editing them (delete .env.local to run against the hosted project). In production
they come from the provider's dashboard and neither file exists. Real environment variables always win.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    # Comma-separated list of web origins allowed to call the API from a browser.
    cors_origins: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
