from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DEEPSEEK_API_KEY: str = "sk-95265d3cf7ee4ccca06066e8148dad97"
    TAVILY_API_KEY: str = "placeholder"
    DATABASE_URL: str = "sqlite:///./forecaster.db"

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
