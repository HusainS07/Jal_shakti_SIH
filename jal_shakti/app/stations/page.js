"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, Droplets, Layers } from "lucide-react";
import Link from "next/link";

export default function StationsPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ latitude, longitude });
          fetchStations(longitude, latitude);
        },
        () => fallbackToJaipur()
      );
    } else {
      fallbackToJaipur();
    }

    function fallbackToJaipur() {
      setUserLocation({ latitude: 27.17, longitude: 75.72 });
      fetchStations(75.72, 27.17);
    }
  }, []);

  const fetchStations = async (lng, lat) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stations/nearest/${lng}/${lat}`);
      const data = await res.json();
      if (data.success) setStations(data.stations || []);
      else setError("No stations found");
    } catch (err) {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">

        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-xl">
            <Droplets className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800">Groundwater Level Near You</h1>
          <p className="text-gray-600 mt-2">
            {userLocation ? `${userLocation.latitude.toFixed(3)}°N, ${userLocation.longitude.toFixed(3)}°E` : "Locating..."}
          </p>
        </header>

        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => {
            const ws = station.waterStatus || {};
            return (
              <div
                key={station._id}
                className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/30 hover:shadow-2xl transition-all"
              >
                {/* Station ID + Status Circle */}
                <div className="flex justify-between items-start mb-5">
                  <h3 className="text-lg font-bold text-gray-800">{station.station_id}</h3>
                  <div className={`w-12 h-12 ${ws.statusColor || "bg-gray-400"} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                    {ws.statusShort || "?"}
                  </div>
                </div>

                {/* Current Water Level */}
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-5 text-center mb-5">
                  <p className="text-xs text-gray-600 uppercase tracking-wider">Current Depth</p>
                  <p className="text-4xl font-black text-blue-700 mt-2">
                    {ws.currentDepth !== null ? `${ws.currentDepth} m` : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-3 font-medium">
                    {ws.referencePeriod}
                  </p>
                </div>

                <div className="text-lg font-bold text-center text-gray-800 mb-4">
                  Status: <span className="text-xl">{ws.status || "NO DATA"}</span>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3 mb-4 text-sm">
                  <Navigation className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-800">{station.village}</p>
                    <p className="text-gray-600">{station.district}, {station.state}</p>
                  </div>
                </div>

                {/* Aquifer */}
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Aquifer:</span>
                    <span className="font-bold text-blue-700">
                      {station.aquifer_type?.replace(/_/g, " ") || "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Distance */}
                <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-200 text-sm">
                  <span className="text-gray-500">Distance</span>
                  <span className="text-xl font-bold text-indigo-600">
                    {station.distance_km} km
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link href="/" className="inline-block px-8 py-3 bg-white/90 backdrop-blur rounded-xl font-semibold shadow-lg hover:shadow-xl transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Simple components
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-xl text-gray-700">Loading groundwater data...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
        <p className="text-red-600 font-bold text-xl mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
          Try Again
        </button>
      </div>
    </div>
  );
}