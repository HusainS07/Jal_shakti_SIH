"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, Droplets, Layers, Mountain } from "lucide-react";
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
      else setError("No stations found nearby");
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">

        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-xl">
            <Droplets className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800">Groundwater Level Near You</h1>
          <p className="text-gray-600 mt-2">
            {userLocation ? `${userLocation.latitude.toFixed(3)}°N, ${userLocation.longitude.toFixed(3)}°E` : "Locating..."}
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => {
            const ws = station.waterStatus || {};
            const elevation = station.elevation_meters;

            return (
              <div
                key={station._id}
                className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                {/* Header: Station ID + Status */}
                <div className="flex justify-between items-start p-6 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{station.station_id}</h3>
                    <p className="text-sm text-gray-500 mt-1">{station.village}, {station.district}</p>
                  </div>
                  <div className={`w-14 h-14 ${ws.statusColor || "bg-gray-400"} rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                    {ws.statusShort || "?"}
                  </div>
                </div>

                {/* Current Water Depth */}
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-6 py-5 text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-wider">Current Depth to Water</p>
                  <p className="text-5xl font-black text-blue-700 mt-2">
                    {ws.currentDepth !== null && ws.currentDepth !== undefined ? `${ws.currentDepth} m` : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 font-medium">{ws.referencePeriod || "No recent data"}</p>
                </div>

                {/* Status Text */}
                <div className="text-center py-4 bg-gray-50">
                  <p className="text-lg font-bold text-gray-800">
                    Status: <span className="text-xl">{ws.status || "NO DATA"}</span>
                  </p>
                </div>

                {/* Elevation - New Beautiful Section */}
                {elevation !== null && elevation !== undefined ? (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-t border-amber-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-200 rounded-lg">
                          <Mountain className="w-6 h-6 text-amber-700" />
                        </div>
                        <div>
                          <p className="text-sm text-amber-600 font-medium">Elevation</p>
                          <p className="text-2xl font-bold text-amber-800">
                            {Math.round(elevation)} <span className="text-sm font-normal">m</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-amber-600">Above Sea Level</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-center text-sm text-gray-500">
                    Elevation data unavailable
                  </div>
                )}

                {/* Location Info */}
                <div className="px-6 py-4 space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <Navigation className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-800">{station.village}</p>
                      <p className="text-gray-600">{station.district}, {station.state}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-700">Aquifer:</span>
                    <span className="font-bold text-blue-700">
                      {station.aquifer_type?.replace(/_/g, " ") || "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Distance Footer */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-t border-indigo-100 flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Distance</span>
                  <span className="text-2xl font-bold text-indigo-700">
                    {station.distance_km} km
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link href="/" className="inline-block px-8 py-4 bg-white/90 backdrop-blur rounded-xl font-semibold shadow-lg hover:shadow-xl transition hover:scale-105">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Loading & Error Screens (unchanged)
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-xl text-gray-700">Fetching groundwater & elevation data...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
        <p className="text-red-600 font-bold text-xl mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
          Try Again
        </button>
      </div>
    </div>
  );
}