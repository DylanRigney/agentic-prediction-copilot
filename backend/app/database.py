from sqlmodel import SQLModel, create_engine, Session
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)

def get_session():
    """Dependency to get a database session for our API endpoints"""
    with Session(engine) as session:
        yield session