"use client"

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./page.module.css";
import { Content } from "next/font/google";


export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: "demo-thread-1",
          message: messageText
        })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let buffer = "";

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
    } catch (error) {
      console.error("Error fetching stream:", error);
    } finally {
      setIsLoading(false);
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
                const cleanContent = msg.content.replace("[UI_TRIGGER: PROBABILITY_SLIDER]", "");

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
                        <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#333", borderRadius: "8px" }}>
                          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", color: "#fff" }}>
                            Set Your Baseline Probability
                          </label>
                          <input type="range" min="0" max="100" defaultValue="50" style={{ width: "100%", cursor: "pointer" }} />
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: " #aaa", marginTop: "0.5rem" }}>
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
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
