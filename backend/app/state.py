from typing import Annotated, TypedDict, List, Optional, Any
from langgraph.graph.message import add_messages

class PredictionState(TypedDict):
    # Standard Chat
    messages: Annotated[list, add_messages]
    
    # 1. The "Verifiable Prediction" Data
    topic: Optional[str]               # Raw user intent
    refined_question: Optional[str]    # The S.M.A.R.T version
    resolution_criteria: Optional[str] # Exactly how we judge 'Success'
    target_date: Optional[str]         # When does this prediction resolve?
    
    # 2. The "Living Document"
    current_probability: float         
    gut_feeling_history: List[float]
    document_sections: dict            # e.g., {"Fermi": "...", "Research": "..."}
    
    # 3. Self-Orchestration
    active_node: str
    completed_steps: List[str]
    
    # 4. AI-First UI
    ui_hints: dict
