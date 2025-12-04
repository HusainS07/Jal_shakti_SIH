"use client";

import { useState } from "react";

export default function SimpleAPITest() {
  const [stationId, setStationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [jsonResponse, setJsonResponse] = useState("");
  const [error, setError] = useState("");

  const testAPI = async () => {
    if (!stationId) {
      setError("Enter Station ID");
      return;
    }

    setLoading(true);
    setError("");
    setJsonResponse("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found. Please login first.");
      }

      const res = await fetch(`/api/ai/${stationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "API Error");
      }
      
      setJsonResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simple API Tester</h1>
      
      <div className="mb-6">
        <input
          type="text"
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
          placeholder="Enter Station ID"
          className="border p-2 mr-4 w-64"
        />
        <button
          onClick={testAPI}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Loading..." : "Test API"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          Error: {error}
        </div>
      )}

      {jsonResponse && (
        <div>
          <h2 className="text-lg font-bold mb-2">API Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {jsonResponse}
          </pre>
        </div>
      )}
    </div>
  );
}