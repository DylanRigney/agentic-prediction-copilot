"use client"

import React, {useState, useEffect, use} from "react";
import Link from "next/link";

interface PredictionRecord {
    id: number;
    question: string;
    category: string;
    thesis: string;
    baseline_probability: number;
    ai_final_probabillty: number;
    user_final_prbability: number;
    target_date: string;
    status: string;
    created_at: string
}

export default function HistoryPage() {
    const [history, setHistory] = useState<PredictionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/history");
                if (res.ok)  {
                    const predictions = await res.json()
                    setHistory(predictions);
                }
            } catch (err) {
                console.error("Failed to fetch history:", err);
            } finally {
                setIsLoading(false)
            }
        };
        fetchHistory();
    }, []);

    return (
        <div style={{ padding: "2rem", color: "white", backgroundColor: "#0e0e0e", minHeight: "100vh" }}>
            <Link href="/" style={{ color: "#0070f3", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>
                ← Back to Copilot
            </Link>

            <h1 style={{ marginBottom: "2rem", fontWeight: "300" }}>Prediction History</h1>

            {isLoading ? (
                <p style={{ color: "#888" }}>Loading predictions...</p>
            ) : history.length === 0 ? (
                <p style={{ color: "#888" }}>No predictions saved yet.</p>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                    
                    {history.map((record) => (
                        <div key={record.id} style={{
                            backgroundColor: "rgba(255, 255, 255, 0.03)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "12px",
                            padding: "1.5rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1rem"
                        }}>
                            <div>
                                <span style={{ fontSize: "0.8rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "1px" }}>
                                    {record.category} • {record.target_date}
                                </span>
                                <h3 style={{ margin: "0.5rem 0 0 0", fontSize: "1.1rem", lineHeight: "1.4" }}>
                                    {record.question}
                                </h3>
                            </div>

                            <p style={{ color: "#ccc", fontSize: "0.9rem", margin: 0, flex: 1 }}>
                                {record.thesis}
                            </p>

                            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase" }}>Your Odds</div>
                                    <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#fff" }}>{record.user_final_probability}%</div>
                                </div>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "0.7rem", color: "#0070f3", textTransform: "uppercase" }}>AI Odds</div>
                                    <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#0070f3" }}>{record.ai_final_probability}%</div>
                                </div>
                            </div>
                        </div>
                    ))}

                </div>
            )}
        </div>
    );
}