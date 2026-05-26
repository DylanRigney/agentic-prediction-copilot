import asyncio
import json
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.encoders import jsonable_encoder
from .config import settings
from contextlib  import asynccontextmanager
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from .agent import builder
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, select
from fastapi import Depends
from .database import engine, get_session
from .models import Prediction

graph = None

@asynccontextmanager
async def lifespan(app:FastAPI):
    global graph

    SQLModel.metadata.create_all(engine)

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
        encoded = jsonable_encoder(chunk)
        data = json.dumps(encoded)
        yield f"data: {data}\n\n"
        

app = FastAPI(title="Agentic Prediction Copilot", lifespan=lifespan)

# Allow the front end to talk to the backend with CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/chat")
async def chat(request: ChatRequest):
    return StreamingResponse(
        generator_chat_stream(request),
        media_type="text/event-stream"
    )
    
@app.post("/api/history", response_model=Prediction)
def save_prediction(prediction: Prediction, session: Session = Depends(get_session)):
    session.add(prediction)
    session.commit()
    session.refresh(prediction)
    return prediction

@app.get("/api/history", response_model=list[Prediction])
def get_history(session: Session = Depends(get_session)):
    predictions = session.exec(select(Prediction).order_by(Prediction.created_at.desc())).all()
    return predictions

@app.delete("/api/history/{prediction_id}")
def delete_prediction(prediction_id: int, session: Session = Depends(get_session)):
    prediction = session.get(Prediction, prediction_id)
    if prediction:
        session.delete(prediction)
        session.commit()
    return {"status": "deleted"}

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "database": "connected" if settings.DATABASE_URL else "error"
    }

