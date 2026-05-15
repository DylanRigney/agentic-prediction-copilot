import asyncio
import json
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from .config import settings
from contextlib  import asynccontextmanager
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from .agent import builder

graph = None

@asynccontextmanager
async def lifespan(app:FastAPI):
    global graph

    async with AsyncSqliteSaver.from_conn_string("checkpoints.sqlite") as saver:
        await saver.setup()
        graph = builder.compile(checkpointer=saver)
        yield

class ChatRequest(BaseModel):
    thread_id: str
    message: str

async def generator_chat_stream(request: ChatRequest):
    inputs = {"messages": [("user", request.message)]}
    config = {"configurable": {"thread_id": request.thread_id}}
    
    async for chunk in graph.astream(inputs, config=config): # type: ignore
        data = json.dumps(chunk)
        yield f"data: {data}\n\n"
        

app = FastAPI(title="Agentic Prediction Copilot", lifespan=lifespan)

@app.post("/api/chat")
async def chat(request: ChatRequest):
    return StreamingResponse(
        generator_chat_stream(request),
        media_type="text/event-stream"
    )
    

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "database": "connected" if settings.DATABASE_URL else "error"
    }

