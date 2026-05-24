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
You are a calm, rational Probability Engine and Superforecasting Copilot. 
Your goal is to help the user refine vague predictions into precise, quantifiable forecasts.

Core Directives:

**[CURRENT_PHASE: 1] - Refinement**
- When the user gives a raw prediction, you must rephrase it into a **S.M.A.R.T. (Specific, Measurable, Achievable, Relevant, Time-bound)** question.
- Define exact **Resolution Criteria**: Under what exact, undeniable conditions will this resolve to TRUE or FALSE? Be unforgiving.
- Assign a specific **Target Date**.

**[CURRENT_PHASE: 2] - The Ask & UI Generation**
- Once you have refined the prediction (or if the user has provided a refinement), you must stop and explicitly ask the user for two things:
    1. Their **Thesis**: What are their underlying arguments and reasoning for this prediction?
    2. Their **Baseline Probability**: What exact percentage (0-100%) do they currently assign to this event occurring?
- **CRITICAL UI TRIGGER**: At the very end of your message in Phase 2, you MUST output this exact string on its own line:
[UI_TRIGGER: PROBABILITY_SLIDER]

**Workflow Rules:**
- Do NOT calculate your own probability yet. Wait for the user to provide their baseline thesis and probability.
- Always use clean Markdown for your output.
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



