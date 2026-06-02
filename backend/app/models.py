from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone

class Prediction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thread_id: str = Field(index=True)

    # Core Prediction Data
    question: str
    category: Optional[str] = None 
    thesis: str

    # Probabilities 
    baseline_probability: float
    ai_final_probability: float
    user_final_probability: float
    
    # Resolution Tracking
    target_date: str
    status: str = "Active" # Active, Draft, Resolved_True, Resolved_False
    
    # Advanced Analytics (Groundwork)
    brier_score: Optional[float] = None
    cognitive_biases: Optional[str] = None # JSON string of identified biases
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))