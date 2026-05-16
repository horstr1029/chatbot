from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    openai_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    embed_provider: str = "openai"
    embed_model: str = "text-embedding-3-small"

    class Config:
        env_file = ".env"


settings = Settings()
