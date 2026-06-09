from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8",
        case_sensitive=False, extra="ignore", protected_namespaces=(),
    )
    app_env: str = "development"
    secret_key: str = "changeme-replace-in-prod"
    debug: bool = True
    database_url: str = ""

    # Auth
    dev_auth_bypass: bool = True
    clerk_publishable_key: str = ""
    clerk_secret_key: str = ""
    clerk_jwt_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"
    app_base_url: str = "http://localhost:8000"
    jwt_expire_hours: int = 168

    # LLMs
    anthropic_api_key: str = ""
    gemini_api_key: str = ""

    # Scraping
    jina_api_key: str = ""
    firecrawl_api_key: str = ""
    zyte_api_key: str = ""
    scrapingbee_api_key: str = ""
    webshare_proxy_user: str = ""
    webshare_proxy_pass: str = ""

    # Models
    model_haiku: str = "claude-haiku-4-5-20251001"
    model_gemini: str = "gemini-3.1-flash-lite"

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:8000,http://127.0.0.1:8000,https://organic360.clarityhq.ai"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def clerk_enabled(self) -> bool:
        pk = self.clerk_publishable_key.strip()
        return bool(pk) and "dummy" not in pk.lower()

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id.strip() and self.google_client_secret.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
