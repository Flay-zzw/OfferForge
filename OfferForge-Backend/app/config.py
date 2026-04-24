from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MINIMAX_API_KEY: str = ""
    MINIMAX_GROUP_ID: str = ""
    MINIMAX_BASE_URL: str = "https://api.minimax.chat/v1"
    DATABASE_URL: str = "sqlite+aiosqlite:///./offerforge.db"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
