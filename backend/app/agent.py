from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from .config import settings
from .state import PredictionState
from langchain_core.messages import SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from tavily import TavilyClient

tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)




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

**[CURRENT_PHASE: 3] - Web Research & Analysis**
- Once the user provides their Thesis and Baseline Probability, you MUST perform web research.
- **CRITICAL UI TRIGGER**: When starting your research, output this exact string on its own line:
[UI_TRIGGER: RESEARCHING]
- Use the `search_web` tool to search for base rates, relevant historical data, current events, and trends.
- **CRITICAL RULE**: Do NOT rely on your internal training data for facts or current events. You are prone to hallucinating outdated information (e.g., from 2024). ALWAYS use the `search_web` tool to find the most up-to-date reality before making claims.
- Based on your findings, formulate a structured argument comparing the user's thesis with the research data.

**[CURRENT_PHASE: 4] - Final Verdict**
- After completing your research, you will present your final red-team analysis to the user.
- **CRITICAL RULE (Anchoring Bias)**: You must calculate your own Final Probability (0-100%) based on your research, but you must NEVER show this number to the user in your text. 
- Instead, output your hidden probability using this exact trigger on its own line so the system can save it to the database silently:
[HIDDEN_AI_PROBABILITY: X] (where X is your calculated percentage)
- **CRITICAL UI TRIGGER**: At the very end of your final message, you MUST output this exact string on its own line to trigger the save process:
[UI_TRIGGER: FINAL_VERDICT]

**Workflow Rules:**
- Do NOT calculate your own probability until Phase 4.
- Always use clean Markdown for your output.
"""

@tool
def search_web(query:str) -> str:
    """Search the web for current events, facts, or data to validate prediction claims. 
    Use this to find real-time info. CRITICAL: Do not assume facts from your training data, use this tool to verify reality."""
    response = tavily_client.search(query=query, max_results=3)
    results = []
    for r in response.get("results", []):
        results.append(f"Title: {r.get('title')}\nURL: {r.get('url')}\nContent: {r.get('content')}\n---")    
    return "\n".join(results)

tools = [search_web]
tool_node = ToolNode(tools)
model_with_tools = model.bind_tools(tools)


def call_model(state: PredictionState): 
    messages = state["messages"]
    system_message = SystemMessage(content=SYSTEM_PROMPT)
    full_messages = [system_message] + messages
    response = model_with_tools.invoke(full_messages)
    return {"messages": [response]}

builder = StateGraph(PredictionState)  # pyrefly: ignore
builder.add_node("oracle", call_model)
builder.add_node("tools", tool_node)

builder.set_entry_point("oracle")

builder.add_conditional_edges("oracle", tools_condition)
builder.add_edge("tools", "oracle")

# Exporting the builder  to be compiled in main.py



