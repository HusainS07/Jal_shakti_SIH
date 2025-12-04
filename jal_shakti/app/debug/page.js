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

      console.log("Testing API with token:", token.substring(0, 30) + "...");

      const res = await fetch(`/api/ai/${stationId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.details || `HTTP ${res.status}: API Error`);
      }
      
      setJsonResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err.message);
      console.error("API Test Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Simple API Tester</h1>
          <p className="text-gray-400">
            Test /api/ai/[station_id] endpoint. Token is automatically taken from localStorage.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Station ID
              </label>
              <input
                type="text"
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                placeholder="Enter Station ID (e.g., STATION123)"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={testAPI}
                disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Testing API...
                  </>
                ) : (
                  "Test API"
                )}
              </button>
            </div>
          </div>

          {/* Token Info */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              Token source: <code className="bg-gray-900 px-2 py-1 rounded">localStorage.getItem("token")</code>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Make sure you're logged in and have a valid JWT token in localStorage
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-300">{error}</p>
            <div className="mt-3 text-sm text-red-400">
              Check: 1) You're logged in, 2) Station ID exists, 3) Token is valid
            </div>
          </div>
        )}

        {/* Response Display */}
        {jsonResponse && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">API Response</h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonResponse);
                  alert("JSON copied to clipboard!");
                }}
                className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded transition"
              >
                Copy JSON
              </button>
            </div>

            {/* Quick Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Quick Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {(() => {
                  try {
                    const data = JSON.parse(jsonResponse);
                    return (
                      <>
                        <div className="bg-gray-900/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Station</div>
                          <div className="text-white font-medium truncate">
                            {data.station_info?.station_name || "Unknown"}
                          </div>
                        </div>
                        <div className="bg-gray-900/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Water Level</div>
                          <div className="text-white font-medium">
                            {data.water_data?.current_level || "N/A"}m
                          </div>
                        </div>
                        <div className="bg-gray-900/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">User Role</div>
                          <div className="text-white font-medium capitalize">
                            {data.user_context?.role || "Unknown"}
                          </div>
                        </div>
                      </>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}
              </div>
            </div>

            {/* Full JSON */}
            <div className="relative">
              <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg overflow-auto max-h-[500px] text-sm border border-gray-700 whitespace-pre-wrap">
                {jsonResponse}
              </pre>
              <div className="absolute top-2 right-2 text-xs text-gray-500">
                {jsonResponse.length} characters
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/30 p-4 rounded-xl">
            <h3 className="font-medium text-blue-400 mb-2 text-sm">API Endpoint</h3>
            <code className="text-xs bg-gray-900 text-cyan-400 px-3 py-2 rounded-lg block">
              GET /api/ai/{'{station_id}'}
            </code>
          </div>
          <div className="bg-gray-800/30 p-4 rounded-xl">
            <h3 className="font-medium text-green-400 mb-2 text-sm">Required Headers</h3>
            <code className="text-xs bg-gray-900 text-green-400 px-3 py-2 rounded-lg block">
              Authorization: Bearer {'{jwt_token}'}
            </code>
          </div>
          <div className="bg-gray-800/30 p-4 rounded-xl">
            <h3 className="font-medium text-purple-400 mb-2 text-sm">Response Includes</h3>
            <div className="text-xs text-gray-400 space-y-1">
              <div>• AI recommendations</div>
              <div>• Water quality analysis</div>
              <div>• Conservation tips</div>
              <div>• Role-specific advice</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}