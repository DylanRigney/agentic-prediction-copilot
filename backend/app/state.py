from typing import Annotated, TypedDict, List, Optional, Any, NotRequired
from langgraph.graph.message import add_messages

class PredictionState(TypedDict):
    # Standard Chat
    messages: Annotated[list, add_messages]
    
    # 1. The "Verifiable Prediction" Data
    topic: NotRequired[Optional[str]]               # Raw user intent
    refined_question: NotRequired[Optional[str]]    # The S.M.A.R.T version
    resolution_criteria: NotRequired[Optional[str]] # Exactly how we judge 'Success'
    target_date: NotRequired[Optional[str]]         # When does this prediction resolve?
    
    # 2. The "Living Document"
    current_probability: NotRequired[float]         
    gut_feeling_history: NotRequired[List[float]]
    document_sections: NotRequired[dict]            # e.g., {"Fermi": "...", "Research": "..."}
    
    # 3. Self-Orchestration
    active_node: NotRequired[str]
    completed_steps: NotRequired[List[str]]
    
    # 4. AI-First UI
    ui_hints: NotRequired[dict]
