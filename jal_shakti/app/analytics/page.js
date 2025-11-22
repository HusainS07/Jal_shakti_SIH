// app/analytics/page.js
"use client";

import { useState, useEffect } from "react";
import { MapPin, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const [station, setStation] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      // Force Panvel location to get your station
      const lng = 73.1167;
      const lat = 19.0333;

      // 1. Get station + status from backend
      const res = await fetch(`/api/stations/nearest/${lng}/${lat}`);
      const data = await res.json();

      if (data.success && data.stations.length > 0) {
        setStation(data.stations[0]); // Already has waterStatus!
      }

      // 2. Get 2024 prediction
      const pred = await fetch("/api/future_condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rainfall: 2800, groundwater_level: 0.6 })
      });
      const predJson = await pred.json();
      setPrediction(predJson.predictions_2024);

      setLoading(false);
    };
    run();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mb-4"></div>
          <p className="text-2xl text-gray-700">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return <div className="min-h-screen flex items-center justify-center text-2xl">No station found</div>;
  }

  const predAprMay = prediction?.apr_may || 9.8;
  const predStatus = predAprMay <= 30 ? "SAFE" : predAprMay <= 45 ? "ALERT" : "CRITICAL";
  const predColor = predAprMay <= 30 ? "bg-green-500" : predAprMay <= 45 ? "bg-yellow-500" : "bg-red-600";
  const predShort = predAprMay <= 30 ? "S" : predAprMay <= 45 ? "A" : "C";

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">Groundwater Analytics</h1>
          <p className="text-2xl text-gray-600">Real-time Status & 2024 Forecast</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">

          {/* CURRENT STATUS */}
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <h2 className="text-4xl font-bold mb-10">Current Water Level</h2>

            <div className={`w-48 h-48 ${station.waterStatus.statusColor} rounded-full mx-auto flex items-center justify-center text-white text-9xl font-black shadow-2xl mb-8`}>
              {station.waterStatus.statusShort}
            </div>

            <p className="text-9xl font-black text-teal-700 mb-4">
              {station.waterStatus.currentDepth !== null ? `${station.waterStatus.currentDepth} m` : "—"}
            </p>
            <p className="text-2xl text-gray-600 mb-6">{station.waterStatus.referencePeriod}</p>
            <p className="text-5xl font-bold text-gray-800 mb-10">{station.waterStatus.status}</p>

            <div className="space-y-4 text-xl">
              <p className="font-bold text-2xl">{station.station_id}</p>
              <p>{station.village}, {station.district}, {station.state}</p>
              <p className="text-gray-600">Aquifer: {station.aquifer_type.replace(/_/g, " ")}</p>
              <p className="text-lg">Distance: <strong>{station.distance_km} km</strong></p>
            </div>
          </div>

          {/* 2024 PREDICTION */}
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl shadow-2xl p-12 text-center">
            <h2 className="text-4xl font-bold text-purple-800 mb-10">2024 Prediction</h2>

            <div className={`w-56 h-56 ${predColor} rounded-full mx-auto flex items-center justify-center text-white text-10xl font-black shadow-2xl mb-10`}>
              {predShort}
            </div>

            <p className="text-10xl font-black text-purple-700 mb-6">{predAprMay} m</p>
            <p className="text-3xl font-bold text-purple-800 mb-8">Apr–May 2024</p>
            <p className="text-6xl font-bold text-purple-900 mb-12">{predStatus}</p>

            <div className="grid grid-cols-4 gap-6">
              {["jan", "apr_may", "aug", "nov"].map(key => (
                <div key={key} className={`p-8 rounded-3xl ${key === "apr_may" ? "bg-purple-800 text-white" : "bg-white"} shadow-xl`}>
                  <p className="text-lg font-medium">
                    {key === "apr_may" ? "Apr–May" : key.toUpperCase()}
                  </p>
                  <p className="text-5xl font-black mt-3">
                    {prediction?.[key] || "?"} m
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <Link href="/" className="inline-block px-16 py-6 bg-white rounded-3xl shadow-2xl text-3xl font-bold hover:shadow-3xl transition">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}