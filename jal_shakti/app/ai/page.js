"use client";
import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");

  const sendPrompt = async () => {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    setResponse(data.text || data.error);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Gemini Test UI</h1>
      <textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <br />
      <button onClick={sendPrompt}>Send</button>
      <p>{response}</p>
    </div>
  );
}
