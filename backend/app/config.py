from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # values come from env vars or a local .env file (never commit .env)
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # sqlite for local, paste a Postgres URL (Supabase, Render) to switch
    database_url: str = "sqlite:///./app.db"

    # comma separated list of frontend origins allowed by CORS
    cors_origins: str = "http://localhost:5173"

    # uploads over this size get a 413
    max_upload_bytes: int = 2 * 1024 * 1024

    @property
    def cors_origin_list(self) -> list[str]:
        origins = []
        for origin in self.cors_origins.split(","):
            origin = origin.strip()
            if origin:
                origins.append(origin)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
