// app/analytics/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, CloudRain, Search, TrendingUp, TrendingDown, Droplets } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const [stationId, setStationId] = useState("");
  const [data, setData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceTimer = useRef(null);

  // Debounced search suggestions
  useEffect(() => {
    if (stationId.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/analytics/stations?search=${encodeURIComponent(stationId)}&limit=10`);
        const json = await res.json();
        if (json.success) {
          setSuggestions(json.stations);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [stationId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!stationId.trim()) {
      setError("Please enter a station ID");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setShowSuggestions(false);

    try {
      const res = await fetch(`/api/analytics/station/${encodeURIComponent(stationId.trim())}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Station not found");
        setData(null);
        setPrediction(null);
        return;
      }

      setData(json.station);

      const payload = {
        weathered_zone_depth: json.station.weathered_zone_depth,
        fractured_zone_depth: json.station.fractured_zone_depth,
        storativity: json.station.storativity,
        transmissivity: json.station.transmissivity,
        infiltration_rate: json.station.infiltration_rate,
        storage_capacity: json.station.storage_capacity,
        borewell_count: json.station.borewell_count,
        avg_well_depth: json.station.avg_well_depth,
        handpump_count: json.station.handpump_count,
        open_well_count: json.station.open_well_count,
        extraction_rate: json.station.extraction_rate,
        current_jan: json.station.current_jan,
        current_apr_may: json.station.current_apr_may,
        current_aug: json.station.current_aug,
        current_nov: json.station.current_nov,
      };

      console.log("📤 Sending payload to ML model:", payload);
      console.log("🔍 Station data received:", json.station);

      const pred = await fetch("/api/future_condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const predJson = await pred.json();
      
      // Debug: Log the API response
      console.log("🔍 FULL Prediction API Response:", JSON.stringify(predJson, null, 2));
      console.log("🔍 Response keys:", Object.keys(predJson));
      console.log("Has predictions_2024?", predJson.predictions_2024);
      console.log("Has direct jan?", predJson.jan);
      
      setPrediction(predJson);
    } catch (err) {
      setError("Failed to fetch data. Please try again.");
      setData(null);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (station) => {
    setStationId(station.station_id);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getStatusInfo = (depth) => {
    if (depth <= 30) return { status: "SAFE", color: "bg-green-500", short: "S" };
    if (depth <= 45) return { status: "ALERT", color: "bg-yellow-500", short: "A" };
    return { status: "CRITICAL", color: "bg-red-600", short: "C" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-4">
            <Droplets className="w-16 h-16 text-teal-600" />
            Groundwater Analytics
          </h1>
          <p className="text-2xl text-gray-600">Search by Station ID for detailed analysis</p>
        </div>

        {/* SEARCH */}
        <div className="max-w-2xl mx-auto mb-16">
          <form onSubmit={handleSearch} className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <label htmlFor="stationId" className="block text-lg font-semibold text-gray-700 mb-3">
                  Enter Station ID
                </label>
                <input
                  id="stationId"
                  type="text"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="e.g., STN001, MUMBAI-01"
                  className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-teal-500 transition"
                  autoComplete="off"
                />
                {searchLoading && (
                  <div className="absolute right-4 top-[4.5rem] text-teal-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
                  </div>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-80 overflow-y-auto">
                    {suggestions.map((station, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSuggestion(station)}
                        className="w-full text-left px-6 py-4 hover:bg-teal-50 transition border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-bold text-teal-700">{station.station_id}</div>
                        <div className="text-sm text-gray-600">{station.village}, {station.district}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-auto px-8 py-4 bg-teal-600 text-white rounded-2xl font-bold text-xl hover:bg-teal-700 disabled:bg-gray-400 transition flex items-center gap-3"
              >
                <Search className="w-6 h-6" />
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-6 bg-red-100 border-2 border-red-400 text-red-700 px-6 py-4 rounded-2xl text-center text-lg">
              {error}
            </div>
          )}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-teal-600 mb-6 mx-auto"></div>
            <p className="text-2xl text-gray-700">Loading groundwater & rainfall data...</p>
          </div>
        )}

        {/* MAIN CONTENT */}
        {data && prediction && (
          <>
            <div className="grid lg:grid-cols-2 gap-12 mb-16">

              {/* CURRENT STATUS */}
              <div className="bg-white rounded-3xl shadow-2xl p-12">
                <h2 className="text-4xl font-bold mb-10 text-center">Current Water Level</h2>
                {(() => {
                  const currentDepth = data.waterStatus?.currentDepth || data.current_apr_may || 0;
                  const statusInfo = getStatusInfo(currentDepth);
                  return (
                    <>
                      <div className={`w-56 h-56 ${statusInfo.color} rounded-full mx-auto flex items-center justify-center text-white text-9xl font-black shadow-2xl mb-8`}>
                        {statusInfo.short}
                      </div>
                      <p className="text-8xl font-black text-teal-700 mb-4 text-center">
                        {currentDepth.toFixed(1)} m
                      </p>
                      <p className="text-3xl text-gray-600 mb-8 text-center">
                        {data.waterStatus?.referencePeriod || "Latest Reading"}
                      </p>
                      <p className="text-6xl font-bold text-gray-800 mb-12 text-center">{statusInfo.status}</p>
                    </>
                  );
                })()}

                <div className="grid grid-cols-2 gap-6 text-left text-lg">
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <p className="font-bold text-gray-700">Station ID</p>
                    <p className="text-2xl font-bold text-teal-700">{data.station_id}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <p className="font-bold text-gray-700">Location</p>
                    <p className="text-xl font-bold text-purple-700">{data.village}, {data.district}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <p className="font-bold text-gray-700">Aquifer Type</p>
                    <p className="text-2xl font-bold text-teal-700">{data.aquifer_type?.replace(/_/g, " ") || "N/A"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <p className="font-bold text-gray-700">Coordinates</p>
                    <p className="text-lg font-bold text-purple-700">
                      {data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2024 FORECAST */}
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl shadow-2xl p-12">
                <h2 className="text-4xl font-bold text-purple-800 mb-10 text-center">2024 Forecast</h2>
                {(() => {
                  // Parse the string values from API - handle both formats
                  const rawAprMay = prediction.predictions_2024?.apr_may ?? prediction.apr_may;
                  const predAprMay = parseFloat(rawAprMay) || 0;
                  console.log("Parsed Apr-May value:", predAprMay, "from", rawAprMay);
                  
                  const forecastStatus = getStatusInfo(predAprMay);
                  return (
                    <>
                      <div className={`w-64 h-64 ${forecastStatus.color} rounded-full mx-auto flex items-center justify-center text-white text-9xl font-black shadow-2xl mb-10`}>
                        {forecastStatus.short}
                      </div>
                      <p className="text-9xl font-black text-purple-700 mb-6 text-center">
                        {predAprMay.toFixed(1)} m
                      </p>
                      <p className="text-4xl font-bold text-purple-800 mb-12 text-center">
                        Apr–May 2024 • {forecastStatus.status}
                      </p>
                    </>
                  );
                })()}

                {/* Predicted Levels */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    { key: "jan", label: "JAN" },
                    { key: "apr_may", label: "APR-MAY" },
                    { key: "aug", label: "AUG" },
                    { key: "nov", label: "NOV" }
                  ].map(({ key, label }) => {
                    // Handle both direct properties and nested predictions_2024
                    const rawValue = prediction.predictions_2024?.[key] ?? prediction[key];
                    const value = parseFloat(rawValue);
                    
                    console.log(`${key}:`, rawValue, "->", value);
                    
                    return (
                      <div
                        key={key}
                        className={`p-6 rounded-2xl ${key === "apr_may" ? "bg-purple-800 text-white" : "bg-white"} shadow-xl`}
                      >
                        <p className="text-sm font-medium text-center">{label}</p>
                        <p className="text-3xl font-black mt-2 text-center">
                          {!isNaN(value) && value > 0 ? value.toFixed(1) : "—"} m
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* RECHARGE RATES */}
                <div className="bg-white/90 rounded-3xl p-6">
                  <h3 className="text-xl font-bold text-purple-800 mb-4 text-center">
                    Recharge Rate vs Previous Season
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { key: "jan", label: "JAN" },
                      { key: "apr_may", label: "APR-MAY" },
                      { key: "aug", label: "AUG" },
                      { key: "nov", label: "NOV" }
                    ].map(({ key, label }) => {
                      const r = prediction.recharge_rates?.[key];
                      if (!r) {
                        return (
                          <div key={key} className="text-center">
                            <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
                            <span className="text-gray-400 text-xl">—</span>
                          </div>
                        );
                      }
                      return (
                        <div key={key} className="text-center">
                          <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
                          <div
                            className={`mt-1 text-2xl font-bold flex items-center justify-center gap-1 ${
                              r.isRecovery ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {r.percentage}%
                            {r.isRecovery ? 
                              <TrendingUp className="w-5 h-5" /> : 
                              <TrendingDown className="w-5 h-5" />
                            }
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {r.isRecovery ? "Recovery" : "Decline"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* RAINFALL FORECAST */}
            {data.rainfall_forecast && data.rainfall_forecast.length > 0 && (
              <div className="mb-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl shadow-2xl p-10 text-white">
                <h2 className="text-4xl font-bold text-center mb-8 flex items-center justify-center gap-4">
                  <CloudRain className="w-12 h-12" />
                  12-Month Rainfall Forecast (SEAS5 Model)
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-4">
                  {data.rainfall_forecast.map((item, idx) => {
                    const value = item.precipitation_mm;
                    const barHeight = value ? Math.max((value / 300) * 160, 20) : 20;

                    return (
                      <div key={idx} className="text-center">
                        <div className="text-lg font-semibold mb-2">{months[idx]}</div>
                        <div className="relative bg-white bg-opacity-20 rounded-full h-40 flex items-end justify-center pb-3">
                          <div
                            className="w-10 bg-white rounded-t-full transition-all duration-500"
                            style={{ height: `${barHeight}px` }}
                          />
                        </div>
                        <div className="mt-3 text-2xl font-bold">
                          {value ? `${value.toFixed(0)} mm` : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-center mt-8 text-lg opacity-90">
                  Source: ECMWF SEAS5 Seasonal Forecast • Updated monthly
                </p>
              </div>
            )}

            {/* DETAILED PARAMETERS */}
            <div className="bg-white rounded-3xl shadow-2xl p-10">
              <h2 className="text-4xl font-bold text-center mb-10 text-gray-800">
                Aquifer & Extraction Details
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-lg">
                <div>
                  <h3 className="font-bold text-teal-700 mb-4 text-xl">Aquifer Properties</h3>
                  <div className="space-y-3">
                    <p><strong>Weathered Zone:</strong> {data.weathered_zone_depth ?? "—"} m</p>
                    <p><strong>Fractured Zone:</strong> {data.fractured_zone_depth ?? "—"} m</p>
                    <p><strong>Storativity:</strong> {data.storativity ?? "—"}</p>
                    <p><strong>Transmissivity:</strong> {data.transmissivity ?? "—"} m²/day</p>
                    <p><strong>Infiltration Rate:</strong> {data.infiltration_rate ?? "—"}%</p>
                    <p><strong>Storage Capacity:</strong> {data.storage_capacity ? `${(data.storage_capacity / 1e6).toFixed(1)}M m³` : "—"}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-purple-700 mb-4 text-xl">Extraction Infrastructure</h3>
                  <div className="space-y-3">
                    <p><strong>Borewells:</strong> {data.borewell_count ?? "—"}</p>
                    <p><strong>Avg Depth:</strong> {data.avg_well_depth ?? "—"} m</p>
                    <p><strong>Handpumps:</strong> {data.handpump_count ?? "—"}</p>
                    <p><strong>Open Wells:</strong> {data.open_well_count ?? "—"}</p>
                    <p><strong>Daily Extraction:</strong> {data.extraction_rate ? `${data.extraction_rate.toFixed(0)} m³/day` : "—"}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-blue-700 mb-4 text-xl">Current Levels (Latest)</h3>
                  <div className="space-y-3">
                    <p><strong>Jan:</strong> {data.current_jan ?? "—"} m</p>
                    <p><strong>Apr–May:</strong> {data.current_apr_may ?? "—"} m</p>
                    <p><strong>Aug:</strong> {data.current_aug ?? "—"} m</p>
                    <p><strong>Nov:</strong> {data.current_nov ?? "—"} m</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="text-center mt-16">
          <Link
            href="/"
            className="inline-block px-16 py-6 bg-white rounded-3xl shadow-2xl text-3xl font-bold hover:shadow-3xl transition hover:scale-105"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}