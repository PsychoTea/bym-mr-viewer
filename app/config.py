from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class AppConfig:
    host: str
    port: int
    bym_base_url: str
    bym_cdn_base_url: str
    bym_api_version: str
    request_timeout_seconds: float

    @classmethod
    def from_env(cls) -> "AppConfig":
        bym_base_url = os.environ.get("BYM_BASE_URL", "http://localhost:3001").rstrip("/")
        bym_cdn_base_url = os.environ.get("BYM_CDN_BASE_URL", bym_base_url).rstrip("/")

        return cls(
            host=os.environ.get("HOST", "0.0.0.0"),
            port=int(os.environ.get("PORT", "8080")),
            bym_base_url=bym_base_url,
            bym_cdn_base_url=bym_cdn_base_url,
            bym_api_version=os.environ.get("BYM_API_VERSION", "v1.5.4-beta").strip("/"),
            request_timeout_seconds=float(os.environ.get("REQUEST_TIMEOUT_SECONDS", "15")),
        )
