"use client"

import React, { useState } from "react";
import styles from "./page.module.css";


export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
  };

  const sendMessage = async (messageText: string) => {
    setIsLoading(true);
    setInput(""); // Clear input box immediately for good UX

    // 1. Add the user's message to the messages list
    const userMsg = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // 2. Fetch the stream from our FastAPI backend
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: "demo-thread-1", // hardcoded for now
          message: messageText
        })
      });

      if (!response.body) throw new Error("No response body");

      // 3. Set up the stream reader and text decoder
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      // Add an empty assistant message that we will update when the chunk arrives
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let buffer = "";

      // 4. Read the stream in a loop
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decode binary bytes into a string
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Split buffer by SSE boundaries (\n\n) to parse individual event frames
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep incomplete lines in the buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              // Parse the JSON payload
              const parsed = JSON.parse(line.slice(6));

              // Find the "oracle" node's output
              if (parsed.oracle && parsed.oracle.messages) {
                const newMsgs = parsed.oracle.messages;
                // Get the text from the model's message
                const assistantContent = newMsgs[newMsgs.length - 1].content;

                // Update our UI: replace the content of our placeholder message
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
        <div style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Active Chat Area */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <p style={{ color: "#888", fontStyle: "italic" }}>Agent is waiting for instructions...</p>
          </div>

          {/* Input Box */}
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What is your prediction?"
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
