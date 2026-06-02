"use client"

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./page.module.css";
import { Content } from "next/font/google";


export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [thesisText, setThesisText] = useState("")
  const [ baselineProbability, setBaselineProbability]  = useState(50);
  const [sliderValue, setSliderValue] = useState(50)
  const [hasSaved, setHasSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle")

  useEffect(() => {
    setThreadId(`thread_${Math.random().toString(36).substring(2, 11)}`);
  }, [])

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
  };

  const sendMessage = async (messageText: string) => {
    setIsLoading(true);
    setInput("");
    const userMsg = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);

    const userMsgCount = messages.filter(m => m.role === "user").length;
    if (userMsgCount === 0) {
      setQuestionText(messageText); // The very first message is their raw question
    } else if (userMsgCount === 1) {
      setThesisText(messageText);   // The second message is their thesis
      setBaselineProbability(sliderValue); // Lock in the baseline probability from the slider
    }

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId || "demo-thread-1",
          message: messageText
        })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let buffer = "";
      let finalAssistantContent = ""

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));

              if (parsed.oracle && parsed.oracle.messages) {
                const newMsgs = parsed.oracle.messages;
                const assistantContent = newMsgs[newMsgs.length - 1].content;
                finalAssistantContent = assistantContent;

                setMessages((prev) => {
                  const next = [...prev];
                  const lastIndex = next.length - 1;
                  next[lastIndex] = { role: "assistant", content: assistantContent };
                  return next;
                });
              }
            } catch (err) {
              console.error("Error parsing JSON chunk:", err);
            }
          }
        }
      }

      if (finalAssistantContent) {
        let parsedAiProb = 50;
        
        if (finalAssistantContent.includes("[HIDDEN_AI_PROBABILITY: ")) {
           const rightSide = finalAssistantContent.split("[HIDDEN_AI_PROBABILITY: ")[1];
           const numberString = rightSide.split("]")[0];
           parsedAiProb = parseInt(numberString);
        }
        if (finalAssistantContent.includes("[UI_TRIGGER: FINAL_VERDICT]")) {
          // Trigger the auto-save!
          triggerAutoSave(finalAssistantContent, parsedAiProb); 
        }
      }
    } catch (error) {
      console.error("Error fetching stream:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAutoSave = async (assistantText: string, aiProb: number) => {
    if (hasSaved) return; // Prevent double saving
    setHasSaved(true);
    setSaveStatus("saving");

    // We use our simple string splitting to extract the LLM's structured data
    let resolvedQuestion = "Vague Prediction";
    if (assistantText.includes("[FINAL_QUESTION: ")) {
      resolvedQuestion = assistantText.split("[FINAL_QUESTION: ")[1].split("]")[0];
    }

    let resolvedThesis = "Thesis details.";
    if (assistantText.includes("[FINAL_THESIS: ")) {
      resolvedThesis = assistantText.split("[FINAL_THESIS: ")[1].split("]")[0];
    }

    let targetDate = "2030-12-31"; 
    if (assistantText.includes("[FINAL_DATE: ")) {
      targetDate = assistantText.split("[FINAL_DATE: ")[1].split("]")[0];
    }

    const payload = {
      thread_id: threadId,
      question: resolvedQuestion,
      category: "General", 
      thesis: resolvedThesis,
      baseline_probability: baselineProbability,
      ai_final_probability: aiProb,
      user_final_probability: sliderValue, // The slider's value at final verdict is the final user estimate
      target_date: targetDate,
      status: "Active"
    };

    try {
      const res = await fetch("http://localhost:8000/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      setSaveStatus("error");
    }
  };


  return (
    // Main container
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0e0e0e", color: "#fff" }}>

      {/* Left Sidebar */}
      <div style={{ width: "250px", borderRight: "1px solid #333", padding: "1.5rem" }}>
        <h3 style={{ color: "#888", fontSize: "0.9rem", textTransform: "uppercase" }}>Pipeline</h3>
        {/* We will add steps here later */}
      </div>

      {/* CENTER PANEL: Dashboard + Command Center (Flexible Width) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* CENTER TOP: Dynamic Dashboard (Takes up 2/3 of vertical space) */}
        <div style={{ flex: 2, padding: "2rem", borderBottom: "1px solid #333", overflowY: "auto" }}>
          <h2>Prediction</h2>
          <p style={{ color: "#aaa" }}>A dynamic, visual representation of the prediction will go here...</p>
        </div>

        {/* CENTER BOTTOM: Command Center (Takes up 1/3 of vertical space) */}
        <div style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Active Chat Area */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", minHeight: 0 }}>

            {messages.length === 0 ? (
              <p style={{ color: "#888", fontStyle: "italic" }}>Welcome to the Agentic Prediction Copilot, what is your prediction?</p>
            ) : (
              messages.map((msg, index) => {
                const hasSlider = msg.content.includes("[UI_TRIGGER: PROBABILITY_SLIDER]");
                const isResearching = msg.content.includes("[UI_TRIGGER: RESEARCHING]");
                const isFinal = msg.content.includes("[UI_TRIGGER: FINAL_VERDICT]");
                
                let cleanContent = msg.content
                  .replace("[UI_TRIGGER: PROBABILITY_SLIDER]", "")
                  .replace("[UI_TRIGGER: RESEARCHING]", "")
                  .replace("[UI_TRIGGER: FINAL_VERDICT]", "");
                  
                // Clean the dynamic tags
                if (cleanContent.includes("[HIDDEN_AI_PROBABILITY: ")) {
                  const num = cleanContent.split("[HIDDEN_AI_PROBABILITY: ")[1].split("]")[0];
                  cleanContent = cleanContent.replace(`[HIDDEN_AI_PROBABILITY: ${num}]`, "");
                }
                if (cleanContent.includes("[FINAL_QUESTION: ")) {
                  const q = cleanContent.split("[FINAL_QUESTION: ")[1].split("]")[0];
                  cleanContent = cleanContent.replace(`[FINAL_QUESTION: ${q}]`, "");
                }
                if (cleanContent.includes("[FINAL_THESIS: ")) {
                  const t = cleanContent.split("[FINAL_THESIS: ")[1].split("]")[0];
                  cleanContent = cleanContent.replace(`[FINAL_THESIS: ${t}]`, "");
                }
                if (cleanContent.includes("[FINAL_DATE: ")) {
                  const d = cleanContent.split("[FINAL_DATE: ")[1].split("]")[0];
                  cleanContent = cleanContent.replace(`[FINAL_DATE: ${d}]`, "");
                }
                cleanContent = cleanContent.trim();

                return (
                  <div
                    key={index}
                    style={{
                      padding: "1rem",
                      backgroundColor: msg.role === "user" ? "#1a1a1a" : "#222", borderRadius: "4px"
                    }}>
                    <strong style={{ color: msg.role === "user" ? "#aaa" : "#0070f3" }}>
                      {msg.role === "user" ? "You" : "Copilot"}
                    </strong>

                    <div style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                      <ReactMarkdown>{cleanContent}</ReactMarkdown>
                      {hasSlider && (
  <div style={{ 
    marginTop: "1.5rem", 
    padding: "1.5rem", 
    backgroundColor: "#1a1a2e", 
    borderRadius: "12px", 
    border: "1px solid #2a2a4a",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
  }}>
    {/* Widget Header */}
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
      <span style={{ fontSize: "1.2rem" }}>📊</span>
      <h4 style={{ margin: 0, color: "#0070f3", textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.85rem" }}>
        Assessment Required
      </h4>
    </div>

    {/* Label & Sleek Number Input */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
      <label style={{ fontWeight: "500", color: "#e0e0e0", fontSize: "0.95rem" }}>
        Set your baseline probability
      </label>
      <div style={{ 
        display: "flex", alignItems: "center", gap: "0.25rem", 
        backgroundColor: "#0f0f1a", padding: "0.25rem 0.5rem", 
        borderRadius: "6px", border: "1px solid #2a2a4a" 
      }}>
        <input
          type="number"
          min="0" max="100"
          value={sliderValue}
          onChange={(e) => {
            const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
            setSliderValue(val);
          }}
          style={{
            width: "45px", backgroundColor: "transparent", border: "none",
            color: "#0070f3", fontWeight: "bold", fontSize: "1.1rem",
            textAlign: "right", outline: "none"
          }}
        />
        <span style={{ color: "#aaa", fontSize: "1rem", fontWeight: "bold" }}>%</span>
      </div>
    </div>

    {/* The Slider itself */}
    <input 
      type="range" 
      min="0" max="100" 
      value={sliderValue}
      onChange={(e) => setSliderValue(parseInt(e.target.value))}
      style={{ width: "100%", cursor: "pointer", accentColor: "#0070f3", height: "6px" }} 
    />

    {/* Tick marks/Labels */}
    <div style={{ 
      display: "flex", justifyContent: "space-between", 
      fontSize: "0.75rem", color: "#666", marginTop: "0.75rem", 
      fontWeight: "bold", textTransform: "uppercase" 
    }}>
      <span>Impossible (0%)</span>
      <span>Even Odds (50%)</span>
      <span>Certain (100%)</span>
    </div>
  </div>
)}

                    </div>
                  </div>
                )
              })
            )}
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your prediction"
              style={{ flex: 1, padding: "1rem", borderRadius: "8px", backgroundColor: "#1e1e1e", border: "1px solid #333", color: "white" }}
            />
            <button type="submit" disabled={isLoading} style={{ padding: "1rem", borderRadius: "8px", backgroundColor: "#333", border: "1px solid #444", cursor: "pointer" }}>
              Send
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANEL: Sources / Context (Fixed Width) */}
      <div style={{ width: "300px", borderLeft: "1px solid #333", padding: "1.5rem" }}>
        <h3 style={{ color: "#888", fontSize: "0.9rem", textTransform: "uppercase" }}>Sources</h3>
        {/* list references and artifacts here */}
      </div>

    </div>
  );
}
