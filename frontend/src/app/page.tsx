"use client"

import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    // Main container
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0e0e0e", color: "#fff" }}>

      {/* Left Sidebar */}
      <div style={{ width: "250px", borderRight: "1px solid #333", padding: "1.5rem" }}> 
        <h3 style={{ color: "#888", fontSize: "0.9rem", textTransform: "uppercase"}}>Pipeline</h3>
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What is your prediction."
              style={{ flex: 1, padding: "1rem", borderRadius: "8px", backgroundColor: "#1e1e1e", border: "1px solid #333", color: "white" }} 
            />
          </div>
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