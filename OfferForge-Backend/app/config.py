from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MINIMAX_API_KEY: str = ""
    MINIMAX_GROUP_ID: str = ""
    MINIMAX_BASE_URL: str = "https://api.minimax.chat/v1"
    DATABASE_URL: str = "sqlite+aiosqlite:///./offerforge.db"
    JWT_SECRET: str = "offerforge-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
