// app/station_data/page.js
"use client";

import { useState, useEffect } from "react";
import { MapPin, Droplets, AlertCircle, CheckCircle, Beaker } from "lucide-react";
import Link from "next/link";

export default function StationDataPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id") || "RJ_JAIPUR_CHOMU_001";

    fetch(`/api/stations/by-id/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data);
        else setError(json.message || "Station not found");
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mb-6"></div>
          <p className="text-2xl font-semibold text-gray-700">Loading Station Data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md">
          <AlertCircle className="w-20 h-20 text-red-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-red-700 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || "No data available"}</p>
          <Link href="/" className="inline-block px-8 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const d = data;
  const q = d.water_quality;  // Safe shortcut

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-12 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl mb-6 shadow-2xl">
            <Droplets className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-6xl font-black text-gray-800 mb-4">Station Data Report</h1>
          <p className="text-3xl font-bold text-blue-700">{d.station_id}</p>
          <p className="text-xl text-gray-600 mt-2">
            {d.location.village}, {d.location.block}, {d.location.district}, {d.location.state}
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-3xl shadow-2xl p-12 mb-12 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-10">Current Groundwater Status</h2>
          <div className={`inline-flex items-center justify-center w-64 h-64 ${d.current_water_level.status_color} rounded-full text-white text-12xl font-black shadow-2xl`}>
            {d.current_water_level.short}
          </div>
          <p className="text-10xl font-black text-blue-700 mt-10">
            {d.current_water_level.depth_m !== null ? `${d.current_water_level.depth_m} m` : "—"}
          </p>
          <p className="text-3xl text-gray-600 mt-4">{d.current_water_level.period}</p>
          <p className="text-6xl font-bold mt-8 text-gray-800">{d.current_water_level.status}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 mb-12">

          {/* Aquifer Details */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-3xl shadow-2xl p-10">
            <h3 className="text-3xl font-bold text-teal-800 mb-8 flex items-center gap-4">
              <Beaker className="w-10 h-10" /> Aquifer Properties
            </h3>
            <div className="grid grid-cols-2 gap-6 text-lg">
              {[
                { label: "Type", value: d.aquifer.type?.replace(/_/g, " ") || "—", },
                { label: "Weathered Zone", value: d.aquifer.weathered_zone_m ? `${d.aquifer.weathered_zone_m} m` : "—", },
                { label: "Fractured Zone", value: d.aquifer.fractured_zone_m ? `${d.aquifer.fractured_zone_m} m` : "—", },
                { label: "Storativity", value: d.aquifer.storativity || "—", },
                { label: "Transmissivity", value: d.aquifer.transmissivity_m2_day ? `${d.aquifer.transmissivity_m2_day} m²/day` : "—", },
                { label: "Storage Capacity", value: d.aquifer.storage_capacity_m3 ? `${d.aquifer.storage_capacity_m3.toLocaleString()} m³` : "—", },
              ].map((item, i) => (
                <div key={i} className="bg-white/80 rounded-2xl p-6">
                  <p className="text-gray-600">{item.label}</p>
                  <p className="text-2xl font-bold text-teal-700">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Water Quality */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-3xl shadow-2xl p-10">
            <h3 className="text-3xl font-bold text-purple-800 mb-8 flex items-center gap-4">
              <Beaker className="w-10 h-10" /> Water Quality
            </h3>

            {!q ? (
              <div className="text-center py-20 text-2xl text-gray-500 bg-white/80 rounded-3xl">
                No water quality data available
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-white/90 rounded-3xl p-10 text-center">
                  <p className="text-8xl font-black text-purple-700">{q.ph}</p>
                  <p className="text-2xl text-gray-600 mt-2">pH Level ({q.year})</p>
                </div>

                <div className="grid grid-cols-3 gap-6 text-lg">
                  <div className="bg-white/80 rounded-2xl p-6 text-center">
                    <p className="text-gray-600">EC</p>
                    <p className="text-2xl font-bold">{q.ec_uScm} µS/cm</p>
                  </div>
                  <div className="bg-white/80 rounded-2xl p-6 text-center">
                    <p className="text-gray-600">NO₃</p>
                    <p className="text-2xl font-bold">{q.no3_mgL} mg/L</p>
                  </div>
                  <div className="bg-white/80 rounded-2xl p-6 text-center">
                    <p className="text-gray-600">F</p>
                    <p className="text-2xl font-bold">{q.f_mgL} mg/L</p>
                  </div>
                </div>

                <div className="text-center">
                  {q.suitability === "POTABLE" ? (
                    <div className="inline-flex items-center gap-4 bg-green-100 text-green-800 px-10 py-6 rounded-3xl text-4xl font-bold">
                      <CheckCircle className="w-14 h-14" /> POTABLE
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-4 bg-red-100 text-red-800 px-10 py-6 rounded-3xl text-4xl font-bold">
                      <AlertCircle className="w-14 h-14" /> REQUIRES TREATMENT
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seasonal Levels */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 mb-12">
          <h3 className="text-4xl font-bold text-center text-gray-800 mb-10">Latest Seasonal Levels</h3>
          <div className="grid grid-cols-4 gap-8">
            {["jan", "apr_may", "aug", "nov"].map(key => (
              <div key={key} className="text-center bg-gradient-to-br from-blue-50 to-cyan-100 rounded-3xl p-8 shadow-xl">
                <p className="text-xl font-semibold text-gray-700 uppercase">
                  {key === "apr_may" ? "Apr–May" : key}
                </p>
                <p className="text-6xl font-black text-blue-700 mt-4">
                  {d.seasonal_levels_latest[key] !== null ? `${d.seasonal_levels_latest[key]} m` : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Back */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-4 px-16 py-8 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-3xl font-bold rounded-3xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
          >
            Back to Home
          </Link>
        </div>

        <div className="text-center mt-12 text-gray-500">
          Data Source: CGWB • NAQUIM • State Groundwater Department
        </div>
      </div>
    </div>
  );
}