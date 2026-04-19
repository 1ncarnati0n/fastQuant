from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="FASTQUANT_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "local"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:4173", "http://localhost:5174", "http://localhost:5175"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
