// app/analytics/page.js
"use client";

import { useState, useEffect } from "react";
import { MapPin, TrendingUp, Droplets } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const lng = 73.1167;
      const lat = 19.0333;

      // 1. Get full analytics data
      const res = await fetch(`/api/analytics/nearest?lon=${lng}&lat=${lat}`);
      const json = await res.json();

      if (json.success) {
        setData(json.station);

        // 2. Call future_condition with full payload
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
      }

      setLoading(false);
    };
    run();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-teal-600 mb-6"></div>
          <p className="text-2xl text-gray-700">Analyzing groundwater data...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div>No data found</div>;

  const s = data;
  const predAprMay = prediction?.apr_may || 9.8;
  const predStatus = predAprMay <= 30 ? "SAFE" : predAprMay <= 45 ? "ALERT" : "CRITICAL";
  const predColor = predAprMay <= 30 ? "bg-green-500" : predAprMay <= 45 ? "bg-yellow-500" : "bg-red-600";
  const predShort = predAprMay <= 30 ? "S" : predAprMay <= 45 ? "A" : "C";

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">Groundwater Analytics</h1>
          <p className="text-2xl text-gray-600">MH_RAIGAD_PANVEL_001 • Chinchpara, Raigad</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">

          {/* Current Status */}
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <h2 className="text-4xl font-bold mb-10">Current Water Level</h2>
            <div className={`w-56 h-56 ${s.waterStatus.statusColor} rounded-full mx-auto flex items-center justify-center text-white text-10xl font-black shadow-2xl mb-8`}>
              {s.waterStatus.statusShort}
            </div>
            <p className="text-10xl font-black text-teal-700 mb-4">
              {s.waterStatus.currentDepth} m
            </p>
            <p className="text-3xl text-gray-600 mb-8">{s.waterStatus.referencePeriod}</p>
            <p className="text-6xl font-bold text-gray-800 mb-12">{s.waterStatus.status}</p>

            <div className="grid grid-cols-2 gap-6 text-left text-lg">
              <div className="bg-gray-50 rounded-2xl p-6">
                <p className="font-bold text-gray-700">Aquifer Type</p>
                <p className="text-2xl font-bold text-teal-700">{s.aquifer_type.replace(/_/g, " ")}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6">
                <p className="font-bold text-gray-700">Distance</p>
                <p className="text-2xl font-bold text-purple-700">{s.distance_km} km</p>
              </div>
            </div>
          </div>

          {/* 2024 Prediction */}
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl shadow-2xl p-12 text-center">
            <h2 className="text-4xl font-bold text-purple-800 mb-10">2024 Forecast</h2>
            <div className={`w-64 h-64 ${predColor} rounded-full mx-auto flex items-center justify-center text-white text-11xl font-black shadow-2xl mb-10`}>
              {predShort}
            </div>
            <p className="text-11xl font-black text-purple-700 mb-6">{predAprMay} m</p>
            <p className="text-4xl font-bold text-purple-800 mb-12">Apr–May 2024 • {predStatus}</p>

            <div className="grid grid-cols-4 gap-6">
              {["jan", "apr_may", "aug", "nov"].map(k => (
                <div key={k} className={`p-8 rounded-3xl ${k === "apr_may" ? "bg-purple-800 text-white" : "bg-white"} shadow-xl`}>
                  <p className="text-lg font-medium">{k === "apr_may" ? "Apr–May" : k.toUpperCase()}</p>
                  <p className="text-5xl font-black mt-3">{prediction?.[k] || "?"} m</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Parameters */}
        <div className="mt-16 bg-white rounded-3xl shadow-2xl p-10">
          <h2 className="text-4xl font-bold text-center mb-10 text-gray-800">Aquifer & Extraction Details</h2>
          <div className="grid md:grid-cols-3 gap-8 text-lg">
            <div>
              <h3 className="font-bold text-teal-700 mb-4">Aquifer Properties</h3>
              <div className="space-y-3">
                <p><strong>Weathered Zone:</strong> {s.weathered_zone_depth} m</p>
                <p><strong>Fractured Zone:</strong> {s.fractured_zone_depth} m</p>
                <p><strong>Storativity:</strong> {s.storativity}</p>
                <p><strong>Transmissivity:</strong> {s.transmissivity} m²/day</p>
                <p><strong>Infiltration Rate:</strong> {s.infiltration_rate}%</p>
                <p><strong>Storage Capacity:</strong> {s.storage_capacity?.toLocaleString()} m³</p>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-purple-700 mb-4">Extraction Infrastructure</h3>
              <div className="space-y-3">
                <p><strong>Borewells:</strong> {s.borewell_count}</p>
                <p><strong>Avg Depth:</strong> {s.avg_well_depth} m</p>
                <p><strong>Handpumps:</strong> {s.handpump_count}</p>
                <p><strong>Open Wells:</strong> {s.open_well_count}</p>
                <p><strong>Daily Extraction:</strong> {s.extraction_rate} m³/day</p>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-blue-700 mb-4">Current Levels (Latest)</h3>
              <div className="space-y-3">
                <p><strong>Jan:</strong> {s.current_jan} m</p>
                <p><strong>Apr–May:</strong> {s.current_apr_may} m</p>
                <p><strong>Aug:</strong> {s.current_aug} m</p>
                <p><strong>Nov:</strong> {s.current_nov} m</p>
              </div>
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