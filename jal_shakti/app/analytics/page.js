// app/analytics/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Droplets, CloudRain, Search } from "lucide-react";
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

  // Debounced search function
  useEffect(() => {
    if (stationId.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer - wait 500ms after user stops typing
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
    }, 500); // 500ms debounce delay

    // Cleanup on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
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
      // Fetch station data by ID
      const res = await fetch(`/api/analytics/station/${encodeURIComponent(stationId.trim())}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Station not found");
        setData(null);
        setPrediction(null);
        setLoading(false);
        return;
      }

      setData(json.station);

      // Fetch prediction
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

      const pred = await fetch("/api/future_condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const predJson = await pred.json();
      setPrediction(predJson.predictions_2024 || predJson);
    } catch (err) {
      setError("Failed to fetch data. Please try again.");
      setData(null);
      setPrediction(null);
    }

    setLoading(false);
  };

  // Fetch suggestions when user types
  const handleInputChange = (value) => {
    setStationId(value);
    // Debouncing is now handled by useEffect above
  };

  const selectSuggestion = (station) => {
    setStationId(station.station_id);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">Groundwater Analytics</h1>
          <p className="text-2xl text-gray-600">Search by Station ID</p>
        </div>

        {/* Search Form */}
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
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="e.g., STN001, MUMBAI-01"
                  className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-teal-500 transition"
                  autoComplete="off"
                />
                
                {/* Loading indicator for search */}
                {searchLoading && (
                  <div className="absolute right-4 top-[4.5rem] text-teal-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
                  </div>
                )}
                
                {/* Autocomplete Dropdown */}
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-teal-600 mb-6 mx-auto"></div>
            <p className="text-2xl text-gray-700">Loading groundwater & rainfall data...</p>
          </div>
        )}

        {/* No Results State */}
        {!loading && hasSearched && !data && !error && (
          <div className="text-center py-20">
            <p className="text-3xl text-gray-500">No data found. Try another station ID.</p>
          </div>
        )}

        {/* Data Display */}
        {data && prediction && (
          <>
            <div className="grid lg:grid-cols-2 gap-12">

              {/* Current Status */}
              <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
                <h2 className="text-4xl font-bold mb-10">Current Water Level</h2>
                <div className={`w-56 h-56 ${data.waterStatus.statusColor} rounded-full mx-auto flex items-center justify-center text-white text-9xl font-black shadow-2xl mb-8`}>
                  {data.waterStatus.statusShort}
                </div>
                <p className="text-8xl font-black text-teal-700 mb-4">
                  {data.waterStatus.currentDepth} m
                </p>
                <p className="text-3xl text-gray-600 mb-8">{data.waterStatus.referencePeriod}</p>
                <p className="text-6xl font-bold text-gray-800 mb-12">{data.waterStatus.status}</p>

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
                    <p className="text-2xl font-bold text-teal-700">{data.aquifer_type?.replace(/_/g, " ")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <p className="font-bold text-gray-700">Coordinates</p>
                    <p className="text-lg font-bold text-purple-700">{data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}</p>
                  </div>
                </div>
              </div>

              {/* 2024 Prediction */}
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl shadow-2xl p-12 text-center">
                <h2 className="text-4xl font-bold text-purple-800 mb-10">2024 Forecast</h2>
                {(() => {
                  const predAprMay = prediction?.apr_may || 9.8;
                  const predStatus = predAprMay <= 30 ? "SAFE" : predAprMay <= 45 ? "ALERT" : "CRITICAL";
                  const predColor = predAprMay <= 30 ? "bg-green-500" : predAprMay <= 45 ? "bg-yellow-500" : "bg-red-600";
                  const predShort = predAprMay <= 30 ? "S" : predAprMay <= 45 ? "A" : "C";

                  return (
                    <>
                      <div className={`w-64 h-64 ${predColor} rounded-full mx-auto flex items-center justify-center text-white text-9xl font-black shadow-2xl mb-10`}>
                        {predShort}
                      </div>
                      <p className="text-9xl font-black text-purple-700 mb-6">{predAprMay.toFixed(1)} m</p>
                      <p className="text-4xl font-bold text-purple-800 mb-12">Apr–May 2024 • {predStatus}</p>
                    </>
                  );
                })()}

                <div className="grid grid-cols-4 gap-6">
                  {["jan", "apr_may", "aug", "nov"].map(k => (
                    <div key={k} className={`p-8 rounded-3xl ${k === "apr_may" ? "bg-purple-800 text-white" : "bg-white"} shadow-xl`}>
                      <p className="text-lg font-medium">{k === "apr_may" ? "Apr–May" : k.toUpperCase()}</p>
                      <p className="text-4xl font-black mt-3">{prediction?.[k]?.toFixed(1) || "?"} m</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rainfall Forecast Section */}
            {data.rainfall_forecast && data.rainfall_forecast.length > 0 && (
              <div className="mt-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl shadow-2xl p-10 text-white">
                <h2 className="text-4xl font-bold text-center mb-8 flex items-center justify-center gap-4">
                  <CloudRain className="w-12 h-12" />
                  12-Month Rainfall Forecast (SEAS5 Model)
                </h2>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-4">
                  {data.rainfall_forecast.map((item, idx) => {
                    const monthName = months[idx];
                    const value = item.precipitation_mm;
                    const barHeight = value ? Math.max((value / 300) * 160, 20) : 20;

                    return (
                      <div key={idx} className="text-center">
                        <div className="text-lg font-semibold mb-2">{monthName}</div>
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

            {/* Detailed Parameters */}
            <div className="mt-16 bg-white rounded-3xl shadow-2xl p-10">
              <h2 className="text-4xl font-bold text-center mb-10 text-gray-800">Aquifer & Extraction Details</h2>
              <div className="grid md:grid-cols-3 gap-8 text-lg">
                <div>
                  <h3 className="font-bold text-teal-700 mb-4">Aquifer Properties</h3>
                  <div className="space-y-3">
                    <p><strong>Weathered Zone:</strong> {data.weathered_zone_depth} m</p>
                    <p><strong>Fractured Zone:</strong> {data.fractured_zone_depth} m</p>
                    <p><strong>Storativity:</strong> {data.storativity}</p>
                    <p><strong>Transmissivity:</strong> {data.transmissivity} m²/day</p>
                    <p><strong>Infiltration Rate:</strong> {data.infiltration_rate}%</p>
                    <p><strong>Storage Capacity:</strong> {data.storage_capacity?.toLocaleString()} m³</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-purple-700 mb-4">Extraction Infrastructure</h3>
                  <div className="space-y-3">
                    <p><strong>Borewells:</strong> {data.borewell_count}</p>
                    <p><strong>Avg Depth:</strong> {data.avg_well_depth} m</p>
                    <p><strong>Handpumps:</strong> {data.handpump_count}</p>
                    <p><strong>Open Wells:</strong> {data.open_well_count}</p>
                    <p><strong>Daily Extraction:</strong> {data.extraction_rate} m³/day</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-blue-700 mb-4">Current Levels (Latest)</h3>
                  <div className="space-y-3">
                    <p><strong>Jan:</strong> {data.current_jan} m</p>
                    <p><strong>Apr–May:</strong> {data.current_apr_may} m</p>
                    <p><strong>Aug:</strong> {data.current_aug} m</p>
                    <p><strong>Nov:</strong> {data.current_nov} m</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="text-center mt-16">
          <Link href="/" className="inline-block px-16 py-6 bg-white rounded-3xl shadow-2xl text-3xl font-bold hover:shadow-3xl transition">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}