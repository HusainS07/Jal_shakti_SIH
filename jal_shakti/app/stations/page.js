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
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setUserLocation({ longitude, latitude });
          fetchStations(longitude, latitude);
        },
        (err) => {
          console.error("Location error:", err);
          // Fallback to Jaipur coordinates
          const defaultLng = 75.72;
          const defaultLat = 27.17;
          setUserLocation({ longitude: defaultLng, latitude: defaultLat });
          fetchStations(defaultLng, defaultLat);
        }
      );
    } else {
      // Fallback if geolocation not supported
      const defaultLng = 75.72;
      const defaultLat = 27.17;
      setUserLocation({ longitude: defaultLng, latitude: defaultLat });
      fetchStations(defaultLng, defaultLat);
    }
  }, []);

  const fetchStations = async (lng, lat) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stations/nearest/${lng}/${lat}`);
      const data = await response.json();
      
      console.log("API Response:", data);
      
      if (data.success) {
        setStations(data.stations || []);
      } else {
        setError(data.error || "Failed to fetch stations");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load stations");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading nearby groundwater stations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-600 font-semibold">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-4 shadow-lg">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Nearby Groundwater Stations
          </h1>
          <p className="text-gray-600">
            {userLocation
              ? `Showing 5 nearest stations to ${userLocation.latitude.toFixed(4)}°N, ${userLocation.longitude.toFixed(4)}°E`
              : "Finding your location..."}
          </p>
          {stations.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Found {stations.length} monitoring stations within 500 km
            </p>
          )}
        </div>

        {/* Stations List */}
        {stations.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No stations found nearby</p>
            <p className="text-gray-500 text-sm mt-2">
              Try adjusting your location or check back later
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stations.map((station, index) => (
              <div
                key={station._id || index}
                className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20"
              >
                {/* Station Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                        Active
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {station.station_id || "Unknown Station"}
                    </h3>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                </div>

                {/* Location Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-gray-700">
                        {station.village || "Unknown Village"}
                      </p>
                      <p className="text-gray-600">
                        {station.district || "Unknown District"}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {station.state || "Unknown State"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Aquifer Type */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Aquifer Type
                    </span>
                  </div>
                  <p className="text-sm font-bold text-blue-700">
                    {station.aquifer_type || "Not specified"}
                  </p>
                </div>

                {/* Distance Badge */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Distance</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-indigo-600">
                      {station.distance_km || 0}
                    </span>
                    <span className="text-xs text-gray-500">km</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-block bg-white/80 backdrop-blur-lg px-6 py-3 rounded-xl text-gray-700 font-semibold hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}