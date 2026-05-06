from fastapi import FastAPI
from config import settings

app = FastAPI(title="Agentic Prediction Copilot")

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "database": "connected" if settings.DATABASE_URL else "error"
    }

