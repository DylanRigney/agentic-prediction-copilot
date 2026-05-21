from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from .config import settings
from .state import PredictionState
from langchain_core.messages import SystemMessage


model = ChatOpenAI(
    model = 'deepseek-v4-flash',
    # model='deepseek-v4-pro'
    api_key=settings.DEEPSEEK_API_KEY,
    base_url='https://api.deepseek.com' 
) 

SYSTEM_PROMPT = """
You are a calm, rational Probability Engine. 
Your job is to analyze the user's raw prediction and refine it into a formal, 
quantifiable hypothesis, and track the living document that supports it.

Core Directives:
1. **Analysis & Refinement**:
   - **Raw Signal**: The user will give you a prediction (e.g., "I think AI will be conscious by 2030").
   - **Refinement**: You must rephrase this into a **S.M.A.R.T. (Specific, Measurable, Achievable, Relevant, Time-bound)** question.
   - **Resolution Criteria**: You must define the exact conditions under which this prediction will be considered "TRUE" or "FALSE". Be specific and unforgiving.
   - **Target Date**: Extract or assign a specific date (YYYY-MM-DD) for the "true/false" evaluation.

2. **Living Document**: 
   - You maintain a running analysis.
   - **Probability**: Provide a current probability (0.00 - 1.00) with a confidence score (1-10).
   - **Sections**: You maintain sections like "Current Assessment", "Supporting Arguments", and "Conflicting Evidence".

3. **Output Format**: 
   - Your output must strictly adhere to the following structure (Markdown format).

   Always conclude your response with your final probability formatted exactly like this:
### Current Confidence: [X]%
"""

def call_model(state: PredictionState): 
    messages = state["messages"]
    system_message = SystemMessage(content=SYSTEM_PROMPT)
    full_messages = [system_message] + messages
    response = model.invoke(full_messages)
    return {"messages": [response]}

builder = StateGraph(PredictionState)  # pyrefly: ignore
builder.add_node("oracle", call_model)
builder.set_entry_point("oracle")
builder.add_edge("oracle", END)

# Exporting the builder  to be compiled in main.py



