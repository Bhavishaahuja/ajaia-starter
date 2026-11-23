from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # values come from env vars or a local .env file (never commit .env)
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    # "live" calls Claude, "mock" returns canned answers (tests, CI, no key)
    llm_mode: str = "mock"
    llm_model: str = "claude-opus-5-5"
    llm_effort: str = "low"
    llm_timeout_seconds: float = 60.0

    # sqlite for local, paste a Postgres URL (Supabase, Render) to switch
    database_url: str = "sqlite:///./app.db"

    # comma separated list of frontend origins allowed by CORS
    cors_origins: str = "http://localhost:5173"

    max_text_length: int = 5000

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
