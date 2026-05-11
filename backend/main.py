import asyncio
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from config import settings

app = FastAPI(title="Agentic Prediction Copilot")

async def mock_generator():
    yield "data: thought 1\n\n"
    await asyncio.sleep(1)
    yield "data: thought 2\n\n"
    
@app.get("/test-stream")
async def test_stream():
    return StreamingResponse(
        mock_generator(),
        media_type="text/event-stream"
    )

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "database": "connected" if settings.DATABASE_URL else "error"
    }

