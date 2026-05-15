# Pedagogical Roadmap: Agentic Prediction Copilot

---

## Phase 1: The "Skeleton" & The Protocol [COMPLETED]
- FastAPI setup, WSL environment, and `.env` security.

---

## Phase 2: The Agentic Brain (Milestone 2) [CURRENT]
**Goal:** Build the stateful graph that powers the "Plan Mode" reasoning.

### The "Why"
- **LangGraph vs. Linear Chains:** Why move beyond simple chat? (Forecasting requires loops, revisions, and human approval).
- **Stateful Memory:** How to ensure the agent doesn't forget the research it did three steps ago.
- **The Technique Interface:** Creating a modular "Plugin" system for forecasting heuristics.

### Concepts to Master
1. **Graph State:** Using TypedDict to define the agent's memory.
2. **Nodes & Edges:** Creating executable steps in the reasoning process.
3. **The "Human-in-the-Loop" Pattern:** Pausing the graph for user feedback.

---

## Phase 3: The "Plan Mode" UX (Milestones 3 & 4)
**Goal:** Real-time transparency with Server-Sent Events (SSE).

---

## Phase 4: Accuracy & Tracking (Milestone 5)
**Goal:** Database integration for Brier Scores and user calibration.
