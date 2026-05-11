from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from .config import settings
from .state import PredictionState

model = ChatOpenAI(
    model = 'deepseek-v4-flash',
    # model='deepseek-v4-pro'
    api_key=settings.DEEPSEEK_API_KEY,
    base_url='https://api.deepseek.com' 
) 

def call_model(state: PredictionState): 
    messages = state["messages"]
    response = model.invoke(messages)
    return {"messages": [response]}

builder = StateGraph(PredictionState)  # pyrefly: ignore
builder.add_node("oracle", call_model)
builder.set_entry_point("oracle")
builder.add_edge("oracle", END)

graph = builder.compile() 



