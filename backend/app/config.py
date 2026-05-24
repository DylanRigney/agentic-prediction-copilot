from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DEEPSEEK_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./forecaster.db"

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
