"use client";
import React, { useState } from "react";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिंदी" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "bn", name: "বাংলা" },
  { code: "mr", name: "मराठी" },
  { code: "gu", name: "ગુજરાતી" },
  { code: "kn", name: "ಕನ್ನಡ" },
  { code: "ml", name: "മലയാളം" },
  { code: "pa", name: "ਪੰਜਾਬੀ" },
  { code: "or", name: "ଓଡ଼ିଆ" },
  { code: "as", name: "অসমীয়া" },
];

export default function APITester() {
  const [stationId, setStationId] = useState("");
  const [selectedLang, setSelectedLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");

  const testAPI = async () => {
    if (!stationId.trim()) {
      setError("Please enter a Station ID");
      return;
    }

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const token = localStorage.getItem("token") || "";
      const url = `/api/ai/${stationId}?language_id=${selectedLang}`;
      
      console.log("Testing URL:", url);
      
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(`Error ${res.status}: ${data.error || "API request failed"}`);
      } else {
        setResponse(data);
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>API Tester - /api/ai/[station_id]</h1>
      
      <div style={{ marginBottom: "20px", padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label>Station ID: </label>
          <input
            type="text"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            placeholder="e.g. RJ_JAIPUR_CHOMU_001"
            style={{ padding: "8px", width: "300px", marginLeft: "10px" }}
          />
        </div>
        
        <div style={{ marginBottom: "10px" }}>
          <label>Language: </label>
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            style={{ padding: "8px", marginLeft: "10px" }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        
        <button
          onClick={testAPI}
          disabled={loading}
          style={{
            padding: "10px 20px",
            background: loading ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px"
          }}
        >
          {loading ? "Loading..." : "Test API"}
        </button>
        
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
          URL: /api/ai/{stationId || "[station_id]"}?language_id={selectedLang}
        </div>
      </div>

      {error && (
        <div style={{ padding: "15px", background: "#fee", border: "1px solid #fcc", borderRadius: "5px", marginBottom: "20px", color: "#c00" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div>
          <h2>JSON Response:</h2>
          <pre style={{
            background: "#1e1e1e",
            color: "#d4d4d4",
            padding: "20px",
            borderRadius: "8px",
            overflow: "auto",
            maxHeight: "70vh",
            fontSize: "14px"
          }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}